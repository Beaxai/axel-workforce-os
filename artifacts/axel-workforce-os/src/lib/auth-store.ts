import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PartyRole =
  | "ADMIN"
  | "UNDERWRITER"
  | "CSA"
  | "AGENT"
  | "EMPLOYER"
  | "CARRIER"
  | "PEO"
  | "VENDOR";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PartyRole;
  orgId?: string;
  orgName?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  switchRole: (role: PartyRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      switchRole: (role) =>
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        })),
    }),
    { name: "axel-auth" }
  )
);

export const ROLE_LABELS: Record<PartyRole, string> = {
  ADMIN: "Administrator",
  UNDERWRITER: "Underwriter",
  CSA: "CSA / Account Manager",
  AGENT: "Agent / Broker",
  EMPLOYER: "Employer / Client",
  CARRIER: "Carrier",
  PEO: "PEO Partner",
  VENDOR: "Vendor",
};

export const ROLE_PATHS: Record<PartyRole, string> = {
  ADMIN: "/dashboard/admin",
  UNDERWRITER: "/dashboard/underwriter",
  CSA: "/dashboard/csa",
  AGENT: "/dashboard/agent",
  EMPLOYER: "/dashboard/employer",
  CARRIER: "/dashboard/carrier",
  PEO: "/dashboard/peo",
  VENDOR: "/dashboard/vendor",
};
