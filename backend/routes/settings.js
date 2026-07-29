import { Router } from 'express';
import { prepare } from '../database.js';
import { adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const rows = await prepare('SELECT * FROM site_settings').all();
  const obj = {};
  for (const r of rows) {
    try { obj[r.key] = JSON.parse(r.value); } catch { obj[r.key] = r.value; }
  }
  res.json(obj);
});

router.put('/', adminRequired, async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await prepare('REPLACE INTO site_settings (`key`, value) VALUES (?, ?)').run(key, val);
  }
  res.json({ message: 'Saved' });
});

export default router;
