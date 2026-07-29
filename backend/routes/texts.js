import { Router } from 'express';
import { prepare } from '../database.js';
import { adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const rows = await prepare('SELECT * FROM site_texts').all();
  const obj = {};
  for (const r of rows) obj[r.key] = { ar: r.ar, en: r.en };
  res.json(obj);
});

router.put('/:key', adminRequired, async (req, res) => {
  const { ar, en } = req.body;
  await prepare('REPLACE INTO site_texts (`key`, ar, en) VALUES (?, ?, ?)').run(req.params.key, ar || '', en || '');
  res.json({ message: 'Saved' });
});

export default router;
