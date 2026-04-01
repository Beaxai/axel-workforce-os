import { useThemeColors } from "@/lib/use-theme-colors";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard, GhostButton } from "@/components/ui/axel-index";
import { FileSignature, CheckCircle } from "lucide-react";

export default function AgentAgreement() {
  const { id } = useParams<{ id: string }>();
  const { isDark, textPrimary, textSecondary, textMuted, cardBg, borderColor } = useThemeColors();
  const qc = useQueryClient();
  const [signed, setSigned] = useState(false);

  const { data: reg } = useQuery({
    queryKey: ["agent-reg", id],
    queryFn: () => api.get<any>(`/agent-registrations/${id}`),
  });

  const signMut = useMutation({
    mutationFn: () => api.patch(`/agent-registrations/${id}`, {
      status: "ONBOARDING_CALL_PENDING",
      agreementSignedAt: new Date().toISOString(),
    }),
    onSuccess: () => {
      console.log(`[Agent Registration] Agreement signed for registration ${id}. Email would be sent to admin.`);
      qc.invalidateQueries({ queryKey: ["agent-reg", id] });
      setSigned(true);
    },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#060608", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: textPrimary, margin: 0 }}>
            <span style={{ color: "#E91E8C" }}>Axel</span> Agency Agreement
          </h1>
        </div>

        <GlassCard>
          {signed ? (
            <div style={{ textAlign: "center", padding: "24px" }}>
              <CheckCircle style={{ width: 48, height: 48, color: "#1EE97B", marginBottom: "16px" }} />
              <h2 style={{ fontSize: "20px", fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>Agreement Signed</h2>
              <p style={{ fontSize: "15px", color: textSecondary, lineHeight: 1.6 }}>
                Thank you. Please proceed to schedule your onboarding call.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px" }}>
              <FileSignature style={{ width: 48, height: 48, color: "#E91E8C", marginBottom: "16px" }} />
              <h2 style={{ fontSize: "20px", fontWeight: 600, color: textPrimary, margin: "0 0 12px" }}>Application Approved</h2>
              <p style={{ fontSize: "15px", color: textSecondary, lineHeight: 1.6, marginBottom: "24px" }}>
                Your application has been approved. Please sign your agency agreement below.
              </p>
              {reg && (
                <p style={{ fontSize: "14px", color: textMuted, marginBottom: "24px" }}>
                  Applicant: {reg.firstName} {reg.lastName} · {reg.agencyName}
                </p>
              )}
              <GhostButton onClick={() => signMut.mutate()} style={{ padding: "12px 24px", fontSize: "15px" }}>
                <FileSignature style={{ width: 16, height: 16, marginRight: "8px" }} />
                Sign Agreement (HelloSign — coming soon)
              </GhostButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
