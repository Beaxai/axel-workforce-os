import './_group.css';
import { useState, useEffect } from 'react';
import { AppShell } from './_shared/AppShell';

const bg = '#060608';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';
const accent = '#E91E8C';

type TabKey = 'leads' | 'prospects' | 'clients';

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  'New':            { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  'Working':        { bg: 'rgba(124,58,237,0.15)',  color: '#a78bfa' },
  'Qualified':      { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  'Dead':           { bg: 'rgba(100,100,100,0.15)', color: '#888' },
  'Prospect':       { bg: 'rgba(100,100,100,0.15)', color: '#aaa' },
  'Active Prospect':{ bg: 'rgba(124,58,237,0.15)',  color: '#a78bfa' },
  'New Client':     { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  'Active Client':  { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
};

function Badge({ label, stageKey }: { label: string; stageKey?: string }) {
  const key = stageKey || label;
  const style = STAGE_COLORS[key] || { bg: 'rgba(100,100,100,0.15)', color: '#aaa' };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em',
      background: style.bg, color: style.color,
    }}>{label}</span>
  );
}

const LEADS = [
  { id: '1', companyName: 'Pacific Rim Staffing', contactName: 'Olivia Chen', email: 'ochen@pacrim.com', vertical: 'Staffing', state: 'CA', status: 'Qualified' },
  { id: '2', companyName: 'Nexus Construction LLC', contactName: 'Marcus Webb', email: 'mwebb@nexus.build', vertical: 'Construction', state: 'TX', status: 'Working' },
  { id: '3', companyName: 'GreenLeaf Dispensaries', contactName: 'Sara Patel', email: 'sara@greenleaf.co', vertical: 'Cannabis', state: 'CO', status: 'New' },
  { id: '4', companyName: 'Summit Healthcare Group', contactName: 'Dr. James Park', email: 'jpark@summithcg.com', vertical: 'Healthcare', state: 'FL', status: 'New' },
  { id: '5', companyName: 'Iron Horse Transport', contactName: 'Darnell Rivers', email: 'darnell@ironhorse.com', vertical: 'Transportation', state: 'OH', status: 'Dead' },
];

const PROSPECTS = [
  { id: 'a1', businessName: 'Coastal Roofing Partners', vertical: 'Construction', state: 'FL', annualPayroll: 4200000, headcount: 38, clientStage: 'Active Prospect', lastActivity: '2 days ago' },
  { id: 'a2', businessName: 'Bloom Cannabis Co.', vertical: 'Cannabis', state: 'AZ', annualPayroll: 1850000, headcount: 22, clientStage: 'Prospect', lastActivity: '1 week ago' },
  { id: 'a3', businessName: 'Summit Temp Agency', vertical: 'Staffing', state: 'GA', annualPayroll: 8700000, headcount: 112, clientStage: 'Active Prospect', lastActivity: '3 days ago' },
];

const CLIENTS = [
  { id: 'c1', businessName: 'Metro Health Network', vertical: 'Healthcare', state: 'NY', annualPayroll: 12400000, headcount: 187, clientStage: 'Active Client', lastActivity: 'Today' },
  { id: 'c2', businessName: 'AllPro Construction Inc.', vertical: 'Construction', state: 'TX', annualPayroll: 6900000, headcount: 74, clientStage: 'New Client', lastActivity: 'Yesterday' },
  { id: 'c3', businessName: 'NovaPak Manufacturing', vertical: 'Manufacturing', state: 'MI', annualPayroll: 9200000, headcount: 143, clientStage: 'Active Client', lastActivity: '4 hours ago' },
  { id: 'c4', businessName: 'Harbor Hospitality Group', vertical: 'Hospitality', state: 'CA', annualPayroll: 3800000, headcount: 65, clientStage: 'Active Client', lastActivity: '2 days ago' },
  { id: 'c5', businessName: 'QuickShip Logistics', vertical: 'Transportation', state: 'IL', annualPayroll: 5100000, headcount: 58, clientStage: 'Active Client', lastActivity: '1 hour ago' },
];

