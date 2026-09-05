import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useContactRoles() {
  return useQuery({
    queryKey: ["contact-roles"],
    queryFn: () => api.get<Record<string, string[]>>("/contacts/roles"),
    staleTime: Infinity,
  });
}
