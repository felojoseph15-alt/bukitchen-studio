import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

import authRoutes from './routes/auth.js';
import songsRoutes from './routes/songs.js';
import categoriesRoutes from './routes/categories.js';
import bookingsRoutes from './routes/bookings.js';
import artistsRoutes from './routes/artists.js';
import servicesRoutes from './routes/services.js';
import reviewsRoutes from './routes/reviews.js';
import mediaRoutes from './routes/media.js';
import requestsRoutes from './routes/requests.js';
import settingsRoutes from './routes/settings.js';
import textsRoutes from './routes/texts.js';
import usersRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

await initDB();

app.use('/api/auth', authRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/artists', artistsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/texts', textsRoutes);
app.use('/api/users', usersRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.get('/', (req, res) => res.sendFile(path.join(projectRoot, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(projectRoot, 'admin.html')));
app.use(express.static(projectRoot));

app.listen(PORT, () => {
  console.log(`BuKitchen API running on http://localhost:${PORT}`);
});
