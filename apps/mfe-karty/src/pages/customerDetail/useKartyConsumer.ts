import { useQuery } from "@tanstack/react-query";
import { useCrmApi } from "../../services/useCrmApi";

/**
 * The base-crm consumer record, raw.
 *
 * The shared customers module maps this into its own `Customer` shape and drops what
 * Karty's record needs — `state`, `district`, `consumerNo` and the whole `profile` block
 * that carries the customer's labels and groups. This reads the endpoint directly.
 */
export interface KartyConsumer {
  uid: string;
  consumerNo?: string;
  internalConsumerNo?: string;
  title?: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  status?: string;
  phoneE164?: string | null;
  whatsAppE164?: string | null;
  email?: string | null;
  gender?: string | null;
  dob?: string | null;
  address?: string | null;
  state?: string | null;
  district?: string | null;
  commerceConsumer?: boolean;
  createdAt?: string;
  profile?: {
    photos?: unknown[];
    labels?: Record<string, unknown>;
    groups?: { uid?: string; name?: string; groupName?: string; memberId?: string | null }[];
    preferredLanguages?: unknown[];
  };
}

export function useKartyConsumer(uid?: string | null) {
  const api = useCrmApi();

  return useQuery({
    queryKey: ["kartyConsumer", uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const data = await api.get<KartyConsumer>(`/v1/api/tenant/consumers/${uid}`);
      return data;
    },
  });
}

/** Full name as the record should read it, falling back through the CRM's name fields. */
export function consumerName(c?: KartyConsumer | null): string {
  if (!c) return "";
  const joined = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return c.displayName?.trim() || joined || c.consumerNo || "Customer";
}

/** Labels come back as a map; only the truthy entries are actually applied. */
export function consumerLabels(c?: KartyConsumer | null): string[] {
  const raw = c?.profile?.labels;
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw)
    .filter(([, v]) => v !== false && v != null && v !== "")
    .map(([k, v]) => (typeof v === "string" && v.trim() ? v : k));
}
