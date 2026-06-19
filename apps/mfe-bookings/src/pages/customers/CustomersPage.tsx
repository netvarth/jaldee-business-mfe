import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  type ColumnDef,
} from "@jaldee/design-system";
import { useCustomers } from "../../services/useCustomers";
import { useModal } from "../../contexts/ModalContext";
import CreatePatientModal from "./CreatePatientModal";
import type { Customer } from "../../types";

function fullName(customer: Customer): string {
  return `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Unknown";
}

export default function CustomersPage() {
  const { customers, loading, addLocal } = useCustomers();
  const { openModal } = useModal();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter(
      (customer) =>
        !normalized ||
        fullName(customer).toLowerCase().includes(normalized) ||
        (customer.phoneNumber ?? "").toLowerCase().includes(normalized) ||
        String(customer.id ?? "").toLowerCase().includes(normalized),
    );
  }, [customers, query]);

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        key: "name",
        header: "Customer name and ID",
        sortable: true,
        width: "32%",
        sortFn: (a, b) => fullName(a).localeCompare(fullName(b)),
        render: (customer) => {
          const name = fullName(customer);
          return (
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: customer.avatarColor ?? "#3b82f6" }}
              >
                {name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{name}</p>
                <p className="truncate text-xs text-slate-500">{customer.id || "-"}</p>
              </div>
            </div>
          );
        },
      },
      { key: "phoneNumber", header: "Phone", sortable: true, render: (customer) => customer.phoneNumber || "-" },
      {
        key: "labels",
        header: "Labels",
        render: (customer) => (
          <div className="flex flex-wrap gap-1">
            {customer.labels?.length ? (
              customer.labels.map((label) => (
                <span key={label} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {label}
                </span>
              ))
            ) : (
              "-"
            )}
          </div>
        ),
      },
      { key: "visits", header: "Visits", sortable: true, align: "center" },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        sticky: "right",
        width: 170,
        render: (customer) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              id={`bookings-customer-view-${customer.id}`}
              data-testid={`bookings-customer-view-${customer.id}`}
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              id={`bookings-customer-edit-${customer.id}`}
              data-testid={`bookings-customer-edit-${customer.id}`}
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <section
      id="page-customers"
      data-testid="bookings-customers-page"
      className="flex h-full flex-col gap-4 overflow-y-auto bg-slate-50 p-4 md:p-6"
    >
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer records`}
        actions={
          <Button
            id="bookings-customers-create"
            data-testid="bookings-customers-create"
            onClick={() => openModal(<CreatePatientModal onCreated={addLocal} />)}
          >
            Create Customer
          </Button>
        }
      />

      <Input
        id="bookings-customers-search"
        data-testid="bookings-customers-search"
        type="search"
        placeholder="Search by name, phone, or ID"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(1);
        }}
        containerClassName="sm:max-w-sm"
      />

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(customer) => customer.id}
        loading={loading}
        selection={{ selectedRowKeys: selected, onChange: setSelected }}
        pagination={{
          page,
          pageSize: 10,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No customers found" description="Try changing the search." />}
        data-testid="bookings-customers"
      />
    </section>
  );
}
