import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/** Upcoming reminders = tasks due in the next 24h for cases the user can access */
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Cases the user coordinates or belongs to
    const coordinatorCases = await prisma.case.findMany({
      where: { coordinatorId: userId },
      select: { id: true },
    });
    const memberRows = await prisma.caseMember.findMany({
      where: { userId },
      select: { caseId: true },
    });
    const accessibleCaseIds = [
      ...coordinatorCases.map((c) => c.id),
      ...memberRows.map((m) => m.caseId),
    ];

    const tasks = await prisma.task.findMany({
      where: {
        caseId: { in: accessibleCaseIds },
        dueDate: { gte: now, lte: in24h },
        status: { not: 'COMPLETED' },
      },
      include: { case: true, owner: true },
      orderBy: { dueDate: 'asc' },
    });

    const reminders = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: 'Task',
      time: t.dueDate.toISOString(),
      status: 'pending',
      caseId: t.caseId,
      patientName: t.case.patientName,
      ownerName: t.owner?.name ?? null,
      escalationLevel: t.escalationLevel,
    }));

    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reminders' });
  }
});

export default router;
