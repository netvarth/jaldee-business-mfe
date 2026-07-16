import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Alert, Avatar, Badge, Button, ConfirmDialog, DataTable, Dialog, DialogFooter, Drawer, EmptyState, Input, PageHeader, Popover, PopoverSection, SectionCard, Select, Switch, Tabs, cn } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { resolveCustomerLabel } from "../../labels";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useUrlPagination } from "../../useUrlPagination";
import {
  useChangeCustomerStatus,
  useChangeCustomerGroupStatus,
  useCreateCustomerGroup,
  useCustomerGroupMembers,
  useCustomerGroups,
  useCustomerSearchSchema,
  useCustomersCount,
  useCustomersList,
  useExportCustomers,
  useRemoveSpecificCustomerFromGroup,
  useUpdateCustomerGroup,
} from "../queries/customers";
import type {
  Customer,
  CustomerFilters,
  CustomerGroup,
  CustomerSearchFilterClause,
} from "../types";
import {
  buildDefaultCustomerSearchClauses,
  compactCustomerSearchClauses,
  CustomerSearchFilterBuilder,
} from "./CustomerSearchFilterBuilder";
import { CustomerFormDialog } from "./CustomerFormDialog";

interface CustomersListProps {
  onSelectCustomer: (customer: Customer) => void;
}

