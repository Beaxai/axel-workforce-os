import { useEffect, useState } from 'react';
import './_group.css';
import { AppShell } from './_shared/AppShell';
import { Search, Download, TrendingUp, DollarSign, AlertCircle, FileText, MoreHorizontal } from 'lucide-react';

const accent = '#E91E8C';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';

const BILLING_RECORDS = [
  { id: '1', account: 'Sunrise Logistics Inc.', policy: 'WC-2024-00812', carrier: 'AmTrust Financial', premium: 148200, status: 'Current', dueDate: '2025-02-01' },
  { id: '2', account: 'Peak Construction LLC', policy: 'WC-2024-01045', carrier: 'Zurich North America', premium: 312500, status: 'Current', dueDate: '2025-01-15' },
  { id: '3', account: 'Harbor Medical Group', policy: 'WC-2024-00631', carrier: 'Berkshire Hathaway', premium: 89700, status: 'Overdue', dueDate: '2024-12-20' },
  { id: '4', account: 'Cascade Retail Partners', policy: 'WC-2024-01230', carrier: 'Travelers', premium: 204100, status: 'Current', dueDate: '2025-02-15' },
  { id: '5', account: 'BlueSky Staffing Solutions', policy: 'WC-2024-00998', carrier: 'ICW Group', premium: 517300, status: 'Pending', dueDate: '2025-01-31' },
  { id: '6', account: 'Meridian Healthcare LLC', policy: 'WC-2024-00754', carrier: 'Liberty Mutual', premium: 162400, status: 'Current', dueDate: '2025-03-01' },
  { id: '7', account: 'Greenfield Manufacturing', policy: 'WC-2024-01189', carrier: 'The Hartford', premium: 445800, status: 'Overdue', dueDate: '2024-12-31' },
  { id: '8', account: 'Pacific Rim Distributors', policy: 'WC-2024-00880', carrier: 'Nationwide', premium: 98600, status: 'Current', dueDate: '2025-02-28' },
];

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  Current:  { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  Overdue:  { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  Pending:  { bg: 'rgba(234,179,8,0.12)',  color: '#eab308' },
  Cancelled:{ bg: 'rgba(107,114,128,0.12)',color: '#6b7280' },
};

const fmt = (n: number) => '$' + n.toLocaleString('en-US');

export function Billing() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'premium' | 'dueDate' | 'account'>('account');

  const totalPremium = BILLING_RECORDS.reduce((s, r) => s + r.premium, 0);
  const collected = BILLING_RECORDS.filter((r) => r.status === 'Current').reduce((s, r) => s + r.premium, 0);
  const outstanding = BILLING_RECORDS.filter((r) => r.status === 'Overdue').reduce((s, r) => s + r.premium, 0);

  const filtered = BILLING_RECORDS
    .filter((r) => !search || r.account.toLowerCase().includes(search.toLowerCase()) || r.policy.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'premium') return b.premium - a.premium;
      if (sort === 'dueDate') return a.dueDate.localeCompare(b.dueDate);
      return a.account.localeCompare(b.account);
    });

  const stats = [
    { label: 'Total Premium', value: fmt(totalPremium), icon: DollarSign, color: '#7C3AED' },
    { label: 'Collected (Current)', value: fmt(collected), icon: TrendingUp, color: '#22c55e' },
    { label: 'Outstanding', value: fmt(outstanding), icon: AlertCircle, color: '#ef4444' },
    { label: 'Total Policies', value: String(BILLING_RECORDS.length), icon: FileText, color: accent },
  ];

  const thS = {
    textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const,
    letterSpacing: '0.04em', color: textMuted, padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' as const,
  };
  const tdS = {
    fontSize: '13px', color: textSecondary, padding: '13px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  };

  return (
    <AppShell activeNav="Billing">
      <div style={{ maxWidth: '1100px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>Billing</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: textMuted }}>
            {fmt(totalPremium)} total active premium under management
          </p>
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '18px 20px', backdropFilter: 'blur(12px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} style={{ color: s.color }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: textMuted }}>{s.label}</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: textPrimary }}>{s.value}</div>
              </div>
            );
          })}
        </div>

        {/* Search + actions */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
            <input
              placeholder="Filter by account or policy…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '9px 14px 9px 36px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)', background: cardBg,
                color: textPrimary, fontSize: '13.5px', outline: 'none', width: '280px', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: textMuted }}>Sort:</span>
            {(['account', 'premium', 'dueDate'] as const).map((s) => (
              <button key={s} onClick={() => setSort(s)} style={{
                padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 500,
                border: `1px solid ${sort === s ? accent : borderColor}`,
                background: sort === s ? 'rgba(233,30,140,0.12)' : 'transparent',
                color: sort === s ? accent : textMuted, cursor: 'pointer',
              }}>
                {s === 'dueDate' ? 'Due Date' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', border: `1px solid ${borderColor}`,
            background: 'transparent', color: textSecondary, fontSize: '13px', cursor: 'pointer',
          }}>
            <Download size={13} /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Account</th>
                <th style={thS}>Policy #</th>
                <th style={thS}>Carrier</th>
                <th style={{ ...thS, textAlign: 'right' }}>Premium</th>
                <th style={thS}>Status</th>
                <th style={thS}>Due Date</th>
                <th style={{ ...thS, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG['Current'];
                return (
                  <tr key={r.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdS, fontWeight: 600, color: textPrimary }}>{r.account}</td>
                    <td style={tdS}>{r.policy}</td>
                    <td style={tdS}>{r.carrier}</td>
                    <td style={{ ...tdS, textAlign: 'right', fontWeight: 600, color: textPrimary }}>{fmt(r.premium)}</td>
                    <td style={tdS}>
                      <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ ...tdS, color: r.status === 'Overdue' ? '#ef4444' : textSecondary }}>{r.dueDate}</td>
                    <td style={{ ...tdS, textAlign: 'center' }}>
                      <button style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px' }}>
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: textMuted, fontSize: '14px', margin: 0 }}>No policies match.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
