import './_group.css';
import { useEffect } from 'react';
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
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, ...style,
    }}>{children}</div>
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

function Badge({ label, color }: { label: string; color: 'green' | 'blue' | 'purple' | 'yellow' | 'gray' | 'cyan' }) {
  const p = {
    green:  { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
    blue:   { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    purple: { bg: 'rgba(124,58,237,0.15)', color: '#a78bfa' },
    yellow: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    gray:   { bg: 'rgba(100,100,100,0.15)', color: '#9ca3af' },
    cyan:   { bg: 'rgba(6,182,212,0.15)',   color: '#22d3ee' },
  }[color];
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: p.bg, color: p.color }}>{label}</span>;
}

const CARRIER = {
  name: 'Meridian Workers Comp',
  amBest: 'A+ (Superior)',
  naic: '14782',
  status: 'Active',
  states: 'All 50 States + DC',
  specialty: 'Healthcare, Staffing, Construction, Manufacturing',
  contactName: 'Sandra Liu',
  email: 'sliu@meridianwc.com',
  phone: '(800) 441-7782',
  notes: 'Preferred carrier for healthcare and staffing verticals. Competitive rates for high-headcount accounts. Direct underwriter access for accounts >$500K payroll.',
  appetiteNotes: 'Appetite includes healthcare providers, temporary staffing firms, light manufacturing, and commercial construction. Avoids cannabis, trucking, and high-risk verticals.',
};

const CLASS_CODES = [
  { code: '8810', desc: 'Clerical Office Employees', rate: '$0.28', states: 'All States' },
  { code: '8832', desc: 'Physicians & Clerical', rate: '$0.42', states: 'All States' },
  { code: '8833', desc: 'Hospital – All Employees', rate: '$1.14', states: 'All States' },
  { code: '5645', desc: 'Carpentry – Residential', rate: '$8.93', states: 'TX, FL, CA' },
  { code: '7380', desc: 'Drivers, Chauffeurs', rate: '$4.62', states: 'All States' },
  { code: '8742', desc: 'Salespersons – Outside', rate: '$0.45', states: 'All States' },
  { code: '7720', desc: 'Ambulance Services', rate: '$6.81', states: 'FL, NY, CA, TX' },
  { code: '8017', desc: 'Retail Store – NOC', rate: '$2.14', states: 'All States' },
];

const POLICIES = [
  { id: 'p1', number: 'WC-NY-20240198', account: 'Metro Health Network', state: 'NY', type: 'WC', status: 'Active', effective: 'Jan 1, 2024', premium: '$48,200' },
  { id: 'p2', number: 'WC-CA-20240211', account: 'Pacific Rim Staffing', state: 'CA', type: 'WC', status: 'Active', effective: 'Feb 1, 2024', premium: '$72,500' },
  { id: 'p3', number: 'WC-TX-20240245', account: 'AllPro Construction Inc.', state: 'TX', type: 'WC', status: 'Active', effective: 'Mar 1, 2024', premium: '$39,800' },
  { id: 'p4', number: 'WC-MI-20240312', account: 'NovaPak Manufacturing', state: 'MI', type: 'WC', status: 'Active', effective: 'Apr 1, 2024', premium: '$61,100' },
  { id: 'p5', number: 'WC-GA-20240387', account: 'Summit Temp Agency', state: 'GA', type: 'WC', status: 'In Force', effective: 'May 1, 2024', premium: '$34,700' },
];

const totalPremium = POLICIES.reduce((sum, p) => sum + parseInt(p.premium.replace(/[$,]/g, '')), 0);

