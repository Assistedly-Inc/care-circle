import { Router } from 'express';
const router = Router();
router.get('/ping', (req, res) => res.json({ message: 'auth ok' }));
export default router;

router.post('/login', (req, res) => {
  // placeholder – always succeeds
  res.json({ token: 'demo-token' });
});
