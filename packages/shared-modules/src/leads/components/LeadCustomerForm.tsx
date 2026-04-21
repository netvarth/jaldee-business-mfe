import { Alert, Button, Input, PageHeader, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { useEffect, useMemo, useState } from "react";
import { useSharedModulesContext } from "../../context";
import { useCreateLeadCustomer, useLeadCustomerByUid, useUpdateLeadCustomer } from "../queries/leads";
import { unwrapPayload } from "../utils";

type FormState = {
  firstName: string;
  lastName: string;
  countryCode: string;
  phone: string;
  email: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pin: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  countryCode: "+91",
  phone: "",
  email: "",
  gender: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pin: "",
};

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export function LeadCustomerForm({ mode, recordId }: { mode: "create" | "update"; recordId?: string }) {
  const { basePath } = useSharedModulesContext();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const detailQuery = useLeadCustomerByUid(recordId ?? "");
  const createMutation = useCreateLeadCustomer();
  const updateMutation = useUpdateLeadCustomer();
  const isUpdate = mode === "update" && !!recordId;

  const detail = useMemo(() => unwrapPayload(detailQuery.data), [detailQuery.data]);

  useEffect(() => {
    if (!isUpdate || !detail) return;
    setForm({
      firstName: String(detail.firstName ?? ""),
      lastName: String(detail.lastName ?? ""),
      countryCode: String(detail.countryCode ?? "+91"),
      phone: String(detail.phone ?? ""),
      email: String(detail.email ?? ""),
      gender: String(detail.gender ?? ""),
      address: String(detail.address ?? ""),
      city: String(detail.city ?? ""),
      state: String(detail.state ?? ""),
      country: String(detail.country ?? ""),
      pin: String(detail.pin ?? ""),
    });
  }, [detail, isUpdate]);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      setError("First name, last name, and mobile number are required.");
      return;
    }

    const payload: any = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      countryCode: form.countryCode.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      gender: form.gender || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      country: form.country.trim() || undefined,
      pin: form.pin.trim() || undefined,
    };

    try {
      if (isUpdate && recordId) {
        await updateMutation.mutateAsync({ uid: recordId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      window.location.assign(`${basePath}/customers`);
    } catch (submitError: any) {
      setError(typeof submitError?.message === "string" ? submitError.message : "Unable to save the prospect.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isUpdate ? "Update Prospect" : "Create Prospect"}
        back={{ label: "Back", href: `${basePath}/customers` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-6 md:max-w-4xl">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="First Name" value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} required />
            <Input label="Last Name" value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} required />
            <Input label="Country Code" value={form.countryCode} onChange={(event) => setField("countryCode", event.target.value)} />
            <Input label="Mobile Number" value={form.phone} onChange={(event) => setField("phone", event.target.value)} required />
            <Input label="Email" value={form.email} onChange={(event) => setField("email", event.target.value)} />
            <Select label="Gender" value={form.gender} onChange={(event) => setField("gender", event.target.value)} options={GENDER_OPTIONS} placeholder="Select gender" />
            <Input label="City" value={form.city} onChange={(event) => setField("city", event.target.value)} />
            <Input label="State" value={form.state} onChange={(event) => setField("state", event.target.value)} />
            <Input label="Country" value={form.country} onChange={(event) => setField("country", event.target.value)} />
            <Input label="Pincode" value={form.pin} onChange={(event) => setField("pin", event.target.value)} />
          </div>

          <Textarea label="Address" rows={4} value={form.address} onChange={(event) => setField("address", event.target.value)} />

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => window.location.assign(`${basePath}/customers`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
              {isUpdate ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

