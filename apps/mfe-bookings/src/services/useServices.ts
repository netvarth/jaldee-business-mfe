import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { useToast } from "../contexts/ToastContext";
import type { ServiceItem } from "../types";
import { createdServices } from "../data/sessionStore";

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
      // NOTE: booking-service has no /services endpoint yet (catalog lives in
      // another service). No mock fallback — an empty/error state here makes the
      // missing wiring visible instead of masking it with sample data.
      const data = await api.get<ServiceItem[]>("/services");
      setServices([...createdServices, ...(data ?? [])]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load services.");
      setServices([...createdServices]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createService = async (input: Omit<ServiceItem, "id" | "status">) => {
    try {
      const created = await api.post<ServiceItem>("/services", { ...input, status: "Active" });
      setServices((prev) => [created, ...prev]);
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
      await api.put(`/services/${service.id}`, { ...service, status: next });
    } catch {
      // Local-only update is fine for the prototype.
    }
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, error, createService, toggleStatus, refresh: fetchServices };
};
