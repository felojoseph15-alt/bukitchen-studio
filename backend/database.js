import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const DB_NAME = process.env.DB_NAME || 'bukitchen';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

let pool = null;

export async function initDB() {
  const tmpConfig = { ...DB_CONFIG, database: undefined };
  const tmpConn = await mysql.createConnection(tmpConfig);
  await tmpConn.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await tmpConn.end();

  pool = mysql.createPool(DB_CONFIG);
  const conn = await pool.getConnection();

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(200) UNIQUE NOT NULL,
      password VARCHAR(255),
      name VARCHAR(200) DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      role VARCHAR(20) DEFAULT 'user',
      firebaseUid VARCHAR(200) DEFAULT '',
      avatar TEXT,
      bio TEXT,
      socialLinks TEXT,
      createdAt BIGINT NOT NULL
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      type VARCHAR(50) DEFAULT 'genre'
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS songs (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(300) NOT NULL,
      artistId VARCHAR(64) DEFAULT '',
      catId VARCHAR(64) DEFAULT '',
      status VARCHAR(20) DEFAULT 'approved',
      submittedBy VARCHAR(64) DEFAULT '',
      spotify TEXT,
      anghami TEXT,
      appleMusic TEXT,
      deezer TEXT,
      createdAt BIGINT NOT NULL
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(64) PRIMARY KEY,
      userId VARCHAR(64) NOT NULL,
      userName VARCHAR(200) NOT NULL,
      userEmail VARCHAR(200) NOT NULL,
      userPhone VARCHAR(50) DEFAULT '',
      date VARCHAR(20) NOT NULL,
      time VARCHAR(10) NOT NULL,
      duration INT DEFAULT 1,
      notes TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      createdAt BIGINT NOT NULL
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS artists (
      id VARCHAR(64) PRIMARY KEY,
      userId VARCHAR(64) DEFAULT '',
      name VARCHAR(200) NOT NULL,
      bio TEXT,
      avatar TEXT,
      socialLinks TEXT,
      songsCount INT DEFAULT 0
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id VARCHAR(64) PRIMARY KEY,
      name TEXT NOT NULL,
      \`desc\` TEXT NOT NULL,
      price INT NOT NULL,
      discount TEXT,
      featured INT DEFAULT 0
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(64) PRIMARY KEY,
      userId VARCHAR(64) DEFAULT '',
      userName VARCHAR(200) NOT NULL,
      rating INT NOT NULL,
      text TEXT NOT NULL,
      approved INT DEFAULT 0,
      createdAt BIGINT NOT NULL
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS media (
      id VARCHAR(64) PRIMARY KEY,
      title TEXT NOT NULL,
      type VARCHAR(20) DEFAULT 'video',
      url TEXT,
      thumbnail TEXT,
      category TEXT,
      createdAt BIGINT NOT NULL
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS song_requests (
      id VARCHAR(64) PRIMARY KEY,
      userId VARCHAR(64) DEFAULT '',
      userName VARCHAR(200) DEFAULT '',
      title VARCHAR(300) NOT NULL,
      artist VARCHAR(200) DEFAULT '',
      genre VARCHAR(100) DEFAULT '',
      url TEXT,
      links TEXT,
      notes TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      createdAt BIGINT NOT NULL
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS site_texts (
      \`key\` VARCHAR(100) PRIMARY KEY,
      ar TEXT,
      en TEXT
    )
  `);

  // Seed default admin
  const [adminRows] = await conn.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (adminRows.length === 0) {
    const hashedPw = bcrypt.hashSync('admin123', 10);
    await conn.execute('INSERT INTO users (id, username, email, password, name, phone, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['u1', 'admin', 'admin@bukitchen.com', hashedPw, 'مدير الاستوديو', '', 'admin', Date.now()]);
  }

  // Seed default categories
  const [catRows] = await conn.execute('SELECT COUNT(*) as c FROM categories');
  if (catRows[0].c === 0) {
    const cats = [
      ['c1', 'راب', 'genre'], ['c2', 'هيب هوب', 'genre'], ['c3', 'مهرجانات', 'genre'],
      ['c4', 'R&B', 'genre'], ['c5', 'بوب', 'genre'], ['c6', '2024', 'date'], ['c7', '2025', 'date']
    ];
    for (const c of cats) await conn.execute('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', c);
  }

  // Seed default services
  const [svcRows] = await conn.execute('SELECT COUNT(*) as c FROM services');
  if (svcRows[0].c === 0) {
    const svcs = [
      ['sv1', JSON.stringify({ar:'تسجيل صوتي',en:'Audio Recording'}), JSON.stringify({ar:'تسجيل احترافي بأحدث الميكروفونات والمعدات',en:'Professional recording with latest microphones'}), 1500, '', 1],
      ['sv2', JSON.stringify({ar:'مكساج وماسترنج',en:'Mixing & Mastering'}), JSON.stringify({ar:'مكساج وماسترنج احترافي',en:'Professional mixing and mastering'}), 2000, '', 0],
      ['sv3', JSON.stringify({ar:'إنتاج موسيقي',en:'Music Production'}), JSON.stringify({ar:'إنتاج موسيقي كامل',en:'Full music production'}), 3000, 'خصم 15%', 1],
      ['sv4', JSON.stringify({ar:'جلسة استوديو',en:'Studio Session'}), JSON.stringify({ar:'حجز الاستوديو مع مهندس صوت',en:'Studio booking with engineer'}), 500, '', 0]
    ];
    for (const s of svcs) await conn.execute('INSERT INTO services (id, name, `desc`, price, discount, featured) VALUES (?, ?, ?, ?, ?, ?)', s);
  }

  // Seed default artist
  const [artRows] = await conn.execute('SELECT COUNT(*) as c FROM artists');
  if (artRows[0].c === 0) {
    await conn.execute('INSERT INTO artists (id, userId, name, bio, avatar, socialLinks, songsCount) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['a1', 'u1', 'Bu Kitchen',
       JSON.stringify({ar:'استوديو تسجيل محترف',en:'Professional Recording Studio'}),
       '', JSON.stringify({instagram:'#',spotify:'#',youtube:'#'}), 0]);
  }

  // Seed default settings
  const [setRows] = await conn.execute("SELECT COUNT(*) as c FROM site_settings WHERE `key` = 'location'");
  if (setRows[0].c === 0) {
    await conn.execute("INSERT INTO site_settings (`key`, value) VALUES (?, ?)", ['location',
      JSON.stringify({lat:'31.2001', lng:'29.9187', address:{ar:'الإسكندرية، مصر',en:'Alexandria, Egypt'}})]);
  }

  // Seed default site texts
  const [txtRows] = await conn.execute("SELECT COUNT(*) as c FROM site_texts WHERE `key` = 'heroTitle'");
  if (txtRows[0].c === 0) {
    const texts = [
      ['heroTitle', 'مطبخك الموسيقي\nاحتراف بلا حدود', 'Your Musical Kitchen\nProfessional Without Limits'],
      ['studioTitle', 'Bu Kitchen Studio', 'Bu Kitchen Studio'],
      ['studioDesc', 'استوديو تسجيل احترافي في الإسكندرية، مصر.', 'Professional recording studio in Alexandria, Egypt.']
    ];
    for (const t of texts) await conn.execute('INSERT INTO site_texts (`key`, ar, en) VALUES (?, ?, ?)', t);
  }

  conn.release();
}

export function prepare(sql) {
  return {
    get: async (...params) => {
      const [rows] = await pool.execute(sql, params);
      return rows.length > 0 ? rows[0] : undefined;
    },
    all: async (...params) => {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },
    run: async (...params) => {
      const [result] = await pool.execute(sql, params);
      return { changes: result.affectedRows };
    }
  };
}

export default { initDB, prepare };
