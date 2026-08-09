import './_group.css';
import { useState, useEffect } from 'react';
import { AppShell } from './_shared/AppShell';

const accent = '#E91E8C';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';
const bg = '#060608';

// ── Icons (inline SVG helpers) ──────────────────────────────────────────────
function Icon({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Deal mock data ──────────────────────────────────────────────────────────
const DEAL = {
  id: 'deal-11',
  ref: 'AX-1Q2R-ST3S',
  businessName: 'Riverside Healthcare',
  vertical: 'Healthcare',
  productType: 'WC' as const,
  state: 'PA',
  stage: 'INDICATION',
  wcPremium: 287500,
  pepm: null as number | null,
  locations: 6,
  employees: 180,
  payroll: 9000000,
  exMod: 0.89,
  effectiveDate: 'Jan 1, 2026',
  appetite: 'Acceptable',
  team: [
    { initials: 'JT', name: 'James Torres', role: 'Broker', color: '#0EA5E9' },
    { initials: 'AL', name: 'Amy Lin', role: 'Underwriter', color: '#7C3AED' },
    { initials: 'KS', name: 'Kevin Shah', role: 'CSA', color: '#E91E8C' },
  ],
};

const PHASES = ['Prospect', 'Qualified', 'Proposal', 'Indication', 'Negotiation', 'Bind', 'Bound', 'Impl.'];
const CURRENT_PHASE = 3; // Indication

const ACTIVITY = [
  { id: 'a1', type: 'STAGE_CHANGE', author: 'James Torres', time: '2h ago', text: 'Moved deal to Indication stage', avatar: 'JT', color: '#0EA5E9' },
  { id: 'a2', type: 'MESSAGE', author: 'Amy Lin', time: '5h ago', text: 'Reviewed workforce profile. ExMod of 0.89 looks strong — proceeding with rating.', avatar: 'AL', color: '#7C3AED' },
  { id: 'a3', type: 'QUOTE_UPDATED', author: 'System', time: '6h ago', text: 'WC indication generated: $287,500 annual premium', avatar: '⚡', color: accent },
  { id: 'a4', type: 'RFI', author: 'Amy Lin', time: '1d ago', text: 'RFI created: Need prior carrier loss runs for 2022-2024', avatar: 'AL', color: '#7C3AED' },
  { id: 'a5', type: 'MESSAGE', author: 'James Torres', time: '1d ago', text: 'Client confirmed 6 active locations in PA. Workforce profile updated with class codes.', avatar: 'JT', color: '#0EA5E9' },
  { id: 'a6', type: 'DEAL_CREATED', author: 'Kevin Shah', time: '3d ago', text: 'Deal created for Riverside Healthcare', avatar: 'KS', color: '#E91E8C' },
];

const SUBMISSION_SECTIONS = [
  { key: 'company', label: 'Company Info', complete: true, fields: [
    { label: 'Business Name', value: 'Riverside Healthcare' },
    { label: 'FEIN', value: '84-3921047' },
    { label: 'Entity Type', value: 'LLC' },
    { label: 'Years in Business', value: '12' },
    { label: 'State', value: 'PA' },
  ]},
  { key: 'locations', label: 'Locations', complete: true, fields: [
    { label: 'Number of Locations', value: '6' },
    { label: 'Primary State', value: 'PA' },
    { label: 'States of Operation', value: 'PA, NJ, DE' },
  ]},
  { key: 'workforce', label: 'Workforce', complete: true, fields: [
    { label: 'Full-Time Employees', value: '180' },
    { label: 'Annual Payroll', value: '$9,000,000' },
    { label: 'Experience Mod (ExMod)', value: '0.89' },
    { label: 'Primary Class Code', value: '8829 – Hospital Prof' },
  ]},
  { key: 'coverage', label: 'Coverage', complete: false, fields: [
    { label: 'Coverage Type', value: 'WC Only' },
    { label: 'Effective Date', value: 'Jan 1, 2026' },
    { label: 'Prior Carrier', value: '—' },
    { label: 'Loss Runs', value: 'Pending' },
  ]},
  { key: 'contacts', label: 'Contacts', complete: true, fields: [
    { label: 'Primary Contact', value: 'Sarah Nguyen' },
    { label: 'Email', value: 'snguyen@riverside.health' },
    { label: 'Phone', value: '(215) 555-0147' },
  ]},
];

const RFIS = [
  { id: 'r1', question: 'Please provide loss runs for 2022–2024', status: 'OPEN', blocking: true, author: 'Amy Lin', time: '1d ago' },
  { id: 'r2', question: 'Confirm number of part-time employees for Location 4 (Scranton)', status: 'RESOLVED', blocking: false, author: 'Amy Lin', time: '2d ago' },
];

const DOCUMENTS = [
  { id: 'd1', name: 'ACORD 130 Application.pdf', size: '1.2 MB', uploadedBy: 'James Torres', time: '1d ago', icon: '📄' },
  { id: 'd2', name: 'Workforce Profile Export.xlsx', size: '84 KB', uploadedBy: 'Kevin Shah', time: '2d ago', icon: '📊' },
  { id: 'd3', name: 'Certificate of Insurance 2024.pdf', size: '340 KB', uploadedBy: 'James Torres', time: '3d ago', icon: '📄' },
];

type TabKey = 'overview' | 'submission' | 'subjectivities' | 'documents' | 'quote' | 'policy';

const NAV_ITEMS: Array<{ key: TabKey; label: string; iconPath: string }> = [
  { key: 'overview', label: 'Overview', iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { key: 'submission', label: 'Submission', iconPath: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 1 1 0 4H9a2 2 0 0 1-2-2z' },
  { key: 'subjectivities', label: 'Subjectivities', iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { key: 'documents', label: 'Documents', iconPath: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { key: 'quote', label: 'Quote', iconPath: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { key: 'policy', label: 'Policy', iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [message, setMessage] = useState('');
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Activity feed */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', fontFamily: 'var(--app-font-heading)' }}>Activity Feed</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {ACTIVITY.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${a.color}20`, border: `1.5px solid ${a.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: a.color, flexShrink: 0 }}>
                {a.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>{a.author}</span>
                  <span style={{ fontSize: 11, color: textMuted }}>{a.time}</span>
                </div>
                <p style={{ fontSize: 12, color: textSecondary, margin: 0, lineHeight: 1.5 }}>{a.text}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Message box */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 12 }}>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Add a comment or note…"
            rows={3}
            style={{ width: '100%', background: 'transparent', border: 'none', color: textPrimary, fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'var(--app-font-sans)', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={{ padding: '6px 16px', borderRadius: 7, background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      </div>

      {/* RFI panel */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', fontFamily: 'var(--app-font-heading)' }}>Open RFIs</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RFIS.map(r => (
            <div key={r.id} style={{ background: cardBg, border: `1px solid ${r.status === 'OPEN' ? 'rgba(245,158,11,0.25)' : borderColor}`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: r.status === 'OPEN' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.1)', color: r.status === 'OPEN' ? '#f59e0b' : '#22c55e', border: `1px solid ${r.status === 'OPEN' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.25)'}`, whiteSpace: 'nowrap' }}>{r.status}</span>
                {r.blocking && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>BLOCKING</span>}
              </div>
              <p style={{ fontSize: 12, color: textSecondary, margin: '0 0 4px', lineHeight: 1.4 }}>{r.question}</p>
              <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{r.author} · {r.time}</p>
            </div>
          ))}
        </div>
        <button style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 7, border: `1px dashed ${borderColor}`, background: 'transparent', color: textMuted, fontSize: 12, cursor: 'pointer' }}>+ Create RFI</button>
      </div>
    </div>
  );
}

// ── Submission Tab ────────────────────────────────────────────────────────────
function SubmissionTab() {
  const complete = SUBMISSION_SECTIONS.filter(s => s.complete).length;
  const total = SUBMISSION_SECTIONS.length;
  const pct = Math.round((complete / total) * 100);
  return (
    <div>
      {/* Progress */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>Submission Completeness</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: accent }}>{pct}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 9999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#7C3AED,#E91E8C)', borderRadius: 9999 }} />
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: 'var(--app-font-heading)' }}>{complete}/{total}</div>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SUBMISSION_SECTIONS.map(section => (
          <div key={section.key} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: section.complete ? 10 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: section.complete ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.1)', border: `1px solid ${section.complete ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.3)'}`, fontSize: 10, color: section.complete ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>
                  {section.complete ? '✓' : '!'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{section.label}</span>
              </div>
              <button style={{ fontSize: 11, color: accent, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Edit →</button>
            </div>
            {section.complete && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px 16px' }}>
                {section.fields.map(f => (
                  <div key={f.label}>
                    <p style={{ fontSize: 10, color: textMuted, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, fontFamily: 'var(--app-font-heading)' }}>{f.label}</p>
                    <p style={{ fontSize: 12, color: textSecondary, margin: 0 }}>{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────
function DocumentsTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0, fontFamily: 'var(--app-font-heading)' }}>Files ({DOCUMENTS.length})</p>
        <button style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${borderColor}`, background: 'transparent', color: textMuted, fontSize: 12, cursor: 'pointer' }}>Upload</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {DOCUMENTS.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 9, padding: '10px 14px', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(233,30,140,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = borderColor; }}
          >
            <span style={{ fontSize: 20 }}>{d.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: textPrimary, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
              <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{d.size} · {d.uploadedBy} · {d.time}</p>
            </div>
            <button style={{ background: 'transparent', border: 'none', color: textMuted, cursor: 'pointer', fontSize: 12 }}>↓</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quote Tab ─────────────────────────────────────────────────────────────────
function QuoteTab() {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {/* WC Pricing card */}
      <div style={{ background: cardBg, border: `1px solid rgba(233,30,140,0.2)`, borderRadius: 12, padding: 16, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(233,30,140,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>WC Indication</span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--app-font-heading)' }}>Annual Premium</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: accent, margin: 0, fontFamily: 'var(--app-font-heading)' }}>$287,500</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[{ label: 'Base Rate', value: '$247,000' }, { label: 'ExMod Adj.', value: '× 0.89' }, { label: 'Schedule Mod', value: '+ $28,500' }, { label: 'Expense Load', value: '18%' }].map(i => (
            <div key={i.label}>
              <p style={{ fontSize: 10, color: textMuted, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, fontFamily: 'var(--app-font-heading)' }}>{i.label}</p>
              <p style={{ fontSize: 13, color: textSecondary, fontWeight: 600, margin: 0 }}>{i.value}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve Indication</button>
          <button style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${borderColor}`, color: textMuted, fontSize: 12, cursor: 'pointer' }}>Decline</button>
        </div>
      </div>

      {/* Rate breakdown */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px', fontFamily: 'var(--app-font-heading)' }}>Rate Breakdown</p>
        {[
          { code: '8829', desc: 'Hospital Professional', rate: '$4.82', payroll: '$5.8M', premium: '$185,400' },
          { code: '8825', desc: 'Medical Clinics', rate: '$3.91', payroll: '$2.4M', premium: '$78,200' },
          { code: '8810', desc: 'Clerical Office', rate: '$0.49', payroll: '$0.8M', premium: '$23,900' },
        ].map(r => (
          <div key={r.code} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: accent, fontWeight: 600 }}>{r.code}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>{r.premium}</span>
            </div>
            <p style={{ fontSize: 10, color: textMuted, margin: '0 0 2px' }}>{r.desc}</p>
            <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>Rate {r.rate} · Payroll {r.payroll}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Policy Tab ────────────────────────────────────────────────────────────────
function PolicyTab() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: '0 0 8px' }}>Policy Not Yet Issued</p>
      <p style={{ fontSize: 13, color: textMuted }}>Policy documentation will appear here once the deal reaches Bound stage.</p>
    </div>
  );
}

// ── Subjectivities Tab ────────────────────────────────────────────────────────
function SubjectivitiesTab() {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', fontFamily: 'var(--app-font-heading)' }}>Bind Subjectivities</p>
      <div style={{ textAlign: 'center', padding: '30px 20px', color: textMuted, fontSize: 13 }}>
        Subjectivities will be auto-generated when the deal reaches the Bind Order stage.
      </div>
    </div>
  );
}

// ── Main DealCard component ───────────────────────────────────────────────────
export function DealCard() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [tab, setTab] = useState<TabKey>('overview');
  const [taskOpen, setTaskOpen] = useState(false);

  return (
    <AppShell activeNav="Pipeline">
      {/* Blurred pipeline background hint */}
      <div style={{ position: 'relative', height: '100%' }}>
        {/* Simulated blurred pipeline rows */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.18, filter: 'blur(3px)', pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 10, padding: '0', height: '100%' }}>
            {['Prospect', 'Qualified', 'Proposal', 'Indication', 'Negotiation'].map(s => (
              <div key={s} style={{ minWidth: 200, background: cardBg, borderRadius: 12, border: `1px solid ${borderColor}`, padding: 8, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: textMuted, marginBottom: 8 }}>{s}</div>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 72, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 6, border: `1px solid ${borderColor}` }} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Overlay backdrop */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          {/* Deal card modal */}
          <div
            style={{
              width: '100%',
              maxWidth: 1020,
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#0b0b0f',
              border: `1px solid ${borderColor}`,
              borderRadius: 16,
              overflow: 'hidden',
              fontFamily: 'var(--app-font-sans)',
              boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
            }}
          >
            {/* ── Header with map-style gradient + KPIs ────────────────────── */}
            <div style={{ position: 'relative', minHeight: 230, flexShrink: 0, borderBottom: `1px solid ${borderColor}`, overflow: 'hidden', background: '#08080c' }}>
              {/* Map-style gradient overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(6,6,8,0.92) 0%, rgba(6,6,8,0.6) 45%, rgba(6,6,8,0.08) 100%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(270deg, rgba(6,6,8,0.78) 0%, rgba(6,6,8,0.3) 38%, rgba(6,6,8,0) 60%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(6,6,8,0.88) 0%, rgba(6,6,8,0.35) 28%, rgba(6,6,8,0) 50%)' }} />

              {/* Decorative US map silhouette hint */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
                <svg viewBox="0 0 800 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                  <rect x="60" y="80" width="680" height="240" rx="20" fill="rgba(255,255,255,0.3)" />
                  <circle cx="230" cy="160" r="6" fill={accent} />
                  <circle cx="320" cy="170" r="5" fill={accent} />
                  <circle cx="270" cy="190" r="4" fill={accent} />
                  <circle cx="350" cy="145" r="5" fill={accent} />
                  <circle cx="200" cy="200" r="4" fill={accent} />
                  <circle cx="420" cy="155" r="7" fill={accent} />
                </svg>
              </div>

              {/* Location dots */}
              {[{ x: 68, y: 38 }, { x: 52, y: 55 }, { x: 60, y: 47 }, { x: 74, y: 52 }, { x: 56, y: 42 }, { x: 65, y: 60 }].map((pos, i) => (
                <div key={i} style={{ position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, width: 10, height: 10, borderRadius: '50%', background: accent, boxShadow: `0 0 14px ${accent}80, 0 0 0 3px ${accent}25`, transform: 'translate(-50%,-50%)' }} />
              ))}

              {/* Identity + KPIs row */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 18px 0', flexWrap: 'wrap', gap: 12 }}>
                {/* Left: identity */}
                <div style={{ flex: '1 1 260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.75"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: textPrimary, margin: 0 }}>{DEAL.businessName}</h2>
                    {/* Team avatars */}
                    <div style={{ display: 'flex', marginLeft: 4 }}>
                      {DEAL.team.map((m, i) => (
                        <div key={m.initials} style={{ width: 30, height: 30, borderRadius: '50%', background: `${m.color}20`, border: `2px solid ${m.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: m.color, marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i, position: 'relative' }} title={`${m.name} · ${m.role}`}>
                          {m.initials}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Healthcare', 'WC', 'PA'].map(b => (
                      <span key={b} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: cardBg, color: textMuted, border: `1px solid ${borderColor}` }}>{b}</span>
                    ))}
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'rgba(233,30,140,0.1)', color: accent, border: '1px solid rgba(233,30,140,0.3)', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      Effective {DEAL.effectiveDate}
                    </span>
                  </div>
                </div>

                {/* Right: KPIs + close */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22 }}>
                  {[
                    { label: 'LOCATIONS', value: String(DEAL.locations) },
                    { label: 'EMPLOYEES', value: String(DEAL.employees) },
                    { label: 'PAYROLL', value: fmtMoney(DEAL.payroll) },
                    { label: 'EXMOD', value: DEAL.exMod?.toFixed(2) ?? '—', dot: '#00D68F' },
                  ].map(kpi => (
                    <div key={kpi.label} style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px', fontFamily: 'var(--app-font-heading)' }}>{kpi.label}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                        <p style={{ fontSize: 22, fontWeight: 600, color: kpi.label === 'EXMOD' ? textPrimary : accent, margin: 0, lineHeight: 1, fontFamily: 'var(--app-font-heading)' }}>{kpi.value}</p>
                        {kpi.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: kpi.dot, boxShadow: `0 0 8px ${kpi.dot}88`, display: 'block', flexShrink: 0 }} />}
                      </div>
                    </div>
                  ))}
                  <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textMuted, padding: 2, marginTop: 2 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              {/* Premium badge */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', padding: '8px 44px 0 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'rgba(233,30,140,0.12)', border: '1px solid rgba(233,30,140,0.3)', borderRadius: 8, backdropFilter: 'blur(8px)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>$287,500</p>
                    <p style={{ fontSize: 9, color: textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>wc annual premium</p>
                  </div>
                </div>
              </div>

              {/* Phase tracker */}
              <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', padding: '12px 18px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  {PHASES.map((label, i) => {
                    const done = i < CURRENT_PHASE;
                    const current = i === CURRENT_PHASE;
                    const nodeColor = current ? '#fff' : done ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)';
                    const lblColor = current ? '#fff' : done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)';
                    return (
                      <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: 'pointer' }}>
                        {i > 0 && (
                          <div style={{ position: 'absolute', top: 5, left: '-50%', width: '100%', height: 2, background: i <= CURRENT_PHASE ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)' }} />
                        )}
                        <span style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${nodeColor}`, background: done ? 'rgba(255,255,255,0.5)' : 'transparent', position: 'relative', zIndex: 1, boxShadow: current ? '0 0 10px rgba(255,255,255,0.65), 0 0 0 4px rgba(255,255,255,0.1)' : 'none', display: 'block' }} />
                        <span style={{ fontSize: 9, marginTop: 7, color: lblColor, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              {/* Left nav */}
              <div style={{ width: 130, flexShrink: 0, borderRight: `1px solid ${borderColor}`, padding: '10px 0', overflowY: 'auto' }}>
                {NAV_ITEMS.map(({ key, label, iconPath }) => {
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: active ? 'rgba(233,30,140,0.08)' : 'transparent', border: 'none', borderLeft: `2px solid ${active ? accent : 'transparent'}`, color: active ? textPrimary : textMuted, fontFamily: 'inherit', fontSize: 12, padding: '8px 14px', cursor: 'pointer', transition: 'all 0.12s' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? accent : textMuted} strokeWidth="1.75">
                        <path d={iconPath} />
                      </svg>
                      {label}
                    </button>
                  );
                })}

                {/* Tasks button */}
                <div style={{ marginTop: 16, borderTop: `1px solid ${borderColor}`, paddingTop: 10 }}>
                  <button
                    onClick={() => setTaskOpen(!taskOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: taskOpen ? 'rgba(124,58,237,0.1)' : 'transparent', border: 'none', borderLeft: `2px solid ${taskOpen ? '#7C3AED' : 'transparent'}`, color: taskOpen ? textPrimary : textMuted, fontFamily: 'inherit', fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={taskOpen ? '#7C3AED' : textMuted} strokeWidth="1.75"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    Tasks
                    <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', fontWeight: 600 }}>2</span>
                  </button>
                </div>
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 14 }}>
                {tab === 'overview' && <OverviewTab />}
                {tab === 'submission' && <SubmissionTab />}
                {tab === 'subjectivities' && <SubjectivitiesTab />}
                {tab === 'documents' && <DocumentsTab />}
                {tab === 'quote' && <QuoteTab />}
                {tab === 'policy' && <PolicyTab />}
              </div>

              {/* Task drawer (right side) */}
              {taskOpen && (
                <div style={{ width: 210, flexShrink: 0, borderLeft: `1px solid ${borderColor}`, padding: '12px 10px', overflowY: 'auto', background: 'rgba(0,0,0,0.15)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px', fontFamily: 'var(--app-font-heading)' }}>Tasks</p>
                  {[
                    { label: 'Collect loss run documents', due: 'Due today', done: false, priority: 'High' },
                    { label: 'Confirm effective date with client', due: 'Due Dec 15', done: false, priority: 'Medium' },
                    { label: 'Send ACORD application', due: 'Completed', done: true, priority: 'Low' },
                  ].map((task, i) => (
                    <div key={i} style={{ background: cardBg, border: `1px solid ${task.done ? 'rgba(34,197,94,0.15)' : borderColor}`, borderRadius: 8, padding: '9px 10px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                        <span style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${task.done ? '#22c55e' : borderColor}`, background: task.done ? 'rgba(34,197,94,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 9, color: '#22c55e' }}>
                          {task.done ? '✓' : ''}
                        </span>
                        <div>
                          <p style={{ fontSize: 12, color: task.done ? textMuted : textPrimary, margin: '0 0 3px', lineHeight: 1.3, textDecoration: task.done ? 'line-through' : 'none' }}>{task.label}</p>
                          <p style={{ fontSize: 10, color: task.done ? 'rgba(34,197,94,0.7)' : textMuted, margin: 0 }}>{task.due}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button style={{ width: '100%', padding: '7px', borderRadius: 7, border: `1px dashed ${borderColor}`, background: 'transparent', color: textMuted, fontSize: 11, cursor: 'pointer', marginTop: 4 }}>+ Add task</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
