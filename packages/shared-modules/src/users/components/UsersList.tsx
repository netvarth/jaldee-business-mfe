import { useMemo, useState } from "react";
import {
  Button,
  DataTable,
  Drawer,
  EmptyState,
  Input,
  Popover,
  PopoverSection,
  Select,
  cn,
  type ColumnDef,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import { useUserDepartments, useUsersList, useUserLocations } from "../queries/users";
import type { UserSummary } from "../types";
import { FunnelGlyph, MoreGlyph, PlusGlyph, UserAvatar, UserStatusBadge, UsersPageShell } from "./shared";
import { AssignLocationsDialog, ChangeLoginIdDialog, CreateUserDialog } from "./UserCreateDialogs";

const DEFAULT_PAGE_SIZE = 10;

function canOpenSettings(row: UserSummary) {
  const normalizedUserType = (row.userType || "").toUpperCase();
  return normalizedUserType === "PROVIDER";
}

type UserAdvancedFilters = {
  keyword: string;
  status: string;
  userType: string;
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
  status: "ACTIVE",
  userType: "all",
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
  const { basePath, uiOverrides } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [advancedFilters, setAdvancedFilters] = useState<UserAdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [draftFilters, setDraftFilters] = useState<UserAdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignLocationsUser, setAssignLocationsUser] = useState<UserSummary | null>(null);
  const [changeLoginIdUser, setChangeLoginIdUser] = useState<UserSummary | null>(null);

  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "users",
    defaultPageSize: DEFAULT_PAGE_SIZE,
    resetDeps: [
      advancedFilters.status,
      advancedFilters.userType,
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
      ...advancedFilters,
    }),
    [page, pageSize, advancedFilters]
  );

  const listQuery = useUsersList(filters);
  const departmentsQuery = useUserDepartments();
  const locationsQuery = useUserLocations();

  const rows = listQuery.data?.users ?? [];
  const activeUsers = listQuery.data?.total ?? rows.length;

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
              subtitle={row.employeeId || row.roleName || row.userType}
              size="md"
            />
          ),
        },
        {
          key: "email",
          header: "Email",
          headerClassName: "font-semibold text-slate-900",
          render: (row) => row.email || "—",
        },
        {
          key: "mobile",
          header: "Phone",
          headerClassName: "font-semibold text-slate-900",
          render: (row) => row.mobile || "—",
        },
      ];

      if (departmentsQuery.data && departmentsQuery.data.length > 0) {
        cols.push({
          key: "departmentName",
          header: "Department",
          headerClassName: "font-semibold text-slate-900",
          render: (row) => row.departmentName || departmentNameMap.get(String(row.departmentId ?? "")) || "—",
        });
      }

      cols.push({
        key: "id",
        header: "",
        width: "8%",
        render: (row) => (
          <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
            <Popover
              portal
              align="end"
              contentClassName="min-w-[220px] p-2"
              trigger={
                <button
                  type="button"
                  aria-label={`More actions for ${row.name}`}
                  id={`btnUserActions_${row.id}_SM_Users`}
                  data-testid={`btnUserActions_${row.id}_SM_Users`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <MoreGlyph />
                </button>
              }
            >
              <PopoverSection className="space-y-1">
                <UserMenuAction
                  testId={`btnUserSettings_${row.id}_SM_Users`}
                  label={canOpenSettings(row) ? "Settings" : "Personal Details"}
                  onClick={() =>
                    navigate(
                      canOpenSettings(row) ? `${basePath}/settings/${row.id}` : `${basePath}/profile/${row.id}`
                    )
                  }
                />
                <UserMenuAction testId={`btnUserAssignLocations_${row.id}_SM_Users`} label="Assign to Locations" onClick={() => setAssignLocationsUser(row)} muted />
                <UserMenuAction testId={`btnUserChangeLoginId_${row.id}_SM_Users`} label="Change Login ID" onClick={() => setChangeLoginIdUser(row)} muted />
                <UserMenuAction
                  testId={`btnUserToggleStatus_${row.id}_SM_Users`}
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
    if (advancedFilters.status && advancedFilters.status !== "ACTIVE") count++;
    if (advancedFilters.userType && advancedFilters.userType !== "all") count++;
    if (advancedFilters.departmentId && advancedFilters.departmentId !== "all") count++;
    if (advancedFilters.firstName) count++;
    if (advancedFilters.lastName) count++;
    if (advancedFilters.primaryPhoneNumber) count++;
    if (advancedFilters.email) count++;
    if (advancedFilters.employeeId) count++;
    return count;
  }, [advancedFilters]);

  return (
    <>
      <UsersPageShell
        title={uiOverrides?.listTitle ?? "User Overview"}
        subtitle={uiOverrides?.listSubtitle ?? "Create And Manage Users"}
        actions={
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<PlusGlyph />}
            id="btnCreateUser_SM_Users"
            data-testid="btnCreateUser_SM_Users"
            onClick={() => setCreateDialogOpen(true)}
          >
            {uiOverrides?.createButtonText ?? "Create User"}
          </Button>
        }
      >

        <div className="space-y-8 py-5 px-0">
          <div className="flex justify-end">
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
              data-testid="btnUserDrawerFilters_SM_Users"
              data-state={appliedAdvancedFilterCount > 0 ? "active" : "default"}
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

          <DataTable
            data={rows}
            columns={columns}
            loading={listQuery.isLoading}
            onRowClick={(row) => navigate(`${basePath}/${row.id}`)}
            pagination={{
              page,
              pageSize,
              total: activeUsers,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "server",
            }}
            emptyState={<EmptyState title="No users found" description="Try adjusting the active filters." />}
            data-testid="tblUsersList_SM_Users"
          />
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
            <Select
              label="Status"
              testId="selectUserStatus_SM_Users"
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              options={[
                { value: "ACTIVE", label: "Active Users" },
                { value: "INACTIVE", label: "Inactive Users" },
                { value: "all", label: "All Users" },
              ]}
            />
            <Select
              label="User Type"
              testId="selectUserType_SM_Users"
              value={draftFilters.userType}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, userType: event.target.value }))
              }
              options={[
                { value: "all", label: "All Types" },
                { value: "PROVIDER", label: "Provider" },
                { value: "ASSISTANT", label: "Assistant" },
                { value: "ADMIN", label: "Admin" },
              ]}
            />
            <Input
              id="txtUserKeyword_SM_Users"
              data-testid="txtUserKeyword_SM_Users"
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
                data-testid="txtUserFirstName_SM_Users"
                label="First Name"
                placeholder="First Name"
                value={draftFilters.firstName}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, firstName: event.target.value }))
                }
              />
              <Input
                id="txtUserLastName_SM_Users"
                data-testid="txtUserLastName_SM_Users"
                label="Last Name"
                placeholder="Last Name"
                value={draftFilters.lastName}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
            </div>
            <Input
              id="txtUserPhone_SM_Users"
              data-testid="txtUserPhone_SM_Users"
              label="Primary Phone Number"
              placeholder="Phone Number"
              value={draftFilters.primaryPhoneNumber}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, primaryPhoneNumber: event.target.value }))
              }
            />
            <Input
              id="txtUserEmail_SM_Users"
              data-testid="txtUserEmail_SM_Users"
              label="Email Address"
              placeholder="email@example.com"
              value={draftFilters.email}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <Input
              id="txtUserEmployeeId_SM_Users"
              data-testid="txtUserEmployeeId_SM_Users"
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
                testId="selectUserDepartment_SM_Users"
                value={draftFilters.departmentId}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, departmentId: event.target.value }))
                }
                options={departmentOptions}
              />
            )}
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
              data-testid="btnResetAdvancedFilters_Drawer_Users"
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
              data-testid="btnApplyAdvancedFilters_Drawer_Users"
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
  testId,
}: {
  label: string;
  onClick: () => void;
  muted?: boolean;
  destructive?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      id={testId}
      data-testid={testId}
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
