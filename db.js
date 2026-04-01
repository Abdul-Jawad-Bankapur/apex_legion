const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./campus_nexus.db');

db.serialize(() => {
  // users: id, name, email (UNIQUE), password, dept, year, verified (BOOLEAN), role
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    dept TEXT,
    year INTEGER,
    verified BOOLEAN DEFAULT 0,
    role TEXT DEFAULT 'student',
    merit_score INTEGER DEFAULT 50,
    skills TEXT
  )`);

  // listings: id, user_id (FK), title, description, category, condition, price, is_donation, photo_url, status, carbon_saved, created_at
  db.run(`CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    category TEXT,
    condition TEXT,
    price REAL,
    is_donation BOOLEAN,
    photo_url TEXT,
    status TEXT DEFAULT 'active',
    carbon_saved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // lost_items: id, user_id (FK), title, description, tags (comma-separated), photo_url, location_text, status, created_at
  db.run(`CREATE TABLE IF NOT EXISTS lost_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    tags TEXT,
    photo_url TEXT,
    location_text TEXT,
    status TEXT DEFAULT 'lost',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // found_items: id, user_id (FK), title, description, tags (comma-separated), photo_url, location_text, status, created_at
  db.run(`CREATE TABLE IF NOT EXISTS found_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    tags TEXT,
    photo_url TEXT,
    location_text TEXT,
    status TEXT DEFAULT 'found',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // conversations: id, user_a, user_b, listing_id
  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a INTEGER,
    user_b INTEGER,
    listing_id INTEGER,
    FOREIGN KEY(user_a) REFERENCES users(id),
    FOREIGN KEY(user_b) REFERENCES users(id),
    FOREIGN KEY(listing_id) REFERENCES listings(id)
  )`);

  // meetups: id, conversation_id (FK), location_name, scheduled_at, status, confirmed_a, confirmed_b
  db.run(`CREATE TABLE IF NOT EXISTS meetups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    location_name TEXT,
    scheduled_at DATETIME,
    status TEXT DEFAULT 'pending',
    confirmed_a BOOLEAN DEFAULT 0,
    confirmed_b BOOLEAN DEFAULT 0,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id)
  )`);

  // bids: id, student_id (FK), bidder_id (FK), amount, equity_percentage, status
  db.run(`CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    bidder_id INTEGER,
    amount REAL,
    equity_percentage REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(bidder_id) REFERENCES users(id)
  )`);
});

// Migration helper for hackathon (adding missing columns to existing tables)
const addColumn = (table, col, type) => {
  db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {
    // Column might already exist, ignore error
  });
};

addColumn('users', 'merit_score', 'INTEGER DEFAULT 50');
addColumn('users', 'skills', 'TEXT');
addColumn('listings', 'description', 'TEXT');
addColumn('listings', 'carbon_saved', 'INTEGER DEFAULT 0');
addColumn('listings', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
addColumn('lost_items', 'title', 'TEXT');
addColumn('lost_items', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
addColumn('found_items', 'title', 'TEXT');
addColumn('found_items', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

module.exports = db;
