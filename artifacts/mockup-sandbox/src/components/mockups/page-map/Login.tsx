import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import { useEffect } from "react";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

export default function Login() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
