import { Alert, Button, ConfirmDialog, Dialog, DialogFooter } from "@jaldee/design-system";
import { useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useChangeCustomerStatus } from "../queries/customers";
import type { Customer } from "../types";

interface CustomerActionsDialogProps {
  customer: Customer;
  customerLabel: string;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function CustomerActionsDialog({
  customer,
  customerLabel,
  open,
  onClose,
  onEdit,
}: CustomerActionsDialogProps) {
  const { basePath } = useSharedModulesContext();
  const [confirmStatusChange, setConfirmStatusChange] = useState(false);
  const statusMutation = useChangeCustomerStatus(customer.id);
  const nextStatus = useMemo<"ACTIVE" | "INACTIVE">(
    () => (customer.status === "INACTIVE" ? "ACTIVE" : "INACTIVE"),
    [customer.status]
  );

  const statusLabel = nextStatus === "ACTIVE" ? "Activate" : "Deactivate";
  const isActive = customer.status !== "INACTIVE";

  function navigateToBookings(path: string, params: Record<string, string>) {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.origin + path);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    window.location.assign(url.pathname + url.search);
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={`${customerLabel} Actions`}
        description={`Manage ${customerLabel.toLowerCase()} status and record operations.`}
        size="sm"
      >
        <div className="space-y-3" data-testid="customer-actions-dialog">
          {statusMutation.error && (
            <Alert variant="danger">
              Unable to update {customerLabel.toLowerCase()} status right now.
            </Alert>
          )}

          <button
            type="button"
            onClick={() =>
              navigateToBookings("/bookings/appointments", {
                checkin_type: "WALK_IN_APPOINTMENT",
                source: "customerDetails",
                customerId: customer.id,
                p_source: basePath,
              })
            }
            disabled={!isActive}
            data-testid="customer-actions-create-appointment"
            className="flex w-full items-start justify-between rounded-xl border border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>
              <span className="block text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]">Create Appointment</span>
              <span className="block text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
                Start a walk-in appointment for this {customerLabel.toLowerCase()}.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              navigateToBookings("/bookings/queue", {
                checkin_type: "WALK_IN_CHECKIN",
                showtoken: "true",
                source: "customerDetails",
                customerId: customer.id,
                p_source: basePath,
              })
            }
            disabled={!isActive}
            data-testid="customer-actions-create-checkin"
            className="flex w-full items-start justify-between rounded-xl border border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>
              <span className="block text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]">Create Check-in</span>
              <span className="block text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
                Send this {customerLabel.toLowerCase()} into the queue workflow.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
            data-testid="customer-actions-edit"
            className="flex w-full items-start justify-between rounded-xl border border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-alt)]"
          >
            <span>
              <span className="block text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]">Edit details</span>
              <span className="block text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
                Update profile, contact information, and identity fields.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmStatusChange(true)}
            data-testid="customer-actions-status"
            className="flex w-full items-start justify-between rounded-xl border border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-alt)]"
          >
            <span>
              <span className="block text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]">{statusLabel} {customerLabel}</span>
              <span className="block text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
                Current status: {customer.status || "ACTIVE"}.
              </span>
            </span>
          </button>
        </div>

        <DialogFooter>
          <Button data-testid="customer-actions-close" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={confirmStatusChange}
        onClose={() => setConfirmStatusChange(false)}
        onConfirm={async () => {
          await statusMutation.mutateAsync(nextStatus);
          setConfirmStatusChange(false);
          onClose();
        }}
        title={`${statusLabel} ${customerLabel.toLowerCase()}`}
        description={`This will mark the ${customerLabel.toLowerCase()} as ${nextStatus.toLowerCase()}.`}
        confirmLabel={statusLabel}
        confirmVariant={nextStatus === "INACTIVE" ? "danger" : "primary"}
        loading={statusMutation.isPending}
      />
    </>
  );
}
