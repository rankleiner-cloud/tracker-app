import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext.jsx';

const INITIAL = {
  type:        'requirement',
  title:       '',
  description: '',
  status:      'open-new',
  priority:    'medium',
  opened_by:   '',
  assigned_to: '',
  component_id: '',
  due_date:    '',
};

export default function ItemForm({ item, prefill, users, components, onSave, onClose }) {
  const { t } = useLanguage();
  const [form, setForm]     = useState(INITIAL);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        type:         item.type         || 'requirement',
        title:        item.title        || '',
        description:  item.description  || '',
        status:       item.status       || 'open-new',
        priority:     item.priority     || 'medium',
        opened_by:    item.opened_by    != null ? String(item.opened_by)    : '',
        assigned_to:  item.assigned_to  != null ? String(item.assigned_to)  : '',
        component_id: item.component_id != null ? String(item.component_id) : '',
        due_date: item.due_date ? item.due_date.slice(0, 10) : '',
      });
    } else if (prefill) {
      setForm({
        type:         prefill.type         || 'requirement',
        title:        prefill.title        || '',
        description:  prefill.description  || '',
        status:       prefill.status       || 'open-new',
        priority:     prefill.priority     || 'medium',
        opened_by:    prefill.opened_by    != null ? String(prefill.opened_by)    : '',
        assigned_to:  prefill.assigned_to  != null ? String(prefill.assigned_to)  : '',
        component_id: prefill.component_id != null ? String(prefill.component_id) : '',
        due_date: prefill.due_date ? prefill.due_date.slice(0, 10) : '',
      });
    } else {
      setForm(INITIAL);
    }
    setError('');
  }, [item, prefill]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) { setError(t('errTitleRequired'));    return; }
    if (!form.opened_by)    { setError(t('errOpenedByRequired')); return; }

    setSaving(true);
    try {
      await onSave({
        type:         form.type,
        title:        form.title.trim(),
        description:  form.description,
        status:       form.status,
        priority:     form.priority,
        opened_by:    Number(form.opened_by),
        assigned_to:  form.assigned_to  ? Number(form.assigned_to)  : null,
        component_id: form.component_id ? Number(form.component_id) : null,
        due_date: form.due_date || null,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-box">
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 22,
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e' }}>
            {item ? t('editItemTitle') : prefill ? t('duplicateItemTitle') : t('newItemTitle')}
          </h2>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            style={{ fontSize: '1.2rem', lineHeight: 1, padding: '4px 8px' }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Type */}
          <div className="form-group">
            <label>{t('formType')}</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="requirement">{t('typeRequirement')}</option>
              <option value="bug">{t('typeBug')}</option>
              <option value="improvement">{t('typeImprovement')}</option>
              <option value="system-requirement">{t('typeSystemReq')}</option>
            </select>
          </div>

          {/* Title */}
          <div className="form-group">
            <label>{t('formTitle')} <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder={t('formTitlePlaceholder')}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>{t('formDescription')}</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder={t('formDescPlaceholder')}
              rows={3}
            />
          </div>

          {/* Row: Status + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>{t('formStatus')}</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="open-new">{t('statusOpenNew')}</option>
                <option value="open">{t('statusOpen')}</option>
                <option value="for-test">{t('statusForTest')}</option>
                <option value="rejected">{t('statusRejected')}</option>
                <option value="closed">{t('statusClosed')}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('formPriority')}</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high">{t('priorityHigh')}</option>
                <option value="medium">{t('priorityMedium')}</option>
                <option value="low">{t('priorityLow')}</option>
              </select>
            </div>
          </div>

          {/* Row: Opened By + Assigned To */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>{t('formOpenedBy')} <span style={{ color: '#ef4444' }}>*</span></label>
              <select value={form.opened_by} onChange={e => set('opened_by', e.target.value)}>
                <option value="">{t('formSelectUser')}</option>
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('formAssignedTo')}</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">{t('formUnassigned')}</option>
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Component */}
          <div className="form-group">
            <label>{t('formSubComponent')}</label>
            <select value={form.component_id} onChange={e => set('component_id', e.target.value)}>
              <option value="">{t('formNone')}</option>
              {components.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div className="form-group">
            <label>{t('formDueDate')}</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
            />
          </div>

          {item && (
            <div className="form-group">
              <label style={{ color: '#9ca3af' }}>{t('formOpenedOn')}</label>
              <input
                type="text"
                value={item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                readOnly
                style={{ background: '#f9fafb', color: '#9ca3af', cursor: 'default' }}
              />
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              {t('formCancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('formSaving') : item ? t('formSaveChanges') : t('formCreateItem')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
