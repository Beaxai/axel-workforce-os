import { useEffect, useState } from 'react';
import './_group.css';
import { AppShell } from './_shared/AppShell';
import { Search, ChevronRight, ArrowUpRight } from 'lucide-react';

const accent = '#E91E8C';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';

const IMPLEMENTATIONS = [
  { id: '1', account: 'Sunrise Logistics Inc.',     carrier: 'AmTrust Financial',     effective: '2025-01-15', currentStep: 6, totalSteps: 8,  owner: 'Priya Sharma',   status: 'ON_TRACK',  product: 'WC' },
  { id: '2', account: 'Peak Construction LLC',      carrier: 'Zurich North America',   effective: '2025-01-01', currentStep: 14, totalSteps: 14, owner: 'Marcus Webb',    status: 'COMPLETE',  product: 'WC' },
  { id: '3', account: 'Harbor Medical Group',        carrier: 'Berkshire Hathaway',    effective: '2024-12-01', currentStep: 3,  totalSteps: 14, owner: 'Priya Sharma',   status: 'AT_RISK',   product: 'PEO' },
  { id: '4', account: 'BlueSky Staffing Solutions',  carrier: 'ICW Group',             effective: '2025-02-01', currentStep: 2,  totalSteps: 8,  owner: 'Sarah Anderson', status: 'ON_TRACK',  product: 'WC' },
  { id: '5', account: 'Meridian Healthcare LLC',     carrier: 'Liberty Mutual',        effective: '2025-01-20', currentStep: 9,  totalSteps: 14, owner: 'Marcus Webb',    status: 'ON_TRACK',  product: 'PEO' },
  { id: '6', account: 'Cascade Retail Partners',    carrier: 'Travelers',             effective: '2025-03-01', currentStep: 1,  totalSteps: 8,  owner: 'Priya Sharma',   status: 'ON_TRACK',  product: 'WC' },
  { id: '7', account: 'Greenfield Manufacturing',   carrier: 'The Hartford',          effective: '2024-11-15', currentStep: 5,  totalSteps: 11, owner: 'Sarah Anderson', status: 'BLOCKED',   product: 'ASO' },
  { id: '8', account: 'Pacific Rim Distributors',   carrier: 'Nationwide',            effective: '2025-02-15', currentStep: 1,  totalSteps: 8,  owner: 'Marcus Webb',    status: 'ON_TRACK',  product: 'WC' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ON_TRACK: { label: 'On Track', bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  AT_RISK:  { label: 'At Risk',  bg: 'rgba(234,179,8,0.12)',  color: '#eab308' },
  BLOCKED:  { label: 'Blocked',  bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  COMPLETE: { label: 'Complete', bg: 'rgba(107,114,128,0.12)',color: '#9ca3af' },
};

const PRODUCT_CONFIG: Record<string, { bg: string; color: string }> = {
  WC:  { bg: 'rgba(233,30,140,0.10)', color: accent },
  PEO: { bg: 'rgba(124,58,237,0.10)', color: '#7C3AED' },
  ASO: { bg: 'rgba(14,165,233,0.10)', color: '#0EA5E9' },
};

const TAB_KEYS = ['All', 'WC', 'PEO', 'ASO'] as const;
type TabKey = typeof TAB_KEYS[number];

export function Implementations() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabKey>('All');

  const filtered = IMPLEMENTATIONS.filter((r) => {
    const matchSearch = !search ||
      r.account.toLowerCase().includes(search.toLowerCase()) ||
      r.carrier.toLowerCase().includes(search.toLowerCase()) ||
      r.owner.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'All' || r.product === tab;
    return matchSearch && matchTab;
  });

  const onTrack = IMPLEMENTATIONS.filter((r) => r.status === 'ON_TRACK').length;
  const atRisk  = IMPLEMENTATIONS.filter((r) => r.status === 'AT_RISK').length;
  const blocked = IMPLEMENTATIONS.filter((r) => r.status === 'BLOCKED').length;
  const complete= IMPLEMENTATIONS.filter((r) => r.status === 'COMPLETE').length;

  const thS = {
    textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const,
    letterSpacing: '0.04em', color: textMuted, padding: '10px 16px',
    borderBottom: `1px solid ${borderColor}`, whiteSpace: 'nowrap' as const,
  };
  const tdS = { fontSize: '13px', color: textSecondary, padding: '14px 16px', borderBottom: `1px solid rgba(255,255,255,0.04)` };

  return (
    <AppShell activeNav="Implementations">
      <div style={{ maxWidth: '1100px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>Implementations</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: textMuted }}>Bound accounts currently being onboarded</p>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'On Track', value: onTrack, color: '#22c55e' },
            { label: 'At Risk',  value: atRisk,  color: '#eab308' },
            { label: 'Blocked',  value: blocked, color: '#ef4444' },
            { label: 'Complete', value: complete, color: '#9ca3af' },
          ].map((s) => (
            <div key={s.label} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '14px 18px', backdropFilter: 'blur(12px)' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: s.color, marginBottom: '2px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: textMuted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab bar + search */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {TAB_KEYS.map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                border: `1px solid ${tab === t ? accent : borderColor}`,
                background: tab === t ? 'rgba(233,30,140,0.12)' : 'transparent',
                color: tab === t ? accent : textMuted, cursor: 'pointer',
              }}>
                {t === 'All' ? 'All' : t}
                {t !== 'All' && <span style={{ marginLeft: '5px', opacity: 0.7 }}>({IMPLEMENTATIONS.filter((r) => r.product === t).length})</span>}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
            <input
              placeholder="Search accounts, carriers, owners…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '7px 12px 7px 30px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)', background: cardBg,
                color: textPrimary, fontSize: '13px', outline: 'none', width: '240px', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Account</th>
                <th style={thS}>Carrier</th>
                <th style={thS}>Product</th>
                <th style={thS}>Effective Date</th>
                <th style={thS}>Progress</th>
                <th style={thS}>Owner</th>
                <th style={thS}>Status</th>
                <th style={{ ...thS, textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG['ON_TRACK'];
                const pc = PRODUCT_CONFIG[r.product] || { bg: 'rgba(107,114,128,0.10)', color: '#9ca3af' };
                const pct = Math.round((r.currentStep / r.totalSteps) * 100);
                const isComplete = r.status === 'COMPLETE';
                return (
                  <tr key={r.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdS, fontWeight: 600, color: textPrimary }}>{r.account}</td>
                    <td style={tdS}>{r.carrier}</td>
                    <td style={tdS}>
                      <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: pc.bg, color: pc.color }}>{r.product}</span>
                    </td>
                    <td style={{ ...tdS, color: textMuted }}>{r.effective}</td>
                    <td style={tdS}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: isComplete ? '#9ca3af' : textPrimary }}>
                            Step {r.currentStep}/{r.totalSteps}
                          </span>
                          <span style={{ fontSize: '11px', color: textMuted }}>{pct}%</span>
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '2px', transition: 'width 0.3s',
                            width: `${pct}%`,
                            background: isComplete ? '#9ca3af' : r.status === 'BLOCKED' ? '#ef4444' : r.status === 'AT_RISK' ? '#eab308' : 'linear-gradient(90deg,#7C3AED,#E91E8C)',
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={tdS}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: 700, color: '#fff',
                        }}>
                          {r.owner.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span style={{ fontSize: '13px', color: textSecondary }}>{r.owner}</span>
                      </div>
                    </td>
                    <td style={tdS}>
                      <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ ...tdS, textAlign: 'center' }}>
                      <button style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px' }}>
                        <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: textMuted, fontSize: '14px', margin: 0 }}>No implementations match.</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '10px', fontSize: '12px', color: textMuted }}>
          {filtered.length} implementation{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>
    </AppShell>
  );
}
