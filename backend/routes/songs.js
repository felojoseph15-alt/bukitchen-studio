import { Router } from 'express';
import { prepare } from '../database.js';
import { adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { catId, status, q } = req.query;
  let sql = 'SELECT * FROM songs WHERE 1=1';
  const params = [];
  if (catId) { sql += ' AND catId = ?'; params.push(catId); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (q) { sql += ' AND title LIKE ?'; params.push(`%${q}%`); }
  sql += ' ORDER BY createdAt DESC';
  res.json(await prepare(sql).all(...params));
});

router.post('/', adminRequired, async (req, res) => {
  const { id, title, artistId, catId, spotify, anghami, appleMusic, deezer } = req.body;
  if (!id || !title) return res.status(400).json({ error: 'id and title required' });
  const exists = await prepare('SELECT id FROM songs WHERE id = ?').get(id);
  if (exists) return res.status(409).json({ error: 'Song already exists' });
  await prepare(`INSERT INTO songs (id, title, artistId, catId, status, submittedBy, spotify, anghami, appleMusic, deezer, createdAt)
    VALUES (?, ?, ?, ?, 'approved', '', ?, ?, ?, ?, ?)`).run(id, title, artistId || '', catId || '', spotify || '', anghami || '', appleMusic || '', deezer || '', Date.now());
  const song = await prepare('SELECT * FROM songs WHERE id = ?').get(id);
  res.status(201).json(song);
});

router.delete('/:id', adminRequired, async (req, res) => {
  const result = await prepare('DELETE FROM songs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
