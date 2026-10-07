import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from './auth';

/**
 * Simple audit logger – records the user, action, entity, entityId, and before/after JSON.
 * It runs after the route handler (by attaching to `res.on('finish')`).
 */
export const auditMiddleware = (entity: string, getEntityId: (req: Request) => string | undefined, getBefore: (req: Request) => any) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const before = getBefore(req);
    const entityId = getEntityId(req);
    const userId = req.user?.id;
    // Capture response body via a temporary write
    const oldJson = res.json;
    let afterData: any;
    // @ts-ignore – monkey patch json to capture data
    res.json = (data: any) => {
      afterData = data;
      // @ts-ignore
      return oldJson.call(res, data);
    };
    res.on('finish', async () => {
      const action = `${req.method} ${req.path}`;
      try {
        await prisma.auditLog.create({
          data: {
            userId,
            action,
            entity,
            entityId: entityId || null,
            beforeJson: before ? JSON.stringify(before) : null,
            afterJson: afterData ? JSON.stringify(afterData) : null,
          },
        });
      } catch (e) {
        // Fail silently – logging shouldn't break response
        console.error('Audit log error', e);
      }
    });
    next();
  };
};
