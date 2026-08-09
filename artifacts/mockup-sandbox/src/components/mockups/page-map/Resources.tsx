import { useEffect, useState } from 'react';
import './_group.css';
import { AppShell } from './_shared/AppShell';
import { Search, Plus, FileText, Table, Video, Link as LinkIcon, BookOpen, Download, Eye } from 'lucide-react';

const accent = '#E91E8C';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';

const CATEGORIES = ['All', 'Training', 'Forms', 'Templates', 'Compliance', 'Guides'];

const RESOURCES = [
  { id: '1', title: 'WC Underwriting Guidelines', category: 'Guides', type: 'doc', size: '2.4 MB', description: 'Comprehensive underwriting standards for workers\u2019 compensation across all covered states.', icon: FileText },
  { id: '2', title: 'Employee Onboarding Checklist', category: 'Templates', type: 'spreadsheet', size: '180 KB', description: 'Step-by-step checklist for onboarding new employees under a PEO arrangement.', icon: Table },
  { id: '3', title: 'OSHA Compliance Training', category: 'Training', type: 'video', size: '94 MB', description: 'Mandatory safety training module covering OSHA 300 log requirements and reporting.', icon: Video },
  { id: '4', title: 'Audit Request Form', category: 'Forms', type: 'doc', size: '340 KB', description: 'Standard form used to request a premium audit from the carrier.', icon: FileText },
  { id: '5', title: 'Class Code Reference Sheet', category: 'Guides', type: 'spreadsheet', size: '1.1 MB', description: 'Master list of NCCI class codes with descriptions and industry groupings.', icon: Table },
  { id: '6', title: 'Employee Injury Report Form', category: 'Forms', type: 'doc', size: '210 KB', description: 'Form completed by employees or supervisors after a workplace incident.', icon: FileText },
  { id: '7', title: 'HIPAA Privacy Policy Template', category: 'Compliance', type: 'doc', size: '420 KB', description: 'Editable HIPAA-compliant privacy policy template for employer use.', icon: FileText },
  { id: '8', title: 'New Hire Orientation Video', category: 'Training', type: 'video', size: '210 MB', description: 'Introductory orientation video covering company policies and benefits enrollment.', icon: Video },
  { id: '9', title: 'Certificate of Insurance Template', category: 'Templates', type: 'doc', size: '95 KB', description: 'Standard ACORD 25 certificate of liability insurance template.', icon: FileText },
  { id: '10', title: 'State Filing Requirements', category: 'Compliance', type: 'link', size: '—', description: 'External NCCI portal linking to current state-by-state filing requirements.', icon: LinkIcon },
  { id: '11', title: 'Payroll Reporting Template', category: 'Templates', type: 'spreadsheet', size: '255 KB', description: 'Monthly payroll reporting spreadsheet compatible with most WC carrier portals.', icon: Table },
  { id: '12', title: 'Return-to-Work Program Guide', category: 'Guides', type: 'doc', size: '1.8 MB', description: 'Best practices guide for implementing an effective return-to-work program.', icon: FileText },
];

const TYPE_LABELS: Record<string, string> = { doc: 'Document', spreadsheet: 'Spreadsheet', video: 'Video', link: 'External Link' };
const TYPE_COLORS: Record<string, string> = { doc: '#7C3AED', spreadsheet: '#0EA5E9', video: '#E91E8C', link: '#10B981' };

export function Resources() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = RESOURCES.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || r.category === category;
    return matchSearch && matchCat;
  });

  return (
    <AppShell activeNav="Resources">
      <div style={{ maxWidth: '1100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>Resources</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: textMuted }}>Docs, guides, forms, and training materials</p>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px',
            borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff',
          }}>
            <Plus size={15} /> Add Resource
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '16px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
          <input
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)', background: cardBg,
              color: textPrimary, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '6px 16px', borderRadius: '20px', border: `1px solid ${category === cat ? accent : borderColor}`,
                cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                background: category === cat ? 'rgba(233,30,140,0.12)' : 'transparent',
                color: category === cat ? accent : textMuted, transition: 'all 0.15s',
              }}
            >{cat}</button>
          ))}
        </div>

        {/* Appetite guide pinned card */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted, marginBottom: '10px' }}>Featured</div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(233,30,140,0.1))',
            border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px', padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={22} style={{ color: '#7C3AED' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: textPrimary, marginBottom: '4px' }}>Appetite Guide</div>
              <div style={{ fontSize: '13px', color: textMuted }}>Search class codes across all states with rate determination and underwriting notes.</div>
            </div>
            <button style={{
              padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(124,58,237,0.4)',
              background: 'transparent', color: '#7C3AED', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Open Guide</button>
          </div>
        </div>

        {/* Resource grid */}
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted, marginBottom: '10px' }}>
          {filtered.length} Resources
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {filtered.map((r) => {
            const Icon = r.icon;
            const typeColor = TYPE_COLORS[r.type] || accent;
            return (
              <div key={r.id} style={{
                background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px',
                padding: '18px', display: 'flex', flexDirection: 'column',
                backdropFilter: 'blur(12px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${typeColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} style={{ color: typeColor }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: `${typeColor}20`, color: typeColor }}>{TYPE_LABELS[r.type]}</span>
                      <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: textMuted }}>{r.category}</span>
                    </div>
                  </div>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: textMuted, lineHeight: 1.55, flexGrow: 1 }}>{r.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: textMuted }}>{r.size}</span>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                    borderRadius: '7px', border: `1px solid ${borderColor}`, background: 'transparent',
                    color: textSecondary, fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  }}>
                    {r.type === 'link' ? <Eye size={13} /> : <Download size={13} />}
                    {r.type === 'link' ? 'View' : 'Download'}
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
              <p style={{ color: textMuted, fontSize: '14px', margin: 0 }}>No resources match your search.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
