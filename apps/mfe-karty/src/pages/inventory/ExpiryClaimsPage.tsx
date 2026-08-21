import React, { useState } from "react";
import { CalendarClock, RefreshCw, PackageX, IndianRupee, ArrowRight } from "lucide-react";
import {
  useExpiryClaimsList,
  useUpdateExpiryClaimStatus,
  useNearExpirySweep,
  useCreateExpiryClaim,
  ExpiryClaimDto,
  NearExpiryBatchDto,
} from "../../services/useExpiryClaims";
import { useVendors } from "../../services/useVendors";
import { useStores } from "../../services/useStores";

// Backend returns the claim amount as `totalAmount`; older/detail shapes use `totalClaimAmount`.
const claimAmount = (c: any): number => Number(c?.totalAmount ?? c?.totalClaimAmount ?? 0);

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-surface-100 text-surface-600 border-surface-200",
  SUBMITTED: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  SETTLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

// Next-status actions for the claim lifecycle DRAFT → SUBMITTED → APPROVED → SETTLED.
const NEXT_ACTIONS: Record<string, { label: string; status: string; danger?: boolean }[]> = {
  DRAFT: [{ label: "Submit to Supplier", status: "SUBMITTED" }],
  SUBMITTED: [
    { label: "Approve", status: "APPROVED" },
    { label: "Reject", status: "REJECTED", danger: true },
  ],
  APPROVED: [{ label: "Mark Settled", status: "SETTLED" }],
};

