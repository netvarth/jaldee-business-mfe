import { useMemo, useState } from "react";
import { Alert, Badge, Button, ConfirmDialog, Dialog, DialogFooter, EmptyState, Input, SectionCard, Switch } from "@jaldee/design-system";
import {
  useAddCustomerToGroup,
  useChangeCustomerGroupStatus,
  useCreateCustomerGroup,
  useCustomerGroups,
  useCustomerMemberships,
  useRemoveCustomerFromGroup,
  useUpsertCustomerGroupMemberId,
  useUpdateCustomerGroup,
} from "../queries/customers";
import type { CustomerGroup } from "../types";

interface CustomerGroupsCardProps {
  customerId: string;
  customerLabel: string;
}

export function CustomerGroupsCard({ customerId, customerLabel }: CustomerGroupsCardProps) {
  const groupsQuery = useCustomerGroups();
  const membershipsQuery = useCustomerMemberships(customerId);
  const addCustomerToGroup = useAddCustomerToGroup(customerId);
  const removeCustomerFromGroup = useRemoveCustomerFromGroup(customerId);
  const createGroup = useCreateCustomerGroup();
  const updateGroup = useUpdateCustomerGroup();
  const changeGroupStatus = useChangeCustomerGroupStatus();
  const upsertMemberId = useUpsertCustomerGroupMemberId(customerId);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [generateGrpMemId, setGenerateGrpMemId] = useState(false);
  const [removalTarget, setRemovalTarget] = useState<CustomerGroup | null>(null);
  const [memberIdDrafts, setMemberIdDrafts] = useState<Record<string, string>>({});

  const memberGroups = membershipsQuery.data ?? [];
  const availableGroups = useMemo(
    () =>
      (groupsQuery.data ?? []).filter(
        (group) => !memberGroups.some((memberGroup) => memberGroup.id === group.id) && group.status !== "DISABLE"
      ),
    [groupsQuery.data, memberGroups]
  );

  function getMemberIdDraft(group: CustomerGroup) {
    return memberIdDrafts[group.id] ?? group.memberId ?? "";
  }

  function setMemberIdDraft(groupId: string, value: string) {
    setMemberIdDrafts((current) => ({ ...current, [groupId]: value }));
  }

  function openCreateDialog() {
    setEditingGroup(null);
    setGroupName("");
    setGroupDescription("");
    setGenerateGrpMemId(false);
    setGroupDialogOpen(true);
  }

  function openEditDialog(group: CustomerGroup) {
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
      <SectionCard
        title="Groups"
        actions={
          <Button data-testid="customer-groups-create" size="sm" onClick={openCreateDialog}>
            Create Group
          </Button>
        }
      >
        <div className="space-y-4" data-testid="customer-groups-card">
          {(addCustomerToGroup.error ||
            removeCustomerFromGroup.error ||
            createGroup.error ||
            updateGroup.error ||
            changeGroupStatus.error ||
            upsertMemberId.error) && (
            <Alert variant="danger">
              Unable to update customer groups right now.
            </Alert>
          )}

          {membershipsQuery.isLoading ? (
            <div className="text-sm text-[var(--color-text-secondary)]">Loading groups...</div>
          ) : memberGroups.length === 0 ? (
            <EmptyState
              title="No group memberships"
              description={`This ${customerLabel.toLowerCase()} is not part of any group yet.`}
            />
          ) : (
            <div className="space-y-3">
              {memberGroups.map((group) => (
                <div
                  key={group.id}
                  data-testid={`customer-group-${group.id}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_22%,white)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{group.groupName}</span>
                        <Badge variant={group.status === "DISABLE" ? "warning" : "success"}>
                          {group.status || "ENABLE"}
                        </Badge>
                      </div>
                      {group.description && (
                        <p className="text-sm text-[var(--color-text-secondary)]">{group.description}</p>
                      )}
                      {group.memberId && (
                        <p className="text-xs text-[var(--color-text-secondary)]">Member ID: {group.memberId}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button data-testid={`customer-group-edit-${group.id}`} variant="outline" size="sm" onClick={() => openEditDialog(group)}>
                        Edit
                      </Button>
                      <Button
                        data-testid={`customer-group-status-${group.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          changeGroupStatus.mutate(group.status === "DISABLE"
                            ? { groupId: group.id, status: "ENABLE" }
                            : { groupId: group.id, status: "DISABLE" })
                        }
                      >
                        {group.status === "DISABLE" ? "Enable" : "Disable"}
                      </Button>
                      <Button data-testid={`customer-group-remove-${group.id}`} variant="outline" size="sm" onClick={() => setRemovalTarget(group)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  {group.generateGrpMemId && (
                    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 lg:flex-row lg:items-end">
                      <Input
                        data-testid={`customer-group-member-id-${group.id}`}
                        label="Group Member ID"
                        value={getMemberIdDraft(group)}
                        onChange={(event) => setMemberIdDraft(group.id, event.target.value)}
                        placeholder="Enter member ID"
                        fullWidth={false}
                        className="lg:min-w-[260px]"
                      />
                      <Button
                        data-testid={`customer-group-member-id-save-${group.id}`}
                        size="sm"
                        onClick={() =>
                          upsertMemberId.mutate({
                            groupName: group.groupName,
                            memberId: getMemberIdDraft(group).trim(),
                            existing: group.memberId,
                          })
                        }
                        loading={upsertMemberId.isPending}
                        disabled={!getMemberIdDraft(group).trim()}
                      >
                        {group.memberId ? "Update Member ID" : "Save Member ID"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Available Groups</h4>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Add this {customerLabel.toLowerCase()} to an existing active group.
              </p>
            </div>
            {!availableGroups.length ? (
              <span className="text-sm text-[var(--color-text-secondary)]">No additional active groups available.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableGroups.map((group) => (
                  <Button
                    key={group.id}
                    data-testid={`customer-group-add-${group.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => addCustomerToGroup.mutate(group.groupName)}
                    loading={addCustomerToGroup.isPending}
                  >
                    Add to {group.groupName}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <Dialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        title={editingGroup ? "Edit Group" : "Create Group"}
        description="Manage group name, description, and member ID generation."
        size="md"
      >
        <div className="space-y-4" data-testid="customer-group-dialog">
          <Input
            data-testid="customer-group-name"
            label="Group Name"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
          <Input
            data-testid="customer-group-description"
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
          <Button data-testid="customer-group-cancel" variant="secondary" onClick={() => setGroupDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="customer-group-save"
            onClick={handleSaveGroup}
            loading={createGroup.isPending || updateGroup.isPending}
            disabled={!groupName.trim()}
          >
            {editingGroup ? "Save Group" : "Create Group"}
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removalTarget)}
        onClose={() => setRemovalTarget(null)}
        onConfirm={async () => {
          if (!removalTarget) return;
          await removeCustomerFromGroup.mutateAsync(removalTarget.groupName);
          setRemovalTarget(null);
        }}
        title="Remove customer from group"
        description="This will remove the customer from the selected group."
        confirmLabel="Remove"
        confirmVariant="danger"
        loading={removeCustomerFromGroup.isPending}
      />
    </>
  );
}
