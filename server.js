const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'hackathon-nexus-secret';

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger JSON for Base64 if needed
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => {
  res.json({ message: 'Campus Nexus API is running', version: '1.1.0' });
});

// --- Image Upload ---
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Auth ---
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, dept, year } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  db.run(
    'INSERT INTO users (name, email, password, dept, year) VALUES (?, ?, ?, ?, ?)',
    [name, email, password, dept, year],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
        return res.status(500).json({ error: 'Registration failed' });
      }
      const newUser = { id: this.lastID, name, email, dept, year, verified: 0, role: 'student', merit_score: 50, skills: '' };
      const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET);
      res.status(201).json({ token, user: newUser });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user });
  });
});

// --- User Profile ---
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(user);
  });
});

// --- Listings (Marketplace) ---
app.get('/api/listings', (req, res) => {
  db.all('SELECT listings.*, users.name as seller_name FROM listings JOIN users ON listings.user_id = users.id WHERE listings.status = "active" ORDER BY listings.id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows);
  });
});

app.post('/api/listings', authenticateToken, (req, res) => {
  const { title, description, category, condition, price, is_donation, photo_url, carbon_saved } = req.body;
  db.run(
    'INSERT INTO listings (user_id, title, description, category, condition, price, is_donation, photo_url, carbon_saved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, title, description, category, condition, price, is_donation, photo_url, carbon_saved || 0],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Creation failed' });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// --- Lost & Found ---
app.get('/api/lost-found', (req, res) => {
  const query = `
    SELECT id, user_id, title, description, tags, photo_url, location_text, status, created_at, 'lost' as type FROM lost_items
    UNION ALL
    SELECT id, user_id, title, description, tags, photo_url, location_text, status, created_at, 'found' as type FROM found_items
    ORDER BY id DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows);
  });
});

app.post('/api/lost-found', authenticateToken, (req, res) => {
  const { title, description, tags, photo_url, location_text, type } = req.body; // type: 'lost' or 'found'
  const table = type === 'lost' ? 'lost_items' : 'found_items';
  
  db.run(
    `INSERT INTO ${table} (user_id, title, description, tags, photo_url, location_text) VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.id, title, description, tags, photo_url, location_text],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Report failed' });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// --- Conversations ---
app.get('/api/conversations', authenticateToken, (req, res) => {
  db.all(
    'SELECT conversations.*, users.name as other_user_name FROM conversations JOIN users ON (conversations.user_a = users.id OR conversations.user_b = users.id) WHERE (user_a = ? OR user_b = ?) AND users.id != ?',
    [req.user.id, req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Fetch failed' });
      res.json(rows);
    }
  );
});

// --- Bids ---
app.get('/api/bids', authenticateToken, (req, res) => {
  db.all('SELECT * FROM bids WHERE student_id = ? OR bidder_id = ?', [req.user.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Campus Nexus Backend: http://localhost:${PORT}`);
});
