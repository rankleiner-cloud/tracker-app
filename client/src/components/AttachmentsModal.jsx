import React, { useState, useEffect } from 'react';
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

function formatSize(bytes) {
  if (bytes < 1024)              return `${bytes} B`;
  if (bytes < 1024 * 1024)       return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AttachmentsModal({ item, onClose, onCountChange }) {
  const { t } = useLanguage();

  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    fetchAttachments();
  }, [item.id]);

  async function fetchAttachments() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/items/${item.id}/attachments`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setAttachments(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    // reset input so same file can be re-uploaded if needed
    e.target.value = '';

    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch(`/api/items/${item.id}/attachments`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      const newList = [json.data, ...attachments];
      setAttachments(newList);
      onCountChange(item.id, newList.length);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(att) {
    if (!window.confirm(t('attachDeleteConfirm', att.original_name))) return;
    setError('');
    try {
      const res  = await fetch(`/api/attachments/${att.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      const newList = attachments.filter(a => a.id !== att.id);
      setAttachments(newList);
      onCountChange(item.id, newList.length);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          width: '100%',
          maxWidth: 560,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
            {t('attachmentsOf', item.title)}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.2rem', color: '#6b7280', lineHeight: 1, padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        {/* Attachment list */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              {t('loading')}
            </div>
          )}

          {!loading && attachments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              {t('attachEmpty')}
            </div>
          )}

          {!loading && attachments.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {attachments.map(att => (
                  <tr key={att.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 4px', fontSize: '0.85rem', color: '#1a1a2e', wordBreak: 'break-all' }}>
                      {att.original_name}
                    </td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {formatSize(att.size)}
                    </td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {formatDate(att.created_at)}
                    </td>
                    <td style={{ padding: '8px 4px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <a
                        href={`/api/attachments/${att.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.78rem', color: '#4f46e5', fontWeight: 600,
                          textDecoration: 'none', marginInlineEnd: 8,
                        }}
                      >
                        {t('attachOpen')}
                      </a>
                      <button
                        onClick={() => handleDelete(att)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#ef4444', padding: '2px 4px', verticalAlign: 'middle',
                        }}
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Upload area */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
          <label
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: uploading ? '#e5e7eb' : '#1e1b4b',
              color: '#fff',
              borderRadius: 6,
              padding: '8px 18px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer',
              userSelect: 'none',
            }}
          >
            {uploading ? t('attachUploading') : t('attachUpload')}
            <input
              type="file"
              accept=".txt,.pdf,.jpg,.jpeg,.png,.gif,.webp"
              hidden
              disabled={uploading}
              onChange={handleFileChange}
            />
          </label>
          <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#9ca3af' }}>
            {t('attachHint')}
          </div>
        </div>
      </div>
    </div>
  );
}
