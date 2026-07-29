import { Router } from 'express';
import { v4 as uid } from 'uuid';
import { prepare } from '../database.js';
import { adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const rows = await prepare('SELECT * FROM services ORDER BY featured DESC, price ASC').all();
  res.json(rows.map(r => ({ ...r, featured: !!r.featured })));
});

router.post('/', adminRequired, async (req, res) => {
  const { name, desc, price, discount, featured } = req.body;
  if (!name || !desc || price == null) return res.status(400).json({ error: 'name, desc, price required' });
  const id = uid();
  await prepare('INSERT INTO services (id, name, `desc`, price, discount, featured) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, desc, price, discount || '', featured ? 1 : 0);
  res.status(201).json({ id, name, price, featured: !!featured });
});

router.delete('/:id', adminRequired, async (req, res) => {
  const result = await prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
