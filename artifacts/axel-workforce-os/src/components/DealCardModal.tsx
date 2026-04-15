import { useState, useEffect, useCallback } from "react";
import {
  GlassCard,
  PinkButton,
  GhostButton,
  Badge,
} from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import ProposalPanel from "@/components/ProposalPanel";
import {
  X,
  Copy,
  Check,
  ChevronRight,
  Plus,
  FileText,
  Clock,
  User,
  Calculator,
  FileSignature,
} from "lucide-react";
import BindStatusPanel from "@/components/submission/BindStatusPanel";
import { AppetiteBadge } from "@/components/AppetiteBadge";

const STAGES = [
  { num: 1, key: "SUBMISSION_REVIEW", label: "Submission Review" },
  { num: 2, key: "INDICATION", label: "Indication" },
  { num: 3, key: "UW_REVIEW", label: "U/W Review" },
  { num: 4, key: "APPROVED_QUOTED", label: "Approved / Quoted" },
  { num: 5, key: "BIND_ORDER", label: "Bind Order" },
  { num: 6, key: "BOUND", label: "Bound" },
  { num: 7, key: "CLIENT", label: "Client" },
  { num: 8, key: "LOST", label: "Lost" },
];

const PLACEHOLDER_USERS = [
  { id: "u1", name: "Alex Morgan" },
  { id: "u2", name: "Sarah Chen" },
  { id: "u3", name: "James Rivera" },
  { id: "u4", name: "Priya Patel" },
];

const TASK_TEMPLATES: Record<string, string[]> = {
  "WC New Business": [
    "Collect ACORD applications",
    "Run loss history report",
    "Verify class codes",
    "Submit to underwriting",
    "Send proposal to client",
  ],
  "PEO Onboarding": [
    "Collect employee census",
    "Verify payroll records",
    "Run background checks",
    "Set up benefits enrollment",
    "Configure payroll system",
    "Schedule orientation",
    "Complete compliance review",
  ],
  Renewal: [
    "Pull expiring policy data",
    "Run updated loss runs",
    "Prepare renewal proposal",
    "Submit renewal application",
  ],
};

interface Deal {
  id: string;
  referenceCode: string;
  businessName?: string;
  vertical?: string;
  productType?: string;
  state?: string;
  annualPayroll?: string;
  employeeCountFt?: number;
  stage?: string;
  wcPremium?: string;
  wfsPepmRate?: string;
  bindStatus?: string;
}

interface ActivityEntry {
  id: string;
  description: string;
  eventType: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

interface TaskEntry {
  id: string;
  taskName: string;
  assignedTo?: string;
  dueDate?: string;
  status?: string;
  completedAt?: string;
}

interface QuoteRecord {
  id: string;
  dealId: string;
  wcRatingBreakdown: any;
  wfsRatingBreakdown: any;
  ratedAt: string;
  classCode?: string;
  state?: string;
  annualPayroll?: string;
  headcount?: number;
  eMod?: string;
  scheduleRating?: string;
}

interface DealCardModalProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onDealUpdated?: () => void;
}

function formatCurrency(val: string | number | undefined | null): string {
  if (!val) return "Not yet rated";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n) || n === 0) return "Not yet rated";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

type TabKey = "activity" | "quote" | "proposal" | "bind";

