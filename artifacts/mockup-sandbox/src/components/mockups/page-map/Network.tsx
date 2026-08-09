import './_group.css';
import { useState, useEffect } from 'react';
import { AppShell } from './_shared/AppShell';

const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';
const accent = '#E91E8C';

type TabKey = 'Agents' | 'Carriers' | 'PEOs' | 'Vendors';

function Badge({ label, color }: { label: string; color: 'green' | 'yellow' | 'red' | 'gray' | 'blue' }) {
  const palettes = {
    green:  { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
    yellow: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    red:    { bg: 'rgba(239,68,68,0.15)',  color: '#f87171' },
    gray:   { bg: 'rgba(100,100,100,0.15)', color: '#9ca3af' },
    blue:   { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  };
  const p = palettes[color];
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: p.bg, color: p.color }}>{label}</span>;
}

function Avatar({ initials, gradient }: { initials: string; gradient: string }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
      background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--app-font-heading)',
    }}>{initials}</div>
  );
}

const GRADIENTS = [
  'linear-gradient(135deg,#7C3AED,#E91E8C)',
  'linear-gradient(135deg,#0EA5E9,#7C3AED)',
  'linear-gradient(135deg,#10B981,#0EA5E9)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
  'linear-gradient(135deg,#8B5CF6,#EC4899)',
  'linear-gradient(135deg,#06B6D4,#3B82F6)',
];

const AGENTS = [
  { id: 'ag1', name: 'Marcus Webb', agency: 'Apex Insurance Group', states: 'TX, OK, NM', deals: 14, premium: '$284,000', status: 'Active' },
  { id: 'ag2', name: 'Priya Nair', agency: 'Summit Risk Partners', states: 'CA, NV, AZ', deals: 9, premium: '$197,500', status: 'Active' },
  { id: 'ag3', name: 'James Okafor', agency: 'Okafor & Associates', states: 'FL, GA, SC', deals: 6, premium: '$142,000', status: 'Active' },
  { id: 'ag4', name: 'Dana Rossi', agency: 'Blue Ridge Brokerage', states: 'VA, NC, WV', deals: 3, premium: '$58,200', status: 'Pending' },
  { id: 'ag5', name: 'Wei Zhang', agency: 'Pacific Rim Insurance', states: 'WA, OR, CA', deals: 11, premium: '$231,000', status: 'Active' },
  { id: 'ag6', name: 'Carlos Mendez', agency: 'Mendez & Sons Ins.', states: 'TX, LA, MS', deals: 2, premium: '$41,800', status: 'Pending' },
];

const CARRIERS = [
  { id: 'cr1', name: 'Nexus Specialty Insurance', rating: 'A (Excellent)', states: 'CA, FL, TX, NY', policies: 48, totalPremium: '$1.24M', status: 'Active', specialty: 'Cannabis, High-Risk' },
  { id: 'cr2', name: 'Meridian Workers Comp', rating: 'A+ (Superior)', states: 'All States', policies: 127, totalPremium: '$3.87M', status: 'Active', specialty: 'Healthcare, Staffing' },
  { id: 'cr3', name: 'BlueStar Assurance', rating: 'A- (Excellent)', states: 'NY, NJ, CT, PA', policies: 31, totalPremium: '$890,000', status: 'Active', specialty: 'Construction, Hospitality' },
  { id: 'cr4', name: 'Summit Re Group', rating: 'B+ (Good)', states: 'TX, OK, AR, LA', policies: 19, totalPremium: '$412,000', status: 'Active', specialty: 'Manufacturing, Retail' },
  { id: 'cr5', name: 'Pacific Indemnity Corp', rating: 'A (Excellent)', states: 'CA, WA, OR, AK', policies: 22, totalPremium: '$678,000', status: 'Active', specialty: 'Transportation, Logistics' },
  { id: 'cr6', name: 'Keystone Specialty Group', rating: 'A- (Excellent)', states: 'PA, OH, MI, IN', policies: 9, totalPremium: '$198,000', status: 'Pending', specialty: 'All Verticals' },
];

const PEOS = [
  { id: 'p1', name: 'Titanium PEO Solutions', program: 'WorkForce Prime', verticals: 'Healthcare, Staffing', clients: 34, discount: '12%', status: 'Active' },
  { id: 'p2', name: 'AllStaff PEO Group', program: 'AllStaff Complete', verticals: 'Construction, Manufacturing', clients: 21, discount: '10%', status: 'Active' },
  { id: 'p3', name: 'Zenith Employer Services', program: 'ZES Advantage', verticals: 'Retail, Hospitality', clients: 16, discount: '8%', status: 'Active' },
  { id: 'p4', name: 'Pathway HR Partners', program: 'PathPEO', verticals: 'All Verticals', clients: 8, discount: '9%', status: 'Pending' },
];

