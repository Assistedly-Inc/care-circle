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
    next(err);
  }
});

// POST /api/cases/create – create a new case (minimal fields)
router.post('/create', async (req, res, next) => {
  try {
    const { patientName, patientDob, emergencyContact, coordinatorId } = req.body;
    if (!patientName || !patientDob || !emergencyContact || !coordinatorId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newCase = await prisma.case.create({
      data: {
        patientName,
        patientDob: new Date(patientDob),
        emergencyContact,
        coordinatorId,
      },
    });
    res.status(201).json(newCase);
  } catch (err) {
    next(err);
  }
});

// GET /api/cases/:id – fetch a single case with its relations
router.get('/:id', async (req, res, next) => {
  try {
    const caseId = req.params.id;
    const found = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        coordinator: { select: { id: true, name: true, email: true } },
        members: true,
        medications: true,
        tasks: true,
      },
    });
    if (!found) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json(found);
  } catch (err) {
    next(err);
  }
});

export default router;
