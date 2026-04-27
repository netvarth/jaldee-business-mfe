import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Alert, Avatar, Badge, Button, Checkbox, ConfirmDialog, DataTable, Dialog, DialogFooter, EmptyState, Input, Popover, PopoverSection, Select, Switch, Tabs, cn } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { resolveCustomerLabel } from "../../labels";
import { useUrlPagination } from "../../useUrlPagination";
import {
  useChangeCustomerStatus,
  useChangeCustomerGroupStatus,
  useAddCustomerLabels,
  useCreateCustomerGroup,
  useCustomerGroupMembers,
  useCustomerGroups,
  useCustomerLabels,
  useCustomersCount,
  useCustomersList,
  useExportCustomers,
  useRemoveCustomerLabels,
  useRemoveSpecificCustomerFromGroup,
  useUpdateCustomerGroup,
} from "../queries/customers";
import type { Customer, CustomerFilters, CustomerGroup } from "../types";
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
  const customerLabel = resolveCustomerLabel(account.labels, product);
  const [activeTab, setActiveTab] = useState<ListTab>("customers");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [search, setSearch] = useState("");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "customersList",
    resetDeps: [activeTab, search],
  });
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
  const [labelsCustomer, setLabelsCustomer] = useState<Customer | null>(null);
  const [labelSelection, setLabelSelection] = useState<Record<string, boolean>>({});
  const exportCustomersMutation = useExportCustomers();
  const customerStatusMutation = useChangeCustomerStatus(statusChangeCustomer?.id ?? null);
  const labelsQuery = useCustomerLabels();
  const addLabelsMutation = useAddCustomerLabels(labelsCustomer?.id ?? null);
  const removeLabelsMutation = useRemoveCustomerLabels(labelsCustomer?.id ?? null);
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
      return apiScope === "global" ? undefined : "ACTIVE";
    }

    return "__GROUPS__";
  }, [activeTab, apiScope]);

  const filters = useMemo<CustomerFilters>(
    () => ({
      search,
      status: status === "__GROUPS__" ? undefined : status,
      page,
      pageSize,
    }),
    [page, pageSize, search, status]
  );

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

  const customersQuery = useCustomersList(filters);
  const countQuery = useCustomersCount(filters);
  const activeCountQuery = useCustomersCount(activeCountFilters);
  const inactiveCountQuery = useCustomersCount(inactiveCountFilters);

  const rows = activeTab === "groups" ? [] : (customersQuery.data ?? []);
  const total = activeTab === "groups" ? 0 : (countQuery.data ?? rows.length);
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

  useEffect(() => {
    if (!labelsCustomer) {
      setLabelSelection({});
      return;
    }

    const initialSelection = Object.entries(labelsCustomer.labels ?? {}).reduce<Record<string, boolean>>(
      (acc, [key, value]) => {
        acc[key] = value === true || value === "true";
        return acc;
      },
      {}
    );

    setLabelSelection(initialSelection);
  }, [labelsCustomer]);

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
        headerClassName: "px-6 py-4 text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.04em]",
        className: "px-6 py-6",
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
        headerClassName: "px-6 py-4 text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.04em]",
        className: "px-6 py-6",
        render: (customer) => customer.phoneNo ? `${customer.countryCode ?? ""} ${customer.phoneNo}`.trim() : "-",
      },
      {
        key: "labels",
        header: "Labels",
        width: "12%",
        headerClassName: "px-6 py-4 text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.04em]",
        className: "px-6 py-6 text-[var(--color-text-secondary)]",
        render: () => "-",
      },
      {
        key: "visitCount",
        header: "Visits",
        width: "10%",
        headerClassName: "px-6 py-4 text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.04em]",
        className: "px-6 py-6",
        render: (customer) => String(customer.visitCount ?? 0),
      },
      {
        key: "actions",
        header: "Actions",
        width: "18%",
        headerClassName: "px-6 py-4 text-[length:var(--text-xs)] font-semibold uppercase tracking-[0.04em]",
        className: "px-6 py-6",
        render: (customer) => {
          const name = formatCustomerName(customer);
          const isInactive = customer.status === "INACTIVE";
          const hasAnyMessageTarget = Boolean(customer.email || customer.whatsappNumber || customer.phoneNo);
          const enabledLabels = (labelsQuery.data ?? []).filter((label) => label.status === "ENABLED");
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
                    navigateToPath("/bookings/appointments", {
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
                    navigateToPath("/bookings/queue", {
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
                navigateToPath("/golderp/sales/new", {
                  source: "customers",
                  customerId: customer.id,
                  p_source: basePath,
                }),
            },
            {
              key: "invoice",
              label: "Create Invoice",
              onClick: () =>
                navigateToPath("/finance/invoices", {
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
                    navigateToPath(`${getCanonicalCustomerRouteBasePath(basePath, product)}/${customer.id}/new-case`, {
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
                    navigateToPath(`${getModuleRoot(basePath, product)}/settings`, {
                      view: "comm-reminder",
                      customerId: customer.id,
                      source: "customers",
                    }),
                }
              : null,
            enabledLabels.length > 0
              ? {
                  key: "labels",
                  label: "Labels",
                  onClick: () => setLabelsCustomer(customer),
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
      <div className="space-y-6 px-2 pb-4 xl:px-4" data-testid="customers-list-page">
        <header className="border-b border-[color:color-mix(in_srgb,var(--color-border)_82%,white)] pb-4">
          <h1 className="text-[length:var(--text-2xl)] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {customerLabel}s
          </h1>
        </header>

        <section className="overflow-hidden rounded-[22px] border border-[color:color-mix(in_srgb,var(--color-border)_82%,white)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 border-b border-[color:color-mix(in_srgb,var(--color-border)_76%,white)] px-8 py-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)]">{customerLabel} List</h2>
              <p className="mt-1 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                Add / View your {customerLabel.toLowerCase()}s and groups
              </p>
            </div>

            <div className="flex items-center gap-3 self-start">
              <Button
                data-testid="customers-export-trigger"
                variant="outline"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                disabled={activeTab === "groups"}
                icon={<ExportIcon />}
              >
                Export
              </Button>
              {activeTab === "groups" ? (
                <Button data-testid="customers-add-group" size="sm" onClick={openCreateGroupDialog} icon={<PlusIcon />}>
                  Add Group
                </Button>
              ) : (
                <Button data-testid="customers-add-new" size="sm" onClick={() => setOpenCreate(true)} icon={<PlusIcon />}>
                  Add New
                </Button>
              )}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ListTab)}
            items={[
              { value: "customers", label: `${customerLabel}s`, count: activeCountQuery.data },
              { value: "inactive", label: "Inactive", count: inactiveCountQuery.data },
              { value: "groups", label: "Groups", count: groupsQuery.data?.length },
            ]}
            className="px-8 pt-3"
          />

          <div className="flex flex-col gap-4 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
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

            <button
              type="button"
              aria-label="Additional filters"
              data-testid="customers-filter-trigger"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent",
                "text-[var(--color-primary)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)]",
              )}
            >
              <FilterIcon />
            </button>
          </div>

          {activeTab === "groups" ? (
            <div className="space-y-6 px-6 pb-6">
              {(createGroup.error || updateGroup.error || changeGroupStatus.error || groupsQuery.error) && (
                <Alert variant="danger">
                  Unable to load or update groups right now.
                </Alert>
              )}

              {selectedGroup ? (
                <div className="space-y-4 rounded-[18px] border border-[color:color-mix(in_srgb,var(--color-border)_76%,white)] p-5">
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
                    className="overflow-hidden rounded-[18px] border-[color:color-mix(in_srgb,var(--color-border)_76%,white)] shadow-none"
                    tableClassName="min-w-[980px]"
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
                  className="overflow-hidden rounded-[18px] border-[color:color-mix(in_srgb,var(--color-border)_76%,white)] shadow-none"
                  tableClassName="min-w-[980px]"
                />
              )}
            </div>
          ) : (
            <div className="px-6 pb-6">
              <DataTable
                data-testid="customers-list-table"
                data={rows}
                columns={columns}
                getRowId={(customer) => customer.id}
                loading={customersQuery.isLoading}
                onRowClick={onSelectCustomer}
                rowClassName={() => "min-h-[84px]"}
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
                  onPageSizeChange: setPageSize,
                }}
                emptyState={
                  <EmptyState
                    title={`No ${customerLabel.toLowerCase()}s found`}
                    description="Try changing the filters or create a new record."
                  />
                }
                className="overflow-hidden rounded-[18px] border-[color:color-mix(in_srgb,var(--color-border)_76%,white)] shadow-none"
                tableClassName="min-w-[1080px]"
              />
            </div>
          )}
        </section>
      </div>

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

      <Dialog
        open={Boolean(labelsCustomer)}
        onClose={() => setLabelsCustomer(null)}
        title="Labels"
        description={labelsCustomer ? `Update labels for ${formatCustomerName(labelsCustomer)}.` : undefined}
        size="md"
      >
        <div className="space-y-4" data-testid="customers-labels-dialog">
          {(addLabelsMutation.error || removeLabelsMutation.error) ? (
            <Alert variant="danger">Unable to update labels right now.</Alert>
          ) : null}
          {labelsQuery.isLoading ? (
            <div className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">Loading labels...</div>
          ) : (labelsQuery.data ?? []).filter((label) => label.status === "ENABLED").length === 0 ? (
            <EmptyState title="No labels available" description="Create labels in settings before applying them here." />
          ) : (
            <div className="grid gap-3">
              {(labelsQuery.data ?? [])
                .filter((label) => label.status === "ENABLED")
                .map((label) => (
                  <Checkbox
                    key={label.id}
                    data-testid={`customers-label-option-${label.label}`}
                    checked={labelSelection[label.label] ?? false}
                    onChange={(event) =>
                      setLabelSelection((current) => ({
                        ...current,
                        [label.label]: event.target.checked,
                      }))
                    }
                    label={label.displayName}
                    description={label.label}
                  />
                ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setLabelsCustomer(null)}>
            Cancel
          </Button>
          <Button
            data-testid="customers-labels-apply"
            onClick={async () => {
              if (!labelsCustomer) {
                return;
              }

              const activeLabels = Object.entries(labelsCustomer.labels ?? {})
                .filter(([, value]) => value === true || value === "true")
                .map(([key]) => key);
              const nextLabels = Object.entries(labelSelection)
                .filter(([, checked]) => checked)
                .map(([key]) => key);
              const labelsToAdd = nextLabels.filter((label) => !activeLabels.includes(label));
              const labelsToRemove = activeLabels.filter((label) => !nextLabels.includes(label));

              if (labelsToRemove.length) {
                await removeLabelsMutation.mutateAsync(labelsToRemove);
              }

              if (labelsToAdd.length) {
                await addLabelsMutation.mutateAsync(labelsToAdd);
              }

              setLabelsCustomer(null);
            }}
            loading={addLabelsMutation.isPending || removeLabelsMutation.isPending}
          >
            Apply
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

function stopRowAction(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function navigateToPath(path: string, params: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.origin + path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  window.location.assign(url.pathname + url.search);
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
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M3 4.75C3 4.336 3.336 4 3.75 4h12.5a.75.75 0 0 1 .58 1.225L12 11.125V15.5a.75.75 0 0 1-.4.663l-2 1A.75.75 0 0 1 8.5 16.5v-5.375L3.17 5.225A.75.75 0 0 1 3 4.75Z" />
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
