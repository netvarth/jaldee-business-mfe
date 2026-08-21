import React, { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  FileText,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  X,
  Check,
  ArrowRight,
  Sparkles
} from "lucide-react";
import {
  useNearExpirySweep,
  useExpiryClaimsList,
  useCreateExpiryClaim,
  useUpdateExpiryClaimStatus,
  NearExpiryBatchDto,
  ExpiryClaimDto
} from "../../services/useExpiryClaims";
import { useVendors } from "../../services/useVendors";
import { useStores } from "../../services/useStores";

export function ExpiryClaimsPage() {
  const [activeTab, setActiveTab] = useState<"sweep" | "claims">("sweep");
  const [thresholdDays, setThresholdDays] = useState<number>(60);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: sweepBatches, isLoading: sweepLoading, refetch: refetchSweep } = useNearExpirySweep(thresholdDays);
  const { data: claims, isLoading: claimsLoading, refetch: refetchClaims } = useExpiryClaimsList();
  const updateStatusMutation = useUpdateExpiryClaimStatus();

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedBatchesForClaim, setSelectedBatchesForClaim] = useState<NearExpiryBatchDto[]>([]);

  const filteredBatches = (sweepBatches || []).filter(b =>
    b.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClaims = (claims || []).filter(c =>
    c.claimNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const criticalCount = (sweepBatches || []).filter(b => b.daysToExpiry <= 30).length;
  const totalNearExpiryValue = (sweepBatches || []).reduce((sum, b) => sum + ((b.costPrice || b.mrp || 0) * (b.availableQty || 0)), 0);
  const totalClaimsValue = (claims || []).reduce((sum, c) => sum + (c.totalClaimAmount || 0), 0);

  const handleStartClaimFromBatch = (batch: NearExpiryBatchDto) => {
    setSelectedBatchesForClaim([batch]);
    setIsClaimModalOpen(true);
  };

  const handleStatusChange = async (uid: string, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ uid, status });
      refetchClaims();
    } catch (err: any) {
      alert("Failed to update status: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <AlertTriangle size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">
              Near-Expiry Sweeps & Vendor Return Claims
            </h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              Automated expiry date monitoring, batch write-off prevention, and supplier credit return claims.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-surface-100 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("sweep")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "sweep"
                  ? "bg-white text-surface-900 shadow-xs"
                  : "text-surface-500 hover:text-surface-700"
              }`}
            >
              Near-Expiry Batches ({sweepBatches?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("claims")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "claims"
                  ? "bg-white text-surface-900 shadow-xs"
                  : "text-surface-500 hover:text-surface-700"
              }`}
            >
              Vendor Claims ({claims?.length || 0})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedBatchesForClaim([]);
              setIsClaimModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} /> New Return Claim
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Critical Expiry (&lt; 30 Days)</span>
            <ShieldAlert size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{criticalCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Requires immediate return to vendor or clearance</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Expiring Stock Value</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">
            ₹{totalNearExpiryValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-surface-400 font-medium">Cost value at risk of expiration</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Claims Value</span>
            <Truck size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">
            ₹{totalClaimsValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-surface-400 font-medium">Claims raised against suppliers</p>
        </div>
      </div>

      {activeTab === "sweep" ? (
        /* Tab 1: Near Expiry Batches */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search by drug name or batch number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-surface-600 whitespace-nowrap">Expiry Threshold:</span>
              <div className="bg-surface-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
                {[30, 60, 90, 180].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setThresholdDays(days)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      thresholdDays === days
                        ? "bg-white text-amber-700 shadow-xs"
                        : "text-surface-500 hover:text-surface-700"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => refetchSweep()}
                className="p-2 text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors"
                title="Refresh Sweep"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50/80 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Medicine / Product</th>
                  <th className="py-3.5 px-4">Batch Number</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4 text-center">Days Left</th>
                  <th className="py-3.5 px-4 text-center">Stock Qty</th>
                  <th className="py-3.5 px-4">Estimated Value</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
                {sweepLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-surface-400">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Scanning batches for near-expiry dates...</span>
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-surface-400">
                      <Sparkles size={32} className="mx-auto text-surface-300 mb-2" />
                      <p className="text-sm font-bold text-surface-700">No batches expiring within {thresholdDays} days</p>
                      <p className="text-xs text-surface-400 mt-0.5">All active pharmacy inventory is well within shelf-life parameters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b) => {
                    const isUrgent = b.daysToExpiry <= 30;
                    return (
                      <tr key={b.uid} className="hover:bg-surface-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-surface-900">
                          {b.itemName}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-surface-800">
                          {b.batchNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {b.expiryDate}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                            isUrgent
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {b.daysToExpiry} days
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-surface-900">
                          {b.availableQty}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-surface-900">
                          ₹{((b.costPrice || b.mrp || 0) * (b.availableQty || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleStartClaimFromBatch(b)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 transition-colors cursor-pointer"
                          >
                            Claim Return <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 2: Vendor Expiry Claims */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50/80 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Claim # / Date</th>
                  <th className="py-3.5 px-4">Supplier / Vendor</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4">Claim Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
                {claimsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-surface-400">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading vendor return claims...</span>
                    </td>
                  </tr>
                ) : filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-surface-400">
                      <Truck size={32} className="mx-auto text-surface-300 mb-2" />
                      <p className="text-sm font-bold text-surface-700">No vendor return claims found</p>
                      <p className="text-xs text-surface-400 mt-0.5">Create return claims for expired medicines to receive vendor debit notes.</p>
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((c) => (
                    <tr key={c.uid} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-surface-900">
                        <div>{c.claimNo}</div>
                        <div className="text-[10.5px] text-surface-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "-"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-surface-900">
                        {c.vendorName || "Authorized Distributor"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-surface-900">
                        {c.items?.length || 0} batches
                      </td>
                      <td className="py-3.5 px-4 font-bold text-surface-900">
                        ₹{(c.totalClaimAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          c.status === "SETTLED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : c.status === "APPROVED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : c.status === "SUBMITTED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-surface-100 text-surface-700 border border-surface-200"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.status === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(c.uid, "SUBMITTED")}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200"
                            >
                              Submit
                            </button>
                          )}
                          {c.status === "SUBMITTED" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(c.uid, "APPROVED")}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200"
                            >
                              Approve
                            </button>
                          )}
                          {c.status === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(c.uid, "SETTLED")}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200"
                            >
                              Settle
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Claim Modal */}
      {isClaimModalOpen && (
        <CreateExpiryClaimModal
          initialBatches={selectedBatchesForClaim}
          onClose={() => setIsClaimModalOpen(false)}
          onSuccess={() => {
            setIsClaimModalOpen(false);
            refetchClaims();
            refetchSweep();
          }}
        />
      )}
    </div>
  );
}

function CreateExpiryClaimModal({
  initialBatches = [],
  onClose,
  onSuccess
}: {
  initialBatches?: NearExpiryBatchDto[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: vendors } = useVendors();
  const { data: stores } = useStores();
  const createMutation = useCreateExpiryClaim();

  const [storeUid, setStoreUid] = useState(initialBatches[0]?.storeUid || stores?.[0]?.id || "");
  const [vendorUid, setVendorUid] = useState(vendors?.[0]?.id || vendors?.[0]?.uid || "");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorUid) {
      alert("Please select a vendor.");
      return;
    }

    const payload = {
      storeUid,
      vendorUid,
      notes,
      items: initialBatches.map(b => ({
        itemUid: b.itemUid,
        batchUid: b.uid,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        claimQty: b.availableQty,
        unitPrice: b.costPrice || b.mrp || 10,
        lineTotal: (b.availableQty || 1) * (b.costPrice || b.mrp || 10),
        reason: "Near expiry date - vendor credit return"
      }))
    };

    try {
      await createMutation.mutateAsync(payload);
      onSuccess();
    } catch (err: any) {
      alert("Failed to create claim: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-surface-200 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">New Vendor Expiry Return Claim</h2>
              <p className="text-xs text-surface-500">Raise return claim for expired or near-expiry batches</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Supplier / Vendor *</label>
            <select
              required
              value={vendorUid}
              onChange={(e) => setVendorUid(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none"
            >
              <option value="">Select Supplier...</option>
              {(vendors || []).map((v: any) => (
                <option key={v.id || v.uid} value={v.id || v.uid}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Claim Notes / Reason</label>
            <textarea
              rows={3}
              placeholder="Near expiry batch return for replacement / credit note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs outline-none"
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
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {createMutation.isPending ? "Creating Claim..." : "Submit Claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
