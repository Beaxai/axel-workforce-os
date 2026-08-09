import { useEffect, useState } from 'react';
import './_group.css';
import { AppShell } from './_shared/AppShell';
import { Plus, MoreHorizontal, CheckCircle, Circle, Pencil, Trash2 } from 'lucide-react';

const accent = '#E91E8C';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';

const TEMPLATES = [
  { id: '1', name: 'WC Standard Onboarding', type: 'ONBOARDING', product: 'WC', steps: 8, active: true, modified: 'Dec 18, 2024', version: 3 },
  { id: '2', name: 'PEO Full Implementation', type: 'IMPLEMENTATION', product: 'PEO', steps: 14, active: true, modified: 'Dec 15, 2024', version: 5 },
  { id: '3', name: 'WC Express Onboarding', type: 'ONBOARDING', product: 'WC', steps: 5, active: true, modified: 'Dec 10, 2024', version: 2 },
  { id: '4', name: 'ASO Implementation', type: 'IMPLEMENTATION', product: 'ASO', steps: 11, active: false, modified: 'Nov 28, 2024', version: 1 },
  { id: '5', name: 'PEO Rapid Onboarding', type: 'ONBOARDING', product: 'PEO', steps: 7, active: true, modified: 'Nov 20, 2024', version: 4 },
  { id: '6', name: 'Multi-State WC Rollout', type: 'IMPLEMENTATION', product: 'WC', steps: 18, active: false, modified: 'Oct 31, 2024', version: 2 },
  { id: '7', name: 'Universal Onboarding Template', type: 'ONBOARDING', product: 'ANY', steps: 6, active: true, modified: 'Oct 15, 2024', version: 1 },
];

const TYPE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  IMPLEMENTATION: { bg: 'rgba(124,58,237,0.12)', color: '#7C3AED', label: 'Implementation' },
  ONBOARDING:     { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Onboarding' },
};

const PRODUCT_CONFIG: Record<string, { bg: string; color: string }> = {
  WC:  { bg: 'rgba(233,30,140,0.10)', color: accent },
  PEO: { bg: 'rgba(124,58,237,0.10)', color: '#7C3AED' },
  ASO: { bg: 'rgba(14,165,233,0.10)', color: '#0EA5E9' },
  ANY: { bg: 'rgba(107,114,128,0.10)', color: '#9ca3af' },
};

const FILTER_TABS = ['All', 'WC', 'PEO', 'ASO', 'ANY'];
const TYPE_TABS = ['All Types', 'IMPLEMENTATION', 'ONBOARDING'];
const STATUS_TABS = ['Any Status', 'Active', 'Inactive'];

export function JourneyTemplates() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [productFilter, setProductFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('Any Status');

  const filtered = TEMPLATES.filter((t) => {
    const matchProduct = productFilter === 'All' || t.product === productFilter;
    const matchType = typeFilter === 'All Types' || t.type === typeFilter;
    const matchStatus = statusFilter === 'Any Status' ||
      (statusFilter === 'Active' && t.active) ||
      (statusFilter === 'Inactive' && !t.active);
    return matchProduct && matchType && matchStatus;
  });

  const thS = {
    textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const,
    letterSpacing: '0.04em', color: textMuted, padding: '10px 14px',
    borderBottom: `1px solid ${borderColor}`, whiteSpace: 'nowrap' as const,
  };
  const tdS = { fontSize: '13px', color: textSecondary, padding: '13px 14px', borderBottom: 'rgba(255,255,255,0.04)' };

  return (
    <AppShell activeNav="Journeys">
      <div style={{ maxWidth: '1100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>Journey Playbooks</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: textMuted }}>Templates that drive implementation and onboarding journeys when deals bind</p>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px',
            borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff',
          }}>
            <Plus size={15} /> New Template
          </button>
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {FILTER_TABS.map((t) => (
              <button key={t} onClick={() => setProductFilter(t)} style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                border: `1px solid ${productFilter === t ? accent : borderColor}`,
                background: productFilter === t ? 'rgba(233,30,140,0.12)' : 'transparent',
                color: productFilter === t ? accent : textMuted, cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
          <div style={{ width: '1px', height: '20px', background: borderColor }} />
          <div style={{ display: 'flex', gap: '6px' }}>
            {TYPE_TABS.map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                border: `1px solid ${typeFilter === t ? '#7C3AED' : borderColor}`,
                background: typeFilter === t ? 'rgba(124,58,237,0.12)' : 'transparent',
                color: typeFilter === t ? '#7C3AED' : textMuted, cursor: 'pointer',
              }}>{t === 'All Types' ? t : (TYPE_CONFIG[t]?.label || t)}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {STATUS_TABS.map((t) => (
              <button key={t} onClick={() => setStatusFilter(t)} style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                border: `1px solid ${statusFilter === t ? '#22c55e' : borderColor}`,
                background: statusFilter === t ? 'rgba(34,197,94,0.10)' : 'transparent',
                color: statusFilter === t ? '#22c55e' : textMuted, cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Template Name</th>
                <th style={thS}>Type</th>
                <th style={thS}>Product</th>
                <th style={{ ...thS, textAlign: 'center' }}>Steps</th>
                <th style={thS}>Status</th>
                <th style={thS}>Last Modified</th>
                <th style={thS}>Ver</th>
                <th style={{ ...thS, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const tc = TYPE_CONFIG[t.type] || { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', label: t.type };
                const pc = PRODUCT_CONFIG[t.product] || { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' };
                return (
                  <tr key={t.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdS, fontWeight: 600, color: textPrimary }}>{t.name}</td>
                    <td style={tdS}>
                      <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: tc.bg, color: tc.color }}>{tc.label}</span>
                    </td>
                    <td style={tdS}>
                      <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: pc.bg, color: pc.color }}>{t.product}</span>
                    </td>
                    <td style={{ ...tdS, textAlign: 'center', color: textPrimary, fontWeight: 600 }}>{t.steps}</td>
                    <td style={tdS}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t.active
                          ? <CheckCircle size={14} style={{ color: '#22c55e' }} />
                          : <Circle size={14} style={{ color: '#6b7280' }} />
                        }
                        <span style={{ fontSize: '12.5px', color: t.active ? '#22c55e' : '#6b7280', fontWeight: 500 }}>
                          {t.active ? 'Active' : 'Draft'}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...tdS, color: textMuted }}>{t.modified}</td>
                    <td style={{ ...tdS, color: textMuted }}>v{t.version}</td>
                    <td style={{ ...tdS, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button title="Edit" style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px' }}><Pencil size={13} /></button>
                        <button title="Delete" style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px' }}><Trash2 size={13} /></button>
                        <button title="More" style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px' }}><MoreHorizontal size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: textMuted, fontSize: '14px', margin: 0 }}>No templates match. Create one with "New Template".</p>
            </div>
          )}
        </div>

        {/* Footer summary */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '20px' }}>
          <span style={{ fontSize: '12px', color: textMuted }}>{filtered.length} template{filtered.length !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: '12px', color: textMuted }}>•</span>
          <span style={{ fontSize: '12px', color: textMuted }}>{filtered.filter((t) => t.active).length} active</span>
        </div>
      </div>
    </AppShell>
  );
}
