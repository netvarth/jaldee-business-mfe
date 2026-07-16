import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Popover,
  PopoverSection,
  Badge,
  type ColumnDef,
} from "@jaldee/design-system";
import { Search, MoreHorizontal } from "lucide-react";
import { useCustomers } from "../../services/useCustomers";
import { useModal } from "../../contexts/ModalContext";
import CreatePatientModal from "./CreatePatientModal";
import type { Customer } from "../../types";

function fullName(customer: Customer): string {
  return `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Unknown";
}

function isActiveCustomer(customer: Customer): boolean {
  return String(customer.status || "").toUpperCase() === "ENABLED";
}

export default function CustomersPage() {
  const { customers, loading, addLocal, updateLocal, toggleLocalStatus } = useCustomers();
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
      { key: "phoneNumber", header: "Phone number", sortable: true, render: (customer) => customer.phoneNumber || "-" },
      { key: "email", header: "Email", sortable: true, render: (customer) => customer.email || "-" },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (customer) => {
          return (
            <Badge variant={isActiveCustomer(customer) ? "success" : "neutral"}>
              {isActiveCustomer(customer) ? "Active" : "Inactive"}
            </Badge>
          );
        }
      },
      {
        key: "actions",
        header: "",
        align: "right",
        sticky: "right",
        width: 60,
        render: (customer) => (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Popover
              portal
              align="end"
              contentClassName="!min-w-[160px] !p-2"
              trigger={
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            >
              <PopoverSection>
                <button
                  type="button"
                  data-testid={`bookings-customer-edit-${customer.id}`}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    openModal(<CreatePatientModal initialCustomer={customer} onCreated={updateLocal} />);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  data-testid={`bookings-customer-status-${customer.id}`}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => toggleLocalStatus(customer.id)}
                >
                  {isActiveCustomer(customer) ? "Mark Inactive" : "Mark Active"}
                </button>
              </PopoverSection>
            </Popover>
          </div>
        ),
      },
    ],
    [openModal, toggleLocalStatus, updateLocal],
  );

  return (
    <section
      id="page-customers"
      data-testid="bookings-customers-page"
      className="flex h-full flex-col gap-4 bg-slate-50 p-4 md:p-6"
    >
      <PageHeader
        title="Customer Overview"
        subtitle="Create And Manage Customers"
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          icon={<Search className="h-4 w-4 text-slate-400" />}
          containerClassName="sm:max-w-sm"
        />
      </div>

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
