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

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

// ── Users section (with edit + email) ────────────────────────────────────────

function UsersSection({ users, onAdd, onEdit, onDelete }) {
  const { t } = useLanguage();

  // Inline edit state
  const [editingId, setEditingId]   = useState(null);
  const [editName, setEditName]     = useState('');
  const [editEmail, setEditEmail]   = useState('');
  const [editError, setEditError]   = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId]   = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // Add form state
  const [addName, setAddName]     = useState('');
  const [addEmail, setAddEmail]   = useState('');
  const [addError, setAddError]   = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const inputStyle = (hasError) => ({
    flex: 1,
    minWidth: 120,
    padding: '6px 10px',
    border: `1px solid ${hasError ? '#ef4444' : '#d1d5db'}`,
    borderRadius: 6,
    fontSize: '0.88rem',
    outline: 'none',
    fontFamily: 'inherit',
  });

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email || '');
    setEditError('');
  };

  const cancelEdit = () => { setEditingId(null); setEditError(''); };

  const saveEdit = async () => {
    if (!editName.trim()) { setEditError(t('configNameRequired', t('configAddUser'))); return; }
    setEditSaving(true);
    setEditError('');
    try {
      await onEdit(editingId, editName.trim(), editEmail.trim());
      setEditingId(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addName.trim()) { setAddError(t('configNameRequired', t('configAddUser'))); return; }
    setAddError('');
    setAddLoading(true);
    try {
      await onAdd(addName.trim(), addEmail.trim());
      setAddName('');
      setAddEmail('');
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
        background: '#f8f9fb', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: '1.1rem' }}>&#128100;</span>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' }}>{t('configTeamMembers')}</h3>
        <span style={{
          background: '#e5e7eb', borderRadius: 20, padding: '1px 9px',
          fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginInlineStart: 4,
        }}>{users.length}</span>
      </div>

      {/* List */}
      <div style={{ padding: '4px 0' }}>
        {users.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
            {t('configEmpty', t('configTeamMembers'))}
          </div>
        ) : users.map(user => (
          <div key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
            {editingId === user.id ? (
              // ── Edit mode ──
              <div style={{ padding: '10px 20px' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: editError ? 6 : 0 }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder={t('configAddUserPlaceholder')}
                    style={{ ...inputStyle(!!editError && !editName.trim()), borderColor: '#4f46e5' }}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    autoFocus
                  />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder={t('configEmailPlaceholder')}
                    style={{ ...inputStyle(false), flex: 1.5, minWidth: 160 }}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={editSaving}>
                    {editSaving ? t('formSaving') : t('configSave')}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={editSaving}>
                    {t('formCancel')}
                  </button>
                </div>
                {editError && <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>{editError}</span>}
              </div>
            ) : (
              // ── View mode ──
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>{user.name}</div>
                  {user.email ? (
                    <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 1 }}>{user.email}</div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#d1d5db', marginTop: 1, fontStyle: 'italic' }}>
                      {t('configEmail')} —
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#4f46e5' }}
                    onClick={() => startEdit(user)}
                    title={t('configEdit')}
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#ef4444' }}
                    onClick={() => handleDelete(user.id, user.name)}
                    disabled={deletingId === user.id}
                    title={`Delete ${user.name}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete error */}
      {deleteError && (
        <div style={{ padding: '0 20px 8px' }}>
          <div className="error-msg">{deleteError}</div>
        </div>
      )}

      {/* Add form */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
        <form onSubmit={handleAdd}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 120 }}>
              <input
                type="text"
                value={addName}
                onChange={e => { setAddName(e.target.value); setAddError(''); }}
                placeholder={t('configAddUserPlaceholder')}
                style={{
                  padding: '8px 12px',
                  border: addError ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: 6, fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = addError ? '#ef4444' : '#d1d5db'; e.target.style.boxShadow = 'none'; }}
              />
              {addError && <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 3 }}>{addError}</span>}
            </div>
            <input
              type="email"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              placeholder={t('configEmailPlaceholder')}
              style={{
                flex: 1.5, minWidth: 160, padding: '8px 12px',
                border: '1px solid #d1d5db', borderRadius: 6,
                fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={addLoading}>
              {addLoading ? t('configAdding') : t('configAddBtn', t('configAddUser'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Generic section (used for Components) ────────────────────────────────────

function AddForm({ placeholder, addLabel, onAdd }) {
  const { t } = useLanguage();
  const [value, setValue]     = useState('');
  const [error, setError]     = useState('');
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
            borderRadius: 6, fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit',
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
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #e5e7eb',
        background: '#f8f9fb', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' }}>{title}</h3>
        <span style={{
          background: '#e5e7eb', borderRadius: 20, padding: '1px 9px',
          fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginInlineStart: 4,
        }}>{items.length}</span>
      </div>

      <div style={{ padding: '4px 0' }}>
        {items.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.88rem' }}>
            {t('configEmpty', title)}
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 20px', borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>{item.name}</span>
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

      {deleteError && (
        <div style={{ padding: '0 20px 8px' }}>
          <div className="error-msg">{deleteError}</div>
        </div>
      )}

      <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
        <AddForm placeholder={addPlaceholder} addLabel={addLabel} onAdd={onAdd} />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ConfigPanel({
  users, components,
  onAddUser, onEditUser, onDeleteUser,
  onAddComponent, onDeleteComponent,
}) {
  const { t } = useLanguage();

  return (
    <div>
      <h2 style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a1a2e', marginBottom: 20 }}>
        {t('configTitle')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <UsersSection
          users={users}
          onAdd={onAddUser}
          onEdit={onEditUser}
          onDelete={onDeleteUser}
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
