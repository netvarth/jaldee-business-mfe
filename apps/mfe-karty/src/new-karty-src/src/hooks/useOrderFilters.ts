import { useState, useMemo, useCallback } from "react";
import type { OrderItem } from "../components/OrdersTable";

export function useOrderFilters(orders: OrderItem[], searchQuery: string = "") {
  // Orders list "Filter" drawer (patient/order-id text filters + multi-select facets)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [patientNameFilter, setPatientNameFilter] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [storeFilters, setStoreFilters] = useState<string[]>([]);
  const [assignedUserFilters, setAssignedUserFilters] = useState<string[]>([]);
  const [labelFilters, setLabelFilters] = useState<string[]>([]);
  const [orderTypeFilters, setOrderTypeFilters] = useState<string[]>([]);
  const [paymentStatusFilters, setPaymentStatusFilters] = useState<string[]>([]);
  const [dateRangeFilters, setDateRangeFilters] = useState<string[]>([]);

  const activeFilterCount =
    (patientNameFilter !== "" ? 1 : 0) +
    (orderIdFilter !== "" ? 1 : 0) +
    (statusFilters.length > 0 ? 1 : 0) +
    (storeFilters.length > 0 ? 1 : 0) +
    (assignedUserFilters.length > 0 ? 1 : 0) +
    (labelFilters.length > 0 ? 1 : 0) +
    (orderTypeFilters.length > 0 ? 1 : 0) +
    (paymentStatusFilters.length > 0 ? 1 : 0) +
    (dateRangeFilters.length > 0 ? 1 : 0);

  const clearAllFilters = useCallback(() => {
    setPatientNameFilter("");
    setOrderIdFilter("");
    setStatusFilters([]);
    setStoreFilters([]);
    setAssignedUserFilters([]);
    setLabelFilters([]);
    setOrderTypeFilters([]);
    setPaymentStatusFilters([]);
    setDateRangeFilters([]);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search by order number, uid, customer details, or item names (Global search).
      const q = (searchQuery || "").trim().toLowerCase();
      let matchesSearch = true;
      if (q) {
        const orderNo = String(order.orderNo || "").toLowerCase();
        const id = String(order.id || "").toLowerCase();
        const custName = String(order.customerName || "").toLowerCase();
        const custPhone = String(order.customerPhone || "").toLowerCase();
        const custEmail = String(order.customerEmail || "").toLowerCase();
        const channel = String(order.channel || "").toLowerCase();
        const store = String(order.store || "").toLowerCase();
        const status = String(order.status || "").toLowerCase();
        const itemNames = (order.items || []).map((it: any) => String(it.name || "").toLowerCase()).join(" ");

        matchesSearch =
          orderNo.includes(q) ||
          id.includes(q) ||
          custName.includes(q) ||
          custPhone.includes(q) ||
          custEmail.includes(q) ||
          channel.includes(q) ||
          store.includes(q) ||
          status.includes(q) ||
          itemNames.includes(q);
      }

      // 2. Patient Name Filter
      const matchesPatientName =
        !patientNameFilter.trim() ||
        order.customerName.toLowerCase().includes(patientNameFilter.toLowerCase());

      // 3. Store Name Filter
      const matchesStore =
        storeFilters.length === 0 ||
        storeFilters.some((sf) => {
          const val = sf.toLowerCase();
          if (val === "online shop") return order.channel === "online";
          if (val === "store 1") return order.channel === "walkin";
          return order.store && order.store.toLowerCase() === val;
        });

      // 4. Assigned User Filter
      const matchesAssignedUser =
        assignedUserFilters.length === 0 ||
        (order.assignee && assignedUserFilters.includes(order.assignee.name.toLowerCase()));

      // 5. Label Filter
      const matchesLabel =
        labelFilters.length === 0 ||
        (order.label && labelFilters.includes(order.label.text.toLowerCase()));

      // 6. Order ID Filter
      const matchesOrderId =
        !orderIdFilter.trim() ||
        (order.orderNo || "").toLowerCase().includes(orderIdFilter.toLowerCase()) ||
        order.id.toLowerCase().includes(orderIdFilter.toLowerCase());

      // 7. Order Type Filter (Channel)
      const matchesOrderType =
        orderTypeFilters.length === 0 ||
        orderTypeFilters.includes(order.channel.toLowerCase());

      // 8. Payment Status Filter
      const matchesPaymentStatus =
        paymentStatusFilters.length === 0 ||
        paymentStatusFilters.some((pf) => {
          if (pf === "paid") return ["confirmed", "shipped", "delivered"].includes(order.status.toLowerCase());
          if (pf === "unpaid") return ["pending", "cancelled"].includes(order.status.toLowerCase());
          return false;
        });

      // 9. Date Range Filter
      let matchesDateRange = true;
      if (dateRangeFilters.length > 0) {
        matchesDateRange = false;
        for (const df of dateRangeFilters) {
          try {
            const orderDateObj = new Date(order.date);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - orderDateObj.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (df === "today" && diffDays <= 1) matchesDateRange = true;
            else if (df === "week" && diffDays <= 7) matchesDateRange = true;
            else if (df === "month" && diffDays <= 30) matchesDateRange = true;
          } catch {
            // ignore parsing errors
          }
        }
      }

      // 10. Order Status Filter (complements statusFilter but with multi-select)
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(order.status.toLowerCase());

      return (
        matchesSearch &&
        matchesPatientName &&
        matchesStore &&
        matchesAssignedUser &&
        matchesLabel &&
        matchesOrderId &&
        matchesOrderType &&
        matchesPaymentStatus &&
        matchesDateRange &&
        matchesStatus
      );
    });
  }, [
    orders,
    searchQuery,
    statusFilters,
    patientNameFilter,
    storeFilters,
    assignedUserFilters,
    labelFilters,
    orderIdFilter,
    orderTypeFilters,
    paymentStatusFilters,
    dateRangeFilters,
  ]);

  return {
    filterDropdownOpen,
    setFilterDropdownOpen,
    activeDropdownId,
    setActiveDropdownId,
    patientNameFilter,
    setPatientNameFilter,
    orderIdFilter,
    setOrderIdFilter,
    statusFilters,
    setStatusFilters,
    storeFilters,
    setStoreFilters,
    assignedUserFilters,
    setAssignedUserFilters,
    labelFilters,
    setLabelFilters,
    orderTypeFilters,
    setOrderTypeFilters,
    paymentStatusFilters,
    setPaymentStatusFilters,
    dateRangeFilters,
    setDateRangeFilters,
    activeFilterCount,
    clearAllFilters,
    filteredOrders,
  };
}

export type OrderFiltersHook = ReturnType<typeof useOrderFilters>;
