import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { DealProfileRow } from "@/lib/types";

export function useDealProfiles() {
  return useQuery({
    queryKey: ["deal_profiles"],
    queryFn: () => apiGet<DealProfileRow[]>("/api/deal-profiles"),
  });
}

export function useDealProfile(dealProfileId: string | null) {
  return useQuery({
    queryKey: ["deal_profile", dealProfileId],
    queryFn: () => apiGet<DealProfileRow>(`/api/deal-profiles/${dealProfileId}`),
    enabled: !!dealProfileId,
  });
}

export type ActiveDealContext = {
  dealProfileId: string | null;
  onProfileCreated: (id: string) => void;
};
