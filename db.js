const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./campus_nexus.db');

db.serialize(() => {
  // users: id, name, email (UNIQUE), dept, year, verified (BOOLEAN), role
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    dept TEXT,
    year INTEGER,
    verified BOOLEAN DEFAULT 0,
    role TEXT DEFAULT 'student'
  )`);

  // listings: id, user_id (FK), title, category, condition, price, is_donation, photo_url, status
  db.run(`CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    category TEXT,
    condition TEXT,
    price REAL,
    is_donation BOOLEAN,
    photo_url TEXT,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // lost_items: id, user_id (FK), description, tags (comma-separated string), photo_url, location_text, status
  db.run(`CREATE TABLE IF NOT EXISTS lost_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    description TEXT,
    tags TEXT,
    photo_url TEXT,
    location_text TEXT,
    status TEXT DEFAULT 'lost',
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // found_items: id, user_id (FK), description, tags (comma-separated string), photo_url, location_text, status
  db.run(`CREATE TABLE IF NOT EXISTS found_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    description TEXT,
    tags TEXT,
    photo_url TEXT,
    location_text TEXT,
    status TEXT DEFAULT 'found',
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

module.exports = db;
