import { useMemo, useState } from "react";
import {
  Button,
  cn,
  DataTable,
  Drawer,
  EmptyState,
  Input,
  PageHeader,
  type ColumnDef,
} from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { applyLocalSchemaFilters, formatAppliedLocalFilterSummary } from "../../services/localSchemaFilters";
import { useUsers } from "../../services/useUsers";
import { useModal } from "../../contexts/ModalContext";
import CreateUserModal from "./CreateUserModal";
import type { BookingUser } from "../../data/sessionStore";

const USER_FILTER_SCHEMA: SearchSchema = {
  label: "User Filters",
  fields: [
    { key: "displayName", label: "Display Name", type: "TEXT", operators: ["CONTAINS", "STARTS_WITH", "EQ"] },
    { key: "firstName", label: "First Name", type: "TEXT", operators: ["CONTAINS", "STARTS_WITH", "EQ"] },
    { key: "lastName", label: "Last Name", type: "TEXT", operators: ["CONTAINS", "STARTS_WITH", "EQ"] },
    { key: "title", label: "Title / Role", type: "TEXT", operators: ["CONTAINS", "STARTS_WITH", "EQ"] },
    { key: "email", label: "Email", type: "TEXT", operators: ["CONTAINS", "STARTS_WITH", "EQ"] },
    { key: "phoneNumber", label: "Phone Number", type: "TEXT", inputType: "phone", operators: ["EQ", "STARTS_WITH", "CONTAINS"] },
    { key: "status", label: "Status", type: "ENUM", operators: ["EQ", "IN"], values: ["Active", "Inactive"] },
    { key: "hasLogin", label: "Login Enabled", type: "BOOLEAN", operators: ["EQ"] },
  ],
  operatorCatalog: [
    { operator: "EQ", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
    { operator: "CONTAINS", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
    { operator: "STARTS_WITH", arity: "EXACTLY_ONE", minValues: 1, maxValues: 1 },
    { operator: "IN", arity: "AT_LEAST_ONE", minValues: 1, maxValues: -1 },
  ],
};

export default function UsersPage() {
  const { users, loading, refresh } = useUsers();
  const { openModal } = useModal();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, USER_FILTER_SCHEMA).length,
    [advancedFilters]
  );

  const appliedFilterSummary = useMemo(
    () => formatAppliedLocalFilterSummary(advancedFilters, USER_FILTER_SCHEMA),
    [advancedFilters]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const locallyFiltered = applyLocalSchemaFilters(users, advancedFilters, USER_FILTER_SCHEMA, {
      displayName: (user) => (user as BookingUser).displayName,
      firstName: (user) => (user as BookingUser).firstName,
      lastName: (user) => (user as BookingUser).lastName,
      title: (user) => (user as BookingUser).title,
      email: (user) => (user as BookingUser).email,
      phoneNumber: (user) => (user as BookingUser).phoneNumber,
      status: (user) => (user as BookingUser).status,
      hasLogin: (user) => (user as BookingUser).hasLogin,
    });

    return locallyFiltered.filter(
      (user) =>
        !normalized ||
        user.displayName.toLowerCase().includes(normalized) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(normalized),
    );
  }, [advancedFilters, query, users]);

  const columns = useMemo<ColumnDef<BookingUser>[]>(
    () => [
      { key: "displayName", header: "Display name", sortable: true, className: "font-semibold" },
      {
        key: "name",
        header: "Name",
        sortable: true,
        render: (user) => `${user.firstName} ${user.lastName}`.trim() || "-",
        sortFn: (a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      },
      { key: "title", header: "Title / role", sortable: true, render: (user) => user.title || "-" },
      {
        key: "hasLogin",
        header: "Login",
        render: (user) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.hasLogin ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
            {user.hasLogin ? "Login · CRM" : "Booking only"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (user) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
            {user.status}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <section
      id="page-users"
      data-testid="bookings-users-page"
      className="flex h-full flex-col gap-4 overflow-y-auto bg-slate-50 p-4 md:p-6"
    >
      <PageHeader
        title="Users"
        subtitle="Manage booking users, access, and availability."
        actions={
          <Button
            id="bookings-users-create"
            data-testid="bookings-users-create"
            onClick={() => openModal(<CreateUserModal onCreated={() => refresh()} />)}
          >
            Create User
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          id="bookings-users-search"
          data-testid="bookings-users-search"
          type="search"
          placeholder="Search users"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-sm"
        />
        <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
          <Button
            type="button"
            variant={appliedFilterCount > 0 ? "primary" : "outline"}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 font-semibold",
              appliedFilterCount > 0
                ? ""
                : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
            )}
            onClick={() => {
              setDraftFilters(
                advancedFilters.length > 0
                  ? advancedFilters
                  : buildDefaultSearchClauses(USER_FILTER_SCHEMA)
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
        getRowId={(user) => user.userUid}
        loading={loading}
        pagination={{
          page,
          pageSize: 10,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No users found" description="Try changing the search." />}
        data-testid="bookings-users"
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
              schema={USER_FILTER_SCHEMA}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              appliedSummary={appliedFilterSummary}
              onClearAll={() => {
                const resetClauses = buildDefaultSearchClauses(USER_FILTER_SCHEMA);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
                setPage(1);
              }}
              emptyStateMessage="No user filters are available."
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const resetClauses = buildDefaultSearchClauses(USER_FILTER_SCHEMA);
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
