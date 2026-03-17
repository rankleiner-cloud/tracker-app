/**
 * database.js  –  SQLite via sql.js (pure JS, no native build needed)
 *
 * sql.js keeps the database in-memory.  We persist it to disk as a binary
 * file (tracker.db) on every write so data survives restarts.
 */

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tracker.db');

let db   = null;   // sql.js Database instance
let ready = false;

// ── persistence helpers ──────────────────────────────────────────────────────

function saveToDisk() {
  const data = db.export();          // Uint8Array
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Returns an object that mimics the better-sqlite3 synchronous API used in
 * index.js, so index.js needs no changes:
 *   db.prepare(sql).all(...)
 *   db.prepare(sql).get(...)
 *   db.prepare(sql).run(...)
 *   db.exec(sql)
 */
function getDb() {
  if (!db) throw new Error('Database not initialised yet – call initDb() first.');
  return dbProxy;
}

// ── init (async once at startup) ─────────────────────────────────────────────

async function initDb() {
  if (ready) return;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createSchema();
  seedData();
  saveToDisk();
  ready = true;
}

// ── schema ────────────────────────────────────────────────────────────────────

function createSchema() {
  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL DEFAULT ''
    );
  `);

  // Add email column to existing databases that were created before this column existed
  try { db.run(`ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''`); } catch (_) {}


  db.run(`
    CREATE TABLE IF NOT EXISTS components (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      type         TEXT    NOT NULL DEFAULT 'requirement',
      title        TEXT    NOT NULL,
      description  TEXT    DEFAULT '',
      status       TEXT    NOT NULL DEFAULT 'open-new',
      priority     TEXT    NOT NULL DEFAULT 'medium',
      opened_by    INTEGER REFERENCES users(id),
      assigned_to  INTEGER REFERENCES users(id),
      component_id INTEGER REFERENCES components(id),
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now')),
      closed_at    TEXT DEFAULT NULL,
      due_date     TEXT DEFAULT NULL
    );
  `);

  // Add closed_at column to existing databases
  try { db.run(`ALTER TABLE items ADD COLUMN closed_at TEXT DEFAULT NULL`); } catch (_) {}
  try { db.run(`ALTER TABLE items ADD COLUMN due_date TEXT DEFAULT NULL`); } catch (_) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS item_attachments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      filename      TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype      TEXT NOT NULL,
      size          INTEGER NOT NULL,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ── seed ──────────────────────────────────────────────────────────────────────

function seedData() {
  const count = execGet('SELECT COUNT(*) AS c FROM users');
  if (count && count.c > 0) return;

  execRun(`INSERT INTO users (name) VALUES ('Alice')`);
  execRun(`INSERT INTO users (name) VALUES ('Bob')`);
  execRun(`INSERT INTO users (name) VALUES ('Carol')`);

  execRun(`INSERT INTO components (name) VALUES ('Frontend')`);
  execRun(`INSERT INTO components (name) VALUES ('Backend')`);
  execRun(`INSERT INTO components (name) VALUES ('Database')`);

  execRun(`
    INSERT INTO items (type, title, description, status, priority, opened_by, assigned_to, component_id)
    VALUES (
      'requirement',
      'User authentication flow',
      'Implement login, logout and session management for all team members.',
      'open', 'high',
      (SELECT id FROM users WHERE name='Alice'),
      (SELECT id FROM users WHERE name='Bob'),
      (SELECT id FROM components WHERE name='Backend')
    )
  `);

  execRun(`
    INSERT INTO items (type, title, description, status, priority, opened_by, assigned_to, component_id)
    VALUES (
      'bug',
      'Table pagination breaks on mobile',
      'When viewing the items table on a phone screen, the pagination controls overlap the row content.',
      'open-new', 'medium',
      (SELECT id FROM users WHERE name='Bob'),
      (SELECT id FROM users WHERE name='Carol'),
      (SELECT id FROM components WHERE name='Frontend')
    )
  `);

  execRun(`
    INSERT INTO items (type, title, description, status, priority, opened_by, assigned_to, component_id)
    VALUES (
      'improvement',
      'Add CSV export for items list',
      'Allow users to download the current filtered view as a CSV file for reporting purposes.',
      'open-new', 'low',
      (SELECT id FROM users WHERE name='Carol'),
      NULL,
      NULL
    )
  `);
}

// ── low-level helpers (sql.js API) ────────────────────────────────────────────

function execRun(sql, params = []) {
  db.run(sql, params);
  return { lastInsertRowid: db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0] ?? null };
}

function execGet(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length || !result[0].values.length) return null;
  const { columns, values } = result[0];
  return zipRow(columns, values[0]);
}

function execAll(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => zipRow(columns, row));
}

function zipRow(columns, row) {
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i] ?? null; });
  return obj;
}

// ── proxy that mimics better-sqlite3 API ─────────────────────────────────────

const dbProxy = {
  prepare(sql) {
    return {
      all(...params) {
        const flat = params.flat();
        return execAll(sql, flat);
      },
      get(...params) {
        const flat = params.flat();
        return execGet(sql, flat);
      },
      run(...params) {
        const flat = params.flat();
        const result = execRun(sql, flat);
        saveToDisk();
        return result;
      },
    };
  },
  exec(sql) {
    db.run(sql);
    saveToDisk();
  },
};

module.exports = { getDb, initDb };
