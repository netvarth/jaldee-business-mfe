import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  DataTableToolbar,
  Dialog,
  DialogFooter,
  EmptyState,
  Input,
  PageHeader,
  Popover,
  PopoverSection,
  SectionCard,
  Switch,
  Textarea,
  Tabs,
} from "@jaldee/design-system";
import type { ColumnDef, TabItem } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useCreateMemberGroup,
  useChangeMemberGroupStatus,
  useChangeMemberStatus,
  useMemberCount,
  useMemberGroup,
  useMemberGroupCount,
  useMembers,
} from "../queries/memberships";

type ListTab = "members" | "groups";

type MemberRow = {
  uid: string;
  id: string;
  name: string;
  memberSince: string;
  contact: string;
  status: string;
};

type GroupRow = {
  uid: string;
  id: string;
  name: string;
  memberCount: number;
  status: string;
};

function unwrapPayload<T>(value: T): any {
  const maybeWrapped = value as any;

  if (maybeWrapped?.data?.data !== undefined) {
    return maybeWrapped.data.data;
  }

  if (maybeWrapped?.data !== undefined) {
    return maybeWrapped.data;
  }

  return maybeWrapped;
}

function unwrapList(value: unknown): any[] {
  const payload = unwrapPayload(value);
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
}

function unwrapCount(value: unknown) {
  return Number(unwrapPayload(value)) || 0;
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getMemberName(member: any, index: number) {
  const fullName = [
    member.salutation,
    member.firstName,
    member.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || member.memberName || `Member ${index + 1}`;
}

function getMemberStatusLabel(status: string) {
  const normalized = String(status ?? "").trim().toUpperCase();

  if (normalized === "ACTIVE" || normalized === "ENABLED") return "Active";
  if (normalized === "INACTIVE" || normalized === "DISABLED") return "Inactive";
  if (normalized === "PENDING") return "Pending";

  return status || "Unknown";
}

function getMemberStatusVariant(status: string): "success" | "danger" | "warning" | "neutral" {
  const normalized = getMemberStatusLabel(status).toLowerCase();

  if (normalized === "active") return "success";
  if (normalized === "inactive") return "danger";
  if (normalized === "pending") return "warning";

  return "neutral";
}

function getMemberStatusOptions(status: string) {
  const current = getMemberStatusLabel(status);

  if (current === "Active") {
    return [{ value: "Inactive", label: "Inactive" }];
  }

  if (current === "Pending") {
    return [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ];
  }

  return [{ value: "Active", label: "Active" }];
}

function getGroupStatusLabel(status: string) {
  return String(status ?? "").toUpperCase() === "ENABLE" ? "Active" : "Inactive";
}

function toMemberRows(data: unknown): MemberRow[] {
  return unwrapList(data).map((member: any, index: number) => {
    const phone = [member.countryCode, member.phoneNo].filter(Boolean).join("");
    const email = member.email ? String(member.email) : "";

    return {
      uid: String(member.uid ?? member.id ?? index),
      id: String(member.id ?? member.uid ?? index),
      name: getMemberName(member, index),
      memberSince: formatDate(member.createdDate ?? member.dateOfJoining ?? member.createdAt),
      contact: [phone, email].filter(Boolean).join(" | ") || "-",
      status: String(member.memberStatus ?? member.status ?? "Pending"),
    };
  });
}

function toGroupRows(data: unknown): GroupRow[] {
  return unwrapList(data).map((group: any, index: number) => ({
    uid: String(group.uid ?? group.id ?? index),
    id: String(group.id ?? group.uid ?? index),
    name: String(group.groupName ?? `Group ${index + 1}`),
    memberCount: Number(group.memberCount) || 0,
    status: String(group.status ?? "DISABLE"),
  }));
}

export function MembersList() {
  const { basePath, routeParams } = useSharedModulesContext();
  const [activeTab, setActiveTab] = useState<ListTab>(
    routeParams?.tab === "groups" ? "groups" : "members"
  );
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [appliedMemberSearchQuery, setAppliedMemberSearchQuery] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");
  const [membersPage, setMembersPage] = useState(1);
  const [membersPageSize, setMembersPageSize] = useState(10);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsPageSize, setGroupsPageSize] = useState(10);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [showAddMemberHint, setShowAddMemberHint] = useState(false);
  const [createdGroupUid, setCreatedGroupUid] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [generateGroupMemberId, setGenerateGroupMemberId] = useState(false);
  const [groupDialogError, setGroupDialogError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedMemberSearchQuery(memberSearchQuery.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [memberSearchQuery]);

  useEffect(() => {
    setMembersPage(1);
  }, [appliedMemberSearchQuery, memberStatusFilter, membersPageSize]);

  useEffect(() => {
    setGroupsPage(1);
  }, [groupsPageSize]);

  const memberFilters = {
    ...(appliedMemberSearchQuery ? { "firstName-like": appliedMemberSearchQuery } : {}),
    ...(memberStatusFilter !== "all" ? { status: memberStatusFilter } : {}),
  };

  const membersQuery = useMembers({
    ...memberFilters,
    from: (membersPage - 1) * membersPageSize,
    count: membersPageSize,
  });
  const memberCountQuery = useMemberCount(memberFilters);
  const groupsQuery = useMemberGroup();
  const groupCountQuery = useMemberGroupCount();
  const createMemberGroupMutation = useCreateMemberGroup();
  const changeMemberStatusMutation = useChangeMemberStatus();
  const changeMemberGroupStatusMutation = useChangeMemberGroupStatus();

  const memberRows = useMemo(() => toMemberRows(membersQuery.data), [membersQuery.data]);
  const groupRows = useMemo(() => toGroupRows(groupsQuery.data), [groupsQuery.data]);
  const totalMembers = unwrapCount(memberCountQuery.data);
  const totalGroups = unwrapCount(groupCountQuery.data) || groupRows.length;

  const visibleGroupRows = useMemo(() => {
    const start = (groupsPage - 1) * groupsPageSize;
    return groupRows.slice(start, start + groupsPageSize);
  }, [groupRows, groupsPage, groupsPageSize]);

  const tabItems: TabItem[] = [
    { value: "members", label: "Members", count: totalMembers },
    { value: "groups", label: "Groups", count: totalGroups },
  ];

  function resetGroupDialogState(closeDialog = false) {
    setGroupName("");
    setGroupDescription("");
    setGenerateGroupMemberId(false);
    setGroupDialogError(null);
    setShowAddMemberHint(false);
    setCreatedGroupUid(null);
    if (closeDialog) {
      setGroupDialogOpen(false);
    }
  }

  async function handleCreateGroup() {
    const trimmedGroupName = groupName.trim();

    if (!trimmedGroupName) {
      setGroupDialogError("Please enter the group name.");
      return;
    }

    try {
      setGroupDialogError(null);
      const result = await createMemberGroupMutation.mutateAsync({
        groupName: trimmedGroupName,
        description: groupDescription.trim() || undefined,
        generateGrpMemId: generateGroupMemberId,
      });

      setCreatedGroupUid(String(unwrapPayload(result)));
      setShowAddMemberHint(true);
      setActiveTab("groups");
    } catch (error: any) {
      setGroupDialogError(
        typeof error?.message === "string" ? error.message : "Unable to create group right now."
      );
    }
  }

  const memberColumns: ColumnDef<MemberRow>[] = [
    {
      key: "name",
      header: "Name & ID",
      width: "28%",
      render: (member) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-900">{member.name}</div>
          <div className="text-xs text-slate-500">{member.id}</div>
        </div>
      ),
    },
    {
      key: "memberSince",
      header: "Member Since",
      width: "18%",
      render: (member) => member.memberSince,
    },
    {
      key: "contact",
      header: "Contact Details",
      width: "26%",
      render: (member) => (
        <span className="text-sm text-slate-600">{member.contact}</span>
      ),
    },
    {
      key: "status",
      header: "Membership Status",
      width: "16%",
      render: (member) => {
        const label = getMemberStatusLabel(member.status);
        const options = getMemberStatusOptions(member.status);

        return (
          <select
            aria-label={`Change status for ${member.name}`}
            value=""
            disabled={changeMemberStatusMutation.isPending}
            className={
              `rounded-md border px-3 py-2 text-sm font-medium outline-none ${
                label === "Active"
                  ? "border-emerald-500 text-emerald-700"
                  : label === "Inactive"
                    ? "border-rose-500 text-rose-600"
                    : "border-amber-400 text-amber-700"
              }`
            }
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const nextStatus = event.target.value;

              if (!nextStatus || nextStatus === label) return;

              changeMemberStatusMutation.mutate({
                uid: member.uid,
                statusId: nextStatus,
              });
            }}
          >
            <option value="" disabled>{label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: "12%",
      align: "right",
      render: (member) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              window.location.assign(`${basePath}/members/update/${member.uid}`);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              window.location.assign(`${basePath}/members/memberdetails/${member.uid}`);
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const groupColumns: ColumnDef<GroupRow>[] = [
    {
      key: "name",
      header: "Group Name",
      width: "34%",
      render: (group) => <span className="font-semibold text-slate-900">{group.name}</span>,
    },
    {
      key: "memberCount",
      header: "Total Members",
      width: "18%",
      align: "center",
      render: (group) => group.memberCount,
    },
    {
      key: "status",
      header: "Status",
      width: "20%",
      render: (group) => (
        <div className="flex items-center gap-2">
          <Badge variant={group.status === "ENABLE" ? "success" : "danger"}>
            {getGroupStatusLabel(group.status)}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            disabled={changeMemberGroupStatusMutation.isPending}
            onClick={(event) => {
              event.stopPropagation();
              changeMemberGroupStatusMutation.mutate({
                groupId: group.uid,
                statusId: group.status === "ENABLE" ? "DISABLE" : "ENABLE",
              });
            }}
          >
            Toggle
          </Button>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "28%",
      align: "right",
      render: (group) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              window.location.assign(`${basePath}/members/groupdetails/${group.uid}`);
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        subtitle="Manage members and groups, review statuses, and open individual detail views."
        actions={(
          <Popover
            align="end"
            trigger={(
              <Button>
                Create
              </Button>
            )}
          >
            <PopoverSection className="min-w-[220px]">
              <Button
                fullWidth
                variant="outline"
                onClick={() => window.location.assign(`${basePath}/members/create`)}
              >
                Create Member
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => {
                  setGroupDialogOpen(true);
                  setGroupDialogError(null);
                }}
              >
                Create Group
              </Button>
            </PopoverSection>
          </Popover>
        )}
      />

      <SectionCard padding={false} className="border-slate-200 shadow-sm">
        <div className="border-b border-slate-200 px-6 pt-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ListTab)}
            items={tabItems}
          />
        </div>

        <div className="p-6">
          {activeTab === "members" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <DataTableToolbar
                    query={memberSearchQuery}
                    onQueryChange={setMemberSearchQuery}
                    searchPlaceholder="Search members by first name..."
                    recordCount={totalMembers}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="member-status-filter" className="text-sm text-slate-500">
                    Status
                  </label>
                  <select
                    id="member-status-filter"
                    value={memberStatusFilter}
                    onChange={(event) => setMemberStatusFilter(event.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="all">All</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <DataTable
                data={memberRows}
                columns={memberColumns}
                getRowId={(row) => row.uid}
                loading={membersQuery.isLoading || memberCountQuery.isLoading}
                onRowClick={(member) => window.location.assign(`${basePath}/members/memberdetails/${member.uid}`)}
                pagination={{
                  page: membersPage,
                  pageSize: membersPageSize,
                  total: totalMembers,
                  onChange: setMembersPage,
                  onPageSizeChange: setMembersPageSize,
                  mode: "server",
                }}
                emptyState={(
                  <EmptyState
                    title="No members found"
                    description="Create members or adjust the current search and status filters."
                  />
                )}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="m-0 text-lg font-semibold text-slate-900">Groups</h2>
                  <p className="m-0 mt-1 text-sm text-slate-500">
                    Review group membership counts and open each group detail view.
                  </p>
                </div>
                <span className="text-sm text-slate-500">{totalGroups} groups</span>
              </div>

              <DataTable
                data={visibleGroupRows}
                columns={groupColumns}
                getRowId={(row) => row.uid}
                loading={groupsQuery.isLoading || groupCountQuery.isLoading}
                onRowClick={(group) => window.location.assign(`${basePath}/members/groupdetails/${group.uid}`)}
                pagination={{
                  page: groupsPage,
                  pageSize: groupsPageSize,
                  total: totalGroups,
                  onChange: setGroupsPage,
                  onPageSizeChange: setGroupsPageSize,
                  mode: "client",
                }}
                emptyState={(
                  <EmptyState
                    title="No groups found"
                    description="Groups will appear here once member groups have been created."
                  />
                )}
              />
            </div>
          )}
        </div>
      </SectionCard>

      <Dialog
        open={groupDialogOpen}
        onClose={() => resetGroupDialogState(true)}
        title="Create Group"
        description={showAddMemberHint
          ? "Would you like to add members to this group?"
          : "Manage group name, description, and member ID generation."}
        size="md"
      >
        {!showAddMemberHint ? (
          <div className="space-y-4" data-testid="membership-group-dialog">
            {groupDialogError ? (
              <Alert variant="danger">
                {groupDialogError}
              </Alert>
            ) : null}

            <Input
              data-testid="membership-group-name"
              label="Group Name"
              value={groupName}
              onChange={(event) => {
                setGroupName(event.target.value);
                setGroupDialogError(null);
              }}
              required
            />
            <Textarea
              data-testid="membership-group-description"
              label="Description"
              value={groupDescription}
              onChange={(event) => {
                setGroupDescription(event.target.value);
                setGroupDialogError(null);
              }}
              rows={3}
            />
            <Switch
              label="Generate Group Member Id"
              checked={generateGroupMemberId}
              onChange={(checked) => {
                setGenerateGroupMemberId(checked);
                setGroupDialogError(null);
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="m-0 text-sm text-slate-600">
              The group was created successfully. Continue to the group detail page to add members now, or close and do it later.
            </p>
          </div>
        )}
        <DialogFooter>
          {!showAddMemberHint ? (
            <>
              <Button variant="secondary" onClick={() => resetGroupDialogState(true)}>
                Cancel
              </Button>
              <Button
                data-testid="membership-group-save"
                onClick={handleCreateGroup}
                loading={createMemberGroupMutation.isPending}
                disabled={!groupName.trim()}
              >
                Create
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  resetGroupDialogState(true);
                  setActiveTab("groups");
                }}
              >
                Not Now
              </Button>
              <Button
                onClick={() => {
                  if (createdGroupUid) {
                    window.location.assign(`${basePath}/members/groupdetails/${createdGroupUid}`);
                  }
                }}
              >
                Add Now
              </Button>
            </>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}
