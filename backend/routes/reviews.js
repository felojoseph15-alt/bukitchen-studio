import { Router } from 'express';
import { v4 as uid } from 'uuid';
import { prepare } from '../database.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { filter } = req.query;
  let sql = 'SELECT * FROM reviews WHERE 1=1';
  const params = [];
  if (filter === 'approved') { sql += ' AND approved = 1'; }
  else if (filter === 'pending') { sql += ' AND approved = 0'; }
  sql += ' ORDER BY createdAt DESC';
  res.json(await prepare(sql).all(...params));
});

router.post('/', authRequired, async (req, res) => {
  const { text, rating, userName } = req.body;
  if (!text || !rating || !userName) return res.status(400).json({ error: 'text, rating, userName required' });
  const id = uid();
  await prepare('INSERT INTO reviews (id, userId, userName, rating, text, approved, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)')
    .run(id, req.user.id, userName, rating, text, Date.now());
  res.status(201).json({ id, approved: false });
});

router.patch('/:id/approve', adminRequired, async (req, res) => {
  await prepare('UPDATE reviews SET approved = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Approved' });
});

router.delete('/:id', adminRequired, async (req, res) => {
  await prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

export default router;
