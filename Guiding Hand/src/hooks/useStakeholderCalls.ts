import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { GeneratedDocumentRow, StakeholderCallRow } from "@/lib/types";

export function useStakeholderCalls(dealProfileId: string | null, opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["stakeholder_calls", dealProfileId],
    queryFn: () => apiGet<StakeholderCallRow[]>(`/api/deal-profiles/${dealProfileId}/calls`),
    enabled: !!dealProfileId,
    refetchInterval: opts?.refetchInterval,
  });
}

export function useGeneratedDocument(generatedDocId: string | null) {
  return useQuery({
    queryKey: ["generated_document", generatedDocId],
    queryFn: () => apiGet<GeneratedDocumentRow>(`/api/generated-documents/${generatedDocId}`),
    enabled: !!generatedDocId,
  });
}
