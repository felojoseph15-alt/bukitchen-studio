import { Router } from 'express';
import { v4 as uid } from 'uuid';
import { prepare } from '../database.js';
import { adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM categories';
  const params = [];
  if (type && type !== 'all') { sql += ' WHERE type = ?'; params.push(type); }
  sql += ' ORDER BY name';
  res.json(await prepare(sql).all(...params));
});

router.post('/', adminRequired, async (req, res) => {
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uid();
  await prepare('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)').run(id, name, type || 'genre');
  res.status(201).json({ id, name, type: type || 'genre' });
});

router.delete('/:id', adminRequired, async (req, res) => {
  const result = await prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
