import {
  LayoutDashboard,
  Store,
  Handshake,
  Users,
  Rocket,
  Receipt,
  Network,
  BookOpen,
  Shield,
  Lock,
  ClipboardList,
  Calculator,
  Map,
  type LucideIcon,
} from "lucide-react";
import type { PartyRole } from "./auth-store";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  locked?: boolean;
}

const adminNav: NavItem[] = [
  { label: "Home", path: "/dashboard/admin", icon: LayoutDashboard },
  { label: "Marketplace", path: "/marketplace", icon: Store },
  { label: "Pipeline", path: "/pipeline", icon: Handshake },
  { label: "Accounts", path: "/accounts", icon: Users },
  { label: "Implementations", path: "/implementations", icon: Rocket },
  { label: "Billing", path: "/billing", icon: Receipt },
  { label: "Network", path: "/network", icon: Network },
  { label: "Resources", path: "/resources", icon: BookOpen },
  { label: "Rate Table", path: "/admin/rates", icon: Calculator },
  { label: "Journeys", path: "/admin/journeys", icon: Map },
];

const csaNav: NavItem[] = [
  { label: "Home", path: "/dashboard/csa", icon: LayoutDashboard },
  { label: "Marketplace", path: "/marketplace", icon: Store },
  { label: "Pipeline", path: "/pipeline", icon: Handshake },
  { label: "Accounts", path: "/accounts", icon: Users },
  { label: "Implementations", path: "/implementations", icon: Rocket },
  { label: "Network", path: "/network", icon: Network },
  { label: "Resources", path: "/resources", icon: BookOpen },
];

const agentNav: NavItem[] = [
  { label: "Home", path: "/dashboard/agent", icon: LayoutDashboard },
  { label: "Pipeline", path: "/pipeline", icon: Handshake },
  { label: "Marketplace", path: "/marketplace", icon: Store },
  { label: "Accounts", path: "/accounts", icon: Users },
  { label: "Resources", path: "/resources", icon: BookOpen },
];

const underwriterNav: NavItem[] = [
  { label: "Home", path: "/dashboard/underwriter", icon: LayoutDashboard },
  { label: "Pipeline", path: "/pipeline", icon: Handshake },
  { label: "Accounts", path: "/accounts", icon: Users },
  { label: "Resources", path: "/resources", icon: BookOpen },
];

const employerNav: NavItem[] = [
  { label: "Home", path: "/dashboard/employer", icon: LayoutDashboard },
  { label: "Marketplace", path: "/marketplace", icon: Store },
  { label: "My Program", path: "/my-program", icon: Shield },
  { label: "Onboarding", path: "/my-program/onboarding", icon: ClipboardList },
];

const carrierNav: NavItem[] = [
  { label: "Home", path: "/dashboard/carrier", icon: LayoutDashboard },
  { label: "Accounts", path: "/dashboard/carrier/accounts", icon: Users },
];

const peoNav: NavItem[] = [
  { label: "Home", path: "/dashboard/peo", icon: LayoutDashboard },
  { label: "Network", path: "/dashboard/peo/network", icon: Network },
];

const vendorNav: NavItem[] = [
  { label: "Home", path: "/dashboard/vendor", icon: LayoutDashboard },
  { label: "Accounts", path: "/dashboard/vendor/accounts", icon: Users },
];

export const ROLE_NAV: Record<PartyRole, NavItem[]> = {
  ADMIN: adminNav,
  UNDERWRITER: underwriterNav,
  CSA: csaNav,
  AGENT: agentNav,
  EMPLOYER: employerNav,
  CARRIER: carrierNav,
  PEO: peoNav,
  VENDOR: vendorNav,
};
