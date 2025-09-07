import { api, APIError } from "encore.dev/api";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import { authDB } from "./db";

const jwtSecret = secret("JWTSecret");

export interface GetProfileRequest {
  token: string;
}

export interface UpdateProfileRequest {
  token: string;
  firstName?: string;
  lastName?: string;
  language?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UserProfile {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  language: string;
  isAdmin: boolean;
  totalDonated: number;
}

// Get user profile
export const getProfile = api<GetProfileRequest, UserProfile>(
  { expose: true, method: "POST", path: "/auth/profile" },
  async (req) => {
    const decoded = verifyToken(req.token);
    
    const user = await authDB.queryRow<{
      id: number;
      email: string;
      first_name?: string;
      last_name?: string;
      language: string;
      is_admin: boolean;
    }>`
      SELECT id, email, first_name, last_name, language, is_admin
      FROM users 
      WHERE id = ${decoded.userId}
    `;

    if (!user) {
      throw APIError.notFound("User not found");
    }

    // Get total donated amount
    const donationResult = await authDB.queryRow<{ total: number }>`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM donations 
      WHERE user_id = ${user.id} AND status = 'completed'
    `;

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      language: user.language,
      isAdmin: user.is_admin,
      totalDonated: donationResult?.total || 0,
    };
  }
);

// Update user profile
export const updateProfile = api<UpdateProfileRequest, UserProfile>(
  { expose: true, method: "PUT", path: "/auth/profile" },
  async (req) => {
    const decoded = verifyToken(req.token);

    // If changing password, verify current password
    if (req.newPassword) {
      if (!req.currentPassword) {
        throw APIError.invalidArgument("Current password is required to change password");
      }

      const user = await authDB.queryRow<{ password_hash: string }>`
        SELECT password_hash FROM users WHERE id = ${decoded.userId}
      `;

      if (!user) {
        throw APIError.notFound("User not found");
      }

      const validPassword = await bcrypt.compare(req.currentPassword, user.password_hash);
      if (!validPassword) {
        throw APIError.invalidArgument("Current password is incorrect");
      }

      if (req.newPassword.length < 6) {
        throw APIError.invalidArgument("New password must be at least 6 characters");
      }

      const newPasswordHash = await bcrypt.hash(req.newPassword, 10);
      
      await authDB.exec`
        UPDATE users 
        SET password_hash = ${newPasswordHash}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${decoded.userId}
      `;
    }

    // Update other profile fields
    await authDB.exec`
      UPDATE users 
      SET 
        first_name = ${req.firstName || null},
        last_name = ${req.lastName || null},
        language = ${req.language || 'es'},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${decoded.userId}
    `;

    // Return updated profile
    return getProfile({ token: req.token });
  }
);

function verifyToken(token: string): { userId: number; email: string } {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as any;
    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    throw APIError.unauthenticated("Invalid token");
  }
}
