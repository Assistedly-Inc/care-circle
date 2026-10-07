import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const BARRIER_TYPES = ['transport', 'medications', 'placement', 'insurance', 'family', 'pending_test', 'social', 'other'];
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
const VALID_STATUSES = ['IDENTIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'];

/** Helper to verify case access (mirrors tasks.ts) */
const ensureCaseAccess = async (req: AuthRequest, caseId: string) => {
  const userId = req.user!.id;
  const theCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!theCase) return false;
  if (theCase.coordinatorId === userId) return true;
  const member = await prisma.caseMember.findFirst({ where: { caseId, userId } });
  return !!member;
};

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Metrics — registered before /:caseId so 'metrics' is not treated as a case id
router.get('/metrics', requireAuth, async (req: AuthRequest, res) => {
  const [cases, barriers] = await Promise.all([
    prisma.case.findMany({ select: { id: true, admissionAt: true, dischargeAt: true } }),
    prisma.barrier.findMany(),
  ]);
  const withBothDates = cases.filter((c) => c.admissionAt && c.dischargeAt);
  const sameDay = withBothDates.filter(
    (c) => c.admissionAt!.toDateString() === c.dischargeAt!.toDateString()
  );
  const ttrByType: Record<string, number> = {};
  for (const t of BARRIER_TYPES) {
    const hours = barriers
      .filter((b) => b.type === t && b.resolvedAt)
      .map((b) => (b.resolvedAt!.getTime() - b.createdAt.getTime()) / 3600000);
    if (hours.length) ttrByType[t] = Math.round(median(hours) * 10) / 10;
  }
  const withSla = barriers.filter((b) => b.dueDate);
  const breached = withSla.filter((b) => {
    const deadline = b.dueDate!.getTime();
    const done = b.resolvedAt ? b.resolvedAt.getTime() : Date.now();
    return done > deadline;
  });
  res.json({
    casesConsidered: withBothDates.length,
    sameDayDischargeRate: withBothDates.length ? sameDay.length / withBothDates.length : null,
    medianTimeToResolutionHoursByType: ttrByType,
    slaBreachRate: withSla.length ? breached.length / withSla.length : null,
    openBarrierCount: barriers.filter((b) => b.status !== 'RESOLVED').length,
  });
});

// List barriers for a case
router.get('/:caseId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  if (!(await ensureCaseAccess(req, caseId))) return res.status(403).json({ error: 'Forbidden' });
  const barriers = await prisma.barrier.findMany({
    where: { caseId },
    include: {
      notes: { include: { author: { select: { id: true, name: true } } } },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(barriers);
});

// Create a barrier
router.post('/:caseId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  if (!(await ensureCaseAccess(req, caseId))) return res.status(403).json({ error: 'Forbidden' });
  const { type, description, priority, ownerId, dueDate } = req.body;
  if (!type || !description) return res.status(400).json({ error: 'Missing required fields' });
  if (!BARRIER_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid barrier type' });
  if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  const barrier = await prisma.barrier.create({
    data: {
      caseId,
      type,
      description,
      priority: priority || 'MEDIUM',
      ownerId: ownerId || undefined,
      status: ownerId ? 'ASSIGNED' : 'IDENTIFIED',
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });
  res.status(201).json(barrier);
});

// Update a barrier (assign, transition status, resolve with note, escalate)
router.patch('/:caseId/:barrierId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId, barrierId } = req.params;
  if (!(await ensureCaseAccess(req, caseId))) return res.status(403).json({ error: 'Forbidden' });
  const existing = await prisma.barrier.findUnique({ where: { id: barrierId } });
  if (!existing || existing.caseId !== caseId) return res.status(404).json({ error: 'Not found' });

  const { type, priority, description, ownerId, status, dueDate, resolutionNote } = req.body;
  if (type && !BARRIER_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid barrier type' });
  if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const data: {
    type?: string;
    priority?: string;
    description?: string;
    ownerId?: string | null;
    status?: string;
    dueDate?: Date | null;
    resolvedAt?: Date | null;
    escalatedAt?: Date | null;
    resolutionNote?: string | null;
  } = {};

  if (type !== undefined) data.type = type;
  if (priority !== undefined) data.priority = priority;
  if (description !== undefined) data.description = description;
  if (ownerId !== undefined) {
    data.ownerId = ownerId || null;
    if (ownerId && existing.status === 'IDENTIFIED') data.status = 'ASSIGNED';
  }
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  if (status === 'RESOLVED') {
    if (!resolutionNote) return res.status(400).json({ error: 'resolutionNote required to resolve' });
    data.status = 'RESOLVED';
    data.resolvedAt = new Date();
    data.resolutionNote = resolutionNote;
  } else if (status === 'ESCALATED') {
    data.status = 'ESCALATED';
    data.escalatedAt = new Date();
  } else if (status) {
    data.status = status;
    if (existing.resolvedAt) {
      data.resolvedAt = null;
      data.resolutionNote = null;
    }
  } else if (resolutionNote !== undefined) {
    data.resolutionNote = resolutionNote;
  }

  const barrier = await prisma.barrier.update({ where: { id: barrierId }, data });
  res.json(barrier);
});

// Add a note to a barrier
router.post('/:caseId/:barrierId/notes', requireAuth, async (req: AuthRequest, res) => {
  const { caseId, barrierId } = req.params;
  if (!(await ensureCaseAccess(req, caseId))) return res.status(403).json({ error: 'Forbidden' });
  const existing = await prisma.barrier.findUnique({ where: { id: barrierId } });
  if (!existing || existing.caseId !== caseId) return res.status(404).json({ error: 'Not found' });
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Missing note content' });
  const note = await prisma.barrierNote.create({
    data: { barrierId, authorId: req.user!.id, content },
    include: { author: { select: { id: true, name: true } } },
  });
  res.status(201).json(note);
});

// Readiness status for a case (descriptive, not predictive)
router.get('/:caseId/readiness', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  if (!(await ensureCaseAccess(req, caseId))) return res.status(403).json({ error: 'Forbidden' });
  const open = await prisma.barrier.findMany({ where: { caseId, status: { not: 'RESOLVED' } } });
  const status = open.some((b) => b.priority === 'HIGH')
    ? 'RED'
    : open.some((b) => b.priority === 'MEDIUM')
    ? 'AMBER'
    : 'GREEN';
  res.json({
    status,
    openBarriers: open.length,
    highPriority: open.filter((b) => b.priority === 'HIGH').length,
  });
});

export default router;
