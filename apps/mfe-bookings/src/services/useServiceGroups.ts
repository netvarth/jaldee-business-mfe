import { useCallback, useMemo, useState } from "react";
import { useBookingApi } from "./useBookingApi";
import {
  addCreatedServiceGroup,
  createdServiceGroups,
  removeCreatedServiceGroup,
  updateCreatedServiceGroup,
} from "../data/sessionStore";
import type { ServiceGroupItem } from "../types";

export interface ServiceGroupInput {
  name: string;
  description?: string;
  serviceIds: string[];
  priceMode: "sum" | "fixed";
  price?: number;
  durationMode: "sum" | "override";
  duration?: number;
  status?: "Active" | "Inactive";
}

export function useServiceGroups() {
  const { post, put } = useBookingApi();
  const [version, setVersion] = useState(0);

  const groups = useMemo(() => [...createdServiceGroups], [version]);

  const createGroup = useCallback(async (input: ServiceGroupInput) => {
    const payload = {
      name: input.name.trim(),
      displayOrder: 0,
      status: input.status === "Active" ? "Enabled" : "Disabled",
      combinedDuration: input.duration ?? 0,
      pricingMode: input.priceMode === "fixed" ? "FIXED" : "SUM_OF_LINKED_SERVICES",
      packagePrice: input.price ?? 0,
      currencyCode: "INR", // Defaulting to INR as per typical usage
      services: input.serviceIds.map(uid => ({ uid }))
    };

    try {
      const response = await post<any>("/service-groups", payload);
      
      const group: ServiceGroupItem = {
        id: response?.uid || `svc-group-${Date.now()}`,
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
  }, [put]);

  const updateGroup = useCallback(async (groupId: string, input: ServiceGroupInput) => {
    // We update local state for now until PUT is fully requested for edit
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
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    removeCreatedServiceGroup(groupId);
    setVersion((current) => current + 1);
  }, []);

  return { groups, createGroup, updateGroup, deleteGroup };
}
