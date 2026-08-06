import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  cn,
  DataTable,
  Drawer,
  EmptyState,
  Input,
  PageHeader,
  Popover,
  PopoverSection,
  SectionCard,
  DescriptionList,
  type ColumnDef,
} from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { Search, MoreHorizontal } from "lucide-react";
import { formatAppliedCustomerFilterSummary } from "../../services/customerSearch";
import { useCustomerSearchSchema } from "../../services/useCustomerSearchSchema";
import { useCustomers } from "../../services/useCustomers";
import { useModal } from "../../contexts/ModalContext";
import CreatePatientModal from "./CreatePatientModal";
import type { Customer } from "../../types";

function fullName(customer: Customer): string {
  return `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Unknown";
}

function isActiveCustomer(customer: Customer): boolean {
  const status = String(customer.status || "").toUpperCase();
  return status === "ENABLED" || status === "ACTIVE";
}

export default function CustomersPage() {
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const {
    schema: customerSearchSchema,
    loading: customerSearchSchemaLoading,
  } = useCustomerSearchSchema();
  const { customers, loading, addLocal, updateLocal, toggleLocalStatus } = useCustomers(
    advancedFilters,
    customerSearchSchema,
    { enabled: !customerSearchSchemaLoading }
  );
  const { openModal } = useModal();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, customerSearchSchema).length,
    [advancedFilters, customerSearchSchema]
  );

  const appliedFilterSummary = useMemo(
    () => formatAppliedCustomerFilterSummary(advancedFilters, customerSearchSchema),
    [advancedFilters, customerSearchSchema]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter(
      (customer) =>
        !normalized ||
        fullName(customer).toLowerCase().includes(normalized) ||
        (customer.phoneNumber ?? "").toLowerCase().includes(normalized) ||
        String(customer.id ?? "").toLowerCase().includes(normalized)
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
      {
        key: "phoneNumber",
        header: "Phone number",
        sortable: true,
        render: (customer) => customer.phoneNumber || "-",
      },
      {
        key: "email",
        header: "Email",
        sortable: true,
        render: (customer) => customer.email || "-",
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (customer) => (
          <Badge variant={isActiveCustomer(customer) ? "success" : "neutral"}>
            {isActiveCustomer(customer) ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        width: 100,
        render: (customer) => (
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
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
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => {
                    openModal(
                      <CreatePatientModal initialCustomer={customer} onCreated={updateLocal} />
                    );
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  data-testid={`bookings-customer-status-${customer.id}`}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
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
    [openModal, toggleLocalStatus, updateLocal]
  );

  if (selectedCustomerId) {
    const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
    
    if (!selectedCustomer) {
      return (
        <section className="flex h-full flex-col bg-white p-4 md:p-6">
          <EmptyState title="Customer Not Found" description="The selected customer could not be found." action={<Button variant="secondary" onClick={() => setSelectedCustomerId(null)}>Back to list</Button>} />
        </section>
      );
    }
    
    const detailItems = [
      { label: "Customer ID", value: selectedCustomer.id || "-" },
      { label: "Phone", value: selectedCustomer.phoneNumber || "-" },
      { label: "Email", value: selectedCustomer.email || "-" },
      { label: "Status", value: selectedCustomer.status || "-" },
      { label: "Total Visits", value: String(selectedCustomer.visits ?? 0) },
    ];
    
    return (
      <section className="flex h-full flex-col bg-white p-4 md:p-6">
        <PageHeader 
          title={fullName(selectedCustomer)} 
          subtitle="Customer profile and linked records"
          back={{ label: "Back to Customers", href: "#back" }}
          onNavigate={() => setSelectedCustomerId(null)}
          variant="navigation"
        />
        <div className="mt-6 flex max-w-4xl flex-col gap-6 lg:flex-row lg:items-start">
          {/* Avatar Card */}
          <div className="w-full lg:w-1/3">
            <SectionCard title="Profile">
              <div className="flex flex-col items-center justify-center py-4">
                <span
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white shadow-sm"
                  style={{ backgroundColor: selectedCustomer.avatarColor ?? "#818cf8" }}
                >
                  {fullName(selectedCustomer).charAt(0).toUpperCase()}
                </span>
                <h2 className="mt-4 text-xl font-bold text-slate-900 text-center">{fullName(selectedCustomer)}</h2>
                <Badge variant={isActiveCustomer(selectedCustomer) ? "success" : "neutral"} className="mt-3">
                  {isActiveCustomer(selectedCustomer) ? "Active Profile" : "Inactive Profile"}
                </Badge>
              </div>
            </SectionCard>
          </div>
          
          {/* Details */}
          <div className="w-full lg:w-2/3">
            <SectionCard title="Basic Details">
              <DescriptionList items={detailItems} />
            </SectionCard>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="page-customers"
      data-testid="bookings-customers-page"
      className="flex h-full flex-col gap-4 bg-white p-4 md:p-6"
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

      <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
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
          containerClassName="flex-1 min-w-0 sm:max-w-sm"
        />
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:ml-auto">
          <Button
            type="button"
            variant={appliedFilterCount > 0 ? "primary" : "outline"}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 font-semibold",
              appliedFilterCount > 0 ? "" : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
            )}
            onClick={() => {
              setDraftFilters(
                advancedFilters.length > 0
                  ? advancedFilters
                  : buildDefaultSearchClauses(customerSearchSchema)
              );
              setDrawerOpen(true);
            }}
          >
            <FilterIcon />
            <span>Filters</span>
            {appliedFilterCount > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
                {appliedFilterCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(customer) => customer.id}
        loading={loading}
        onRowClick={(customer) => setSelectedCustomerId(customer.id)}
        pagination={{
          page,
          pageSize: 10,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No customers found" description="Try changing the search." />}
        tableClassName="min-w-[800px]"
        data-testid="bookings-customers"
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col overflow-hidden p-0"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={customerSearchSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              appliedSummary={appliedFilterSummary}
              onClearAll={() => {
                const resetClauses = buildDefaultSearchClauses(customerSearchSchema);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
                setPage(1);
              }}
              emptyStateMessage="No customer filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const resetClauses = buildDefaultSearchClauses(customerSearchSchema);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
                setPage(1);
              }}
            >
              Reset All
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAdvancedFilters(draftFilters);
                setPage(1);
                setDrawerOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-[2.2]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}
