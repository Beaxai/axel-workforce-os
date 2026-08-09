import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import AdminDashboardPage from "@/pages/dashboard/AdminDashboard";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("ADMIN");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function AdminDashboard() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/dashboard/admin"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
