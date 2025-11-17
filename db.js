import sqlite3 from 'sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = path.join(__dirname, 'forum.db');
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath);

// Initialize database schema
db.serialize(() => {
    // Topics table
    db.run(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Comments table
    db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      file_link TEXT,
      totp_secret TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    )
  `);

    // Users table - for storing registered user keys
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      author_name TEXT UNIQUE NOT NULL,
      key_hash TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Captchas table - for captcha verification
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
            const topicId = uuidv4();
            db.run(
                'INSERT INTO topics (id, title, author, key_hash) VALUES (?, ?, ?, ?)',
                [topicId, 'Welcome to the Secure Forum', 'System', 'system'],
                (err) => {
                    if (!err) {
                        console.log('Created default topic');
                    }
                }
            );
        }
    });
});

export default db;
