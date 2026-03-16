const cron       = require('node-cron');
const nodemailer = require('nodemailer');
const { getDb }  = require('./database');

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TYPE_LABELS = {
  requirement: 'Requirement',
  bug:         'Bug',
  improvement: 'Improvement',
};

const STATUS_LABELS = {
  'open-new': 'Open – New',
  open:       'Open',
  rejected:   'Rejected',
};

const PRIORITY_COLORS = {
  high:   { bg: '#fee2e2', text: '#b91c1c' },
  medium: { bg: '#fef9c3', text: '#92400e' },
  low:    { bg: '#dcfce7', text: '#166534' },
};

// ── email HTML builder ────────────────────────────────────────────────────────

function buildEmailHtml(user, items) {
  const now = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const rows = items.map((item, idx) => {
    const pc = PRIORITY_COLORS[item.priority] || { bg: '#f3f4f6', text: '#374151' };
    return `
      <tr style="background:${pc.bg}">
        <td style="padding:10px 12px;color:#9ca3af;font-size:0.82rem;border-bottom:1px solid #e5e7eb">${idx + 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">
          <strong style="font-size:0.88rem;color:#1a1a2e">${item.title}</strong>
          ${item.description ? `<div style="font-size:0.78rem;color:#6b7280;margin-top:3px">${item.description}</div>` : ''}
        </td>
        <td style="padding:10px 12px;font-size:0.82rem;color:#374151;border-bottom:1px solid #e5e7eb">${TYPE_LABELS[item.type] || item.type}</td>
        <td style="padding:10px 12px;font-size:0.82rem;color:#374151;border-bottom:1px solid #e5e7eb">${STATUS_LABELS[item.status] || item.status}</td>
        <td style="padding:10px 12px;font-size:0.82rem;font-weight:600;color:${pc.text};border-bottom:1px solid #e5e7eb">${item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}</td>
        <td style="padding:10px 12px;font-size:0.82rem;color:#374151;border-bottom:1px solid #e5e7eb">${item.component_name || '—'}</td>
        <td style="padding:10px 12px;font-size:0.78rem;color:#9ca3af;border-bottom:1px solid #e5e7eb">${formatDate(item.created_at)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1a1a2e">
  <div style="max-width:720px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">

    <!-- Header -->
    <div style="background:#1e1b4b;padding:24px 32px">
      <div style="font-size:1.3rem;font-weight:700;color:#fff">&#128203; Team Tracker — Weekly Digest</div>
      <div style="margin-top:6px;font-size:0.85rem;color:rgba(255,255,255,0.65)">${now}</div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px">
      <p style="font-size:1rem;color:#374151;margin:0 0 8px">Hi <strong>${user.name}</strong>,</p>
      <p style="font-size:0.88rem;color:#6b7280;margin:0 0 24px">
        You have <strong style="color:#1a1a2e">${items.length} open item${items.length !== 1 ? 's' : ''}</strong> assigned to you.
        Items are sorted by priority (High first).
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:0.85rem">
        <thead>
          <tr style="background:#f8f9fb">
            <th style="padding:9px 12px;text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">#</th>
            <th style="padding:9px 12px;text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;min-width:200px">Title</th>
            <th style="padding:9px 12px;text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Type</th>
            <th style="padding:9px 12px;text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Status</th>
            <th style="padding:9px 12px;text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Priority</th>
            <th style="padding:9px 12px;text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Component</th>
            <th style="padding:9px 12px;text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb">Created</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#f8f9fb;padding:16px 32px;border-top:1px solid #e5e7eb;font-size:0.78rem;color:#9ca3af">
      This is an automated weekly digest from Team Tracker. You are receiving this because items are assigned to you.
    </div>
  </div>
</body>
</html>`;
}

// ── send all weekly digests ───────────────────────────────────────────────────

async function sendWeeklyEmails() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Email] SMTP not configured — skipping weekly digest. Set SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env to enable.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const db    = getDb();
  const users = db.prepare(`SELECT id, name, email FROM users WHERE email IS NOT NULL AND email != ''`).all();

  let sent = 0;
  for (const user of users) {
    const items = db.prepare(`
      SELECT i.*, c.name AS component_name
      FROM items i
      LEFT JOIN components c ON c.id = i.component_id
      WHERE i.assigned_to = ? AND i.status != 'closed'
      ORDER BY
        CASE i.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        i.created_at DESC
    `).all(user.id);

    if (items.length === 0) {
      console.log(`[Email] Skipping ${user.name} — no open items.`);
      continue;
    }

    try {
      await transporter.sendMail({
        from:    process.env.SMTP_FROM || process.env.SMTP_USER,
        to:      user.email,
        subject: `Weekly Digest — ${items.length} open item${items.length !== 1 ? 's' : ''} assigned to you`,
        html:    buildEmailHtml(user, items),
      });
      console.log(`[Email] Sent to ${user.name} <${user.email}> — ${items.length} item(s)`);
      sent++;
    } catch (err) {
      console.error(`[Email] Failed to send to ${user.name} <${user.email}>:`, err.message);
    }
  }

  console.log(`[Email] Weekly digest done. Sent: ${sent}, Skipped: ${users.length - sent}`);
}

// ── scheduler ────────────────────────────────────────────────────────────────

function startScheduler() {
  // Every Monday at 08:00 AM server time
  cron.schedule('0 8 * * 1', () => {
    console.log('[Email] Starting weekly digest...');
    sendWeeklyEmails().catch(err => console.error('[Email] Unexpected error:', err));
  });
  console.log('[Email] Scheduler ready — weekly digest runs every Monday at 08:00');
}

module.exports = { startScheduler, sendWeeklyEmails };
