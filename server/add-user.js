/**
 * One-time helper: adds a user to the local tracker.db
 * Usage:  node add-user.js "Your Name" "your@email.com"
 */

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tracker.db');

const [,, name, email] = process.argv;

if (!name || !email) {
  console.error('Usage: node add-user.js "Your Name" "your@email.com"');
  process.exit(1);
}

(async () => {
  const SQL = await initSqlJs();
  const db  = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  try {
    db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name.trim(), email.trim()]);
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    console.log(`✓ User "${name.trim()}" added successfully. You can now log in.`);
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      // User exists — update the email instead
      db.run('UPDATE users SET email = ? WHERE LOWER(name) = LOWER(?)', [email.trim(), name.trim()]);
      fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
      console.log(`✓ Email updated for existing user "${name.trim()}".`);
    } else {
      console.error('Error:', e.message);
      process.exit(1);
    }
  }
})();
