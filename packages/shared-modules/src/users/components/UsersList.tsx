import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  Popover,
  PopoverSection,
  SectionCard,
  Select,
  StatCard,
  Tabs,
  cn,
  type ColumnDef,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useUserDepartments, useUserTeams, useUsersCount, useUsersList } from "../queries/users";
import type { UserSummary } from "../types";
import { FunnelGlyph, MoreGlyph, PlusGlyph, UserAvatar, UsersPageShell } from "./shared";
import { AssignLocationsDialog, ChangeLoginIdDialog, CreateTeamDialog, CreateUserDialog } from "./UserCreateDialogs";

const DEFAULT_PAGE_SIZE = 10;

function canOpenSettings(row: UserSummary) {
  const normalizedUserType = (row.userType || "").toUpperCase();
  return normalizedUserType === "PROVIDER";
}

export function UsersList() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  const [assignLocationsUser, setAssignLocationsUser] = useState<UserSummary | null>(null);
  const [changeLoginIdUser, setChangeLoginIdUser] = useState<UserSummary | null>(null);

  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "users",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [statusFilter, typeFilter, departmentFilter],
  });

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      status: statusFilter,
      userType: typeFilter,
      departmentId: departmentFilter,
    }),
    [page, pageSize, statusFilter, typeFilter, departmentFilter]
  );

  const listQuery = useUsersList(filters);
  const countQuery = useUsersCount({
    status: "all",
    userType: "all",
    departmentId: "all",
  });
  const activeCountQuery = useUsersCount({
    status: statusFilter,
    userType: typeFilter,
    departmentId: departmentFilter,
  });
  const teamsQuery = useUserTeams("all");
  const departmentsQuery = useUserDepartments();

  const rows = listQuery.data ?? [];
  const totalUsers = countQuery.data || rows.length;
  const activeUsers = activeCountQuery.data || rows.length;
  const totalTeams = teamsQuery.data?.length ?? 0;
  const departmentNameMap = useMemo(
    () => new Map((departmentsQuery.data ?? []).map((department) => [String(department.id), department.name])),
    [departmentsQuery.data]
  );

  const columns = useMemo<ColumnDef<UserSummary>[]>(
    () => [
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
      {
        key: "departmentName",
        header: "Department",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.departmentName || departmentNameMap.get(String(row.departmentId ?? "")) || "-",
      },
      {
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
      },
    ],
    [basePath, departmentNameMap, navigate]
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

  return (
    <UsersPageShell
      title="User Overview"
      subtitle="Create And Manage Users"
      actions={
        <Popover
          align="end"
          contentClassName="min-w-[220px] p-2"
          trigger={
            <Button type="button" variant="primary" size="lg" icon={<PlusGlyph />} className="min-w-[134px] rounded-md">
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
      <SectionCard className="border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Users" value={totalUsers} accent="indigo" icon={<Icon name="list" />} />
          <StatCard label="Total Teams" value={totalTeams} accent="amber" icon={<Icon name="layers" />} />
          <StatCard label="Active Users" value={activeUsers} accent="emerald" icon={<Icon name="list" />} />
        </div>
      </SectionCard>

      <SectionCard className="border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]" padding={false}>
        <div className="space-y-8 p-5">
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
            <div className="w-full max-w-[262px]">
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={[
                  { value: "ACTIVE", label: "Active Users" },
                  { value: "INACTIVE", label: "Inactive Users" },
                  { value: "all", label: "All Users" },
                ]}
              />
            </div>
            <button
              type="button"
              className="rounded-md p-3 text-[var(--color-primary)]"
              onClick={() => setShowAdvancedFilters((value) => !value)}
              aria-label="Toggle advanced filters"
            >
              <FunnelGlyph />
            </button>
          </div>

          {showAdvancedFilters ? (
            <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2">
              <Select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "PROVIDER", label: "Provider" },
                  { value: "ASSISTANT", label: "Assistant" },
                  { value: "ADMIN", label: "Admin" },
                ]}
              />
              <Select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                options={departmentOptions}
              />
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
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
                total: totalUsers,
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
      </SectionCard>
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
    </UsersPageShell>
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
