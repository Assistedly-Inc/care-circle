import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

/** Helper to verify case access */
const ensureCaseAccess = async (req: AuthRequest, caseId: string) => {
  const userId = req.user!.id;
  const theCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!theCase) return false;
  if (theCase.coordinatorId === userId) return true;
  const member = await prisma.caseMember.findFirst({ where: { caseId, userId } });
  return !!member;
};

// List tasks for a case
router.get('/:caseId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  const tasks = await prisma.task.findMany({ where: { caseId }, include: { comments: true, owner: true } });
  res.json(tasks);
});

// Create a new task
router.post('/:caseId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  const { title, description, ownerId, dueDate } = req.body;
  if (!title || !dueDate) return res.status(400).json({ error: 'Missing required fields' });
  const task = await prisma.task.create({
    data: {
      caseId,
      title,
      description,
      ownerId: ownerId || undefined,
      dueDate: new Date(dueDate),
    },
  });
  res.status(201).json(task);
});

// Update task status, escalation, etc.
router.patch('/:caseId/:taskId', requireAuth, async (req: AuthRequest, res) => {
  const { caseId, taskId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  const { title, description, ownerId, dueDate, status, escalationLevel } = req.body;
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { title, description, ownerId, dueDate: dueDate ? new Date(dueDate) : undefined, status, escalationLevel },
  });
  res.json(task);
});

// Add a comment to a task
router.post('/:caseId/:taskId/comments', requireAuth, async (req: AuthRequest, res) => {
  const { caseId, taskId } = req.params;
  const hasAccess = await ensureCaseAccess(req, caseId);
  if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Missing comment content' });
  const comment = await prisma.comment.create({
    data: {
      taskId,
      authorId: req.user!.id,
      content,
    },
  });
  res.status(201).json(comment);
});

export default router;
