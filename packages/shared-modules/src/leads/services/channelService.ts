import { apiClient } from "@jaldee/api-client";
import type { BranchLocation } from "@jaldee/auth-context";
import {
  BASE_SERVICE_ENDPOINTS,
  buildBaseServiceUrl,
} from "../../serviceUrls";
import type { Channel, ChannelType } from "../types";

type ChannelSearchParams = {
  page?: number;
  size?: number;
  sort?: string;
};

const withoutLocationParam = (params?: ChannelSearchParams) => ({
  _skipLocationParam: true,
  ...(params ? { params } : {}),
}) as any;

type ApiEnvelope<T> = {
  data?: T | { data?: T; content?: T; records?: T; items?: T };
  content?: T;
  records?: T;
  items?: T;
};

function unwrap<T>(value: unknown): T {
  const root = value as ApiEnvelope<T>;
  const data = root?.data as ApiEnvelope<T> | T | undefined;

  if (data && typeof data === "object") {
    const nested = data as ApiEnvelope<T>;
    return (nested.data ?? nested.content ?? nested.records ?? nested.items ?? data) as T;
  }

  return (root?.data ?? root?.content ?? root?.records ?? root?.items ?? value) as T;
}

function toChannel(raw: any): Channel {
  return {
    uid: String(raw?.uid ?? raw?.uuid ?? ""),
    name: String(raw?.name || raw?.channelName || ""),
    channelType: (raw?.channelType || raw?.type || "DIRECT") as ChannelType,
    location: raw?.location || (Array.isArray(raw?.locations) && raw.locations.length > 0 ? (raw.locations[0]?.place || raw.locations[0]?.name || raw.locations[0]?.locationName) : undefined),
    productUid: raw?.productUid || (Array.isArray(raw?.productUids) ? raw.productUids[0] : undefined),
    productUids: Array.isArray(raw?.productUids) ? raw.productUids : raw?.productUid ? [raw.productUid] : [],
    productName: raw?.productName || (Array.isArray(raw?.products) ? raw.products.map((p: any) => p.productName || p.name).join(", ") : undefined),
    productType: raw?.productType,
    qrUrl: raw?.qrUrl,
    status: raw?.status ?? raw?.internalStatus ?? "ACTIVE",
  };
}

function toChannelList(raw: unknown): Channel[] {
  const unwrapped = unwrap<unknown>(raw);
  const list = Array.isArray(unwrapped)
    ? unwrapped
    : Array.isArray((unwrapped as any)?.content)
      ? (unwrapped as any).content
      : Array.isArray((unwrapped as any)?.records)
        ? (unwrapped as any).records
        : Array.isArray((unwrapped as any)?.items)
          ? (unwrapped as any).items
          : Array.isArray((unwrapped as any)?.data)
            ? (unwrapped as any).data
            : [];

  return list.map(toChannel).filter((channel) => channel.uid);
}

function toChannelPayload(data: Partial<Channel>, availableLocations: BranchLocation[] = []) {
  const matchedLocation = availableLocations.find(loc => loc.name === data.location);

  return {
    name: data.name?.trim(),
    channelType: data.channelType || "DIRECT",
    locations: matchedLocation ? [
      {
        id: Number((matchedLocation as any).locationId) || undefined,
        uid: (matchedLocation as any).uid || matchedLocation.id,
        place: matchedLocation.name
      }
    ] : undefined,
    productUids: data.productUids || (data.productUid ? [data.productUid] : undefined),
    status: data.status || "ACTIVE",
  };
}

export const leadChannelService = {
  async list() {
    const response = await apiClient.get(
      buildBaseServiceUrl("/base-service/v1/api/tenant/crm/leads/channel")
    );
    return toChannelList(response);
  },

  async search(filters: Record<string, unknown> = {}, params: ChannelSearchParams = { page: 0, size: 100 }) {
    const response = await apiClient.post(
      buildBaseServiceUrl("/base-service/v1/api/tenant/crm/leads/channel/search"),
      filters,
      withoutLocationParam(params)
    );
    return toChannelList(response);
  },

  async create(channel: Partial<Channel>, availableLocations: BranchLocation[] = []) {
    const response = await apiClient.post(
      buildBaseServiceUrl("/base-service/v1/api/tenant/crm/leads/channel"),
      toChannelPayload(channel, availableLocations),
      withoutLocationParam()
    );
    return toChannel(unwrap(response));
  },

  async detail(uid: string) {
    const response = await apiClient.get(
      buildBaseServiceUrl(`/base-service/v1/api/tenant/crm/leads/channel/${encodeURIComponent(uid)}`)
    );
    return toChannel(unwrap(response));
  },

  async update(uid: string, channel: Partial<Channel>, availableLocations: BranchLocation[] = []) {
    const response = await apiClient.put(
      buildBaseServiceUrl(`/base-service/v1/api/tenant/crm/leads/channel/${encodeURIComponent(uid)}`),
      toChannelPayload(channel, availableLocations),
      withoutLocationParam()
    );
    return toChannel(unwrap(response));
  },

  async getLink(uid: string) {
    const response = await apiClient.get(
      buildBaseServiceUrl(`/base-service/v1/api/tenant/crm/leads/channel/${encodeURIComponent(uid)}/link`)
    );
    return unwrap<string>(response);
  },

  async updateStatus(uid: string, status: string) {
    await apiClient.patch(
      buildBaseServiceUrl(`/base-service/v1/api/tenant/crm/leads/channel/${encodeURIComponent(uid)}/status/${encodeURIComponent(status)}`),
      undefined,
      withoutLocationParam()
    );
  },

  async getByEncoded(encodedId: string) {
    const response = await apiClient.get(
      buildBaseServiceUrl(`/base-service/v1/api/tenant/crm/leads/channel/encoded/${encodeURIComponent(encodedId)}`)
    );
    return toChannel(unwrap(response));
  },
};
