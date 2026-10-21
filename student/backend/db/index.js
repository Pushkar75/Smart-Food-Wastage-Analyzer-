/**
 * Database connection.
 *
 * SQLite via better-sqlite3, chosen because its API is synchronous: every
 * accessor in store.js keeps the exact signature it had when the data lived in
 * in-memory Maps, so no route handler and nothing in the frontend had to change.
 *
 * Set DB_PATH to point somewhere else, or to ':memory:' for a throwaway
 * database (used by the smoke test).
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_PATH = path.join(__dirname, '..', 'data', 'smartmess.db');
const dbPath = process.env.DB_PATH || DEFAULT_PATH;

if (dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const rawDb = new DatabaseSync(dbPath);

const db = {
  exec(sql) {
    return rawDb.exec(sql);
  },
  prepare(sql) {
    const stmt = rawDb.prepare(sql);
    return {
      get(...args) {
        return stmt.get(...args) || undefined;
      },
      all(...args) {
        return stmt.all(...args);
      },
      run(...args) {
        const res = stmt.run(...args);
        return {
          changes: res.changes,
          lastInsertRowid: res.lastInsertRowid,
        };
      },
    };
  },
  pragma(sql) {
    try {
      rawDb.exec(`PRAGMA ${sql};`);
    } catch {
      // PRAGMAs non-fatal if unsupported in memory mode
    }
  },
  transaction(fn) {
    return (...args) => {
      rawDb.exec('BEGIN IMMEDIATE;');
      try {
        const result = fn(...args);
        rawDb.exec('COMMIT;');
        return result;
      } catch (err) {
        try {
          rawDb.exec('ROLLBACK;');
        } catch (_) {}
        throw err;
      }
    };
  },
};

// WAL lets the dashboard keep reading while a student saves an intent.
// busy_timeout (5000ms) waits for locks to clear when concurrent backends boot.
if (dbPath !== ':memory:') {
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
}
db.pragma('foreign_keys = ON');

// The schema is all CREATE ... IF NOT EXISTS, so applying it on every boot is
// both the first-run setup and a no-op for an existing database.
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

// Migration: add fingerprint_id column if database already exists
try {
  db.exec('ALTER TABLE users ADD COLUMN fingerprint_id INTEGER;');
} catch (err) {
  // Column already exists
}

try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_fingerprint_id ON users (fingerprint_id) WHERE fingerprint_id IS NOT NULL;');
} catch (err) {
  // Index already exists
}

module.exports = { db, dbPath };

