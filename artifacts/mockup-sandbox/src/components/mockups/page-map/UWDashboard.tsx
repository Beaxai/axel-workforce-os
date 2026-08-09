import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import UnderwriterDashboard from "@/pages/dashboard/UnderwriterDashboard";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("UNDERWRITER");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function UWDashboard() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard/underwriter"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard/underwriter" element={<UnderwriterDashboard />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
