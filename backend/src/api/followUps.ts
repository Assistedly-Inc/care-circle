import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/** Verify case access (coordinator or member) */
const ensureCaseAccess = async (req: AuthRequest, caseId: string) => {
  const userId = req.user!.id;
  const theCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!theCase) return false;
  if (theCase.coordinatorId === userId) return true;
  const member = await prisma.caseMember.findFirst({ where: { caseId, userId } });
  return !!member;
};

// Escalation summary across user's cases
// NOTE: must be registered BEFORE /:caseId so 'metrics' is not matched as a case id
router.get('/metrics', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const coordinatorCases = await prisma.case.findMany({
    where: { coordinatorId: userId },
    select: { id: true },
  });
  const memberRows = await prisma.caseMember.findMany({
    where: { userId },
    select: { caseId: true },
  });
  const caseIds = [...coordinatorCases.map((c) => c.id), ...memberRows.map((m) => m.caseId)];

  const [total, completed, escalated, missed] = await Promise.all([
    prisma.followUp.count({ where: { caseId: { in: caseIds } } }),
    prisma.followUp.count({ where: { caseId: { in: caseIds }, status: 'COMPLETED' } }),
    prisma.followUp.count({ where: { caseId: { in: caseIds }, status: 'ESCALATED' } }),
    prisma.followUp.count({ where: { caseId: { in: caseIds }, status: 'MISSED', scheduledFor: { lt: new Date() } } }),
  ]);

  res.json({
    total,
    completed,
    escalated,
    missed,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    escalationRate: total ? Math.round((escalated / total) * 100) : 0,
  });
});

// List follow-ups for a case
router.get('/:caseId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  const followUps = await prisma.followUp.findMany({
    where: { caseId },
    orderBy: { scheduledFor: 'asc' },
  });
  res.json(followUps);
});

// Schedule a follow-up (auto-cadence at +3, +7, +14, +30 days post-discharge)
router.post('/:caseId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

  const theCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!theCase) return res.status(404).json({ error: 'Case not found' });
  const base = theCase.dischargeAt ?? new Date();

  const cadence = [3, 7, 14, 30];
  const created = [];
  for (const days of cadence) {
    const scheduledFor = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    const existing = await prisma.followUp.findFirst({
      where: { caseId, scheduledFor: { gte: scheduledFor, lt: new Date(scheduledFor.getTime() + 86400000) } },
    });
    if (existing) continue;
    created.push(await prisma.followUp.create({
      data: { caseId, scheduledFor, contactType: 'PHONE', status: 'SCHEDULED' },
    }));
  }
  res.status(201).json(created);
});

// Complete / escalate / update a follow-up
router.patch('/:caseId/:id', requireAuth, async (req: AuthRequest, res) => {
  const { caseId, id } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

  const { status, outcome, notes, contactType, escalationLevel } = req.body;
  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (outcome !== undefined) data.outcome = outcome;
  if (notes !== undefined) data.notes = notes;
  if (contactType !== undefined) data.contactType = contactType;
  if (escalationLevel !== undefined) data.escalationLevel = escalationLevel;
  if (status === 'COMPLETED') data.completedAt = new Date();
  if (status === 'ESCALATED') data.escalatedAt = new Date();
  if (escalationLevel !== undefined && Number(escalationLevel) > 0) data.escalatedAt = new Date();

  const updated = await prisma.followUp.update({ where: { id }, data });
  res.json(updated);
});

export default router;
