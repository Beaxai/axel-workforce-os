import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AgentRegister from "@/pages/register/AgentRegister";
import { useEffect } from "react";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

export default function Register() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/register/agent"]}>
        <Routes>
          <Route path="/register/agent" element={<AgentRegister />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
