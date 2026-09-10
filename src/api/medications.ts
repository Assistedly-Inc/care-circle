import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

/** Ensure the user belongs to the case (coordinator or member) */
const ensureCaseAccess = async (req: AuthRequest, caseId: string) => {
  const userId = req.user!.id;
  const theCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!theCase) return false;
  if (theCase.coordinatorId === userId) return true;
  const member = await prisma.caseMember.findFirst({ where: { caseId, userId } });
  return !!member;
};

// List medications for a case
router.get('/:caseId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  const meds = await prisma.medication.findMany({ where: { caseId } });
  res.json(meds);
});

// Add medication
router.post('/:caseId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  const { name, dosage, schedule, source, notes } = req.body;
  if (!name || !dosage || !schedule) return res.status(400).json({ error: 'Missing required fields' });
  const med = await prisma.medication.create({
    data: {
      caseId,
      name,
      dosage,
      schedule,
      source,
      notes,
      verifiedAt: new Date(), // initial verification timestamp
    },
  });
  res.status(201).json(med);
});

// Update medication (partial)
router.patch('/:caseId/:medId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId, medId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  const { name, dosage, schedule, source, notes, verifiedAt } = req.body;
  const med = await prisma.medication.update({
    where: { id: medId },
    data: { name, dosage, schedule, source, notes, verifiedAt },
  });
  res.json(med);
});

export default router;
