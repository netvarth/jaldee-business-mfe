import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { useBookingApi } from "./useBookingApi";
import {
  addCreatedServiceGroup,
  createdServiceGroups,
  removeCreatedServiceGroup,
  updateCreatedServiceGroup,
} from "../data/sessionStore";
import type { ServiceGroupItem } from "../types";
import { unwrapList } from "./response";
import { buildServiceGroupSearchBody } from "./serviceGroupSearch";

export interface ServiceGroupInput {
  name: string;
  description?: string;
  serviceIds: string[];
  priceMode: "FIXED" | "SUM_OF_LINKED_SERVICES" | "MAX_OF_LINKED_SERVICES";
  price?: number;
  durationMode: "OVERRIDE_DURATION" | "SUM_OF_LINKED_SERVICES" | "MAX_OF_LINKED_SERVICES";
  duration?: number;
  status?: "Active" | "Inactive";
}

interface ServiceGroupSearchDto {
  id?: string | number;
  groupId?: string | number;
  uid?: string;
  encId?: string;
  name?: string;
  displayName?: string;
  description?: string;
  shortDescription?: string;
  status?: string;
  serviceIds?: Array<string | number>;
  services?: Array<
    | string
    | number
    | {
        uid?: string;
        id?: string | number;
        serviceUid?: string;
      }
  >;
  linkedServices?: Array<
    | string
    | number
    | {
        uid?: string;
        id?: string | number;
        serviceUid?: string;
      }
  >;
  pricingMode?: string;
  priceMode?: string;
  packagePrice?: string | number;
  price?: string | number;
  durationMode?: string;
  combinedDuration?: string | number;
  duration?: string | number;
  fixedPriceAmount?: string | number;
}

const EMPTY_FILTER_CLAUSES: SearchFilterClause[] = [];

function toNumber(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toUiStatus(status?: string): ServiceGroupItem["status"] {
  return String(status ?? "").toUpperCase() === "DISABLED" ? "Inactive" : "Active";
}

function normalizeServiceIds(
  services:
    | ServiceGroupSearchDto["serviceIds"]
    | ServiceGroupSearchDto["services"]
    | ServiceGroupSearchDto["linkedServices"]
): string[] {
  if (!Array.isArray(services)) {
    return [];
  }

  return services
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return String(item);
      }

      if (item && typeof item === "object") {
        return String(item.uid ?? item.serviceUid ?? item.id ?? "").trim();
      }

      return "";
    })
    .filter(Boolean);
}

function normalizeServiceGroupSearchResult(group: ServiceGroupSearchDto): ServiceGroupItem {
  const id = group.uid ?? group.id ?? group.groupId ?? group.encId;
  const priceModeRaw = String(group.pricingMode ?? group.priceMode ?? "").toUpperCase();
  const priceMode = priceModeRaw === "MAX_OF_LINKED_SERVICES" ? "MAX_OF_LINKED_SERVICES"
    : priceModeRaw === "FIXED" ? "FIXED" : "SUM_OF_LINKED_SERVICES";

  const durationModeRaw = String(group.durationMode ?? "").toUpperCase();
  const durationMode = durationModeRaw === "MAX_OF_LINKED_SERVICES" ? "MAX_OF_LINKED_SERVICES"
    : durationModeRaw === "OVERRIDE_DURATION" || durationModeRaw === "FIXED" ? "OVERRIDE_DURATION" : "SUM_OF_LINKED_SERVICES";

  return {
    id: id != null ? String(id) : `svc-group-${Math.random().toString(36).slice(2, 8)}`,
    name: group.name ?? group.displayName ?? "Unnamed package",
    description: group.description ?? group.shortDescription ?? "",
    serviceIds:
      normalizeServiceIds(group.serviceIds).length > 0
        ? normalizeServiceIds(group.serviceIds)
        : normalizeServiceIds(group.services).length > 0
          ? normalizeServiceIds(group.services)
          : normalizeServiceIds(group.linkedServices),
    priceMode,
    price: toNumber(group.fixedPriceAmount ?? group.packagePrice ?? group.price),
    durationMode,
    duration: toNumber(group.combinedDuration ?? group.duration),
    status: toUiStatus(group.status),
  };
}

