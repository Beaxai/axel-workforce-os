import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import MarketplacePage from "@/pages/Marketplace";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("ADMIN");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function Marketplace() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/marketplace"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/marketplace" element={<MarketplacePage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
