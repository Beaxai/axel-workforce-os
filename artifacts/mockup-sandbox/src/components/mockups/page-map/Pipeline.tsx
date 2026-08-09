import './_group.css';
import { useState, useEffect } from 'react';
import { AppShell } from './_shared/AppShell';
import { GlassCard } from './_shared/GlassCard';

const accent = '#E91E8C';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';

const STAGES = [
  { key: 'PROSPECT', label: 'Prospect', num: 1 },
  { key: 'QUALIFIED_LEAD', label: 'Qualified Lead', num: 2 },
  { key: 'PROPOSAL', label: 'Proposal', num: 3 },
  { key: 'INDICATION', label: 'Indication', num: 4 },
  { key: 'NEGOTIATION', label: 'Negotiation', num: 5 },
  { key: 'BIND', label: 'Bind Order', num: 6 },
  { key: 'BOUND', label: 'Bound', num: 7 },
  { key: 'IMPLEMENTATION', label: 'Implementation', num: 8 },
];

interface Deal {
  id: string;
  ref: string;
  businessName: string;
  vertical: string;
  productType: 'WC' | 'PEO';
  state: string;
  stage: string;
  wcPremium: number | null;
  pepm: number | null;
  locations: number;
  employees: number;
  payroll: number;
  exMod: number | null;
  broker: { initials: string; color: string };
  appetite: 'Acceptable' | 'Referral' | 'Conditional' | 'Ineligible';
}

