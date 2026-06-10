import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, SectionHeader, AxelBadge } from "@/components/ui/axel-index";
import { CheckCircle, Circle, Clock } from "lucide-react";
import { useThemeStore } from "@/lib/theme-store";

const WC_LABELS = [
  "We're issuing your binder",
  "Your policy documents are on the way",
  "Waiting for your signature",
  "Your policy is active!",
];

const PEO_LABELS = [
  "Welcome! Your kickoff is scheduled",
  "We're collecting your workforce data",
  "Setting up your systems",
  "Running your first payroll parallel",
  "You're live!",
];

const ENCOURAGEMENT: Record<string, string[]> = {
  WC: [
    "We're working on getting your binder issued. This typically takes 1-2 business days.",
    "Great news! Your policy documents are being prepared and will be sent to you shortly.",
    "Almost there! We just need your signature to finalize everything.",
    "Congratulations! Your workers' compensation policy is now active and protecting your team.",
  ],
  PEO: [
    "Welcome aboard! We're excited to get started. Your kickoff call is being scheduled.",
    "We're gathering the information we need to set up your program. Your CSA will guide you through this.",
    "Your systems are being configured. This is where the magic happens!",
    "We're running a parallel payroll to make sure everything is perfect before going live.",
    "You're all set! Your PEO program is fully live and operational.",
  ],
};

export default function ClientOnboarding() {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const { data: trackers = [] } = useQuery({
    queryKey: ["implementation-trackers"],
    queryFn: () => api.get<any[]>("/implementation"),
  });

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.58)";

  const wcTrackers = trackers.filter((t: any) => t.productType === "WC");
  const peoTrackers = trackers.filter((t: any) => t.productType === "PEO" || t.productType === "ASO");

  return (
    <div style={{ maxWidth: "800px" }}>
      <SectionHeader title="Onboarding Progress" subtitle="Track your program setup" />

      {wcTrackers.map((tracker: any) => (
        <TrackerCard
          key={tracker.id}
          title="Workers' Comp Setup"
          tracker={tracker}
          labels={WC_LABELS}
          encouragement={ENCOURAGEMENT.WC}
          isDark={isDark}
          textPrimary={textPrimary}
          textMuted={textMuted}
        />
      ))}

      {peoTrackers.map((tracker: any) => (
        <TrackerCard
          key={tracker.id}
          title="PEO Onboarding"
          tracker={tracker}
          labels={PEO_LABELS}
          encouragement={ENCOURAGEMENT.PEO}
          isDark={isDark}
          textPrimary={textPrimary}
          textMuted={textMuted}
        />
      ))}

      {trackers.length === 0 && (
        <GlassCard>
          <p style={{ fontSize: "14px", color: textMuted, textAlign: "center" }}>
            Your onboarding information will appear here once your program setup begins.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

function TrackerCard({ title, tracker, labels, encouragement, isDark, textPrimary, textMuted }: {
  title: string; tracker: any; labels: string[]; encouragement: string[];
  isDark: boolean; textPrimary: string; textMuted: string;
}) {
  const progress = tracker.overallProgress || 0;
  const totalPhases = labels.length;
  const completedPhases = Math.round((progress / 100) * totalPhases);

  return (
    <GlassCard style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "17px", fontWeight: 600, color: textPrimary, margin: 0 }}>{title}</h3>
        <AxelBadge label={progress === 100 ? "Complete" : "In Progress"} color={progress === 100 ? "green" : "blue"} />
      </div>

      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", color: textMuted }}>Progress</span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: textPrimary }}>{progress}%</span>
        </div>
        <div style={{ height: "8px", borderRadius: "4px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent-primary)", borderRadius: "4px", transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {labels.map((label, idx) => {
          const isComplete = idx < completedPhases;
          const isCurrent = idx === completedPhases && progress < 100;
          return (
            <div key={idx} style={{ display: "flex", gap: "14px" }}>
              <div style={{ flexShrink: 0, marginTop: "2px" }}>
                {isComplete ? (
                  <CheckCircle style={{ width: 20, height: 20, color: "#1EE97B" }} />
                ) : isCurrent ? (
                  <Clock style={{ width: 20, height: 20, color: "var(--accent-primary)" }} />
                ) : (
                  <Circle style={{ width: 20, height: 20, color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
                )}
              </div>
              <div>
                <p style={{
                  fontSize: "14px", fontWeight: isComplete || isCurrent ? 500 : 400, margin: 0,
                  color: isComplete ? (isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)") : isCurrent ? textPrimary : textMuted,
                }}>{label}</p>
                {isCurrent && (
                  <p style={{ fontSize: "13px", color: textMuted, margin: "4px 0 0", lineHeight: 1.5 }}>
                    {encouragement[idx]}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
