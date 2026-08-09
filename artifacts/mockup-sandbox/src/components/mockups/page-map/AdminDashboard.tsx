import './_group.css';
import { useEffect, useState } from 'react';
import { AppShell } from './_shared/AppShell';

const KPI_DATA = [
  { label: 'TOTAL PREMIUM IN FORCE', value: '$142.8M', delta: '+12.4%', icon: '💳' },
  { label: 'TOTAL WORKFORCE REVENUE', value: '$28.4M', delta: '+8.2%', icon: '📈' },
  { label: 'TOTAL WORKFORCE HEADCOUNT', value: '12,482', valueSuffix: 'Active', delta: null, icon: '👥' },
  { label: 'AGENTS APPOINTED', value: '3,105', delta: '+240', icon: '🛡️' },
];

const DONUT_DATA = [
  { name: 'Healthcare', value: 1420, pct: 36, color: '#7C3AED' },
  { name: 'Construction', value: 1014, pct: 26, color: '#E91E8C' },
  { name: 'Cannabis', value: 608, pct: 15, color: '#10B981' },
  { name: 'Staffing', value: 486, pct: 12, color: '#F59E0B' },
  { name: 'Hospitality', value: 324, pct: 8, color: '#3B82F6' },
];

const SECTOR_DATA = [
  { emoji: '🏥', name: 'Healthcare', subtitle: 'Critical Care & Pharma', count: '1,420', delta: '+4.1%', deltaType: 'positive' as const },
  { emoji: '🏗️', name: 'Construction', subtitle: 'Infrastructure & Residential', count: '1,014', delta: '+2.8%', deltaType: 'positive' as const },
  { emoji: '🌿', name: 'Cannabis', subtitle: 'Retail & Cultivation', count: '608', delta: '-1.4%', deltaType: 'negative' as const },
  { emoji: '💼', name: 'Staffing', subtitle: 'Clerical & Industrial', count: '486', delta: 'STEADY', deltaType: 'steady' as const },
  { emoji: '🍽️', name: 'Hospitality', subtitle: 'F&B and Lodging', count: '324', delta: 'STEADY', deltaType: 'steady' as const },
];

const PIPELINE_DATA = [
  { initials: 'TP', name: 'Titan Pacific Contractors', vertical: 'Construction', status: 'IN REVIEW', revenue: '$450,000', color: '#1E40AF' },
  { initials: 'EC', name: 'Emerald Coast Cultivation', vertical: 'Cannabis', status: 'ACTIVE', revenue: '$1,200,000', color: '#065F46' },
  { initials: 'PH', name: 'Pinnacle Home Health', vertical: 'Healthcare', status: 'PENDING', revenue: '$890,000', color: '#6D28D9' },
];

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  'IN REVIEW': { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  ACTIVE: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  PENDING: { color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
};

const DELTA_COLORS = {
  positive: '#10B981',
  negative: '#EF4444',
  steady: 'rgba(255,255,255,0.4)',
};

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 24,
};