const fmtDate = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const money = (n?: number) => `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export function ExpiryClaimsPage() {
  const [thresholdDays, setThresholdDays] = useState(60);
  const claimsQ = useExpiryClaimsList();
  const sweepQ = useNearExpirySweep(thresholdDays);
  const updateStatus = useUpdateExpiryClaimStatus();
  const createClaim = useCreateExpiryClaim();

  const { data: vendors = [] } = useVendors() as any;
  const { data: stores = [] } = useStores() as any;
  const vendorName = (uid?: string) => (vendors as any[]).find((v) => (v.uid || v.id) === uid)?.name;
  const storeName = (uid?: string) => (stores as any[]).find((s) => (s.uid || s.id) === uid)?.name;

  const claims: ExpiryClaimDto[] = claimsQ.data || [];
  const batches: NearExpiryBatchDto[] = sweepQ.data || [];

  const openClaimAmount = claims
    .filter((c) => c.status !== "SETTLED" && c.status !== "REJECTED")
    .reduce((s, c) => s + claimAmount(c), 0);

  const raiseClaim = async (b: NearExpiryBatchDto) => {
    // Backend expiry-claim item fields are `purchaseRate` + `claimAmount` (not unitPrice/lineTotal),
    // and it sums item claimAmount into the claim totalAmount.
    const rate = b.costPrice ?? b.mrp ?? 0;
    const qty = b.availableQty || 0;
    try {
      await createClaim.mutateAsync({
        storeUid: b.storeUid,
        vendorUid: b.vendorUid,
        status: "DRAFT",
        items: [
          {
            itemUid: b.itemUid,
            variantUid: b.variantUid,
            batchUid: b.uid,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            claimQty: qty,
            purchaseRate: rate,
            claimAmount: rate * qty,
          },
        ],
      } as any);
    } catch (e: any) {
      alert("Failed to raise claim: " + (e?.message || "Unknown error"));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <CalendarClock size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Expiry & Breakage Claims</h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              Track near-expiry batches and raise return claims to suppliers for credit.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-surface-500">Window</label>
          <select
            value={thresholdDays}
            onChange={(e) => setThresholdDays(Number(e.target.value))}
            className="px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-bold text-surface-700 outline-none cursor-pointer"
          >
            {[30, 60, 90, 120].map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => sweepQ.refetch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={sweepQ.isFetching ? "animate-spin" : ""} />
            Refresh Sweep
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Near-Expiry Batches" icon={<PackageX size={16} className="text-amber-600" />} value={String(batches.length)} sub={`Expiring within ${thresholdDays} days`} valueClass="text-amber-600" />
        <MetricCard label="Open Claims" icon={<CalendarClock size={16} className="text-blue-600" />} value={String(claims.filter((c) => c.status !== "SETTLED" && c.status !== "REJECTED").length)} sub="Awaiting supplier settlement" />
        <MetricCard label="Open Claim Value" icon={<IndianRupee size={16} className="text-emerald-600" />} value={money(openClaimAmount)} sub="Unsettled credit expected" />
      </div>

      {/* Near-expiry batches */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100">
          <h2 className="text-sm font-extrabold text-surface-900">Near-Expiry Batches</h2>
          <p className="text-[11px] text-surface-500">Raise a claim to return a batch to its supplier for credit.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
              <tr>
                <th className="py-3 px-6 text-left">Item / Batch</th>
                <th className="py-3 px-4 text-left">Store</th>
                <th className="py-3 px-4 text-left">Expiry</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-left">Vendor</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {sweepQ.isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-surface-400 text-xs">Loading…</td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-surface-400 text-xs">No batches expiring within {thresholdDays} days.</td></tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.uid} className="hover:bg-surface-50/50">
                    <td className="py-3 px-6">
                      <div className="font-bold text-surface-900 text-sm">{b.itemName}</div>
                      <div className="text-[11px] text-surface-400 font-mono">Batch {b.batchNumber}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-surface-600">{b.storeName || "—"}</td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-semibold text-surface-700">{fmtDate(b.expiryDate)}</div>
                      <div className={`text-[11px] font-bold ${b.daysToExpiry <= 0 ? "text-rose-600" : b.daysToExpiry <= 30 ? "text-amber-600" : "text-surface-400"}`}>
                        {b.daysToExpiry <= 0 ? "Expired" : `${b.daysToExpiry}d left`}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-surface-800">{b.availableQty}</td>
                    <td className="py-3 px-4 text-xs text-surface-600">{b.vendorName || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => raiseClaim(b)}
                        disabled={createClaim.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#55349A] hover:bg-[#43287A] text-white text-[11px] font-bold rounded-lg cursor-pointer disabled:opacity-40"
                      >
                        Raise Claim <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claims list */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100">
          <h2 className="text-sm font-extrabold text-surface-900">Claims</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-[11px] uppercase tracking-wider text-surface-500 font-bold">
              <tr>
                <th className="py-3 px-6 text-left">Claim</th>
                <th className="py-3 px-4 text-left">Vendor</th>
                <th className="py-3 px-4 text-left">Store</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {claimsQ.isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-surface-400 text-xs">Loading…</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-surface-400 text-xs">No claims yet — raise one from a near-expiry batch above.</td></tr>
              ) : (
                claims.map((c) => (
                  <tr key={c.uid} className="hover:bg-surface-50/50">
                    <td className="py-3 px-6 font-bold text-[#55349A]">{c.claimNo || `EC-${c.uid.slice(0, 6).toUpperCase()}`}</td>
                    <td className="py-3 px-4 text-xs text-surface-600">{c.vendorName || vendorName(c.vendorUid) || "—"}</td>
                    <td className="py-3 px-4 text-xs text-surface-600">{c.storeName || storeName(c.storeUid) || "—"}</td>
                    <td className="py-3 px-4 text-right font-bold text-surface-800">{money(claimAmount(c))}</td>
                    <td className="py-3 px-4 text-xs text-surface-500">{fmtDate(c.createdAt)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full border text-[10px] font-bold ${STATUS_STYLE[c.status] || STATUS_STYLE.DRAFT}`}>{c.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(NEXT_ACTIONS[c.status] || []).map((a) => (
                          <button
                            key={a.status}
                            type="button"
                            onClick={() => updateStatus.mutate({ uid: c.uid, status: a.status })}
                            disabled={updateStatus.isPending}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer disabled:opacity-40 ${a.danger ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-[#55349A] text-white hover:bg-[#43287A]"}`}
                          >
                            {a.label}
                          </button>
                        ))}
                        {!(NEXT_ACTIONS[c.status]) && <span className="text-[11px] text-surface-400">—</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, icon, value, sub, valueClass }: { label: string; icon: React.ReactNode; value: string; sub: string; valueClass?: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
      <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-black ${valueClass || "text-surface-900"}`}>{value}</div>
      <p className="text-[11px] text-surface-400 font-medium">{sub}</p>
    </div>
  );
}

export default ExpiryClaimsPage;
