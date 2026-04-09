import { useState } from "react";
import { Alert, Button, ConfirmDialog, Dialog, DialogFooter, EmptyState, Input, SectionCard } from "@jaldee/design-system";
import { useCreateCustomerFamilyMember, useCustomerFamilyMembers, useDeleteCustomerFamilyMember } from "../queries/customers";

interface CustomerFamilyMembersCardProps {
  customerId: string;
  customerLabel: string;
}

export function CustomerFamilyMembersCard({ customerId, customerLabel }: CustomerFamilyMembersCardProps) {
  const familyQuery = useCustomerFamilyMembers(customerId);
  const createMember = useCreateCustomerFamilyMember(customerId);
  const deleteMember = useDeleteCustomerFamilyMember(customerId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jaldeeId, setJaldeeId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  async function handleCreate() {
    await createMember.mutateAsync({
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      jaldeeId: jaldeeId.trim() || undefined,
    });

    setFirstName("");
    setLastName("");
    setJaldeeId("");
    setDialogOpen(false);
  }

  return (
    <>
      <SectionCard
        title="Family Members"
        actions={
          <Button data-testid="customer-family-add" size="sm" onClick={() => setDialogOpen(true)}>
            Add Family Member
          </Button>
        }
      >
        <div className="space-y-4" data-testid="customer-family-card">
          {(createMember.error || deleteMember.error) && (
            <Alert variant="danger">
              Unable to update family members right now.
            </Alert>
          )}

          {familyQuery.isLoading ? (
            <div className="text-sm text-[var(--color-text-secondary)]">Loading family members...</div>
          ) : !familyQuery.data?.length ? (
            <EmptyState
              title="No family members"
              description={`No related ${customerLabel.toLowerCase()} profiles have been added yet.`}
            />
          ) : (
            <div className="space-y-3">
              {familyQuery.data.map((member) => {
                const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
                return (
                  <div
                    key={member.id}
                    data-testid={`customer-family-member-${member.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_22%,white)] p-4"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{name || "Unnamed member"}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {member.jaldeeId || member.id}
                      </div>
                    </div>
                    <Button
                      data-testid={`customer-family-remove-${member.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget({ id: member.id, name: name || "this family member" })}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Add Family Member"
        description={`Create a related ${customerLabel.toLowerCase()} record.`}
        size="md"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input data-testid="customer-family-first-name" label="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          <Input data-testid="customer-family-last-name" label="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          <Input data-testid="customer-family-jaldee-id" label={`${customerLabel} ID`} value={jaldeeId} onChange={(event) => setJaldeeId(event.target.value)} />
        </div>
        <DialogFooter>
          <Button data-testid="customer-family-cancel" variant="secondary" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button data-testid="customer-family-submit" onClick={handleCreate} loading={createMember.isPending} disabled={!firstName.trim()}>
            Add Member
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMember.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Remove family member"
        description={`This will remove ${deleteTarget?.name ?? "the selected family member"} from the record.`}
        confirmLabel="Remove"
        confirmVariant="danger"
        loading={deleteMember.isPending}
      />
    </>
  );
}
