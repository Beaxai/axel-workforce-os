import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import AdminUsersPage from "@/pages/AdminUsers";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("ADMIN");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function AdminUsers() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/users"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
