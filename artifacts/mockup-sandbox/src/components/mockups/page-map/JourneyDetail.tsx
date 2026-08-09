import { useEffect, useState } from 'react';
import './_group.css';
import { AppShell } from './_shared/AppShell';
import { ArrowLeft, Plus, GripVertical, ChevronRight, Save, Pencil, Trash2, Users, FileText, Clock } from 'lucide-react';

const accent = '#E91E8C';
const textPrimary = '#fff';
const textMuted = 'rgba(255,255,255,0.48)';
const textSecondary = 'rgba(255,255,255,0.72)';
const borderColor = 'rgba(255,255,255,0.07)';
const cardBg = 'rgba(255,255,255,0.05)';

const STEPS = [
  {
    id: '1', sortOrder: 1,
    phase: 'Phase 1: Pre-Bind',
    tasks: [
      { id: 't1', title: 'Collect signed submission', owner: 'AGENT', docs: ['ACORD 130', 'Loss Runs'], dueOffset: 1, description: 'Obtain all required submission documents from the agent before the quote is finalized.' },
      { id: 't2', title: 'Verify FEIN and business entity', owner: 'INTERNAL_SPECIALIST', docs: ['EIN Verification Letter'], dueOffset: 2, description: 'Confirm federal employer identification number matches state filings.' },
    ],
  },
  {
    id: '2', sortOrder: 2,
    phase: 'Phase 2: Bind & Issue',
    tasks: [
      { id: 't3', title: 'Issue binder and policy documents', owner: 'INTERNAL_SPECIALIST', docs: ['Policy Binder', 'Declarations Page'], dueOffset: 3, description: 'Generate and send binding confirmation and policy declarations to the insured.' },
      { id: 't4', title: 'Collect first premium payment', owner: 'CLIENT', docs: ['Payment Confirmation'], dueOffset: 5, description: 'Confirm receipt of first installment premium from the client.' },
      { id: 't5', title: 'Assign CSA to account', owner: 'INTERNAL_SPECIALIST', docs: [], dueOffset: 3, description: 'Designate a customer success associate for ongoing account management.' },
    ],
  },
  {
    id: '3', sortOrder: 3,
    phase: 'Phase 3: Onboarding',
    tasks: [
      { id: 't6', title: 'Employee roster upload', owner: 'CLIENT', docs: ['Payroll Report', 'Employee Census'], dueOffset: 7, description: 'Client uploads current employee roster via secure portal.' },
      { id: 't7', title: 'Safety orientation scheduled', owner: 'INTERNAL_SPECIALIST', docs: [], dueOffset: 10, description: 'Schedule and confirm the initial safety orientation call with the client.' },
      { id: 't8', title: 'Carrier onboarding call', owner: 'CARRIER', docs: [], dueOffset: 14, description: 'Three-way call with carrier, specialist, and client to review policy terms.' },
    ],
  },
  {
    id: '4', sortOrder: 4,
    phase: 'Phase 4: Activation',
    tasks: [
      { id: 't9', title: 'Set up payroll reporting schedule', owner: 'INTERNAL_SPECIALIST', docs: ['Payroll Schedule'], dueOffset: 15, description: 'Configure automated monthly payroll reporting to carrier.' },
      { id: 't10', title: 'Mark account as Active Client', owner: 'INTERNAL_SPECIALIST', docs: [], dueOffset: 20, description: 'Flip deal status to Active Client after all onboarding milestones are complete.' },
    ],
  },
];

const OWNER_CONFIG: Record<string, { label: string; color: string }> = {
  INTERNAL_SPECIALIST: { label: 'Specialist', color: '#7C3AED' },
  CLIENT:              { label: 'Client',     color: '#22c55e' },
  AGENT:               { label: 'Agent',      color: accent },
  CARRIER:             { label: 'Carrier',    color: '#3b82f6' },
};

type Task = { id: string; title: string; owner: string; docs: string[]; dueOffset: number; description: string };
type Phase = { id: string; sortOrder: number; phase: string; tasks: Task[] };

