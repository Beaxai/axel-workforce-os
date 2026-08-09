import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import UserProfile from "@/pages/UserProfile";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("ADMIN");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function Profile() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/profile" element={<UserProfile self />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
