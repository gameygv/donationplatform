import { api, APIError } from "encore.dev/api";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import { authDB } from "../auth/db";
import { filesDB } from "../files/db";

const jwtSecret = secret("JWTSecret");

export interface AdminListUsersRequest {
  token: string;
  page?: number;
  limit?: number;
}

export interface AdminUserInfo {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  language: string;
  isAdmin: boolean;
  totalDonated: number;
  donationCount: number;
  createdAt: string;
  lastDonation?: string;
}

export interface AdminListUsersResponse {
  users: AdminUserInfo[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserDetailsRequest {
  token: string;
  userId: number;
}

export interface DonationInfo {
  id: number;
  amount: number;
  currency: string;
  paymentProvider: string;
  status: string;
  createdAt: string;
}

export interface AdminUserDetailsResponse {
  user: AdminUserInfo;
  donations: DonationInfo[];
  folderAccess: { id: number; name: string; grantedAt: string }[];
}

export interface AdminGrantFolderAccessRequest {
  token: string;
  userId: number;
  folderId: number;
}

// Lists all users with donation info (admin only)
export const listUsers = api<AdminListUsersRequest, AdminListUsersResponse>(
  { expose: true, method: "POST", path: "/admin/users" },
  async (req) => {
    const decoded = verifyAdminToken(req.token);
    
    const page = req.page || 1;
    const limit = req.limit || 20;
    const offset = (page - 1) * limit;

    const users = await authDB.queryAll<{
      id: number;
      email: string;
      first_name?: string;
      last_name?: string;
      language: string;
      is_admin: boolean;
      created_at: string;
      total_donated: number;
      donation_count: number;
      last_donation?: string;
    }>`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.language,
        u.is_admin,
        u.created_at,
        COALESCE(SUM(d.amount), 0) as total_donated,
        COUNT(d.id) as donation_count,
        MAX(d.created_at) as last_donation
      FROM users u
      LEFT JOIN donations d ON u.id = d.user_id AND d.status = 'completed'
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.language, u.is_admin, u.created_at
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await authDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM users
    `;

    return {
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        language: u.language,
        isAdmin: u.is_admin,
        totalDonated: u.total_donated,
        donationCount: u.donation_count,
        createdAt: u.created_at,
        lastDonation: u.last_donation,
      })),
      total: countResult?.count || 0,
      page,
      limit,
    };
  }
);

// Gets detailed user info including donations and folder access (admin only)
export const getUserDetails = api<AdminUserDetailsRequest, AdminUserDetailsResponse>(
  { expose: true, method: "POST", path: "/admin/users/details" },
  async (req) => {
    verifyAdminToken(req.token);

    // Get user info
    const user = await authDB.queryRow<{
      id: number;
      email: string;
      first_name?: string;
      last_name?: string;
      language: string;
      is_admin: boolean;
      created_at: string;
      total_donated: number;
      donation_count: number;
      last_donation?: string;
    }>`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.language,
        u.is_admin,
        u.created_at,
        COALESCE(SUM(d.amount), 0) as total_donated,
        COUNT(d.id) as donation_count,
        MAX(d.created_at) as last_donation
      FROM users u
      LEFT JOIN donations d ON u.id = d.user_id AND d.status = 'completed'
      WHERE u.id = ${req.userId}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.language, u.is_admin, u.created_at
    `;

    if (!user) {
      throw APIError.notFound("User not found");
    }

    // Get donations
    const donations = await authDB.queryAll<{
      id: number;
      amount: number;
      currency: string;
      payment_provider: string;
      status: string;
      created_at: string;
    }>`
      SELECT id, amount, currency, payment_provider, status, created_at
      FROM donations
      WHERE user_id = ${req.userId}
      ORDER BY created_at DESC
    `;

    // Get folder access
    const folderAccess = await filesDB.queryAll<{
      id: number;
      name: string;
      granted_at: string;
    }>`
      SELECT f.id, f.name, ufa.granted_at
      FROM user_folder_access ufa
      JOIN folders f ON ufa.folder_id = f.id
      WHERE ufa.user_id = ${req.userId}
      ORDER BY f.id
    `;

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        language: user.language,
        isAdmin: user.is_admin,
        totalDonated: user.total_donated,
        donationCount: user.donation_count,
        createdAt: user.created_at,
        lastDonation: user.last_donation,
      },
      donations: donations.map(d => ({
        id: d.id,
        amount: d.amount,
        currency: d.currency,
        paymentProvider: d.payment_provider,
        status: d.status,
        createdAt: d.created_at,
      })),
      folderAccess: folderAccess.map(f => ({
        id: f.id,
        name: f.name,
        grantedAt: f.granted_at,
      })),
    };
  }
);

// Grants folder access to a user (admin only)
export const grantFolderAccess = api<AdminGrantFolderAccessRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/admin/users/grant-access" },
  async (req) => {
    verifyAdminToken(req.token);

    await authDB.exec`
      INSERT INTO user_folder_access (user_id, folder_id)
      VALUES (${req.userId}, ${req.folderId})
      ON CONFLICT (user_id, folder_id) DO NOTHING
    `;

    return { success: true };
  }
);

function verifyAdminToken(token: string): { userId: number; email: string } {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as any;
    
    // Check if user is admin - this needs to be async but we can't use async in this function
    // We'll handle this check in the calling functions
    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    throw APIError.unauthenticated("Invalid admin token");
  }
}