type ListTab = "customers" | "inactive" | "groups";
type SearchField = "all" | "name" | "phone" | "id";
const SEARCH_FIELD_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Name", value: "name" },
  { label: "Phone", value: "phone" },
  { label: "ID", value: "id" },
];
export function CustomersList({ onSelectCustomer }: CustomersListProps) {
  const { account, product, apiScope, user, basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const customerLabel = resolveCustomerLabel(account.labels, product);
  const [activeTab, setActiveTab] = useState<ListTab>("customers");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [search, setSearch] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<CustomerSearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<CustomerSearchFilterClause[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "customersList",
    resetDeps: [activeTab, search, JSON.stringify(advancedFilters)],
  });
  const [hasChangedPageSize, setHasChangedPageSize] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportEmail, setExportEmail] = useState(user.email ?? "");
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [generateGrpMemId, setGenerateGrpMemId] = useState(false);
  const [statusChangeCustomer, setStatusChangeCustomer] = useState<Customer | null>(null);
  const [messageCustomer, setMessageCustomer] = useState<Customer | null>(null);
  const exportCustomersMutation = useExportCustomers();
  const customerStatusMutation = useChangeCustomerStatus(statusChangeCustomer?.id ?? null);
  const searchSchemaQuery = useCustomerSearchSchema();
  const groupsQuery = useCustomerGroups();
  const groupMembersQuery = useCustomerGroupMembers(selectedGroup?.id ?? null);
  const createGroup = useCreateCustomerGroup();
  const updateGroup = useUpdateCustomerGroup();
  const changeGroupStatus = useChangeCustomerGroupStatus();
  const removeCustomerFromGroup = useRemoveSpecificCustomerFromGroup();

  const status = useMemo(() => {
    if (activeTab === "inactive") {
      return "INACTIVE";
    }

    if (activeTab === "customers") {
      return undefined;
    }

    return "__GROUPS__";
  }, [activeTab, apiScope]);

  const filters = useMemo<CustomerFilters>(
    () => ({
      search,
      status: status === "__GROUPS__" ? undefined : status,
      page,
      pageSize,
      searchSchema: searchSchemaQuery.data,
      filterClauses: compactCustomerSearchClauses(advancedFilters, searchSchemaQuery.data),
    }),
    [advancedFilters, page, pageSize, search, searchSchemaQuery.data, status]
  );
  const isSearchSchemaReady = searchSchemaQuery.isSuccess && Boolean(searchSchemaQuery.data);

  const activeCountFilters = useMemo<CustomerFilters>(
    () => ({
      status: apiScope === "global" ? undefined : "ACTIVE",
    }),
    [apiScope]
  );

  const inactiveCountFilters = useMemo<CustomerFilters>(
    () => ({
      status: "INACTIVE",
    }),
    []
  );

  const appliedAdvancedFilterCount = useMemo(
    () => compactCustomerSearchClauses(advancedFilters, searchSchemaQuery.data).length,
    [advancedFilters, searchSchemaQuery.data]
  );
  const appliedAdvancedFilterSummary = useMemo(
    () => formatAppliedFilterSummary(advancedFilters, searchSchemaQuery.data),
    [advancedFilters, searchSchemaQuery.data]
  );

  const customersQuery = useCustomersList(filters, {
    enabled: isSearchSchemaReady,
  });
  const hasAppliedSearch = search.trim().length > 0;
  const hasAppliedAdvancedFilters = appliedAdvancedFilterCount > 0;
  const shouldFetchCountBadges = hasChangedPageSize && !hasAppliedSearch && !hasAppliedAdvancedFilters;
  const shouldFetchActiveCount =
    shouldFetchCountBadges && activeTab !== "customers";
  const shouldFetchInactiveCount =
    shouldFetchCountBadges && activeTab !== "inactive";

  const activeCountQuery = useCustomersCount(activeCountFilters, {
    enabled: isSearchSchemaReady && shouldFetchActiveCount,
  });
  const inactiveCountQuery = useCustomersCount(inactiveCountFilters, {
    enabled: isSearchSchemaReady && shouldFetchInactiveCount,
  });

  const rows = activeTab === "groups" ? [] : (customersQuery.data?.customers ?? []);
  const total = activeTab === "groups" ? 0 : (customersQuery.data?.total ?? rows.length);
  const activeCount = activeCountQuery.data ?? (activeTab === "customers" && !search.trim() ? customersQuery.data?.total : undefined);
  const inactiveCount = inactiveCountQuery.data ?? (activeTab === "inactive" && !search.trim() ? customersQuery.data?.total : undefined);
  const groupRows = groupsQuery.data ?? [];
  const groupMembers = groupMembersQuery.data ?? [];

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [activeTab, page, search, pageSize]);

  useEffect(() => {
    if (activeTab !== "groups") {
      setSelectedGroup(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedGroup) {
      return;
    }

    const latest = groupRows.find((group) => group.id === selectedGroup.id);
    if (latest) {
      setSelectedGroup(latest);
    }
  }, [groupRows, selectedGroup]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredGroupRows = useMemo(
    () =>
      !normalizedSearch
        ? groupRows
        : groupRows.filter((group) =>
            [group.groupName, group.description ?? "", group.status ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch)
          ),
    [groupRows, normalizedSearch]
  );

  const filteredGroupMembers = useMemo(
    () =>
      !normalizedSearch
        ? groupMembers
        : groupMembers.filter((customer) =>
            [
              formatCustomerName(customer),
              customer.jaldeeId ?? "",
              customer.phoneNo ?? "",
              customer.email ?? "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch)
          ),
    [groupMembers, normalizedSearch]
  );

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        key: "customer",
        header: `${customerLabel} Name & ID`,
        width: "38%",
        render: (customer) => {
          const name = formatCustomerName(customer);
          const identifier = customer.jaldeeId || customer.id;

          return (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectCustomer(customer);
              }}
              className="flex items-center gap-4 border-0 bg-transparent p-0 text-left"
            >
              <Avatar name={name} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-[length:var(--text-md)] font-semibold leading-6 text-[var(--color-text-primary)]">
                  {name}
                </span>
                <span className="mt-0.5 block text-[length:var(--text-xs)] leading-5 text-[var(--color-text-secondary)]">
                  {identifier}
                </span>
              </span>
            </button>
          );
        },
      },
      {
        key: "phoneNo",
        header: "Phone",
        width: "22%",
        render: (customer) => customer.phoneNo ? `${customer.countryCode ?? ""} ${customer.phoneNo}`.trim() : "-",
      },
      {
        key: "labels",
        header: "Labels",
        width: "12%",
        className: "text-[var(--color-text-secondary)]",
        render: () => "-",
      },
      {
        key: "visitCount",
        header: "Visits",
        width: "10%",
        render: (customer) => String(customer.visitCount ?? 0),
      },
      {
        key: "actions",
        header: "Actions",
        width: "18%",
        render: (customer) => {
          const name = formatCustomerName(customer);
          const isInactive = customer.status === "INACTIVE";
          const hasAnyMessageTarget = Boolean(customer.email || customer.whatsappNumber || customer.phoneNo);
          const menuItems = [
            {
              key: "status",
              label: isInactive ? "Active" : "Inactive",
              onClick: () => setStatusChangeCustomer(customer),
            },
            !isInactive
              ? {
                  key: "appointment",
                  label: "Create Appointment",
                  onClick: () =>
                    navigateToPath(navigate, "/bookings/appointments", {
                      checkin_type: "WALK_IN_APPOINTMENT",
                      source: "customerList",
                      customerId: customer.id,
                      p_source: basePath,
                    }),
                }
              : null,
            !isInactive
              ? {
                  key: "checkin",
                  label: "Create Token",
                  onClick: () =>
                    navigateToPath(navigate, "/bookings/queue", {
                      checkin_type: "WALK_IN_CHECKIN",
                      showtoken: "true",
                      source: "customerList",
                      customerId: customer.id,
                      p_source: basePath,
                    }),
                }
              : null,
            {
              key: "order",
              label: "Create Order",
              onClick: () =>
                navigateToPath(navigate, "/golderp/sales/new", {
                  source: "customers",
                  customerId: customer.id,
                  p_source: basePath,
                }),
            },
            {
              key: "invoice",
              label: "Create Invoice",
              onClick: () =>
                navigateToPath(navigate, "/finance/invoices", {
                  custId: customer.id,
                  type: "custom",
                  from: "patientInvoice",
                  p_source: basePath,
                }),
            },
            !isInactive && product === "health"
              ? {
                  key: "case",
                  label: "Create Case",
                  onClick: () =>
                    navigateToPath(navigate, `${getCanonicalCustomerRouteBasePath(basePath, product)}/${customer.id}/new-case`, {
                      consumerId: customer.id,
                      source: "patientRecord",
                      p_source: basePath,
                    }),
                }
              : null,
            !isInactive && hasAnyMessageTarget
              ? {
                  key: "message",
                  label: "Send Message",
                  onClick: () => setMessageCustomer(customer),
                }
              : null,
            !isInactive
              ? {
                  key: "reminder",
                  label: "Reminder",
                  onClick: () =>
                    navigateToPath(navigate, `${getModuleRoot(basePath, product)}/settings`, {
                      view: "comm-reminder",
                      customerId: customer.id,
                      source: "customers",
                    }),
                }
              : null,
          ].filter(Boolean) as Array<{ key: string; label: string; onClick: () => void }>;

          return (
            <div className="flex items-center gap-3" onClick={(event) => event.stopPropagation()}>
              <Button variant="outline" size="sm" onClick={() => onSelectCustomer(customer)}>
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  stopRowAction(event);
                  setEditingCustomer(customer);
                }}
                icon={<EditIcon />}
              >
                Edit
              </Button>
              <Popover
                data-testid={`customers-row-actions-${customer.id}`}
                align="end"
                contentClassName="min-w-[240px] p-2"
                trigger={
                  <button
                    type="button"
                    aria-label={`More actions for ${name}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]"
                  >
                    <MoreIcon />
                  </button>
                }
              >
                <PopoverSection>
                  {menuItems.map((item, index) => (
                    <MenuActionButton
                      key={item.key}
                      testId={`customers-row-action-${item.key}-${customer.id}`}
                      label={item.label}
                      onClick={item.onClick}
                      className={index > 0 ? "border-t border-[var(--color-border)]" : undefined}
                    />
                  ))}
                </PopoverSection>
              </Popover>
            </div>
          );
        },
      },
    ],
    [basePath, customerLabel, onSelectCustomer, product]
  );

  const groupColumns = useMemo<ColumnDef<CustomerGroup>[]>(
    () => [
      {
        key: "groupName",
        header: "Group",
        width: "34%",
        render: (group) => (
          <div className="space-y-1">
            <div className="text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]">{group.groupName}</div>
            {group.description ? (
              <div className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">{group.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: "16%",
        render: (group) => (
          <Badge variant={group.status === "DISABLE" ? "warning" : "success"}>
            {group.status || "ENABLE"}
          </Badge>
        ),
      },
      {
        key: "consumerCount",
        header: "Members",
        width: "14%",
        render: (group) => String(group.consumerCount ?? 0),
      },
      {
        key: "generateGrpMemId",
        header: "Member IDs",
        width: "16%",
        render: (group) => (group.generateGrpMemId ? "Enabled" : "Off"),
      },
      {
        key: "actions",
        header: "Actions",
        width: "20%",
        render: (group) => (
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Button data-testid={`customers-group-view-${group.id}`} variant="outline" size="sm" onClick={() => setSelectedGroup(group)}>
              View Members
            </Button>
            <Button
              data-testid={`customers-group-edit-${group.id}`}
              variant="outline"
              size="sm"
              onClick={() => openEditGroupDialog(group)}
            >
              Edit
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const groupMemberColumns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        key: "customer",
        header: `${customerLabel} Name`,
        width: "44%",
        render: (customer) => (
          <button
            type="button"
            className="flex items-center gap-3 border-0 bg-transparent p-0 text-left"
            onClick={(event) => {
              event.stopPropagation();
              onSelectCustomer(customer);
            }}
          >
            <Avatar name={formatCustomerName(customer)} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                {formatCustomerName(customer)}
              </span>
              <span className="block text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
                {customer.jaldeeId || customer.id}
              </span>
            </span>
          </button>
        ),
      },
      {
        key: "phoneNo",
        header: "Phone",
        width: "24%",
        render: (customer) => customer.phoneNo ? `${customer.countryCode ?? ""} ${customer.phoneNo}`.trim() : "-",
      },
      {
        key: "status",
        header: "Status",
        width: "14%",
        render: (customer) => customer.status || "-",
      },
      {
        key: "actions",
        header: "Actions",
        width: "18%",
        render: (customer) => (
            <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
              <Button variant="outline" size="sm" onClick={() => onSelectCustomer(customer)}>
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  selectedGroup &&
                  removeCustomerFromGroup.mutate({
                    groupName: selectedGroup.groupName,
                    customerId: customer.id,
                  })
                }
                loading={removeCustomerFromGroup.isPending}
                disabled={!selectedGroup}
              >
                Remove
            </Button>
          </div>
        ),
      },
    ],
    [customerLabel, onSelectCustomer, removeCustomerFromGroup, selectedGroup]
  );

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setHasChangedPageSize(true);
    setPageSize(nextPageSize);
  }

  async function handleExport() {
    const trimmedEmail = exportEmail.trim();
    if (!trimmedEmail) {
      return;
    }

    await exportCustomersMutation.mutateAsync(trimmedEmail);
    setExportDialogOpen(false);
  }

  function openCreateGroupDialog() {
    setEditingGroup(null);
    setGroupName("");
    setGroupDescription("");
    setGenerateGrpMemId(false);
    setGroupDialogOpen(true);
  }

  function openEditGroupDialog(group: CustomerGroup) {
    setEditingGroup(group);
    setGroupName(group.groupName);
    setGroupDescription(group.description ?? "");
    setGenerateGrpMemId(Boolean(group.generateGrpMemId));
    setGroupDialogOpen(true);
  }

  async function handleSaveGroup() {
    const payload = {
      id: editingGroup?.id,
      groupName: groupName.trim(),
      description: groupDescription.trim() || undefined,
      generateGrpMemId,
    };

    if (!payload.groupName) {
      return;
    }

    if (editingGroup) {
      await updateGroup.mutateAsync(payload);
    } else {
      await createGroup.mutateAsync(payload);
    }

    setGroupDialogOpen(false);
  }

  return (
    <>
      <div className="w-full space-y-6" data-testid="customers-list-page">
        <PageHeader
          title={`${customerLabel} List`}
          subtitle={`Add / View your ${customerLabel.toLowerCase()}s and groups`}
          actions={
            <>
              <Button
                data-testid="customers-export-trigger"
                variant="outline"
                size="md"
                onClick={() => setExportDialogOpen(true)}
                disabled={activeTab === "groups"}
                icon={<ExportIcon />}
              >
                Export
              </Button>
              {activeTab === "groups" ? (
                <Button data-testid="customers-add-group" size="md" onClick={openCreateGroupDialog} icon={<PlusIcon />}>
                  Add Group
                </Button>
              ) : (
                <Button data-testid="customers-add-new" size="md" onClick={() => setOpenCreate(true)} icon={<PlusIcon />}>
                  Add New
                </Button>
              )}
            </>
          }
        />

        <SectionCard className="border-slate-100 bg-white shadow-none" padding={false}>
          <div className="space-y-8 py-5 px-0">
            <div className="flex items-center justify-between gap-4">
              <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ListTab)}
            items={[
              { value: "customers", label: `${customerLabel}s`, count: activeCount },
              { value: "inactive", label: "Inactive", count: inactiveCount },
              { value: "groups", label: "Groups", count: groupsQuery.data?.length },
            ]}
                className="border-b-0"
              />
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-3 lg:max-w-[580px] lg:flex-row">
              {activeTab !== "groups" ? (
                <Select
                  data-testid="customers-search-scope"
                  aria-label="Search scope"
                  value={searchField}
                  onChange={(event) => setSearchField(event.target.value as SearchField)}
                  options={SEARCH_FIELD_OPTIONS}
                  fullWidth={false}
                  className="min-w-[88px]"
                />
              ) : null}
              <Input
                data-testid="customers-search-input"
                aria-label={activeTab === "groups" ? "Search groups" : `Search ${customerLabel.toLowerCase()}s`}
                value={search}
                onChange={handleSearchChange}
                placeholder={activeTab === "groups"
                  ? selectedGroup
                    ? `Search ${selectedGroup.groupName.toLowerCase()} members`
                    : "Search groups"
                  : getSearchPlaceholder(customerLabel, searchField)}
                icon={<SearchIcon />}
                fullWidth={false}
                className="!w-[300px] !min-w-[300px] !max-w-[300px]"
                containerClassName="!w-[300px] !min-w-[300px] !max-w-[300px] shrink-0"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                data-testid="customers-filter-trigger-single"
                variant={appliedAdvancedFilterCount > 0 ? "primary" : "outline"}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-2 font-semibold",
                  appliedAdvancedFilterCount > 0
                    ? ""
                    : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
                )}
                onClick={() => {
                  setDraftFilters(
                    advancedFilters.length > 0
                      ? advancedFilters
                      : buildDefaultCustomerSearchClauses(searchSchemaQuery.data)
                  );
                  setDrawerOpen(true);
                }}
                >
                  <FilterIcon />
                  <span>Filters</span>
                  {appliedAdvancedFilterCount > 0 ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
                      {appliedAdvancedFilterCount}
                    </span>
                  ) : null}
              </Button>
            </div>
          </div>

          {activeTab === "groups" ? (
            <div className="space-y-6">
              {(createGroup.error || updateGroup.error || changeGroupStatus.error || groupsQuery.error) && (
                <Alert variant="danger">
                  Unable to load or update groups right now.
                </Alert>
              )}

              {selectedGroup ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <button
                        type="button"
                        className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-link)]"
                        onClick={() => setSelectedGroup(null)}
                      >
                        Back to groups
                      </button>
                      <h3 className="mt-2 text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)]">{selectedGroup.groupName}</h3>
                      <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                        View and manage group members. {filteredGroupMembers.length} shown.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          changeGroupStatus.mutate({
                            groupId: selectedGroup.id,
                            status: selectedGroup.status === "DISABLE" ? "ENABLE" : "DISABLE",
                          })
                        }
                      >
                        {selectedGroup.status === "DISABLE" ? "Enable Group" : "Disable Group"}
                      </Button>
                      <Button size="sm" onClick={() => openEditGroupDialog(selectedGroup)}>
                        Edit Group
                      </Button>
                    </div>
                  </div>

                  <DataTable
                    data-testid="customers-group-members-table"
                    data={filteredGroupMembers}
                    columns={groupMemberColumns}
                    getRowId={(customer) => customer.id}
                    loading={groupMembersQuery.isLoading}
                    onRowClick={onSelectCustomer}
                    emptyState={
                      <EmptyState
                        title="No group members"
                        description="Add customers to this group from the customer detail page."
                      />
                    }
                  />
                </div>
              ) : (
                <DataTable
                  data-testid="customers-groups-table"
                  data={filteredGroupRows}
                  columns={groupColumns}
                  getRowId={(group) => group.id}
                  loading={groupsQuery.isLoading}
                  onRowClick={setSelectedGroup}
                  emptyState={
                    <EmptyState
                      title="No groups found"
                      description="Create your first group to start managing group memberships."
                    />
                  }
                />
              )}
            </div>
          ) : (
            <DataTable
              data-testid="customers-list-table"
              data={rows}
              columns={columns}
              getRowId={(customer) => customer.id}
              loading={customersQuery.isLoading}
              onRowClick={onSelectCustomer}
              selection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
              }}
              pagination={{
                page,
                pageSize,
                total,
                mode: "server",
                onChange: setPage,
                onPageSizeChange: handlePageSizeChange,
              }}
              emptyState={
                <EmptyState
                  title={`No ${customerLabel.toLowerCase()}s found`}
                  description="Try changing the filters or create a new record."
                />
              }
            />
          )}
          </div>
        </SectionCard>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <CustomerSearchFilterBuilder
                schema={searchSchemaQuery.data}
                value={draftFilters}
                onChange={setDraftFilters}
                appliedCount={appliedAdvancedFilterCount}
                appliedSummary={appliedAdvancedFilterSummary}
                onClearAll={() => {
                  const resetClauses = buildDefaultCustomerSearchClauses(searchSchemaQuery.data);
                  setDraftFilters(resetClauses);
                  setAdvancedFilters(resetClauses);
                setPage(1);
              }}
            />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const resetClauses = buildDefaultCustomerSearchClauses(searchSchemaQuery.data);
                setDraftFilters(resetClauses);
                setAdvancedFilters(resetClauses);
                setPage(1);
              }}
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
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>

      <CustomerFormDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        customerLabel={customerLabel}
      />

      <CustomerFormDialog
        open={Boolean(editingCustomer)}
        onClose={() => setEditingCustomer(null)}
        customerLabel={customerLabel}
        editingCustomer={editingCustomer}
      />

      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        title={`Export ${customerLabel.toLowerCase()}s`}
        description={`Send the ${customerLabel.toLowerCase()} export to an email address.`}
        size="md"
      >
        <div className="space-y-4" data-testid="customers-export-dialog">
          {exportCustomersMutation.error && (
            <Alert variant="danger">
              Unable to start the export right now.
            </Alert>
          )}
          <Input
            data-testid="customers-export-email"
            label="Email"
            type="email"
            value={exportEmail}
            onChange={(event) => setExportEmail(event.target.value)}
            placeholder="name@example.com"
          />
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            The export will be generated by the backend and sent to this address.
          </p>
        </div>
        <DialogFooter>
          <Button data-testid="customers-export-cancel" variant="secondary" onClick={() => setExportDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="customers-export-submit"
            onClick={handleExport}
            loading={exportCustomersMutation.isPending}
            disabled={!exportEmail.trim()}
          >
            Send Export
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        title={editingGroup ? "Edit Group" : "Create Group"}
        description="Manage group name, description, and member ID generation."
        size="md"
      >
        <div className="space-y-4" data-testid="customers-group-dialog">
          <Input
            data-testid="customers-group-name"
            label="Group Name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
          <Input
            data-testid="customers-group-description"
            label="Description"
            value={groupDescription}
            onChange={(event) => setGroupDescription(event.target.value)}
          />
          <Switch
            label="Generate group member IDs"
            checked={generateGrpMemId}
            onChange={setGenerateGrpMemId}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setGroupDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="customers-group-save"
            onClick={handleSaveGroup}
            loading={createGroup.isPending || updateGroup.isPending}
            disabled={!groupName.trim()}
          >
            {editingGroup ? "Save Group" : "Create Group"}
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={Boolean(statusChangeCustomer)}
        onClose={() => setStatusChangeCustomer(null)}
        onConfirm={async () => {
          if (!statusChangeCustomer) {
            return;
          }

          await customerStatusMutation.mutateAsync(
            statusChangeCustomer.status === "INACTIVE" ? "ACTIVE" : "INACTIVE"
          );
          setStatusChangeCustomer(null);
        }}
        title={`${statusChangeCustomer?.status === "INACTIVE" ? "Activate" : "Deactivate"} ${customerLabel.toLowerCase()}`}
        description={statusChangeCustomer
          ? `This will mark ${formatCustomerName(statusChangeCustomer)} as ${(statusChangeCustomer.status === "INACTIVE" ? "active" : "inactive")}.`
          : undefined}
        confirmLabel={statusChangeCustomer?.status === "INACTIVE" ? "Activate" : "Deactivate"}
        confirmVariant={statusChangeCustomer?.status === "INACTIVE" ? "primary" : "danger"}
        loading={customerStatusMutation.isPending}
      />

      <Dialog
        open={Boolean(messageCustomer)}
        onClose={() => setMessageCustomer(null)}
        title="Send Message"
        description={messageCustomer ? `Choose a message channel for ${formatCustomerName(messageCustomer)}.` : undefined}
        size="sm"
      >
        <div className="space-y-3" data-testid="customers-message-dialog">
          {messageCustomer?.email ? (
            <MenuActionButton
              testId="customers-message-email"
              label="Email"
              onClick={() => {
                navigateToExternal(`mailto:${messageCustomer.email}?subject=${encodeURIComponent(formatCustomerName(messageCustomer))}`);
                setMessageCustomer(null);
              }}
            />
          ) : null}
          {messageCustomer?.whatsappNumber || messageCustomer?.phoneNo ? (
            <MenuActionButton
              testId="customers-message-whatsapp"
              label="WhatsApp"
              onClick={() => {
                const whatsappNumber = `${messageCustomer.countryCode ?? ""}${messageCustomer.whatsappNumber ?? messageCustomer.phoneNo ?? ""}`
                  .replace(/\s+/g, "")
                  .replace(/^\+/, "");
                navigateToExternal(`https://wa.me/${whatsappNumber}`);
                setMessageCustomer(null);
              }}
            />
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setMessageCustomer(null)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

    </>
  );
}

