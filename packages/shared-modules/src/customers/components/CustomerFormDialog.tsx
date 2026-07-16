import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert, Button, Dialog, DialogFooter, Input, PhoneInput, Select, Textarea } from "@jaldee/design-system";
import type { Customer, CustomerFormValues } from "../types";
import { useCreateCustomer, useUpdateCustomer } from "../queries/customers";
import { useSharedModulesContext } from "../../context";
import { emitCustomerErrorToast, emitCustomerSuccessToast, getReadableCustomerApiError } from "../lib/errorEvents";

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

type CustomerFormField =
  | "firstName"
  | "lastName"
  | "jaldeeId"
  | "phoneNo"
  | "email"
  | "gender"
  | "dob"
  | "address";

type CustomerFormErrors = Partial<Record<CustomerFormField, string>>;

export function CustomerFormDialog({
  open,
  onClose,
  customerLabel,
  editingCustomer,
}: CustomerFormDialogProps) {
  const [values, setValues] = useState<CustomerFormValues>(EMPTY_VALUES);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CustomerFormErrors>({});
  const { eventBus } = useSharedModulesContext();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isEditing = Boolean(editingCustomer);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!editingCustomer) {
      setValues(EMPTY_VALUES);
      setFormError(null);
      setFieldErrors({});
      return;
    }

    setValues({
      id: editingCustomer.id,
      firstName: editingCustomer.firstName || "",
      lastName: editingCustomer.lastName || "",
      phoneNo: editingCustomer.phoneNo || "",
      countryCode: editingCustomer.countryCode || "+91",
      email: editingCustomer.email || "",
      gender: normalizeGenderValue(editingCustomer.gender),
      dob: editingCustomer.dob || "",
      address: editingCustomer.address || "",
      jaldeeId: editingCustomer.jaldeeId || "",
    });
    setFormError(null);
    setFieldErrors({});
  }, [editingCustomer, open]);

  async function handleSubmit() {
    const validationErrors = validateCustomerForm(values, customerLabel);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError(`Please correct the highlighted ${customerLabel.toLowerCase()} details.`);
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync(values);
      } else {
        await createMutation.mutateAsync(values);
      }

      emitCustomerSuccessToast(eventBus, isEditing ? `${customerLabel} updated successfully.` : `${customerLabel} created successfully.`);
      setFormError(null);
      setFieldErrors({});
      onClose();
    } catch (error) {
      const readable = getReadableCustomerApiError(
        error,
        isEditing
          ? `Unable to update ${customerLabel.toLowerCase()}. Please try again.`
          : `Unable to create ${customerLabel.toLowerCase()}. Please try again.`
      );
      const nextFieldErrors = mapCustomerFormApiError(readable.message);

      setFormError(readable.message);
      setFieldErrors(nextFieldErrors);
      emitCustomerErrorToast(eventBus, error, readable.message);
    }
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
      {formError ? <Alert variant="danger">{formError}</Alert> : null}
      <div className="grid gap-4 md:grid-cols-2" data-testid={isEditing ? "customer-edit-form" : "customer-create-form"}>
        <Input
          data-testid="customer-form-first-name"
          label="First Name"
          value={values.firstName}
          error={fieldErrors.firstName}
          onChange={(event) => updateField("firstName", event.target.value, setValues, setFieldErrors, setFormError)}
        />
        <Input
          data-testid="customer-form-last-name"
          label="Last Name"
          value={values.lastName}
          error={fieldErrors.lastName}
          onChange={(event) => updateField("lastName", event.target.value, setValues, setFieldErrors, setFormError)}
        />
        <Input
          data-testid="customer-form-jaldee-id"
          label={`${customerLabel} ID`}
          value={values.jaldeeId}
          error={fieldErrors.jaldeeId}
          onChange={(event) => updateField("jaldeeId", event.target.value, setValues, setFieldErrors, setFormError)}
        />
        <PhoneInput
          testId="customer-form-phone"
          label="Phone"
          error={fieldErrors.phoneNo}
          value={{ countryCode: values.countryCode, number: values.phoneNo }}
          onChange={(phone) => {
            setValues((current) => ({ ...current, countryCode: phone.countryCode, phoneNo: phone.number }));
            clearFieldError("phoneNo", setFieldErrors, setFormError);
          }}
        />
        <Input
          data-testid="customer-form-email"
          label="Email"
          value={values.email}
          error={fieldErrors.email}
          onChange={(event) => updateField("email", event.target.value, setValues, setFieldErrors, setFormError)}
        />
        <Select
          data-testid="customer-form-gender"
          label="Gender"
          error={fieldErrors.gender}
          value={values.gender}
          onChange={(event) => updateField("gender", event.target.value, setValues, setFieldErrors, setFormError)}
          options={[
            { label: "Select gender", value: "" },
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Other", value: "other" },
          ]}
        />
        <Input
          data-testid="customer-form-dob"
          label="Date of Birth"
          type="date"
          value={values.dob}
          error={fieldErrors.dob}
          onChange={(event) => updateField("dob", event.target.value, setValues, setFieldErrors, setFormError)}
        />
      </div>

      <div className="mt-4">
        <Textarea
          data-testid="customer-form-address"
          label="Address"
          rows={3}
          value={values.address}
          error={fieldErrors.address}
          onChange={(event) => updateField("address", event.target.value, setValues, setFieldErrors, setFormError)}
        />
      </div>

      <DialogFooter>
        <Button data-testid="customer-form-cancel" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button data-testid="customer-form-submit" onClick={handleSubmit} loading={loading}>
          {isEditing ? "Save Changes" : `Create ${customerLabel}`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function updateField(
  field: CustomerFormField,
  value: string,
  setValues: Dispatch<SetStateAction<CustomerFormValues>>,
  setFieldErrors: Dispatch<SetStateAction<CustomerFormErrors>>,
  setFormError: Dispatch<SetStateAction<string | null>>
) {
  setValues((current) => ({ ...current, [field]: value }));
  clearFieldError(field, setFieldErrors, setFormError);
}

function clearFieldError(
  field: CustomerFormField,
  setFieldErrors: Dispatch<SetStateAction<CustomerFormErrors>>,
  setFormError: Dispatch<SetStateAction<string | null>>
) {
  setFieldErrors((current) => {
    if (!current[field]) {
      return current;
    }

    const next = { ...current };
    delete next[field];
    return next;
  });
  setFormError((current) => (current ? null : current));
}

function validateCustomerForm(values: CustomerFormValues, customerLabel: string): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "First name is required.";
  }

  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (values.phoneNo.trim() && values.phoneNo.replace(/[^\d]/g, "").length < 6) {
    errors.phoneNo = `Enter a valid ${customerLabel.toLowerCase()} phone number.`;
  }

  return errors;
}

function mapCustomerFormApiError(message: string): CustomerFormErrors {
  const normalized = message.toLowerCase();
  const fieldMatchers: Array<[CustomerFormField, RegExp]> = [
    ["email", /\bemail\b/],
    ["phoneNo", /\b(phone|mobile|whatsapp|e\.164)\b/],
    ["jaldeeId", /\b(jaldee id|consumer no|consumer id|customer id|id)\b/],
    ["firstName", /\bfirst name\b/],
    ["lastName", /\blast name\b/],
    ["gender", /\bgender\b/],
    ["dob", /\b(date of birth|dob|birth)\b/],
    ["address", /\baddress\b/],
  ];

  return fieldMatchers.reduce<CustomerFormErrors>((acc, [field, pattern]) => {
    if (pattern.test(normalized)) {
      acc[field] = message;
    }
    return acc;
  }, {});
}

function normalizeGenderValue(gender?: string) {
  const normalized = gender?.trim().toLowerCase() ?? "";
  if (normalized === "male" || normalized === "female" || normalized === "other") {
    return normalized;
  }

  return "";
}
