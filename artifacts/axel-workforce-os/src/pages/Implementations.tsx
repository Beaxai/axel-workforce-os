import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GlassCard,
  Badge,
  SectionHeader,
} from "@/components/ui/axel-index";
import {
  useGetJourneys,
  useGetJourney,
  useUpdateJourneyTaskStatus,
  useUpdateJourneyPeo,
  getGetJourneyQueryKey,
  getGetJourneysQueryKey,
  type Journey,
  type JourneyDetail,
  type JourneyTask,
} from "@workspace/api-client-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { api } from "@/lib/api";
import JourneyView from "@/components/journey/JourneyView";
import { Rocket, ArrowLeft } from "lucide-react";

type TabKey = "WC" | "PEO" | "ASO";

const TAB_LABELS: Record<TabKey, string> = {
  WC: "WC Onboarding",
  PEO: "PEO Onboarding",
  ASO: "ASO Onboarding",
};

const tabOf = (j: Journey, dealProductType?: string): TabKey => {
  // Journeys instantiated from an "ANY" template inherit no concrete product
  // type, so fall back to the linked deal's product type before bucketing.
  const product = j.productType === "ANY" ? (dealProductType ?? "WC") : j.productType;
  if (product === "PEO") return "PEO";
  if (product === "ASO") return "ASO";
  return "WC";
};

const EXPECTED_DAYS: Record<TabKey, number> = { WC: 7, PEO: 22, ASO: 18 };

/**
 * Detail view for one journey — the internal specialist's work surface.
 * Renders the shared JourneyView (also used by the client-facing "My Program"),
 * so both audiences can never drift apart.
 */
function JourneyDetailPanel({
  journeyId,
  businessName,
  onBack,
}: {
  journeyId: string;
  businessName: string;
  onBack: () => void;
}) {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const { data: journey, isLoading, error } = useGetJourney(journeyId);
  const updateTask = useUpdateJourneyTaskStatus();
  const [taskError, setTaskError] = useState<string | null>(null);

  const handleCompleteTask = (taskId: string) => {
    setTaskError(null);
    updateTask.mutate(
      { id: journeyId, taskId, data: { status: "COMPLETE" } },
      {
        onSuccess: () => {
          // Progress, phase roll-up and the Active Client flip all happen
          // server-side, so refetch rather than patching local state.
          queryClient.invalidateQueries({ queryKey: getGetJourneyQueryKey(journeyId) });
          queryClient.invalidateQueries({ queryKey: getGetJourneysQueryKey() });
        },
        onError: (err: unknown) => {
          // Surface the server's reason — the §7G go-live gate returns a 409
          // explaining exactly which phases are still open.
          const anyErr = err as { error?: string; message?: string } | undefined;
          setTaskError(anyErr?.error || anyErr?.message || "Could not complete that task. Please try again.");
        },
      },
    );
  };

  // INTERNAL audience: staff work everything except the client's own tasks.
  const canCompleteTask = (task: JourneyTask) =>
    task.ownerType !== "CLIENT" && task.status !== "COMPLETE";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetJourneyQueryKey(journeyId) });
    queryClient.invalidateQueries({ queryKey: getGetJourneysQueryKey() });
  };

  const backButton = (
    <button
      type="button"
      data-testid="button-back-to-journeys"
      onClick={onBack}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "none",
        color: "var(--accent-primary)",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        padding: 0,
        marginBottom: 16,
      }}
    >
      <ArrowLeft style={{ width: 16, height: 16 }} />
      All implementations
    </button>
  );

  if (isLoading) {
    return (
      <div>
        {backButton}
        <GlassCard padding="40px" style={{ textAlign: "center" }}>
          <p style={{ color: c.textMuted, fontSize: 15, margin: 0 }}>Loading journey…</p>
        </GlassCard>
      </div>
    );
  }

  if (error || !journey) {
    return (
      <div>
        {backButton}
        <GlassCard padding="40px" style={{ textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontSize: 15, margin: 0 }}>
            Could not load this journey.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      {backButton}
      <SectionHeader title={businessName} subtitle="Implementation journey" />
      {taskError && (
        <GlassCard padding="12px 16px" style={{ marginBottom: 16, border: "1px solid #ef4444" }}>
          <span data-testid="text-task-error" style={{ color: "#ef4444", fontSize: 13.5 }}>
            {taskError}
          </span>
        </GlassCard>
      )}
      {journey.productType === "PEO" && (
        <PeoControls journey={journey} onSaved={invalidate} onError={setTaskError} />
      )}
      <JourneyView
        journey={journey}
        audience="INTERNAL"
        onCompleteTask={handleCompleteTask}
        canCompleteTask={canCompleteTask}
      />
    </div>
  );
}

