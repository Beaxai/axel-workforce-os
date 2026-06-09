import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
import MultiLocationRatingPanel from "@/components/MultiLocationRatingPanel";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import {
  X,
  Copy,
  Check,
  ChevronRight,
  Plus,
  FileText,
  Clock,
  Calculator,
  FileSignature,
  MessageSquare,
  Upload,
  PenLine,
  CircleDot,
  ArrowRight,
  Mail,
  HelpCircle,
  Cog,
  StickyNote,
  CheckSquare,
  Send,
  AlertTriangle,
} from "lucide-react";
import BindStatusPanel from "@/components/submission/BindStatusPanel";
import { AppetiteBadge } from "@/components/AppetiteBadge";
import { sections as cannabisAppSections } from "@workspace/cannabis-application";
import { PLACEHOLDER_USERS, CURRENT_USER, resolveActor } from "@/lib/users";
import { getVerticalIcon } from "@/lib/vertical-icons";

type CannabisAppPdfLink = { documentType: string; label: string; path: string };
type CannabisAppData = {
  dealId: string;
  submissionId: string;
  answers: Record<string, unknown>;
  status?: string | null;
  submittedAt?: string | null;
  pdfs: CannabisAppPdfLink[];
};

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

const actorMeta = (extra: Record<string, unknown> = {}) => ({
  userId: CURRENT_USER.id,
  userName: CURRENT_USER.name,
  ...extra,
});

