import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OrgRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'icos-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';
const SALT_ROUNDS = 12;

export interface TokenPayload {
  user_id: string;
  email: string;
  role: OrgRole;
  party_id: string | null;
  is_master: boolean;
}

export interface AuthUser extends TokenPayload {
  iat: number;
  exp: number;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}
