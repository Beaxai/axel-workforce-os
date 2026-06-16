import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  type AuthUser as ApiAuthUser,
} from "@workspace/api-client-react";

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
  avatarUrl?: string;
  orgId?: string;
  orgName?: string;
}

/** Map the server's (nullable) AuthUser onto the client shape used by components. */
function fromApiUser(u: ApiAuthUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    role: u.role as PartyRole,
    avatarUrl: u.avatarUrl ?? undefined,
    orgId: u.orgId ?? undefined,
    orgName: u.orgName ?? undefined,
  };
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True once an initial /me hydration attempt has completed. */
  hydrated: boolean;
  setUser: (user: AuthUser) => void;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  switchRole: (role: PartyRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hydrated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      signIn: async (email, password) => {
        const { user } = await apiLogin({ email, password });
        const mapped = fromApiUser(user);
        set({ user: mapped, isAuthenticated: true, hydrated: true });
        return mapped;
      },
      logout: async () => {
        try {
          await apiLogout();
        } catch {
          // Ignore network/401 errors — clear local state regardless.
        }
        set({ user: null, isAuthenticated: false, hydrated: true });
      },
      hydrate: async () => {
        try {
          const { user } = await getCurrentUser();
          set({ user: fromApiUser(user), isAuthenticated: true, hydrated: true });
        } catch {
          set({ user: null, isAuthenticated: false, hydrated: true });
        }
      },
      switchRole: (role) =>
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        })),
    }),
    {
      name: "axel-auth",
      // Persist only the user object for snappy first paint; the cookie/server
      // session is the source of truth and is re-verified via hydrate() on load.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
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