const MOCK_DEALS: Deal[] = [
  // PROSPECT
  { id: '1', ref: 'AX-1A2B-CD3E', businessName: 'Sunrise Cannabis Co.', vertical: 'Cannabis', productType: 'WC', state: 'CA', stage: 'PROSPECT', wcPremium: null, pepm: null, locations: 3, employees: 42, payroll: 2100000, exMod: null, broker: { initials: 'KL', color: '#7C3AED' }, appetite: 'Referral' },
  { id: '2', ref: 'AX-2C4D-EF5G', businessName: 'Pacific Staffing LLC', vertical: 'Staffing', productType: 'PEO', state: 'WA', stage: 'PROSPECT', wcPremium: null, pepm: null, locations: 2, employees: 85, payroll: 4250000, exMod: null, broker: { initials: 'MR', color: '#E91E8C' }, appetite: 'Acceptable' },
  { id: '3', ref: 'AX-3E6F-GH7I', businessName: 'Coastal Construction', vertical: 'Construction', productType: 'WC', state: 'FL', stage: 'PROSPECT', wcPremium: null, pepm: null, locations: 1, employees: 28, payroll: 1400000, exMod: 1.12, broker: { initials: 'JT', color: '#0EA5E9' }, appetite: 'Conditional' },

  // QUALIFIED_LEAD
  { id: '4', ref: 'AX-4G8H-IJ9K', businessName: 'HealthFirst Group', vertical: 'Healthcare', productType: 'WC', state: 'TX', stage: 'QUALIFIED_LEAD', wcPremium: null, pepm: null, locations: 5, employees: 120, payroll: 6000000, exMod: 0.92, broker: { initials: 'KL', color: '#7C3AED' }, appetite: 'Acceptable' },
  { id: '5', ref: 'AX-5I0J-KL1M', businessName: 'Metro Transport Inc.', vertical: 'Transportation', productType: 'WC', state: 'IL', stage: 'QUALIFIED_LEAD', wcPremium: null, pepm: null, locations: 4, employees: 67, payroll: 3350000, exMod: 1.08, broker: { initials: 'SA', color: '#F59E0B' }, appetite: 'Referral' },
  { id: '6', ref: 'AX-6K2L-MN3N', businessName: 'Golden Harvest Farms', vertical: 'Cannabis', productType: 'WC', state: 'CO', stage: 'QUALIFIED_LEAD', wcPremium: null, pepm: null, locations: 2, employees: 34, payroll: 1700000, exMod: 0.88, broker: { initials: 'MR', color: '#E91E8C' }, appetite: 'Acceptable' },
  { id: '7', ref: 'AX-7M4N-OP5O', businessName: 'Summit Hospitality', vertical: 'Hospitality', productType: 'PEO', state: 'NV', stage: 'QUALIFIED_LEAD', wcPremium: null, pepm: null, locations: 3, employees: 92, payroll: 2760000, exMod: null, broker: { initials: 'JT', color: '#0EA5E9' }, appetite: 'Acceptable' },

  // PROPOSAL
  { id: '8', ref: 'AX-8N6O-PQ7P', businessName: 'BlueSky Manufacturing', vertical: 'Manufacturing', productType: 'WC', state: 'OH', stage: 'PROPOSAL', wcPremium: null, pepm: null, locations: 2, employees: 145, payroll: 8700000, exMod: 1.35, broker: { initials: 'SA', color: '#F59E0B' }, appetite: 'Conditional' },
  { id: '9', ref: 'AX-9O8P-QR9Q', businessName: 'Apex Retail Group', vertical: 'Retail', productType: 'PEO', state: 'NY', stage: 'PROPOSAL', wcPremium: null, pepm: null, locations: 12, employees: 230, payroll: 6900000, exMod: 0.95, broker: { initials: 'KL', color: '#7C3AED' }, appetite: 'Acceptable' },
  { id: '10', ref: 'AX-0P0Q-RS1R', businessName: 'Green Valley Nursery', vertical: 'Cannabis', productType: 'WC', state: 'OR', stage: 'PROPOSAL', wcPremium: null, pepm: null, locations: 1, employees: 18, payroll: 900000, exMod: 1.02, broker: { initials: 'MR', color: '#E91E8C' }, appetite: 'Referral' },

  // INDICATION
  { id: '11', ref: 'AX-1Q2R-ST3S', businessName: 'Riverside Healthcare', vertical: 'Healthcare', productType: 'WC', state: 'PA', stage: 'INDICATION', wcPremium: 287500, pepm: null, locations: 6, employees: 180, payroll: 9000000, exMod: 0.89, broker: { initials: 'JT', color: '#0EA5E9' }, appetite: 'Acceptable' },
  { id: '12', ref: 'AX-2R4S-TU5T', businessName: 'CloudTech Staffing', vertical: 'Staffing', productType: 'PEO', state: 'GA', stage: 'INDICATION', wcPremium: 142000, pepm: 185, locations: 3, employees: 76, payroll: 3800000, exMod: 0.97, broker: { initials: 'SA', color: '#F59E0B' }, appetite: 'Acceptable' },
  { id: '13', ref: 'AX-3S6T-UV7U', businessName: 'National Build Corp', vertical: 'Construction', productType: 'WC', state: 'AZ', stage: 'INDICATION', wcPremium: 415000, pepm: null, locations: 4, employees: 210, payroll: 12600000, exMod: 1.18, broker: { initials: 'KL', color: '#7C3AED' }, appetite: 'Conditional' },

  // NEGOTIATION
  { id: '14', ref: 'AX-4T8U-VW9V', businessName: 'Nexus Transportation', vertical: 'Transportation', productType: 'WC', state: 'TX', stage: 'NEGOTIATION', wcPremium: 523000, pepm: null, locations: 8, employees: 310, payroll: 15500000, exMod: 1.05, broker: { initials: 'MR', color: '#E91E8C' }, appetite: 'Referral' },
  { id: '15', ref: 'AX-5U0V-WX1W', businessName: 'Harbor Hospitality', vertical: 'Hospitality', productType: 'PEO', state: 'CA', stage: 'NEGOTIATION', wcPremium: 198000, pepm: 220, locations: 5, employees: 142, payroll: 4260000, exMod: 0.93, broker: { initials: 'SA', color: '#F59E0B' }, appetite: 'Acceptable' },
  { id: '16', ref: 'AX-6V2W-XY3X', businessName: 'Pinnacle Retail Co.', vertical: 'Retail', productType: 'WC', state: 'FL', stage: 'NEGOTIATION', wcPremium: 334000, pepm: null, locations: 9, employees: 195, payroll: 5850000, exMod: 1.22, broker: { initials: 'JT', color: '#0EA5E9' }, appetite: 'Conditional' },

  // BIND
  { id: '17', ref: 'AX-7W4X-YZ5Y', businessName: 'Emerald Cannabis Labs', vertical: 'Cannabis', productType: 'WC', state: 'WA', stage: 'BIND', wcPremium: 176500, pepm: null, locations: 2, employees: 56, payroll: 2800000, exMod: 0.84, broker: { initials: 'KL', color: '#7C3AED' }, appetite: 'Acceptable' },
  { id: '18', ref: 'AX-8X6Y-ZA7Z', businessName: 'Meridian Manufacturing', vertical: 'Manufacturing', productType: 'PEO', state: 'MI', stage: 'BIND', wcPremium: 687000, pepm: 310, locations: 3, employees: 265, payroll: 15900000, exMod: 1.01, broker: { initials: 'MR', color: '#E91E8C' }, appetite: 'Acceptable' },

  // BOUND
  { id: '19', ref: 'AX-9Y8Z-AB9A', businessName: 'Cardinal Healthcare Sys.', vertical: 'Healthcare', productType: 'WC', state: 'OH', stage: 'BOUND', wcPremium: 445000, pepm: null, locations: 7, employees: 275, payroll: 13750000, exMod: 0.91, broker: { initials: 'SA', color: '#F59E0B' }, appetite: 'Acceptable' },
  { id: '20', ref: 'AX-0Z0A-BC1B', businessName: 'Delta Staffing Solutions', vertical: 'Staffing', productType: 'PEO', state: 'TX', stage: 'BOUND', wcPremium: 312000, pepm: 265, locations: 4, employees: 185, payroll: 9250000, exMod: 0.97, broker: { initials: 'JT', color: '#0EA5E9' }, appetite: 'Acceptable' },

  // IMPLEMENTATION
  { id: '21', ref: 'AX-1A2B-CD4F', businessName: 'Vertex Construction Co.', vertical: 'Construction', productType: 'WC', state: 'CO', stage: 'IMPLEMENTATION', wcPremium: 892000, pepm: null, locations: 6, employees: 430, payroll: 25800000, exMod: 1.07, broker: { initials: 'KL', color: '#7C3AED' }, appetite: 'Acceptable' },
  { id: '22', ref: 'AX-2B3C-EF5G', businessName: 'Luminary Retail Corp', vertical: 'Retail', productType: 'PEO', state: 'CA', stage: 'IMPLEMENTATION', wcPremium: 567000, pepm: 295, locations: 18, employees: 480, payroll: 14400000, exMod: 0.88, broker: { initials: 'SA', color: '#F59E0B' }, appetite: 'Acceptable' },
  { id: '23', ref: 'AX-3C4D-FG6H', businessName: 'Olympus Hospitality LLC', vertical: 'Hospitality', productType: 'WC', state: 'NV', stage: 'IMPLEMENTATION', wcPremium: 234000, pepm: null, locations: 4, employees: 168, payroll: 5040000, exMod: 0.96, broker: { initials: 'MR', color: '#E91E8C' }, appetite: 'Acceptable' },
];

