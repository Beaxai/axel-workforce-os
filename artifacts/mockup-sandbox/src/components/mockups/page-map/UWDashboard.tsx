import './_group.css';
import { useEffect } from 'react';
import { AppShell } from './_shared/AppShell';

const PENDING_DEALS = [
  { id: 1, ref: 'AX-2024-0094', vertical: 'Construction', state: 'TX', employees: 72, stage: 'UW_REVIEW' },
  { id: 2, ref: 'AX-2024-0102', vertical: 'Cannabis', state: 'CO', employees: 35, stage: 'SUBMISSION_REVIEW' },
  { id: 3, ref: 'AX-2024-0111', vertical: 'Healthcare', state: 'FL', employees: 188, stage: 'UW_REVIEW' },
  { id: 4, ref: 'AX-2024-0124', vertical: 'Staffing', state: 'CA', employees: 95, stage: 'SUBMISSION_REVIEW' },
];

const BOUND_POLICIES = [
  { id: 1, number: 'POL-2024-0012', product: 'MEC Wrap', status: 'ACTIVE', premium: '$24,800' },
  { id: 2, number: 'POL-2024-0015', product: 'Level Funded', status: 'ACTIVE', premium: '$61,200' },
  { id: 3, number: 'POL-2024-0018', product: 'MEC Wrap', status: 'ACTIVE', premium: '$18,450' },
  { id: 4, number: 'POL-2024-0021', product: 'Self-Funded', status: 'ACTIVE', premium: '$94,000' },
];

const RATE_ENTRIES = [
  { vertical: 'Healthcare', product: 'MEC Wrap', bandMin: 1, bandMax: 50, rate: 48.50 },
  { vertical: 'Healthcare', product: 'MEC Wrap', bandMin: 51, bandMax: 200, rate: 42.00 },
  { vertical: 'Construction', product: 'Level Funded', bandMin: 1, bandMax: 50, rate: 55.75 },
  { vertical: 'Construction', product: 'Level Funded', bandMin: 51, bandMax: 200, rate: 49.25 },
  { vertical: 'Cannabis', product: 'MEC Wrap', bandMin: 1, bandMax: 50, rate: 62.00 },
  { vertical: 'Staffing', product: 'Self-Funded', bandMin: 50, bandMax: 500, rate: 38.90 },
];

const STAGE_LABEL: Record<string, string> = {
  UW_REVIEW: 'UW Review',
  SUBMISSION_REVIEW: 'In Review',
};

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 24,
};

export function UWDashboard() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  const STATS = [
    { label: 'Pending Review', value: PENDING_DEALS.length },
    { label: 'Total Deals', value: 28 },
    { label: 'Bound Policies', value: BOUND_POLICIES.length },
    { label: 'Rate Entries', value: RATE_ENTRIES.length },
  ];

  return (
    <AppShell activeNav="Dashboard">
      <div style={{ maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4, fontFamily: 'var(--app-font-heading)' }}>Underwriter Dashboard</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', margin: 0 }}>Deal review and approval center</p>
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

        {/* Two column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* UW Queue */}
          <div style={glass}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16, color: '#E91E8C' }}>📋</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Underwriting Queue</h3>
              <span style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#F59E0B',
                background: 'rgba(245,158,11,0.15)', borderRadius: 10, padding: '2px 8px',
              }}>{PENDING_DEALS.length} pending</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {PENDING_DEALS.map((d, i) => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: i < PENDING_DEALS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: 0 }}>{d.ref}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', margin: '2px 0 0' }}>{d.vertical} · {d.state} · EEs: {d.employees}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: '#E91E8C',
                      background: 'rgba(233,30,140,0.12)', borderRadius: 4, padding: '2px 8px',
                    }}>{STAGE_LABEL[d.stage]}</span>
                    <button style={{
                      fontSize: 12, fontWeight: 500, color: '#fff', background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
                      border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                    }}>Review</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rate Table */}
          <div style={glass}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16, color: '#E91E8C' }}>📊</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Rate Table Overview</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {RATE_ENTRIES.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < RATE_ENTRIES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)' }}>{r.vertical}</span>
                    <span style={{ fontSize: 12, marginLeft: 8, color: 'rgba(255,255,255,0.4)' }}>{r.product} · {r.bandMin}–{r.bandMax} EEs</span>
                  </div>
                  <span style={{ fontSize: 14, fontFamily: 'monospace', color: '#fff', fontWeight: 600 }}>${r.rate.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <button style={{
              marginTop: 16, width: '100%', padding: '10px 0',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer',
            }}>Manage Rate Tables →</button>
          </div>
        </div>

        {/* Bound Policies */}
        <div style={glass}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16, color: '#E91E8C' }}>🛡️</span>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Bound Policies</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {BOUND_POLICIES.map((p) => (
              <div key={p.id} style={{
                padding: 16, borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: 0 }}>{p.number}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: 'rgba(16,185,129,0.15)', borderRadius: 4, padding: '2px 6px' }}>
                    {p.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', margin: 0 }}>{p.product}</p>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#E91E8C' }}>{p.premium}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
