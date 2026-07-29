import { Router } from 'express';
import { v4 as uid } from 'uuid';
import { prepare } from '../database.js';
import { adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await prepare('SELECT * FROM artists ORDER BY name').all());
});

router.post('/', adminRequired, async (req, res) => {
  const { name, bio, avatar, socialLinks } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uid();
  await prepare('INSERT INTO artists (id, userId, name, bio, avatar, socialLinks, songsCount) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, '', name, bio || '{}', avatar || '', socialLinks || '{}', 0);
  res.status(201).json({ id, name });
});

router.delete('/:id', adminRequired, async (req, res) => {
  const result = await prepare('DELETE FROM artists WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
