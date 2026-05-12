import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  SectionCard,
  Select,
  StatCard,
  Tabs,
  type ColumnDef,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useUserDepartments, useUserTeams, useUsersCount, useUsersList } from "../queries/users";
import type { UserSummary } from "../types";
import {
  FunnelGlyph,
  PlusGlyph,
  UserAvatar,
  UsersPageShell,
} from "./shared";

const DEFAULT_PAGE_SIZE = 10;

export function UsersList() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

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

  const columns = useMemo<ColumnDef<UserSummary>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <UserAvatar name={row.name} subtitle={row.email || row.mobile || row.employeeId} />,
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
        render: (row) => row.departmentName || "-",
      },
      {
        key: "id",
        header: "",
        width: "8%",
        render: (row) => (
          <button
            type="button"
            className="rounded-md px-2 py-1 text-3xl leading-none text-slate-800"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`${basePath}/${row.id}`);
            }}
          >
            ⋮
          </button>
        ),
      },
    ],
    [basePath, navigate]
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
    >
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

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="grid flex-1 gap-4 md:grid-cols-3">
              <StatCard
                label="Total Users"
                value={totalUsers}
                accent="indigo"
                icon={<Icon name="list" />}
              />
              <StatCard
                label="Total Teams"
                value={totalTeams}
                accent="amber"
                icon={<Icon name="layers" />}
              />
              <StatCard
                label="Active Users"
                value={activeUsers}
                accent="emerald"
                icon={<Icon name="list" />}
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              icon={<PlusGlyph />}
              onClick={() => {}}
              title="Create user flow not integrated yet"
              className="min-w-[134px] rounded-md"
            >
              Create
            </Button>
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
              tableClassName="[&_thead_th]:bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_40%,white)] [&_thead_th]:py-4 [&_thead_th]:text-[length:var(--text-xs)] [&_tbody_td]:py-5"
              emptyState={
                <EmptyState
                  title="No users found"
                  description="Try adjusting the active filters."
                />
              }
            />
          </div>
        </div>
      </SectionCard>
    </UsersPageShell>
  );
}