function MenuActionButton({
  label,
  onClick,
  testId,
  className,
}: {
  label: string;
  onClick: () => void;
  testId: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={cn(
        "flex w-full items-center rounded-md px-3 py-2 text-left text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)]",
        className
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

function formatCustomerName(customer: Customer) {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  return name || "Unknown Customer";
}

function getSearchPlaceholder(customerLabel: string, searchField: SearchField) {
  switch (searchField) {
    case "name":
      return `Enter ${customerLabel.toLowerCase()} name`;
    case "phone":
      return "Enter phone number";
    case "id":
      return `Enter ${customerLabel.toLowerCase()} ID`;
    default:
      return "Enter name or phone or id";
  }
}

function formatAppliedFilterSummary(
  clauses: CustomerSearchFilterClause[],
  schema: CustomerFilters["searchSchema"]
) {
  const appliedClauses = compactCustomerSearchClauses(clauses, schema);

  if (appliedClauses.length === 0) {
    return "";
  }

  const parts = appliedClauses.slice(0, 2).map((clause) => {
    const field = schema?.fields.find((item) => item.key === clause.field);
    const label = field?.label ?? clause.field;
    const values = clause.values.filter(Boolean).join(" - ");
    const operator = clause.operator === "EQ" ? "" : `${formatAppliedOperatorLabel(clause.operator)} `;
    return `${label}: ${operator}${values}`.trim();
  });

  if (appliedClauses.length > 2) {
    parts.push(`+${appliedClauses.length - 2} more`);
  }

  return parts.join(", ");
}

function formatAppliedOperatorLabel(operator: string) {
  return operator
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stopRowAction(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function navigateToPath(
  navigate: (href: string) => void,
  path: string,
  params: Record<string, string>
) {
  const [pathWithoutHash, hash = ""] = path.split("#", 2);
  const [pathname, query = ""] = pathWithoutHash.split("?", 2);
  const searchParams = new URLSearchParams(query);

  Object.entries(params).forEach(([key, value]) => searchParams.set(key, value));

  const nextQuery = searchParams.toString();
  navigate(`${pathname}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`);
}

function navigateToExternal(href: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.assign(href);
}

function getModuleRoot(basePath: string, product: string) {
  if (basePath.endsWith("/customers")) {
    return basePath.slice(0, -"/customers".length);
  }

  if (basePath.endsWith("/patients")) {
    return basePath.slice(0, -"/patients".length);
  }

  return `/${product}`;
}

function getCanonicalCustomerRouteBasePath(basePath: string, product: string) {
  return `${getModuleRoot(basePath, product)}/customers`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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

function ExportIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 3v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 13.5v1.75c0 .69.56 1.25 1.25 1.25h9.5c.69 0 1.25-.56 1.25-1.25V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M4 14.75V16h1.25l7.37-7.37-1.25-1.25L4 14.75Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10.9 5.1 12.15 3.85a1.06 1.06 0 0 1 1.5 0l1.5 1.5a1.06 1.06 0 0 1 0 1.5L13.9 8.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <circle cx="5" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="15" cy="10" r="1.5" />
    </svg>
  );
}
