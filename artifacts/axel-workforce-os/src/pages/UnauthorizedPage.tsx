import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { useThemeColors } from "@/lib/use-theme-colors";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { bg, textPrimary, textMuted } = useThemeColors();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: bg }}
    >
      <div className="text-center">
        <ShieldX className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--accent-primary)" }} />
        <h1 className="text-xl font-bold mb-2" style={{ color: textPrimary }}>Access Denied</h1>
        <p className="text-sm mb-6" style={{ color: textMuted }}>
          You don't have permission to access this area.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "var(--gradient-cta)" }}
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