export default function DealCardModal({ dealId, isOpen, onClose, onDealUpdated }: DealCardModalProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [quoteRecord, setQuoteRecord] = useState<QuoteRecord | null>(null);
  const [listenerEmail, setListenerEmail] = useState("");
  const [noteText, setNoteText] = useState("");
  const [copied, setCopied] = useState(false);
  const [dealDocuments, setDealDocuments] = useState<Array<{ id: string; name: string; documentType: string; status: string; generatedAt: string }>>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ businessName: "", state: "", annualPayroll: "", employeeCountFt: "" });
  const [taskForm, setTaskForm] = useState({ taskName: "", assignedTo: "", dueDate: "" });
  const [showMentions, setShowMentions] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("activity");
  const [appetiteData, setAppetiteData] = useState<Array<{ state: string; class_code: string; uw_determination: string; uw_considerations: string | null }>>([]);

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    color: textPrimary,
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  };

  const fetchDeal = useCallback(async () => {
    try {
      const d = await api.get<Deal>(`/deals/${dealId}`);
      setDeal(d);
      setEditForm({
        businessName: d.businessName || "",
        state: d.state || "",
        annualPayroll: d.annualPayroll || "",
        employeeCountFt: String(d.employeeCountFt || ""),
      });
    } catch (err) {
      console.error("Failed to fetch deal:", err);
    }
  }, [dealId]);

  const fetchActivity = useCallback(async () => {
    try {
      const rows = await api.get<ActivityEntry[]>(`/deals/${dealId}/activity`);
      setActivity(rows);
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    }
  }, [dealId]);

  const fetchTasks = useCallback(async () => {
    try {
      const rows = await api.get<TaskEntry[]>(`/deals/${dealId}/tasks`);
      setTasks(rows);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  }, [dealId]);

  const fetchEmail = useCallback(async () => {
    try {
      const row = await api.get<{ emailAddress?: string } | null>(`/deals/${dealId}/email`);
      if (row?.emailAddress) setListenerEmail(row.emailAddress);
    } catch {
      setListenerEmail("");
    }
  }, [dealId]);

  const fetchQuote = useCallback(async () => {
    try {
      const row = await api.get<QuoteRecord>(`/quotes/by-deal/${dealId}`);
      setQuoteRecord(row);
    } catch {
      setQuoteRecord(null);
    }
  }, [dealId]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get<{ documents: typeof dealDocuments }>(`/submission/deal-documents/${dealId}`);
      setDealDocuments(res.documents || []);
    } catch {
      setDealDocuments([]);
    }
  }, [dealId]);

  const fetchAppetite = useCallback(async (state: string, classCode?: string) => {
    if (!state) return;
    try {
      const codes = classCode ? [classCode] : [];
      if (codes.length === 0) {
        const res = await api.get<{ uwDetermination: string; uwConsiderations: string | null }>(`/appetite/${state}/0000`);
        setAppetiteData([{ state, class_code: "0000", uw_determination: res.uwDetermination, uw_considerations: res.uwConsiderations }]);
      } else {
        const lookups = codes.map(c => ({ state, class_code: c }));
        const res = await api.post<{ results: typeof appetiteData }>("/appetite/batch", { lookups });
        setAppetiteData(res.results || []);
      }
    } catch {
      setAppetiteData([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !dealId) return;
    setDeal(null);
    setActivity([]);
    setTasks([]);
    setQuoteRecord(null);
    setDealDocuments([]);
    setListenerEmail("");
    setNoteText("");
    setEditMode(false);
    setShowAddTask(false);
    setShowTemplates(false);
    setActiveTab("activity");
    setAppetiteData([]);
    fetchDeal();
    fetchActivity();
    fetchTasks();
    fetchEmail();
    fetchQuote();
    fetchDocuments();
  }, [isOpen, dealId, fetchDeal, fetchActivity, fetchTasks, fetchEmail, fetchQuote, fetchDocuments]);

  useEffect(() => {
    if (deal?.state && quoteRecord?.classCode) {
      fetchAppetite(deal.state, quoteRecord.classCode);
    } else if (deal?.state) {
      fetchAppetite(deal.state);
    }
  }, [deal?.state, quoteRecord?.classCode, fetchAppetite]);

  if (!isOpen) return null;

  const currentStage = STAGES.find((s) => s.key === deal?.stage) || STAGES[0];
  const nextStage = STAGES.find((s) => s.num === currentStage.num + 1);

  const handleAdvanceStage = async () => {
    if (!nextStage || !deal) return;
    try {
      await api.patch(`/deals/${dealId}`, { stage: nextStage.key });
      await api.post(`/deals/${dealId}/activity`, {
        entityType: "deal",
        entityId: dealId,
        eventType: "STAGE_CHANGE",
        description: `Stage advanced from ${currentStage.label} to ${nextStage.label}`,
      });
      fetchDeal();
      fetchActivity();
      onDealUpdated?.();
    } catch (err) {
      console.error("Failed to advance stage:", err);
    }
  };

  const handlePostNote = async () => {
    if (!noteText.trim()) return;
    try {
      await api.post(`/deals/${dealId}/activity`, {
        entityType: "deal",
        entityId: dealId,
        eventType: "NOTE",
        description: noteText.trim(),
      });
      setNoteText("");
      fetchActivity();
    } catch (err) {
      console.error("Failed to post note:", err);
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "@") {
      setShowMentions(true);
    }
  };

  const insertMention = (name: string) => {
    setNoteText((prev) => prev + `@${name} `);
    setShowMentions(false);
    console.log(`Notification triggered for @${name}`);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(listenerEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddTask = async () => {
    if (!taskForm.taskName) return;
    try {
      await api.post("/tasks", {
        dealId,
        taskName: taskForm.taskName,
        assignedTo: taskForm.assignedTo || undefined,
        dueDate: taskForm.dueDate || undefined,
        status: "OPEN",
      });
      await api.post(`/deals/${dealId}/activity`, {
        entityType: "task",
        entityId: dealId,
        eventType: "TASK_CREATED",
        description: `Task added: ${taskForm.taskName}`,
      });
      setTaskForm({ taskName: "", assignedTo: "", dueDate: "" });
      setShowAddTask(false);
      fetchTasks();
      fetchActivity();
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const handleToggleTask = async (task: TaskEntry) => {
    const isCompleting = task.status !== "COMPLETED";
    try {
      const patch: Record<string, unknown> = { status: isCompleting ? "COMPLETED" : "OPEN" };
      if (isCompleting) patch.completedAt = new Date().toISOString();
      await api.patch(`/tasks/${task.id}`, patch);
      if (isCompleting) {
        await api.post(`/deals/${dealId}/activity`, {
          entityType: "task",
          entityId: task.id,
          eventType: "TASK_COMPLETED",
          description: `Task completed: ${task.taskName}`,
        });
      }
      fetchTasks();
      fetchActivity();
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleApplyTemplate = async (templateName: string) => {
    const templateTasks = TASK_TEMPLATES[templateName];
    if (!templateTasks) return;
    try {
      for (const taskName of templateTasks) {
        await api.post("/tasks", { dealId, taskName, status: "OPEN" });
      }
      await api.post(`/deals/${dealId}/activity`, {
        entityType: "deal",
        entityId: dealId,
        eventType: "TEMPLATE_APPLIED",
        description: `Task template applied: ${templateName} (${templateTasks.length} tasks)`,
      });
      setShowTemplates(false);
      fetchTasks();
      fetchActivity();
    } catch (err) {
      console.error("Failed to apply template:", err);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.patch(`/deals/${dealId}`, {
        businessName: editForm.businessName,
        state: editForm.state,
        annualPayroll: editForm.annualPayroll || undefined,
        employeeCountFt: editForm.employeeCountFt ? parseInt(editForm.employeeCountFt) : undefined,
      });
      setEditMode(false);
      fetchDeal();
      onDealUpdated?.();
    } catch (err) {
      console.error("Failed to save edits:", err);
    }
  };

  const handleRequote = () => {
    onClose();
    navigate("/marketplace/quote/new", {
      state: {
        vertical: deal?.vertical || "Cannabis",
        quoteType: deal?.productType === "PEO" ? "PEO+WC" : "WC Only",
        prefill: {
          businessName: deal?.businessName || "",
          state: quoteRecord?.state || deal?.state || "",
          annualPayroll: quoteRecord?.annualPayroll || deal?.annualPayroll || "",
          employeeCount: String(quoteRecord?.headcount || deal?.employeeCountFt || ""),
          classCode: quoteRecord?.classCode || "",
          eMod: quoteRecord?.eMod || "1.0",
          scheduleRating: quoteRecord?.scheduleRating || "1.0",
        },
      },
    });
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "activity", label: "Activity & Tasks", icon: Clock },
    { key: "quote", label: "Quote", icon: Calculator },
    { key: "proposal", label: "Proposal", icon: FileText },
    { key: "bind", label: "Bind", icon: FileSignature },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        padding: "24px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          background: isDark ? "rgba(14,14,18,0.82)" : "rgba(250,250,252,0.78)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          boxShadow: isDark
            ? "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "0 24px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
          border: `1px solid ${borderSubtle}`,
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${borderSubtle}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: textPrimary, margin: 0 }}>
                {deal?.businessName || "Loading..."}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                {deal?.vertical && <span style={{ fontSize: "13px", color: textMuted }}>{deal.vertical}</span>}
                {deal?.productType && (
                  <Badge
                    label={deal.productType === "PEO" ? "PEO" : "WC"}
                    color={deal.productType === "PEO" ? "#E91E8C" : "#1E6BE9"}
                  />
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "12px", color: textMuted }}>
                Stage {currentStage.num} — {currentStage.label}
              </span>
            </div>
            {nextStage && (
              <PinkButton
                onClick={handleAdvanceStage}
                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 14px", fontSize: "13px" }}
              >
                Advance Stage
                <ChevronRight style={{ width: "14px", height: "14px" }} />
              </PinkButton>
            )}

            <div style={{ display: "flex", marginLeft: "8px" }}>
              {PLACEHOLDER_USERS.slice(0, 3).map((u, i) => (
                <div
                  key={u.id}
                  title={u.name}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: `hsl(${(i * 120 + 200) % 360}, 50%, 50%)`,
                    border: `2px solid ${isDark ? "#0e0e12" : "#fafafc"}`,
                    marginLeft: i > 0 ? "-8px" : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#fff",
                    cursor: "default",
                  }}
                >
                  {u.name.charAt(0)}
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: textMuted,
                padding: "6px",
                marginLeft: "4px",
              }}
            >
              <X style={{ width: "20px", height: "20px" }} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", borderBottom: `1px solid ${borderSubtle}`, paddingLeft: "24px", flexShrink: 0 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: "none",
                  borderBottom: isActive ? "2px solid #E91E8C" : "2px solid transparent",
                  cursor: "pointer",
                  background: "transparent",
                  color: isActive ? "#E91E8C" : textMuted,
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                <TabIcon style={{ width: "14px", height: "14px" }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* BODY */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* LEFT COLUMN */}
          <div
            style={{
              flex: "0 0 65%",
              borderRight: `1px solid ${borderSubtle}`,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {activeTab === "activity" && (
              <>
                {/* LISTENER EMAIL */}
                {listenerEmail && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      background: inputBg,
                      borderRadius: "8px",
                      border: `1px solid ${borderSubtle}`,
                    }}
                  >
                    <FileText style={{ width: "14px", height: "14px", color: textMuted, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: textMuted, flexShrink: 0 }}>Listener:</span>
                    <span style={{ fontSize: "12px", color: textPrimary, fontFamily: "monospace" }}>{listenerEmail}</span>
                    <button
                      onClick={handleCopyEmail}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: textMuted, padding: "2px", marginLeft: "auto" }}
                    >
                      {copied ? <Check style={{ width: "14px", height: "14px", color: "#22c55e" }} /> : <Copy style={{ width: "14px", height: "14px" }} />}
                    </button>
                  </div>
                )}

                {/* ACTIVITY FEED */}
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>Activity</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto", marginBottom: "12px" }}>
                    {activity.length === 0 && (
                      <p style={{ fontSize: "13px", color: textMuted }}>No activity yet.</p>
                    )}
                    {activity.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          gap: "10px",
                          padding: "10px 12px",
                          background: inputBg,
                          borderRadius: "8px",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: a.eventType === "NOTE" ? "rgba(233,30,140,0.15)" : "rgba(59,130,246,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          {a.eventType === "NOTE" ? (
                            <User style={{ width: "12px", height: "12px", color: "#E91E8C" }} />
                          ) : (
                            <Clock style={{ width: "12px", height: "12px", color: "#3b82f6" }} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "13px", color: textPrimary, margin: 0 }}>{a.description}</p>
                          <span style={{ fontSize: "11px", color: textMuted }}>
                            {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* NOTE INPUT */}
                  <div style={{ position: "relative" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          handleNoteKeyDown(e);
                          if (e.key === "Enter") handlePostNote();
                        }}
                        placeholder="Add a note... (use @ to mention)"
                        style={{ ...inputStyle, flex: 1 }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#E91E8C")}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = inputBorder;
                          setTimeout(() => setShowMentions(false), 200);
                        }}
                      />
                      <PinkButton onClick={handlePostNote} style={{ padding: "8px 16px", fontSize: "13px" }}>
                        Post
                      </PinkButton>
                    </div>
                    {showMentions && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "100%",
                          left: 0,
                          marginBottom: "4px",
                          background: isDark ? "rgba(20,20,24,0.98)" : "rgba(255,255,255,0.98)",
                          border: `1px solid ${borderSubtle}`,
                          borderRadius: "8px",
                          overflow: "hidden",
                          zIndex: 10,
                          minWidth: "180px",
                        }}
                      >
                        {PLACEHOLDER_USERS.map((u) => (
                          <button
                            key={u.id}
                            onMouseDown={() => insertMention(u.name)}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 14px",
                              border: "none",
                              background: "transparent",
                              color: textPrimary,
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = inputBg; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            @{u.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* TASKS SECTION */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: 0 }}>Tasks</h3>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <GhostButton
                        onClick={() => setShowTemplates(true)}
                        style={{ padding: "5px 12px", fontSize: "12px" }}
                      >
                        Use Template
                      </GhostButton>
                      <PinkButton
                        onClick={() => setShowAddTask(!showAddTask)}
                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px", fontSize: "12px" }}
                      >
                        <Plus style={{ width: "12px", height: "12px" }} />
                        Add Task
                      </PinkButton>
                    </div>
                  </div>

                  {showAddTask && (
                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        value={taskForm.taskName}
                        onChange={(e) => setTaskForm((p) => ({ ...p, taskName: e.target.value }))}
                        placeholder="Task name"
                        style={{ ...inputStyle, flex: "2 1 200px" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#E91E8C")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = inputBorder)}
                      />
                      <select
                        value={taskForm.assignedTo}
                        onChange={(e) => setTaskForm((p) => ({ ...p, assignedTo: e.target.value }))}
                        style={{ ...inputStyle, flex: "1 1 140px", cursor: "pointer", appearance: "auto" }}
                      >
                        <option value="" style={{ background: isDark ? "#141418" : "#fff" }}>Assign to</option>
                        {PLACEHOLDER_USERS.map((u) => (
                          <option key={u.id} value={u.id} style={{ background: isDark ? "#141418" : "#fff" }}>{u.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
                        style={{ ...inputStyle, flex: "1 1 130px" }}
                      />
                      <GhostButton onClick={handleAddTask} style={{ padding: "8px 14px", fontSize: "12px" }}>
                        Save Task
                      </GhostButton>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {tasks.length === 0 && !showAddTask && (
                      <p style={{ fontSize: "13px", color: textMuted }}>No tasks yet.</p>
                    )}
                    {tasks.map((task) => {
                      const isComplete = task.status === "COMPLETED";
                      const assignee = PLACEHOLDER_USERS.find((u) => u.id === task.assignedTo);
                      return (
                        <div
                          key={task.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: inputBg,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isComplete}
                            onChange={() => handleToggleTask(task)}
                            style={{ width: "16px", height: "16px", accentColor: "#E91E8C", cursor: "pointer" }}
                          />
                          <span
                            style={{
                              flex: 1,
                              fontSize: "13px",
                              color: isComplete ? textMuted : textPrimary,
                              textDecoration: isComplete ? "line-through" : "none",
                            }}
                          >
                            {task.taskName}
                          </span>
                          {assignee && (
                            <span style={{ fontSize: "11px", color: textMuted }}>{assignee.name}</span>
                          )}
                          {task.dueDate && (
                            <span style={{ fontSize: "11px", color: textMuted }}>{task.dueDate}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === "quote" && (
              <div>
                {quoteRecord && quoteRecord.wcRatingBreakdown ? (
                  <ProposalPanel
                    businessName={deal?.businessName || ""}
                    quoteType={deal?.productType === "PEO" ? "PEO+WC" : "WC Only"}
                    wcBreakdown={quoteRecord.wcRatingBreakdown?.data || quoteRecord.wcRatingBreakdown}
                    wfsBreakdown={quoteRecord.wfsRatingBreakdown?.data || quoteRecord.wfsRatingBreakdown}
                    readOnly
                    ratedAt={quoteRecord.ratedAt}
                  />
                ) : (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <Calculator style={{ width: "40px", height: "40px", color: textMuted, marginBottom: "12px" }} />
                    <p style={{ fontSize: "15px", color: textPrimary, margin: "0 0 8px" }}>No quote on file</p>
                    <p style={{ fontSize: "13px", color: textMuted, margin: "0 0 16px" }}>Generate a quote from the Marketplace.</p>
                    <GhostButton
                      onClick={() => {
                        onClose();
                        navigate("/marketplace");
                      }}
                      style={{ padding: "8px 20px" }}
                    >
                      Go to Marketplace
                    </GhostButton>
                  </div>
                )}

                {quoteRecord && quoteRecord.wcRatingBreakdown && (
                  <div style={{ marginTop: "16px", textAlign: "center" }}>
                    <GhostButton onClick={handleRequote} style={{ padding: "8px 20px" }}>
                      Requote
                    </GhostButton>
                  </div>
                )}
              </div>
            )}

            {activeTab === "proposal" && (
              <ProposalTabInline dealId={dealId} />
            )}

            {activeTab === "bind" && (
              <div style={{ padding: "0 4px" }}>
                <BindStatusPanel dealId={dealId} bindStatus={deal?.bindStatus || "not_started"} />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div
            style={{
              flex: "0 0 35%",
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* DEAL DETAILS */}
            <GlassCard padding="16px">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: 0 }}>Deal Details</h3>
                <GhostButton
                  onClick={() => {
                    if (editMode) handleSaveEdit();
                    else setEditMode(true);
                  }}
                  style={{ padding: "4px 12px", fontSize: "12px" }}
                >
                  {editMode ? "Save" : "Edit Details"}
                </GhostButton>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {editMode ? (
                  <>
                    <DetailField label="Business Name" isDark={isDark}>
                      <input
                        type="text"
                        value={editForm.businessName}
                        onChange={(e) => setEditForm((p) => ({ ...p, businessName: e.target.value }))}
                        style={inputStyle}
                      />
                    </DetailField>
                    <DetailField label="State" isDark={isDark}>
                      <input
                        type="text"
                        value={editForm.state}
                        onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value }))}
                        style={inputStyle}
                      />
                    </DetailField>
                    <DetailField label="Annual Payroll" isDark={isDark}>
                      <input
                        type="text"
                        value={editForm.annualPayroll}
                        onChange={(e) => setEditForm((p) => ({ ...p, annualPayroll: e.target.value.replace(/[^0-9]/g, "") }))}
                        style={inputStyle}
                      />
                    </DetailField>
                    <DetailField label="Headcount" isDark={isDark}>
                      <input
                        type="number"
                        value={editForm.employeeCountFt}
                        onChange={(e) => setEditForm((p) => ({ ...p, employeeCountFt: e.target.value }))}
                        style={inputStyle}
                      />
                    </DetailField>
                  </>
                ) : (
                  <>
                    <DetailRow label="Business Name" value={deal?.businessName} isDark={isDark} />
                    <DetailRow label="Vertical" value={deal?.vertical} isDark={isDark} />
                    <DetailRow label="Quote Type" value={deal?.productType === "PEO" ? "PEO+WC" : "WC Only"} isDark={isDark} />
                    <DetailRow label="State" value={deal?.state} isDark={isDark} />
                    <DetailRow label="Annual Payroll" value={deal?.annualPayroll ? formatCurrency(deal.annualPayroll) : "—"} isDark={isDark} />
                    <DetailRow label="Headcount" value={deal?.employeeCountFt ? String(deal.employeeCountFt) : "—"} isDark={isDark} />
                    <DetailRow label="WC Premium" value={formatCurrency(deal?.wcPremium)} isDark={isDark} />
                    {deal?.productType === "PEO" && (
                      <DetailRow label="WFS PEPM" value={formatCurrency(deal?.wfsPepmRate)} isDark={isDark} />
                    )}
                  </>
                )}
              </div>
            </GlassCard>

            {/* APPETITE */}
            <GlassCard padding="16px">
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>Underwriting Appetite</h3>
              {appetiteData.length === 0 ? (
                <p style={{ fontSize: "13px", color: textMuted, margin: 0 }}>
                  {deal?.state ? "Loading appetite data..." : "Set a state to view appetite."}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {appetiteData.map((a) => (
                    <div
                      key={`${a.state}:${a.class_code}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        padding: "8px 10px",
                        background: inputBg,
                        borderRadius: "8px",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: textMuted, fontFamily: "monospace" }}>
                        {a.state} / {a.class_code}
                      </span>
                      <AppetiteBadge
                        determination={a.uw_determination}
                        considerations={a.uw_considerations}
                      />
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* DOCUMENTS */}
            <GlassCard padding="16px">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: 0 }}>Documents</h3>
                <Badge style={{ fontSize: "11px" }}>{dealDocuments.length}</Badge>
              </div>
              {dealDocuments.length === 0 ? (
                <p style={{ fontSize: "13px", color: textMuted, margin: 0 }}>
                  No documents generated yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {dealDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 10px",
                        background: inputBg,
                        borderRadius: "8px",
                        border: `1px solid ${borderSubtle}`,
                      }}
                    >
                      <FileText style={{ width: "16px", height: "16px", color: "#E91E8C", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "12px", fontWeight: 600, color: textPrimary, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.name}
                        </p>
                        <p style={{ fontSize: "11px", color: textMuted, margin: 0 }}>
                          {doc.documentType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — {new Date(doc.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* TEMPLATE MODAL */}
      {showTemplates && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTemplates(false); }}
        >
          <div
            style={{
              background: isDark ? "rgba(20,20,24,0.98)" : "rgba(255,255,255,0.98)",
              border: `1px solid ${borderSubtle}`,
              borderRadius: "12px",
              padding: "24px",
              minWidth: "400px",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: "0 0 16px" }}>Task Templates</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(TASK_TEMPLATES).map(([name, taskList]) => (
                <div
                  key={name}
                  style={{
                    padding: "12px 16px",
                    background: inputBg,
                    borderRadius: "8px",
                    border: `1px solid ${borderSubtle}`,
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onClick={() => handleApplyTemplate(name)}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(233,30,140,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderSubtle; }}
                >
                  <p style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>{name}</p>
                  <p style={{ fontSize: "12px", color: textMuted, margin: 0 }}>{taskList.length} tasks</p>
                </div>
              ))}
            </div>
            <GhostButton onClick={() => setShowTemplates(false)} style={{ marginTop: "16px", padding: "8px 16px" }}>
              Cancel
            </GhostButton>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, isDark }: { label: string; value?: string; isDark: boolean }) {
  return (
    <div>
      <span style={{ fontSize: "11px", fontWeight: 500, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
        {label}
      </span>
      <p style={{ fontSize: "13px", color: isDark ? "#fff" : "#111", margin: "2px 0 0" }}>
        {value || "—"}
      </p>
    </div>
  );
}

function DetailField({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: "11px", fontWeight: 500, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", display: "block", marginBottom: "4px" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function ProposalTabInline({ dealId }: { dealId: string }) {
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    load();
  }, [dealId]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ proposal: any }>(`/proposals/${dealId}`);
      setProposal(data.proposal);
    } catch {
      setProposal(null);
    }
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    setErrMsg("");
    try {
      const data = await api.post<{ success: boolean; proposal: any }>(`/proposals/${dealId}/create-from-quote`, {});
      setProposal(data.proposal);
    } catch (err: any) {
      setErrMsg(err.message || "Failed to generate proposal. Make sure a quote exists.");
    }
    setCreating(false);
  }

  function fmt(val: string | null) {
    if (!val) return "\u2014";
    const n = Number(val);
    return isNaN(n) ? "\u2014" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function fmtDate(d: string | null) {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  if (loading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
        Loading proposal...
      </div>
    );
  }

  if (!proposal) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <FileText style={{ width: 40, height: 40, color: "rgba(255,255,255,0.2)", marginBottom: 12 }} />
        <p style={{ fontSize: 15, color: "#fff", margin: "0 0 8px" }}>No proposal yet</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 16px" }}>
          Generate a proposal from the deal's quote data.
        </p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 22px", borderRadius: 8, border: "none",
            background: "#E91E8C", color: "#fff", cursor: creating ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 600,
          }}
        >
          {creating ? "Creating..." : "Generate Proposal"}
        </button>
        {errMsg && (
          <p style={{ marginTop: 12, color: "#ff4d4f", fontSize: 13 }}>{errMsg}</p>
        )}
      </div>
    );
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "rgba(255,255,255,0.5)" },
    approved_proposal_requested: { label: "UW Submitted", color: "#ffb74d" },
    underwriting_notified: { label: "UW Notified", color: "#4caf50" },
    accepted: { label: "Accepted", color: "#4caf50" },
    declined: { label: "Declined", color: "#ff4d4f" },
  };
  const st = statusMap[proposal.status] || statusMap.draft;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: "0 0 2px" }}>
            {proposal.programName || "Workers' Comp Proposal"}
          </h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            {proposal.carrierName || "Carrier TBD"} {"\u00b7"} {fmtDate(proposal.createdAt)}
          </p>
        </div>
        <span style={{
          padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600,
          color: st.color, background: `${st.color}18`, border: `1px solid ${st.color}33`,
        }}>
          {st.label}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "WC Annual", value: fmt(proposal.wcAnnualPremium), accent: true },
          { label: "WC Monthly", value: fmt(proposal.wcMonthlyPremium) },
          { label: "WFS PEPM", value: fmt(proposal.wfsMonthlyPepm) },
        ].map((c) => (
          <div key={c.label} style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${c.accent ? "rgba(233,30,140,0.2)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 8, padding: "12px 14px",
          }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", margin: "0 0 4px", letterSpacing: "0.3px" }}>{c.label}</p>
            <p style={{ color: c.accent ? "#E91E8C" : "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "12px 14px" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", margin: "0 0 4px" }}>Total Monthly</p>
          <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>{fmt(proposal.totalMonthly)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "12px 14px" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", margin: "0 0 4px" }}>Total Annual</p>
          <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>{fmt(proposal.totalAnnual)}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Effective</span>
          <p style={{ fontSize: 13, color: "#fff", margin: "2px 0 0", fontWeight: 500 }}>{fmtDate(proposal.effectiveDate)}</p>
        </div>
        <div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Expiration</span>
          <p style={{ fontSize: 13, color: "#fff", margin: "2px 0 0", fontWeight: 500 }}>{fmtDate(proposal.expirationDate)}</p>
        </div>
        <div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>EMod</span>
          <p style={{ fontSize: 13, color: "#fff", margin: "2px 0 0", fontWeight: 500 }}>{proposal.emod ? `${proposal.emod}x` : "\u2014"}</p>
        </div>
        <div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Carrier</span>
          <p style={{ fontSize: 13, color: "#fff", margin: "2px 0 0", fontWeight: 500 }}>{proposal.carrierName || "\u2014"}</p>
        </div>
      </div>
    </div>
  );
}

export function openDealCard(dealId: string): void {
  const event = new CustomEvent("open-deal-card", { detail: { dealId } });
  window.dispatchEvent(event);
}
