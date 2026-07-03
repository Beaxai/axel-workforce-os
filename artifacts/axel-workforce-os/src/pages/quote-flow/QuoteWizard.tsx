import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuoteFlowStore, type QuoteFlowState } from "@/lib/quote-flow-store";
import Step1BusinessDetails from "./Step1BusinessDetails";
import WorkforceProfile from "@/components/quote-flow/WorkforceProfile";
import Step3ExperienceMod from "./Step3ExperienceMod";
import P2Step3GeneralInfo from "./P2Step3GeneralInfo";
import Step4Indication from "./Step4Indication";
import Phase2Transition from "./Phase2Transition";
import P2Step4CannabisOps from "./P2Step4CannabisOps";
import P2Step5SafetyPremises from "./P2Step5SafetyPremises";
import P2Step6Extraction from "./P2Step6Extraction";
import P2Step7AutoExposure from "./P2Step7AutoExposure";
import P2StepLossHistory from "./P2StepLossHistory";
import FinalSubmission from "./FinalSubmission";
import ConfirmationScreen from "./ConfirmationScreen";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useThemeColors } from "@/lib/use-theme-colors";
import { api } from "@/lib/api";
import { useRef, useState } from "react";

/** Serializable snapshot of the quote-flow store (data fields only, no actions). */
function storeSnapshot(store: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(store).filter(([, v]) => typeof v !== "function"),
  );
}

