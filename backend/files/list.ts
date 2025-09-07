import { api, APIError } from "encore.dev/api";
import jwt from "jsonwebtoken";
import { filesDB } from "./db";
import { authDB } from "../auth/db";

export interface ListFilesRequest {
  token: string;
  folderId?: number;
}

export interface FileInfo {
  id: number;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface FolderInfo {
  id: number;
  name: string;
  description?: string;
  minDonationAmount: number;
  hasAccess: boolean;
}

export interface ListFilesResponse {
  folders: FolderInfo[];
  files: FileInfo[];
}

// Lists available folders and files for user
export const listFiles = api<ListFilesRequest, ListFilesResponse>(
  { expose: true, method: "POST", path: "/files/list" },
  async (req) => {
    const decoded = verifyToken(req.token);

    // Get all folders with user access information
    const folders = await filesDB.queryAll<{
      id: number;
      name: string;
      description?: string;
      min_donation_amount: number;
      has_access: boolean;
    }>`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.min_donation_amount,
        CASE WHEN ufa.user_id IS NOT NULL THEN true ELSE false END as has_access
      FROM folders f
      LEFT JOIN user_folder_access ufa ON f.id = ufa.folder_id AND ufa.user_id = ${decoded.userId}
      ORDER BY f.id
    `;

    let files: FileInfo[] = [];

    // If specific folder requested, get files from that folder
    if (req.folderId) {
      // Check if user has access to this folder
      const hasAccess = folders.find(f => f.id === req.folderId)?.has_access;
      if (!hasAccess) {
        throw APIError.permissionDenied("No access to this folder");
      }

      const folderFiles = await filesDB.queryAll<{
        id: number;
        name: string;
        original_name: string;
        file_type: string;
        file_size: number;
        created_at: string;
      }>`
        SELECT id, name, original_name, file_type, file_size, created_at
        FROM files
        WHERE folder_id = ${req.folderId}
        ORDER BY created_at DESC
      `;

      files = folderFiles.map(f => ({
        id: f.id,
        name: f.name,
        originalName: f.original_name,
        fileType: f.file_type,
        fileSize: f.file_size,
        createdAt: f.created_at,
      }));
    }

    return {
      folders: folders.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        minDonationAmount: f.min_donation_amount,
        hasAccess: f.has_access,
      })),
      files,
    };
  }
);

function verifyToken(token: string): { userId: number; email: string } {
  try {
    const decoded = jwt.verify(token, "your-secret-key") as any;
    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    throw APIError.unauthenticated("Invalid token");
  }
}
