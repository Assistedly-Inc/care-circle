import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  // Prevent any caching – health checks must always reflect the current state
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json({ status: 'ok' });
});

export default router;
