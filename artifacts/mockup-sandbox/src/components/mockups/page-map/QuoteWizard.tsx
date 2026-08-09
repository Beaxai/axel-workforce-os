import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/AppShell";
import QuoteWizardPage from "@/pages/quote-flow/QuoteWizard";
import { seedAuth } from "../../../_preview/seed";
import { useEffect } from "react";

seedAuth("AGENT");
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

export default function QuoteWizard() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/marketplace/quote/wizard"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/marketplace/quote/wizard" element={<QuoteWizardPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
