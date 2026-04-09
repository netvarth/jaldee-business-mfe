import { useEffect, useState } from "react";
import { Button, Dialog, DialogFooter, Input, Select, Textarea } from "@jaldee/design-system";
import type { Membership, MembershipFormValues } from "../types";
import { useCreateMembership, useUpdateMembership } from "../queries/memberships";

const EMPTY_VALUES: MembershipFormValues = {
  name: "",
  description: "",
  price: 0,
  duration: 30,
  status: "active",
};

interface MembershipFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingMembership?: Membership | null;
}

export function MembershipFormDialog({
  open,
  onClose,
  editingMembership,
}: MembershipFormDialogProps) {
  const [values, setValues] = useState<MembershipFormValues>(EMPTY_VALUES);
  const createMutation = useCreateMembership();
  const updateMutation = useUpdateMembership();
  const isEditing = Boolean(editingMembership);

  useEffect(() => {
    if (!editingMembership) {
      setValues(EMPTY_VALUES);
      return;
    }

    setValues({
      name: editingMembership.name,
      description: editingMembership.description || "",
      price: editingMembership.price,
      duration: editingMembership.duration,
      status: editingMembership.status,
    });
  }, [editingMembership]);

  const handleSubmit = async () => {
    try {
      if (isEditing && editingMembership) {
        await updateMutation.mutateAsync({ id: editingMembership.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save membership:", error);
    }
  };

  const handleChange = (field: keyof MembershipFormValues, value: string | number) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Membership" : "Create Membership"}
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          required
        />
        <Textarea
          label="Description"
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price"
            type="number"
            value={values.price.toString()}
            onChange={(event) => setValues((current) => ({ ...current, price: parseFloat(event.target.value) || 0 }))}
            required
          />
          <Input
            label="Duration (days)"
            type="number"
            value={values.duration.toString()}
            onChange={(event) => setValues((current) => ({ ...current, duration: parseInt(event.target.value) || 30 }))}
            required
          />
        </div>
        <Select
          label="Status"
          value={values.status}
          onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as 'active' | 'inactive' }))}
          options={[
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ]}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        >
          {isEditing ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}