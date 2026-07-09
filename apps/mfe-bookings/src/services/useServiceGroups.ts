import { useCallback, useMemo, useState } from "react";
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
  const [version, setVersion] = useState(0);

  const groups = useMemo(() => [...createdServiceGroups], [version]);

  const createGroup = useCallback((input: ServiceGroupInput) => {
    const group: ServiceGroupItem = {
      id: `svc-group-${Date.now()}`,
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
  }, []);

  const updateGroup = useCallback((groupId: string, input: ServiceGroupInput) => {
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
