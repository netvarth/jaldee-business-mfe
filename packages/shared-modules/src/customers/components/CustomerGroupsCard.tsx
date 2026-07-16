import { useMemo, useState } from "react";
import { Alert, Badge, Button, ConfirmDialog, Dialog, DialogFooter, EmptyState, Input, SectionCard, Switch } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { emitCustomerErrorToast, emitCustomerSuccessToast, getReadableCustomerApiError } from "../lib/errorEvents";
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
  const { eventBus } = useSharedModulesContext();
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
  const [formError, setFormError] = useState<string | null>(null);
  const [groupNameError, setGroupNameError] = useState<string | null>(null);

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
    setFormError(null);
    setGroupNameError(null);
    setGroupDialogOpen(true);
  }

  function openEditDialog(group: CustomerGroup) {
    setEditingGroup(group);
    setGroupName(group.groupName);
    setGroupDescription(group.description ?? "");
    setGenerateGrpMemId(Boolean(group.generateGrpMemId));
    setFormError(null);
    setGroupNameError(null);
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
      setGroupNameError("Group name is required.");
      setFormError("Please enter the group details.");
      return;
    }

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync(payload);
      } else {
        await createGroup.mutateAsync(payload);
      }

      emitCustomerSuccessToast(eventBus, editingGroup ? "Customer group updated successfully." : "Customer group created successfully.");
      setGroupDialogOpen(false);
      setFormError(null);
      setGroupNameError(null);
    } catch (error) {
      const readable = getReadableCustomerApiError(
        error,
        editingGroup ? "Unable to update the customer group right now." : "Unable to create the customer group right now."
      );
      setFormError(readable.message);
      setGroupNameError(/group name|group/i.test(readable.message) ? readable.message : null);
      emitCustomerErrorToast(eventBus, error, readable.message);
    }
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
                        onClick={async () => {
                          try {
                            await changeGroupStatus.mutateAsync(
                              group.status === "DISABLE"
                                ? { groupId: group.id, status: "ENABLE" }
                                : { groupId: group.id, status: "DISABLE" }
                            );
                            emitCustomerSuccessToast(
                              eventBus,
                              group.status === "DISABLE"
                                ? `Group ${group.groupName} enabled successfully.`
                                : `Group ${group.groupName} disabled successfully.`
                            );
                          } catch (error) {
                            emitCustomerErrorToast(eventBus, error, `Unable to update the status for ${group.groupName}.`);
                          }
                        }}
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
                        onClick={async () => {
                          try {
                            await upsertMemberId.mutateAsync({
                              groupName: group.groupName,
                              memberId: getMemberIdDraft(group).trim(),
                              existing: group.memberId,
                            });
                            emitCustomerSuccessToast(eventBus, `Member ID saved for ${group.groupName}.`);
                          } catch (error) {
                            emitCustomerErrorToast(eventBus, error, `Unable to save the member ID for ${group.groupName}.`);
                          }
                        }}
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
                    onClick={async () => {
                      try {
                        await addCustomerToGroup.mutateAsync(group.groupName);
                        emitCustomerSuccessToast(eventBus, `Customer added to ${group.groupName} successfully.`);
                      } catch (error) {
                        emitCustomerErrorToast(eventBus, error, `Unable to add the customer to ${group.groupName}.`);
                      }
                    }}
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
        {formError ? <Alert variant="danger">{formError}</Alert> : null}
        <div className="space-y-4" data-testid="customer-group-dialog">
          <Input
            data-testid="customer-group-name"
            label="Group Name"
            value={groupName}
            error={groupNameError ?? undefined}
            onChange={(event) => {
              setGroupName(event.target.value);
              if (groupNameError) {
                setGroupNameError(null);
              }
              if (formError) {
                setFormError(null);
              }
            }}
          />
          <Input
            data-testid="customer-group-description"
            label="Description"
            value={groupDescription}
            onChange={(event) => {
              setGroupDescription(event.target.value);
              if (formError) {
                setFormError(null);
              }
            }}
          />
          <Switch
            label="Generate group member IDs"
            checked={generateGrpMemId}
            onChange={(value) => {
              setGenerateGrpMemId(value);
              if (formError) {
                setFormError(null);
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            data-testid="customer-group-cancel"
            variant="secondary"
            onClick={() => {
              setGroupDialogOpen(false);
              setFormError(null);
              setGroupNameError(null);
            }}
          >
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
          try {
            await removeCustomerFromGroup.mutateAsync(removalTarget.groupName);
            emitCustomerSuccessToast(eventBus, `Customer removed from ${removalTarget.groupName} successfully.`);
            setRemovalTarget(null);
          } catch (error) {
            emitCustomerErrorToast(eventBus, error, `Unable to remove the customer from ${removalTarget.groupName}.`);
          }
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
