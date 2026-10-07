// src/api/cases.ts
import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/** True if the user is the case coordinator or a member of the case */
const ensureCase = async (req: AuthRequest, caseId: string): Promise<boolean> => {
  const userId = req.user!.id;
  const theCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!theCase) return false;
  if (theCase.coordinatorId === userId) return true;
  const member = await prisma.caseMember.findFirst({ where: { caseId, userId } });
  return !!member;
};

// Simple health check (no PHI)
router.get('/ping', (req, res) => res.json({ message: 'cases ok' }));

// GET /api/cases/list - PHI-scoped: only cases the user coordinates or belongs to
router.get('/list', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const cases = await prisma.case.findMany({
      where: { OR: [{ coordinatorId: userId }, { members: { some: { userId } } }] },
      include: {
        coordinator: { select: { id: true, name: true, email: true } },
        members: true,
        medications: true,
        tasks: true,
      },
    });
    res.json(cases);
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/create - authenticated; coordinator defaults to the requesting user
router.post('/create', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { patientName, patientDob, emergencyContact, coordinatorId } = req.body;
    if (!patientName || !patientDob || !emergencyContact) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newCase = await prisma.case.create({
      data: {
        patientName,
        patientDob: new Date(patientDob),
        emergencyContact,
        coordinatorId: coordinatorId || req.user!.id,
      },
    });
    res.status(201).json(newCase);
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id - 403 unless coordinator or member
router.get('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const caseId = req.params.id;
    const hasAccess = await ensureCase(req, caseId);
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
    const found = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        coordinator: { select: { id: true, name: true, email: true } },
        members: true,
        medications: true,
        tasks: true,
      },
    });
    if (!found) return res.status(404).json({ error: 'Case not found' });
    res.json(found);
  } catch (err) {
    next(err);
  }
});

// POST /api/cases/invitations/send - coordinator-only (was unauthenticated: spam/PHI vector)
router.post('/invitations/send', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { caseId, email, role } = req.body;
    if (!caseId || !email) return res.status(400).json({ error: 'caseId and email are required' });
    const theCase = await prisma.case.findUnique({ where: { id: caseId } });
    if (!theCase) return res.status(404).json({ error: 'Case not found' });
    if (theCase.coordinatorId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the case coordinator can send invitations' });
    }
    const { sendInvitationEmail } = await import('../utils/emailInvite');
    const result = await sendInvitationEmail({ email, caseId, role: (role || 'FAMILY').toUpperCase() });
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to send invitation' });
    }
    res.json({ success: true, message: 'Invitation sent successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
