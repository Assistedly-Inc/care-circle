// src/api/cases.ts
import { Router } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

// Simple health check
router.get('/ping', (req, res) => res.json({ message: 'cases ok' }));

// GET /api/cases/list – returns all cases with related data
router.get('/list', async (req, res, next) => {
  try {
    const cases = await prisma.case.findMany({
      include: {
        coordinator: { select: { id: true, name: true, email: true } },
        members: true,
        medications: true,
        tasks: true,
      },
    });
    res.json(cases);
  } catch (err) {
    next(err); // delegated to global errorHandler
  }
});

export default router;
