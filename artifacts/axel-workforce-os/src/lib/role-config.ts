import {
  LayoutDashboard,
  Building2,
  Handshake,
  Users,
  ListChecks,
  FileText,
  Shield,
  BarChart3,
  Settings,
  ClipboardList,
  RefreshCw,
  Download,
  DollarSign,
  Briefcase,
  HeartPulse,
  Receipt,
  Rocket,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { PartyRole } from "./auth-store";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/admin", icon: LayoutDashboard },
  { label: "Organizations", path: "/dashboard/admin/organizations", icon: Building2 },
  { label: "Deals / Pipeline", path: "/dashboard/admin/deals", icon: Handshake },
  { label: "Agents", path: "/dashboard/admin/agents", icon: Users },
  { label: "Underwriting Queue", path: "/dashboard/admin/underwriting", icon: ListChecks },
  { label: "Clients", path: "/dashboard/admin/clients", icon: Briefcase },
  { label: "Carriers", path: "/dashboard/admin/carriers", icon: Truck },
  { label: "PEO Accounts", path: "/dashboard/admin/peo", icon: Building2 },
  { label: "Task Manager", path: "/dashboard/admin/tasks", icon: ClipboardList },
  { label: "Reports", path: "/dashboard/admin/reports", icon: BarChart3 },
  { label: "Settings", path: "/dashboard/admin/settings", icon: Settings },
];

const underwriterNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/underwriter", icon: LayoutDashboard },
  { label: "Underwriting Queue", path: "/dashboard/underwriter/queue", icon: ListChecks },
  { label: "Deals Pending Review", path: "/dashboard/underwriter/pending", icon: Handshake },
  { label: "Bound Policies", path: "/dashboard/underwriter/policies", icon: Shield },
  { label: "Rate Tables", path: "/dashboard/underwriter/rates", icon: BarChart3 },
  { label: "Reports", path: "/dashboard/underwriter/reports", icon: FileText },
];

const csaNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/csa", icon: LayoutDashboard },
  { label: "My Clients", path: "/dashboard/csa/clients", icon: Users },
  { label: "Active Policies", path: "/dashboard/csa/policies", icon: Shield },
  { label: "Renewals", path: "/dashboard/csa/renewals", icon: RefreshCw },
  { label: "Tasks", path: "/dashboard/csa/tasks", icon: ClipboardList },
  { label: "Documents", path: "/dashboard/csa/documents", icon: FileText },
];

const agentNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/agent", icon: LayoutDashboard },
  { label: "My Deals", path: "/dashboard/agent/deals", icon: Handshake },
  { label: "New Quote", path: "/dashboard/agent/new-quote", icon: FileText },
  { label: "Clients", path: "/dashboard/agent/clients", icon: Users },
  { label: "Commission Statements", path: "/dashboard/agent/commissions", icon: DollarSign },
  { label: "Resources", path: "/dashboard/agent/resources", icon: Download },
];

const employerNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/employer", icon: LayoutDashboard },
  { label: "My Policy", path: "/dashboard/employer/policy", icon: Shield },
  { label: "Claims", path: "/dashboard/employer/claims", icon: HeartPulse },
  { label: "Documents", path: "/dashboard/employer/documents", icon: FileText },
  { label: "Payroll / Billing", path: "/dashboard/employer/billing", icon: Receipt },
  { label: "PEO Onboarding", path: "/dashboard/employer/onboarding", icon: Rocket },
];

const carrierNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/carrier", icon: LayoutDashboard },
  { label: "Bound Policies", path: "/dashboard/carrier/policies", icon: Shield },
  { label: "Claims", path: "/dashboard/carrier/claims", icon: HeartPulse },
  { label: "Commission Statements", path: "/dashboard/carrier/commissions", icon: DollarSign },
  { label: "Reports", path: "/dashboard/carrier/reports", icon: BarChart3 },
];

const peoNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/peo", icon: LayoutDashboard },
  { label: "PEO Clients", path: "/dashboard/peo/clients", icon: Users },
  { label: "Workforce Data", path: "/dashboard/peo/workforce", icon: Briefcase },
  { label: "Billing", path: "/dashboard/peo/billing", icon: Receipt },
  { label: "Reports", path: "/dashboard/peo/reports", icon: BarChart3 },
];

const vendorNav: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/vendor", icon: LayoutDashboard },
  { label: "Assigned Tasks", path: "/dashboard/vendor/tasks", icon: ClipboardList },
  { label: "Documents", path: "/dashboard/vendor/documents", icon: FileText },
  { label: "Reports", path: "/dashboard/vendor/reports", icon: BarChart3 },
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
