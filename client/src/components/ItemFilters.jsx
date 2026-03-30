import React from 'react';
import { useLanguage } from '../LanguageContext.jsx';

export default function ItemFilters({ filters, onFilterChange, users, components }) {
  const { t } = useLanguage();
  const set = (key, value) => onFilterChange(prev => ({ ...prev, [key]: value }));

  const selectStyle = {
    padding: '7px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: '0.85rem',
    background: '#fff',
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 130,
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const hasActiveFilters =
    filters.type !== 'all' || filters.status !== 'all' ||
    filters.priority !== 'all' || filters.assigned_to !== 'all' ||
    filters.component !== 'all' || filters.search !== '';

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '16px 20px',
      marginBottom: 16,
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px 20px',
      alignItems: 'flex-end',
    }}>
      {/* Search */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 200 }}>
        <span style={labelStyle}>{t('filterSearch')}</span>
        <input
          type="text"
          placeholder={t('filterSearchPlaceholder')}
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          style={{ ...selectStyle, minWidth: 200 }}
        />
      </div>

      {/* Type */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={labelStyle}>{t('filterType')}</span>
        <select value={filters.type} onChange={e => set('type', e.target.value)} style={selectStyle}>
          <option value="all">{t('filterAllTypes')}</option>
          <option value="requirement">{t('typeRequirement')}</option>
          <option value="bug">{t('typeBug')}</option>
          <option value="improvement">{t('typeImprovement')}</option>
          <option value="reminder">{t('typeSystemReq')}</option>
        </select>
      </div>

      {/* Status */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={labelStyle}>{t('filterStatus')}</span>
        <select value={filters.status} onChange={e => set('status', e.target.value)} style={selectStyle}>
          <option value="all">{t('filterAllStatuses')}</option>
          <option value="open-new">{t('statusOpenNew')}</option>
          <option value="open">{t('statusOpen')}</option>
          <option value="for-test">{t('statusForTest')}</option>
          <option value="rejected">{t('statusRejected')}</option>
          <option value="closed">{t('statusClosed')}</option>
        </select>
      </div>

      {/* Priority */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={labelStyle}>{t('filterPriority')}</span>
        <select value={filters.priority} onChange={e => set('priority', e.target.value)} style={selectStyle}>
          <option value="all">{t('filterAllPriorities')}</option>
          <option value="high">{t('priorityHigh')}</option>
          <option value="medium">{t('priorityMedium')}</option>
          <option value="low">{t('priorityLow')}</option>
        </select>
      </div>

      {/* Assigned To */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={labelStyle}>{t('filterAssignedTo')}</span>
        <select value={filters.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={selectStyle}>
          <option value="all">{t('filterAllMembers')}</option>
          <option value="unassigned">{t('filterUnassigned')}</option>
          {users.map(u => (
            <option key={u.id} value={String(u.id)}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Component */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={labelStyle}>{t('filterComponent')}</span>
        <select value={filters.component} onChange={e => set('component', e.target.value)} style={selectStyle}>
          <option value="all">{t('filterAllComponents')}</option>
          {components.map(c => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onFilterChange({
              type: 'all', status: 'all', priority: 'all', assigned_to: 'all', component: 'all', search: '',
            })}
          >
            {t('filterClear')}
          </button>
        </div>
      )}
    </div>
  );
}
