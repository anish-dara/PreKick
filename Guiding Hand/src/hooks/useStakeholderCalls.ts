import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { GeneratedDocumentRow, StakeholderCallRow, StakeholderHistoryResponse } from "@/lib/types";

export function useStakeholderCalls(dealProfileId: string | null, opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["stakeholder_calls", dealProfileId],
    queryFn: () => apiGet<StakeholderCallRow[]>(`/api/deal-profiles/${dealProfileId}/calls`),
    enabled: !!dealProfileId,
    refetchInterval: opts?.refetchInterval,
  });
}

export function useStakeholderHistory(
  name: string | null,
  email: string | null,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["stakeholder_history", name, email],
    queryFn: () => {
      const params = new URLSearchParams({ name: name ?? "" });
      if (email) params.set("email", email);
      return apiGet<StakeholderHistoryResponse>(`/api/stakeholder-history?${params.toString()}`);
    },
    enabled: !!name && (opts?.enabled ?? true),
  });
}

export function useGeneratedDocument(generatedDocId: string | null) {
  return useQuery({
    queryKey: ["generated_document", generatedDocId],
    queryFn: () => apiGet<GeneratedDocumentRow>(`/api/generated-documents/${generatedDocId}`),
    enabled: !!generatedDocId,
  });
}
