import { Router } from 'express';
import authRouter from './api/auth';
import caseRouter from './api/cases';
import medicationRouter from './api/medications';
import taskRouter from './api/tasks';
import barrierRouter from './api/barriers';
import followUpRouter from './api/followUps';
import exportRouter from './api/export';
import healthRouter from './api/health';
import reminderRouter from './api/reminders';
import checkoutRouter from './api/checkout';
// Swagger UI disabled for MVP preview
// import swaggerUi from 'swagger-ui-express';
// import swaggerDocument from '../swagger.yaml';

const router = Router();

router.use('/auth', authRouter);
router.use('/cases', caseRouter);
router.use('/medications', medicationRouter);
router.use('/tasks', taskRouter);
router.use('/barriers', barrierRouter);
router.use('/follow-ups', followUpRouter);
router.use('/export', exportRouter);
router.use('/health', healthRouter);
router.use('/reminders', reminderRouter);
router.use('/create-checkout-session', checkoutRouter);
// router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
