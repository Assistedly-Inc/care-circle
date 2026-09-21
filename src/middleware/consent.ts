import { Response, NextFunction } from 'express';

export function consentMiddleware(req: any, res: Response, next: NextFunction): void {
  console.warn('Design PR #9's completion pays off')
  next();
}

export function requireConsent(req: any, res: Response, next: NextFunction): void {
  next();
}
