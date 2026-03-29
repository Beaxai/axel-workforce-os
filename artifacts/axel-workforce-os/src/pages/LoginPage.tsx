import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuthStore, ROLE_LABELS, ROLE_PATHS, type PartyRole } from "@/lib/auth-store";

const DEMO_USERS: Record<PartyRole, { firstName: string; lastName: string; email: string }> = {
  ADMIN: { firstName: "Sarah", lastName: "Mitchell", email: "sarah@axelwos.com" },
  UNDERWRITER: { firstName: "James", lastName: "Chen", email: "james@axelwos.com" },
  CSA: { firstName: "Maria", lastName: "Rodriguez", email: "maria@axelwos.com" },
  AGENT: { firstName: "Robert", lastName: "Banks", email: "robert@broker.com" },
  EMPLOYER: { firstName: "Lisa", lastName: "Thompson", email: "lisa@acmecorp.com" },
  CARRIER: { firstName: "David", lastName: "Park", email: "david@carrier.com" },
  PEO: { firstName: "Karen", lastName: "White", email: "karen@peopartner.com" },
  VENDOR: { firstName: "Mike", lastName: "Johnson", email: "mike@vendor.com" },
};

const ROLES: PartyRole[] = [
  "ADMIN", "UNDERWRITER", "CSA", "AGENT",
  "EMPLOYER", "CARRIER", "PEO", "VENDOR",
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<PartyRole | null>(null);

  const handleLogin = () => {
    if (!selectedRole) return;
    const demo = DEMO_USERS[selectedRole];
    login({
      id: crypto.randomUUID(),
      email: demo.email,
      firstName: demo.firstName,
      lastName: demo.lastName,
      role: selectedRole,
      orgId: "axel-internal",
      orgName: "Axel Workforce Solutions",
    });
    navigate(ROLE_PATHS[selectedRole]);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#060608" }}
    >
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #E91E8C, #b8157a)" }}
          >
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Axel Workforce OS</h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
            Select your role to enter the platform
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          <p className="text-xs font-medium mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            SELECT PARTY ROLE
          </p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className="px-3 py-3 rounded-xl text-left transition-all text-sm font-medium"
                style={{
                  background:
                    selectedRole === role
                      ? "rgba(233,30,140,0.15)"
                      : "rgba(255,255,255,0.04)",
                  border:
                    selectedRole === role
                      ? "1px solid rgba(233,30,140,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                  color: selectedRole === role ? "#E91E8C" : "rgba(255,255,255,0.7)",
                }}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          {selectedRole && (
            <div
              className="rounded-xl p-3 mb-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Signing in as
              </p>
              <p className="text-sm font-medium text-white mt-0.5">
                {DEMO_USERS[selectedRole].firstName} {DEMO_USERS[selectedRole].lastName}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {DEMO_USERS[selectedRole].email}
              </p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!selectedRole}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background: selectedRole
                ? "linear-gradient(135deg, #E91E8C, #b8157a)"
                : "rgba(255,255,255,0.06)",
              opacity: selectedRole ? 1 : 0.5,
              cursor: selectedRole ? "pointer" : "not-allowed",
            }}
          >
            Enter Platform
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          Demo environment — all roles available for exploration
        </p>
      </div>
    </div>
  );
}
