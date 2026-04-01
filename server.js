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
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => {
  res.json({ message: 'Campus Nexus API is running', version: '1.0.0' });
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
app.post('/api/auth/login', (req, res) => {
  const { email, name, dept, year } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (user) {
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
      return res.json({ token, user });
    }

    db.run(
      'INSERT INTO users (name, email, dept, year) VALUES (?, ?, ?, ?)',
      [name, email, dept, year],
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to create user' });
        const newUser = { id: this.lastID, name, email, dept, year, verified: 0, role: 'student' };
        const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET);
        res.status(201).json({ token, user: newUser });
      }
    );
  });
});

// --- User Profile ---
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(user);
  });
});

app.put('/api/profile', authenticateToken, (req, res) => {
  const { name, dept, year } = req.body;
  db.run(
    'UPDATE users SET name = ?, dept = ?, year = ? WHERE id = ?',
    [name, dept, year, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Update failed' });
      res.json({ message: 'Profile updated' });
    }
  );
});

// --- Listings (Marketplace) ---
app.get('/api/listings', (req, res) => {
  db.all('SELECT listings.*, users.name as seller_name FROM listings JOIN users ON listings.user_id = users.id WHERE status = "active"', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows);
  });
});

app.post('/api/listings', authenticateToken, (req, res) => {
  const { title, category, condition, price, is_donation, photo_url } = req.body;
  db.run(
    'INSERT INTO listings (user_id, title, category, condition, price, is_donation, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, title, category, condition, price, is_donation, photo_url],
    function (err) {
      if (err) return res.status(500).json({ error: 'Creation failed' });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// --- Lost & Found ---
app.get('/api/lost-found', (req, res) => {
  // Combine lost and found for the feed
  const query = `
    SELECT id, user_id, description, tags, photo_url, location_text, status, 'lost' as type FROM lost_items
    UNION ALL
    SELECT id, user_id, description, tags, photo_url, location_text, status, 'found' as type FROM found_items
    ORDER BY id DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows);
  });
});

app.post('/api/lost-found', authenticateToken, (req, res) => {
  const { description, tags, photo_url, location_text, type } = req.body; // type: 'lost' or 'found'
  const table = type === 'lost' ? 'lost_items' : 'found_items';
  
  db.run(
    `INSERT INTO ${table} (user_id, description, tags, photo_url, location_text) VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, description, tags, photo_url, location_text],
    function (err) {
      if (err) return res.status(500).json({ error: 'Report failed' });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// --- Conversations & Messaging ---
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

app.post('/api/conversations', authenticateToken, (req, res) => {
  const { other_user_id, listing_id } = req.body;
  db.run(
    'INSERT INTO conversations (user_a, user_b, listing_id) VALUES (?, ?, ?)',
    [req.user.id, other_user_id, listing_id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to start conversation' });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// --- Meetups ---
app.get('/api/meetups', authenticateToken, (req, res) => {
  db.all(
    `SELECT meetups.*, conversations.listing_id FROM meetups 
     JOIN conversations ON meetups.conversation_id = conversations.id 
     WHERE conversations.user_a = ? OR conversations.user_b = ?`,
    [req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Fetch failed' });
      res.json(rows);
    }
  );
});

app.post('/api/meetups', authenticateToken, (req, res) => {
  const { conversation_id, location_name, scheduled_at } = req.body;
  db.run(
    'INSERT INTO meetups (conversation_id, location_name, scheduled_at) VALUES (?, ?, ?)',
    [conversation_id, location_name, scheduled_at],
    function (err) {
      if (err) return res.status(500).json({ error: 'Meetup scheduled' });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// --- Bids (Investment) ---
app.get('/api/bids', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM bids WHERE student_id = ? OR bidder_id = ?',
    [req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Fetch failed' });
      res.json(rows);
    }
  );
});

app.post('/api/bids', authenticateToken, (req, res) => {
  const { student_id, amount, equity_percentage } = req.body;
  db.run(
    'INSERT INTO bids (student_id, bidder_id, amount, equity_percentage) VALUES (?, ?, ?, ?)',
    [student_id, req.user.id, amount, equity_percentage],
    function (err) {
      if (err) return res.status(500).json({ error: 'Bid failed' });
      res.status(201).json({ id: this.lastID });
    }
  );
});

app.listen(PORT, () => {
  console.log(`🚀 Campus Nexus Backend: http://localhost:${PORT}`);
});
