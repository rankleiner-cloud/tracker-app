import React, { useState, useEffect, useCallback } from 'react';
import ItemList          from './components/ItemList.jsx';
import ItemForm          from './components/ItemForm.jsx';
import ItemFilters       from './components/ItemFilters.jsx';
import ConfigPanel       from './components/ConfigPanel.jsx';
import ReportPanel       from './components/ReportPanel.jsx';
import AttachmentsModal  from './components/AttachmentsModal.jsx';
import GanttView         from './components/GanttView.jsx';
import { useLanguage } from './LanguageContext.jsx';

// ─── helpers ────────────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Unknown error');
  return json.data;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function App() {
  const { lang, setLang, t, isRTL } = useLanguage();

  const [view, setView]           = useState('items'); // 'items' | 'component-{id}' | 'report' | 'config'
  const [items, setItems]         = useState([]);
  const [users, setUsers]         = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [attachmentsItem, setAttachmentsItem] = useState(null);

  // form state
  const [formOpen, setFormOpen]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [prefill, setPrefill]     = useState(null); // pre-populated values for duplicate

  // filters
  const [filters, setFilters] = useState({
    type:        'all',
    status:      'all',
    priority:    'all',
    assigned_to: 'all',
    component:   'all',
    search:      '',
  });

  const [sortDue, setSortDue] = useState(null); // null | 'asc' | 'desc'

  // ── load all data ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [fetchedItems, fetchedUsers, fetchedComponents] = await Promise.all([
        apiFetch('/api/items'),
        apiFetch('/api/users'),
        apiFetch('/api/components'),
      ]);
      setItems(fetchedItems);
      setUsers(fetchedUsers);
      setComponents(fetchedComponents);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── item CRUD ──────────────────────────────────────────────────────────────

  const handleSaveItem = async (payload) => {
    if (editItem) {
      const updated = await apiFetch(`/api/items/${editItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } else {
      const created = await apiFetch('/api/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setItems(prev => [created, ...prev]);
    }
    setFormOpen(false);
    setEditItem(null);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm(t('deleteItemConfirm'))) return;
    await apiFetch(`/api/items/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const openCreate    = () => { setEditItem(null); setPrefill(null); setFormOpen(true); };
  const openEdit      = (item) => { setEditItem(item); setPrefill(null); setFormOpen(true); };
  const openDuplicate = (item) => {
    setEditItem(null);
    setPrefill({
      type: item.type, title: item.title, description: item.description,
      status: item.status, priority: item.priority,
      opened_by: item.opened_by, assigned_to: item.assigned_to,
      component_id: item.component_id,
      due_date: item.due_date,
      start_date: item.start_date,
    });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditItem(null); setPrefill(null); };

  // ── user CRUD ──────────────────────────────────────────────────────────────

  const handleAddUser = async (name, email) => {
    const user = await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
    setUsers(prev => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)));
    return user;
  };

  const handleEditUser = async (id, name, email) => {
    const user = await apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, email }),
    });
    setUsers(prev =>
      prev.map(u => u.id === user.id ? user : u).sort((a, b) => a.name.localeCompare(b.name))
    );
    return user;
  };

  const handleDeleteUser = async (id) => {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // ── component CRUD ─────────────────────────────────────────────────────────

  const handleAddComponent = async (name) => {
    const comp = await apiFetch('/api/components', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setComponents(prev => [...prev, comp].sort((a, b) => a.name.localeCompare(b.name)));
    return comp;
  };

  const handleDeleteComponent = async (id) => {
    await apiFetch(`/api/components/${id}`, { method: 'DELETE' });
    setComponents(prev => prev.filter(c => c.id !== id));
  };

  // ── attachment count change ─────────────────────────────────────────────────

  const handleAttachmentCountChange = (itemId, newCount) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, attachment_count: newCount } : i));
  };

  // ── reset view when active component is deleted ────────────────────────────

  useEffect(() => {
    if (view.startsWith('component-')) {
      const activeComponentId = parseInt(view.replace('component-', ''), 10);
      const exists = components.some(c => c.id === activeComponentId);
      if (!exists) setView('items');
    }
  }, [components]);

  // ── filtered items ─────────────────────────────────────────────────────────

  const activeComponentId = view.startsWith('component-')
    ? parseInt(view.replace('component-', ''), 10)
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const isFutureItem = (item) => {
    const d = new Date(item.start_date || item.created_at);
    d.setHours(0, 0, 0, 0);
    return d > today;
  };

  let filteredItems = items.filter(item => {
    if (view === 'closed') {
      if (item.status !== 'closed') return false;
    } else if (view === 'future') {
      if (item.status === 'closed') return false;
      if (!isFutureItem(item)) return false;
    } else {
      if (item.status === 'closed') return false;
      // due-soon and component views: hide future items
      if ((view === 'due-soon' || view.startsWith('component-')) && isFutureItem(item)) return false;
      if (view === 'due-soon') {
        if (!item.due_date) return false;
        const due = new Date(item.due_date);
        due.setHours(0, 0, 0, 0);
        if (due > sevenDaysLater) return false;
      }
    }
    if (activeComponentId !== null && item.component_id !== activeComponentId) return false;
    if (filters.component !== 'all' && String(item.component_id) !== filters.component) return false;
    if (filters.type !== 'all' && item.type !== filters.type) return false;
    if (view !== 'closed' && filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.priority !== 'all' && item.priority !== filters.priority) return false;
    if (filters.assigned_to !== 'all') {
      if (filters.assigned_to === 'unassigned') {
        if (item.assigned_to !== null) return false;
      } else {
        if (String(item.assigned_to) !== filters.assigned_to) return false;
      }
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!item.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (sortDue === 'asc') {
    filteredItems = [...filteredItems].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  } else if (sortDue === 'desc') {
    filteredItems = [...filteredItems].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(b.due_date) - new Date(a.due_date);
    });
  }

  // ── nav items ──────────────────────────────────────────────────────────────

  const navItems = [
    { key: 'items',    label: t('navItems') },
    ...components.map(c => ({ key: `component-${c.id}`, label: c.name, isComponent: true })),
    { key: 'future',   label: t('navFutureItems') },
    { key: 'due-soon', label: t('navDueSoon') },
    { key: 'gantt',    label: t('navGantt') },
    { key: 'closed',   label: t('navClosed') },
    { key: 'report',   label: t('navReport') },
    { key: 'config',   label: t('navConfig') },
  ];

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Nav */}
      <nav style={{
        background: '#1e1b4b',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        height: 56,
      }}>
        <span style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '1.1rem',
          letterSpacing: '-0.01em',
          marginInlineEnd: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: '1.3rem' }}>&#128203;</span> {t('appTitle')}
        </span>

        {navItems.map(({ key, label, isComponent }) => {
          const isActive = view === key;
          let activeBg = 'rgba(255,255,255,0.15)';
          if (isComponent && isActive) activeBg = 'rgba(99,102,241,0.15)';
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                background: isActive ? activeBg : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                border: 'none',
                padding: '6px 18px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.9rem',
                transition: 'background 0.15s, color 0.15s',
                height: 36,
              }}
            >
              {label}
            </button>
          );
        })}

        {/* Language toggle — pushed to the far end */}
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 2 }}>
          {['en', 'he'].map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                background: lang === l ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: lang === l ? '#fff' : 'rgba(255,255,255,0.5)',
                border: lang === l ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
                padding: '4px 10px',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              {l === 'en' ? 'EN' : 'עב'}
            </button>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
            {t('loading')}
          </div>
        )}

        {!loading && error && (
          <div className="error-msg" style={{ maxWidth: 600, margin: '40px auto' }}>
            {t('serverError')} {error}
          </div>
        )}

        {!loading && !error && (view === 'items' || view.startsWith('component-') || view === 'due-soon' || view === 'closed' || view === 'future') && (
          <>
            <ItemFilters
              filters={filters}
              onFilterChange={setFilters}
              users={users}
              components={components}
            />
            <ItemList
              items={filteredItems}
              onEdit={openEdit}
              onDelete={handleDeleteItem}
              onDuplicate={openDuplicate}
              onNewItem={openCreate}
              totalCount={
                view === 'closed'
                  ? items.filter(i => i.status === 'closed').length
                  : view === 'future'
                    ? items.filter(i => i.status !== 'closed' && isFutureItem(i)).length
                    : activeComponentId !== null
                      ? items.filter(i => i.component_id === activeComponentId && i.status !== 'closed').length
                      : items.filter(i => i.status !== 'closed').length
              }
              onOpenAttachments={(item) => setAttachmentsItem(item)}
              sortDue={sortDue}
              onSortDue={(val) => setSortDue(val)}
              isClosedView={view === 'closed'}
            />
          </>
        )}

        {!loading && !error && view === 'gantt' && (
          <GanttView items={items} t={t} isRTL={isRTL} />
        )}

        {!loading && !error && view === 'report' && (
          <ReportPanel
            items={items}
            users={users}
            components={components}
          />
        )}

        {!loading && !error && view === 'config' && (
          <ConfigPanel
            users={users}
            components={components}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onAddComponent={handleAddComponent}
            onDeleteComponent={handleDeleteComponent}
          />
        )}
      </main>

      {/* Item form modal */}
      {formOpen && (
        <ItemForm
          item={editItem}
          prefill={prefill}
          users={users}
          components={components}
          onSave={handleSaveItem}
          onClose={closeForm}
        />
      )}

      {/* Attachments modal */}
      {attachmentsItem && (
        <AttachmentsModal
          item={attachmentsItem}
          onClose={() => setAttachmentsItem(null)}
          onCountChange={handleAttachmentCountChange}
        />
      )}
    </div>
  );
}
