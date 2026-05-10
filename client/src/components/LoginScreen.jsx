import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext.jsx';

export default function LoginScreen({ onLogin }) {
  const { t, isRTL } = useLanguage();
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) {
      setError(t('loginFieldsRequired'));
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(t('loginInvalid'));
      } else {
        onLogin(json.data);
      }
    } catch {
      setError(t('loginServerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: '#f0f2f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        padding: '40px 48px',
        width: '100%',
        maxWidth: 400,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>&#128203;</div>
          <h1 style={{
            margin: 0,
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#1e1b4b',
          }}>
            {t('appTitle')}
          </h1>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
            {t('loginSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>{t('loginName')}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('loginNamePlaceholder')}
            style={inputStyle}
            autoFocus
            autoComplete="name"
          />

          <label style={{ ...labelStyle, marginTop: 16 }}>{t('loginEmail')}</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('loginEmailPlaceholder')}
            style={inputStyle}
            autoComplete="email"
          />

          {error && (
            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              color: '#b91c1c',
              fontSize: '0.88rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 24,
              width: '100%',
              background: loading ? '#a5b4fc' : '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              padding: '11px 0',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? t('loginLoading') : t('loginBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.95rem',
  color: '#111827',
  boxSizing: 'border-box',
  outline: 'none',
};