const VENDORS = [
  { id: 'v1', name: 'DocuSafe Compliance', category: 'Compliance & HR Tools', contact: 'Karen Hill', email: 'khill@docusafe.com', status: 'Active' },
  { id: 'v2', name: 'SafetyPro Training', category: 'Safety & Training', contact: 'Thomas Grant', email: 'tgrant@safetypro.com', status: 'Active' },
  { id: 'v3', name: 'PayAxis Payroll', category: 'Payroll Technology', contact: 'Maria Santos', email: 'msantos@payaxis.io', status: 'Active' },
  { id: 'v4', name: 'RiskView Analytics', category: 'Risk Intelligence', contact: 'Dev Chopra', email: 'dev@riskview.ai', status: 'Active' },
];

export function Network() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [activeTab, setActiveTab] = useState<TabKey>('Agents');
  const [search, setSearch] = useState('');

  const tabs: TabKey[] = ['Agents', 'Carriers', 'PEOs', 'Vendors'];

  const tabCounts: Record<TabKey, number> = {
    Agents: AGENTS.length, Carriers: CARRIERS.length, PEOs: PEOS.length, Vendors: VENDORS.length,
  };

  const totalPartners = AGENTS.length + CARRIERS.length + PEOS.length + VENDORS.length;

  const filterSearch = (name: string) => name.toLowerCase().includes(search.toLowerCase());

  return (
    <AppShell activeNav="Network">
      <div style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--app-font-heading)', fontSize: 26, fontWeight: 700, color: textPrimary, margin: '0 0 4px' }}>
              Network
            </h1>
            <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
              {totalPartners} total partners · Agents, Carriers, PEOs &amp; Vendors
            </p>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,#7C3AED,${accent})`, color: '#fff', fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ fontSize: 16 }}>+</span> Add Partner
          </button>
        </div>

        {/* Tab Pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {tabs.map(t => {
            const isActive = activeTab === t;
            return (
              <button key={t} onClick={() => { setActiveTab(t); setSearch(''); }} style={{
                padding: '8px 18px', borderRadius: 8, border: `1px solid ${isActive ? accent : borderColor}`,
                background: isActive ? 'rgba(233,30,140,0.12)' : 'rgba(255,255,255,0.04)',
                color: isActive ? accent : textMuted, fontSize: 13, fontWeight: isActive ? 600 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t}
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({tabCounts[t]})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 360, marginBottom: 24 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: textMuted, fontSize: 14 }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            style={{
              width: '100%', padding: '9px 14px 9px 36px', borderRadius: 8, boxSizing: 'border-box',
              border: `1px solid ${borderColor}`, background: cardBg, color: textPrimary, fontSize: 14, outline: 'none',
            }}
          />
        </div>

        {/* Agents Grid */}
        {activeTab === 'Agents' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {AGENTS.filter(a => filterSearch(a.name) || filterSearch(a.agency)).map((a, i) => (
              <div key={a.id} style={{
                background: cardBg, backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(233,30,140,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={a.name.split(' ').map(n => n[0]).join('')} gradient={GRADIENTS[i % GRADIENTS.length]} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: textMuted }}>{a.agency}</div>
                    </div>
                  </div>
                  <Badge label={a.status} color={a.status === 'Active' ? 'green' : 'yellow'} />
                </div>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 12 }}>📍 {a.states}</div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deals</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>{a.deals}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>WC Premium</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>{a.premium}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Carriers Grid */}
        {activeTab === 'Carriers' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {CARRIERS.filter(c => filterSearch(c.name)).map((c, i) => (
              <div key={c.id} style={{
                background: cardBg, backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(233,30,140,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={c.name.split(' ').map(n => n[0]).join('').slice(0, 2)} gradient={GRADIENTS[(i + 2) % GRADIENTS.length]} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: textMuted }}>AM Best: {c.rating}</div>
                    </div>
                  </div>
                  <Badge label={c.status} color={c.status === 'Active' ? 'green' : 'yellow'} />
                </div>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>🗺 {c.states}</div>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 12 }}>🎯 {c.specialty}</div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Policies</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>{c.policies}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Premium</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>{c.totalPremium}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PEOs Grid */}
        {activeTab === 'PEOs' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {PEOS.filter(p => filterSearch(p.name)).map((p, i) => (
              <div key={p.id} style={{
                background: cardBg, backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(233,30,140,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={p.name.split(' ').map(n => n[0]).join('').slice(0, 2)} gradient={GRADIENTS[(i + 1) % GRADIENTS.length]} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: textMuted }}>{p.program}</div>
                    </div>
                  </div>
                  <Badge label={p.status} color={p.status === 'Active' ? 'green' : 'yellow'} />
                </div>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 12 }}>🏢 {p.verticals}</div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Clients</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary }}>{p.clients}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>WC Discount</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#34d399' }}>{p.discount}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Vendors Grid */}
        {activeTab === 'Vendors' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {VENDORS.filter(v => filterSearch(v.name)).map((v, i) => (
              <div key={v.id} style={{
                background: cardBg, backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar initials={v.name.split(' ').map(n => n[0]).join('').slice(0, 2)} gradient={GRADIENTS[(i + 3) % GRADIENTS.length]} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: textMuted }}>{v.category}</div>
                    </div>
                  </div>
                  <Badge label={v.status} color="green" />
                </div>
                <div style={{ fontSize: 12, color: textSecondary }}>{v.contact}</div>
                <div style={{ fontSize: 12, color: textMuted }}>{v.email}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