export function JourneyDetail() {
  useEffect(() => { document.documentElement.classList.add('dark'); }, []);
  const [selectedTask, setSelectedTask] = useState<Task | null>(STEPS[0].tasks[0]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(STEPS[0].id);
  const [editingName, setEditingName] = useState(false);
  const [templateName, setTemplateName] = useState('PEO Full Implementation');
  const [phases] = useState<Phase[]>(STEPS);

  // Local edit state for selected task
  const [taskForm, setTaskForm] = useState<Task>(selectedTask || STEPS[0].tasks[0]);

  function selectTask(phase: Phase, task: Task) {
    setSelectedPhaseId(phase.id);
    setSelectedTask(task);
    setTaskForm(task);
  }

  return (
    <AppShell activeNav="Journeys">
      <div style={{ maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '0', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px', flexShrink: 0 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '13px', padding: 0 }}>
            <ArrowLeft size={15} /> All Playbooks
          </button>
          <span style={{ color: borderColor }}>›</span>
          {editingName ? (
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onBlur={() => setEditingName(false)}
              autoFocus
              style={{ fontSize: '18px', fontWeight: 700, color: textPrimary, background: 'transparent', border: 'none', outline: 'none', borderBottom: `1px solid ${accent}`, paddingBottom: '2px', minWidth: '200px' }}
            />
          ) : (
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: textPrimary, cursor: 'pointer', fontFamily: 'var(--app-font-heading)' }} onClick={() => setEditingName(true)}>
              {templateName}
            </h1>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}>Implementation</span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}>PEO</span>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>Active</span>
            <span style={{ fontSize: '12px', color: textMuted }}>v5</span>
          </div>
          <button style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px',
            borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff',
          }}>
            <Save size={13} /> Save Changes
          </button>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', flex: 1, overflow: 'hidden' }}>
          {/* Left panel: step list */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'auto', backdropFilter: 'blur(12px)' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>Steps &amp; Phases</span>
              <button style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                <Plus size={13} /> Add Phase
              </button>
            </div>
            <div style={{ padding: '8px' }}>
              {phases.map((phase) => (
                <div key={phase.id} style={{ marginBottom: '6px' }}>
                  {/* Phase header */}
                  <div style={{
                    padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    color: textMuted, background: 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px',
                  }}>
                    <GripVertical size={12} style={{ color: 'rgba(255,255,255,0.2)', cursor: 'grab' }} />
                    <span style={{ flex: 1 }}>{phase.phase}</span>
                    <span style={{ fontSize: '11px', color: textMuted, opacity: 0.6 }}>{phase.tasks.length}</span>
                  </div>
                  {/* Tasks */}
                  {phase.tasks.map((task) => {
                    const isSelected = selectedTask?.id === task.id;
                    const oc = OWNER_CONFIG[task.owner] || { label: task.owner, color: textMuted };
                    return (
                      <div key={task.id}
                        onClick={() => selectTask(phase, task)}
                        style={{
                          padding: '9px 10px 9px 22px', borderRadius: '8px', cursor: 'pointer', marginBottom: '2px',
                          background: isSelected ? 'rgba(233,30,140,0.12)' : 'transparent',
                          border: `1px solid ${isSelected ? 'rgba(233,30,140,0.25)' : 'transparent'}`,
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <GripVertical size={11} style={{ color: 'rgba(255,255,255,0.15)', cursor: 'grab', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 400, color: isSelected ? textPrimary : textSecondary, flex: 1, lineHeight: 1.3 }}>{task.title}</span>
                          {isSelected && <ChevronRight size={12} style={{ color: accent, flexShrink: 0 }} />}
                        </div>
                        <div style={{ paddingLeft: '17px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 7px', borderRadius: '10px', background: `${oc.color}18`, color: oc.color }}>{oc.label}</span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add task button */}
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px 6px 26px',
                    background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '12px', width: '100%',
                  }}>
                    <Plus size={12} /> Add task
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: task detail editor */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'auto', backdropFilter: 'blur(12px)' }}>
            {selectedTask ? (
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: textMuted }}>Task Editor</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '4px' }}><Pencil size={14} /></button>
                    <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Title */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: textMuted, marginBottom: '6px', display: 'block' }}>Task Title</label>
                    <input
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      style={{
                        width: '100%', padding: '10px 13px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)', color: textPrimary, fontSize: '15px', fontWeight: 600,
                        outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: textMuted, marginBottom: '6px', display: 'block' }}>Description</label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      rows={3}
                      style={{
                        width: '100%', padding: '10px 13px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)', color: textSecondary, fontSize: '13px', lineHeight: 1.6,
                        outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Owner + Due offset */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: textMuted, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={12} /> Assigned Role
                      </label>
                      <select
                        value={taskForm.owner}
                        onChange={(e) => setTaskForm({ ...taskForm, owner: e.target.value })}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.04)', color: textPrimary, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                        }}
                      >
                        {Object.entries(OWNER_CONFIG).map(([val, { label }]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      {(() => {
                        const oc = OWNER_CONFIG[taskForm.owner];
                        return oc ? (
                          <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '10px', background: `${oc.color}18`, color: oc.color }}>{oc.label}</span>
                        ) : null;
                      })()}
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: textMuted, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} /> Due (days after bind)
                      </label>
                      <input
                        type="number"
                        value={taskForm.dueOffset}
                        onChange={(e) => setTaskForm({ ...taskForm, dueOffset: parseInt(e.target.value) || 0 })}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.04)', color: textPrimary, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                      <p style={{ margin: '5px 0 0', fontSize: '11px', color: textMuted }}>Day {taskForm.dueOffset} after effective date</p>
                    </div>
                  </div>

                  {/* Documents required */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: textMuted, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={12} /> Documents Required
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      {taskForm.docs.map((doc, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px 4px 12px',
                          borderRadius: '20px', background: 'rgba(255,255,255,0.07)', border: `1px solid ${borderColor}`,
                        }}>
                          <span style={{ fontSize: '12px', color: textSecondary }}>{doc}</span>
                          <button
                            onClick={() => setTaskForm({ ...taskForm, docs: taskForm.docs.filter((_, j) => j !== i) })}
                            style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                          >×</button>
                        </div>
                      ))}
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px', borderRadius: '20px',
                        border: `1px dashed ${borderColor}`, background: 'transparent', color: textMuted, cursor: 'pointer', fontSize: '12px',
                      }}>
                        <Plus size={11} /> Add doc
                      </button>
                    </div>
                  </div>

                  {/* Save button */}
                  <button style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#7C3AED,#E91E8C)', color: '#fff', fontSize: '13px', fontWeight: 600, alignSelf: 'flex-start',
                  }}>Save Task</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: textMuted, fontSize: '14px' }}>Select a task to edit</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
