import { api, APIError } from "encore.dev/api";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import { authDB } from "../auth/db";
import { filesDB } from "../files/db";

const jwtSecret = secret("JWTSecret");

export interface AdminListFoldersRequest {
  token: string;
}

export interface FolderInfo {
  id: number;
  name: string;
  description?: string;
  minDonationAmount: number;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  userCount: number;
}

export interface AdminListFoldersResponse {
  folders: FolderInfo[];
}

export interface AdminCreateFolderRequest {
  token: string;
  name: string;
  description?: string;
  minDonationAmount: number;
}

export interface AdminUpdateFolderRequest {
  token: string;
  folderId: number;
  name?: string;
  description?: string;
  minDonationAmount?: number;
}

export interface AdminDeleteFolderRequest {
  token: string;
  folderId: number;
}

export interface AdminFolderUsersRequest {
  token: string;
  folderId: number;
}

export interface FolderUserInfo {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  grantedAt: string;
}

export interface AdminFolderUsersResponse {
  users: FolderUserInfo[];
  folder: {
    id: number;
    name: string;
    description?: string;
  };
}

// Lists all folders with statistics (admin only)
export const listFolders = api<AdminListFoldersRequest, AdminListFoldersResponse>(
  { expose: true, method: "POST", path: "/admin/folders" },
  async (req) => {
    await verifyAdminToken(req.token);

    const folders = await filesDB.queryAll<{
      id: number;
      name: string;
      description?: string;
      min_donation_amount: number;
      created_at: string;
      updated_at: string;
      file_count: number;
      user_count: number;
    }>`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.min_donation_amount,
        f.created_at,
        f.updated_at,
        COALESCE(file_counts.count, 0) as file_count,
        COALESCE(user_counts.count, 0) as user_count
      FROM folders f
      LEFT JOIN (
        SELECT folder_id, COUNT(*) as count 
        FROM files 
        GROUP BY folder_id
      ) file_counts ON f.id = file_counts.folder_id
      LEFT JOIN (
        SELECT folder_id, COUNT(*) as count 
        FROM user_folder_access 
        GROUP BY folder_id
      ) user_counts ON f.id = user_counts.folder_id
      ORDER BY f.id
    `;

    return {
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        minDonationAmount: f.min_donation_amount,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
        fileCount: f.file_count,
        userCount: f.user_count,
      })),
    };
  }
);

// Creates a new folder (admin only)
export const createFolder = api<AdminCreateFolderRequest, FolderInfo>(
  { expose: true, method: "POST", path: "/admin/folders/create" },
  async (req) => {
    await verifyAdminToken(req.token);

    if (!req.name) {
      throw APIError.invalidArgument("Folder name is required");
    }

    if (req.minDonationAmount < 0) {
      throw APIError.invalidArgument("Minimum donation amount cannot be negative");
    }

    // Check if folder name already exists
    const existingFolder = await filesDB.queryRow`
      SELECT id FROM folders WHERE name = ${req.name}
    `;

    if (existingFolder) {
      throw APIError.alreadyExists("Folder with this name already exists");
    }

    // Create folder
    const folder = await filesDB.queryRow<{
      id: number;
      name: string;
      description?: string;
      min_donation_amount: number;
      created_at: string;
      updated_at: string;
    }>`
      INSERT INTO folders (name, description, min_donation_amount)
      VALUES (${req.name}, ${req.description || null}, ${req.minDonationAmount})
      RETURNING id, name, description, min_donation_amount, created_at, updated_at
    `;

    if (!folder) {
      throw APIError.internal("Failed to create folder");
    }

    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      minDonationAmount: folder.min_donation_amount,
      createdAt: folder.created_at,
      updatedAt: folder.updated_at,
      fileCount: 0,
      userCount: 0,
    };
  }
);

