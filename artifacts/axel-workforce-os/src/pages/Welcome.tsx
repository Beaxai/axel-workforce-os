import { Mail, Phone, User } from "lucide-react";
import { GlassCard } from "@/components/ui/axel-index";

const BASE = import.meta.env.BASE_URL || "/";

export default function Welcome() {
  return (
    <div style={{
      minHeight: "100vh", background: "#060608",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px",
    }}>
      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <img
          src={`${BASE}images/axel-logo.png`}
          alt="Axel Workforce OS"
          style={{
            height: "40px",
            width: "auto",
            objectFit: "contain",
            margin: "0 auto 24px",
            display: "block",
            filter: "brightness(0) invert(1)",
          }}
        />
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>
          Axel Workforce OS
        </h1>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)", marginBottom: "32px" }}>
          Your program is being prepared. Your dedicated team will be in touch shortly.
        </p>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" }}>
            <User style={{ width: 18, height: 18, color: "#E91E8C" }} />
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
              Your assigned CSA will contact you soon
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
