import { useMemo, useState } from "react";
import { Alert, Badge, Button, Checkbox, EmptyState, SectionCard } from "@jaldee/design-system";
import { useAddCustomerLabels, useCustomerLabels, useRemoveCustomerLabels } from "../queries/customers";
import type { Customer } from "../types";

interface CustomerLabelsCardProps {
  customer: Customer;
  customerLabel: string;
}

export function CustomerLabelsCard({ customer, customerLabel }: CustomerLabelsCardProps) {
  const labelsQuery = useCustomerLabels();
  const addLabels = useAddCustomerLabels(customer.id);
  const removeLabels = useRemoveCustomerLabels(customer.id);
  const [selection, setSelection] = useState<Record<string, boolean>>({});

  const activeLabels = useMemo(
    () =>
      Object.entries(customer.labels ?? {})
        .filter(([, value]) => value === true || value === "true")
        .map(([key]) => key),
    [customer.labels]
  );

  const enabledLabels = (labelsQuery.data ?? []).filter((label) => label.status === "ENABLED");
  const hasPendingChanges = Object.values(selection).some(Boolean);

  async function handleApply() {
    const labelsToAdd = Object.entries(selection)
      .filter(([, checked]) => checked)
      .map(([key]) => key)
      .filter((key) => !activeLabels.includes(key));

    const labelsToRemove = activeLabels.filter((key) => selection[key] === false);

    if (labelsToRemove.length) {
      await removeLabels.mutateAsync(labelsToRemove);
    }

    if (labelsToAdd.length) {
      await addLabels.mutateAsync(labelsToAdd);
    }

    setSelection({});
  }

  return (
    <SectionCard
      title="Labels"
      actions={
        hasPendingChanges ? (
          <Button
            data-testid="customer-labels-apply"
            size="sm"
            onClick={handleApply}
            loading={addLabels.isPending || removeLabels.isPending}
          >
            Apply
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4" data-testid="customer-labels-card">
        {(addLabels.error || removeLabels.error) && (
          <Alert variant="danger">
            Unable to update {customerLabel.toLowerCase()} labels right now.
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {activeLabels.length ? (
            activeLabels.map((label) => (
              <Badge key={label} variant="info">
                {formatLabel(label)}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-[var(--color-text-secondary)]">No labels applied.</span>
          )}
        </div>

        {labelsQuery.isLoading ? (
          <div className="text-sm text-[var(--color-text-secondary)]">Loading labels...</div>
        ) : enabledLabels.length === 0 ? (
          <EmptyState
            title="No labels available"
            description="Create labels in settings before applying them to customers."
          />
        ) : (
          <div className="grid gap-3">
            {enabledLabels.map((label) => {
              const checked = selection[label.label] ?? activeLabels.includes(label.label);

              return (
                <Checkbox
                  key={label.id}
                  data-testid={`customer-label-${label.label}`}
                  checked={checked}
                  onChange={(event) =>
                    setSelection((current) => ({
                      ...current,
                      [label.label]: event.target.checked,
                    }))
                  }
                  label={label.displayName}
                  description={label.label}
                />
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}
