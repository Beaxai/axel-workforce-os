import { useEffect, useState } from 'react';
import './_group.css';
import { AppShell } from './_shared/AppShell';
import { Search, UserPlus, MoreHorizontal, Check, X, Mail } from 'lucide-react';

const accent = '#E91E8C';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';

const USERS = [
  { id: '1', name: 'Sarah Anderson', email: 'sarah.anderson@axel.io', role: 'ADMIN', status: 'active', lastLogin: 'Today, 2:14 PM', org: '' },
  { id: '2', name: 'Marcus Webb', email: 'marcus.webb@axel.io', role: 'UNDERWRITER', status: 'active', lastLogin: 'Today, 9:03 AM', org: '' },
  { id: '3', name: 'Priya Sharma', email: 'priya.sharma@axel.io', role: 'CSA', status: 'active', lastLogin: 'Yesterday', org: '' },
  { id: '4', name: 'James Kowalski', email: 'james@cascaderetail.com', role: 'AGENT', status: 'active', lastLogin: 'Dec 19', org: 'Cascade Insurance' },
  { id: '5', name: 'Tanya Reeves', email: 'treeves@sunriselogistics.com', role: 'EMPLOYER', status: 'active', lastLogin: 'Dec 18', org: 'Sunrise Logistics Inc.' },
  { id: '6', name: 'David Chen', email: 'dchen@harbormed.com', role: 'AGENT', status: 'invited', lastLogin: 'Never', org: 'Harbor Advisory' },
  { id: '7', name: 'Layla Okonkwo', email: 'lokonkwo@meridian.com', role: 'EMPLOYER', status: 'active', lastLogin: 'Dec 15', org: 'Meridian Healthcare LLC' },
  { id: '8', name: 'Robert Flores', email: 'rflores@peakconst.com', role: 'AGENT', status: 'deactivated', lastLogin: 'Nov 30', org: 'Peak Insurance Group' },
];

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ADMIN:       { label: 'Admin',           bg: 'rgba(124,58,237,0.12)', color: '#7C3AED' },
  UNDERWRITER: { label: 'Underwriter',     bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  CSA:         { label: 'CSA',             bg: 'rgba(233,30,140,0.12)', color: '#E91E8C' },
  AGENT:       { label: 'Agent',           bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  EMPLOYER:    { label: 'Employer',        bg: 'rgba(107,114,128,0.12)',color: '#9ca3af' },
  CARRIER:     { label: 'Carrier',         bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
};

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  active:      { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  invited:     { bg: 'rgba(234,179,8,0.12)',   color: '#eab308' },
  deactivated: { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
};

const ROLES = ['All', 'ADMIN', 'UNDERWRITER', 'CSA', 'AGENT', 'EMPLOYER'];

export function AdminUsers() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('AGENT');

  const filtered = USERS.filter((u) => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.org.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const thS = {
    textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const,
    letterSpacing: '0.04em', color: textMuted, padding: '10px 14px',
    borderBottom: `1px solid ${borderColor}`, whiteSpace: 'nowrap' as const,
  };
  const tdS = { fontSize: '13px', color: textSecondary, padding: '13px 14px', borderBottom: `1px solid rgba(255,255,255,0.04)` };

  return (
    <AppShell activeNav="">
      <div style={{ maxWidth: '1100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>User Management</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: textMuted }}>Manage team members, invitations, and agent approvals</p>
          </div>
          <button onClick={() => setShowInvite(true)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px',
            borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff',
          }}>
            <UserPlus size={15} /> Invite User
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Users', value: USERS.length },
            { label: 'Active', value: USERS.filter((u) => u.status === 'active').length },
            { label: 'Invited', value: USERS.filter((u) => u.status === 'invited').length },
            { label: 'Deactivated', value: USERS.filter((u) => u.status === 'deactivated').length },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: textPrimary }}>{s.value}</span>
              <span style={{ fontSize: '12px', color: textMuted }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
            <input
              placeholder="Search by name, email, or org…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '8px 14px 8px 34px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)', background: cardBg,
                color: textPrimary, fontSize: '13px', outline: 'none', width: '260px', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ROLES.map((r) => (
              <button key={r} onClick={() => setRoleFilter(r)} style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                border: `1px solid ${roleFilter === r ? accent : borderColor}`,
                background: roleFilter === r ? 'rgba(233,30,140,0.12)' : 'transparent',
                color: roleFilter === r ? accent : textMuted, cursor: 'pointer',
              }}>{r === 'All' ? 'All Roles' : (ROLE_CONFIG[r]?.label || r)}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Name</th>
                <th style={thS}>Email</th>
                <th style={thS}>Role</th>
                <th style={thS}>Org</th>
                <th style={thS}>Status</th>
                <th style={thS}>Last Login</th>
                <th style={{ ...thS, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rc = ROLE_CONFIG[u.role] || { label: u.role, bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' };
                const sc = STATUS_CONFIG[u.status] || STATUS_CONFIG['active'];
                return (
                  <tr key={u.id}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdS, fontWeight: 600, color: textPrimary }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, color: '#fff',
                        }}>
                          {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        {u.name}
                      </div>
                    </td>
                    <td style={tdS}>{u.email}</td>
                    <td style={tdS}>
                      <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: rc.bg, color: rc.color }}>{rc.label}</span>
                    </td>
                    <td style={{ ...tdS, color: textMuted }}>{u.org || '—'}</td>
                    <td style={tdS}>
                      <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: sc.bg, color: sc.color }}>{u.status}</span>
                    </td>
                    <td style={{ ...tdS, color: textMuted }}>{u.lastLogin}</td>
                    <td style={{ ...tdS, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {u.status === 'active' ? (
                          <button title="Deactivate" style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px' }}><X size={14} /></button>
                        ) : u.status === 'invited' ? (
                          <button title="Resend invite" style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px' }}><Mail size={14} /></button>
                        ) : (
                          <button title="Reactivate" style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: '4px' }}><Check size={14} /></button>
                        )}
                        <button title="More" style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px' }}><MoreHorizontal size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: textMuted, fontSize: '14px', margin: 0 }}>No users match your search.</p>
            </div>
          )}
        </div>

        {/* Invite modal */}
        {showInvite && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          }} onClick={() => setShowInvite(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{
              width: '420px', background: 'rgba(14,14,20,0.95)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px', padding: '28px', backdropFilter: 'blur(40px)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: textPrimary }}>Invite User</h2>
                <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: textMuted, marginBottom: '5px', display: 'block' }}>Email *</label>
                  <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@company.com"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: cardBg, color: textPrimary, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: textMuted, marginBottom: '5px', display: 'block' }}>Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: cardBg, color: textPrimary, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}>
                    {['ADMIN', 'UNDERWRITER', 'CSA', 'AGENT', 'EMPLOYER', 'CARRIER'].map((r) => (
                      <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => setShowInvite(false)} style={{
                  padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '4px',
                  background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff', fontSize: '13px', fontWeight: 600,
                }}>Send Invite</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
