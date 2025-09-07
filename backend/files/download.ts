import { api, APIError } from "encore.dev/api";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import { filesDB } from "./db";
import { filesBucket } from "./storage";

const jwtSecret = secret("JWTSecret");

export interface DownloadFileRequest {
  token: string;
  fileId: number;
}

export interface DownloadFileResponse {
  downloadUrl: string;
  fileName: string;
}

// Generates download URL for a file
export const downloadFile = api<DownloadFileRequest, DownloadFileResponse>(
  { expose: true, method: "POST", path: "/files/download" },
  async (req) => {
    const decoded = verifyToken(req.token);

    // Get file info and check access
    const file = await filesDB.queryRow<{
      id: number;
      folder_id: number;
      name: string;
      original_name: string;
      storage_path: string;
    }>`
      SELECT id, folder_id, name, original_name, storage_path
      FROM files
      WHERE id = ${req.fileId}
    `;

    if (!file) {
      throw APIError.notFound("File not found");
    }

    // Check if user has access to the folder
    const hasAccess = await filesDB.queryRow<{ user_id: number }>`
      SELECT user_id
      FROM user_folder_access
      WHERE user_id = ${decoded.userId} AND folder_id = ${file.folder_id}
    `;

    if (!hasAccess) {
      throw APIError.permissionDenied("No access to this file");
    }

    try {
      // Generate signed download URL (valid for 1 hour)
      const { url } = await filesBucket.signedDownloadUrl(file.storage_path, {
        ttl: 3600, // 1 hour
      });

      return {
        downloadUrl: url,
        fileName: file.original_name,
      };
    } catch (error) {
      throw APIError.internal("Failed to generate download URL");
    }
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
