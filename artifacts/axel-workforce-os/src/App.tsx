import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
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
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
