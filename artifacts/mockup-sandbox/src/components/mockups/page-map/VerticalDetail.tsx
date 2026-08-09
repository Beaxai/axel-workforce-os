import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import VerticalDetailPage from "@/pages/VerticalDetail";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("ADMIN");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function VerticalDetail() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/marketplace/peo-wc"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/marketplace/:slug" element={<VerticalDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
