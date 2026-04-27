import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  EmptyState,
  PageHeader,
  SectionCard,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useUrlPagination } from "../../useUrlPagination";
import {
  useAllMemberSubscriptions,
  useAllMemberSubscriptionsCount,
} from "../queries/memberships";

type PaymentRow = {
  uid: string;
  memberUid: string;
  memberName: string;
  memberPhoto: string | null;
  paymentStatus: string;
  createdDate: string;
  amount: number;
  amountDue: number;
  renewed: boolean;
};

function unwrapPayload<T>(value: T): any {
  const maybeWrapped = value as any;

  if (maybeWrapped?.data?.data !== undefined) {
    return maybeWrapped.data.data;
  }

  if (maybeWrapped?.data !== undefined) {
    return maybeWrapped.data;
  }

  return maybeWrapped;
}

function unwrapList(value: unknown): any[] {
  const payload = unwrapPayload(value);
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
}

function unwrapCount(value: unknown) {
  return Number(unwrapPayload(value)) || 0;
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getPaymentStatusLabel(status: string) {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "NOTPAID") return "Not Paid";
  if (normalized === "PARTIALLYPAID") return "Partially Paid";
  if (normalized === "FULLYPAID") return "Fully Paid";

  return status || "Unknown";
}

function getPaymentStatusVariant(status: string): "success" | "danger" | "warning" | "neutral" {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "FULLYPAID") return "success";
  if (normalized === "PARTIALLYPAID") return "warning";
  if (normalized === "NOTPAID") return "danger";

  return "neutral";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "M";
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

function toPaymentRows(data: unknown): PaymentRow[] {
  return unwrapList(data)
    .filter((item: any) => Number(item.subscriptionAmountToPay ?? 0) !== 0)
    .map((payment: any, index: number) => ({
      uid: String(payment.uid ?? payment.id ?? index),
      memberUid: String(payment.memberUid ?? payment.member?.uid ?? payment.member?.id ?? ""),
      memberName: String(payment.memberName ?? payment.member?.name ?? `Member ${index + 1}`),
      memberPhoto: Array.isArray(payment.memberPhotos) && payment.memberPhotos.length > 0
        ? String(payment.memberPhotos[payment.memberPhotos.length - 1]?.s3path ?? "")
        : null,
      paymentStatus: String(payment.paymentStatus ?? "NotPaid"),
      createdDate: formatDate(payment.createdDate),
      amount: Number(payment.subscriptionAmountToPay ?? 0),
      amountDue: Number(payment.subscriptionAmountDue ?? 0),
      renewed: Boolean(payment.renewed),
    }));
}

export function PaymentInfoList() {
  const { basePath } = useSharedModulesContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "membershipPayments",
    resetDeps: [appliedSearchQuery, paymentStatusFilter],
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedSearchQuery(searchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const filters = useMemo(
    () => ({
      "subscriptionAmountToPay-neq": 0,
      ...(appliedSearchQuery ? { "memberName-like": appliedSearchQuery } : {}),
      ...(paymentStatusFilter !== "all" ? { "paymentStatus-eq": paymentStatusFilter } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedSearchQuery, page, pageSize, paymentStatusFilter]
  );

  const countFilters = useMemo(
    () => ({
      "subscriptionAmountToPay-neq": 0,
      ...(appliedSearchQuery ? { "memberName-like": appliedSearchQuery } : {}),
      ...(paymentStatusFilter !== "all" ? { "paymentStatus-eq": paymentStatusFilter } : {}),
    }),
    [appliedSearchQuery, paymentStatusFilter]
  );

  const paymentsQuery = useAllMemberSubscriptions(filters);
  const paymentsCountQuery = useAllMemberSubscriptionsCount(countFilters);

  const paymentRows = useMemo(() => toPaymentRows(paymentsQuery.data), [paymentsQuery.data]);
  const totalPayments = unwrapCount(paymentsCountQuery.data) || paymentRows.length;

  const paymentColumns = useMemo<ColumnDef<PaymentRow>[]>(
    () => [
      {
        key: "memberName",
        header: "Name",
        render: (payment) => (
          <div className="flex items-center gap-3">
            {payment.memberPhoto ? (
              <img
                src={payment.memberPhoto}
                alt=""
                className="h-10 w-10 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {getInitials(payment.memberName)}
              </span>
            )}
            <span className="font-semibold text-slate-900">{payment.memberName}</span>
          </div>
        ),
      },
      {
        key: "paymentStatus",
        header: "Status",
        render: (payment) => (
          <Badge variant={getPaymentStatusVariant(payment.paymentStatus)}>
            {getPaymentStatusLabel(payment.paymentStatus)}
          </Badge>
        ),
      },
      { key: "createdDate", header: "Created Date" },
      {
        key: "amount",
        header: "Amount (₹)",
        align: "right",
        render: (payment) => payment.amount.toFixed(2),
      },
      {
        key: "amountDue",
        header: "Amount Due (₹)",
        align: "right",
        render: (payment) => payment.amountDue.toFixed(2),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (payment) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              const nextUrl = new URL(`${window.location.origin}${basePath}/members/paymentdetails/${payment.memberUid}`);
              nextUrl.searchParams.set("subUid", payment.uid);
              if (payment.renewed) {
                nextUrl.searchParams.set("renew", "true");
              }
              window.location.assign(nextUrl.toString());
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [basePath]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Management"
        subtitle="Review payment status, due amounts, and open each member payment record."
        back={{ label: "Back", href: `${basePath}/dashboard` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <DataTableToolbar
                query={searchQuery}
                onQueryChange={setSearchQuery}
                searchPlaceholder="Search by member name..."
                recordCount={totalPayments}
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="payment-status-filter" className="text-sm text-slate-500">
                Payment Status
              </label>
              <select
                id="payment-status-filter"
                value={paymentStatusFilter}
                onChange={(event) => setPaymentStatusFilter(event.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="all">All</option>
                <option value="NotPaid">Not Paid</option>
                <option value="PartiallyPaid">Partially Paid</option>
                <option value="FullyPaid">Fully Paid</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4">
          <DataTable
            data={paymentRows}
            columns={paymentColumns}
            getRowId={(row) => row.uid}
            loading={paymentsQuery.isLoading || paymentsCountQuery.isLoading}
            onRowClick={(payment) => {
              const nextUrl = new URL(`${window.location.origin}${basePath}/members/paymentdetails/${payment.memberUid}`);
              nextUrl.searchParams.set("subUid", payment.uid);
              if (payment.renewed) {
                nextUrl.searchParams.set("renew", "true");
              }
              window.location.assign(nextUrl.toString());
            }}
            pagination={{
              page,
              pageSize,
              total: totalPayments,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={(
              <EmptyState
                title="No payments found"
                description="Payment records will appear here when there are subscription charges to collect."
              />
            )}
          />
        </div>
      </SectionCard>
    </div>
  );
}
