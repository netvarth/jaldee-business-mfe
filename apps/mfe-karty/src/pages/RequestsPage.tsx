/**
 * Order Requests — the quote/enquiry stage before an order exists.
 * Route: /karty/orders/requests
 */
import { useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, Select, type ColumnDef } from "@jaldee/design-system";
import { Plus } from "lucide-react";
import { CreateQuotationModal } from "../components/CreateQuotationModal";
import {
  useOrderRequests,
  useOrderRequestCount,
  useUpdateOrderRequestStatus,
  useConvertOrderRequest,
  type OrderRequest,
} from "../services/useOrderRequests";
import { useStores } from "../services/useStores";
import { useCustomers } from "../services/useCustomers";
import { ListScreen, TruncationNotice } from "./shared/ListScreen";
import { OrderRequestDetailPage } from "./OrderRequestDetailPage";

const PAGE_SIZE = 100;

const STATUSES = ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "CONVERTED", "CANCELLED"] as const;

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  PENDING: "warning",
  IN_REVIEW: "info",
  APPROVED: "success",
  CONVERTED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
};

const up = (s: unknown) => String(s ?? "").toUpperCase();

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export function RequestsPage() {
  const [status, setStatus] = useState("all");
  const [storeUid, setStoreUid] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<OrderRequest | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filter = useMemo(
    () => ({
      size: PAGE_SIZE,
      status: status === "all" ? undefined : status,
      storeUid: storeUid === "all" ? undefined : storeUid,
    }),
    [status, storeUid]
  );

  const requestsQ = useOrderRequests(filter);
  const countQ = useOrderRequestCount(filter);
  const storesQ = useStores();
  const customersQ = useCustomers("", 0, 200);

  const updateStatus = useUpdateOrderRequestStatus();
  const convert = useConvertOrderRequest();

  const storeName = useMemo(() => {
    const m = new Map<string, string>();
    (storesQ.data ?? []).forEach((s: any) => m.set(s.id ?? s.uid, s.name));
    return m;
  }, [storesQ.data]);

  const customerName = useMemo(() => {
    const m = new Map<string, string>();
    (customersQ.data ?? []).forEach((c: any) => {
      const n = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.consumerNo;
      if (n) m.set(c.uid, n);
    });
    return m;
  }, [customersQ.data]);

  const rows = requestsQ.data ?? [];

  // If a request is selected, render the full OrderRequestDetailPage
  if (selectedRequest) {
    return (
      <OrderRequestDetailPage
        initialRequest={selectedRequest}
        onBack={() => setSelectedRequest(null)}
      />
    );
  }

  const columns: ColumnDef<OrderRequest>[] = [
    {
      key: "requestNo",
      header: "Request",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => setSelectedRequest(r)}
            className="font-extrabold text-[#55349A] hover:underline cursor-pointer text-left flex items-center gap-1.5"
          >
            {r.requestNo ?? (r.uid ? `#${r.uid.slice(0, 8)}` : "—")}
          </button>
          {r.docType === "RX" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded w-max">
              Rx Prescription
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded w-max">
              Commercial Quote
            </span>
          )}
        </div>
      ),
    },
    { key: "requestDate", header: "Date", render: (r) => fmtDate(r.requestDate ?? r.createdAt) },
    {
      key: "consumerUid",
      header: "Customer / Patient",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">
            {r.patientName || (r as any).consumerName || (r.consumerUid ? customerName.get(r.consumerUid) ?? "Customer" : "—")}
          </span>
          {r.prescriberName && (
            <span className="text-[11px] text-slate-500 font-medium">
              {/^dr\.?\s/i.test(r.prescriberName) ? r.prescriberName : `Dr. ${r.prescriberName}`}
            </span>
          )}
        </div>
      ),
    },
    { key: "storeUid", header: "Store", render: (r) => (r.storeUid ? storeName.get(r.storeUid) ?? "—" : "—") },
    { key: "itemsCount", header: "Items", align: "right", render: (r) => r.itemsCount ?? r.items?.length ?? 1 },
    {
      key: "totalAmount",
      header: "Value",
      align: "right",
      render: (r) => (typeof r.totalAmount === "number" ? inr(r.totalAmount) : "—"),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={STATUS_VARIANT[up(r.status)] ?? "neutral"}>{up(r.status) || "—"}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => {
        const s = up(r.status);
        const busy = updateStatus.isPending || convert.isPending;
        const canConvert = s !== "CONVERTED" && s !== "CANCELLED" && s !== "REJECTED";
        return (
          <div className="flex justify-end items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedRequest(r)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer border-none"
            >
              Details
            </button>
            {canConvert && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  try {
                    if (s !== "APPROVED") {
                      await updateStatus.mutateAsync({ uid: r.uid, status: "APPROVED" });
                    }
                    await convert.mutateAsync(r.uid);
                    alert("Request successfully converted to Order!");
                  } catch (e: any) {
                    console.error(e);
                  }
                }}
                className="px-3.5 py-1.5 bg-[#55349A] hover:bg-[#462980] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer border-none flex items-center gap-1.5"
              >
                <span>{busy ? "Converting..." : "Convert to Order"}</span>
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const mutationError = updateStatus.error ?? convert.error;

  return (
    <ListScreen
      title="Order Requests"
      subtitle="Quotes and enquiries before they become orders."
      isLoading={requestsQ.isLoading}
      error={requestsQ.error}
      notice={
        <>
          {typeof countQ.data === "number" && (
            <TruncationNotice fetched={rows.length} total={countQ.data} noun="requests" />
          )}
          {mutationError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
              That action failed:{" "}
              {mutationError instanceof Error ? mutationError.message : "the commerce service rejected the change."}
            </div>
          ) : null}
        </>
      }
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              fullWidth={false}
              containerClassName="w-44"
              options={[
                { value: "all", label: "All statuses" },
                ...STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") })),
              ]}
            />
            <Select
              value={storeUid}
              onChange={(e) => setStoreUid(e.target.value)}
              fullWidth={false}
              containerClassName="w-56"
              options={[
                { value: "all", label: "All stores" },
                ...(storesQ.data ?? []).map((s: any) => ({ value: String(s.id ?? s.uid), label: s.name })),
              ]}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#55349A] hover:bg-[#43287A] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer border-none"
          >
            <Plus className="h-4 w-4" />
            <span>+ Create Quotation</span>
          </button>
        </div>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.uid}
        onRowClick={(r) => setSelectedRequest(r)}
        emptyState={
          <EmptyState
            title="No order requests"
            description={
              status === "all" && storeUid === "all"
                ? "Nothing has been requested yet. Requests appear here before they are converted into orders."
                : "No requests match these filters."
            }
          />
        }
      />
      {isCreateModalOpen && (
        <CreateQuotationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newUid) => {
            requestsQ.refetch();
          }}
        />
      )}
    </ListScreen>
  );
}

export default RequestsPage;
