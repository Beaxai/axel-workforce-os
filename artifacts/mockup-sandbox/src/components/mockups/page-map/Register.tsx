import './_group.css';
import { useEffect, useState } from 'react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 32,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.48)',
  marginBottom: 6,
  display: 'block',
};

export function Register() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  const [submitted, setSubmitted] = useState(false);
  const [selectedStates, setSelectedStates] = useState<string[]>(['CA', 'TX', 'FL']);
  const [form, setForm] = useState({
    firstName: 'John',
    lastName: 'Smith',
    agencyName: 'Smith Insurance Agency',
    npn: '12345678',
    email: 'john@smithinsurance.com',
    phone: '(555) 123-4567',
  });

  const toggleState = (st: string) => {
    setSelectedStates((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060608',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: 'var(--app-font-sans)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 1 }}>
        {/* Logo + Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
            marginBottom: 16, fontSize: 24,
          }}>⚡</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0, fontFamily: 'var(--app-font-heading)' }}>
            <span style={{ color: '#E91E8C' }}>Axel</span> Agent Registration
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.48)', marginTop: 8, margin: '8px 0 0' }}>
            Join the Axel Insurance Network
          </p>
        </div>

        {submitted ? (
          <div style={glass}>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: '0 0 12px', fontFamily: 'var(--app-font-heading)' }}>
                Application Submitted
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, margin: 0 }}>
                Your application has been submitted. An Axel team member will review and contact you within 1–2 business days.
              </p>
              <div style={{
                marginTop: 24, padding: '14px 20px', borderRadius: 10,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <p style={{ fontSize: 13, color: '#10B981', margin: 0 }}>Reference: <strong>REG-2024-{Math.floor(Math.random() * 9000) + 1000}</strong></p>
              </div>
              <button
                onClick={() => setSubmitted(false)}
                style={{
                  marginTop: 20, padding: '10px 24px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                  color: 'rgba(255,255,255,0.72)', fontSize: 14, cursor: 'pointer',
                }}
              >Start Another</button>
            </div>
          </div>
        ) : (
          <div style={glass}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: '0 0 20px', fontFamily: 'var(--app-font-heading)' }}>
              Basic Information
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    style={inputStyle}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    style={inputStyle}
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Agency Name *</label>
                <input
                  value={form.agencyName}
                  onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                  style={inputStyle}
                  placeholder="Smith Insurance Agency"
                />
              </div>

              <div>
                <label style={labelStyle}>NPN (National Producer Number)</label>
                <input
                  value={form.npn}
                  onChange={(e) => setForm({ ...form, npn: e.target.value })}
                  style={inputStyle}
                  placeholder="12345678"
                />
              </div>

              {/* State selector */}
              <div>
                <label style={labelStyle}>License States</label>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 120, overflowY: 'auto',
                  padding: 10, background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {US_STATES.map((st) => {
                    const active = selectedStates.includes(st);
                    return (
                      <button
                        key={st}
                        onClick={() => toggleState(st)}
                        type="button"
                        style={{
                          padding: '4px 10px', borderRadius: 4, fontSize: 12, border: 'none', cursor: 'pointer',
                          background: active ? '#E91E8C' : 'rgba(255,255,255,0.06)',
                          color: active ? '#fff' : 'rgba(255,255,255,0.48)',
                          transition: 'background 0.1s',
                        }}
                      >{st}</button>
                    );
                  })}
                </div>
                {selectedStates.length > 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    Selected: {selectedStates.join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={inputStyle}
                  placeholder="john@smithinsurance.com"
                />
              </div>

              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={inputStyle}
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4 }} />

              <button
                onClick={() => setSubmitted(true)}
                style={{
                  width: '100%', padding: '13px 0',
                  background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
                  border: 'none', borderRadius: 8, color: '#fff',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                Submit Application <span style={{ fontSize: 16 }}>→</span>
              </button>

              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: 0 }}>
                By submitting you agree to Axel's Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        )}

        {/* Trust indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24 }}>
          {['🔒 Encrypted', '✅ NIPR Verified', '📋 HIPAA Compliant'].map((item) => (
            <span key={item} style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