/**
 * §7G PEO work surface: payroll start date (defaulted to CSA-PEO signing + 14
 * days, editable) and the employee-onboarding N of M counts. Counts hitting
 * N ≥ M auto-completes phase 3 server-side.
 */
function PeoControls({
  journey,
  onSaved,
  onError,
}: {
  journey: JourneyDetail;
  onSaved: () => void;
  onError: (msg: string | null) => void;
}) {
  const c = useThemeColors();
  const updatePeo = useUpdateJourneyPeo();
  const [payrollDate, setPayrollDate] = useState(journey.payrollStartDate ?? "");
  const [total, setTotal] = useState(journey.employeesTotal?.toString() ?? "");
  const [onboarded, setOnboarded] = useState(journey.employeesOnboarded?.toString() ?? "");

  useEffect(() => {
    setPayrollDate(journey.payrollStartDate ?? "");
    setTotal(journey.employeesTotal?.toString() ?? "");
    setOnboarded(journey.employeesOnboarded?.toString() ?? "");
  }, [journey.payrollStartDate, journey.employeesTotal, journey.employeesOnboarded]);

  const save = () => {
    onError(null);
    const data: { payrollStartDate?: string; employeesTotal?: number; employeesOnboarded?: number } = {};
    if (payrollDate && payrollDate !== journey.payrollStartDate) data.payrollStartDate = payrollDate;
    const t = total === "" ? null : Number(total);
    const n = onboarded === "" ? null : Number(onboarded);
    if (t !== null && Number.isFinite(t) && t !== journey.employeesTotal) data.employeesTotal = t;
    if (n !== null && Number.isFinite(n) && n !== journey.employeesOnboarded) data.employeesOnboarded = n;
    if (Object.keys(data).length === 0) return;
    updatePeo.mutate(
      { id: journey.id, data },
      {
        onSuccess: onSaved,
        onError: (err: unknown) => {
          const anyErr = err as { error?: string; message?: string } | undefined;
          onError(anyErr?.error || anyErr?.message || "Could not save PEO fields.");
        },
      },
    );
  };

  const inputStyle: React.CSSProperties = {
    background: c.inputBg,
    border: `1px solid ${c.borderColor}`,
    borderRadius: 8,
    color: c.textPrimary,
    fontSize: 13.5,
    padding: "7px 10px",
    width: 130,
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: c.textMuted, display: "block", marginBottom: 4 };

  return (
    <GlassCard padding="16px 20px" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <span style={labelStyle}>CSA-PEO signed</span>
          <span data-testid="text-csa-peo-signed" style={{ fontSize: 13.5, color: c.textPrimary }}>
            {journey.csaPeoSignedDate ?? "Not yet signed"}
          </span>
        </div>
        <div>
          <label style={labelStyle} htmlFor="peo-payroll-start">Payroll start (signing + 14d, editable)</label>
          <input
            id="peo-payroll-start"
            data-testid="input-payroll-start"
            type="date"
            value={payrollDate}
            onChange={(e) => setPayrollDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="peo-emp-onboarded">Employees onboarded (N)</label>
          <input
            id="peo-emp-onboarded"
            data-testid="input-employees-onboarded"
            type="number"
            min={0}
            value={onboarded}
            onChange={(e) => setOnboarded(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="peo-emp-total">Employees total (M)</label>
          <input
            id="peo-emp-total"
            data-testid="input-employees-total"
            type="number"
            min={0}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button
          type="button"
          data-testid="button-save-peo"
          onClick={save}
          disabled={updatePeo.isPending}
          style={{
            background: "var(--accent-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 18px",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: updatePeo.isPending ? "wait" : "pointer",
          }}
        >
          {updatePeo.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </GlassCard>
  );
}

export default function Implementations() {
  const c = useThemeColors();
  const [tab, setTab] = useState<TabKey>("WC");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dealInfo, setDealInfo] = useState<Map<string, { businessName: string; productType?: string }>>(new Map());

  const { data: journeys = [], isLoading } = useGetJourneys({ type: "IMPLEMENTATION" });

  useEffect(() => {
    // Deal names/product types come from the legacy deals API (no generated hook exists for it).
    api
      .get<{ id: string; businessName?: string; productType?: string }[]>("/deals")
      .then((deals) =>
        setDealInfo(
          new Map(deals.map((d) => [d.id, { businessName: d.businessName ?? "", productType: d.productType }]))
        )
      )
      .catch(() => setDealInfo(new Map()));
  }, []);

  const bucketOf = (j: Journey): TabKey =>
    tabOf(j, j.dealId ? dealInfo.get(j.dealId)?.productType : undefined);

  const filtered = journeys.filter((j) => bucketOf(j) === tab);

  const getDaysElapsed = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Detail view takes over the page when a journey is selected.
  if (selectedId) {
    const selected = journeys.find((j) => j.id === selectedId);
    const name =
      (selected?.dealId && dealInfo.get(selected.dealId)?.businessName) || "Implementation";
    return (
      <JourneyDetailPanel
        journeyId={selectedId}
        businessName={name}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div>
      <SectionHeader title="Implementations" subtitle={`${journeys.length} active journeys`} />

      <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
        {(["WC", "PEO", "ASO"] as const).map((t) => (
          <button
            key={t}
            data-testid={`tab-${t.toLowerCase()}`}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              border: `1px solid ${tab === t ? "var(--accent-primary)" : c.borderColor}`,
              background: tab === t ? "var(--accent-primary-soft)" : "transparent",
              color: tab === t ? "var(--accent-primary)" : c.textMuted,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {!isLoading && filtered.length === 0 && (
          <GlassCard padding="40px" style={{ textAlign: "center" }}>
            <Rocket style={{ width: "32px", height: "32px", color: c.textMuted, marginBottom: "12px" }} />
            <p data-testid="text-empty-state" style={{ color: c.textMuted, fontSize: "15px", margin: 0 }}>
              No {TAB_LABELS[tab]} journeys yet. Move a deal to "Bound" stage to create one.
            </p>
          </GlassCard>
        )}

        {filtered.map((journey) => {
          const isComplete = journey.status === "COMPLETE";
          const progress = journey.overallProgress ?? 0;
          const anchorDate = journey.goLiveDate || journey.createdAt || "";
          const daysElapsed = anchorDate ? getDaysElapsed(anchorDate) : 0;
          const bucket = bucketOf(journey);
          const expectedDays = EXPECTED_DAYS[bucket];
          const businessName =
            (journey.dealId && dealInfo.get(journey.dealId)?.businessName) || "Unknown Business";

          return (
            <GlassCard
              key={journey.id}
              padding="24px"
              onClick={() => setSelectedId(journey.id)}
              style={{ cursor: "pointer" }}
            >
              <div data-testid={`card-journey-${journey.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: c.textPrimary, margin: 0 }}>
                      {businessName}
                    </h3>
                    <Badge
                      label={TAB_LABELS[bucket]}
                      color={bucket === "WC" ? "blue" : "purple"}
                    />
                  </div>
                  <span style={{ fontSize: "13px", color: c.textMuted }}>
                    Go-live: {anchorDate ? new Date(anchorDate).toLocaleDateString() : "—"} • {daysElapsed} days elapsed
                    {!isComplete && (
                      <span style={{ color: daysElapsed > expectedDays ? "#ef4444" : c.textMuted }}>
                        {" "}(target: {expectedDays} days)
                      </span>
                    )}
                  </span>
                </div>
                <Badge
                  label={isComplete ? "Complete" : "In Progress"}
                  color={isComplete ? "green" : "purple"}
                />
              </div>

              {/* PROGRESS BAR — real task-driven percentage from the journey engine */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    flex: 1,
                    height: "8px",
                    borderRadius: "4px",
                    background: c.inputBg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      borderRadius: "4px",
                      background: "var(--accent-primary)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <span
                  data-testid={`text-progress-${journey.id}`}
                  style={{ fontSize: "13px", fontWeight: 600, color: c.textPrimary, minWidth: "40px", textAlign: "right" }}
                >
                  {progress}%
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
