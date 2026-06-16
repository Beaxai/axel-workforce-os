import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import AppShell from "@/components/AppShell";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import Dashboard from "@/pages/Dashboard";
import OrganizationsPage from "@/pages/OrganizationsPage";
import DealsPage from "@/pages/DealsPage";
import PoliciesPage from "@/pages/PoliciesPage";
import ContactsPage from "@/pages/ContactsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import TasksPage from "@/pages/TasksPage";
import CommissionsPage from "@/pages/CommissionsPage";
import AgentRegistrationsPage from "@/pages/AgentRegistrationsPage";
import RateTablesPage from "@/pages/RateTablesPage";
import ImplementationPage from "@/pages/ImplementationPage";
import WorkforcePage from "@/pages/WorkforcePage";
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import UnderwriterDashboard from "@/pages/dashboard/UnderwriterDashboard";
import CsaDashboard from "@/pages/dashboard/CsaDashboard";
import AgentDashboard from "@/pages/dashboard/AgentDashboard";
import EmployerDashboard from "@/pages/dashboard/EmployerDashboard";
import CarrierDashboard from "@/pages/dashboard/CarrierDashboard";
import PeoDashboard from "@/pages/dashboard/PeoDashboard";
import VendorDashboard from "@/pages/dashboard/VendorDashboard";
import Marketplace from "@/pages/Marketplace";
import ServiceTypeSelect from "@/pages/ServiceTypeSelect";
import QuoteNew from "@/pages/QuoteNew";
import AsoQuote from "@/pages/AsoQuote";
import QuoteWizard from "@/pages/quote-flow/QuoteWizard";
import VerticalDetail from "@/pages/VerticalDetail";
import Pipeline from "@/pages/Pipeline";
import Accounts from "@/pages/Accounts";
import AccountDetail from "@/pages/AccountDetail";
import Implementations from "@/pages/Implementations";
import Billing from "@/pages/Billing";
import Network from "@/pages/Network";
import AgentDetail from "@/pages/network/AgentDetail";
import CarrierDetail from "@/pages/network/CarrierDetail";
import PEODetail from "@/pages/network/PEODetail";
import AgentRegister from "@/pages/register/AgentRegister";
import AgentAgreement from "@/pages/register/AgentAgreement";
import AgentOnboarding from "@/pages/register/AgentOnboarding";
import Resources from "@/pages/Resources";
import AppetiteGuide from "@/pages/resources/AppetiteGuide";
import RateLookup from "@/pages/RateLookup";
import SubmissionPage from "@/pages/SubmissionPage";
import ProposalScreen from "@/pages/ProposalScreen";
import MyProgram from "@/pages/MyProgram";
import ClientOnboarding from "@/pages/ClientOnboarding";
import Welcome from "@/pages/Welcome";
import NotFound from "@/pages/not-found";
import { useAuthStore } from "@/lib/auth-store";
import { GlobalDealCardHost } from "@/components/DealCardModal";

const queryClient = new QueryClient();

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    const rolePath = `/dashboard/${user.role.toLowerCase()}`;
    return <Navigate to={rolePath} replace />;
  }
  return <Navigate to="/login" replace />;
}

function HydrationGate({ children }: { children: React.ReactNode }) {
  const { hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--app-bg, #060608)",
          color: "var(--accent-primary, #E91E8C)",
          fontSize: "14px",
        }}
      >
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <HydrationGate>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/register/agent" element={<AgentRegister />} />
            <Route path="/register/agent/agreement/:id" element={<AgentAgreement />} />
            <Route path="/register/agent/onboarding/:id" element={<AgentOnboarding />} />

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/dashboard/admin/*" element={<AdminDashboard />} />
              <Route path="/admin/rates" element={<RateLookup />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["UNDERWRITER"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/underwriter" element={<UnderwriterDashboard />} />
              <Route path="/dashboard/underwriter/*" element={<UnderwriterDashboard />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["CSA"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/csa" element={<CsaDashboard />} />
              <Route path="/dashboard/csa/*" element={<CsaDashboard />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["AGENT"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/agent" element={<AgentDashboard />} />
              <Route path="/dashboard/agent/*" element={<AgentDashboard />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["EMPLOYER"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/employer" element={<EmployerDashboard />} />
              <Route path="/dashboard/employer/*" element={<EmployerDashboard />} />
              <Route path="/my-program" element={<MyProgram />} />
              <Route path="/my-program/onboarding" element={<ClientOnboarding />} />
            </Route>

            <Route path="/welcome" element={<Welcome />} />

            <Route
              element={
                <ProtectedRoute allowedRoles={["CARRIER"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/carrier" element={<CarrierDashboard />} />
              <Route path="/dashboard/carrier/*" element={<CarrierDashboard />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["PEO"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/peo" element={<PeoDashboard />} />
              <Route path="/dashboard/peo/*" element={<PeoDashboard />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["VENDOR"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard/vendor" element={<VendorDashboard />} />
              <Route path="/dashboard/vendor/*" element={<VendorDashboard />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CSA", "AGENT", "EMPLOYER"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/:slug" element={<VerticalDetail />} />
              <Route path="/marketplace/quote/service-type" element={<ServiceTypeSelect />} />
              <Route path="/marketplace/quote/new" element={<QuoteNew />} />
              <Route path="/marketplace/quote/aso" element={<AsoQuote />} />
              <Route path="/marketplace/quote/wizard" element={<QuoteWizard />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CSA", "AGENT", "UNDERWRITER"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/submission" element={<SubmissionPage />} />
              <Route path="/proposal" element={<ProposalScreen />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CSA", "AGENT", "UNDERWRITER"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/pipeline" element={<Pipeline />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CSA"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/accounts/:id" element={<AccountDetail />} />
              <Route path="/implementations" element={<Implementations />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/billing" element={<Billing />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CSA"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/network" element={<Network />} />
              <Route path="/network/agents/:id" element={<AgentDetail />} />
              <Route path="/network/carriers/:id" element={<CarrierDetail />} />
              <Route path="/network/peo/:id" element={<PEODetail />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "CSA", "AGENT", "UNDERWRITER"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/appetite" element={<AppetiteGuide />} />
            </Route>

            <Route
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/legacy" element={<Dashboard />} />
              <Route path="/organizations" element={<OrganizationsPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/policies" element={<PoliciesPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/commissions" element={<CommissionsPage />} />
              <Route path="/agent-registrations" element={<AgentRegistrationsPage />} />
              <Route path="/rate-tables" element={<RateTablesPage />} />
              <Route path="/implementation" element={<ImplementationPage />} />
              <Route path="/workforce" element={<WorkforcePage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <GlobalDealCardHost />
          </HydrationGate>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
