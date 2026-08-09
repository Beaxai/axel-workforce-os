import './_group.css';
import { useState, useEffect } from 'react';

const DEV_USERS = [
  { label: 'Admin',       email: 'sarah@axelwos.com' },
  { label: 'Underwriter', email: 'james@axelwos.com' },
  { label: 'CSA',         email: 'maria@axelwos.com' },
  { label: 'Agent',       email: 'robert@broker.com' },
  { label: 'Employer',    email: 'lisa@acmecorp.com' },
  { label: 'Carrier',     email: 'david@carrier.com' },
  { label: 'PEO',         email: 'karen@peopartner.com' },
  { label: 'Vendor',      email: 'mike@vendor.com' },
];

const DEV_PASSWORD = 'Password123!';

export function Login() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const bg          = '#060608';
  const textPrimary = '#fff';
  const textMuted   = 'rgba(255,255,255,0.5)';
  const borderColor = 'rgba(255,255,255,0.08)';
  const cardBg      = 'rgba(255,255,255,0.04)';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    fontSize: '14px', color: 'var(--input-text)', background: 'var(--input-bg)',
    border: '1px solid var(--input-border)', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const active = email.length > 0 && password.length > 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, fontFamily: 'var(--app-font-sans)' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '0.18em', color: textPrimary, fontFamily: 'var(--app-font-heading)', marginBottom: '16px' }}>
            A X E L
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: textPrimary, margin: 0 }}>
            Axel Workforce OS
          </h1>
          <p style={{ fontSize: '14px', marginTop: '8px', color: textMuted, margin: '8px 0 0' }}>
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div style={{ background: cardBg, backdropFilter: 'blur(12px)', border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '28px' }}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--label-text)', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--label-text)', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={!active}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
                background: active ? 'var(--gradient-cta)' : 'rgba(255,255,255,0.08)',
                color: active ? '#fff' : 'rgba(255,255,255,0.3)',
                border: 'none', cursor: active ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s, filter 0.15s',
              }}
            >
              Sign In
            </button>
          </form>

          {/* Dev quick-fill */}
          <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: cardBg, border: `1px dashed ${borderColor}` }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: textMuted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Dev Quick-Fill
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {DEV_USERS.map((u) => (
                <button
                  key={u.label}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword(DEV_PASSWORD); }}
                  style={{
                    padding: '8px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                    background: cardBg, border: `1px solid ${borderColor}`, color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
