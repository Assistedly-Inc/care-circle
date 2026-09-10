import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Checks that the authenticated user has one of the allowed roles.
 * Usage: `app.use(requireRole('COORDINATOR'))`
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden – insufficient role' });
    }
    next();
  };
};
