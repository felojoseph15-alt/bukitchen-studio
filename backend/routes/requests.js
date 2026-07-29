import { Router } from 'express';
import { v4 as uid } from 'uuid';
import { prepare } from '../database.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', adminRequired, async (req, res) => {
  res.json(await prepare('SELECT * FROM song_requests ORDER BY createdAt DESC').all());
});

router.post('/', authRequired, async (req, res) => {
  const { title, artist, genre, url, links, notes } = req.body;
  if (!title || !artist || !genre) return res.status(400).json({ error: 'title, artist, genre required' });
  const user = await prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  const id = uid();
  await prepare(`INSERT INTO song_requests (id, userId, userName, title, artist, genre, url, links, notes, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`).run(id, req.user.id, user.name, title, artist, genre, url || '', links || '', notes || '', Date.now());
  res.status(201).json({ id, status: 'pending' });
});

router.patch('/:id/status', adminRequired, async (req, res) => {
  const { status, categoryId } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const reqRow = await prepare('SELECT * FROM song_requests WHERE id = ?').get(req.params.id);
  if (!reqRow) return res.status(404).json({ error: 'Not found' });

  await prepare('UPDATE song_requests SET status = ? WHERE id = ?').run(status, req.params.id);

  if (status === 'approved') {
    const catId = categoryId || ((await prepare('SELECT id FROM categories LIMIT 1').get())?.id || '');
    const songId = reqRow.url ? extractYoutubeId(reqRow.url) || uid() : uid();
    await prepare(`INSERT IGNORE INTO songs (id, title, artistId, catId, status, submittedBy, spotify, anghami, appleMusic, deezer, createdAt)
      VALUES (?, ?, '', ?, 'approved', ?, '', '', '', '', ?)`).run(songId, reqRow.title, catId, reqRow.userId, Date.now());
  }

  res.json({ message: status === 'approved' ? 'Approved' : 'Rejected' });
});

function extractYoutubeId(u) {
  if (!u) return null;
  const r = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/, /^([a-zA-Z0-9_-]{11})$/];
  for (const re of r) { const m = u.match(re); if (m) return m[1]; }
  return null;
}

export default router;
