import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthUser } from './index';
import { OrgRole } from '../types';

declare global {
  namespace Express {
    interface Request { user?: AuthUser; }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: OrgRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
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
