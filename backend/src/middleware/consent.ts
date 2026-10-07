import { Response, NextFunction } from 'express';

export function consentMiddleware(req: any, res: Response, next: NextFunction): void {
  next();
}

export function requireConsent(req: any, res: Response, next: NextFunction): void {
  next();
}
