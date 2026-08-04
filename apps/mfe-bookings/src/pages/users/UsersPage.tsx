import { useMemo, useState } from "react";
import {
  Button,
  cn,
  DataTable,
  Drawer,
  EmptyState,
  Input,
  PageHeader,
  Popover,
  type ColumnDef,
} from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { formatAppliedBookingUserFilterSummary } from "../../services/bookingUserSearch";
import { useBookingApi } from "../../services/useBookingApi";
import { useUsers } from "../../services/useUsers";
import { useModal } from "../../contexts/ModalContext";
import CreateUserModal from "./CreateUserModal";
import UserProfileModal from "./UserProfileModal";
import { useToast } from "../../contexts/ToastContext";
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
  const api = useBookingApi();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userSearchSchema = USER_FILTER_SCHEMA;
  const { users, loading, refresh, error } = useUsers(advancedFilters, userSearchSchema);

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, userSearchSchema).length,
    [advancedFilters, userSearchSchema]
  );

  const appliedFilterSummary = useMemo(
    () => formatAppliedBookingUserFilterSummary(advancedFilters, userSearchSchema),
    [advancedFilters, userSearchSchema]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter(
      (user) =>
        !normalized ||
        user.displayName.toLowerCase().includes(normalized) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(normalized),
    );
  }, [query, users]);

  async function toggleStatus(user: BookingUser) {
    const nextStatus = user.status === "Active" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/booking-users/${user.userUid}/status`, undefined, {
        params: { status: nextStatus },
      });
      showToast("Booking user status updated", "success");
      refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update booking user status", "error");
    }
  }

  const columns = useMemo<ColumnDef<BookingUser>[]>(
    () => [
      {
        key: "displayName",
        header: "Name",
        sortable: true,
        className: "font-semibold",
        render: (user) => user.displayName || `${user.firstName} ${user.lastName}`.trim() || "-",
        sortFn: (a, b) =>
          (a.displayName || `${a.firstName} ${a.lastName}`).localeCompare(
            b.displayName || `${b.firstName} ${b.lastName}`
          ),
      },
      {
        key: "phoneNumber",
        header: "Mobile number",
        sortable: true,
        render: (user) => user.phoneNumber || "-",
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
      {
        key: "actions",
        header: "Actions",
        align: "right",
        width: 90,
        render: (user) => (
          <div className="flex justify-end">
            <Popover
              trigger={
                <button
                  id={`bookings-user-actions-${user.userUid}`}
                  data-testid={`bookings-user-actions-${user.userUid}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                  onClick={(event) => event.stopPropagation()}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              }
              placement="bottom"
              align="end"
              portal
            >
              <div className="flex min-w-[150px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg whitespace-nowrap">
                <button
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    openModal(<UserProfileModal user={user} mode="view" onSaved={refresh} />);
                  }}
                >
                  View
                </button>
                <button
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    openModal(<UserProfileModal user={user} mode="edit" onSaved={refresh} />);
                  }}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    void toggleStatus(user);
                  }}
                >
                  {user.status === "Active" ? "Inactive" : "Active"}
                </button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [api, openModal, refresh, showToast],
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
                  : buildDefaultSearchClauses(userSearchSchema)
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
        emptyState={
          <EmptyState
            title={
              loading
                ? "Loading users..."
                : error
                  ? "Could not load users"
                  : "No users found"
            }
            description={
              error
                ? error
                : "Try changing the search."
            }
          />
        }
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
              schema={userSearchSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              appliedSummary={appliedFilterSummary}
              onClearAll={() => {
                const resetClauses = buildDefaultSearchClauses(userSearchSchema);
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
                const resetClauses = buildDefaultSearchClauses(userSearchSchema);
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
