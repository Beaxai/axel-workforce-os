import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Contact {
  id: string;
  entityType: string;
  entityId: string;
  firstName: string;
  lastName: string;
  title?: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary?: boolean;
  notes?: string;
}

export function useContacts(entityType: string, entityId: string, enabled = true) {
  return useQuery({
    queryKey: ["contacts", entityType, entityId],
    queryFn: () => api.get<Contact[]>(`/contacts?entityType=${entityType}&entityId=${entityId}`),
    enabled: enabled && !!entityType && !!entityId,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Contact, "id">) => api.post<Contact>("/contacts", data),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts", vars.entityType, vars.entityId] });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) =>
      api.patch<Contact>(`/contacts/${id}`, data),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts"] }); // Too generic but simple
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useAgencies() {
  return useQuery({
    queryKey: ["agencies"],
    queryFn: () => api.get<any[]>("/agencies"),
  });
}

export function useCreateAgency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>("/agencies", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agencies"] });
    },
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post<any>("/partners/agents", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners", "Agent"] });
      qc.invalidateQueries({ queryKey: ["partners-all"] });
    },
  });
}
