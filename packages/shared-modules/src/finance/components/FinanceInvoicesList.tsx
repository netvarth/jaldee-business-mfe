import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Icon, Popover, SectionCard, Select } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useFinanceInvoicesCount, useFinancePaginatedInvoices } from "../queries/finance";
import type { FinanceInvoiceRow } from "../types";
import { SharedFinanceLayout } from "./shared";
import { useSharedModulesContext } from "../../context";

function formatInvoiceAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function FinanceInvoicesList() {
  const { navigate } = useSharedModulesContext();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [productFilter, setProductFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filters = useMemo(() => {
    const nextFilters: Record<string, unknown> = {
      from: (page - 1) * pageSize,
      count: pageSize,
    };

    if (productFilter !== "All") {
      nextFilters["product-eq"] = productFilter;
    }

    if (statusFilter !== "All") {
      nextFilters["billStatus-eq"] = statusFilter;
    }

    return nextFilters;
  }, [page, pageSize, productFilter, statusFilter]);

  const countFilters = useMemo(() => {
    const { from, count, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: invoices, isLoading, isError } = useFinancePaginatedInvoices(filters);
  const { data: totalCount = 0 } = useFinanceInvoicesCount(countFilters);

  const handleView = (row: FinanceInvoiceRow) => {
    if (row.product === "IP" && row.internalInvoiceType !== "MASTER_INVOICE") {
      navigate(`/ip/invoice/${row.providerConsumerId}/invoice-details?invoiceId=${row.uid}`);
    } else if (row.product === "IP" && row.internalInvoiceType === "MASTER_INVOICE") {
      navigate(`/ip/master-invoice/${row.uid}`);
    } else if (row.product === "BOOKING" && row.internalInvoiceType !== "MASTER_INVOICE") {
      navigate(`/bookingInvoice/view?invId=${row.uid}`);
    } else if (row.product === "FINANCE" && row.internalInvoiceType !== "MASTER_INVOICE") {
      navigate(`/finance/invoice/view_new?invId=${row.uid}`);
    } else if (row.product === "FINANCE" && row.internalInvoiceType === "MASTER_INVOICE") {
      navigate(`/finance/master-invoice/${row.uid}`);
    } else {
      navigate(`/salesorder/invoice/${row.uid}?invUid=${row.uid}`);
    }
  };

  const columns = useMemo<ColumnDef<FinanceInvoiceRow>[]>(
    () => [
      { key: "id", header: "No", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      { key: "dueDate", header: "Date", headerClassName: "text-sm font-semibold text-slate-900", className: "py-4" },
      {
        key: "orderSource",
        header: "Order Source",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => {
          const source = (row.orderSource || "").toUpperCase();
          if (source === "PROVIDER_CONSUMER") return "Customer";
          if (source === "WITHOUT_PROVIDER_CONSUMER") return "Guest";
          if (source === "PARTNER") return "Dealer";
          if (source === "GENERAL") return "General";
          return source.charAt(0) + source.slice(1).toLowerCase() || "-";
        },
      },
      {
        key: "storeName",
        header: "Store Name",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => row.storeName || "-",
      },
      {
        key: "customer",
        header: "Invoice For",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => (
          <div className="leading-5">
            <div className="font-medium text-slate-900">{row.customer}</div>
            {row.providerConsumerId && (
              <div className="text-[length:var(--text-xs)] text-slate-500">
                ID-{row.providerConsumerId}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount (₹)",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4 font-medium",
        render: (row) => formatInvoiceAmount(row.amount),
      },
      {
        key: "amountDue",
        header: "Amount Due (₹)",
        align: "right",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4 font-medium text-slate-900",
        render: (row) => formatInvoiceAmount(row.amountDue),
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4",
        render: (row) => (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.status === "Paid" ? "bg-emerald-50 text-emerald-700" :
            row.status === "Overdue" ? "bg-rose-50 text-rose-700" :
            row.status === "Partially Paid" ? "bg-amber-50 text-amber-700" :
            "bg-slate-100 text-slate-700"
          }`}>
            {row.billPaymentStatus || row.status}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "text-sm font-semibold text-slate-900",
        className: "py-4 text-right",
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 min-w-[52px] px-3 text-[length:var(--text-xs)]"
              onClick={() => handleView(row)}
            >
              View
            </Button>
            <Popover
              portal
              placement="bottom"
              align="end"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                />
              }
            >
              <div className="grid min-w-[140px] p-1">
                <Button variant="ghost" size="sm" className="justify-start font-normal" onClick={() => handleView(row)}>
                  View Details
                </Button>
                <Button variant="ghost" size="sm" className="justify-start font-normal text-slate-600">
                  Edit Invoice
                </Button>
                <Button variant="ghost" size="sm" className="justify-start font-normal text-slate-600">
                  Assign User
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  const filterControls = (
    <div className="grid min-w-[260px] gap-3">
      <Select
        label="Product Filter"
        value={productFilter}
        onChange={(event) => {
          setProductFilter(event.target.value);
          setPage(1);
        }}
        options={[
          { value: "All", label: "All" },
          { value: "BOOKING", label: "Booking" },
          { value: "ORDER", label: "Order" },
          { value: "FINANCE", label: "Finance" },
          { value: "IP", label: "In Patient" },
        ]}
      />

      <Select
        label="Status Filter"
        value={statusFilter}
        onChange={(event) => {
          setStatusFilter(event.target.value);
          setPage(1);
        }}
        options={[
          { value: "All", label: "All" },
          { value: "New", label: "New" },
          { value: "Settled", label: "Settled" },
          { value: "Cancel", label: "Cancel" },
          { value: "Draft", label: "Draft" },
        ]}
      />
    </div>
  );

  return (
    <SharedFinanceLayout
      title="Invoices"
      subtitle="Manage all invoices across your organization."
      actions={<Button onClick={() => navigate("/finance/invoice/newInvoice")}>Create Invoice</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">
            Invoices({totalCount})
          </h2>

          <Popover
            placement="bottom"
            align="end"
            contentClassName="rounded-[var(--radius-card)]"
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Filter invoices"
                className="h-9 w-9 px-0 text-[var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,transparent)]"
                icon={<Icon name="filter" className="h-6 w-6" aria-hidden="true" />}
              />
            }
          >
            {filterControls}
          </Popover>
        </div>

        {isError ? (
          <div className="p-6">
            <EmptyState title="Invoices unavailable" description="Invoice records could not be loaded right now." />
          </div>
        ) : (
          <DataTable
            data={invoices ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            className="rounded-none border-x-0 border-b-0 shadow-none"
            pagination={{
              page,
              pageSize,
              total: totalCount,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={<EmptyState title="No invoices found" description="Invoice records will show here when available." />}
          />
        )}
      </SectionCard>
    </SharedFinanceLayout>
  );
}
