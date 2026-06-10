import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  Drawer,
  EmptyState,
  Icon,
  Input,
  Popover,
  PopoverSection,
  Select,
  StatCard,
  Tabs,
  cn,
  type ColumnDef,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useUserDepartments, useUserTeams, useUsersCount, useUsersList, useUserLocations } from "../queries/users";
import type { UserSummary } from "../types";
import { FunnelGlyph, MoreGlyph, PlusGlyph, UserAvatar, UsersPageShell } from "./shared";
import { AssignLocationsDialog, ChangeLoginIdDialog, CreateTeamDialog, CreateUserDialog } from "./UserCreateDialogs";

const DEFAULT_PAGE_SIZE = 10;

function canOpenSettings(row: UserSummary) {
  const normalizedUserType = (row.userType || "").toUpperCase();
  return normalizedUserType === "PROVIDER";
}

type UserAdvancedFilters = {
  keyword: string;
  departmentId: string;
  locationId: string;
  firstName: string;
  lastName: string;
  userDisplayName: string;
  primaryPhoneNumber: string;
  email: string;
  gender: string;
  employeeId: string;
  availableStatus: string;
};

const EMPTY_ADVANCED_FILTERS: UserAdvancedFilters = {
  keyword: "",
  departmentId: "all",
  locationId: "all",
  firstName: "",
  lastName: "",
  userDisplayName: "",
  primaryPhoneNumber: "",
  email: "",
  gender: "all",
  employeeId: "",
  availableStatus: "all",
};

