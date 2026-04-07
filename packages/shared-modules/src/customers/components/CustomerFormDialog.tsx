import { useEffect, useState } from "react";
import { Button, Dialog, DialogFooter, Input, Select, Textarea } from "@jaldee/design-system";
import type { Customer, CustomerFormValues } from "../types";
import { useCreateCustomer, useUpdateCustomer } from "../queries/customers";

const EMPTY_VALUES: CustomerFormValues = {
  id: undefined,
  firstName: "",
  lastName: "",
  phoneNo: "",
  countryCode: "+91",
  email: "",
  gender: "",
  dob: "",
  address: "",
  jaldeeId: "",
};

interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  customerLabel: string;
  editingCustomer?: Customer | null;
}

export function CustomerFormDialog({
  open,
  onClose,
  customerLabel,
  editingCustomer,
}: CustomerFormDialogProps) {
  const [values, setValues] = useState<CustomerFormValues>(EMPTY_VALUES);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isEditing = Boolean(editingCustomer);

  useEffect(() => {
    if (!editingCustomer) {
      setValues(EMPTY_VALUES);
      return;
    }

    setValues({
      id: editingCustomer.id,
      firstName: editingCustomer.firstName || "",
      lastName: editingCustomer.lastName || "",
      phoneNo: editingCustomer.phoneNo || "",
      countryCode: editingCustomer.countryCode || "+91",
      email: editingCustomer.email || "",
      gender: editingCustomer.gender || "",
      dob: editingCustomer.dob || "",
      address: editingCustomer.address || "",
      jaldeeId: editingCustomer.jaldeeId || "",
    });
  }, [editingCustomer]);

  async function handleSubmit() {
    if (isEditing) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }

    onClose();
  }

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit ${customerLabel}` : `Create ${customerLabel}`}
      description={`Maintain ${customerLabel.toLowerCase()} details and communication fields.`}
      size="lg"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="First Name" value={values.firstName} onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))} />
        <Input label="Last Name" value={values.lastName} onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))} />
        <Input label={`${customerLabel} ID`} value={values.jaldeeId} onChange={(event) => setValues((current) => ({ ...current, jaldeeId: event.target.value }))} />
        <Input label="Phone" value={values.phoneNo} onChange={(event) => setValues((current) => ({ ...current, phoneNo: event.target.value }))} />
        <Input label="Country Code" value={values.countryCode} onChange={(event) => setValues((current) => ({ ...current, countryCode: event.target.value }))} />
        <Input label="Email" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} />
        <Select
          label="Gender"
          value={values.gender}
          onChange={(event) => setValues((current) => ({ ...current, gender: event.target.value }))}
          options={[
            { label: "Select gender", value: "" },
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Other", value: "other" },
          ]}
        />
        <Input label="Date of Birth" type="date" value={values.dob} onChange={(event) => setValues((current) => ({ ...current, dob: event.target.value }))} />
      </div>

      <div className="mt-4">
        <Textarea label="Address" rows={3} value={values.address} onChange={(event) => setValues((current) => ({ ...current, address: event.target.value }))} />
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading}>
          {isEditing ? "Save Changes" : `Create ${customerLabel}`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
