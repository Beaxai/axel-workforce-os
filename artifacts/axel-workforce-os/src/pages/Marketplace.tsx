import { useNavigate } from "react-router-dom";
import { SectionHeader, GlassCard, PinkButton, GhostButton } from "@/components/ui/axel-index";
import { useThemeStore } from "@/lib/theme-store";
import {
  Cannabis,
  HardHat,
  UsersRound,
  HeartPulse,
  UtensilsCrossed,
  Truck,
  Factory,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

interface Vertical {
  name: string;
  descriptor: string;
  icon: LucideIcon;
}

const VERTICALS: Vertical[] = [
  { name: "Cannabis", descriptor: "Multi-state cannabis operations", icon: Cannabis },
  { name: "Construction", descriptor: "General contractors & trades", icon: HardHat },
  { name: "Staffing", descriptor: "Temporary & contract workforce", icon: UsersRound },
  { name: "Healthcare", descriptor: "Home health, clinics, caregivers", icon: HeartPulse },
  { name: "Hospitality", descriptor: "Hotels, restaurants, events", icon: UtensilsCrossed },
  { name: "Transportation", descriptor: "Trucking, logistics, delivery", icon: Truck },
  { name: "Manufacturing", descriptor: "Production & warehouse operations", icon: Factory },
  { name: "Retail", descriptor: "Brick & mortar & distribution", icon: ShoppingBag },
];

export default function Marketplace() {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#fff" : "#111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const borderSubtle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const handleQuote = (vertical: string, quoteType: "WC" | "PEO") => {
    navigate("/marketplace/quote/new", { state: { vertical, quoteType } });
  };

  return (
    <div style={{ maxWidth: "1200px" }}>
      <SectionHeader title="Marketplace" subtitle="Select a vertical to begin a quote" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {VERTICALS.map((v) => (
          <GlassCard
            key={v.name}
            padding="24px"
            className="marketplace-card"
            style={{
              transition: "border-color 0.15s",
              cursor: "default",
            }}
          >
            <div
              onMouseEnter={(e) => {
                const card = e.currentTarget.parentElement;
                if (card) card.style.borderColor = "rgba(233,30,140,0.3)";
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget.parentElement;
                if (card) card.style.borderColor = borderSubtle;
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(233,30,140,0.15)",
                  }}
                >
                  <v.icon style={{ width: "20px", height: "20px", color: "#E91E8C" }} />
                </div>
                <div>
                  <p style={{ fontSize: "16px", fontWeight: 600, color: textPrimary, margin: 0 }}>
                    {v.name}
                  </p>
                  <p style={{ fontSize: "13px", color: textMuted, margin: 0 }}>
                    {v.descriptor}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <PinkButton
                  onClick={() => handleQuote(v.name, "WC")}
                  style={{ flex: 1, padding: "8px 16px", fontSize: "13px" }}
                >
                  WC Quote
                </PinkButton>
                <GhostButton
                  onClick={() => handleQuote(v.name, "PEO")}
                  style={{ flex: 1, padding: "8px 16px", fontSize: "13px" }}
                >
                  PEO Quote
                </GhostButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
