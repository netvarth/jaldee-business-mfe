import { useQuery } from "@tanstack/react-query";
import { leadService } from "../services/leadService";

export function useLeadByUid(uid: string) {
  return useQuery({
    queryKey: ["lead-records", uid],
    queryFn: () => leadService.detail(uid),
    enabled: !!uid,
  });
}