export function AdminDashboard() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // SVG Donut chart
  const total = DONUT_DATA.reduce((s, d) => s + d.value, 0);
  const cx = 110, cy = 110, r = 85, innerR = 58;
  let cumAngle = -Math.PI / 2;
  const arcs = DONUT_DATA.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle);
    const y2 = cy + r * Math.sin(cumAngle + angle);
    const ix1 = cx + innerR * Math.cos(cumAngle + angle);
    const iy1 = cy + innerR * Math.sin(cumAngle + angle);
    const ix2 = cx + innerR * Math.cos(cumAngle);
    const iy2 = cy + innerR * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
    cumAngle += angle;
    return { ...d, path };
  });

  return (
    <AppShell activeNav="Dashboard">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4, fontFamily: 'var(--app-font-heading)' }}>Dashboard</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', margin: 0 }}>
              Real-time performance analytics across the global ecosystem.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
              color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: 500, padding: '8px 16px', cursor: 'pointer',
            }}>Export Report</button>
            <button style={{
              background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 13, fontWeight: 500, padding: '8px 16px', cursor: 'pointer',
            }}>+ Generate Insight</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {KPI_DATA.map((kpi) => (
            <div key={kpi.label} style={{ ...glass, borderBottom: '2px solid #E91E8C' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', fontFamily: 'var(--app-font-heading)' }}>
                  {kpi.label}
                </span>
                <div style={{ background: 'rgba(124,58,237,0.15)', borderRadius: 8, padding: 8, fontSize: 16 }}>
                  {kpi.icon}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{kpi.value}</span>
                {kpi.valueSuffix && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)' }}>{kpi.valueSuffix}</span>}
                {kpi.delta && <span style={{ fontSize: 12, fontWeight: 500, color: '#4ADE80' }}>{kpi.delta}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Middle Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '45fr 55fr', gap: 16, marginBottom: 24 }}>
          {/* Donut Chart */}
          <div style={glass}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4 }}>
                Policies by Vertical Distribution
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', margin: 0, lineHeight: 1.4 }}>
                Comprehensive breakdown of active policy accounts across primary market sectors.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <svg width={220} height={220} viewBox="0 0 220 220">
                {arcs.map((arc, i) => (
                  <path key={i} d={arc.path} fill={arc.color} />
                ))}
                <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize={24} fontWeight={700}>4.2k</text>
                <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.48)" fontSize={9} letterSpacing="0.06em">TOTAL POLICIES</text>
              </svg>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {DONUT_DATA.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)' }}>{d.pct}%</span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex', gap: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16,
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', display: 'block', marginBottom: 4 }}>
                  PRIMARY GROWTH
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Healthcare</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#10B981' }}>+12%</span>
                </div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.07)' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', display: 'block', marginBottom: 4 }}>
                  AVG. RETENTION
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>94.8%</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)' }}>Stable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sector Performance */}
          <div style={glass}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', fontFamily: 'var(--app-font-heading)' }}>
                SECTOR PERFORMANCE DETAIL
              </span>
              <span style={{ fontSize: 12, color: '#E91E8C', cursor: 'pointer', fontWeight: 500 }}>
                Quarterly View
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {SECTOR_DATA.map((sector, i) => (
                <div
                  key={sector.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
                    borderBottom: i < SECTOR_DATA.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  }}
                >
                  <div style={{
                    background: 'rgba(124,58,237,0.12)', borderRadius: 8, padding: 8, fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {sector.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{sector.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)' }}>{sector.subtitle}</div>
                  </div>
                  {/* Mini bar */}
                  <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${Math.round((parseInt(sector.count.replace(',','')) / 1420) * 100)}%`, background: 'linear-gradient(90deg,#7C3AED,#E91E8C)', borderRadius: 2 }} />
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{sector.count}</div>
                    <div style={{ fontSize: 12, color: DELTA_COLORS[sector.deltaType] }}>{sector.delta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline Table */}
        <div style={glass}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Recent Implementation Pipelines</span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#E91E8C', cursor: 'pointer', fontFamily: 'var(--app-font-heading)' }}>
              VIEW ALL PIPELINES
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ACCOUNT NAME', 'VERTICAL', 'STATUS', 'ESTIMATED REVENUE', 'ACTIONS'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                    color: 'rgba(255,255,255,0.48)', padding: '0 8px 12px', fontFamily: 'var(--app-font-heading)',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PIPELINE_DATA.map((row) => {
                const st = STATUS_STYLES[row.status] || { color: '#fff', bg: 'rgba(255,255,255,0.05)' };
                return (
                  <tr key={row.initials} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <td style={{ padding: '14px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 999, background: row.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0,
                        }}>{row.initials}</div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{row.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 8px', fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>{row.vertical}</td>
                    <td style={{ padding: '14px 8px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 4, padding: '2px 8px' }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', fontSize: 14, fontWeight: 500, color: '#fff' }}>{row.revenue}</td>
                    <td style={{ padding: '14px 8px', position: 'relative' }}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === row.initials ? null : row.initials)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.48)', padding: 4, fontSize: 18 }}
                      >⋯</button>
                      {menuOpen === row.initials && (
                        <div style={{
                          position: 'absolute', right: 8, top: 40,
                          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: 8, padding: '4px 0', minWidth: 120, zIndex: 10,
                        }}>
                          {['Edit', 'View', 'Archive'].map((action) => (
                            <button
                              key={action}
                              onClick={() => setMenuOpen(null)}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left', background: 'none',
                                border: 'none', color: 'rgba(255,255,255,0.72)', fontSize: 13, padding: '8px 14px', cursor: 'pointer',
                              }}
                            >{action}</button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