export function UsersList() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [typeFilter, setTypeFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState<UserAdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [draftFilters, setDraftFilters] = useState<UserAdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [assignLocationsUser, setAssignLocationsUser] = useState<UserSummary | null>(null);
  const [changeLoginIdUser, setChangeLoginIdUser] = useState<UserSummary | null>(null);

  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "users",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [
      statusFilter,
      typeFilter,
      advancedFilters.keyword,
      advancedFilters.departmentId,
      advancedFilters.locationId,
      advancedFilters.firstName,
      advancedFilters.lastName,
      advancedFilters.userDisplayName,
      advancedFilters.primaryPhoneNumber,
      advancedFilters.email,
      advancedFilters.gender,
      advancedFilters.employeeId,
      advancedFilters.availableStatus,
    ],
  });

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      status: statusFilter,
      userType: typeFilter,
      ...advancedFilters,
    }),
    [
      page,
      pageSize,
      statusFilter,
      typeFilter,
      advancedFilters,
    ]
  );

  const listQuery = useUsersList(filters);
  const countQuery = useUsersCount({
    status: "all",
    userType: "all",
    departmentId: "all",
  });
  const teamsQuery = useUserTeams("all");
  const departmentsQuery = useUserDepartments();
  const locationsQuery = useUserLocations();

  const rows = listQuery.data?.users ?? [];
  const totalUsers = countQuery.data || rows.length;
  const activeUsers = listQuery.data?.total ?? rows.length;
  const totalTeams = teamsQuery.data?.length ?? 0;
  const departmentNameMap = useMemo(
    () => new Map((departmentsQuery.data ?? []).map((department) => [String(department.id), department.name])),
    [departmentsQuery.data]
  );

  const columns = useMemo<ColumnDef<UserSummary>[]>(
    () => {
      const cols: ColumnDef<UserSummary>[] = [
        {
          key: "name",
          header: "Name",
          headerClassName: "font-semibold text-slate-900",
          render: (row) => (
            <UserAvatar
              name={row.name}
              subtitle={row.email || row.mobile || row.employeeId || row.roleName || row.userType}
              size="lg"
              prominent
            />
          ),
        },
        {
          key: "locations",
          header: "Business Locations",
          headerClassName: "font-semibold text-slate-900",
          render: (row) => (row.locations.length ? row.locations.join(", ") : "-"),
        },
      ];

      if (departmentsQuery.data && departmentsQuery.data.length > 0) {
        cols.push({
          key: "departmentName",
          header: "Department",
          headerClassName: "font-semibold text-slate-900",
          render: (row) => row.departmentName || departmentNameMap.get(String(row.departmentId ?? "")) || "-",
        });
      }

      cols.push({
        key: "id",
        header: "",
        width: "8%",
        render: (row) => (
          <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
            <Popover
              align="end"
              contentClassName="min-w-[220px] p-2"
              trigger={
                <button
                  type="button"
                  aria-label={`More actions for ${row.name}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <MoreGlyph />
                </button>
              }
            >
              <PopoverSection className="space-y-1">
                <UserMenuAction
                  label={canOpenSettings(row) ? "Settings" : "Personal Details"}
                  onClick={() =>
                    navigate(
                      canOpenSettings(row) ? `${basePath}/settings/${row.id}` : `${basePath}/profile/${row.id}`
                    )
                  }
                />
                <UserMenuAction label="Assign to Locations" onClick={() => setAssignLocationsUser(row)} muted />
                <UserMenuAction label="Change Login ID" onClick={() => setChangeLoginIdUser(row)} muted />
                <UserMenuAction
                  label={row.status === "ACTIVE" ? "Disable" : "Enable"}
                  onClick={() => {}}
                  muted
                  destructive={row.status === "ACTIVE"}
                />
              </PopoverSection>
            </Popover>
          </div>
        ),
      });

      return cols;
    },
    [basePath, departmentNameMap, navigate, departmentsQuery.data]
  );

  const departmentOptions = useMemo(
    () => [
      { value: "all", label: "All Departments" },
      ...(departmentsQuery.data ?? []).map((department) => ({
        value: department.id,
        label: department.name,
      })),
    ],
    [departmentsQuery.data]
  );

  const locationOptions = useMemo(
    () => [
      { value: "all", label: "All Locations" },
      ...(locationsQuery.data ?? []).map((location) => ({
        value: location.id,
        label: location.name,
      })),
    ],
    [locationsQuery.data]
  );

  const appliedAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.keyword) count++;
    if (advancedFilters.departmentId && advancedFilters.departmentId !== "all") count++;
    if (advancedFilters.locationId && advancedFilters.locationId !== "all") count++;
    if (advancedFilters.firstName) count++;
    if (advancedFilters.lastName) count++;
    if (advancedFilters.userDisplayName) count++;
    if (advancedFilters.primaryPhoneNumber) count++;
    if (advancedFilters.email) count++;
    if (advancedFilters.gender && advancedFilters.gender !== "all") count++;
    if (advancedFilters.employeeId) count++;
    if (advancedFilters.availableStatus && advancedFilters.availableStatus !== "all") count++;
    return count;
  }, [advancedFilters]);

  return (
    <>
      <UsersPageShell
        title="User Overview"
        subtitle="Create And Manage Users"
        actions={
          <Popover
            align="end"
            contentClassName="min-w-[220px] p-2"
            trigger={
              <Button type="button" variant="primary" size="md" icon={<PlusGlyph />}>
                Create
              </Button>
            }
          >
            <PopoverSection className="space-y-1">
              <UserMenuAction label="Create User" onClick={() => setCreateDialogOpen(true)} />
              <UserMenuAction label="Create Team" onClick={() => setCreateTeamDialogOpen(true)} muted />
            </PopoverSection>
          </Popover>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Users" value={totalUsers} accent="indigo" icon={<Icon name="list" />} />
            <StatCard label="Total Teams" value={totalTeams} accent="amber" icon={<Icon name="layers" />} />
            <StatCard label="Active Users" value={activeUsers} accent="emerald" icon={<Icon name="list" />} />
          </div>

        <div className="space-y-8 py-5 px-0">
            <div className="flex items-center justify-between gap-4">
              <Tabs
                value="users"
                onValueChange={(value) => {
                  if (value === "teams") navigate(`${basePath}/teams`);
                }}
                items={[
                  { value: "users", label: "Users" },
                  { value: "teams", label: "Teams" },
                ]}
                className="border-b-0"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-56">
                  <Select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                    options={[
                      { value: "ACTIVE", label: "Active Users" },
                      { value: "INACTIVE", label: "Inactive Users" },
                      { value: "all", label: "All Users" },
                    ]}
                  />
                </div>
                <div className="w-56">
                  <Select
                    value={typeFilter}
                    onChange={(event) => {
                      setTypeFilter(event.target.value);
                      setPage(1);
                    }}
                    options={[
                      { value: "all", label: "All Types" },
                      { value: "PROVIDER", label: "Provider" },
                      { value: "ASSISTANT", label: "Assistant" },
                      { value: "ADMIN", label: "Admin" },
                    ]}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant={appliedAdvancedFilterCount > 0 ? "primary" : "outline"}
                className={cn(
                  "flex items-center gap-2 rounded-md font-semibold px-4 py-2 border-slate-300",
                  appliedAdvancedFilterCount > 0
                    ? ""
                    : "text-indigo-700 border-indigo-100 hover:bg-indigo-50/20"
                )}
                onClick={() => {
                  setDraftFilters(advancedFilters);
                  setDrawerOpen(true);
                }}
                id="btnUserDrawerFilters_SM_Users"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={cn(
                    "h-4 w-4 stroke-[2.2]",
                    appliedAdvancedFilterCount > 0 ? "text-white" : "text-indigo-700"
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
                <span>Filter</span>
                {appliedAdvancedFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
                    {appliedAdvancedFilterCount}
                  </span>
                )}
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-none">
              <DataTable
                data={rows}
                columns={columns}
                loading={listQuery.isLoading}
                onRowClick={(row) => navigate(`${basePath}/${row.id}`)}
                selection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }}
                pagination={{
                  page,
                  pageSize,
                  total: activeUsers,
                  onChange: setPage,
                  onPageSizeChange: setPageSize,
                  mode: "server",
                }}
                className="rounded-xl border-0 shadow-none"
                tableClassName="[&_thead_th]:bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_40%,white)] [&_thead_th]:py-4 [&_thead_th]:text-[length:var(--text-xs)] [&_tbody_td]:py-4"
                emptyState={<EmptyState title="No users found" description="Try adjusting the active filters." />}
              />
            </div>
          </div>
      </UsersPageShell>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Advanced Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex flex-col flex-1 overflow-hidden h-full">
          <div className="space-y-5 flex-1 overflow-y-auto p-5">
            <Input
              id="txtUserKeyword_SM_Users"
              label="Keyword"
              placeholder="Enter name, email, etc."
              value={draftFilters.keyword}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, keyword: event.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="txtUserFirstName_SM_Users"
                label="First Name"
                placeholder="First Name"
                value={draftFilters.firstName}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, firstName: event.target.value }))
                }
              />
              <Input
                id="txtUserLastName_SM_Users"
                label="Last Name"
                placeholder="Last Name"
                value={draftFilters.lastName}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
            </div>
            <Input
              id="txtUserDisplayName_SM_Users"
              label="Display Name"
              placeholder="Display Name"
              value={draftFilters.userDisplayName}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, userDisplayName: event.target.value }))
              }
            />
            <Input
              id="txtUserPhone_SM_Users"
              label="Primary Phone Number"
              placeholder="Phone Number"
              value={draftFilters.primaryPhoneNumber}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, primaryPhoneNumber: event.target.value }))
              }
            />
            <Input
              id="txtUserEmail_SM_Users"
              label="Email Address"
              placeholder="email@example.com"
              value={draftFilters.email}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <Input
              id="txtUserEmployeeId_SM_Users"
              label="Employee ID"
              placeholder="Employee ID"
              value={draftFilters.employeeId}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, employeeId: event.target.value }))
              }
            />
            {departmentsQuery.data && departmentsQuery.data.length > 0 && (
              <Select
                label="Department"
                value={draftFilters.departmentId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, departmentId: event.target.value }))
                }
                options={departmentOptions}
              />
            )}
            <Select
              label="Location"
              value={draftFilters.locationId}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, locationId: event.target.value }))
              }
              options={locationOptions}
            />
            <Select
              label="Gender"
              value={draftFilters.gender}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, gender: event.target.value }))
              }
              options={[
                { value: "all", label: "All Genders" },
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "OTHER", label: "Other" },
              ]}
            />
            <Select
              label="Availability Status"
              value={draftFilters.availableStatus}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, availableStatus: event.target.value }))
              }
              options={[
                { value: "all", label: "All Availability" },
                { value: "AVAILABLE", label: "Available" },
                { value: "NOT_AVAILABLE", label: "Not Available" },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-5 bg-white shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraftFilters(EMPTY_ADVANCED_FILTERS);
                setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
                setPage(1);
                setDrawerOpen(false);
              }}
              id="btnResetAdvancedFilters_Drawer_Users"
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setAdvancedFilters(draftFilters);
                setPage(1);
                setDrawerOpen(false);
              }}
              id="btnApplyAdvancedFilters_Drawer_Users"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(userId) => navigate(`${basePath}/${userId}`)}
      />
      <CreateTeamDialog open={createTeamDialogOpen} onClose={() => setCreateTeamDialogOpen(false)} />
      <AssignLocationsDialog
        open={Boolean(assignLocationsUser)}
        onClose={() => setAssignLocationsUser(null)}
        userId={assignLocationsUser?.id ?? null}
        userName={assignLocationsUser?.name}
        initialLocationIds={assignLocationsUser?.locationIds ?? []}
      />
      <ChangeLoginIdDialog
        open={Boolean(changeLoginIdUser)}
        onClose={() => setChangeLoginIdUser(null)}
        userId={changeLoginIdUser?.id ?? null}
      />
    </>
  );
}

function UserMenuAction({
  label,
  onClick,
  muted = false,
  destructive = false,
}: {
  label: string;
  onClick: () => void;
  muted?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-slate-50",
        destructive ? "text-rose-600" : muted ? "text-slate-700" : "text-slate-900"
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {label}
    </button>
  );
}