function formatRelative(iso?: string): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const s = Math.round(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

type EventMeta = { Icon: typeof Clock; label: string };
const EVENT_META: Record<string, EventMeta> = {
  NOTE: { Icon: StickyNote, label: "Note" },
  STAGE_CHANGE: { Icon: ArrowRight, label: "Stage change" },
  TASK_CREATED: { Icon: Plus, label: "Task created" },
  TASK_COMPLETED: { Icon: CheckSquare, label: "Task completed" },
  TEMPLATE_APPLIED: { Icon: CircleDot, label: "Template applied" },
  submission_submitted: { Icon: Send, label: "Submission" },
  submission_completed: { Icon: Check, label: "Submission completed" },
  submission_updated: { Icon: PenLine, label: "Submission updated" },
  bind_requested: { Icon: FileSignature, label: "Bind requested" },
  proposal_created: { Icon: FileText, label: "Proposal" },
  approved_proposal_requested: { Icon: Send, label: "UW requested" },
  uw_package_sent: { Icon: Mail, label: "UW package sent" },
  uw_package_failed: { Icon: AlertTriangle, label: "UW package failed" },
  loss_history_uploaded: { Icon: Upload, label: "Loss history" },
  document_uploaded: { Icon: Upload, label: "Document uploaded" },
  document_request_sent: { Icon: Mail, label: "Documents requested" },
  additional_info_requested: { Icon: HelpCircle, label: "Info requested" },
  signature_reminder_sent: { Icon: Mail, label: "Signature reminder" },
  signature_signed: { Icon: PenLine, label: "Signature" },
  signature_declined: { Icon: AlertTriangle, label: "Signature declined" },
  signature_expired: { Icon: AlertTriangle, label: "Signature expired" },
};
const DEFAULT_EVENT_META: EventMeta = { Icon: Cog, label: "System" };

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
  workforceProfile?: any;
  ratedAt: string;
  classCode?: string;
  state?: string;
  annualPayroll?: string;
  headcount?: number;
  eMod?: string;
  scheduleRating?: string;
  isPeo?: boolean;
  wcIndicationMin?: string | null;
  wcIndicationMax?: string | null;
  wcFinalPremium?: string | null;
  pepm?: string | null;
  peoPepm?: string | null;
  monthlyWfsFee?: string | null;
  peoAnnualTotal?: string | null;
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
  const [cannabisApp, setCannabisApp] = useState<CannabisAppData | null>(null);
  const [showAllAppFields, setShowAllAppFields] = useState(false);

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

  const fetchCannabisApp = useCallback(async () => {
    try {
      const res = await api.get<CannabisAppData>(`/submission/applications/${dealId}`);
      setCannabisApp(res);
    } catch {
      setCannabisApp(null);
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
    setCannabisApp(null);
    setShowAllAppFields(false);
    setTaskForm({ taskName: "", assignedTo: "", dueDate: "" });
    setShowMentions(false);
    setCopied(false);
    fetchDeal();
    fetchActivity();
    fetchTasks();
    fetchEmail();
    fetchQuote();
    fetchDocuments();
    fetchCannabisApp();
  }, [isOpen, dealId, fetchDeal, fetchActivity, fetchTasks, fetchEmail, fetchQuote, fetchDocuments, fetchCannabisApp]);

  useEffect(() => {
    if (deal?.state && quoteRecord?.classCode) {
      fetchAppetite(deal.state, quoteRecord.classCode);
    } else if (deal?.state) {
      fetchAppetite(deal.state);
    }
  }, [deal?.state, quoteRecord?.classCode, fetchAppetite]);

  if (!isOpen) return null;
  const renderModal = (children: React.ReactNode) =>
    typeof document !== "undefined" ? createPortal(children, document.body) : children;

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
        metadata: actorMeta({ from: currentStage.key, to: nextStage.key }),
      });
      fetchDeal();
      fetchActivity();
      onDealUpdated?.();
      window.dispatchEvent(new CustomEvent("deal-updated", { detail: { dealId } }));
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
        metadata: actorMeta(),
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
        metadata: actorMeta({ taskName: taskForm.taskName, assignedTo: taskForm.assignedTo || null }),
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
          metadata: actorMeta({ taskName: task.taskName }),
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
        metadata: actorMeta({ templateName, taskCount: templateTasks.length }),
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
      window.dispatchEvent(new CustomEvent("deal-updated", { detail: { dealId } }));
    } catch (err) {
      console.error("Failed to save edits:", err);
    }
  };

  const handleRequestDocuments = async () => {
    const what = window.prompt("What documents are you requesting? (e.g. 'Updated loss runs, ACORD 130')");
    if (!what?.trim()) return;
    const recipient = window.prompt("Send request to (email or name):", "");
    try {
      await api.post(`/deals/${dealId}/activity`, {
        entityType: "deal",
        entityId: dealId,
        eventType: "document_request_sent",
        description: `Document request sent${recipient ? " to " + recipient : ""}: ${what.trim()}`,
        metadata: actorMeta({ recipient: recipient || null, items: what.trim() }),
      });
      fetchActivity();
    } catch (err) {
      console.error("Failed to log document request:", err);
    }
  };

  const handleRequestInfo = async () => {
    const what = window.prompt("What information do you need from the client/broker?");
    if (!what?.trim()) return;
    const recipient = window.prompt("Send request to (email or name):", "");
    try {
      await api.post(`/deals/${dealId}/activity`, {
        entityType: "deal",
        entityId: dealId,
        eventType: "additional_info_requested",
        description: `Additional info requested${recipient ? " from " + recipient : ""}: ${what.trim()}`,
        metadata: actorMeta({ recipient: recipient || null, question: what.trim() }),
      });
      fetchActivity();
    } catch (err) {
      console.error("Failed to log info request:", err);
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

  const handleContinueQuote = () => {
    const wp = quoteRecord?.workforceProfile;
    const locations = (wp?.locations || []).map((loc: any) => ({
      id: Math.random().toString(36).substring(2, 9),
      streetAddress: "",
      city: "",
      state: loc.state || "",
      zip: loc.zip || "",
      classCodes: (loc.classCodes || []).map((cc: any) => ({
        classCode: cc.classCode || "",
        description: cc.description || "",
        fullTimeEmployees: cc.fullTimeEmployees || 0,
        partTimeEmployees: cc.partTimeEmployees || 0,
        annualPayroll: cc.annualPayroll || 0,
      })),
    }));
    const coverageType =
      deal?.productType === "PEO" ? "PEO" : deal?.productType === "ASO" ? "ASO" : "WC";
    const eMod = quoteRecord?.eMod || "1.0";
    const store = useQuoteFlowStore.getState();
    store.reset();
    store.update({
      phase: 1,
      currentStep: 5,
      vertical: deal?.vertical || "Cannabis",
      coverageType,
      businessName: deal?.businessName || "",
      ...(locations.length ? { locations } : {}),
      hasExperienceMod: parseFloat(eMod) !== 1 ? "Yes" : "No",
      experienceMod: eMod,
    });
    onClose();
    navigate("/marketplace/quote/wizard");
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "activity", label: "Activity & Tasks", icon: Clock },
    { key: "quote", label: "Quote", icon: Calculator },
    { key: "proposal", label: "Proposal", icon: FileText },
    { key: "bind", label: "Bind", icon: FileSignature },
  ];

  return renderModal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        background: "rgba(0,0,0,0.25)",
        padding: "24px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          background: isDark ? "rgba(18,18,24,0.82)" : "rgba(255,255,255,0.78)",
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
        {(() => {
          const VerticalIcon = getVerticalIcon(deal?.vertical);
          const productLabel = deal?.productType === "PEO" ? "PEO" : deal?.productType === "ASO" ? "ASO" : "WC";
          const assignees = PLACEHOLDER_USERS.slice(0, 3);
          const headcount = deal?.employeeCountFt ? Number(deal.employeeCountFt).toLocaleString() : "—";
          const payroll = deal?.annualPayroll && parseFloat(deal.annualPayroll) > 0
            ? `$${Math.round(Number(deal.annualPayroll)).toLocaleString()}`
            : "—";
          const wcPremiumNum = deal?.wcPremium ? parseFloat(deal.wcPremium) : 0;
          const wcPremium = wcPremiumNum > 0
            ? `$${Math.round(wcPremiumNum).toLocaleString()}`
            : "Not yet rated";
          return (
            <div
              style={{
                padding: "24px 28px 20px",
                borderBottom: `1px solid ${borderSubtle}`,
                flexShrink: 0,
              }}
            >
              {/* Title row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      border: `1px solid ${borderSubtle}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    title={deal?.vertical || ""}
                  >
                    <VerticalIcon style={{ width: "22px", height: "22px", color: textPrimary }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: "22px", fontWeight: 700, color: textPrimary, margin: 0, lineHeight: 1.2 }}>
                      {deal?.businessName || "Loading..."}
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                      {deal?.vertical && <span style={{ fontSize: "12px", color: textMuted }}>{deal.vertical}</span>}
                      {deal?.productType && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            letterSpacing: "0.5px",
                            color: textMuted,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            border: `1px solid ${borderSubtle}`,
                            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                          }}
                        >
                          {productLabel}
                        </span>
                      )}
                      {deal?.referenceCode && (
                        <span style={{ fontSize: "11px", color: textMuted, fontFamily: "monospace" }}>
                          {deal.referenceCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  <span style={{ fontSize: "12px", color: textMuted }}>
                    Stage {currentStage.num} — {currentStage.label}
                  </span>
                  {nextStage && (
                    <PinkButton
                      onClick={handleAdvanceStage}
                      style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 14px", fontSize: "13px" }}
                    >
                      Advance Stage
                      <ChevronRight style={{ width: "14px", height: "14px" }} />
                    </PinkButton>
                  )}
                  <button
                    onClick={onClose}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: textMuted,
                      padding: "6px",
                    }}
                    aria-label="Close"
                  >
                    <X style={{ width: "20px", height: "20px" }} />
                  </button>
                </div>
              </div>

              {/* Assignees row */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "18px" }}>
                <div style={{ display: "flex" }}>
                  {assignees.map((u, i) => (
                    <img
                      key={u.id}
                      src={u.avatarUrl}
                      alt={u.name}
                      title={u.name}
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: `2px solid ${isDark ? "#0e0e12" : "#fafafc"}`,
                        marginLeft: i > 0 ? "-8px" : 0,
                        background: isDark ? "#1a1a20" : "#e5e7eb",
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: "12px", color: textMuted }}>
                  {assignees.map((u) => u.name).join(", ")}
                </span>
              </div>

              {/* Metrics row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "16px" }}>
                {[
                  { label: "Headcount", value: headcount },
                  { label: "Annual Payroll", value: payroll },
                  { label: "WC Premium", value: wcPremium },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      padding: "14px 16px",
                      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)",
                      border: `1px solid ${borderSubtle}`,
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.8px",
                        textTransform: "uppercase",
                        color: textMuted,
                        marginBottom: "6px",
                      }}
                    >
                      {m.label}
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 700, color: textPrimary, lineHeight: 1.1 }}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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
                  borderBottom: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  cursor: "pointer",
                  background: "transparent",
                  color: isActive ? textPrimary : textMuted,
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
                <div
                  style={{
                    padding: "16px",
                    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    border: `1px solid ${borderSubtle}`,
                    borderRadius: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <h3 className="font-heading" style={{ fontSize: "12px", fontWeight: 600, color: textPrimary, margin: 0, letterSpacing: "1px" }}>ACTIVITY</h3>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <GhostButton
                        onClick={handleRequestDocuments}
                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "11px" }}
                      >
                        <Mail style={{ width: "11px", height: "11px" }} />
                        Request Docs
                      </GhostButton>
                      <GhostButton
                        onClick={handleRequestInfo}
                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "11px" }}
                      >
                        <HelpCircle style={{ width: "11px", height: "11px" }} />
                        Request Info
                      </GhostButton>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "320px", overflowY: "auto", marginBottom: "12px" }}>
                    {activity.length === 0 && (
                      <p style={{ fontSize: "13px", color: textMuted, margin: 0 }}>No activity yet.</p>
                    )}
                    {activity.map((a) => {
                      const actor = resolveActor((a as any).createdBy, a.metadata as Record<string, unknown> | undefined);
                      const meta = EVENT_META[a.eventType] || DEFAULT_EVENT_META;
                      const EventIcon = meta.Icon;
                      const actorName = actor?.name
                        || (a.metadata && typeof (a.metadata as any).userName === "string" ? (a.metadata as any).userName : null)
                        || "System";
                      return (
                        <div
                          key={a.id}
                          style={{
                            display: "flex",
                            gap: "10px",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            alignItems: "flex-start",
                            background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                          }}
                        >
                          {/* Actor avatar (or system glyph) */}
                          {actor ? (
                            <img
                              src={actor.avatarUrl}
                              alt={actor.name}
                              title={actor.name}
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                flexShrink: 0,
                                background: isDark ? "#1a1a20" : "#e5e7eb",
                              }}
                            />
                          ) : (
                            <div
                              title="System"
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                color: textMuted,
                              }}
                            >
                              <Cog style={{ width: "14px", height: "14px" }} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                              <EventIcon style={{ width: "12px", height: "12px", color: textMuted, flexShrink: 0 }} />
                              <span style={{ fontSize: "11px", fontWeight: 600, color: textPrimary }}>{actorName}</span>
                              <span style={{ fontSize: "10px", color: textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                · {meta.label}
                              </span>
                              <span
                                title={a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                                style={{ fontSize: "11px", color: textMuted, marginLeft: "auto", flexShrink: 0 }}
                              >
                                {formatRelative(a.createdAt)}
                              </span>
                            </div>
                            <p style={{ fontSize: "13px", color: textPrimary, margin: 0, lineHeight: 1.4 }}>{a.description}</p>
                          </div>
                        </div>
                      );
                    })}
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
                        onFocus={(e) => (e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)")}
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
                      <GhostButton
                        onClick={() => setShowAddTask(!showAddTask)}
                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px", fontSize: "12px" }}
                      >
                        <Plus style={{ width: "12px", height: "12px" }} />
                        Add Task
                      </GhostButton>
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
                        onFocus={(e) => (e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)")}
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
                            style={{ width: "16px", height: "16px", accentColor: isDark ? "#ffffff" : "#111111", cursor: "pointer" }}
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

            {activeTab === "quote" && (() => {
              const hasWcQuote = !!(quoteRecord && quoteRecord.wcRatingBreakdown);
              const productType = deal?.productType;
              const isAsoPeoDeal = productType === "ASO" || productType === "PEO";
              const asoPeoEmployees = Number(quoteRecord?.headcount ?? deal?.employeeCountFt ?? 0);
              const showAsoPeoIndication = !hasWcQuote && isAsoPeoDeal && asoPeoEmployees > 0;
              const canContinue = (quoteRecord?.workforceProfile?.locations?.length ?? 0) > 0;
              const hasIndication = hasWcQuote || showAsoPeoIndication;
              return (
              <div>
                {hasWcQuote ? (
                  (() => {
                    const wcBreakdown =
                      quoteRecord!.wcRatingBreakdown?.data || quoteRecord!.wcRatingBreakdown;
                    const isMultiLocation = Array.isArray(wcBreakdown?.locations);
                    if (isMultiLocation) {
                      return (
                        <MultiLocationRatingPanel
                          businessName={deal?.businessName || ""}
                          wcBreakdown={wcBreakdown}
                          workforceProfile={quoteRecord!.workforceProfile || null}
                          indicationLow={
                            quoteRecord!.wcIndicationMin != null
                              ? Number(quoteRecord!.wcIndicationMin)
                              : null
                          }
                          indicationHigh={
                            quoteRecord!.wcIndicationMax != null
                              ? Number(quoteRecord!.wcIndicationMax)
                              : null
                          }
                          finalPremiumFallback={
                            quoteRecord!.wcFinalPremium != null
                              ? Number(quoteRecord!.wcFinalPremium)
                              : null
                          }
                          ratedAt={quoteRecord!.ratedAt}
                        />
                      );
                    }
                    return (
                      <ProposalPanel
                        businessName={deal?.businessName || ""}
                        quoteType={deal?.productType === "PEO" ? "PEO+WC" : "WC Only"}
                        wcBreakdown={wcBreakdown}
                        wfsBreakdown={
                          quoteRecord!.wfsRatingBreakdown?.data ||
                          quoteRecord!.wfsRatingBreakdown
                        }
                        readOnly
                        ratedAt={quoteRecord!.ratedAt}
                      />
                    );
                  })()
                ) : showAsoPeoIndication ? (
                  (() => {
                    const isAsoDeal = productType === "ASO";
                    const pepm = isAsoDeal
                      ? Number(quoteRecord?.pepm ?? 50)
                      : Number(quoteRecord?.peoPepm ?? deal?.wfsPepmRate ?? 0);
                    const monthly =
                      quoteRecord?.monthlyWfsFee != null
                        ? Number(quoteRecord.monthlyWfsFee)
                        : pepm * asoPeoEmployees;
                    const annual =
                      quoteRecord?.peoAnnualTotal != null
                        ? Number(quoteRecord.peoAnnualTotal)
                        : monthly * 12;
                    const fmtUsd = (n: number) =>
                      n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
                    return (
                      <div
                        style={{
                          borderRadius: "14px",
                          border: `1px solid ${borderSubtle}`,
                          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                          padding: "24px",
                          borderLeft: `3px solid ${isAsoDeal ? "var(--accent-primary)" : "var(--accent-support)"}`,
                        }}
                      >
                        <div className="font-heading" style={{ fontSize: "12px", letterSpacing: "0.08em", color: textMuted, textTransform: "uppercase", marginBottom: "4px" }}>
                          {isAsoDeal ? "WorkPlus OS — Administrative Services" : "Workforce Solutions Program (PEO)"}
                        </div>
                        <div style={{ fontSize: "13px", color: textMuted, marginBottom: "20px" }}>Pricing Indication</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                          {[
                            { label: "Per Employee / Month", value: fmtUsd(pepm) },
                            { label: "Monthly Total", value: fmtUsd(monthly) },
                            { label: "Annual Total", value: fmtUsd(annual) },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              style={{
                                borderRadius: "10px",
                                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                                border: `1px solid ${borderSubtle}`,
                                padding: "14px 16px",
                              }}
                            >
                              <div style={{ fontSize: "11px", color: textMuted, marginBottom: "6px" }}>{stat.label}</div>
                              <div style={{ fontSize: "22px", fontWeight: 700, color: textPrimary }}>{stat.value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: "12px", color: textMuted, marginTop: "16px" }}>
                          Based on {asoPeoEmployees} employee{asoPeoEmployees !== 1 ? "s" : ""}
                          {deal?.annualPayroll ? ` • ${formatCurrency(deal.annualPayroll)} annual payroll` : ""}.
                        </div>
                      </div>
                    );
                  })()
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

                {hasIndication && (
                  <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center" }}>
                    {canContinue && (
                      <PinkButton onClick={handleContinueQuote} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px" }}>
                        Continue Quote
                        <ArrowRight style={{ width: "14px", height: "14px" }} />
                      </PinkButton>
                    )}
                    {hasWcQuote && (
                      <GhostButton onClick={handleRequote} style={{ padding: "8px 20px" }}>
                        Requote
                      </GhostButton>
                    )}
                  </div>
                )}
              </div>
              );
            })()}

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
                    <DetailRow
                      label="Quote Type"
                      value={
                        deal?.productType === "PEO"
                          ? "PEO+WC"
                          : deal?.productType === "ASO"
                            ? "ASO Only"
                            : "WC Only"
                      }
                      isDark={isDark}
                    />
                    <DetailRow label="State" value={deal?.state} isDark={isDark} />
                    <DetailRow label="Annual Payroll" value={deal?.annualPayroll ? formatCurrency(deal.annualPayroll) : "—"} isDark={isDark} />
                    <DetailRow label="Headcount" value={deal?.employeeCountFt ? String(deal.employeeCountFt) : "—"} isDark={isDark} />
                    {deal?.productType === "ASO" ? (
                      <>
                        <DetailRow label="Administrative Services" value="$50.00 PEPM" isDark={isDark} />
                        {deal?.employeeCountFt && (
                          <DetailRow
                            label="Monthly ASO Fee"
                            value={`$${(Number(deal.employeeCountFt) * 50).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            isDark={isDark}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <DetailRow label="WC Premium" value={formatCurrency(deal?.wcPremium)} isDark={isDark} />
                        {deal?.productType === "PEO" && (
                          <DetailRow label="WFS PEPM" value={formatCurrency(deal?.wfsPepmRate)} isDark={isDark} />
                        )}
                      </>
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

            {/* WC APPLICATION (cannabis canonical answers + filled PDFs) */}
            {cannabisApp && (() => {
              const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
              const answers = cannabisApp.answers || {};
              const fmt = (key: string, kind: string): string => {
                const v = (answers as Record<string, unknown>)[key];
                if (v === undefined || v === null || v === "") return "—";
                if (kind === "yn" || kind === "ynna") {
                  const s = String(v).toLowerCase();
                  if (s === "yes") return "Yes";
                  if (s === "no") return "No";
                  if (s === "na") return "N/A";
                  return String(v);
                }
                if (kind === "checkbox") return v ? "Yes" : "No";
                if (Array.isArray(v)) return v.length === 0 ? "—" : v.join(", ");
                if (typeof v === "object") return JSON.stringify(v);
                return String(v);
              };
              return (
                <GlassCard padding="16px">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: textPrimary, margin: 0 }}>
                      WC Application
                    </h3>
                    <Badge label="Cannabis" />
                  </div>
                  {/* PDF download buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                    {cannabisApp.pdfs.map((pdf) => (
                      <a
                        key={pdf.documentType}
                        href={`${apiBase}${pdf.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          background: inputBg,
                          borderRadius: "8px",
                          border: `1px solid ${borderSubtle}`,
                          textDecoration: "none",
                          color: textPrimary,
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = borderSubtle;
                        }}
                      >
                        <FileText style={{ width: "16px", height: "16px", color: textMuted, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "12px", fontWeight: 600, color: textPrimary, margin: 0 }}>
                            {pdf.label}
                          </p>
                          <p style={{ fontSize: "11px", color: textMuted, margin: 0 }}>
                            Download filled PDF
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                  {/* Section-grouped answer summary */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(showAllAppFields ? cannabisAppSections : cannabisAppSections.slice(0, 2)).map((sec) => (
                      <div key={sec.id}>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: textMuted, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>
                          {sec.title}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {sec.fields
                            .filter((f) => {
                              const v = (answers as Record<string, unknown>)[f.key];
                              return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
                            })
                            .map((f) => (
                              <div
                                key={f.key}
                                style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px", padding: "3px 0" }}
                              >
                                <span style={{ color: textMuted, flexShrink: 0 }}>{f.label}</span>
                                <span style={{ color: textPrimary, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {fmt(f.key, f.kind)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllAppFields((v) => !v)}
                    style={{
                      marginTop: "12px",
                      width: "100%",
                      padding: "8px",
                      background: "transparent",
                      border: `1px solid ${borderSubtle}`,
                      borderRadius: "8px",
                      color: textMuted,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {showAllAppFields ? "Show less" : `Show all ${cannabisAppSections.length} sections`}
                  </button>
                </GlassCard>
            );
            })()}

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
                      <FileText style={{ width: "16px", height: "16px", color: textMuted, flexShrink: 0 }} />
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
            background: "rgba(0,0,0,0.35)",
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
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)"; }}
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
            background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: creating ? "not-allowed" : "pointer",
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
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8, padding: "12px 14px",
          }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", margin: "0 0 4px", letterSpacing: "0.3px" }}>{c.label}</p>
            <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>{c.value}</p>
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
  if (typeof window === "undefined") return;
  const event = new CustomEvent("open-deal-card", { detail: { dealId } });
  window.dispatchEvent(event);
}

export function GlobalDealCardHost() {
  const [dealId, setDealId] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.dealId) setDealId(detail.dealId);
    };
    window.addEventListener("open-deal-card", handler);
    return () => window.removeEventListener("open-deal-card", handler);
  }, []);
  return (
    <DealCardModal
      dealId={dealId || ""}
      isOpen={!!dealId}
      onClose={() => setDealId(null)}
    />
  );
}
