import type { ReactNode } from 'react';
import {
  LayoutDashboard, Store, Handshake, Users, Rocket,
  Receipt, Network, BookOpen, Map, ChevronRight,
} from 'lucide-react';

const NAV = [
  { label: 'Home',            icon: LayoutDashboard, active: false },
  { label: 'Marketplace',     icon: Store,           active: false },
  { label: 'Pipeline',        icon: Handshake,       active: false },
  { label: 'Accounts',        icon: Users,           active: false },
  { label: 'Implementations', icon: Rocket,          active: false },
  { label: 'Billing',         icon: Receipt,         active: false },
  { label: 'Network',         icon: Network,         active: false },
  { label: 'Resources',       icon: BookOpen,        active: false },
  { label: 'Journeys',        icon: Map,             active: false },
];

interface AppShellProps {
  children: ReactNode;
  /** Highlight this nav label as active */
  activeNav?: string;
}

export function AppShell({ children, activeNav }: AppShellProps) {
  const bg          = '#060608';
  const sidebarBg   = 'rgba(255,255,255,0.025)';
  const borderColor = 'rgba(255,255,255,0.07)';
  const textPrimary = '#fff';
  const textMuted   = 'rgba(255,255,255,0.48)';
  const hoverBg     = 'rgba(255,255,255,0.06)';

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, overflow: 'hidden', fontFamily: 'var(--app-font-sans)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: sidebarBg, borderRight: `1px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${borderColor}` }}>
          <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.15em', color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>
            A X E L
          </span>
          <div style={{ fontSize: '10px', color: textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>
            Workforce OS
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
          {NAV.map((item) => {
            const isActive = item.label === activeNav;
            const Icon = item.icon;
            return (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 10px', borderRadius: '8px', marginBottom: '2px',
                background: isActive ? 'rgba(233,30,140,0.12)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={16} style={{ color: isActive ? '#E91E8C' : textMuted, flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? textPrimary : textMuted }}>
                  {item.label}
                </span>
                {isActive && <ChevronRight size={12} style={{ marginLeft: 'auto', color: '#E91E8C' }} />}
              </div>
            );
          })}
        </nav>

        {/* User row */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--gradient-cta)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>SA</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Sarah Admin</div>
            <div style={{ fontSize: '11px', color: textMuted }}>Admin</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
