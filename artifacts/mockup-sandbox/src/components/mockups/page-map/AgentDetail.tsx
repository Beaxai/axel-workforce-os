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

function StatTile({ label, value, accent: a }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: a ? '#a78bfa' : textPrimary, fontFamily: 'var(--app-font-heading)' }}>{value}</div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: 'green' | 'blue' | 'purple' | 'yellow' | 'gray' }) {
  const p = {
    green:  { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
    blue:   { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    purple: { bg: 'rgba(124,58,237,0.15)', color: '#a78bfa' },
    yellow: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    gray:   { bg: 'rgba(100,100,100,0.15)', color: '#9ca3af' },
  }[color];
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: p.bg, color: p.color }}>{label}</span>;
}

const AGENT = {
  name: 'Marcus Webb',
  agency: 'Apex Insurance Group',
  npn: '17428934',
  status: 'Active',
  states: 'TX, OK, NM, LA, AR',
  contactName: 'Marcus Webb',
  email: 'marcus.webb@apexins.com',
  phone: '(512) 774-3901',
  notes: 'Top-producing agent in the Southwest region. Specializes in construction and transportation verticals. Strong referral network.',
};

const DEALS = [
  { id: 'd1', ref: 'AX-24-0041', company: 'Iron Horse Transport', state: 'TX', stage: 'Indication Sent', type: 'WC', premium: '$62,400' },
  { id: 'd2', ref: 'AX-24-0056', company: 'Southwest Framing LLC', state: 'OK', stage: 'Bound', type: 'WC', premium: '$38,100' },
  { id: 'd3', ref: 'AX-24-0077', company: 'Desert Bloom Cannabis', state: 'NM', stage: 'Quote Requested', type: 'WC', premium: '$24,700' },
  { id: 'd4', ref: 'AX-24-0088', company: 'Lone Star Staffing', state: 'TX', stage: 'Proposal Sent', type: 'PEO', premium: '$91,200' },
  { id: 'd5', ref: 'AX-24-0103', company: 'Gulf Coast Warehousing', state: 'LA', stage: 'New', type: 'WC', premium: '$47,800' },
];

const STAGE_COLORS: Record<string, 'blue' | 'purple' | 'green' | 'yellow' | 'gray'> = {
  'New': 'gray', 'Quote Requested': 'blue', 'Indication Sent': 'purple',
  'Proposal Sent': 'yellow', 'Bound': 'green',
};

const REGISTRATION = {
  submitted: 'Oct 12, 2023',
  agreementSigned: 'Oct 15, 2023',
  onboardingCall: 'Oct 19, 2023',
  credentialsIssued: 'Oct 22, 2023',
};

export function AgentDetail() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  return (
    <AppShell activeNav="Network">
      <div style={{ width: '100%' }}>
        {/* Back breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, color: textMuted }}>
          <span style={{ cursor: 'pointer', color: accent }}>← Network</span>
          <span>›</span>
          <span>Agents</span>
          <span>›</span>
          <span style={{ color: textPrimary, fontWeight: 600 }}>{AGENT.name}</span>
        </div>

        {/* Agent Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: '#fff',
            }}>MW</div>
            <div>
              <h1 style={{ fontFamily: 'var(--app-font-heading)', fontSize: 26, fontWeight: 700, color: textPrimary, margin: '0 0 6px' }}>
                {AGENT.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge label={AGENT.status} color="green" />
                <span style={{ fontSize: 13, color: textMuted }}>{AGENT.agency}</span>
                <span style={{ fontSize: 13, color: textMuted }}>· NPN {AGENT.npn}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textMuted, fontSize: 13, cursor: 'pointer' }}>✏ Edit</button>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid rgba(239,68,68,0.3)`, background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 13, cursor: 'pointer' }}>Suspend</button>
          </div>
        </div>

        {/* Stat Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          <StatTile label="Total Deals" value="14" />
          <StatTile label="WC Premium" value="$284,000" accent />
          <StatTile label="Bound Policies" value="6" />
          <StatTile label="Avg Deal Size" value="$20,300" />
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <GlassCard>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Agent Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Full Name" value={AGENT.name} />
              <Field label="Agency" value={AGENT.agency} />
              <Field label="NPN" value={AGENT.npn} />
              <Field label="License States" value={AGENT.states} />
              <Field label="Notes" value={AGENT.notes} />
            </div>
          </GlassCard>

          <GlassCard>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Contact Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Contact Name" value={AGENT.contactName} />
              <Field label="Email" value={AGENT.email} />
              <Field label="Phone" value={AGENT.phone} />
            </div>
          </GlassCard>
        </div>

        {/* Registration + Commission */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <GlassCard>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Registration Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Field label="Application Submitted" value={REGISTRATION.submitted} />
                <span style={{ fontSize: 14 }}>✅</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Field label="Agreement Signed" value={REGISTRATION.agreementSigned} />
                <span style={{ fontSize: 14 }}>✅</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Field label="Onboarding Call" value={REGISTRATION.onboardingCall} />
                <span style={{ fontSize: 14 }}>✅</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Field label="Credentials Issued" value={REGISTRATION.credentialsIssued} />
                <span style={{ fontSize: 14 }}>✅</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>Commission Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
              <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Earned YTD</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa' }}>$22,400</div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Pending</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#34d399' }}>$7,620</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${borderColor}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Avg Rate</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary }}>8.2%</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${borderColor}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Last Paid</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>Oct 31, 2024</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Recent Deals */}
        <GlassCard>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 16px' }}>
            Associated Deals ({DEALS.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 0', borderBottom: `1px solid ${borderColor}`, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: textMuted }}>
            <div>Ref</div><div>Company</div><div>State</div><div>Type</div><div>Stage</div><div style={{ textAlign: 'right' }}>Est. Premium</div>
          </div>
          {DEALS.map((d, i) => (
            <div key={d.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr', gap: 12, alignItems: 'center',
              padding: '12px 0', borderBottom: i < DEALS.length - 1 ? `1px solid ${borderColor}` : 'none',
              cursor: 'pointer', transition: 'background 0.1s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(233,30,140,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: accent }}>{d.ref}</div>
              <div style={{ fontSize: 13, color: textPrimary }}>{d.company}</div>
              <div style={{ fontSize: 13, color: textMuted }}>{d.state}</div>
              <div><Badge label={d.type} color={d.type === 'PEO' ? 'purple' : 'blue'} /></div>
              <div><Badge label={d.stage} color={STAGE_COLORS[d.stage] || 'gray'} /></div>
              <div style={{ fontSize: 13, color: textPrimary, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.premium}</div>
            </div>
          ))}
        </GlassCard>
      </div>
    </AppShell>
  );
}
