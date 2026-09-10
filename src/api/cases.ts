import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

/** Helper: ensure request user is part of the case (owner or member) */
const ensureCaseAccess = async (req: AuthRequest, caseId: string) => {
  const userId = req.user!.id;
  const theCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!theCase) return false;
  if (theCase.coordinatorId === userId) return true;
  const member = await prisma.caseMember.findFirst({ where: { caseId, userId } });
  return !!member;
};

// Create a new case – only coordinators can do this
router.post('/', requireAuth, requireRole('COORDINATOR'), async (req: AuthRequest, res) => {
  const { patientName, patientDob, emergencyContact, dischargeNotes } = req.body;
  if (!patientName || !patientDob || !emergencyContact) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const newCase = await prisma.case.create({
    data: {
      patientName,
      patientDob: new Date(patientDob),
      emergencyContact,
      dischargeNotes,
      coordinatorId: req.user!.id,
    },
  });
  res.status(201).json(newCase);
});

// Get a case (must belong to it)
router.get('/:caseId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  const theCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: { members: true, medications: true, tasks: true },
  });
  if (!theCase) return res.status(404).json({ error: 'Case not found' });
  res.json(theCase);
});

// List cases visible to the user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  // Cases where user is coordinator
  const coordinatorCases = await prisma.case.findMany({ where: { coordinatorId: userId } });
  // Cases where user is a member
  const memberCaseIds = await prisma.caseMember.findMany({ where: { userId }, select: { caseId: true } });
  const memberCases = await prisma.case.findMany({ where: { id: { in: memberCaseIds.map(c => c.caseId) } } });
  const all = [...coordinatorCases, ...memberCases];
  res.json(all);
});

export default router;
