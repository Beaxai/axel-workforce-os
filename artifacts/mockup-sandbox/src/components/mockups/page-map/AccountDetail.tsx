import './_group.css';
import { useState, useEffect } from 'react';
import { AppShell } from './_shared/AppShell';

const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';
const accent = '#E91E8C';

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? textPrimary : textMuted }}>{value || '—'}</div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: 'green' | 'blue' | 'purple' | 'gray' }) {
  const palettes = {
    green:  { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
    blue:   { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    purple: { bg: 'rgba(124,58,237,0.15)', color: '#a78bfa' },
    gray:   { bg: 'rgba(100,100,100,0.15)', color: '#aaa' },
  };
  const p = palettes[color];
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: p.bg, color: p.color }}>{label}</span>
  );
}

const DEALS = [
  { id: 'd1', ref: 'AX-24-0091', stage: 'Indication Sent', type: 'WC', premium: '$48,200' },
  { id: 'd2', ref: 'AX-24-0107', stage: 'Bound', type: 'PEO', premium: '$62,500' },
];

const POLICIES = [
  { id: 'p1', number: 'WC-FL-20240198', type: 'Workers Comp', status: 'Active', effective: 'Jan 1, 2024', premium: '$48,200' },
  { id: 'p2', number: 'PEO-FL-20240055', type: 'PEO Bundle', status: 'Active', effective: 'Mar 1, 2024', premium: '$62,500' },
];

const ACTIVITY = [
  { id: 'a1', icon: '📝', text: 'Note added by Marcus Webb — Client confirmed renewal interest for 2025 policy.', time: '2 hours ago' },
  { id: 'a2', icon: '🔄', text: 'Stage changed from "New Client" to "Active Client".', time: 'Yesterday' },
  { id: 'a3', icon: '📋', text: 'Policy WC-FL-20240198 bound with Nexus Specialty Insurance.', time: 'Jan 3, 2024' },
  { id: 'a4', icon: '🚀', text: 'Account created and converted from lead.', time: 'Dec 15, 2023' },
];

const CONTACTS = [
  { name: 'Jennifer Harlow', title: 'CFO', email: 'jharlow@metrohealth.com', phone: '(305) 882-4401' },
  { name: 'Derek Moss', title: 'HR Director', email: 'dmoss@metrohealth.com', phone: '(305) 882-4402' },
];

export function AccountDetail() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'contacts' | 'documents'>('overview');

  const tabs = ['overview', 'policies', 'contacts', 'documents'] as const;

  return (
    <AppShell activeNav="Accounts">
      <div style={{ width: '100%' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, color: textMuted }}>
          <span style={{ cursor: 'pointer', color: accent }}>Accounts</span>
          <span>›</span>
          <span style={{ cursor: 'pointer' }}>Clients</span>
          <span>›</span>
          <span style={{ color: textPrimary, fontWeight: 600 }}>Metro Health Network</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'var(--app-font-heading)',
            }}>M</div>
            <div>
              <h1 style={{ fontFamily: 'var(--app-font-heading)', fontSize: 26, fontWeight: 700, color: textPrimary, margin: '0 0 4px' }}>
                Metro Health Network
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge label="Active Client" color="green" />
                <span style={{ fontSize: 12, color: textMuted }}>Healthcare · New York, NY</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textMuted, fontSize: 13, cursor: 'pointer' }}>Edit</button>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,#7C3AED,${accent})`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Start Quote</button>
          </div>
        </div>

        {/* Stat Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatTile label="Annual Payroll" value="$12.4M" sub="Reported 2024" />
          <StatTile label="Employees" value="187" sub="Full-time equiv." />
          <StatTile label="Active Policies" value="2" sub="WC + PEO Bundle" />
          <StatTile label="Total Premium" value="$110,700" sub="Current year" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${borderColor}`, marginBottom: 24 }}>
          {tabs.map(t => {
            const isActive = activeTab === t;
            return (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: '9px 20px', fontSize: 13, fontWeight: isActive ? 600 : 500,
                color: isActive ? accent : textMuted, background: 'transparent', border: 'none',
                borderBottom: `2px solid ${isActive ? accent : 'transparent'}`,
                marginBottom: -1, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
              }}>{t}</button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <GlassCard>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Business Info</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                  <Field label="Legal Name" value="Metro Health Network LLC" />
                  <Field label="DBA" value="—" />
                  <Field label="FEIN" value="82-4401992" />
                  <Field label="Entity Type" value="LLC" />
                  <Field label="Vertical" value="Healthcare" />
                  <Field label="Product Type" value="WC + PEO" />
                  <Field label="State" value="NY" />
                  <Field label="Exp. Mod (e-mod)" value="0.872" />
                  <Field label="Annual Payroll" value="$12,400,000" />
                  <Field label="Headcount" value="187" />
                </div>
              </GlassCard>

              <GlassCard>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Associated Deals</h3>
                {DEALS.map(d => (
                  <div key={d.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${borderColor}`, marginBottom: 8, cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(233,30,140,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = borderColor)}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: textPrimary }}>{d.ref}</div>
                      <div style={{ fontSize: 11, color: textMuted }}>{d.stage}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, color: textSecondary }}>{d.premium}</span>
                      <Badge label={d.type} color={d.type === 'PEO' ? 'purple' : 'blue'} />
                    </div>
                  </div>
                ))}
              </GlassCard>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <GlassCard>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Primary Contact</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Field label="Name" value="Jennifer Harlow" />
                  <Field label="Title" value="CFO" />
                  <Field label="Email" value="jharlow@metrohealth.com" />
                  <Field label="Phone" value="(305) 882-4401" />
                </div>
              </GlassCard>

              <GlassCard>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Notes</h3>
                <p style={{ fontSize: 13, color: textSecondary, margin: 0, lineHeight: 1.6 }}>
                  Client expressed strong interest in renewing the PEO bundle for 2025. Possible expansion to 210+ employees by Q2. Follow up in November regarding e-mod update.
                </p>
              </GlassCard>

              <GlassCard>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 14px' }}>Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ACTIVITY.map(a => (
                    <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, color: textSecondary, lineHeight: 1.5 }}>{a.text}</div>
                        <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{a.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <input placeholder="Add a note..." style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${borderColor}`,
                    background: 'rgba(255,255,255,0.04)', color: textPrimary, fontSize: 13, outline: 'none',
                  }} />
                  <button style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,#7C3AED,${accent})`, color: '#fff', fontSize: 13, cursor: 'pointer' }}>Post</button>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <GlassCard>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Active Policies</h3>
            {POLICIES.map(p => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0', borderBottom: `1px solid ${borderColor}`,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: textPrimary }}>{p.number}</div>
                  <div style={{ fontSize: 12, color: textMuted }}>{p.type} · Effective {p.effective}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: textPrimary }}>{p.premium}</span>
                  <Badge label={p.status} color="green" />
                </div>
              </div>
            ))}
          </GlassCard>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {CONTACTS.map(c => (
              <GlassCard key={c.email}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: '#fff',
                  }}>{c.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: textMuted }}>{c.title}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Field label="Email" value={c.email} />
                  <Field label="Phone" value={c.phone} />
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <GlassCard>
            <p style={{ fontSize: 14, color: textMuted, textAlign: 'center', padding: '24px 0' }}>
              No documents uploaded yet.
            </p>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
