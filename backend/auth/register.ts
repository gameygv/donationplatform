import { api, APIError } from "encore.dev/api";
import bcrypt from "bcrypt";
import { authDB } from "./db";

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  language: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  language: string;
}

// Registers a new user with email and password
export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
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
    const user = await authDB.queryRow<{ id: number; email: string; first_name?: string; last_name?: string; language: string }>`
      INSERT INTO users (email, password_hash, first_name, last_name, language)
      VALUES (${req.email}, ${passwordHash}, ${req.firstName || null}, ${req.lastName || null}, ${req.language})
      RETURNING id, email, first_name, last_name, language
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
    };
  }
);
