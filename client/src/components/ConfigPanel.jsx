import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext.jsx';

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function AddForm({ placeholder, addLabel, onAdd }) {
  const { t } = useLanguage();
  const [value, setValue]   = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) { setError(t('configNameRequired', addLabel)); return; }
    setError('');
    setLoading(true);
    try {
      await onAdd(trimmed);
      setValue('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 180 }}>
        <input
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); setError(''); }}
          placeholder={placeholder}
          style={{
            padding: '8px 12px',
            border: error ? '1px solid #ef4444' : '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: '0.88rem',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; }}
          onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#d1d5db'; e.target.style.boxShadow = 'none'; }}
        />
        {error && <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 3 }}>{error}</span>}
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
        {loading ? t('configAdding') : t('configAddBtn', addLabel)}
      </button>
    </form>
  );
}

function ConfigSection({ title, icon, items, onDelete, addPlaceholder, addLabel, onAdd }) {
  const { t } = useLanguage();
  const [deletingId, setDeletingId]   = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async (id, name) => {
    if (!window.confirm(t('configDeleteConfirm', name))) return;
    setDeleteError('');
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #e5e7eb',
        background: '#f8f9fb',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' }}>{title}</h3>
        <span style={{
          background: '#e5e7eb',
          borderRadius: 20,
          padding: '1px 9px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#6b7280',
          marginInlineStart: 4,
        }}>{items.length}</span>
      </div>

      {/* List */}
      <div style={{ padding: '4px 0' }}>
        {items.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
            {t('configEmpty', title)}
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              borderBottom: '1px solid #f3f4f6',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>
                {item.name}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: '#ef4444' }}
                onClick={() => handleDelete(item.id, item.name)}
                disabled={deletingId === item.id}
                title={`Delete ${item.name}`}
              >
                <TrashIcon />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Error */}
      {deleteError && (
        <div style={{ padding: '0 20px 8px' }}>
          <div className="error-msg">{deleteError}</div>
        </div>
      )}

      {/* Add form */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid #e5e7eb',
        background: '#fafafa',
      }}>
        <AddForm placeholder={addPlaceholder} addLabel={addLabel} onAdd={onAdd} />
      </div>
    </div>
  );
}

export default function ConfigPanel({
  users, components,
  onAddUser, onDeleteUser,
  onAddComponent, onDeleteComponent,
}) {
  const { t } = useLanguage();

  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a1a2e', marginBottom: 20 }}>
        {t('configTitle')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <ConfigSection
          title={t('configTeamMembers')}
          icon="&#128100;"
          items={users}
          onDelete={onDeleteUser}
          addPlaceholder={t('configAddUserPlaceholder')}
          addLabel={t('configAddUser')}
          onAdd={onAddUser}
        />
        <ConfigSection
          title={t('configSubComponents')}
          icon="&#128736;"
          items={components}
          onDelete={onDeleteComponent}
          addPlaceholder={t('configAddCompPlaceholder')}
          addLabel={t('configAddComp')}
          onAdd={onAddComponent}
        />
      </div>
    </div>
  );
}
