import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuoteFlowStore } from "@/lib/quote-flow-store";
import Step1BusinessDetails from "./Step1BusinessDetails";
import Step2ClassCodes from "./Step2ClassCodes";
import Step3ExperienceMod from "./Step3ExperienceMod";
import Step4Indication from "./Step4Indication";
import Phase2Transition from "./Phase2Transition";
import P2Step1Applicant from "./P2Step1Applicant";
import P2Step3GeneralInfo from "./P2Step3GeneralInfo";
import P2Step4CannabisOps from "./P2Step4CannabisOps";
import P2Step5SafetyPremises from "./P2Step5SafetyPremises";
import P2Step6Extraction from "./P2Step6Extraction";
import P2Step7AutoExposure from "./P2Step7AutoExposure";
import P2StepLossHistory from "./P2StepLossHistory";
import FinalSubmission from "./FinalSubmission";
import ConfirmationScreen from "./ConfirmationScreen";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useThemeColors } from "@/lib/use-theme-colors";

export default function QuoteWizard() {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useQuoteFlowStore();

  const { vertical, coverageType } = (location.state as {
    vertical?: string;
    coverageType?: string;
  }) || {};

  useEffect(() => {
    if (vertical && coverageType) {
      store.init(vertical, coverageType);
    } else if (!store.vertical) {
      navigate("/marketplace", { replace: true });
    }
  }, []);

  const { isDark, textPrimary, textMuted } = useThemeColors();
  const btnBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const btnHoverBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const trackBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (!store.vertical) return null;

  const hasExtraction = store.cannabisOperations.includes("Extraction");
  const hasDelivery = store.cannabisOperations.includes("Delivery");

  const getPhase2Steps = () => {
    const steps: { key: string; label: string }[] = [
      { key: "p2-transition", label: "Transition" },
      { key: "p2-applicant", label: "Applicant Details" },
      { key: "p2-general", label: "General Information" },
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

  const phase1Total = 4;
  const phase2Steps = getPhase2Steps();

  const getPhase2ComponentList = () => {
    const components: React.ReactNode[] = [
      <Phase2Transition key="transition" />,
      <P2Step1Applicant key="applicant" />,
      <P2Step3GeneralInfo key="general" />,
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
        case 2: return <Step2ClassCodes />;
        case 3: return <Step3ExperienceMod />;
        case 4: return <Step4Indication />;
        default: return <Step1BusinessDetails />;
      }
    } else {
      return phase2Components[store.currentStep] || <P2Step1Applicant />;
    }
  };

  const finalStepIndex = phase2Components.length - 2;
  const confirmStepIndex = phase2Components.length - 1;

  const isIndicationScreen = store.phase === 1 && store.currentStep === 4;
  const isTransition = store.phase === 2 && store.currentStep === 0;
  const isFinalOrConfirm = store.phase === 2 && (
    store.currentStep === finalStepIndex || store.currentStep === confirmStepIndex
  );

  const showNav = !isIndicationScreen && !isTransition && !isFinalOrConfirm;

  const getProgressInfo = () => {
    if (store.phase === 1) {
      const labels = ["Business Details", "Class Codes & Payroll", "Experience Rating", "Indication Ready"];
      return { current: store.currentStep, total: phase1Total, label: labels[store.currentStep - 1] || "" };
    }
    const step = store.currentStep;
    if (step === 0) return { current: 0, total: 1, label: "Transition" };
    const totalP2 = phase2Components.length - 2;
    const labels = ["Applicant Details", "General Information", "Cannabis Operations", "Safety & Premises"];
    if (hasExtraction) labels.push("Extraction");
    if (hasDelivery) labels.push("Auto Exposure");
    labels.push("Loss History");
    labels.push("Final Review");
    return { current: step, total: totalP2, label: labels[step - 1] || "Review" };
  };

  const progress = getProgressInfo();

  const handleNext = () => {
    if (store.phase === 1) {
      if (store.currentStep < 4) store.setStep(store.currentStep + 1);
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
      else { store.setPhase(1); store.setStep(4); }
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
            <div style={{ height: "100%", width: `${(progress.current / progress.total) * 100}%`, background: "#E91E8C", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#E91E8C", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {progress.label}
            </span>
            <span style={{ fontSize: 13, color: textMuted }}>
              Step {progress.current} of {progress.total}
            </span>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        {renderStep()}
      </div>

      {showNav && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0", marginTop: 24 }}>
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
        </div>
      )}
    </div>
  );
}
