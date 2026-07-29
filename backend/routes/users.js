import { Router } from 'express';
import { prepare } from '../database.js';
import { adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', adminRequired, async (req, res) => {
  const users = await prepare("SELECT id, username, email, name, phone, role, createdAt FROM users WHERE role != 'admin' ORDER BY createdAt DESC").all();
  for (const u of users) {
    const r = await prepare('SELECT COUNT(*) as c FROM bookings WHERE userId = ?').get(u.id);
    u.bookings = r.c;
  }
  res.json(users);
});

router.get('/stats', adminRequired, async (req, res) => {
  const totalSongs = (await prepare('SELECT COUNT(*) as c FROM songs').get()).c;
  const totalBookings = (await prepare('SELECT COUNT(*) as c FROM bookings').get()).c;
  const totalUsers = (await prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get()).c;
  const totalCats = (await prepare('SELECT COUNT(*) as c FROM categories').get()).c;
  const pendingBookings = (await prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'pending'").get()).c;
  const confirmedBookings = (await prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'confirmed'").get()).c;
  const pendingRequests = (await prepare("SELECT COUNT(*) as c FROM song_requests WHERE status = 'pending'").get()).c;

  res.json({ totalSongs, totalBookings, totalUsers, totalCats, pendingBookings, confirmedBookings, pendingRequests });
});

export default router;
