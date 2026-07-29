import { Router } from 'express';
import { v4 as uid } from 'uuid';
import { prepare } from '../database.js';
import { adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await prepare('SELECT * FROM media ORDER BY createdAt DESC').all());
});

router.post('/', adminRequired, async (req, res) => {
  const { title, type, url, category, thumbnail } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = uid();
  await prepare('INSERT INTO media (id, title, type, url, thumbnail, category, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, title, type || 'video', url || '', thumbnail || '', category || '', Date.now());
  res.status(201).json({ id, title });
});

router.delete('/:id', adminRequired, async (req, res) => {
  const result = await prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
