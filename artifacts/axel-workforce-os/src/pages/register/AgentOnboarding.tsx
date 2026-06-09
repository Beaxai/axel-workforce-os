import { useThemeColors } from "@/lib/use-theme-colors";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, GhostButton } from "@/components/ui/axel-index";
import { Video, CheckCircle } from "lucide-react";

export default function AgentOnboarding() {
  const { id } = useParams<{ id: string }>();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();

  const { data: reg } = useQuery({
    queryKey: ["agent-reg", id],
    queryFn: () => api.get<any>(`/agent-registrations/${id}`),
  });

  const callCompleted = reg?.zoomCompletedAt || reg?.status === "CREDENTIALS_PENDING" || reg?.status === "ACTIVE";

  return (
    <div style={{ minHeight: "100vh", background: "#060608", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: textPrimary, margin: 0 }}>
            <span style={{ color: "var(--accent-primary)" }}>Axel</span> Onboarding
          </h1>
        </div>

        <GlassCard>
          {callCompleted ? (
            <div style={{ textAlign: "center", padding: "24px" }}>
              <CheckCircle style={{ width: 48, height: 48, color: "#1EE97B", marginBottom: "16px" }} />
              <h2 style={{ fontSize: "20px", fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>Onboarding Complete</h2>
              <p style={{ fontSize: "15px", color: textSecondary, lineHeight: 1.6 }}>
                Your onboarding call has been completed. Your credentials will be issued shortly.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px" }}>
              <Video style={{ width: 48, height: 48, color: "var(--accent-primary)", marginBottom: "16px" }} />
              <h2 style={{ fontSize: "20px", fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>Schedule Your Onboarding Call</h2>
              <p style={{ fontSize: "15px", color: textSecondary, lineHeight: 1.6, marginBottom: "24px" }}>
                Please schedule your onboarding call with the Axel team to complete your registration.
              </p>
              {reg && (
                <p style={{ fontSize: "14px", color: textMuted, marginBottom: "24px" }}>
                  Applicant: {reg.firstName} {reg.lastName} · {reg.agencyName}
                </p>
              )}
              <GhostButton onClick={() => console.log("[Agent Registration] Calendly integration coming soon")} style={{ padding: "12px 24px", fontSize: "15px" }}>
                <Video style={{ width: 16, height: 16, marginRight: "8px" }} />
                Schedule Call (Calendly — coming soon)
              </GhostButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
