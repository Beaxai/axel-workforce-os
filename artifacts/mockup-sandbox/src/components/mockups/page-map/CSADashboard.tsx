import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import CsaDashboard from "@/pages/dashboard/CsaDashboard";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("CSA");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function CSADashboard() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard/csa"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard/csa" element={<CsaDashboard />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