export function CarrierDetail() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  return (
    <AppShell activeNav="Network">
      <div style={{ width: '100%' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, color: textMuted }}>
          <span style={{ cursor: 'pointer', color: accent }}>← Network</span>
          <span>›</span>
          <span>Carriers</span>
          <span>›</span>
          <span style={{ color: textPrimary, fontWeight: 600 }}>{CARRIER.name}</span>
        </div>

        {/* Carrier Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 12,
              background: 'linear-gradient(135deg,#0EA5E9,#7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
            }}>MWC</div>
            <div>
              <h1 style={{ fontFamily: 'var(--app-font-heading)', fontSize: 24, fontWeight: 700, color: textPrimary, margin: '0 0 6px' }}>
                {CARRIER.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Badge label={CARRIER.status} color="green" />
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20,
                  fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  ★ AM Best {CARRIER.amBest}
                </span>
                <span style={{ fontSize: 12, color: textMuted }}>NAIC #{CARRIER.naic}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textMuted, fontSize: 13, cursor: 'pointer' }}>✏ Edit</button>
          </div>
        </div>

        {/* Stat Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Bound Policies</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>{POLICIES.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Total Premium</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#a78bfa', fontFamily: 'var(--app-font-heading)' }}>${totalPremium.toLocaleString()}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Class Codes</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>{CLASS_CODES.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>States Active</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399', fontFamily: 'var(--app-font-heading)' }}>51</div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <GlassCard>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Carrier Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Legal Name" value={CARRIER.name} />
              <Field label="AM Best Rating" value={CARRIER.amBest} />
              <Field label="NAIC Code" value={CARRIER.naic} />
              <Field label="States Active" value={CARRIER.states} />
              <Field label="Specialties" value={CARRIER.specialty} />
            </div>
          </GlassCard>

          <GlassCard>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Contact Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <Field label="Underwriter Contact" value={CARRIER.contactName} />
              <Field label="Email" value={CARRIER.email} />
              <Field label="Phone" value={CARRIER.phone} />
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${borderColor}` }}>
              <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Appetite Notes</div>
              <p style={{ fontSize: 12, color: textSecondary, margin: 0, lineHeight: 1.6 }}>{CARRIER.appetiteNotes}</p>
            </div>
          </GlassCard>
        </div>

        {/* Class Codes Appetite */}
        <GlassCard style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>
            Appetite — Class Codes ({CLASS_CODES.length})
          </h3>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 3fr 1fr 2fr', gap: 12,
            padding: '10px 0', borderBottom: `1px solid ${borderColor}`,
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: textMuted,
          }}>
            <div>Code</div><div>Description</div><div style={{ textAlign: 'right' }}>Base Rate</div><div>States</div>
          </div>
          {CLASS_CODES.map((c, i) => (
            <div key={c.code} style={{
              display: 'grid', gridTemplateColumns: '1fr 3fr 1fr 2fr', gap: 12, alignItems: 'center',
              padding: '11px 0', borderBottom: i < CLASS_CODES.length - 1 ? `1px solid ${borderColor}` : 'none',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', fontFamily: 'monospace' }}>{c.code}</div>
              <div style={{ fontSize: 13, color: textSecondary }}>{c.desc}</div>
              <div style={{ fontSize: 13, color: '#34d399', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.rate}</div>
              <div style={{ fontSize: 12, color: textMuted }}>{c.states}</div>
            </div>
          ))}
        </GlassCard>

        {/* Bound Policies */}
        <GlassCard>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>
            Bound Policies ({POLICIES.length})
          </h3>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 2fr 0.6fr 1fr 1fr 1fr', gap: 12,
            padding: '10px 0', borderBottom: `1px solid ${borderColor}`,
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: textMuted,
          }}>
            <div>Policy #</div><div>Account</div><div>State</div><div>Effective</div><div>Status</div><div style={{ textAlign: 'right' }}>Premium</div>
          </div>
          {POLICIES.map((p, i) => (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 2fr 0.6fr 1fr 1fr 1fr', gap: 12, alignItems: 'center',
              padding: '12px 0', borderBottom: i < POLICIES.length - 1 ? `1px solid ${borderColor}` : 'none',
              cursor: 'pointer', transition: 'background 0.1s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(233,30,140,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: textPrimary, fontFamily: 'monospace' }}>{p.number}</div>
              <div style={{ fontSize: 13, color: textSecondary }}>{p.account}</div>
              <div style={{ fontSize: 13, color: textMuted }}>{p.state}</div>
              <div style={{ fontSize: 12, color: textMuted }}>{p.effective}</div>
              <div><Badge label={p.status} color="green" /></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.premium}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 0', borderTop: `1px solid ${borderColor}`, marginTop: 4 }}>
            <div style={{ fontSize: 13, color: textMuted, marginRight: 8 }}>Total:</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>${totalPremium.toLocaleString()}</div>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