function formatPayroll(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function Accounts() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [activeTab, setActiveTab] = useState<TabKey>('leads');
  const [search, setSearch] = useState('');

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'leads',     label: 'Leads',     count: LEADS.length },
    { key: 'prospects', label: 'Prospects', count: PROSPECTS.length },
    { key: 'clients',   label: 'Clients',   count: CLIENTS.length },
  ];

  const filteredLeads = LEADS.filter(l =>
    l.companyName.toLowerCase().includes(search.toLowerCase()) ||
    l.contactName.toLowerCase().includes(search.toLowerCase())
  );
  const filteredProspects = PROSPECTS.filter(a =>
    a.businessName.toLowerCase().includes(search.toLowerCase())
  );
  const filteredClients = CLIENTS.filter(a =>
    a.businessName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell activeNav="Accounts">
      <div style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--app-font-heading)', fontSize: 26, fontWeight: 700, color: textPrimary, margin: '0 0 4px' }}>
              Accounts
            </h1>
            <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
              {LEADS.length + PROSPECTS.length + CLIENTS.length} total · Leads, Prospects &amp; Clients
            </p>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,#7C3AED,${accent})`, color: '#fff', fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Account
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${borderColor}`, marginBottom: 24 }}>
          {tabs.map(t => {
            const isActive = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setSearch(''); }} style={{
                padding: '10px 20px', fontSize: 14, fontWeight: isActive ? 600 : 500,
                color: isActive ? accent : textMuted, background: 'transparent', border: 'none',
                borderBottom: `2px solid ${isActive ? accent : 'transparent'}`,
                marginBottom: -1, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t.label}
                <span style={{
                  marginLeft: 6, fontSize: 11, padding: '2px 7px', borderRadius: 10,
                  background: isActive ? 'rgba(233,30,140,0.15)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? accent : textMuted,
                }}>{t.count}</span>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 400 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: textMuted, fontSize: 14 }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              style={{
                width: '100%', padding: '9px 14px 9px 36px', borderRadius: 8,
                border: `1px solid ${borderColor}`, background: cardBg, color: textPrimary,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: `1px solid ${borderColor}`,
            background: 'transparent', color: textMuted, fontSize: 13, cursor: 'pointer',
          }}>⇅ Sort</button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, border: `1px solid ${borderColor}`,
            background: 'transparent', color: textMuted, fontSize: 13, cursor: 'pointer',
          }}>⊞ Filter</button>
        </div>

        {/* Leads Table */}
        {activeTab === 'leads' && (
          <div style={{ background: cardBg, backdropFilter: 'blur(12px)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 0.6fr 1fr 180px',
              padding: '12px 20px', borderBottom: `1px solid ${borderColor}`,
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted,
            }}>
              <div>Company</div><div>Contact</div><div>Vertical</div><div>State</div><div>Status</div><div />
            </div>
            {filteredLeads.map((l, i) => (
              <div key={l.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 0.6fr 1fr 180px',
                alignItems: 'center', padding: '13px 20px',
                borderBottom: i < filteredLeads.length - 1 ? `1px solid ${borderColor}` : 'none',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(233,30,140,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{l.companyName}</div>
                <div>
                  <div style={{ fontSize: 13, color: textSecondary }}>{l.contactName}</div>
                  <div style={{ fontSize: 12, color: textMuted }}>{l.email}</div>
                </div>
                <div style={{ fontSize: 13, color: textMuted }}>{l.vertical}</div>
                <div style={{ fontSize: 13, color: textMuted }}>{l.state}</div>
                <div><Badge label={l.status} /></div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {l.status !== 'Dead' && (
                    <>
                      <button style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${borderColor}`, background: 'transparent', color: textMuted, fontSize: 12, cursor: 'pointer' }}>Convert</button>
                      <button style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: `linear-gradient(135deg,#7C3AED,${accent})`, color: '#fff', fontSize: 12, cursor: 'pointer' }}>Convert & Start →</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prospects/Clients Table */}
        {(activeTab === 'prospects' || activeTab === 'clients') && (() => {
          const rows = activeTab === 'prospects' ? filteredProspects : filteredClients;
          return (
            <div style={{ background: cardBg, backdropFilter: 'blur(12px)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '2.5fr 1fr 0.6fr 1.2fr 0.8fr 1.2fr 24px',
                padding: '12px 20px', borderBottom: `1px solid ${borderColor}`,
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted,
              }}>
                <div>Company</div><div>Vertical</div><div>State</div><div style={{ textAlign: 'right' }}>Annual Payroll</div><div style={{ textAlign: 'right' }}>Employees</div><div>Stage</div><div />
              </div>
              {rows.map((a, i) => (
                <div key={a.id} style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 1fr 0.6fr 1.2fr 0.8fr 1.2fr 24px',
                  alignItems: 'center', padding: '13px 20px',
                  borderBottom: i < rows.length - 1 ? `1px solid ${borderColor}` : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(233,30,140,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{a.businessName}</div>
                  <div style={{ fontSize: 13, color: textMuted }}>{a.vertical}</div>
                  <div style={{ fontSize: 13, color: textMuted }}>{a.state}</div>
                  <div style={{ fontSize: 13, color: textPrimary, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatPayroll(a.annualPayroll)}</div>
                  <div style={{ fontSize: 13, color: textPrimary, textAlign: 'right' }}>{a.headcount}</div>
                  <div><Badge label={a.clientStage} /></div>
                  <span style={{ color: textMuted, fontSize: 14 }}>›</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </AppShell>
  );
}