export function useServiceGroups(
  filterClauses: SearchFilterClause[] = EMPTY_FILTER_CLAUSES,
  schema: SearchSchema | null | undefined = null,
  options?: { enabled?: boolean }
) {
  const { post, put, patch } = useBookingApi();
  const [version, setVersion] = useState(0);
  const [remoteGroups, setRemoteGroups] = useState<ServiceGroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;
  const inFlightRequestKeyRef = useRef<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const requestBody = buildServiceGroupSearchBody({
      filterClauses,
      schema,
      page: 0,
      size: 100,
    });
    const requestKey = JSON.stringify(requestBody);

    if (inFlightRequestKeyRef.current === requestKey) {
      return;
    }

    inFlightRequestKeyRef.current = requestKey;
    setLoading(true);
    setError(null);
    try {
      const data = await post<unknown>("/service-groups/search", requestBody, {
        _skipLocationParam: true,
      });
      setRemoteGroups(unwrapList<ServiceGroupSearchDto>(data).map(normalizeServiceGroupSearchResult));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load service packages.");
      setRemoteGroups([]);
    } finally {
      if (inFlightRequestKeyRef.current === requestKey) {
        inFlightRequestKeyRef.current = null;
      }
      setLoading(false);
    }
  }, [enabled, filterClauses, post, schema]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    fetchGroups();
  }, [enabled, fetchGroups]);

  const groups = useMemo(() => {
    const localById = new Map(createdServiceGroups.map((group) => [group.id, group]));
    const merged = remoteGroups.map((group) => localById.get(group.id) ?? group);
    const seen = new Set(merged.map((group) => group.id));
    for (const group of createdServiceGroups) {
      if (!seen.has(group.id)) {
        merged.unshift(group);
      }
    }
    return merged;
  }, [remoteGroups, version]);

  const createGroup = useCallback(async (input: ServiceGroupInput) => {
    const payload = {
      name: input.name.trim(),
      description: input.description?.trim(),
      displayOrder: 0,
      durationMode: input.durationMode,
      duration: input.durationMode === "OVERRIDE_DURATION" ? input.duration : undefined,
      pricingMode: input.priceMode,
      fixedPriceAmount: input.price ?? 0,
      currencyCode: "INR", // Defaulting to INR as per typical usage
      linkedServiceUids: input.serviceIds
    };

    try {
      const response = await post<any>("/service-groups", payload);
      const groupId = response?.uid;
      
      if (groupId && input.status) {
        try {
          await put(`/service-groups/${groupId}/status`, { status: input.status === "Active" ? "Enabled" : "Disabled" });
        } catch (statusError) {
          console.error("Failed to update status on create:", statusError);
        }
      }
      
      const group: ServiceGroupItem = {
        id: groupId || `svc-group-${Date.now()}`,
        name: input.name.trim(),
        description: input.description?.trim(),
        serviceIds: input.serviceIds,
        priceMode: input.priceMode,
        price: input.price,
        durationMode: input.durationMode,
        duration: input.duration,
        status: input.status ?? "Active",
      };
      addCreatedServiceGroup(group);
      setVersion((current) => current + 1);
      return group;
    } catch (error) {
      console.error("Failed to create service group:", error);
      throw error;
    }
  }, [post, patch]);

  const updateGroup = useCallback(async (groupId: string, input: ServiceGroupInput) => {
    const payload = {
      name: input.name.trim(),
      description: input.description?.trim(),
      displayOrder: 0,
      durationMode: input.durationMode,
      duration: input.durationMode === "OVERRIDE_DURATION" ? input.duration : undefined,
      pricingMode: input.priceMode,
      fixedPriceAmount: input.price ?? 0,
      currencyCode: "INR",
      linkedServiceUids: input.serviceIds
    };

    try {
      await put(`/service-groups/${groupId}`, payload);
      
      if (input.status) {
        await put(`/service-groups/${groupId}/status`, { status: input.status === "Active" ? "Enabled" : "Disabled" });
      }

      const updated: ServiceGroupItem = {
        id: groupId,
        name: input.name.trim(),
        description: input.description?.trim(),
        serviceIds: input.serviceIds,
        priceMode: input.priceMode,
        price: input.price,
        durationMode: input.durationMode,
        duration: input.duration,
        status: input.status ?? "Active",
      };
      updateCreatedServiceGroup(updated);
      setVersion((current) => current + 1);
      return updated;
    } catch (error) {
      console.error("Failed to update service group:", error);
      throw error;
    }
  }, [put, patch]);

  const toggleStatus = useCallback(async (group: ServiceGroupItem) => {
    const nextStatus = group.status === "Active" ? "Inactive" : "Active";
    const apiStatus = nextStatus === "Active" ? "Enabled" : "Disabled";
    
    setRemoteGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, status: nextStatus } : g)));
    updateCreatedServiceGroup({ ...group, status: nextStatus });
    setVersion((v) => v + 1);

    try {
      await put(`/service-groups/${group.id}/status`, { status: apiStatus });
    } catch (error) {
      setRemoteGroups((prev) => prev.map((g) => (g.id === group.id ? group : g)));
      updateCreatedServiceGroup(group);
      setVersion((v) => v + 1);
      throw error;
    }
  }, [put]);

  const deleteGroup = useCallback((groupId: string) => {
    removeCreatedServiceGroup(groupId);
    setVersion((current) => current + 1);
  }, []);

  return { groups, loading, error, createGroup, updateGroup, deleteGroup, toggleStatus, refresh: fetchGroups };
}
