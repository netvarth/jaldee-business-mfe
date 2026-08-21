import React, { useState } from "react";
import {
  BellRing,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  ShoppingCart,
  ArrowUpRight,
  Layers,
  Building2,
  CheckCircle2
} from "lucide-react";
import {
  useReorderAlerts,
  useTriggerReorderSweep,
  useUpdateReorderAlertStatus,
  ReorderAlertDto
} from "../../services/useReorderAlerts";
import { useNavigate } from "react-router-dom";
import { CreatePurchaseOrder } from "../../new-karty-src/src/components/CreatePurchaseOrder";

export function ReorderAlertsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: alerts, isLoading, refetch } = useReorderAlerts(statusFilter);
  const sweepMutation = useTriggerReorderSweep();
  const updateStatusMutation = useUpdateReorderAlertStatus();

  // Reorder → Purchase Order handoff: seed a PO from the current open alerts.
  const [creatingPo, setCreatingPo] = useState<null | { seed: any; alertUids: string[] }>(null);

  const openCreatePo = () => {
    const open = (alerts || []).filter((a) => a.status === "OPEN");
    const src = open.length ? open : (alerts || []);
    if (!src.length) return;
    const vendorSet = new Set(src.map((a) => a.vendorUid).filter(Boolean));
    const storeSet = new Set(src.map((a) => a.storeUid).filter(Boolean));
    setCreatingPo({
      alertUids: src.map((a) => a.uid),
      seed: {
        vendorUid: vendorSet.size === 1 ? [...vendorSet][0] : undefined,
        storeUid: storeSet.size === 1 ? [...storeSet][0] : undefined,
        lines: src.map((a) => ({
          itemUid: a.itemUid,
          name: a.itemName,
          sku: a.sku,
          orderedQty: a.reorderQuantity || 0,
          variantUid: a.variantUid || null,
        })),
      },
    });
  };

  const handleSweep = async () => {
    try {
      const generatedCount = await sweepMutation.mutateAsync();
      alert(`Reorder evaluation sweep completed! Found ${generatedCount} items below safety reorder points.`);
      refetch();
    } catch (err: any) {
      alert("Failed to run sweep: " + (err?.message || "Unknown error"));
    }
  };

  const handleStatusChange = async (uid: string, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ uid, status });
      refetch();
    } catch (err: any) {
      alert("Failed to update alert: " + (err?.message || "Unknown error"));
    }
  };

  const filteredAlerts = (alerts || []).filter(a =>
    a.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.storeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCount = (alerts || []).filter(a => a.status === "OPEN").length;
  const criticalCount = (alerts || []).filter(a => a.currentStock <= 0).length;
  const totalReorderUnits = (alerts || []).reduce((sum, a) => sum + (a.reorderQuantity || 0), 0);

  if (creatingPo) {
    return (
      <CreatePurchaseOrder
        seed={creatingPo.seed}
        onBack={() => setCreatingPo(null)}
        onCreated={() => {
          // Resolve the alerts we just raised a PO for.
          creatingPo.alertUids.forEach((uid) => {
            updateStatusMutation.mutate({ uid, status: "RESOLVED" });
          });
          setCreatingPo(null);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <BellRing size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">
              Reorder & Low Stock Alerts
            </h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              Automated safety stock sweeps, minimum reorder thresholds, and purchase replenishment triggers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreatePo}
            disabled={(alerts || []).length === 0}
            title={openCount === 0 ? "No open alerts to reorder" : "Raise a purchase order for the low-stock items"}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#55349A] hover:bg-[#43287A] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={15} />
            Create Purchase Order
          </button>
          <button
            type="button"
            onClick={handleSweep}
            disabled={sweepMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={sweepMutation.isPending ? "animate-spin" : ""} />
            {sweepMutation.isPending ? "Running Sweep..." : "Evaluate Stock Sweep"}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Open Low Stock Alerts</span>
            <AlertCircle size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{openCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Items breached below reorder threshold</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Completely Stocked Out</span>
            <Layers size={16} className="text-red-700" />
          </div>
          <div className="text-2xl font-black text-red-700">{criticalCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Zero available inventory on shelf</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Suggested Reorder Units</span>
            <ShoppingCart size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">{totalReorderUnits}</div>
          <p className="text-[11px] text-surface-400 font-medium">Total units recommended for purchase</p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-700 outline-none"
          >
            <option value="OPEN">Open Alerts</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ALL">All Statuses</option>
          </select>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors"
            title="Refresh Alerts"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-50/80 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Item / SKU</th>
              <th className="py-3.5 px-4">Store / Location</th>
              <th className="py-3.5 px-4 text-center">Current Stock</th>
              <th className="py-3.5 px-4 text-center">Reorder Point</th>
              <th className="py-3.5 px-4 text-center">Suggested Reorder</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-surface-400">
                  <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Checking reorder alerts...</span>
                </td>
              </tr>
            ) : filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-surface-400">
                  <CheckCircle2 size={32} className="mx-auto text-surface-300 mb-2" />
                  <p className="text-sm font-bold text-surface-700">No low stock alerts in this view</p>
                  <p className="text-xs text-surface-400 mt-0.5">Trigger a stock sweep to evaluate current inventory against safety thresholds.</p>
                </td>
              </tr>
            ) : (
              filteredAlerts.map((a) => {
                const isOutOfStock = a.currentStock <= 0;
                return (
                  <tr key={a.uid} className="hover:bg-surface-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-surface-900">
                      <div>{a.itemName}</div>
                      {a.sku && <div className="text-[10.5px] font-mono text-surface-400">SKU: {a.sku}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-surface-800">{a.storeName || "Main Warehouse"}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        isOutOfStock
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {a.currentStock} Units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-surface-700">
                      {a.reorderPoint}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-600">
                      +{a.reorderQuantity}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                        a.status === "RESOLVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : a.status === "ACKNOWLEDGED"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : a.status === "OPEN"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-surface-100 text-surface-600 border border-surface-200"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === "OPEN" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(a.uid, "ACKNOWLEDGED")}
                              className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-surface-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              Acknowledge
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate("/inventory/purchases")}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                            >
                              Order PO <ArrowUpRight size={13} />
                            </button>
                          </>
                        )}
                        {a.status === "ACKNOWLEDGED" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(a.uid, "RESOLVED")}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
