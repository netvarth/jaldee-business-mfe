import { FormEvent, useEffect, useState } from "react";
import { Button, Input, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useCreateFinanceVendor, useFinanceCategories, useFinanceVendorStatuses } from "../queries/finance";
import { SharedFinanceLayout } from "./shared";

function errorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Vendor could not be created.";
}

export function FinanceVendorCreate() {
  const { navigate } = useSharedModulesContext();
  const categoriesQuery = useFinanceCategories("PaymentsInOut");
  const statusesQuery = useFinanceVendorStatuses();
  const createVendor = useCreateFinanceVendor();
  const categories = categoriesQuery.data ?? [];
  const statuses = statusesQuery.data ?? [];

  const [vendorName, setVendorName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [categoryEncId, setCategoryEncId] = useState("");
  const [statusEncId, setStatusEncId] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!categoryEncId && categories.length) setCategoryEncId(categories[0].id);
  }, [categories, categoryEncId]);

  useEffect(() => {
    if (!statusEncId && statuses.length) setStatusEncId(statuses[0].id);
  }, [statuses, statusEncId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!vendorName.trim()) {
      setFormError("Vendor name is required.");
      return;
    }

    await createVendor.mutateAsync({
      categoryEncId: categoryEncId || undefined,
      statusEncId: statusEncId || undefined,
      vendorId: vendorId.trim() || undefined,
      vendorName: vendorName.trim(),
      contactPersonName: contactPersonName.trim() || undefined,
      contactInfo: {
        phoneNumbers: phoneNumber.trim() ? [{ number: phoneNumber.trim() }] : undefined,
        emails: email.trim() ? [email.trim()] : undefined,
        address: address.trim() || undefined,
      },
      uploadedDocuments: [],
    });

    navigate?.("/finance/vendors");
  };

  return (
    <SharedFinanceLayout
      title="Create Vendor"
      subtitle="Add a vendor for finance expenses and payouts."
      actions={<Button variant="outline" onClick={() => navigate?.("/finance/vendors")}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Vendor Name" value={vendorName} onChange={(event) => setVendorName(event.target.value)} required />
            <Input label="Vendor ID" value={vendorId} onChange={(event) => setVendorId(event.target.value)} />
            <Select
              label="Category"
              value={categoryEncId}
              onChange={(event) => setCategoryEncId(event.target.value)}
              options={[
                { value: "", label: categoriesQuery.isLoading ? "Loading categories..." : "Select category" },
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ]}
            />
            <Select
              label="Status"
              value={statusEncId}
              onChange={(event) => setStatusEncId(event.target.value)}
              options={[
                { value: "", label: statusesQuery.isLoading ? "Loading statuses..." : "Select status" },
                ...statuses.map((status) => ({ value: status.id, label: status.name })),
              ]}
            />
            <Input label="Contact Person" value={contactPersonName} onChange={(event) => setContactPersonName(event.target.value)} />
            <Input label="Phone Number" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>

          <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} />

          {(formError || createVendor.isError) && (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">
              {formError || errorMessage(createVendor.error)}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate?.("/finance/vendors")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createVendor.isPending}>
              {createVendor.isPending ? "Creating..." : "Create Vendor"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </SharedFinanceLayout>
  );
}
