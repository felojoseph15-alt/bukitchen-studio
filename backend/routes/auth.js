import { Router } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uid } from 'uuid';
import { prepare } from '../database.js';
import { generateToken, authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { name, username, email, phone, password, firebaseUid } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!username) return res.status(400).json({ error: 'Username required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be 6+ chars' });

  const existingEmail = await prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingEmail) return res.status(409).json({ error: 'Email already in use' });

  const existingUser = await prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) return res.status(409).json({ error: 'Username already in use' });

  const id = uid();
  const hashed = bcrypt.hashSync(password, 10);
  const now = Date.now();

  await prepare(`INSERT INTO users (id, username, email, password, name, phone, role, firebaseUid, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?)`).run(id, username, email, hashed, name || '', phone || '', firebaseUid || '', now);

  const user = { id, username, email, name: name || '', phone: phone || '', role: 'user' };
  const token = generateToken(user);
  res.status(201).json({ user, token });
});

router.post('/login', async (req, res) => {
  const { emailOrUser, password } = req.body;
  if (!emailOrUser || !password) return res.status(400).json({ error: 'All fields required' });

  const user = await prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(emailOrUser, emailOrUser);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = bcrypt.compareSync(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const safe = { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone, role: user.role };
  const token = generateToken(safe);
  res.json({ user: safe, token });
});

router.post('/google', async (req, res) => {
  const { firebaseUid, email, name: displayName, photo, phone } = req.body;
  if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid required' });

  let user = await prepare('SELECT * FROM users WHERE firebaseUid = ?').get(firebaseUid);
  if (!user && email) {
    user = await prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  if (user) {
    if (!user.firebaseUid && firebaseUid) {
      await prepare('UPDATE users SET firebaseUid = ? WHERE id = ?').run(firebaseUid, user.id);
    }
  } else {
    const id = uid();
    const uname = 'user_' + Date.now().toString(36);
    const now = Date.now();
    await prepare(`INSERT INTO users (id, username, email, password, name, phone, role, firebaseUid, avatar, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?, ?)`).run(id, uname, email || '', '', displayName || (email ? email.split('@')[0] : 'User'), phone || '', firebaseUid, photo || '', now);
    user = await prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  const safe = { id: user.id, username: user.username, email: user.email, name: user.name, phone: user.phone, role: user.role };
  const token = generateToken(safe);
  res.json({ user: safe, token });
});

router.get('/me', authRequired, async (req, res) => {
  const user = await prepare('SELECT id, username, email, name, phone, role, avatar, createdAt FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
