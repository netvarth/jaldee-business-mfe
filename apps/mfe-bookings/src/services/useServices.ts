import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { useToast } from "../contexts/ToastContext";
import type { ServiceItem } from "../types";
import { createdServices } from "../data/sessionStore";
import { unwrapList } from "./response";

interface ServiceSearchDto {
  id?: string | number;
  serviceId?: string | number;
  uid?: string;
  encId?: string;
  name?: string;
  displayName?: string;
  description?: string;
  shortDescription?: string;
  deptName?: string;
  departmentName?: string;
  department?: string;
  serviceDuration?: string | number;
  duration?: string | number;
  approxDuration?: string | number;
  price?: string | number;
  serviceCharge?: string | number;
  amount?: string | number;
  status?: string;
  serviceType?: string;
}

function toApiStatus(status: ServiceItem["status"]): "Enabled" | "Disabled" {
  return status === "Active" ? "Enabled" : "Disabled";
}

function toUiStatus(status?: string): ServiceItem["status"] {
  return String(status ?? "").toUpperCase() === "DISABLED" ? "Inactive" : "Active";
}

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

function normalizeService(service: ServiceItem): ServiceItem {
  return { ...service, status: toUiStatus(service.status) };
}

function normalizeServiceSearchResult(service: ServiceSearchDto): ServiceItem {
  const id = service.uid ?? service.id ?? service.serviceId ?? service.encId;
  return {
    id: id != null ? String(id) : `srv-${Math.random().toString(36).slice(2, 8)}`,
    uid: service.uid ?? (id != null ? String(id) : undefined),
    name: service.name ?? service.displayName ?? "Unnamed service",
    department: service.deptName ?? service.departmentName ?? service.department ?? "",
    description: service.description ?? service.shortDescription ?? "",
    duration: toNumber(service.serviceDuration ?? service.duration ?? service.approxDuration),
    price: toNumber(service.price ?? service.serviceCharge ?? service.amount),
    status: toUiStatus(service.status),
    serviceType: service.serviceType,
  };
}

export const useServices = () => {
  const api = useBookingApi();
  const { showToast } = useToast();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<unknown>(
        "/services/search",
        {},
        { params: { page: 0, size: 100 } },
      );
      setServices([...createdServices, ...unwrapList<ServiceSearchDto>(data).map(normalizeServiceSearchResult)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load services.");
      setServices([...createdServices]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createService = async (input: Omit<ServiceItem, "id" | "status">) => {
    try {
      const created = await api.post<ServiceItem>("/services", { ...input, status: "Enabled" });
      setServices((prev) => [normalizeService(created), ...prev]);
      showToast("Service created", "success");
    } catch {
      // Offline/no endpoint — append optimistically so the flow is reviewable.
      const local: ServiceItem = { ...input, id: `srv-${Date.now()}`, status: "Active" };
      setServices((prev) => [local, ...prev]);
      showToast("Service created (local)", "info");
    }
  };

  const toggleStatus = async (service: ServiceItem) => {
    const next: ServiceItem["status"] = service.status === "Active" ? "Inactive" : "Active";
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, status: next } : s)));
    try {
      await api.put(`/services/${service.id}`, { ...service, status: toApiStatus(next) });
    } catch {
      // Local-only update is fine for the prototype.
    }
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, error, createService, toggleStatus, refresh: fetchServices };
};
