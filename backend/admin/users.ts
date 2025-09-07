import { api, APIError } from "encore.dev/api";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import { authDB } from "../auth/db";
import { filesDB } from "../files/db";
import bcrypt from "bcrypt";

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

export interface AdminRevokeFolderAccessRequest {
  token: string;
  userId: number;
  folderId: number;
}

export interface AdminCreateUserRequest {
  token: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  language: string;
  isAdmin?: boolean;
}

export interface AdminUpdateUserRequest {
  token: string;
  userId: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  language?: string;
  isAdmin?: boolean;
  newPassword?: string;
}

export interface AdminDeleteUserRequest {
  token: string;
  userId: number;
}

// Lists all users with donation info (admin only)
export const listUsers = api<AdminListUsersRequest, AdminListUsersResponse>(
  { expose: true, method: "POST", path: "/admin/users" },
  async (req) => {
    const decoded = await verifyAdminToken(req.token);
    
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
    await verifyAdminToken(req.token);

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
    await verifyAdminToken(req.token);

    await authDB.exec`
      INSERT INTO user_folder_access (user_id, folder_id)
      VALUES (${req.userId}, ${req.folderId})
      ON CONFLICT (user_id, folder_id) DO NOTHING
    `;

    return { success: true };
  }
);

// Revokes folder access from a user (admin only)
export const revokeFolderAccess = api<AdminRevokeFolderAccessRequest, { success: boolean }>(
  { expose: true, method: "DELETE", path: "/admin/users/revoke-access" },
  async (req) => {
    await verifyAdminToken(req.token);

    await authDB.exec`
      DELETE FROM user_folder_access 
      WHERE user_id = ${req.userId} AND folder_id = ${req.folderId}
    `;

    return { success: true };
  }
);

// Creates a new user (admin only)
export const createUser = api<AdminCreateUserRequest, AdminUserInfo>(
  { expose: true, method: "POST", path: "/admin/users/create" },
  async (req) => {
    await verifyAdminToken(req.token);

    if (!req.email || !req.password) {
      throw APIError.invalidArgument("Email and password are required");
    }

    if (req.password.length < 6) {
      throw APIError.invalidArgument("Password must be at least 6 characters");
    }

    // Check if user already exists
    const existingUser = await authDB.queryRow`
      SELECT id FROM users WHERE email = ${req.email}
    `;

    if (existingUser) {
      throw APIError.alreadyExists("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(req.password, 10);

    // Create user
    const user = await authDB.queryRow<{ 
      id: number; 
      email: string; 
      first_name?: string; 
      last_name?: string; 
      language: string;
      is_admin: boolean;
      created_at: string;
    }>`
      INSERT INTO users (email, password_hash, first_name, last_name, language, is_admin)
      VALUES (${req.email}, ${passwordHash}, ${req.firstName || null}, ${req.lastName || null}, ${req.language}, ${req.isAdmin || false})
      RETURNING id, email, first_name, last_name, language, is_admin, created_at
    `;

    if (!user) {
      throw APIError.internal("Failed to create user");
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      language: user.language,
      isAdmin: user.is_admin,
      totalDonated: 0,
      donationCount: 0,
      createdAt: user.created_at,
    };
  }
);

// Updates a user (admin only)
export const updateUser = api<AdminUpdateUserRequest, AdminUserInfo>(
  { expose: true, method: "PUT", path: "/admin/users/update" },
  async (req) => {
    await verifyAdminToken(req.token);

    // Check if user exists
    const existingUser = await authDB.queryRow<{ id: number }>`
      SELECT id FROM users WHERE id = ${req.userId}
    `;

    if (!existingUser) {
      throw APIError.notFound("User not found");
    }

    // Check if email is being changed and if it already exists
    if (req.email) {
      const emailExists = await authDB.queryRow`
        SELECT id FROM users WHERE email = ${req.email} AND id != ${req.userId}
      `;

      if (emailExists) {
        throw APIError.alreadyExists("Email already exists");
      }
    }

    // Update password if provided
    if (req.newPassword) {
      if (req.newPassword.length < 6) {
        throw APIError.invalidArgument("Password must be at least 6 characters");
      }

      const passwordHash = await bcrypt.hash(req.newPassword, 10);
      await authDB.exec`
        UPDATE users 
        SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${req.userId}
      `;
    }

    // Update other fields
    await authDB.exec`
      UPDATE users 
      SET 
        email = COALESCE(${req.email}, email),
        first_name = COALESCE(${req.firstName}, first_name),
        last_name = COALESCE(${req.lastName}, last_name),
        language = COALESCE(${req.language}, language),
        is_admin = COALESCE(${req.isAdmin}, is_admin),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${req.userId}
    `;

    // Get updated user info
    const updatedUser = await authDB.queryRow<{
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

    if (!updatedUser) {
      throw APIError.internal("Failed to get updated user");
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      language: updatedUser.language,
      isAdmin: updatedUser.is_admin,
      totalDonated: updatedUser.total_donated,
      donationCount: updatedUser.donation_count,
      createdAt: updatedUser.created_at,
      lastDonation: updatedUser.last_donation,
    };
  }
);

// Deletes a user (admin only)
export const deleteUser = api<AdminDeleteUserRequest, { success: boolean }>(
  { expose: true, method: "DELETE", path: "/admin/users/delete" },
  async (req) => {
    await verifyAdminToken(req.token);

    // Check if user exists
    const user = await authDB.queryRow<{ id: number; is_admin: boolean }>`
      SELECT id, is_admin FROM users WHERE id = ${req.userId}
    `;

    if (!user) {
      throw APIError.notFound("User not found");
    }

    // Prevent deletion of admin users (safety measure)
    if (user.is_admin) {
      throw APIError.permissionDenied("Cannot delete admin users");
    }

    // Delete user (cascading will handle related records)
    await authDB.exec`
      DELETE FROM users WHERE id = ${req.userId}
    `;

    return { success: true };
  }
);

async function verifyAdminToken(token: string): Promise<{ userId: number; email: string }> {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as any;
    
    // Check if user is admin
    const user = await authDB.queryRow<{ is_admin: boolean }>`
      SELECT is_admin FROM users WHERE id = ${decoded.userId}
    `;
    
    if (!user?.is_admin) {
      throw APIError.permissionDenied("Admin access required");
    }
    
    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    throw APIError.unauthenticated("Invalid admin token");
  }
}
