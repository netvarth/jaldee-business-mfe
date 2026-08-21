import { motion } from "motion/react";
import { Filter, X, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";
import type { OrderFiltersHook } from "../hooks/useOrderFilters";

function toggleArrayFilter(current: string[], setter: (v: string[]) => void, value: string) {
  setter(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
}

interface OrdersFilterDrawerProps {
  filters: OrderFiltersHook;
  onClose: () => void;
}

export function OrdersFilterDrawer({ filters, onClose }: OrdersFilterDrawerProps) {
  const {
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
  } = filters;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs"
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="bg-white border-l border-slate-200 w-full max-w-md z-10 shadow-2xl relative flex flex-col h-full text-left"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#55349A]" />
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Filter Orders</h3>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#55349A] text-[10px] font-black text-white">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-450 font-bold mt-0.5">
              Select multiple choices per category
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Patient Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Patient Name
            </label>
            <input
              type="text"
              value={patientNameFilter}
              onChange={(e) => setPatientNameFilter(e.target.value)}
              placeholder="Search patient/customer name..."
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all bg-white text-slate-800 font-medium"
            />
          </div>

          {/* 2. Order ID */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Order ID / Number
            </label>
            <input
              type="text"
              value={orderIdFilter}
              onChange={(e) => setOrderIdFilter(e.target.value)}
              placeholder="e.g. ORD-1002"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] transition-all bg-white text-slate-800 font-medium"
            />
          </div>

          {/* 3. Status Multi-Select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Status Filter
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled", "Returned"].map((status) => {
                const stLower = status.toLowerCase();
                const isSelected = statusFilters.includes(stLower);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleArrayFilter(statusFilters, setStatusFilters, stLower)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none",
                      isSelected
                        ? "bg-[#55349A]/10 text-[#55349A] border-[#55349A]/30 shadow-xs"
                        : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Designated Store */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Designated Store
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["Store 1", "Online Shop"].map((store) => {
                const isSelected = storeFilters.includes(store.toLowerCase());
                return (
                  <button
                    key={store}
                    type="button"
                    onClick={() => toggleArrayFilter(storeFilters, setStoreFilters, store.toLowerCase())}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none",
                      isSelected
                        ? "bg-[#55349A]/10 text-[#55349A] border-[#55349A]/30 shadow-xs"
                        : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {store}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Assigned Users */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Assigned User
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["Alok Verma", "Riya Sen", "Deepak Rao", "Sneha K", "Arjun Patel", "Pooja Hegde"].map((agent) => {
                const isSelected = assignedUserFilters.includes(agent.toLowerCase());
                return (
                  <button
                    key={agent}
                    type="button"
                    onClick={() => toggleArrayFilter(assignedUserFilters, setAssignedUserFilters, agent.toLowerCase())}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none",
                      isSelected
                        ? "bg-[#55349A]/10 text-[#55349A] border-[#55349A]/30 shadow-xs"
                        : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {agent}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Tags / Labels */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Workflow Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["VIP", "Urgent", "Fragile", "Standard"].map((label) => {
                const isSelected = labelFilters.includes(label.toLowerCase());
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleArrayFilter(labelFilters, setLabelFilters, label.toLowerCase())}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none",
                      isSelected
                        ? "bg-[#55349A]/10 text-[#55349A] border-[#55349A]/30 shadow-xs"
                        : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Payment Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Payment Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Paid in Full", val: "paid" },
                { label: "Unpaid / Pending", val: "unpaid" }
              ].map((pay) => {
                const isSelected = paymentStatusFilters.includes(pay.val);
                return (
                  <button
                    key={pay.val}
                    type="button"
                    onClick={() => toggleArrayFilter(paymentStatusFilters, setPaymentStatusFilters, pay.val)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none",
                      isSelected
                        ? "bg-[#55349A]/10 text-[#55349A] border-[#55349A]/30 shadow-xs"
                        : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {pay.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8. Order Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Order Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Walk-In POS", val: "walkin" },
                { label: "Online Store", val: "online" }
              ].map((type) => {
                const isSelected = orderTypeFilters.includes(type.val);
                return (
                  <button
                    key={type.val}
                    type="button"
                    onClick={() => toggleArrayFilter(orderTypeFilters, setOrderTypeFilters, type.val)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none",
                      isSelected
                        ? "bg-[#55349A]/10 text-[#55349A] border-[#55349A]/30 shadow-xs"
                        : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 9. Date Period */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Date Period
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Today", val: "today" },
                { label: "This Week", val: "week" },
                { label: "This Month", val: "month" }
              ].map((period) => {
                const isSelected = dateRangeFilters.includes(period.val);
                return (
                  <button
                    key={period.val}
                    type="button"
                    onClick={() => toggleArrayFilter(dateRangeFilters, setDateRangeFilters, period.val)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none",
                      isSelected
                        ? "bg-[#55349A]/10 text-[#55349A] border-[#55349A]/30 shadow-xs"
                        : "bg-white text-slate-650 border-slate-200 hover:bg-[#55349A]/5 hover:text-[#55349A]"
                    )}
                  >
                    {period.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-bold">
            {filteredOrders.length} matching {filteredOrders.length === 1 ? "order" : "orders"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#55349A]/90 hover:bg-[#55349A] text-white text-xs font-black rounded-lg shadow-sm cursor-pointer border-none"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    </div>
  );
}
