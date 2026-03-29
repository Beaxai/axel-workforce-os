import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#060608" }}
    >
      <div className="text-center">
        <ShieldX className="w-12 h-12 mx-auto mb-4" style={{ color: "#E91E8C" }} />
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          You don't have permission to access this area.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #E91E8C, #b8157a)" }}
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
