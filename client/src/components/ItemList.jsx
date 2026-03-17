import React from 'react';
import { useLanguage } from '../LanguageContext.jsx';

const PRIORITY_ROW_COLORS = {
  high:   '#fff5f5',
  medium: '#fffbeb',
  low:    '#f0fdf4',
};

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}

function formatDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDueStatus(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = (due - today) / (1000 * 60 * 60 * 24);
  if (diffDays < 0)  return 'overdue';
  if (diffDays <= 7) return 'soon';
  return 'ok';
}

export default function ItemList({ items, onEdit, onDelete, onDuplicate, onNewItem, totalCount, onOpenAttachments, sortDue, onSortDue, isClosedView }) {
  const { t } = useLanguage();

  const typeLabel = (type) => ({
    requirement:        t('typeRequirement'),
    bug:                t('typeBug'),
    improvement:        t('typeImprovement'),
    'system-requirement': t('typeSystemReq'),
  }[type] || type);

  const statusLabel = (status) => ({
    'open-new': t('statusOpenNew'),
    open:       t('statusOpen'),
    rejected:   t('statusRejected'),
    closed:     t('statusClosed'),
  }[status] || status);

  const priorityLabel = (p) => ({
    high:   t('priorityHigh'),
    medium: t('priorityMedium'),
    low:    t('priorityLow'),
  }[p] || p);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>
            {isClosedView ? t('navClosed') : t('itemsTitle')}
          </span>
          <span style={{
            marginInlineStart: 10,
            background: '#e5e7eb',
            borderRadius: 20,
            padding: '2px 10px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#6b7280',
          }}>
            {items.length}{items.length !== totalCount ? ` / ${totalCount}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isClosedView && (
            <button
              className={`btn btn-sm ${sortDue ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onSortDue(sortDue === null ? 'asc' : sortDue === 'asc' ? 'desc' : null)}
              title="Sort by due date"
            >
              {sortDue === 'asc' ? t('sortDueAsc') : sortDue === 'desc' ? t('sortDueDesc') : t('sortDueAsc')}
            </button>
          )}
          {!isClosedView && (
            <button className="btn btn-primary btn-sm" onClick={onNewItem}>
              {t('newItem')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 50 }}>{t('colId')}</th>
              <th>{t('colType')}</th>
              <th style={{ minWidth: 200 }}>{t('colTitle')}</th>
              <th>{t('colStatus')}</th>
              <th>{t('colPriority')}</th>
              <th>{t('colOpenedBy')}</th>
              <th>{t('colAssignedTo')}</th>
              <th>{t('colComponent')}</th>
              <th>{isClosedView ? t('reportColClosedOn') : t('colDueDate')}</th>
              <th style={{ width: 90 }}>{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                  {t('noItems')}
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr
                  key={item.id}
                  style={{
                    background: PRIORITY_ROW_COLORS[item.priority] || '#fff',
                    transition: 'filter 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.97)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                >
                  <td style={{ color: '#9ca3af', fontSize: '0.82rem' }}>{item.id}</td>
                  <td>
                    <span className={`badge badge-type-${item.type}`}>
                      {typeLabel(item.type)}
                    </span>
                  </td>
                  <td style={{ maxWidth: 280, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    <span style={{ fontWeight: 500 }}>{item.title}</span>
                    {item.description && (
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', whiteSpace: 'normal' }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-status-${item.status}`}>
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-priority-${item.priority}`}>
                      {priorityLabel(item.priority) || '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.88rem' }}>{item.opened_by_name || '—'}</td>
                  <td style={{ fontSize: '0.88rem' }}>{item.assigned_to_name || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td style={{ fontSize: '0.88rem' }}>{item.component_name || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td style={{ fontSize: '0.82rem' }}>
                    {isClosedView ? (
                      <span style={{ color: '#6b7280' }}>
                        {item.closed_at ? formatDate(item.closed_at) : <span style={{ color: '#d1d5db' }}>—</span>}
                      </span>
                    ) : (() => {
                      const ds = getDueStatus(item.due_date);
                      const color = ds === 'overdue' ? '#7c3aed' : '#6b7280';
                      return (
                        <span style={{ color, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {ds === 'overdue' && <span title="Overdue" style={{ fontSize: '1rem' }}>⚠️</span>}
                          {ds === 'soon'    && <span title="Due soon" style={{ fontSize: '1rem' }}>💡</span>}
                          {item.due_date ? formatDate(item.due_date) : <span style={{ color: '#d1d5db' }}>—</span>}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onEdit(item)}
                        title={t('editItemTitle')}
                        style={{ color: '#4f46e5' }}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onDuplicate(item)}
                        title={t('duplicateItem')}
                        style={{ color: '#059669' }}
                      >
                        <DuplicateIcon />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onDelete(item.id)}
                        title="Delete"
                        style={{ color: '#ef4444' }}
                      >
                        <TrashIcon />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onOpenAttachments(item)}
                        title={t('attachments')}
                        style={{ color: '#6b7280', position: 'relative' }}
                      >
                        <PaperclipIcon />
                        {item.attachment_count > 0 && (
                          <span style={{
                            position: 'absolute', top: -4, right: -4,
                            background: '#4f46e5', color: '#fff',
                            borderRadius: '50%', width: 14, height: 14,
                            fontSize: '0.6rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1,
                          }}>{item.attachment_count}</span>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