export default function QuoteWizard() {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useQuoteFlowStore();

  const { vertical, coverageType, prefill } = (location.state as {
    vertical?: string;
    coverageType?: string;
    prefill?: Partial<QuoteFlowState>;
  }) || {};

  useEffect(() => {
    if (vertical && coverageType) {
      store.init(vertical, coverageType);
      if (prefill) store.update(prefill);
    } else if (!store.vertical) {
      navigate("/marketplace", { replace: true });
    }
    initializedRef.current = true;
  }, []);

  /* ------------------------------------------------------------------ */
  /* Draft autosave: persist the wizard state (however partial) to the   */
  /* server ~1.2s after any change so submissions are always resumable.  */
  /* ------------------------------------------------------------------ */
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const rerunRef = useRef(false);
  const lastSavedJsonRef = useRef<string>("");

  const persistDraft = async () => {
    if (savingRef.current) {
      rerunRef.current = true;
      return;
    }
    const s = useQuoteFlowStore.getState();
    if (!s.vertical || s.submittedDealId) return;
    const snapshot = storeSnapshot(s as unknown as Record<string, unknown>);
    const json = JSON.stringify(snapshot);
    if (json === lastSavedJsonRef.current) return;
    savingRef.current = true;
    setSaveStatus("saving");
    const payload = {
      businessName: s.businessName || null,
      vertical: s.vertical,
      coverageType: s.coverageType || null,
      phase: s.phase,
      currentStep: s.currentStep,
      state: snapshot,
    };
    try {
      if (s.draftId) {
        try {
          await api.patch(`/quote-drafts/${s.draftId}`, payload);
        } catch (err) {
          if (err instanceof Error && err.message.includes("404")) {
            const created = await api.post<{ id: string }>("/quote-drafts", payload);
            useQuoteFlowStore.getState().update({ draftId: created.id });
          } else {
            throw err;
          }
        }
      } else {
        const created = await api.post<{ id: string }>("/quote-drafts", payload);
        useQuoteFlowStore.getState().update({ draftId: created.id });
      }
      lastSavedJsonRef.current = json;
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        void persistDraft();
      }
    }
  };

  useEffect(() => {
    if (!initializedRef.current || !store.vertical || store.submittedDealId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void persistDraft(), 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [store]);

  const { isDark, textPrimary, textMuted } = useThemeColors();
  const btnBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const btnHoverBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const trackBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (!store.vertical) return null;

  const hasExtraction = store.cannabisOperations.includes("Extraction");
  const hasDelivery =
    store.cannabisOperations.includes("Delivery") ||
    store.drivingDeliveryExposureFlag === "Yes";

  const getPhase2Steps = () => {
    const steps: { key: string; label: string }[] = [
      { key: "p2-transition", label: "Transition" },
      { key: "p2-cannabis", label: "Cannabis Operations" },
      { key: "p2-safety", label: "Safety & Premises" },
    ];
    if (hasExtraction) steps.push({ key: "p2-extraction", label: "Extraction" });
    if (hasDelivery) steps.push({ key: "p2-auto", label: "Auto Exposure" });
    steps.push({ key: "p2-loss-history", label: "Loss History" });
    steps.push({ key: "p2-final", label: "Final Submission" });
    steps.push({ key: "p2-confirm", label: "Confirmation" });
    return steps;
  };

  const phase1Total = 5;
  const phase2Steps = getPhase2Steps();

  const getPhase2ComponentList = () => {
    const components: React.ReactNode[] = [
      <Phase2Transition key="transition" />,
      <P2Step4CannabisOps key="cannabis" />,
      <P2Step5SafetyPremises key="safety" />,
    ];
    if (hasExtraction) components.push(<P2Step6Extraction key="extraction" />);
    if (hasDelivery) components.push(<P2Step7AutoExposure key="auto" />);
    components.push(<P2StepLossHistory key="loss-history" />);
    components.push(<FinalSubmission key="final" />);
    components.push(<ConfirmationScreen key="confirm" />);
    return components;
  };

  const phase2Components = getPhase2ComponentList();

  const renderStep = () => {
    if (store.phase === 1) {
      switch (store.currentStep) {
        case 1: return <Step1BusinessDetails />;
        case 2: return <WorkforceProfile />;
        case 3: return <Step3ExperienceMod />;
        case 4: return <P2Step3GeneralInfo />;
        case 5: return <Step4Indication />;
        default: return <Step1BusinessDetails />;
      }
    } else {
      return phase2Components[store.currentStep] || <P2Step4CannabisOps />;
    }
  };

  const finalStepIndex = phase2Components.length - 2;
  const confirmStepIndex = phase2Components.length - 1;

  const isIndicationScreen = store.phase === 1 && store.currentStep === 5;
  const isTransition = store.phase === 2 && store.currentStep === 0;
  const isFinalOrConfirm = store.phase === 2 && (
    store.currentStep === finalStepIndex || store.currentStep === confirmStepIndex
  );

  const showContinue = !isIndicationScreen && !isTransition && !isFinalOrConfirm;
  const showBack = true;

  const getProgressInfo = () => {
    if (store.phase === 1) {
      const labels = ["Business Details", "Class Codes & Payroll", "Experience Rating", "General Information", "Indication Ready"];
      return { current: store.currentStep, total: phase1Total, label: labels[store.currentStep - 1] || "" };
    }
    const step = store.currentStep;
    if (step === 0) return { current: 0, total: 1, label: "Transition" };
    const totalP2 = phase2Components.length - 2;
    const labels = ["Cannabis Operations", "Safety & Premises"];
    if (hasExtraction) labels.push("Extraction");
    if (hasDelivery) labels.push("Auto Exposure");
    labels.push("Loss History");
    labels.push("Final Review");
    return { current: step, total: totalP2, label: labels[step - 1] || "Review" };
  };

  const progress = getProgressInfo();

  // Clickable step pills — lets the user jump between steps freely.
  const stepPills: { step: number; label: string }[] = (() => {
    if (store.phase === 1) {
      const labels = ["Business Details", "Workforce", "Experience", "General Info", "Indication"];
      return labels.map((label, i) => ({ step: i + 1, label }));
    }
    // Phase 2: skip the transition (0) and confirmation (last) screens.
    return phase2Steps
      .map((s, i) => ({ step: i, label: s.label }))
      .filter((p) => p.step > 0 && p.step < confirmStepIndex);
  })();

  const handleNext = () => {
    if (store.phase === 1) {
      if (store.currentStep < 5) store.setStep(store.currentStep + 1);
    } else {
      store.setStep(store.currentStep + 1);
    }
  };

  const handleBack = () => {
    if (store.phase === 1) {
      if (store.currentStep > 1) store.setStep(store.currentStep - 1);
      else navigate("/marketplace/quote/service-type", { state: { vertical: store.vertical } });
    } else {
      if (store.currentStep > 1) store.setStep(store.currentStep - 1);
      else { store.setPhase(1); store.setStep(5); }
    }
  };

  const isConfirmationScreen = store.phase === 2 && store.currentStep === confirmStepIndex;

  if (isConfirmationScreen) {
    return <ConfirmationScreen />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 56px)" }}>
      {!isTransition && progress.total > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ height: 3, background: trackBg, width: "100%", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${(progress.current / progress.total) * 100}%`, background: "var(--accent-primary)", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {store.phase === 2 && (
                <button
                  type="button"
                  onClick={() => { store.setPhase(1); store.setStep(5); }}
                  style={{
                    padding: "4px 10px", borderRadius: 12, border: "none", cursor: "pointer",
                    background: btnBg, color: textMuted, fontSize: 11, fontWeight: 600,
                  }}
                >
                  ← Phase 1
                </button>
              )}
              {stepPills.map((pill) => {
                const isActive = pill.step === store.currentStep;
                return (
                  <button
                    key={pill.step}
                    type="button"
                    onClick={() => store.setStep(pill.step)}
                    title={pill.label}
                    style={{
                      padding: "4px 10px", borderRadius: 12, border: "none", cursor: "pointer",
                      background: isActive ? "var(--accent-primary-soft)" : btnBg,
                      color: isActive ? "var(--accent-primary)" : textMuted,
                      fontSize: 11, fontWeight: isActive ? 700 : 600,
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {pill.step}. {pill.label}
                  </button>
                );
              })}
            </div>
            <span style={{ fontSize: 12, color: textMuted, whiteSpace: "nowrap" }}>
              {saveStatus === "saving" && "Saving draft…"}
              {saveStatus === "saved" && "Draft saved"}
              {saveStatus === "error" && <span style={{ color: "#ef4444" }}>Draft save failed</span>}
              {saveStatus === "idle" && `Step ${progress.current} of ${progress.total}`}
            </span>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        {renderStep()}
      </div>

      {(showBack || showContinue) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0", marginTop: 24 }}>
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 24,
                border: "none", background: btnBg, color: textPrimary, fontSize: 14,
                fontWeight: 600, cursor: "pointer", height: 44, transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = btnHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = btnBg)}
            >
              <ArrowLeft style={{ width: 16, height: 16 }} />
              Back
            </button>
          ) : <span />}
          {showContinue && (
            <button
              type="button"
              onClick={handleNext}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 24,
                border: "none", background: btnBg, color: textPrimary, fontSize: 14,
                fontWeight: 600, cursor: "pointer", height: 44, transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = btnHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = btnBg)}
            >
              Continue
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
