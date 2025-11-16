const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'forum.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
db.serialize(() => {
  // Topics table
  db.run(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Comments table
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      file_link TEXT,
      totp_secret TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    )
  `);

  // Users table for signup system
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Captchas table for verification
  db.run(`
    CREATE TABLE IF NOT EXISTS captchas (
      key TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Create a default topic if none exists
  db.get('SELECT COUNT(*) as count FROM topics', (err, row) => {
    if (!err && row.count === 0) {
      db.run(
        'INSERT INTO topics (title) VALUES (?)',
        ['Welcome to the Secure Forum'],
        (err) => {
          if (!err) {
            console.log('Created default topic');
          }
        }
      );
    }
  });
});

module.exports = db;
