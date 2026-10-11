import { Router } from 'express';
import { generateCasePdf } from '../services/exportService';
import { prisma } from '../config/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/** Ensure the user has access to the case (coordinator or member) */
const ensureCaseAccess = async (req: AuthRequest, caseId: string) => {
  const userId = req.user!.id;
  const theCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!theCase) return false;
  if (theCase.coordinatorId === userId) return true;
  const member = await prisma.caseMember.findFirst({ where: { caseId, userId } });
  return !!member;
};

// Export care plan as PDF
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.query;
    if (typeof caseId !== 'string' || !caseId) {
      return res.status(400).json({ error: 'caseId query parameter is required' });
    }
    const hasAccess = await ensureCaseAccess(req, caseId);
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

    const pdf = await generateCasePdf(caseId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="care-plan-${caseId}.pdf"`);
    res.send(pdf);
  } catch (err: any) {
    const status = err?.message === 'Case not found' ? 404 : 500;
    res.status(status).json({ error: err?.message || 'Export failed' });
  }
});

export default router;
