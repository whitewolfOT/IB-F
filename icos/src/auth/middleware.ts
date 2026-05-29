import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthUser } from './index';
import { OrgRole } from '../types';

declare global {
  namespace Express {
    interface Request { user?: AuthUser; }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Try Authorization header first
  const header = req.headers.authorization;
  console.log('AUTH HEADER:', header);
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(header.slice(7));
      return next();
    } catch (err) {
      console.error('JWT VERIFY FAILED:', err);
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  }
  // Fall back to httpOnly cookie
  const token = (req as any).cookies?.icos_token;
  if (token) {
    try {
      req.user = verifyToken(token);
      return next();
    } catch {
      res.clearCookie('icos_token');
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
  }
  res.status(401).json({ error: 'Authentication required' });
}

export function requireRole(...roles: OrgRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    if (req.user.is_master) { next(); return; }  // master bypasses all role checks
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
      return;
    }
    next();
  };
}

export function requireMaster(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.is_master) {
    res.status(403).json({ error: 'Master account required' });
    return;
  }
  next();
}
