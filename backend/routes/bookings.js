import { Router } from 'express';
import { v4 as uid } from 'uuid';
import { prepare } from '../database.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();

async function getBookedSlots() {
  const active = await prepare("SELECT date, time, duration FROM bookings WHERE status IN ('confirmed','pending')").all();
  const map = {};
  for (const b of active) {
    if (!map[b.date]) map[b.date] = [];
    const startH = parseInt(b.time.split(':')[0]);
    for (let h = 0; h < b.duration; h++) {
      map[b.date].push(String(startH + h).padStart(2, '0') + ':00');
    }
  }
  return map;
}

router.get('/', async (req, res) => {
  const { filter, userId } = req.query;
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];
  if (filter && filter !== 'all') { sql += ' AND status = ?'; params.push(filter); }
  if (userId) { sql += ' AND userId = ?'; params.push(userId); }
  sql += ' ORDER BY createdAt DESC';
  res.json(await prepare(sql).all(...params));
});

router.post('/', authRequired, async (req, res) => {
  const { date, time, duration, notes, userPhone } = req.body;
  if (!date || !time || !duration) return res.status(400).json({ error: 'date, time, duration required' });

  const sel = new Date(date + 'T' + time);
  if (sel <= new Date()) return res.status(400).json({ error: 'Cannot book in the past' });

  const bookedSlots = await getBookedSlots();
  const startH = parseInt(time.split(':')[0]);
  if (bookedSlots[date]) {
    for (let h = 0; h < duration; h++) {
      const t = String(startH + h).padStart(2, '0') + ':00';
      if (bookedSlots[date].includes(t)) {
        return res.status(409).json({ error: 'Time slot already booked' });
      }
    }
  }

  const id = uid();
  const user = await prepare('SELECT name, email, phone FROM users WHERE id = ?').get(req.user.id);
  await prepare(`INSERT INTO bookings (id, userId, userName, userEmail, userPhone, date, time, duration, notes, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`).run(id, req.user.id, user.name, user.email, userPhone || user.phone, date, time, duration, notes || '', Date.now());

  const booking = await prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  res.status(201).json(booking);
});

router.patch('/:id/status', adminRequired, async (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'rejected', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const booking = await prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  if (status === 'confirmed' || status === 'rejected') {
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Can only confirm/reject pending bookings' });
  }
  await prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ...booking, status });
});

router.delete('/:id', authRequired, async (req, res) => {
  const booking = await prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Not found' });
  if (booking.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  if (req.user.role !== 'admin') {
    await prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    return res.json({ message: 'Cancelled' });
  }
  await prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

router.get('/slots', async (req, res) => {
  res.json(await getBookedSlots());
});

export default router;
