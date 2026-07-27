import { FormEvent, useEffect, useState } from "react";
import { Button, Input, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useCreateFinanceVendor, useFinanceVendorCategories, useFinanceVendorStatuses } from "../queries/finance";
import { SharedFinanceLayout } from "./shared";

function errorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Vendor could not be created.";
}

const PAYMENT_MODE_OPTIONS = [
  "Cash",
  "DC",
  "CC",
  "NB",
  "Mock",
  "UPI",
  "Other",
  "STORE_CREDIT",
  "PAYLATER",
  "Offline",
  "WALLET",
  "PAYTM_PostPaid",
  "EMI",
  "BANK_TRANSFER",
  "CREDIT",
];

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function FinanceVendorCreate() {
  const { navigate } = useSharedModulesContext();
  const categoriesQuery = useFinanceVendorCategories();
  const statusesQuery = useFinanceVendorStatuses();
  const createVendor = useCreateFinanceVendor();
  const categories = categoriesQuery.data ?? [];
  const statuses = statusesQuery.data ?? [];

  const [name, setName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendorCategoryId, setVendorCategoryId] = useState("");
  const [vendorStatusId, setVendorStatusId] = useState("");
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [alternativePhoneNum, setAlternativePhoneNum] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [bankaccountNo, setBankaccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [pancardNo, setPancardNo] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [preferredPaymentMode, setPreferredPaymentMode] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!vendorCategoryId && categories.length) setVendorCategoryId(categories[0].id);
  }, [categories, vendorCategoryId]);

  useEffect(() => {
    if (!vendorStatusId && statuses.length) setVendorStatusId(statuses[0].id);
  }, [statuses, vendorStatusId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Vendor name is required.");
      return;
    }

    await createVendor.mutateAsync({
      vendorCategoryId: toOptionalNumber(vendorCategoryId),
      vendorStatusId: toOptionalNumber(vendorStatusId),
      vendorId: vendorId.trim() || undefined,
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      alternativePhoneNum: alternativePhoneNum.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      state: state.trim() || undefined,
      pincode: pincode.trim() || undefined,
      bankaccountNo: bankaccountNo.trim() || undefined,
      ifscCode: ifscCode.trim() || undefined,
      bankName: bankName.trim() || undefined,
      upiId: upiId.trim() || undefined,
      pancardNo: pancardNo.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
      preferredPaymentMode: preferredPaymentMode ? [preferredPaymentMode] : undefined,
      currency: currency.trim() || undefined,
      timezone: timezone.trim() || undefined,
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
            <Input label="Vendor Name" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Vendor ID" value={vendorId} onChange={(event) => setVendorId(event.target.value)} />
            <Select
              label="Category"
              value={vendorCategoryId}
              onChange={(event) => setVendorCategoryId(event.target.value)}
              options={[
                { value: "", label: categoriesQuery.isLoading ? "Loading categories..." : "Select category" },
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ]}
            />
            <Select
              label="Status"
              value={vendorStatusId}
              onChange={(event) => setVendorStatusId(event.target.value)}
              options={[
                { value: "", label: statusesQuery.isLoading ? "Loading statuses..." : "Select status" },
                ...statuses.map((status) => ({ value: status.id, label: status.name })),
              ]}
            />
            <Input label="Contact Name" value={contactName} onChange={(event) => setContactName(event.target.value)} />
            <Input label="Phone Number" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
            <Input label="Alternative Phone" value={alternativePhoneNum} onChange={(event) => setAlternativePhoneNum(event.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input label="State" value={state} onChange={(event) => setState(event.target.value)} />
            <Input label="Pincode" value={pincode} onChange={(event) => setPincode(event.target.value)} />
            <Input label="PAN Card No" value={pancardNo} onChange={(event) => setPancardNo(event.target.value)} />
            <Input label="GST Number" value={gstNumber} onChange={(event) => setGstNumber(event.target.value)} />
            <Input label="Bank Account No" value={bankaccountNo} onChange={(event) => setBankaccountNo(event.target.value)} />
            <Input label="IFSC Code" value={ifscCode} onChange={(event) => setIfscCode(event.target.value)} />
            <Input label="Bank Name" value={bankName} onChange={(event) => setBankName(event.target.value)} />
            <Input label="UPI ID" value={upiId} onChange={(event) => setUpiId(event.target.value)} />
            <Select
              label="Preferred Payment Mode"
              value={preferredPaymentMode}
              onChange={(event) => setPreferredPaymentMode(event.target.value)}
              options={[
                { value: "", label: "Select payment mode" },
                ...PAYMENT_MODE_OPTIONS.map((mode) => ({ value: mode, label: mode })),
              ]}
            />
            <Input label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)} />
            <Input label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
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
