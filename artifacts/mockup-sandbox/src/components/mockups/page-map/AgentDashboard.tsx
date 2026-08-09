import './_group.css';
import { useEffect } from 'react';
import { AppShell } from './_shared/AppShell';

const DEALS = [
  { id: 1, ref: 'AX-2024-0081', vertical: 'Healthcare', employees: 148, stage: 'BOUND' },
  { id: 2, ref: 'AX-2024-0094', vertical: 'Construction', employees: 72, stage: 'UW_REVIEW' },
  { id: 3, ref: 'AX-2024-0102', vertical: 'Cannabis', employees: 35, stage: 'SUBMISSION_REVIEW' },
  { id: 4, ref: 'AX-2024-0117', vertical: 'Staffing', employees: 210, stage: 'QUOTE_SENT' },
  { id: 5, ref: 'AX-2024-0129', vertical: 'Hospitality', employees: 55, stage: 'LOST' },
];

const COMMISSIONS = [
  { id: 1, amount: 12400, type: 'New Business', status: 'PAID' },
  { id: 2, amount: 8750, type: 'Renewal', status: 'PAID' },
  { id: 3, amount: 3200, type: 'New Business', status: 'PENDING' },
  { id: 4, amount: 6100, type: 'Override', status: 'PENDING' },
  { id: 5, amount: 4850, type: 'Renewal', status: 'PROCESSING' },
];

const STAGE_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  BOUND: { color: '#10B981', bg: 'rgba(16,185,129,0.15)', label: 'Bound' },
  UW_REVIEW: { color: '#7C3AED', bg: 'rgba(124,58,237,0.15)', label: 'UW Review' },
  SUBMISSION_REVIEW: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: 'In Review' },
  QUOTE_SENT: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: 'Quote Sent' },
  LOST: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: 'Lost' },
};

const STATUS_BADGE: Record<string, { color: string }> = {
  PAID: { color: '#10B981' },
  PENDING: { color: '#F59E0B' },
  PROCESSING: { color: '#3B82F6' },
};

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 24,
};

const activeDeals = DEALS.filter((d) => d.stage !== 'LOST' && d.stage !== 'BOUND');
const totalCommissions = COMMISSIONS.reduce((s, c) => s + c.amount, 0);

const STATS = [
  { label: 'Active Deals', value: activeDeals.length },
  { label: 'Total Deals', value: DEALS.length },
  { label: 'Clients', value: 24 },
  { label: 'Commissions', value: `$${totalCommissions.toLocaleString()}` },
];

export function AgentDashboard() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  return (
    <AppShell activeNav="Dashboard">
      <div style={{ maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4, fontFamily: 'var(--app-font-heading)' }}>Agent Dashboard</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', margin: 0 }}>Your deals, clients, and commissions</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ ...glass, borderBottom: '2px solid #E91E8C' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginBottom: 10, fontFamily: 'var(--app-font-heading)' }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* My Deals */}
          <div style={glass}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16, color: '#E91E8C' }}>🤝</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>My Deals</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {DEALS.map((d, i) => {
                const badge = STAGE_BADGE[d.stage] || { color: '#fff', bg: 'rgba(255,255,255,0.08)', label: d.stage };
                return (
                  <div key={d.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: i < DEALS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: 0 }}>{d.ref}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', margin: '2px 0 0' }}>{d.vertical} · {d.employees} EEs</p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: badge.color,
                      background: badge.bg, borderRadius: 4, padding: '2px 8px',
                    }}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commission Statements */}
          <div style={glass}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16, color: '#E91E8C' }}>💵</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Commission Statements</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {COMMISSIONS.map((c, i) => {
                const sc = STATUS_BADGE[c.status] || { color: 'rgba(255,255,255,0.48)' };
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: i < COMMISSIONS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>${c.amount.toLocaleString()}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', margin: '2px 0 0' }}>{c.type}</p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: sc.color }}>{c.status}</span>
                  </div>
                );
              })}
            </div>

            {/* Commission bar chart */}
            <div style={{ marginTop: 16, padding: '14px 0 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>YTD EARNINGS</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48 }}>
                {[65, 80, 55, 90, 72, 100, 85].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: i === 5 ? 'linear-gradient(180deg,#7C3AED,#E91E8C)' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                {['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                  <span key={m} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flex: 1, textAlign: 'center' }}>{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={glass}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16, marginTop: 0 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Submit New Quote', desc: 'Start a new deal submission', icon: '📝' },
              { label: 'View Commissions', desc: 'Check your earnings', icon: '💰' },
              { label: 'Download Resources', desc: 'Forms, guides, and templates', icon: '📦' },
            ].map((action) => (
              <button
                key={action.label}
                style={{
                  textAlign: 'left', padding: 16, borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(233,30,140,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{action.icon}</span>
                  <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>↗</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: 0 }}>{action.label}</p>
                <p style={{ fontSize: 12, marginTop: 4, color: 'rgba(255,255,255,0.48)', margin: '4px 0 0' }}>{action.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
