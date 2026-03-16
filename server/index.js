require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { getDb, initDb }         = require('./database');
const { startScheduler }        = require('./emailScheduler');

// ─── Uploads directory ────────────────────────────────────────────────────────

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Multer configuration ─────────────────────────────────────────────────────

const ALLOWED_MIMETYPES = [
  'text/plain',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.floor(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed.'));
    }
  },
});

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
        i.closed_at,
        u1.name AS opened_by_name,
        u2.name AS assigned_to_name,
        c.name  AS component_name,
        (SELECT COUNT(*) FROM item_attachments ia WHERE ia.item_id = i.id) AS attachment_count
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

    const closedAt = status === 'closed' ? "datetime('now')" : null;

    let result;
    if (closedAt) {
      result = db.prepare(`
        INSERT INTO items (type, title, description, status, priority, opened_by, assigned_to, component_id, closed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(type, title.trim(), description, status, priority,
             opened_by, assigned_to || null, component_id || null);
    } else {
      result = db.prepare(`
        INSERT INTO items (type, title, description, status, priority, opened_by, assigned_to, component_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(type, title.trim(), description, status, priority,
             opened_by, assigned_to || null, component_id || null);
    }

    const newItem = db.prepare(`
      SELECT i.*, u1.name AS opened_by_name, u2.name AS assigned_to_name, c.name AS component_name,
        (SELECT COUNT(*) FROM item_attachments ia WHERE ia.item_id = i.id) AS attachment_count
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

    // Determine closed_at transition
    const wasClosing   = current.status !== 'closed' && newStatus === 'closed';
    const wasOpening   = current.status === 'closed' && newStatus !== 'closed';

    let newClosedAt = current.closed_at;
    if (wasClosing)  newClosedAt = '__now__';
    if (wasOpening)  newClosedAt = null;

    if (newClosedAt === '__now__') {
      db.prepare(`
        UPDATE items
        SET type=?, title=?, description=?, status=?, priority=?,
            opened_by=?, assigned_to=?, component_id=?,
            updated_at=datetime('now'), closed_at=datetime('now')
        WHERE id=?
      `).run(newType, newTitle, newDescription, newStatus, newPriority,
             newOpenedBy, newAssignedTo, newComponentId, id);
    } else {
      db.prepare(`
        UPDATE items
        SET type=?, title=?, description=?, status=?, priority=?,
            opened_by=?, assigned_to=?, component_id=?,
            updated_at=datetime('now'), closed_at=?
        WHERE id=?
      `).run(newType, newTitle, newDescription, newStatus, newPriority,
             newOpenedBy, newAssignedTo, newComponentId, newClosedAt, id);
    }

    const updated = db.prepare(`
      SELECT i.*, u1.name AS opened_by_name, u2.name AS assigned_to_name, c.name AS component_name,
        (SELECT COUNT(*) FROM item_attachments ia WHERE ia.item_id = i.id) AS attachment_count
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

// ─── Attachments ──────────────────────────────────────────────────────────────

app.post('/api/items/:id/attachments', upload.single('file'), (req, res) => {
  try {
    const db = getDb();
    const itemId = parseInt(req.params.id, 10);
    const item = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId);
    if (!item) {
      if (req.file) fs.unlink(path.join(UPLOADS_DIR, req.file.filename), () => {});
      return fail(res, 'Item not found.', 404);
    }
    if (!req.file) return fail(res, 'No file uploaded.');

    const result = db.prepare(`
      INSERT INTO item_attachments (item_id, filename, original_name, mimetype, size)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);

    const att = db.prepare('SELECT * FROM item_attachments WHERE id = ?').get(result.lastInsertRowid);
    ok(res, att);
  } catch (e) {
    if (req.file) fs.unlink(path.join(UPLOADS_DIR, req.file.filename), () => {});
    fail(res, e.message, 500);
  }
});

app.get('/api/items/:id/attachments', (req, res) => {
  try {
    const db = getDb();
    const itemId = parseInt(req.params.id, 10);
    const atts = db.prepare('SELECT * FROM item_attachments WHERE item_id = ? ORDER BY created_at DESC').all(itemId);
    ok(res, atts);
  } catch (e) {
    fail(res, e.message, 500);
  }
});

app.delete('/api/attachments/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    const att = db.prepare('SELECT * FROM item_attachments WHERE id = ?').get(id);
    if (!att) return fail(res, 'Attachment not found.', 404);

    const filePath = path.join(UPLOADS_DIR, att.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM item_attachments WHERE id = ?').run(id);
    ok(res, { id });
  } catch (e) {
    fail(res, e.message, 500);
  }
});

app.get('/api/attachments/:id/file', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    const att = db.prepare('SELECT * FROM item_attachments WHERE id = ?').get(id);
    if (!att) return fail(res, 'Attachment not found.', 404);

    const filePath = path.resolve(path.join(__dirname, 'uploads', att.filename));
    if (!fs.existsSync(filePath)) return fail(res, 'File not found on disk.', 404);

    res.setHeader('Content-Type', att.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${att.original_name}"`);
    res.sendFile(filePath);
  } catch (e) {
    fail(res, e.message, 500);
  }
});

// ─── Users ───────────────────────────────────────────────────────────────────

app.get('/api/users', (req, res) => {
  try {
    const db = getDb();
    ok(res, db.prepare('SELECT id, name, email FROM users ORDER BY name').all());
  } catch (e) {
    fail(res, e.message, 500);
  }
});

app.post('/api/users', (req, res) => {
  try {
    const db = getDb();
    const { name, email = '' } = req.body;
    if (!name || !name.trim()) return fail(res, 'Name is required.');
    const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name.trim(), email.trim());
    ok(res, { id: result.lastInsertRowid, name: name.trim(), email: email.trim() });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE'))
      return fail(res, 'A user with that name already exists.');
    fail(res, e.message, 500);
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) return fail(res, 'User not found.', 404);

    const { name, email } = req.body;
    if (name !== undefined && !name.trim()) return fail(res, 'Name cannot be empty.');

    const newName  = name  !== undefined ? name.trim()  : existing.name;
    const newEmail = email !== undefined ? email.trim() : (existing.email || '');

    db.prepare('UPDATE users SET name=?, email=? WHERE id=?').run(newName, newEmail, id);
    ok(res, { id, name: newName, email: newEmail });
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
    startScheduler();
  })
  .catch(err => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
