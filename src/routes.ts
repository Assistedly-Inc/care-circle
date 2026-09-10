import { Router } from 'express';
import authRouter from './api/auth';
import caseRouter from './api/cases';
import medicationRouter from './api/medications';
import taskRouter from './api/tasks';
import exportRouter from './api/export';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.yaml';

const router = Router();

router.use('/auth', authRouter);
router.use('/cases', caseRouter);
router.use('/medications', medicationRouter);
router.use('/tasks', taskRouter);
router.use('/export', exportRouter);
router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
