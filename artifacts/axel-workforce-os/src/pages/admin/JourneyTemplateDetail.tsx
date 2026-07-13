import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetJourneyTemplate,
  getGetJourneyTemplateQueryKey,
  getGetJourneyTemplatesQueryKey,
  useUpdateJourneyTemplate,
  useDeleteJourneyTemplate,
  useCreateJourneyTemplatePhase,
  useUpdateJourneyTemplatePhase,
  useDeleteJourneyTemplatePhase,
  useCreateJourneyTemplateTask,
  useUpdateJourneyTemplateTask,
  useDeleteJourneyTemplateTask,
  useReorderJourneyTemplatePhases,
  useReorderJourneyTemplateTasks,
  ApiError,
  type JourneyTemplatePhase,
  type JourneyTemplateTask,
  type UpdateJourneyTemplateRequestType,
  type UpdateJourneyTemplateRequestProductType,
  type CreateJourneyTemplateTaskRequestOwnerType,
} from "@workspace/api-client-react";
import { GlassCard, PrimaryButton, GhostButton, AxelBadge, AxelModal } from "@/components/ui/axel-index";
import { useThemeColors } from "@/lib/use-theme-colors";
import { ArrowLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Flag } from "lucide-react";

const TYPE_OPTIONS = ["IMPLEMENTATION", "ONBOARDING"] as const;
const PRODUCT_OPTIONS = ["WC", "PEO", "ASO", "ANY"] as const;
const OWNER_OPTIONS = ["INTERNAL_SPECIALIST", "CLIENT", "AGENT", "CARRIER"] as const;

const OWNER_LABEL: Record<string, string> = {
  INTERNAL_SPECIALIST: "Specialist",
  CLIENT: "Client",
  AGENT: "Agent",
  CARRIER: "Carrier",
};

function errMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    const data = e.data as { error?: unknown } | null;
    if (data && typeof data.error === "string") return data.error;
  }
  return fallback;
}

