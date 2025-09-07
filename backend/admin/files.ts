import { api, APIError } from "encore.dev/api";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import { authDB } from "../auth/db";
import { filesDB } from "../files/db";
import { filesBucket } from "../files/storage";

const jwtSecret = secret("JWTSecret");

export interface AdminListFilesRequest {
  token: string;
  folderId?: number;
  page?: number;
  limit?: number;
}

export interface AdminFileInfo {
  id: number;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  folderId: number;
  folderName: string;
}

export interface AdminListFilesResponse {
  files: AdminFileInfo[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUploadFileRequest {
  token: string;
  folderId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface AdminUploadFileResponse {
  uploadUrl: string;
  fileId: number;
}

export interface AdminDeleteFileRequest {
  token: string;
  fileId: number;
}

export interface AdminUpdateFileRequest {
  token: string;
  fileId: number;
  originalName?: string;
  folderId?: number;
}

// Lists all files with folder information (admin only)
export const listFiles = api<AdminListFilesRequest, AdminListFilesResponse>(
  { expose: true, method: "POST", path: "/admin/files" },
  async (req) => {
    await verifyAdminToken(req.token);

    const page = req.page || 1;
    const limit = req.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = "";
    let queryParams: any[] = [];

    if (req.folderId) {
      whereClause = "WHERE f.folder_id = $1";
      queryParams = [req.folderId, limit, offset];
    } else {
      queryParams = [limit, offset];
    }

    const files = await filesDB.queryAll<{
      id: number;
      name: string;
      original_name: string;
      file_type: string;
      file_size: number;
      created_at: string;
      folder_id: number;
      folder_name: string;
    }>`
      SELECT 
        f.id,
        f.name,
        f.original_name,
        f.file_type,
        f.file_size,
        f.created_at,
        f.folder_id,
        folder.name as folder_name
      FROM files f
      JOIN folders folder ON f.folder_id = folder.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ${queryParams[req.folderId ? 1 : 0]} OFFSET ${queryParams[req.folderId ? 2 : 1]}
    `;

    // Get total count
    let countQuery = "SELECT COUNT(*) as count FROM files f";
    let countParams: any[] = [];

    if (req.folderId) {
      countQuery += " WHERE f.folder_id = $1";
      countParams = [req.folderId];
    }

    const countResult = await filesDB.queryRow<{ count: number }>(countQuery, ...countParams);

    return {
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        originalName: f.original_name,
        fileType: f.file_type,
        fileSize: f.file_size,
        createdAt: f.created_at,
        folderId: f.folder_id,
        folderName: f.folder_name,
      })),
      total: countResult?.count || 0,
      page,
      limit,
    };
  }
);

// Generates upload URL for admin to upload files
export const uploadFile = api<AdminUploadFileRequest, AdminUploadFileResponse>(
  { expose: true, method: "POST", path: "/admin/files/upload" },
  async (req) => {
    await verifyAdminToken(req.token);

    // Check if folder exists
    const folder = await filesDB.queryRow<{ id: number }>`
      SELECT id FROM folders WHERE id = ${req.folderId}
    `;

    if (!folder) {
      throw APIError.notFound("Folder not found");
    }

    // Generate unique file name
    const timestamp = Date.now();
    const storagePath = `${req.folderId}/${timestamp}_${req.fileName}`;

    try {
      // Generate signed upload URL
      const { url } = await filesBucket.signedUploadUrl(storagePath, {
        ttl: 3600, // 1 hour
      });

      // Create file record
      const file = await filesDB.queryRow<{ id: number }>`
        INSERT INTO files (folder_id, name, original_name, file_type, file_size, storage_path)
        VALUES (${req.folderId}, ${storagePath}, ${req.fileName}, ${req.fileType}, ${req.fileSize}, ${storagePath})
        RETURNING id
      `;

      if (!file) {
        throw APIError.internal("Failed to create file record");
      }

      return {
        uploadUrl: url,
        fileId: file.id,
      };
    } catch (error) {
      throw APIError.internal("Failed to generate upload URL");
    }
  }
);

// Updates file information (admin only)
export const updateFile = api<AdminUpdateFileRequest, AdminFileInfo>(
  { expose: true, method: "PUT", path: "/admin/files/update" },
  async (req) => {
    await verifyAdminToken(req.token);

    // Check if file exists
    const file = await filesDB.queryRow<{ id: number; folder_id: number }>`
      SELECT id, folder_id FROM files WHERE id = ${req.fileId}
    `;

    if (!file) {
      throw APIError.notFound("File not found");
    }

    // Check if target folder exists (if changing folder)
    if (req.folderId && req.folderId !== file.folder_id) {
      const targetFolder = await filesDB.queryRow<{ id: number }>`
        SELECT id FROM folders WHERE id = ${req.folderId}
      `;

      if (!targetFolder) {
        throw APIError.notFound("Target folder not found");
      }
    }

    // Update file information
    await filesDB.exec`
      UPDATE files 
      SET 
        original_name = COALESCE(${req.originalName}, original_name),
        folder_id = COALESCE(${req.folderId}, folder_id)
      WHERE id = ${req.fileId}
    `;

    // Get updated file information
    const updatedFile = await filesDB.queryRow<{
      id: number;
      name: string;
      original_name: string;
      file_type: string;
      file_size: number;
      created_at: string;
      folder_id: number;
      folder_name: string;
    }>`
      SELECT 
        f.id,
        f.name,
        f.original_name,
        f.file_type,
        f.file_size,
        f.created_at,
        f.folder_id,
        folder.name as folder_name
      FROM files f
      JOIN folders folder ON f.folder_id = folder.id
      WHERE f.id = ${req.fileId}
    `;

    if (!updatedFile) {
      throw APIError.internal("Failed to get updated file");
    }

    return {
      id: updatedFile.id,
      name: updatedFile.name,
      originalName: updatedFile.original_name,
      fileType: updatedFile.file_type,
      fileSize: updatedFile.file_size,
      createdAt: updatedFile.created_at,
      folderId: updatedFile.folder_id,
      folderName: updatedFile.folder_name,
    };
  }
);

// Deletes a file (admin only)
export const deleteFile = api<AdminDeleteFileRequest, { success: boolean }>(
  { expose: true, method: "DELETE", path: "/admin/files/delete" },
  async (req) => {
    await verifyAdminToken(req.token);

    // Get file info
    const file = await filesDB.queryRow<{ storage_path: string }>`
      SELECT storage_path FROM files WHERE id = ${req.fileId}
    `;

    if (!file) {
      throw APIError.notFound("File not found");
    }

    try {
      // Delete from storage
      await filesBucket.remove(file.storage_path);

      // Delete from database
      await filesDB.exec`
        DELETE FROM files WHERE id = ${req.fileId}
      `;

      return { success: true };
    } catch (error) {
      throw APIError.internal("Failed to delete file");
    }
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
