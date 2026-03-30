import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext.jsx';

const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function buildReportHTML(items, filters, users, components, t, lang) {
  const isRTL = lang === 'he';
  const now = new Date().toLocaleDateString(isRTL ? 'he-IL' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // Build filter summary labels
  const filterLines = [];
  if (filters.type      !== 'all') filterLines.push(`${t('reportHTMLFilterType')}: ${
    { requirement: t('typeRequirement'), bug: t('typeBug'), improvement: t('typeImprovement'), 'reminder': t('typeSystemReq') }[filters.type] || filters.type
  }`);
  if (filters.status    !== 'all') filterLines.push(`${t('reportHTMLFilterStatus')}: ${
    { 'open-new': t('statusOpenNew'), open: t('statusOpen'), 'for-test': t('statusForTest'), rejected: t('statusRejected'), closed: t('statusClosed') }[filters.status] || filters.status
  }`);
  if (filters.opened_by !== 'all') {
    const u = users.find(u => String(u.id) === filters.opened_by);
    filterLines.push(`${t('reportHTMLFilterOpenedBy')}: ${u ? u.name : filters.opened_by}`);
  }
  if (filters.assigned_to !== 'all') {
    if (filters.assigned_to === 'unassigned') {
      filterLines.push(`${t('reportHTMLFilterAssignedTo')}: ${t('reportUnassigned')}`);
    } else {
      const u = users.find(u => String(u.id) === filters.assigned_to);
      filterLines.push(`${t('reportHTMLFilterAssignedTo')}: ${u ? u.name : filters.assigned_to}`);
    }
  }
  if (filters.component !== 'all') {
    const c = components.find(c => String(c.id) === filters.component);
    filterLines.push(`${t('reportHTMLFilterComponent')}: ${c ? c.name : filters.component}`);
  }

  const filterSummary = filterLines.length
    ? filterLines.join(' &nbsp;&bull;&nbsp; ')
    : t('reportHTMLNoFilter');

  const priorityLabel = (p) => ({
    high:   t('priorityHigh'),
    medium: t('priorityMedium'),
    low:    t('priorityLow'),
  }[p] || p);

  const typeLabel = (type) => ({
    requirement:          t('typeRequirement'),
    bug:                  t('typeBug'),
    improvement:          t('typeImprovement'),
    'reminder': t('typeSystemReq'),
  }[type] || type);

  const statusLabel = (status) => ({
    'open-new': t('statusOpenNew'),
    open:       t('statusOpen'),
    'for-test': t('statusForTest'),
    rejected:   t('statusRejected'),
    closed:     t('statusClosed'),
  }[status] || status);

  const rows = items.map((item, idx) => {
    const priorityColor = item.priority === 'high' ? '#fee2e2'
      : item.priority === 'medium' ? '#fef9c3'
      : '#dcfce7';
    const priorityText = item.priority === 'high' ? '#b91c1c'
      : item.priority === 'medium' ? '#92400e'
      : '#166534';

    return `
      <tr style="background:${priorityColor}">
        <td style="text-align:center;color:#6b7280">${idx + 1}</td>
        <td>${item.id}</td>
        <td>${typeLabel(item.type)}</td>
        <td style="max-width:260px;white-space:normal;word-break:break-word">
          <strong>${item.title}</strong>
          ${item.description ? `<div style="font-size:0.78rem;color:#555;margin-top:3px">${item.description}</div>` : ''}
        </td>
        <td>${statusLabel(item.status)}</td>
        <td style="font-weight:600;color:${priorityText}">${priorityLabel(item.priority)}</td>
        <td>${item.opened_by_name || '—'}</td>
        <td>${item.assigned_to_name || '—'}</td>
        <td>${item.component_name || '—'}</td>
        <td>${formatDate(item.created_at)}</td>
        <td>${item.status === 'closed' && item.closed_at ? formatDate(item.closed_at) : '—'}</td>
        <td>${item.due_date ? formatDate(item.due_date) : '—'}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8"/>
  <title>${t('reportHTMLTitle')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      color: #1a1a2e;
      padding: 32px 40px;
      font-size: 0.88rem;
      direction: ${isRTL ? 'rtl' : 'ltr'};
    }
    .header { margin-bottom: 24px; }
    .header h1 { font-size: 1.5rem; font-weight: 700; color: #1e1b4b; }
    .meta { margin-top: 6px; color: #6b7280; font-size: 0.82rem; }
    .filters {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 20px;
      font-size: 0.82rem;
      color: #374151;
    }
    .filters strong { margin-inline-end: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: #1e1b4b;
      color: #fff;
      padding: 9px 12px;
      text-align: ${isRTL ? 'right' : 'left'};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
    }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 0.82rem; }
    .count { margin-top: 16px; font-size: 0.8rem; color: #6b7280; text-align: ${isRTL ? 'left' : 'right'}; }
    @media print {
      body { padding: 16px; }
      .no-print { display: none !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>&#128203; ${t('reportHTMLTitle')}</h1>
    <div class="meta">${t('reportHTMLGenerated')} ${now} &nbsp;&bull;&nbsp; ${t('reportHTMLCount', items.length)}</div>
  </div>
  <div class="filters">
    <strong>${t('reportHTMLFilters')}</strong>${filterSummary}
  </div>
  <button class="no-print" onclick="window.print()" style="
    margin-bottom:20px; padding:8px 20px; background:#1e1b4b; color:#fff;
    border:none; border-radius:6px; font-size:0.88rem; cursor:pointer; font-weight:600;">
    ${t('reportHTMLPrintBtn')}
  </button>
  <table>
    <thead>
      <tr>
        <th style="width:36px">${t('reportHTMLColNum')}</th>
        <th style="width:44px">${t('reportHTMLColId')}</th>
        <th>${t('reportHTMLColType')}</th>
        <th style="min-width:220px">${t('reportHTMLColTitle')}</th>
        <th>${t('reportHTMLColStatus')}</th>
        <th>${t('reportHTMLColPriority')}</th>
        <th>${t('reportHTMLColOpenedBy')}</th>
        <th>${t('reportHTMLColAssignedTo')}</th>
        <th>${t('reportHTMLColComponent')}</th>
        <th>${t('reportHTMLColCreated')}</th>
        <th>${t('reportColClosedOn')}</th>
        <th>${t('reportHTMLColDueDate')}</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="12" style="text-align:center;padding:30px;color:#9ca3af">${t('reportHTMLNoItems')}</td></tr>`}
    </tbody>
  </table>
  <div class="count">${t('reportHTMLCount', items.length)}</div>
</body>
</html>`;
}

export default function ReportPanel({ items, users, components }) {
  const { t, lang } = useLanguage();

  const [filters, setFilters] = useState({
    type:        'all',
    status:      'all',
    opened_by:   'all',
    assigned_to: 'all',
    component:   'all',
  });

  const set = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const filteredItems = items
    .filter(item => {
      if (filters.type        !== 'all' && item.type                !== filters.type)        return false;
      if (filters.status      !== 'all' && item.status              !== filters.status)      return false;
      if (filters.opened_by   !== 'all' && String(item.opened_by)   !== filters.opened_by)   return false;
      if (filters.component   !== 'all') {
        if (item.component_id === null || String(item.component_id) !== filters.component)   return false;
      }
      if (filters.assigned_to !== 'all') {
        if (filters.assigned_to === 'unassigned') {
          if (item.assigned_to !== null) return false;
        } else {
          if (String(item.assigned_to) !== filters.assigned_to)                              return false;
        }
      }
      return true;
    })
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 99) - (PRIORITY_ORDER[b.priority] || 99));

  const handleGenerate = () => {
    const html = buildReportHTML(filteredItems, filters, users, components, t, lang);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  const selectStyle = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: '0.88rem',
    background: '#fff',
    color: '#1a1a2e',
    minWidth: 160,
    outline: 'none',
    cursor: 'pointer',
  };

  const labelStyle = {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 28,
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>
          {t('reportTitle')}
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 24 }}>
          {t('reportSubtitle')}
        </p>

        {/* Filters grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}>
          {/* Type */}
          <div>
            <label style={labelStyle}>{t('reportItemType')}</label>
            <select style={selectStyle} value={filters.type} onChange={e => set('type', e.target.value)}>
              <option value="all">{t('reportAllTypes')}</option>
              <option value="requirement">{t('typeRequirement')}</option>
              <option value="bug">{t('typeBug')}</option>
              <option value="improvement">{t('typeImprovement')}</option>
              <option value="reminder">{t('typeSystemReq')}</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>{t('reportStatus')}</label>
            <select style={selectStyle} value={filters.status} onChange={e => set('status', e.target.value)}>
              <option value="all">{t('reportAllStatuses')}</option>
              <option value="open-new">{t('statusOpenNew')}</option>
              <option value="open">{t('statusOpen')}</option>
              <option value="for-test">{t('statusForTest')}</option>
              <option value="rejected">{t('statusRejected')}</option>
              <option value="closed">{t('statusClosed')}</option>
            </select>
          </div>

          {/* Opened By */}
          <div>
            <label style={labelStyle}>{t('reportOpenedBy')}</label>
            <select style={selectStyle} value={filters.opened_by} onChange={e => set('opened_by', e.target.value)}>
              <option value="all">{t('reportAnyone')}</option>
              {users.map(u => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label style={labelStyle}>{t('reportAssignedTo')}</label>
            <select style={selectStyle} value={filters.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="all">{t('reportAnyone')}</option>
              <option value="unassigned">{t('reportUnassigned')}</option>
              {users.map(u => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Component */}
          <div>
            <label style={labelStyle}>{t('reportComponent')}</label>
            <select style={selectStyle} value={filters.component} onChange={e => set('component', e.target.value)}>
              <option value="all">{t('reportAllComponents')}</option>
              {components.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview count + Generate button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-primary" onClick={handleGenerate}>
            {t('reportPreviewBtn')}
          </button>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            {t('reportWillInclude', filteredItems.length)}
          </span>
        </div>
      </div>
    </div>
  );
}
