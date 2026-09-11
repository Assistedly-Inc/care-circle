import { Router } from 'express';

const router = Router();

// Placeholder export endpoint – returns a simple PDF placeholder
router.get('/', (req, res) => {
  res.json({ message: 'Export service placeholder – implement PDF generation here.' });
});

export default router;
