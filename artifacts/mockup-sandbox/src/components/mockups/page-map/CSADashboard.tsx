import './_group.css';
import { useEffect } from 'react';
import { AppShell } from './_shared/AppShell';

const CONTACTS = [
  { id: 1, first: 'Maria', last: 'Gonzalez', email: 'mgonzalez@titanpacific.com', role: 'HR Director', type: 'Primary' },
  { id: 2, first: 'James', last: 'Whitfield', email: 'jwhitfield@emeraldcoast.io', role: 'CFO', type: 'Primary' },
  { id: 3, first: 'Priya', last: 'Sharma', email: 'psharma@pinnaclehh.com', role: 'Benefits Admin', type: 'Secondary' },
  { id: 4, first: 'Carlos', last: 'Mendez', email: 'cmendez@globalstaffco.com', role: 'Owner', type: 'Primary' },
  { id: 5, first: 'Sara', last: 'Kim', email: 'skim@nexusbistro.com', role: 'HR Manager', type: 'Secondary' },
  { id: 6, first: 'Robert', last: 'Chen', email: 'rchen@summitconstruct.com', role: 'VP Operations', type: 'Primary' },
];

const TASKS = [
  { id: 1, title: 'Send renewal packets — Titan Pacific', dueDate: '2024-12-15', status: 'OPEN', priority: 'HIGH' },
  { id: 2, title: 'Verify EE census — Emerald Coast', dueDate: '2024-12-18', status: 'IN_PROGRESS', priority: 'HIGH' },
  { id: 3, title: 'Collect EOI forms — Pinnacle Health', dueDate: '2024-12-22', status: 'OPEN', priority: 'NORMAL' },
  { id: 4, title: 'Schedule QA call — Global Staff Co.', dueDate: '2024-12-28', status: 'OPEN', priority: 'NORMAL' },
  { id: 5, title: 'Update billing contacts — Nexus Bistro', dueDate: '2025-01-04', status: 'OPEN', priority: 'LOW' },
];

const POLICIES = [
  { id: 1, number: 'POL-2024-0012', product: 'MEC Wrap', status: 'ACTIVE', client: 'Titan Pacific' },
  { id: 2, number: 'POL-2024-0015', product: 'Level Funded', status: 'ACTIVE', client: 'Emerald Coast' },
  { id: 3, number: 'POL-2024-0018', product: 'MEC Wrap', status: 'ACTIVE', client: 'Pinnacle Health' },
  { id: 4, number: 'POL-2024-0021', product: 'Self-Funded', status: 'ACTIVE', client: 'Global Staff' },
  { id: 5, number: 'POL-2024-0027', product: 'MEC Wrap', status: 'ACTIVE', client: 'Nexus Bistro' },
  { id: 6, number: 'POL-2024-0031', product: 'Level Funded', status: 'RENEWAL', client: 'Summit Construct' },
];

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: '#EF4444',
  NORMAL: '#F59E0B',
  LOW: 'rgba(255,255,255,0.4)',
};

const TASK_STATUS: Record<string, { color: string; bg: string }> = {
  OPEN: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  IN_PROGRESS: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  COMPLETE: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
};

const POLICY_STATUS: Record<string, { color: string; bg: string }> = {
  ACTIVE: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  RENEWAL: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
};

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 24,
};

const activePolicies = POLICIES.filter((p) => p.status === 'ACTIVE');
const openTasks = TASKS.filter((t) => t.status !== 'COMPLETE');

export function CSADashboard() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  const STATS = [
    { label: 'My Clients', value: CONTACTS.length },
    { label: 'Active Policies', value: activePolicies.length },
    { label: 'Upcoming Renewals', value: 1 },
    { label: 'Open Tasks', value: openTasks.length },
  ];

  return (
    <AppShell activeNav="Dashboard">
      <div style={{ maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 4, fontFamily: 'var(--app-font-heading)' }}>CSA Dashboard</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', margin: 0 }}>Client servicing and account management</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ ...glass, borderBottom: '2px solid #E91E8C' }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.48)', marginBottom: 10, fontFamily: 'var(--app-font-heading)' }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Two column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Client Contacts */}
          <div style={glass}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16, color: '#E91E8C' }}>👥</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Client Contacts</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {CONTACTS.map((c, i) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < CONTACTS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>{c.first[0]}{c.last[0]}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: 0 }}>{c.first} {c.last}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{c.email} · {c.role}</p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
                    background: 'rgba(255,255,255,0.07)', borderRadius: 4, padding: '2px 7px',
                  }}>{c.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* My Tasks */}
          <div style={glass}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16, color: '#E91E8C' }}>📌</span>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>My Tasks</h3>
              <span style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#EF4444',
                background: 'rgba(239,68,68,0.12)', borderRadius: 10, padding: '2px 8px',
              }}>{openTasks.length} open</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {openTasks.map((t, i) => {
                const st = TASK_STATUS[t.status];
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: i < openTasks.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 5,
                        background: PRIORITY_COLOR[t.priority], flexShrink: 0,
                      }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: 0 }}>{t.title}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                          Due: {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: st.color, background: st.bg,
                      borderRadius: 4, padding: '2px 7px', flexShrink: 0,
                    }}>{t.status.replace('_', ' ')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Policies */}
        <div style={glass}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16, color: '#E91E8C' }}>🛡️</span>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Active Policies</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {POLICIES.map((p) => {
              const ps = POLICY_STATUS[p.status] || { color: '#fff', bg: 'rgba(255,255,255,0.08)' };
              return (
                <div key={p.id} style={{
                  padding: 14, borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: 0 }}>{p.number}</p>
                    <span style={{ fontSize: 11, fontWeight: 600, color: ps.color, background: ps.bg, borderRadius: 4, padding: '2px 6px' }}>
                      {p.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', margin: 0 }}>{p.product}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: '4px 0 0' }}>{p.client}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
