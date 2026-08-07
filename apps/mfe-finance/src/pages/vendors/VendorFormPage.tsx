import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import {
  Button,
  Dialog,
  DialogFooter,
  Input,
  PageHeader,
  SectionCard,
  Select,
  Textarea,
} from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { vendorPaymentModeOptions } from "../../lib/financeOptions";
import { PageShell } from "../../components/FinancePageLayout";

function toFinanceRoute(routePath: string) {
  const normalized = String(routePath || "").trim();
  if (!normalized) return "/";
  const stripped = normalized.replace(/^\/finance(?=\/|$)/, "");
  return stripped || "/";
}

export default function VendorFormPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const [existingVendor, setExistingVendor] = useState<Record<string, any> | null>(null);
  const [locationUid, setLocationUid] = useState(String(mfeProps.location?.id ?? ""));
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [vendorCategoryId, setVendorCategoryId] = useState("");
  const [vendorStatusId, setVendorStatusId] = useState("");
  const [vendorCategoryOptions, setVendorCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [vendorStatusOptions, setVendorStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [name, setName] = useState("");
  const [vendorId, setVendorId] = useState("");
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
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newVendorCategoryName, setNewVendorCategoryName] = useState("");
  const [newVendorStatusName, setNewVendorStatusName] = useState("");
  const [creatingVendorCategory, setCreatingVendorCategory] = useState(false);
  const [creatingVendorStatus, setCreatingVendorStatus] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingVendor, setLoadingVendor] = useState(false);

  useEffect(() => {
    let active = true;

    function extractRecords(payload: any) {
      return Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.data?.content)
              ? payload.data.content
              : [];
    }

    async function loadFormData(selectNew?: { categoryId?: string; statusId?: string }) {
      try {
        const [locationsResponse, categoriesResponse, statusesResponse] = await Promise.all([
          financeApi.locations.tenant<any>({
            page: 0,
            size: 100,
          }),
          financeApi.vendors.categories<any>({
            page: 0,
            size: 100,
            sort: [
              {
                field: "createdAt",
                direction: "DESC",
              },
            ],
            view: "SUMMARY",
          }),
          financeApi.vendors.statuses<any>({
            page: 0,
            size: 100,
            sort: [
              {
                field: "createdAt",
                direction: "DESC",
              },
            ],
            view: "SUMMARY",
          }),
        ]);
        if (!active) {
          return;
        }
        const locations = extractRecords(locationsResponse.data);
        const categories = extractRecords(categoriesResponse.data);
        const statuses = extractRecords(statusesResponse.data);
        const nextOptions = locations
          .map((item: any) => ({
            value: String(item.locationUid ?? item.uid ?? item.id ?? item.locationId ?? ""),
            label: String(item.place ?? item.name ?? item.locationName ?? "Location"),
          }))
          .filter((item) => item.value);
        const nextVendorCategoryOptions = categories
          .map((item: any, index: number) => ({
            value: String(item.categoryId ?? item.configCategoryId ?? item.id ?? item.uid ?? item.encId ?? `vendor-category-${index}`),
            label: String(item.name ?? item.categoryName ?? item.vendorCategoryName ?? "Vendor Category"),
          }))
          .filter((item) => item.value);
        const nextVendorStatusOptions = statuses
          .filter((item: any) => isVendorLinkedType(item))
          .map((item: any, index: number) => ({
            value: String(item.id ?? item.uid ?? item.encId ?? item.statusId ?? `vendor-status-${index}`),
            label: String(item.name ?? item.statusName ?? item.vendorStatusName ?? "Vendor Status"),
          }))
          .filter((item) => item.value);
        setLocationOptions(nextOptions);
        setVendorCategoryOptions(nextVendorCategoryOptions);
        setVendorStatusOptions(nextVendorStatusOptions);
        setLocationUid((current) => current || nextOptions[0]?.value || "");
        setVendorCategoryId(selectNew?.categoryId || vendorCategoryId || nextVendorCategoryOptions[0]?.value || "");
        setVendorStatusId(selectNew?.statusId || vendorStatusId || nextVendorStatusOptions[0]?.value || "");
      } catch (error) {
        console.error("[mfe-finance] Failed to load vendor create form data", error);
      }
    }

    void loadFormData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode || !id) {
      return;
    }

    let active = true;

    async function loadVendorForEdit() {
      setLoadingVendor(true);
      try {
        const response = await financeApi.vendors.detail<any>(id);
        if (!active) {
          return;
        }

        const vendor = response.data ?? {};
        setExistingVendor(vendor);
        setName(String(vendor.name ?? vendor.vendorName ?? ""));
        setVendorId(String(vendor.vendorId ?? ""));
        setContactName(String(vendor.contactName ?? ""));
        setAddress(String(vendor.address ?? ""));
        setState(String(vendor.state ?? ""));
        setPincode(String(vendor.pincode ?? ""));
        setPhoneNumber(String(vendor.phoneNumber ?? ""));
        setAlternativePhoneNum(String(vendor.alternativePhoneNum ?? ""));
        setEmail(String(vendor.email ?? ""));
        setBankaccountNo(String(vendor.bankaccountNo ?? ""));
        setIfscCode(String(vendor.ifscCode ?? ""));
        setBankName(String(vendor.bankName ?? ""));
        setUpiId(String(vendor.upiId ?? ""));
        setLocationUid(String(vendor.locationUid ?? ""));
        setPancardNo(String(vendor.pancardNo ?? ""));
        setGstNumber(String(vendor.gstNumber ?? ""));
        setPreferredPaymentMode(
          String(Array.isArray(vendor.preferredPaymentMode) ? vendor.preferredPaymentMode[0] ?? "" : vendor.preferredPaymentMode ?? ""),
        );
        setCurrency(String(vendor.currency ?? "INR"));
        setTimezone(String(vendor.timezone ?? "Asia/Kolkata"));
        setVendorCategoryId(String(vendor.vendorCategoryId ?? ""));
        setVendorStatusId(String(vendor.vendorStatusId ?? ""));
      } catch (error) {
        console.error("[mfe-finance] Failed to load vendor for edit", error);
        if (active) {
          setFormError(error instanceof Error ? error.message : "Could not load vendor.");
        }
      } finally {
        if (active) {
          setLoadingVendor(false);
        }
      }
    }

    void loadVendorForEdit();
    return () => {
      active = false;
    };
  }, [id, isEditMode]);

  async function handleCreateVendorCategory() {
    setFormError("");
    if (!newVendorCategoryName.trim()) {
      setFormError("Vendor category name is required.");
      return;
    }

    setCreatingVendorCategory(true);
    try {
      const response = await financeApi.vendors.createCategory<any>({
        categoryName: newVendorCategoryName.trim(),
        name: newVendorCategoryName.trim(),
      });
      const created = (response as any)?.data ?? response;
      const nextId = String(
        created?.categoryId ??
        created?.configCategoryId ??
        created?.id ??
        created?.uid ??
        created?.encId ??
        ""
      );
      setShowCategoryDialog(false);
      setNewVendorCategoryName("");

      const refreshed = await financeApi.vendors.categories<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
        view: "SUMMARY",
      });
      const categories = Array.isArray(refreshed.data)
        ? refreshed.data
        : Array.isArray((refreshed.data as any)?.content)
          ? (refreshed.data as any).content
          : Array.isArray((refreshed.data as any)?.data)
            ? (refreshed.data as any).data
            : Array.isArray((refreshed.data as any)?.data?.content)
              ? (refreshed.data as any).data.content
              : [];
      const nextVendorCategoryOptions = categories
        .map((item: any, index: number) => ({
          value: String(item.categoryId ?? item.configCategoryId ?? item.id ?? item.uid ?? item.encId ?? `vendor-category-${index}`),
          label: String(item.name ?? item.categoryName ?? item.vendorCategoryName ?? "Vendor Category"),
        }))
        .filter((item) => item.value);
      setVendorCategoryOptions(nextVendorCategoryOptions);
      setVendorCategoryId(nextId || nextVendorCategoryOptions[0]?.value || "");
    } catch (error) {
      console.error("[mfe-finance] Failed to create vendor category", error);
      setFormError(error instanceof Error ? error.message : "Could not create vendor category.");
    } finally {
      setCreatingVendorCategory(false);
    }
  }

  async function handleCreateVendorStatus() {
    setFormError("");
    if (!newVendorStatusName.trim()) {
      setFormError("Vendor status name is required.");
      return;
    }

    setCreatingVendorStatus(true);
    try {
      const response = await financeApi.vendors.createStatus<any>({
        statusName: newVendorStatusName.trim(),
        name: newVendorStatusName.trim(),
      });
      const created = (response as any)?.data ?? response;
      const nextId = String(
        created?.statusId ??
        created?.id ??
        created?.uid ??
        created?.encId ??
        ""
      );
      setShowStatusDialog(false);
      setNewVendorStatusName("");

      const refreshed = await financeApi.vendors.statuses<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
        view: "SUMMARY",
      });
      const statuses = Array.isArray(refreshed.data)
        ? refreshed.data
        : Array.isArray((refreshed.data as any)?.content)
          ? (refreshed.data as any).content
          : Array.isArray((refreshed.data as any)?.data)
            ? (refreshed.data as any).data
            : Array.isArray((refreshed.data as any)?.data?.content)
              ? (refreshed.data as any).data.content
              : [];
      const nextVendorStatusOptions = statuses
        .map((item: any, index: number) => ({
          value: String(item.id ?? item.uid ?? item.encId ?? item.statusId ?? `vendor-status-${index}`),
          label: String(item.name ?? item.statusName ?? item.vendorStatusName ?? "Vendor Status"),
        }))
        .filter((item) => item.value);
      setVendorStatusOptions(nextVendorStatusOptions);
      setVendorStatusId(nextId || nextVendorStatusOptions[0]?.value || "");
    } catch (error) {
      console.error("[mfe-finance] Failed to create vendor status", error);
      setFormError(error instanceof Error ? error.message : "Could not create vendor status.");
    } finally {
      setCreatingVendorStatus(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Vendor name is required.");
      return;
    }
    if (!vendorCategoryId) {
      setFormError("Vendor category is required.");
      return;
    }
    if (!vendorStatusId) {
      setFormError("Vendor status is required.");
      return;
    }

    setSubmitting(true);
    try {
      const locationRecord = (mfeProps.location ?? {}) as Record<string, unknown>;
      const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
      const fallbackLocationUid = String(
        locationRecord.uid ??
        locationRecord.locationUid ??
        locationRecord.id ??
        locationRecord.locationId ??
        ""
      ).trim();
      const selectedLocation = locationOptions.find((item) => item.value === locationUid);
      const selectedVendorCategory = vendorCategoryOptions.find((item) => item.value === vendorCategoryId);
      const selectedVendorStatus = vendorStatusOptions.find((item) => item.value === vendorStatusId);
      const resolvedLocationUid = String(locationUid || fallbackLocationUid).trim();
      const locationName = String(
        selectedLocation?.label ??
        existingVendor?.locationName ??
        locationRecord.name ??
        locationRecord.place ??
        ""
      ).trim();
      const tenantUid = String(
        accountRecord.tenantUid ??
        accountRecord.uid ??
        accountRecord.id ??
        ""
      ).trim();

      if (!resolvedLocationUid) {
        setFormError("Location is required.");
        setSubmitting(false);
        return;
      }

      const payload = {
        uid: isEditMode ? String(id || existingVendor?.uid || "") || undefined : undefined,
        tenantUid: tenantUid || existingVendor?.tenantUid || undefined,
        sourceService: String(existingVendor?.sourceService ?? "API_GATEWAY") || undefined,
        feature: String(existingVendor?.feature ?? "BASE_CRM") || undefined,
        subFeature: String(existingVendor?.subFeature ?? "BASE_CRM") || undefined,
        featureModule: String(existingVendor?.featureModule ?? "BASE_CRM_CORE") || undefined,
        vendorCategoryId: Number(vendorCategoryId) || undefined,
        vendorCategoryName: selectedVendorCategory?.label || existingVendor?.vendorCategoryName || undefined,
        vendorStatusId: Number(vendorStatusId) || undefined,
        vendorStatusName: selectedVendorStatus?.label || existingVendor?.vendorStatusName || undefined,
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
        locationUid: resolvedLocationUid || undefined,
        locationName: locationName || undefined,
        pancardNo: pancardNo.trim() || undefined,
        gstNumber: gstNumber.trim() || undefined,
        preferredPaymentMode: preferredPaymentMode ? [preferredPaymentMode] : undefined,
        lastPaymentModeUsed: preferredPaymentMode || undefined,
        currency: currency.trim() || undefined,
        timezone: timezone.trim() || undefined,
        uploadedDocuments: Array.isArray(existingVendor?.uploadedDocuments) ? existingVendor.uploadedDocuments : [],
      };

      if (isEditMode && id) {
        await financeApi.vendors.update(id, payload);
        mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
          intent: "success",
          title: "Update Vendor",
          message: "Vendor updated successfully.",
        });
      } else {
        await financeApi.vendors.create(payload);
        mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
          intent: "success",
          title: "Create Vendor",
          message: "Vendor created successfully.",
        });
      }
      navigate(toFinanceRoute("/finance/vendors"));
    } catch (error) {
      console.error(`[mfe-finance] Failed to ${isEditMode ? "update" : "create"} vendor`, error);
      const msg = error instanceof Error ? error.message : `Could not ${isEditMode ? "update" : "create"} vendor.`;
      setFormError(msg);
      mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: isEditMode ? "Update Vendor" : "Create Vendor",
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title={isEditMode ? "Edit Vendor" : "Create Vendor"}
      subtitle={isEditMode ? "Update vendor profile details." : "Add a vendor profile for payouts and expense tracking."}
      back={{ label: "Back to Vendors", href: "/vendors" }}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        {loadingVendor ? <div className="pb-4 text-sm text-slate-500">Loading vendor...</div> : null}
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Vendor Name *" value={name} onChange={(event) => setName(event.target.value)} required />
            <Input label="Vendor ID" value={vendorId} onChange={(event) => setVendorId(event.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Vendor Category *</label>
              <div className="flex items-center">
                <Select
                  value={vendorCategoryId}
                  onChange={(event) => setVendorCategoryId(event.target.value)}
                  containerClassName="flex-1"
                  className="rounded-r-none border-r-0"
                  options={[{ value: "", label: "Select vendor category" }, ...vendorCategoryOptions]}
                />
                <Button type="button" className="h-[38px] rounded-l-none px-3" onClick={() => setShowCategoryDialog(true)}>
                  +
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Vendor Status *</label>
              <div className="flex items-center">
                <Select
                  value={vendorStatusId}
                  onChange={(event) => setVendorStatusId(event.target.value)}
                  containerClassName="flex-1"
                  className="rounded-r-none border-r-0"
                  options={[{ value: "", label: "Select vendor status" }, ...vendorStatusOptions]}
                />
                <Button type="button" className="h-[38px] rounded-l-none px-3" onClick={() => setShowStatusDialog(true)}>
                  +
                </Button>
              </div>
            </div>
            <Select
              label="Location *"
              value={locationUid}
              onChange={(event) => setLocationUid(event.target.value)}
              options={[{ value: "", label: "Location" }, ...locationOptions]}
            />
            <Input label="Contact Name" value={contactName} onChange={(event) => setContactName(event.target.value)} />
            <Input label="Phone Number" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
            <Input label="Alternative Phone No." value={alternativePhoneNum} onChange={(event) => setAlternativePhoneNum(event.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input label="State" value={state} onChange={(event) => setState(event.target.value)} />
            <Input label="Pincode" value={pincode} onChange={(event) => setPincode(event.target.value)} />
            <Input label="PAN Card No." value={pancardNo} onChange={(event) => setPancardNo(event.target.value)} />
            <Input label="GST Number" value={gstNumber} onChange={(event) => setGstNumber(event.target.value)} />
            <Input label="Bank Account No." value={bankaccountNo} onChange={(event) => setBankaccountNo(event.target.value)} />
            <Input label="Bank Name" value={bankName} onChange={(event) => setBankName(event.target.value)} />
            <Input label="IFSC Code" value={ifscCode} onChange={(event) => setIfscCode(event.target.value)} />
            <Input label="UPI ID" value={upiId} onChange={(event) => setUpiId(event.target.value)} />
            <Select
              label="Preferred Payment Mode"
              value={preferredPaymentMode}
              onChange={(event) => setPreferredPaymentMode(event.target.value)}
              options={[{ value: "", label: "Choose Payment Mode" }, ...vendorPaymentModeOptions]}
            />
            <Input label="Currency" value={currency} onChange={(event) => setCurrency(event.target.value)} />
            <Input label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          </div>

          <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/vendors")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SectionCard>

      <Dialog open={showCategoryDialog} onClose={() => setShowCategoryDialog(false)} title="Create Vendor Category" size="md">
        <div className="space-y-5 pt-2">
          <Input
            label="Category Name"
            placeholder="Enter Category Name"
            value={newVendorCategoryName}
            onChange={(event) => setNewVendorCategoryName(event.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => void handleCreateVendorCategory()} disabled={creatingVendorCategory || !newVendorCategoryName.trim()}>
              {creatingVendorCategory ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)} title="Create Vendor Status" size="md">
        <div className="space-y-5 pt-2">
          <Input
            label="Status Name"
            placeholder="Enter Status Name"
            value={newVendorStatusName}
            onChange={(event) => setNewVendorStatusName(event.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowStatusDialog(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => void handleCreateVendorStatus()} disabled={creatingVendorStatus || !newVendorStatusName.trim()}>
              {creatingVendorStatus ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </PageShell>
  );
}