export default function JourneyTemplateDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const c = useThemeColors();
  const queryClient = useQueryClient();

  const { data: template, isLoading, error } = useGetJourneyTemplate(id);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetJourneyTemplateQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetJourneyTemplatesQueryKey().slice(0, 1) });
  };

  const updateTemplate = useUpdateJourneyTemplate();
  const deleteTemplate = useDeleteJourneyTemplate();
  const updatePhase = useUpdateJourneyTemplatePhase();
  const deletePhase = useDeleteJourneyTemplatePhase();
  const updateTask = useUpdateJourneyTemplateTask();
  const deleteTask = useDeleteJourneyTemplateTask();
  const reorderPhases = useReorderJourneyTemplatePhases();
  const reorderTasks = useReorderJourneyTemplateTasks();

  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<JourneyTemplatePhase | null>(null);
  const [confirmDeletePhase, setConfirmDeletePhase] = useState<JourneyTemplatePhase | null>(null);
  const [addTaskPhase, setAddTaskPhase] = useState<JourneyTemplatePhase | null>(null);
  const [editingTask, setEditingTask] = useState<JourneyTemplateTask | null>(null);
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  if (isLoading) {
    return <GlassCard><span style={{ color: c.textMuted, fontSize: "14px" }}>Loading template…</span></GlassCard>;
  }
  if (error || !template) {
    return <GlassCard><span style={{ color: "#ef4444", fontSize: "14px" }}>Template not found.</span></GlassCard>;
  }

  const phases = [...template.phases].sort((a, b) => a.sortOrder - b.sortOrder);
  const tasksByPhase = new Map<string, JourneyTemplateTask[]>();
  for (const p of phases) tasksByPhase.set(p.id, []);
  for (const t of [...template.tasks].sort((a, b) => a.sortOrder - b.sortOrder)) {
    tasksByPhase.get(t.phaseId)?.push(t);
  }

  // Atomic reorders: send the FULL desired order to the server, which swaps
  // sort orders inside one transaction (no partial-failure corruption).
  const swapPhases = (idx: number, dir: -1 | 1) => {
    if (!phases[idx] || !phases[idx + dir]) return;
    const ordered = phases.map((p) => p.id);
    [ordered[idx], ordered[idx + dir]] = [ordered[idx + dir], ordered[idx]];
    reorderPhases.mutate(
      { id, data: { orderedPhaseIds: ordered } },
      { onSuccess: invalidate, onError: invalidate },
    );
  };

  const swapTasks = (phaseId: string, list: JourneyTemplateTask[], idx: number, dir: -1 | 1) => {
    if (!list[idx] || !list[idx + dir]) return;
    const ordered = list.map((t) => t.id);
    [ordered[idx], ordered[idx + dir]] = [ordered[idx + dir], ordered[idx]];
    reorderTasks.mutate(
      { id, data: { phaseId, orderedTaskIds: ordered } },
      { onSuccess: invalidate, onError: invalidate },
    );
  };

  const iconBtn: React.CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: c.textMuted,
    padding: "4px",
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "6px",
  };

  return (
    <div>
      <button
        data-testid="button-back-to-list"
        onClick={() => navigate("/admin/journeys")}
        style={{ ...iconBtn, gap: "6px", fontSize: "13px", marginBottom: "14px", padding: "4px 0" }}
      >
        <ArrowLeft size={15} /> All playbooks
      </button>

      {banner && (
        <GlassCard padding="12px 16px" style={{ marginBottom: "16px", border: "1px solid #ef4444" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span data-testid="text-banner" style={{ color: "#ef4444", fontSize: "13.5px", flex: 1, minWidth: "200px" }}>{banner}</span>
            <GhostButton
              data-testid="button-banner-deactivate"
              onClick={() => {
                updateTemplate.mutate(
                  { id, data: { isActive: false } },
                  { onSuccess: () => { setBanner(null); invalidate(); } },
                );
              }}
            >
              Deactivate instead
            </GhostButton>
            <button style={iconBtn} onClick={() => setBanner(null)} aria-label="Dismiss">✕</button>
          </div>
        </GlassCard>
      )}

      {/* TEMPLATE HEADER */}
      <GlassCard padding="20px 24px" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <h1 data-testid="text-template-name" style={{ fontSize: "20px", fontWeight: 700, color: c.textPrimary, margin: 0 }}>
            {template.name}
          </h1>
          <AxelBadge label={template.type} color={template.type === "IMPLEMENTATION" ? "purple" : "blue"} />
          <AxelBadge label={template.productType} color="gray" />
          <AxelBadge label={template.isActive ? "Active" : "Inactive"} color={template.isActive ? "green" : "gray"} />
          <span style={{ fontSize: "12.5px", color: c.textMuted }}>v{template.version}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <GhostButton data-testid="button-edit-template" onClick={() => setEditTemplateOpen(true)}>
              <Pencil size={14} style={{ marginRight: "6px", verticalAlign: "-2px" }} />Edit
            </GhostButton>
            <GhostButton
              data-testid="button-toggle-active"
              onClick={() =>
                updateTemplate.mutate({ id, data: { isActive: !template.isActive } }, { onSuccess: invalidate })
              }
            >
              {template.isActive ? "Deactivate" : "Activate"}
            </GhostButton>
            <GhostButton data-testid="button-delete-template" onClick={() => setConfirmDeleteTemplate(true)} style={{ color: "#ef4444" }}>
              <Trash2 size={14} style={{ marginRight: "6px", verticalAlign: "-2px" }} />Delete
            </GhostButton>
          </div>
        </div>
      </GlassCard>

      {/* PHASES */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <h2 className="font-heading" style={{ fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", color: c.sectionHeading, margin: 0 }}>
          Phases &amp; Tasks
        </h2>
        <PrimaryButton data-testid="button-add-phase" onClick={() => setAddPhaseOpen(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus size={15} /> Add Phase
        </PrimaryButton>
      </div>

      {phases.length === 0 ? (
        <GlassCard><span style={{ color: c.textMuted, fontSize: "14px" }}>No phases yet — add the first phase to start building this playbook.</span></GlassCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {phases.map((phase, pIdx) => {
            const tasks = tasksByPhase.get(phase.id) ?? [];
            return (
              <GlassCard key={phase.id} padding="16px 20px">
                <div data-testid={`row-phase-${phase.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: c.textMuted, width: "22px" }}>{pIdx + 1}.</span>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: c.textPrimary }}>{phase.name}</span>
                  <span style={{ fontSize: "12.5px", color: c.textMuted }}>Target: day {phase.targetOffsetDays}</span>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "2px" }}>
                    <button data-testid={`button-phase-up-${phase.id}`} style={{ ...iconBtn, opacity: pIdx === 0 ? 0.3 : 1 }} disabled={pIdx === 0} onClick={() => swapPhases(pIdx, -1)} aria-label="Move phase up"><ChevronUp size={16} /></button>
                    <button data-testid={`button-phase-down-${phase.id}`} style={{ ...iconBtn, opacity: pIdx === phases.length - 1 ? 0.3 : 1 }} disabled={pIdx === phases.length - 1} onClick={() => swapPhases(pIdx, 1)} aria-label="Move phase down"><ChevronDown size={16} /></button>
                    <button data-testid={`button-phase-edit-${phase.id}`} style={iconBtn} onClick={() => setEditingPhase(phase)} aria-label="Edit phase"><Pencil size={14} /></button>
                    <button data-testid={`button-phase-delete-${phase.id}`} style={{ ...iconBtn, color: "#ef4444" }} onClick={() => setConfirmDeletePhase(phase)} aria-label="Delete phase"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* TASKS */}
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {tasks.map((task, tIdx) => (
                    <div
                      key={task.id}
                      data-testid={`row-task-${task.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: c.inputBg,
                        border: `1px solid ${c.inputBorder}`,
                        flexWrap: "wrap",
                      }}
                    >
                      {task.isMilestone && <Flag size={13} style={{ color: "var(--accent-primary)" }} aria-label="Milestone" />}
                      <span style={{ fontSize: "13.5px", color: c.textPrimary }}>{task.name}</span>
                      <AxelBadge label={OWNER_LABEL[task.ownerType] ?? task.ownerType} color="gray" />
                      <span style={{ fontSize: "12px", color: c.textMuted }}>{task.taskType}</span>
                      <span style={{ fontSize: "12px", color: c.textMuted }}>day {task.offsetDays}</span>
                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "2px" }}>
                        <button data-testid={`button-task-up-${task.id}`} style={{ ...iconBtn, opacity: tIdx === 0 ? 0.3 : 1 }} disabled={tIdx === 0} onClick={() => swapTasks(phase.id, tasks, tIdx, -1)} aria-label="Move task up"><ChevronUp size={14} /></button>
                        <button data-testid={`button-task-down-${task.id}`} style={{ ...iconBtn, opacity: tIdx === tasks.length - 1 ? 0.3 : 1 }} disabled={tIdx === tasks.length - 1} onClick={() => swapTasks(phase.id, tasks, tIdx, 1)} aria-label="Move task down"><ChevronDown size={14} /></button>
                        <button data-testid={`button-task-edit-${task.id}`} style={iconBtn} onClick={() => setEditingTask(task)} aria-label="Edit task"><Pencil size={13} /></button>
                        <button
                          data-testid={`button-task-delete-${task.id}`}
                          style={{ ...iconBtn, color: "#ef4444" }}
                          onClick={() => deleteTask.mutate({ taskId: task.id }, { onSuccess: invalidate })}
                          aria-label="Delete task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    data-testid={`button-add-task-${phase.id}`}
                    onClick={() => setAddTaskPhase(phase)}
                    style={{
                      ...iconBtn,
                      gap: "6px",
                      fontSize: "12.5px",
                      justifyContent: "flex-start",
                      padding: "6px 4px",
                      color: "var(--accent-primary)",
                    }}
                  >
                    <Plus size={13} /> Add task
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ---- MODALS ---- */}

      {editTemplateOpen && (
        <TemplateEditModal
          template={template}
          onClose={() => setEditTemplateOpen(false)}
          onSave={(data) =>
            updateTemplate.mutate({ id, data }, { onSuccess: () => { setEditTemplateOpen(false); invalidate(); } })
          }
          pending={updateTemplate.isPending}
        />
      )}

      {(addPhaseOpen || editingPhase) && (
        <PhaseModal
          phase={editingPhase}
          nextSortOrder={phases.length ? Math.max(...phases.map((p) => p.sortOrder)) + 1 : 1}
          templateId={id}
          onClose={() => { setAddPhaseOpen(false); setEditingPhase(null); }}
          onDone={() => { setAddPhaseOpen(false); setEditingPhase(null); invalidate(); }}
        />
      )}

      {(addTaskPhase || editingTask) && (
        <TaskModal
          task={editingTask}
          phase={addTaskPhase}
          templateId={id}
          nextSortOrder={
            addTaskPhase
              ? (() => {
                  const existing = tasksByPhase.get(addTaskPhase.id) ?? [];
                  return existing.length ? Math.max(...existing.map((t) => t.sortOrder)) + 1 : 1;
                })()
              : 1
          }
          onClose={() => { setAddTaskPhase(null); setEditingTask(null); }}
          onDone={() => { setAddTaskPhase(null); setEditingTask(null); invalidate(); }}
        />
      )}

      {confirmDeletePhase && (
        <ConfirmModal
          title="Delete phase?"
          body={`Deleting "${confirmDeletePhase.name}" also removes its ${tasksByPhase.get(confirmDeletePhase.id)?.length ?? 0} task(s). This cannot be undone.`}
          confirmLabel="Delete Phase"
          pending={deletePhase.isPending}
          onCancel={() => setConfirmDeletePhase(null)}
          onConfirm={() =>
            deletePhase.mutate(
              { phaseId: confirmDeletePhase.id },
              { onSuccess: () => { setConfirmDeletePhase(null); invalidate(); } },
            )
          }
        />
      )}

      {confirmDeleteTemplate && (
        <ConfirmModal
          title="Delete template?"
          body={`Delete "${template.name}" and all of its phases and tasks? Live journeys already created from it are not affected, but if any exist the delete will be blocked.`}
          confirmLabel="Delete Template"
          pending={deleteTemplate.isPending}
          onCancel={() => setConfirmDeleteTemplate(false)}
          onConfirm={() =>
            deleteTemplate.mutate(
              { id },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getGetJourneyTemplatesQueryKey().slice(0, 1) });
                  navigate("/admin/journeys");
                },
                onError: (e) => {
                  setConfirmDeleteTemplate(false);
                  setBanner(errMessage(e, "Failed to delete template."));
                },
              },
            )
          }
        />
      )}
    </div>
  );
}

/* ------------------------------ sub-modals ------------------------------ */

function useFieldStyles() {
  const c = useThemeColors();
  const field: React.CSSProperties = {
    width: "100%",
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    borderRadius: "8px",
    color: c.inputText,
    fontSize: "14px",
    padding: "9px 12px",
    outline: "none",
    boxSizing: "border-box",
  };
  const label: React.CSSProperties = {
    display: "block",
    fontSize: "12.5px",
    fontWeight: 600,
    color: c.labelText,
    marginBottom: "6px",
  };
  return { field, label, c };
}

function TemplateEditModal({
  template,
  onClose,
  onSave,
  pending,
}: {
  template: { name: string; type: string; productType: string };
  onClose: () => void;
  onSave: (data: { name: string; type: UpdateJourneyTemplateRequestType; productType: UpdateJourneyTemplateRequestProductType }) => void;
  pending: boolean;
}) {
  const { field, label } = useFieldStyles();
  const [name, setName] = useState(template.name);
  const [type, setType] = useState(template.type);
  const [productType, setProductType] = useState(template.productType);

  return (
    <AxelModal isOpen onClose={onClose} title="Edit Template">
      <div style={{ width: "420px", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={label}>Name</label>
          <input data-testid="input-edit-template-name" value={name} onChange={(e) => setName(e.target.value)} style={field} autoFocus />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Type</label>
            <select data-testid="select-edit-template-type" value={type} onChange={(e) => setType(e.target.value)} style={field}>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Product</label>
            <select data-testid="select-edit-template-product" value={productType} onChange={(e) => setProductType(e.target.value)} style={field}>
              {PRODUCT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            data-testid="button-save-template"
            disabled={!name.trim() || pending}
            onClick={() =>
              onSave({
                name: name.trim(),
                type: type as UpdateJourneyTemplateRequestType,
                productType: productType as UpdateJourneyTemplateRequestProductType,
              })
            }
          >
            {pending ? "Saving…" : "Save"}
          </PrimaryButton>
        </div>
      </div>
    </AxelModal>
  );
}

function PhaseModal({
  phase,
  templateId,
  nextSortOrder,
  onClose,
  onDone,
}: {
  phase: JourneyTemplatePhase | null;
  templateId: string;
  nextSortOrder: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { field, label } = useFieldStyles();
  const createPhase = useCreateJourneyTemplatePhase();
  const updatePhase = useUpdateJourneyTemplatePhase();
  const [name, setName] = useState(phase?.name ?? "");
  const [offset, setOffset] = useState(String(phase?.targetOffsetDays ?? 0));
  const pending = createPhase.isPending || updatePhase.isPending;

  const submit = () => {
    if (!name.trim() || pending) return;
    const targetOffsetDays = Number(offset) || 0;
    if (phase) {
      updatePhase.mutate({ phaseId: phase.id, data: { name: name.trim(), targetOffsetDays } }, { onSuccess: onDone });
    } else {
      createPhase.mutate(
        { id: templateId, data: { name: name.trim(), targetOffsetDays, sortOrder: nextSortOrder } },
        { onSuccess: onDone },
      );
    }
  };

  return (
    <AxelModal isOpen onClose={onClose} title={phase ? "Edit Phase" : "Add Phase"}>
      <div style={{ width: "380px", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={label}>Phase name</label>
          <input data-testid="input-phase-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kickoff & Data Collection" style={field} autoFocus />
        </div>
        <div>
          <label style={label}>Target offset (days from bind)</label>
          <input data-testid="input-phase-offset" type="number" value={offset} onChange={(e) => setOffset(e.target.value)} style={field} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton data-testid="button-save-phase" disabled={!name.trim() || pending} onClick={submit}>
            {pending ? "Saving…" : phase ? "Save" : "Add Phase"}
          </PrimaryButton>
        </div>
      </div>
    </AxelModal>
  );
}

function TaskModal({
  task,
  phase,
  templateId,
  nextSortOrder,
  onClose,
  onDone,
}: {
  task: JourneyTemplateTask | null;
  phase: JourneyTemplatePhase | null;
  templateId: string;
  nextSortOrder: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { field, label, c } = useFieldStyles();
  const createTask = useCreateJourneyTemplateTask();
  const updateTask = useUpdateJourneyTemplateTask();
  const [name, setName] = useState(task?.name ?? "");
  const [taskType, setTaskType] = useState(task?.taskType ?? "GENERIC");
  const [ownerType, setOwnerType] = useState<string>(task?.ownerType ?? "INTERNAL_SPECIALIST");
  const [isMilestone, setIsMilestone] = useState(task?.isMilestone ?? false);
  const [offsetDays, setOffsetDays] = useState(String(task?.offsetDays ?? 0));
  const pending = createTask.isPending || updateTask.isPending;

  const submit = () => {
    if (!name.trim() || pending) return;
    const common = {
      name: name.trim(),
      taskType: taskType.trim() || "GENERIC",
      ownerType: ownerType as CreateJourneyTemplateTaskRequestOwnerType,
      isMilestone,
      offsetDays: Number(offsetDays) || 0,
    };
    if (task) {
      updateTask.mutate({ taskId: task.id, data: common }, { onSuccess: onDone });
    } else if (phase) {
      createTask.mutate(
        { id: templateId, data: { ...common, phaseId: phase.id, sortOrder: nextSortOrder } },
        { onSuccess: onDone },
      );
    }
  };

  return (
    <AxelModal isOpen onClose={onClose} title={task ? "Edit Task" : `Add Task${phase ? ` — ${phase.name}` : ""}`}>
      <div style={{ width: "440px", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={label}>Task name</label>
          <input data-testid="input-task-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Collect payroll census" style={field} autoFocus />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Task type</label>
            <input data-testid="input-task-type" value={taskType} onChange={(e) => setTaskType(e.target.value)} style={field} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Owner</label>
            <select data-testid="select-task-owner" value={ownerType} onChange={(e) => setOwnerType(e.target.value)} style={field}>
              {OWNER_OPTIONS.map((o) => <option key={o} value={o}>{OWNER_LABEL[o]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Offset (days from bind)</label>
            <input data-testid="input-task-offset" type="number" value={offsetDays} onChange={(e) => setOffsetDays(e.target.value)} style={field} />
          </div>
          <label style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px", color: c.textSecondary, paddingBottom: "10px" }}>
            <input
              data-testid="checkbox-task-milestone"
              type="checkbox"
              checked={isMilestone}
              onChange={(e) => setIsMilestone(e.target.checked)}
              style={{ accentColor: "var(--accent-primary)", width: "15px", height: "15px" }}
            />
            Milestone
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton data-testid="button-save-task" disabled={!name.trim() || pending} onClick={submit}>
            {pending ? "Saving…" : task ? "Save" : "Add Task"}
          </PrimaryButton>
        </div>
      </div>
    </AxelModal>
  );
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const c = useThemeColors();
  return (
    <AxelModal isOpen onClose={onCancel} title={title}>
      <div style={{ width: "400px", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "18px" }}>
        <p style={{ margin: 0, fontSize: "14px", color: c.textSecondary, lineHeight: 1.5 }}>{body}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton data-testid="button-confirm" disabled={pending} onClick={onConfirm}>
            {pending ? "Working…" : confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </AxelModal>
  );
}
