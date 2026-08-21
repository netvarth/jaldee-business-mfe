import React, { useState } from "react";
import {
  Hash,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  X,
  RefreshCw,
  QrCode,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import {
  useSerials,
  useReceiveSerials,
  useReturnSerial,
  SerialDto
} from "../../services/useSerials";
import { useItems } from "../../services/useItems";
import { useStores } from "../../services/useStores";

export function SerialTrackingPage() {
  const { data: items } = useItems();
  const [selectedItemUid, setSelectedItemUid] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  const { data: serials, isLoading, refetch } = useSerials(
    selectedItemUid || undefined,
    statusFilter
  );
  const returnMutation = useReturnSerial();

  const handleReturn = async (serial: SerialDto) => {
    if (!window.confirm(`Mark serial number "${serial.serialNumber}" as RETURNED to inventory?`)) return;
    try {
      await returnMutation.mutateAsync(serial.uid);
      refetch();
    } catch (err: any) {
      alert("Failed to return serial: " + (err?.message || "Unknown error"));
    }
  };

  const filteredSerials = (serials || []).filter(s =>
    s.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inStockCount = (serials || []).filter(s => s.status === "IN_STOCK").length;
  const soldCount = (serials || []).filter(s => s.status === "SOLD").length;
  const returnedCount = (serials || []).filter(s => s.status === "RETURNED").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Hash size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">
              Serial Number Tracking
            </h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              Individual unit serialization for electronics, medical equipment, warranties, and unit returns.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsReceiveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} /> Receive Serialized Units
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Serials In Stock</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{inStockCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Serialized units ready for sale</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Sold / Delivered</span>
            <ShieldCheck size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">{soldCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Allocated and invoiced to customers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Returns & Claims</span>
            <RotateCcw size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{returnedCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Returned serialized units</p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search by serial # or item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedItemUid}
              onChange={(e) => setSelectedItemUid(e.target.value)}
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-700 outline-none"
            >
              <option value="">All Serialized Products</option>
              {(items || []).map((item: any) => (
                <option key={item.id || item.uid} value={item.id || item.uid}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-700 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="SOLD">Sold</option>
              <option value="RETURNED">Returned</option>
              <option value="DEFECTIVE">Defective</option>
            </select>
          </div>

          <div className="sm:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors"
              title="Refresh Serials"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-50/80 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Serial Number</th>
              <th className="py-3.5 px-4">Item / Model</th>
              <th className="py-3.5 px-4">Store / Location</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Received Date</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-surface-400">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Loading serial numbers...</span>
                </td>
              </tr>
            ) : filteredSerials.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-surface-400">
                  <QrCode size={32} className="mx-auto text-surface-300 mb-2" />
                  <p className="text-sm font-bold text-surface-700">No serialized units found</p>
                  <p className="text-xs text-surface-400 mt-0.5">Receive serial numbers when stocking electronics, medical devices, or high-value assets.</p>
                </td>
              </tr>
            ) : (
              filteredSerials.map((s) => (
                <tr key={s.uid} className="hover:bg-surface-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-surface-900">
                    {s.serialNumber}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-surface-800">
                    {s.itemName || "Serialized Asset"}
                  </td>
                  <td className="py-3.5 px-4 text-surface-600">
                    {s.storeName || "Main Store"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                      s.status === "IN_STOCK"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : s.status === "SOLD"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : s.status === "RETURNED"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-surface-500">
                    {s.receivedAt ? new Date(s.receivedAt).toLocaleDateString("en-IN") : "-"}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {s.status === "SOLD" && (
                      <button
                        type="button"
                        onClick={() => handleReturn(s)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200 transition-colors"
                      >
                        Return Unit
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Receive Modal */}
      {isReceiveModalOpen && (
        <ReceiveSerialsModal
          onClose={() => setIsReceiveModalOpen(false)}
          onSuccess={() => {
            setIsReceiveModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function ReceiveSerialsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: items } = useItems();
  const { data: stores } = useStores();
  const receiveMutation = useReceiveSerials();

  const [itemUid, setItemUid] = useState("");
  const [storeUid, setStoreUid] = useState(stores?.[0]?.id || stores?.[0]?.uid || "");
  const [serialsText, setSerialsText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemUid || !storeUid || !serialsText.trim()) {
      alert("Please select product, store, and enter at least one serial number.");
      return;
    }

    const serialNumbers = serialsText
      .split("\\n")
      .map(s => s.trim())
      .filter(Boolean);

    if (serialNumbers.length === 0) {
      alert("No valid serial numbers found.");
      return;
    }

    try {
      await receiveMutation.mutateAsync({
        storeUid,
        itemUid,
        catalogItemUid: itemUid,
        serialNumbers,
      });
      alert(`Successfully received ${serialNumbers.length} serialized units!`);
      onSuccess();
    } catch (err: any) {
      alert("Failed to receive serials: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-surface-200 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Hash size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">Receive Serialized Units</h2>
              <p className="text-xs text-surface-500">Inbound unit serial barcode capture</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Select Product *</label>
            <select
              required
              value={itemUid}
              onChange={(e) => setItemUid(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none"
            >
              <option value="">Select Product...</option>
              {(items || []).map((item: any) => (
                <option key={item.id || item.uid} value={item.id || item.uid}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Target Store / Location *</label>
            <select
              required
              value={storeUid}
              onChange={(e) => setStoreUid(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none"
            >
              {(stores || []).map((s: any) => (
                <option key={s.id || s.uid} value={s.id || s.uid}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Serial Numbers (One per line) *</label>
            <textarea
              required
              rows={4}
              placeholder="SN-1002931&#10;SN-1002932&#10;SN-1002933"
              value={serialsText}
              onChange={(e) => setSerialsText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-mono outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={receiveMutation.isPending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {receiveMutation.isPending ? "Receiving..." : "Receive Serials"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
