import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState, Icon, Popover, PopoverSection, SectionCard, Select, StatCard, Tabs, type ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUserTeams, useUsersCount } from "../queries/users";
import type { UserTeam } from "../types";
import { FunnelGlyph, PlusGlyph, UserStatusBadge, UsersPageShell } from "./shared";
import { CreateTeamDialog, CreateUserDialog } from "./UserCreateDialogs";

export function UserTeamsList() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [status, setStatus] = useState("ACTIVE");
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const teamsQuery = useUserTeams(status);
  const allTeamsQuery = useUserTeams("all");
  const activeUsersQuery = useUsersCount({
    status: "ACTIVE",
    userType: "all",
    departmentId: "all",
  });
  const totalUsersQuery = useUsersCount({
    status: "all",
    userType: "all",
    departmentId: "all",
  });
  const rows = teamsQuery.data ?? [];
  const totalTeams = allTeamsQuery.data?.length ?? rows.length;

  const columns = useMemo<ColumnDef<UserTeam>[]>(
    () => [
      {
        key: "name",
        header: "Team",
        headerClassName: "font-semibold text-slate-900",
      },
      {
        key: "description",
        header: "Description",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.description || "-",
      },
      {
        key: "memberCount",
        header: "Members",
        headerClassName: "font-semibold text-slate-900",
      },
      {
        key: "members",
        header: "Assigned Users",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (row.members.length ? row.members.map((member) => member.name).join(", ") : "-"),
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <UserStatusBadge status={row.status} />,
      },
    ],
    []
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
            <button
              type="button"
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
              onClick={() => setCreateUserDialogOpen(true)}
            >
              Create User
            </button>
            <button
              type="button"
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Team
            </button>
          </PopoverSection>
        </Popover>
      }
    >
      <SectionCard className="border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Users"
            value={totalUsersQuery.data ?? "-"}
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
            value={activeUsersQuery.data ?? "-"}
            accent="emerald"
            icon={<Icon name="list" />}
          />
        </div>
      </SectionCard>

      <SectionCard className="border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]" padding={false}>
        <div className="space-y-8 p-5">
          <Tabs
            value="teams"
            onValueChange={(value) => {
              if (value === "users") navigate(basePath);
            }}
            items={[
              { value: "users", label: "Users" },
              { value: "teams", label: "Teams" },
            ]}
            className="border-b-0"
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="w-full max-w-[262px]">
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                options={[
                  { value: "ACTIVE", label: "Active Teams" },
                  { value: "INACTIVE", label: "Inactive Teams" },
                  { value: "all", label: "All Teams" },
                ]}
              />
            </div>
            <button
              type="button"
              className="rounded-md p-3 text-[var(--color-primary)]"
              onClick={() => {}}
              aria-label="Team filters"
            >
              <FunnelGlyph />
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <DataTable
              data={rows}
              columns={columns}
              loading={teamsQuery.isLoading}
              selection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
              }}
              className="rounded-xl border-0 shadow-none"
              tableClassName="[&_thead_th]:bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_40%,white)] [&_thead_th]:py-4 [&_thead_th]:text-[length:var(--text-xs)] [&_tbody_td]:py-5"
              emptyState={
                <EmptyState
                  title="No teams found"
                  description="No team groups matched the selected status."
                />
              }
            />
          </div>
        </div>
      </SectionCard>
      <CreateUserDialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} />
      <CreateTeamDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
    </UsersPageShell>
  );
}