// Updates a folder (admin only)
export const updateFolder = api<AdminUpdateFolderRequest, FolderInfo>(
  { expose: true, method: "PUT", path: "/admin/folders/update" },
  async (req) => {
    await verifyAdminToken(req.token);

    // Check if folder exists
    const existingFolder = await filesDB.queryRow<{ id: number }>`
      SELECT id FROM folders WHERE id = ${req.folderId}
    `;

    if (!existingFolder) {
      throw APIError.notFound("Folder not found");
    }

    // Check if name is being changed and if it already exists
    if (req.name) {
      const nameExists = await filesDB.queryRow`
        SELECT id FROM folders WHERE name = ${req.name} AND id != ${req.folderId}
      `;

      if (nameExists) {
        throw APIError.alreadyExists("Folder name already exists");
      }
    }

    if (req.minDonationAmount !== undefined && req.minDonationAmount < 0) {
      throw APIError.invalidArgument("Minimum donation amount cannot be negative");
    }

    // Update folder
    await filesDB.exec`
      UPDATE folders 
      SET 
        name = COALESCE(${req.name}, name),
        description = COALESCE(${req.description}, description),
        min_donation_amount = COALESCE(${req.minDonationAmount}, min_donation_amount),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${req.folderId}
    `;

    // Get updated folder info with statistics
    const updatedFolder = await filesDB.queryRow<{
      id: number;
      name: string;
      description?: string;
      min_donation_amount: number;
      created_at: string;
      updated_at: string;
      file_count: number;
      user_count: number;
    }>`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.min_donation_amount,
        f.created_at,
        f.updated_at,
        COALESCE(file_counts.count, 0) as file_count,
        COALESCE(user_counts.count, 0) as user_count
      FROM folders f
      LEFT JOIN (
        SELECT folder_id, COUNT(*) as count 
        FROM files 
        WHERE folder_id = ${req.folderId}
        GROUP BY folder_id
      ) file_counts ON f.id = file_counts.folder_id
      LEFT JOIN (
        SELECT folder_id, COUNT(*) as count 
        FROM user_folder_access 
        WHERE folder_id = ${req.folderId}
        GROUP BY folder_id
      ) user_counts ON f.id = user_counts.folder_id
      WHERE f.id = ${req.folderId}
    `;

    if (!updatedFolder) {
      throw APIError.internal("Failed to get updated folder");
    }

    return {
      id: updatedFolder.id,
      name: updatedFolder.name,
      description: updatedFolder.description,
      minDonationAmount: updatedFolder.min_donation_amount,
      createdAt: updatedFolder.created_at,
      updatedAt: updatedFolder.updated_at,
      fileCount: updatedFolder.file_count,
      userCount: updatedFolder.user_count,
    };
  }
);

// Deletes a folder (admin only)
export const deleteFolder = api<AdminDeleteFolderRequest, { success: boolean }>(
  { expose: true, method: "DELETE", path: "/admin/folders/delete" },
  async (req) => {
    await verifyAdminToken(req.token);

    // Check if folder exists
    const folder = await filesDB.queryRow<{ id: number; name: string }>`
      SELECT id, name FROM folders WHERE id = ${req.folderId}
    `;

    if (!folder) {
      throw APIError.notFound("Folder not found");
    }

    // Prevent deletion of default folders (General and Premium)
    if (req.folderId <= 2) {
      throw APIError.permissionDenied("Cannot delete default folders");
    }

    // Delete folder (cascading will handle related files and access records)
    await filesDB.exec`
      DELETE FROM folders WHERE id = ${req.folderId}
    `;

    return { success: true };
  }
);

// Gets users who have access to a specific folder (admin only)
export const getFolderUsers = api<AdminFolderUsersRequest, AdminFolderUsersResponse>(
  { expose: true, method: "POST", path: "/admin/folders/users" },
  async (req) => {
    await verifyAdminToken(req.token);

    // Get folder info
    const folder = await filesDB.queryRow<{
      id: number;
      name: string;
      description?: string;
    }>`
      SELECT id, name, description FROM folders WHERE id = ${req.folderId}
    `;

    if (!folder) {
      throw APIError.notFound("Folder not found");
    }

    // Get users with access to this folder
    const users = await authDB.queryAll<{
      id: number;
      email: string;
      first_name?: string;
      last_name?: string;
      granted_at: string;
    }>`
      SELECT u.id, u.email, u.first_name, u.last_name, ufa.granted_at
      FROM users u
      JOIN user_folder_access ufa ON u.id = ufa.user_id
      WHERE ufa.folder_id = ${req.folderId}
      ORDER BY ufa.granted_at DESC
    `;

    return {
      folder: {
        id: folder.id,
        name: folder.name,
        description: folder.description,
      },
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        grantedAt: u.granted_at,
      })),
    };
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
