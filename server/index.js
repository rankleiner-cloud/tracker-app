const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { getDb, initDb } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Utility ────────────────────────────────────────────────────────────────

function ok(res, data)        { res.json({ success: true,  data }); }
function fail(res, msg, code) { res.status(code || 400).json({ success: false, error: msg }); }

// ─── Items ───────────────────────────────────────────────────────────────────

app.get('/api/items', (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare(`
      SELECT
        i.id,
        i.type,
        i.title,
        i.description,
        i.status,
        i.priority,
        i.opened_by,
        i.assigned_to,
        i.component_id,
        i.created_at,
        i.updated_at,
        u1.name AS opened_by_name,
        u2.name AS assigned_to_name,
        c.name  AS component_name
      FROM items i
      LEFT JOIN users      u1 ON u1.id = i.opened_by
      LEFT JOIN users      u2 ON u2.id = i.assigned_to
      LEFT JOIN components c  ON c.id  = i.component_id
      ORDER BY i.created_at DESC
    `).all();
    ok(res, items);
  } catch (e) {
    fail(res, e.message, 500);
  }
});

app.post('/api/items', (req, res) => {
  try {
    const db = getDb();
    const {
      type        = 'requirement',
      title,
      description = '',
      status      = 'open-new',
      priority    = 'medium',
      opened_by,
      assigned_to  = null,
      component_id = null,
    } = req.body;

    if (!title || !title.trim())   return fail(res, 'Title is required.');
    if (!opened_by)                return fail(res, 'Opened By is required.');

    const validTypes      = ['requirement', 'bug', 'improvement'];
    const validStatuses   = ['open-new', 'open', 'rejected', 'closed'];
    const validPriorities = ['high', 'medium', 'low'];
    if (!validTypes.includes(type))          return fail(res, 'Invalid type.');
    if (!validStatuses.includes(status))     return fail(res, 'Invalid status.');
    if (!validPriorities.includes(priority)) return fail(res, 'Invalid priority.');

    const result = db.prepare(`
      INSERT INTO items (type, title, description, status, priority, opened_by, assigned_to, component_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(type, title.trim(), description, status, priority,
           opened_by, assigned_to || null, component_id || null);

    const newItem = db.prepare(`
      SELECT i.*, u1.name AS opened_by_name, u2.name AS assigned_to_name, c.name AS component_name
      FROM items i
      LEFT JOIN users u1 ON u1.id = i.opened_by
      LEFT JOIN users u2 ON u2.id = i.assigned_to
      LEFT JOIN components c ON c.id = i.component_id
      WHERE i.id = ?
    `).get(result.lastInsertRowid);

    ok(res, newItem);
  } catch (e) {
    fail(res, e.message, 500);
  }
});

app.put('/api/items/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    const current = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!current) return fail(res, 'Item not found.', 404);

    const {
      type, title, description, status, priority,
      opened_by, assigned_to, component_id,
    } = req.body;

    if (title !== undefined && !title.trim()) return fail(res, 'Title cannot be empty.');

    const newType        = type        !== undefined ? type          : current.type;
    const newTitle       = title       !== undefined ? title.trim()  : current.title;
    const newDescription = description !== undefined ? description   : current.description;
    const newStatus      = status      !== undefined ? status        : current.status;
    const newPriority    = priority    !== undefined ? priority      : current.priority;
    const newOpenedBy    = opened_by   !== undefined ? opened_by     : current.opened_by;
    const newAssignedTo  = assigned_to  !== undefined ? (assigned_to  || null) : current.assigned_to;
    const newComponentId = component_id !== undefined ? (component_id || null) : current.component_id;

    db.prepare(`
      UPDATE items
      SET type=?, title=?, description=?, status=?, priority=?,
          opened_by=?, assigned_to=?, component_id=?,
          updated_at=datetime('now')
      WHERE id=?
    `).run(newType, newTitle, newDescription, newStatus, newPriority,
           newOpenedBy, newAssignedTo, newComponentId, id);

    const updated = db.prepare(`
      SELECT i.*, u1.name AS opened_by_name, u2.name AS assigned_to_name, c.name AS component_name
      FROM items i
      LEFT JOIN users u1 ON u1.id = i.opened_by
      LEFT JOIN users u2 ON u2.id = i.assigned_to
      LEFT JOIN components c ON c.id = i.component_id
      WHERE i.id = ?
    `).get(id);

    ok(res, updated);
  } catch (e) {
    fail(res, e.message, 500);
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
    if (!existing) return fail(res, 'Item not found.', 404);
    db.prepare('DELETE FROM items WHERE id = ?').run(id);
    ok(res, { id });
  } catch (e) {
    fail(res, e.message, 500);
  }
});

// ─── Users ───────────────────────────────────────────────────────────────────

app.get('/api/users', (req, res) => {
  try {
    const db = getDb();
    ok(res, db.prepare('SELECT * FROM users ORDER BY name').all());
  } catch (e) {
    fail(res, e.message, 500);
  }
});

app.post('/api/users', (req, res) => {
  try {
    const db = getDb();
    const { name } = req.body;
    if (!name || !name.trim()) return fail(res, 'Name is required.');
    const result = db.prepare('INSERT INTO users (name) VALUES (?)').run(name.trim());
    ok(res, { id: result.lastInsertRowid, name: name.trim() });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE'))
      return fail(res, 'A user with that name already exists.');
    fail(res, e.message, 500);
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!existing) return fail(res, 'User not found.', 404);
    // Check if referenced by items (opened_by OR assigned_to)
    const openedByCount  = db.prepare('SELECT COUNT(*) AS c FROM items WHERE opened_by  = ?').get(id);
    const assignedCount  = db.prepare('SELECT COUNT(*) AS c FROM items WHERE assigned_to = ?').get(id);
    const total = (openedByCount?.c || 0) + (assignedCount?.c || 0);
    if (total > 0) return fail(res, 'Cannot delete: user is referenced by one or more items.');
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    ok(res, { id });
  } catch (e) {
    fail(res, e.message, 500);
  }
});

// ─── Components ──────────────────────────────────────────────────────────────

app.get('/api/components', (req, res) => {
  try {
    const db = getDb();
    ok(res, db.prepare('SELECT * FROM components ORDER BY name').all());
  } catch (e) {
    fail(res, e.message, 500);
  }
});

app.post('/api/components', (req, res) => {
  try {
    const db = getDb();
    const { name } = req.body;
    if (!name || !name.trim()) return fail(res, 'Name is required.');
    const result = db.prepare('INSERT INTO components (name) VALUES (?)').run(name.trim());
    ok(res, { id: result.lastInsertRowid, name: name.trim() });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE'))
      return fail(res, 'A component with that name already exists.');
    fail(res, e.message, 500);
  }
});

app.delete('/api/components/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT id FROM components WHERE id = ?').get(id);
    if (!existing) return fail(res, 'Component not found.', 404);
    const inUse = db.prepare('SELECT COUNT(*) AS c FROM items WHERE component_id = ?').get(id);
    if (inUse?.c > 0) return fail(res, 'Cannot delete: component is referenced by one or more items.');
    db.prepare('DELETE FROM components WHERE id = ?').run(id);
    ok(res, { id });
  } catch (e) {
    fail(res, e.message, 500);
  }
});

// ─── Serve React build in production ─────────────────────────────────────────

const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Tracker server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
