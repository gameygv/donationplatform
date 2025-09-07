import { api, APIError } from "encore.dev/api";
import jwt from "jsonwebtoken";
import { filesDB } from "../files/db";
import { filesBucket } from "../files/storage";
import { authDB } from "../auth/db";

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

// Generates upload URL for admin to upload files
export const uploadFile = api<AdminUploadFileRequest, AdminUploadFileResponse>(
  { expose: true, method: "POST", path: "/admin/upload" },
  async (req) => {
    verifyAdminToken(req.token);

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

// Deletes a file (admin only)
export const deleteFile = api<AdminDeleteFileRequest, { success: boolean }>(
  { expose: true, method: "DELETE", path: "/admin/files/:fileId" },
  async (req) => {
    verifyAdminToken(req.token);

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

function verifyAdminToken(token: string): { userId: number; email: string } {
  try {
    const decoded = jwt.verify(token, "your-secret-key") as any;
    
    // Check if user is admin
    const checkAdmin = async () => {
      const user = await authDB.queryRow<{ is_admin: boolean }>`
        SELECT is_admin FROM users WHERE id = ${decoded.userId}
      `;
      
      if (!user?.is_admin) {
        throw APIError.permissionDenied("Admin access required");
      }
    };
    
    checkAdmin();
    
    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    throw APIError.unauthenticated("Invalid admin token");
  }
}
