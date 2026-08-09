/**
 * DealCard — renders Pipeline with the GlobalDealCardHost mounted.
 * Click any deal row to open the deal card overlay (same as the real app).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import PipelinePage from "@/pages/Pipeline";
import { GlobalDealCardHost } from "@/components/DealCardModal";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("ADMIN");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function DealCard() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/pipeline"]}>
        <GlobalDealCardHost />
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/pipeline" element={<PipelinePage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
