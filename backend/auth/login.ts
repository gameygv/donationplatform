import { api, APIError } from "encore.dev/api";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import { authDB } from "./db";

const jwtSecret = secret("JWTSecret");

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    language: string;
    isAdmin: boolean;
  };
}

// Login with email and password
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    if (!req.email || !req.password) {
      throw APIError.invalidArgument("Email and password are required");
    }

    // Find user
    const user = await authDB.queryRow<{
      id: number;
      email: string;
      password_hash: string;
      first_name?: string;
      last_name?: string;
      language: string;
      is_admin: boolean;
    }>`
      SELECT id, email, password_hash, first_name, last_name, language, is_admin
      FROM users 
      WHERE email = ${req.email}
    `;

    if (!user) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    // Verify password
    const validPassword = await bcrypt.compare(req.password, user.password_hash);
    if (!validPassword) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret(),
      { expiresIn: "7d" }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        language: user.language,
        isAdmin: user.is_admin,
      },
    };
  }
);
