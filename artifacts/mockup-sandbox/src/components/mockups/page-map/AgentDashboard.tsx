import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import AgentDashboardPage from "@/pages/dashboard/AgentDashboard";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("AGENT");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function AgentDashboard() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard/agent"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard/agent" element={<AgentDashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
