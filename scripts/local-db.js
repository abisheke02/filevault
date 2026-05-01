/**
 * FileVault — Local SQLite database
 * Stores users with encrypted passwords. Data is fully inspectable as JSON.
 *
 * Usage:
 *   node scripts/local-db.js                           — interactive demo
 *   node scripts/local-db.js signup "alice" "alice@example.com" "password123"
 *   node scripts/local-db.js list
 *   node scripts/local-db.js verify "alice@example.com" "password123"
 *   node scripts/local-db.js export                    — dump all records as JSON
 */

'use strict';

const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

const DB_PATH  = path.join(__dirname, '../data/filevault.db');
const JSON_PATH = path.join(__dirname, '../data/users.json');

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function openDb() {
  const db = new Database(DB_PATH, { verbose: null });

  db.pragma('journal_mode = WAL');   // safe concurrent reads
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      username     TEXT    NOT NULL UNIQUE,
      email        TEXT    NOT NULL UNIQUE,
      password_hash TEXT   NOT NULL,
      is_admin     INTEGER NOT NULL DEFAULT 0,
      storage_used INTEGER NOT NULL DEFAULT 0,
      storage_quota INTEGER NOT NULL DEFAULT -1,
      created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TRIGGER IF NOT EXISTS users_updated_at
    AFTER UPDATE ON users FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = OLD.id;
    END;

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);

  return db;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
const SALT_ROUNDS = 12;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

// ── User operations ───────────────────────────────────────────────────────────
function signup(db, username, email, password) {
  if (!username || !email || !password)
    throw new Error('username, email and password are all required');
  if (password.length < 8)
    throw new Error('Password must be at least 8 characters');

  const emailLower = email.toLowerCase().trim();

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?')
                     .get(emailLower, username);
  if (existing) throw new Error('Username or email already taken');

  const passwordHash = hashPassword(password);

  const stmt = db.prepare(`
    INSERT INTO users (username, email, password_hash)
    VALUES (?, ?, ?)
    RETURNING id, username, email, is_admin, storage_used, storage_quota, created_at
  `);

  const user = stmt.get(username, emailLower, passwordHash);
  syncJson(db);
  return user;
}

function login(db, email, password) {
  const emailLower = email.toLowerCase().trim();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(emailLower);

  if (!row) throw new Error('Invalid email or password');
  if (!verifyPassword(password, row.password_hash)) throw new Error('Invalid email or password');

  // Return safe user (no hash)
  const { password_hash, ...safe } = row;
  return safe;
}

function listUsers(db) {
  return db.prepare(`
    SELECT id, username, email, is_admin, storage_used, storage_quota, created_at, updated_at
    FROM users ORDER BY created_at ASC
  `).all();
}

function deleteUser(db, email) {
  const r = db.prepare('DELETE FROM users WHERE email = ? RETURNING id, username, email')
              .get(email.toLowerCase().trim());
  if (!r) throw new Error(`User ${email} not found`);
  syncJson(db);
  return r;
}

// ── JSON mirror ───────────────────────────────────────────────────────────────
function syncJson(db) {
  const users = listUsers(db);
  const payload = {
    _meta: { generated: new Date().toISOString(), count: users.length },
    users,
  };
  fs.writeFileSync(JSON_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

// ── CLI ───────────────────────────────────────────────────────────────────────
function main() {
  const db  = openDb();
  const cmd = process.argv[2];

  switch (cmd) {

    case 'signup': {
      const [,, , username, email, password] = process.argv;
      try {
        const user = signup(db, username, email, password);
        console.log('\n  User created:\n');
        console.log(JSON.stringify(user, null, 2));
        console.log(`\n  Saved to: ${JSON_PATH}\n`);
      } catch (e) {
        console.error(`\n  Error: ${e.message}\n`);
        process.exit(1);
      }
      break;
    }

    case 'verify': {
      const [,, , email, password] = process.argv;
      try {
        const user = login(db, email, password);
        console.log('\n  Login OK:\n');
        console.log(JSON.stringify(user, null, 2));
      } catch (e) {
        console.error(`\n  ${e.message}\n`);
        process.exit(1);
      }
      break;
    }

    case 'list': {
      const users = listUsers(db);
      console.log(`\n  Users (${users.length}):\n`);
      console.log(JSON.stringify(users, null, 2));
      break;
    }

    case 'export': {
      syncJson(db);
      console.log(`\n  Exported to: ${JSON_PATH}\n`);
      console.log(fs.readFileSync(JSON_PATH, 'utf8'));
      break;
    }

    case 'delete': {
      const [,, , email] = process.argv;
      try {
        const r = deleteUser(db, email);
        console.log(`\n  Deleted: ${JSON.stringify(r)}\n`);
      } catch (e) {
        console.error(`\n  Error: ${e.message}\n`);
        process.exit(1);
      }
      break;
    }

    default: {
      // Interactive demo — seed some test users and show results
      console.log('\n  FileVault — Local SQLite Demo\n');

      const demo = [
        { username: 'admin',   email: 'admin@filevault.local',   password: 'Admin@1234'  },
        { username: 'alice',   email: 'alice@filevault.local',   password: 'Alice@5678'  },
        { username: 'bob',     email: 'bob@filevault.local',     password: 'Bob@9012'    },
      ];

      let created = 0;
      for (const u of demo) {
        try {
          signup(db, u.username, u.email, u.password);
          created++;
          console.log(`  + created: ${u.username} <${u.email}>`);
        } catch (e) {
          console.log(`  ~ exists : ${u.username} (${e.message})`);
        }
      }

      console.log(`\n  ${created} user(s) created.\n`);

      // Verify a login
      try {
        const user = login(db, 'admin@filevault.local', 'Admin@1234');
        console.log(`  Login test OK for: ${user.username}\n`);
      } catch (e) {
        console.log(`  Login test FAILED: ${e.message}\n`);
      }

      // Show all users
      const users = listUsers(db);
      console.log(`  All users (${users.length}):\n`);
      console.log(JSON.stringify(users, null, 2));

      // Sync JSON mirror
      syncJson(db);
      console.log(`\n  Database : ${DB_PATH}`);
      console.log(`  JSON file: ${JSON_PATH}\n`);
    }
  }

  db.close();
}

main();

// Export functions for use as a module in the NestJS backend
module.exports = { openDb, signup, login, listUsers, deleteUser, hashPassword, verifyPassword };
