import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import './_group.css';
import { AppShell } from './_shared/AppShell';
import { Mail, Phone, Clock, Calendar, KeyRound, Shield, Activity } from 'lucide-react';

const accent = '#E91E8C';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';

const ACTIVITY_LOG = [
  { id: '1', action: 'Logged in from Chrome on macOS', time: '2 hours ago' },
  { id: '2', action: 'Updated deal "Sunrise Logistics" to BOUND', time: 'Yesterday at 3:14 PM' },
  { id: '3', action: 'Uploaded ACORD 130 form to Harbor Medical', time: 'Yesterday at 11:02 AM' },
  { id: '4', action: 'Invited james@cascaderetail.com as Agent', time: 'Dec 18 at 9:30 AM' },
  { id: '5', action: 'Changed password', time: 'Dec 15 at 4:48 PM' },
  { id: '6', action: 'Submitted quote for Greenfield Manufacturing', time: 'Dec 12 at 2:10 PM' },
];

const inputS = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: cardBg,
  color: textPrimary, fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const,
};

const labelS = {
  fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const,
  letterSpacing: '0.04em', color: textMuted, marginBottom: '5px', display: 'block',
};

function SectionCard({ title, icon: Icon, children }: { title: string; icon?: any; children: ReactNode }) {
  return (
    <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '22px 24px', backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
        {Icon && <Icon size={14} style={{ color: textMuted }} />}
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export function Profile() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    fullName: 'Sarah Anderson',
    email: 'sarah.anderson@axel.io',
    phone: '+1 (415) 555-0192',
    timezone: 'America/Los_Angeles (PST)',
    title: 'Senior Account Manager',
  });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaved, setPwSaved] = useState(false);

  function handlePwSave() {
    setPwSaved(true);
    setPwForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setPwSaved(false), 3000);
  }

  return (
    <AppShell activeNav="">
      <div style={{ maxWidth: '860px' }}>
        {/* Profile header */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '24px', marginBottom: '20px', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#7C3AED,#E91E8C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', fontWeight: 700, color: '#fff',
            }}>SA</div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: textPrimary, fontFamily: 'var(--app-font-heading)' }}>
                {form.fullName}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: textMuted }}>{form.title}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(233,30,140,0.12)', color: accent }}>Admin</span>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>Active</span>
              </div>
            </div>
            {!editMode ? (
              <button onClick={() => setEditMode(true)} style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff', fontSize: '13px', fontWeight: 600,
              }}>Edit Profile</button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEditMode(false)} style={{
                  padding: '9px 18px', borderRadius: '8px', border: `1px solid ${borderColor}`,
                  background: 'transparent', color: textSecondary, fontSize: '13px', cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={() => setEditMode(false)} style={{
                  padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff', fontSize: '13px', fontWeight: 600,
                }}>Save Changes</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Contact details */}
            <SectionCard title="Contact & Details">
              {editMode ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {(Object.keys(form) as (keyof typeof form)[]).map((key) => (
                    <div key={key}>
                      <label style={labelS}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</label>
                      <input
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        style={inputS}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                  {[
                    { icon: Mail, label: 'Email', value: form.email },
                    { icon: Phone, label: 'Phone', value: form.phone },
                    { icon: Clock, label: 'Timezone', value: form.timezone },
                    { icon: Calendar, label: 'Date Joined', value: 'Mar 12, 2023' },
                    { icon: Clock, label: 'Last Login', value: '2 hours ago' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Icon size={12} style={{ color: textMuted }} />
                        <span style={labelS}>{label}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: textPrimary }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Password change */}
            <SectionCard title="Change Password" icon={KeyRound}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '340px' }}>
                <div>
                  <label style={labelS}>Current Password</label>
                  <input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} style={inputS} autoComplete="current-password" />
                </div>
                <div>
                  <label style={labelS}>New Password</label>
                  <input type="password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} style={inputS} autoComplete="new-password" />
                </div>
                <div>
                  <label style={labelS}>Confirm New Password</label>
                  <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} style={inputS} autoComplete="new-password" />
                </div>
                {pwSaved && <p style={{ margin: 0, fontSize: '13px', color: '#22c55e' }}>Password updated successfully.</p>}
                <button onClick={handlePwSave} style={{
                  padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', alignSelf: 'flex-start',
                  background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff', fontSize: '13px', fontWeight: 600,
                }}>Update Password</button>
              </div>
            </SectionCard>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SectionCard title="Recent Activity" icon={Activity}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {ACTIVITY_LOG.map((item, i) => (
                  <div key={item.id} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 0',
                    borderBottom: i < ACTIVITY_LOG.length - 1 ? `1px solid ${borderColor}` : 'none',
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent, marginTop: '6px', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12.5px', color: textSecondary, lineHeight: 1.4 }}>{item.action}</p>
                      <p style={{ margin: '3px 0 0', fontSize: '11px', color: textMuted }}>{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Security" icon={Shield}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Two-factor auth', status: 'Enabled', color: '#22c55e' },
                  { label: 'Session timeout', status: '8 hours', color: textMuted },
                  { label: 'Login notifications', status: 'On', color: '#22c55e' },
                ].map(({ label, status, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: textSecondary }}>{label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color }}>{status}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