function fmtMoney(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function AppetiteChip({ a }: { a: Deal['appetite'] }) {
  const colors: Record<string, string> = {
    Acceptable: '#22c55e',
    Referral: '#f59e0b',
    Conditional: '#1E6BE9',
    Ineligible: '#ef4444',
  };
  const c = colors[a] ?? textMuted;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: `${c}18`, color: c, border: `1px solid ${c}40`, letterSpacing: '0.03em' }}>
      {a}
    </span>
  );
}

function TypeBadge({ t }: { t: 'WC' | 'PEO' }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: t === 'PEO' ? 'rgba(124,58,237,0.15)' : 'rgba(14,165,233,0.12)', color: t === 'PEO' ? '#a78bfa' : '#38bdf8', border: `1px solid ${t === 'PEO' ? 'rgba(124,58,237,0.3)' : 'rgba(14,165,233,0.25)'}` }}>
      {t}
    </span>
  );
}

function Avatar({ initials, color, size = 26 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `${color}22`, border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color, flexShrink: 0, letterSpacing: '0.03em' }}>
      {initials}
    </div>
  );
}

function KpiStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--app-font-heading)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary, lineHeight: 1.2 }}>{value}</span>
    </div>
  );
}

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: cardBg,
        border: `1px solid ${hovered ? 'rgba(233,30,140,0.3)' : borderColor}`,
        borderRadius: 10,
        padding: 12,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? '0 4px 20px rgba(233,30,140,0.08)' : 'none',
      }}
    >
      {/* Top row: name + ref */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: 0, lineHeight: 1.25, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
          {deal.businessName}
        </p>
        <span style={{ fontSize: 10, color: textMuted, fontFamily: 'monospace', letterSpacing: '0.02em', flexShrink: 0, paddingTop: 1 }}>{deal.ref}</span>
      </div>

      {/* Vertical + type badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: textMuted, fontWeight: 500 }}>{deal.vertical}</span>
        <span style={{ color: borderColor }}>|</span>
        <TypeBadge t={deal.productType} />
        <AppetiteChip a={deal.appetite} />
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <KpiStat label="Loc" value={String(deal.locations)} />
        <KpiStat label="Emp" value={String(deal.employees)} />
        <KpiStat label="Payroll" value={fmtMoney(deal.payroll)} />
        <KpiStat label="ExMod" value={deal.exMod != null ? deal.exMod.toFixed(2) : '—'} />
      </div>

      {/* Bottom: premium + broker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {deal.wcPremium != null ? (
            <p style={{ fontSize: 12, fontWeight: 600, color: textPrimary, margin: 0 }}>{fmtMoney(deal.wcPremium)} WC</p>
          ) : (
            <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Pending Quote</p>
          )}
          {deal.pepm != null && (
            <p style={{ fontSize: 11, color: textSecondary, margin: '2px 0 0' }}>${deal.pepm}/ee/mo PEPM</p>
          )}
        </div>
        <Avatar initials={deal.broker.initials} color={deal.broker.color} />
      </div>
    </div>
  );
}

export function Pipeline() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [appetiteFilter, setAppetiteFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);

  const filteredDeals = MOCK_DEALS.filter(d => {
    if (appetiteFilter && d.appetite !== appetiteFilter) return false;
    if (search && !d.businessName.toLowerCase().includes(search.toLowerCase()) && !d.vertical.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const dealsByStage = (key: string) => filteredDeals.filter(d => d.stage === key);

  const totalPremium = MOCK_DEALS.filter(d => d.wcPremium != null).reduce((s, d) => s + (d.wcPremium ?? 0), 0);

  const borderSubtle = borderColor;

  return (
    <AppShell activeNav="Pipeline">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--app-font-heading)', fontSize: 22, fontWeight: 700, color: textPrimary, margin: 0, lineHeight: 1.2 }}>Pipeline</h1>
            <p style={{ fontSize: 13, color: textMuted, margin: '4px 0 0' }}>{MOCK_DEALS.length} deals · {fmtMoney(totalPremium)} WC Premium</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', borderRadius: 8, border: `1px solid ${borderSubtle}`, overflow: 'hidden' }}>
              <button
                onClick={() => setViewMode('kanban')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: viewMode === 'kanban' ? 'rgba(233,30,140,0.15)' : 'transparent', color: viewMode === 'kanban' ? accent : textMuted, transition: 'all 0.15s' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="18" rx="1"/><rect x="17" y="3" width="5" height="18" rx="1"/></svg>
                Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 13, fontWeight: 500, border: 'none', borderLeft: `1px solid ${borderSubtle}`, cursor: 'pointer', background: viewMode === 'list' ? 'rgba(233,30,140,0.15)' : 'transparent', color: viewMode === 'list' ? accent : textMuted, transition: 'all 0.15s' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                List
              </button>
            </div>
            {/* New Deal */}
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff', cursor: 'pointer', letterSpacing: '0.01em' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Deal
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '0 0 220px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search deals…"
              style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: 8, border: `1px solid ${borderSubtle}`, background: cardBg, color: textPrimary, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ fontSize: 12, color: textMuted }}>Appetite:</span>
          {[{ label: 'All', val: '' }, { label: 'Acceptable', val: 'Acceptable' }, { label: 'Referral', val: 'Referral' }, { label: 'Conditional', val: 'Conditional' }, { label: 'Ineligible', val: 'Ineligible' }].map(({ label, val }) => {
            const chipColors: Record<string, string> = { Acceptable: '#22c55e', Referral: '#f59e0b', Conditional: '#1E6BE9', Ineligible: '#ef4444' };
            const c = chipColors[val] || textMuted;
            const isActive = appetiteFilter === val;
            return (
              <button
                key={val}
                onClick={() => setAppetiteFilter(val)}
                style={{ padding: '4px 12px', borderRadius: 6, border: isActive ? `1px solid ${c}` : `1px solid ${borderSubtle}`, cursor: 'pointer', fontSize: 12, fontWeight: 500, background: isActive ? `${c}20` : 'transparent', color: isActive ? c : textMuted, transition: 'all 0.15s' }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Kanban board */}
        {viewMode === 'kanban' ? (
          <div style={{ display: 'flex', gap: 10, flex: 1, overflowX: 'auto', paddingBottom: 8 }}>
            {STAGES.map(stage => {
              const stageDeals = dealsByStage(stage.key);
              const isDropTarget = dragOver === stage.key;
              return (
                <div
                  key={stage.key}
                  onDragOver={e => { e.preventDefault(); setDragOver(stage.key); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => setDragOver(null)}
                  style={{ minWidth: 238, width: 238, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
                >
                  {/* Column header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, paddingLeft: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: textMuted }}>{stage.num}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: textSecondary }}>{stage.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: cardBg, color: textMuted, border: `1px solid ${borderColor}` }}>{stageDeals.length}</span>
                  </div>

                  {/* Column body */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: 8,
                      background: cardBg,
                      backdropFilter: 'blur(12px)',
                      border: `1px solid ${isDropTarget ? 'rgba(233,30,140,0.4)' : borderColor}`,
                      borderRadius: 12,
                      transition: 'border-color 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {stageDeals.map(deal => (
                      <div key={deal.id} draggable onDragEnd={() => setDragOver(null)}>
                        <DealCard deal={deal} onClick={() => setSelectedDeal(deal.id)} />
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <div style={{ padding: '24px 8px', textAlign: 'center', fontSize: 12, color: textMuted }}>No deals</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <GlassCard padding="0px">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Business', 'Vertical', 'Type', 'State', 'Stage', 'WC Premium', 'PEPM', 'Appetite'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600, fontSize: 12, color: textMuted, borderBottom: `1px solid ${borderColor}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map(deal => {
                    const stageLabel = STAGES.find(s => s.key === deal.stage)?.label ?? deal.stage;
                    return (
                      <tr
                        key={deal.id}
                        onClick={() => setSelectedDeal(deal.id)}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '10px 14px', color: textPrimary, fontWeight: 500, borderBottom: `1px solid ${borderColor}` }}>{deal.businessName}</td>
                        <td style={{ padding: '10px 14px', color: textMuted, borderBottom: `1px solid ${borderColor}` }}>{deal.vertical}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${borderColor}` }}><TypeBadge t={deal.productType} /></td>
                        <td style={{ padding: '10px 14px', color: textMuted, borderBottom: `1px solid ${borderColor}` }}>{deal.state}</td>
                        <td style={{ padding: '10px 14px', color: textSecondary, borderBottom: `1px solid ${borderColor}` }}>{stageLabel}</td>
                        <td style={{ padding: '10px 14px', color: deal.wcPremium != null ? textPrimary : textMuted, fontWeight: deal.wcPremium != null ? 600 : 400, borderBottom: `1px solid ${borderColor}` }}>{deal.wcPremium != null ? fmtMoney(deal.wcPremium) : 'Pending'}</td>
                        <td style={{ padding: '10px 14px', color: deal.pepm != null ? textPrimary : textMuted, borderBottom: `1px solid ${borderColor}` }}>{deal.pepm != null ? `$${deal.pepm}/ee` : '—'}</td>
                        <td style={{ padding: '10px 14px', borderBottom: `1px solid ${borderColor}` }}><AppetiteChip a={deal.appetite} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Deal card overlay hint */}
      {selectedDeal && (
        <div
          onClick={() => setSelectedDeal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0b0b0f', border: `1px solid ${borderColor}`, borderRadius: 16, padding: '32px', color: textPrimary, maxWidth: 460, width: '100%', textAlign: 'center' }}
          >
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{MOCK_DEALS.find(d => d.id === selectedDeal)?.businessName}</p>
            <p style={{ color: textMuted, fontSize: 13 }}>Deal card opens here — see DealCard mockup for the full expanded view.</p>
            <button onClick={() => setSelectedDeal(null)} style={{ marginTop: 20, padding: '8px 20px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textMuted, cursor: 'pointer', fontSize: 13 }}>Close</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
