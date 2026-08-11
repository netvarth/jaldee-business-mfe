import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import { Button, DatePicker, Dialog, DialogFooter, Icon, Input, PageHeader, Popover, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { PageShell } from "../../components/FinancePageLayout";
function toFinanceRoute(routePath:string){const n=String(routePath||"").trim();if(!n)return "/";return n.replace(/^\/finance(?=\/|$)/,"")||"/";}

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

function toIsoDateTime(value: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export default function ExpenseEditPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const params = useParams();
  const uid = params.id ?? "";
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [vendorUid, setVendorUid] = useState("");
  const [locationUid, setLocationUid] = useState(String(mfeProps.location?.id ?? ""));
  const [bookedOn, setBookedOn] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [description, setDescription] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [vendorOptions, setVendorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [locationOptions, setLocationOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newStatusName, setNewStatusName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingStatus, setCreatingStatus] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

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

    async function loadFormData() {
      const [categoriesResult, statusesResult, vendorsResult, locationsResult, detailResult] = await Promise.allSettled([
        financeApi.categories.search<any>({
          page: 0,
          size: 100,
          sort: [{ field: "createdAt", direction: "DESC" }],
          filters: {
            field: "categoryType",
            operator: "IN",
            values: ["Expense"],
          },
          view: "SUMMARY",
        }),
        financeApi.statuses.search<any>({
          page: 0,
          size: 100,
          sort: [{ field: "createdAt", direction: "DESC" }],
          filters: {
            field: "categoryType",
            operator: "IN",
            values: ["Expense"],
          },
          view: "SUMMARY",
        }),
        financeApi.vendors.search<any>({
          page: 0,
          size: 100,
          sort: [{ field: "createdAt", direction: "DESC" }],
          view: "SUMMARY",
        }),
        financeApi.locations.tenant<any>({
          page: 0,
          size: 100,
        }),
        financeApi.expenses.detail<any>(uid),
      ]);

      if (!active) return;

      const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
      const statusesResponse = statusesResult.status === "fulfilled" ? statusesResult.value : null;
      const vendorsResponse = vendorsResult.status === "fulfilled" ? vendorsResult.value : null;
      const locationsResponse = locationsResult.status === "fulfilled" ? locationsResult.value : null;
      const detailResponse = detailResult.status === "fulfilled" ? detailResult.value : null;

      const categories = extractRecords(categoriesResponse?.data);
      const statuses = extractRecords(statusesResponse?.data);
      const vendors = extractRecords(vendorsResponse?.data);
      const locations = extractRecords(locationsResponse?.data);

      const filteredCategories = categories.filter((item: any) => {
        const type = String(item?.categoryType ?? item?.type ?? "").toLowerCase();
        const status = String(item?.status ?? "").toLowerCase();
        return type === "expense" && (status === "" || status === "enabled" || status === "enable");
      });
      const filteredStatuses = statuses.filter((item: any) => {
        const type = String(item?.categoryType ?? item?.type ?? "").toLowerCase();
        const status = String(item?.status ?? "").toLowerCase();
        return type === "expense" && (status === "" || status === "enabled" || status === "enable");
      });

      const nextCategoryOptions = filteredCategories.map((item: any, index: number) => ({
        value: String(item.uid ?? item.categoryId ?? item.configCategoryId ?? item.id ?? item.encId ?? `category-${index}`),
        label: String(item.name ?? item.categoryName ?? item.displayName ?? "Category"),
      }));
      const nextStatusOptions = filteredStatuses.map((item: any, index: number) => ({
        value: String(item.uid ?? item.id ?? item.encId ?? `status-${index}`),
        label: String(item.name ?? item.statusName ?? item.vendorStatusName ?? "Status"),
      }));
      const nextVendorOptions = vendors.map((item: any, index: number) => ({
        value: String(item.encId ?? item.uid ?? item.id ?? `vendor-${index}`),
        label: String(item.name ?? item.vendorName ?? "Vendor"),
      }));
      const nextLocationOptions = locations
        .map((item: any) => ({
          value: String(item.locationUid ?? item.uid ?? item.id ?? item.locationId ?? ""),
          label: String(item.place ?? item.name ?? item.locationName ?? "Location"),
        }))
        .filter((item) => item.value);

      setCategoryOptions(nextCategoryOptions);
      setStatusOptions(nextStatusOptions);
      setVendorOptions(nextVendorOptions);
      setLocationOptions(nextLocationOptions);

      const detail = detailResponse?.data ?? {};
      setTitle(String(detail.expenseFor ?? detail.title ?? ""));
      setCategoryId(String(detail.categoryUid ?? detail.categoryId ?? ""));
      setStatusId(String(detail.statusUid ?? detail.statusId ?? ""));
      const nextVendorUid = String(detail.vendorUid ?? detail.consumerUid ?? "");
      setVendorUid(nextVendorUid && nextVendorUid !== EMPTY_UUID ? nextVendorUid : "");
      setLocationUid(String(detail.locationUid ?? detail.locationId ?? mfeProps.location?.id ?? nextLocationOptions[0]?.value ?? ""));
      setBookedOn(String(detail.expenseDate ?? detail.createdDate ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10));
      const amountVal = detail.amount ?? "";
      const amountPaidVal = detail.amountPaid ?? detail.paidAmount ?? detail.amountPaidTotal ?? 0;
      const amountDueVal = detail.amountDue ?? detail.balanceAmount ?? detail.dueAmount ?? (Number(amountVal) - Number(amountPaidVal)) ?? "";

      setAmount(String(amountVal));
      setAmountDue(String(amountDueVal));
      setAmountPaid(String(amountPaidVal));
      setReferenceNo(String(detail.referenceNo ?? ""));
      setPaymentMode(String(detail.mode ?? detail.paymentMode ?? "Cash"));
      setDescription(String(detail.description ?? ""));
    }

    void loadFormData();
    return () => {
      active = false;
    };
  }, [uid]);

  async function handleCreateCategory() {
    setFormError("");
    if (!newCategoryName.trim()) {
      setFormError("Category name is required.");
      return;
    }

    setCreatingCategory(true);
    try {
      const response = await financeApi.categories.create<any>({
        categoryName: newCategoryName.trim(),
        name: newCategoryName.trim(),
        categoryType: "Expense",
      });
      const created = response.data ?? response;
      const nextId = String(created?.uid ?? created?.categoryId ?? created?.configCategoryId ?? created?.id ?? created?.encId ?? "");
      setShowCategoryDialog(false);
      setNewCategoryName("");

      const categoriesResponse = await financeApi.categories.search<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
        filters: {
          field: "categoryType",
          operator: "IN",
          values: ["Expense"],
        },
        view: "SUMMARY",
      });
      const categories = Array.isArray(categoriesResponse.data?.content) ? categoriesResponse.data.content : [];
      const filteredCategories = categories.filter((item: any) => {
        const type = String(item?.categoryType ?? item?.type ?? "").toLowerCase();
        const status = String(item?.status ?? "").toLowerCase();
        return type === "expense" && (status === "" || status === "enabled" || status === "enable");
      });
      const nextCategoryOptions = filteredCategories.map((item: any, index: number) => ({
        value: String(item.uid ?? item.categoryId ?? item.configCategoryId ?? item.id ?? item.encId ?? `category-${index}`),
        label: String(item.name ?? item.categoryName ?? item.displayName ?? "Category"),
      }));
      setCategoryOptions(nextCategoryOptions);
      setCategoryId(nextId || nextCategoryOptions[0]?.value || "");
    } catch (error) {
      console.error("[mfe-finance] Failed to create expense category", error);
      setFormError(error instanceof Error ? error.message : "Could not create category.");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleCreateStatus() {
    setFormError("");
    if (!newStatusName.trim()) {
      setFormError("Status name is required.");
      return;
    }

    setCreatingStatus(true);
    try {
      const response = await financeApi.statuses.create<any>({
        statusName: newStatusName.trim(),
        name: newStatusName.trim(),
        categoryType: "Expense",
      });
      const created = response.data ?? response;
      const nextId = String(created?.uid ?? created?.statusId ?? created?.id ?? created?.encId ?? "");
      setShowStatusDialog(false);
      setNewStatusName("");

      const statusesResponse = await financeApi.statuses.search<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
        filters: {
          field: "categoryType",
          operator: "IN",
          values: ["Expense"],
        },
        view: "SUMMARY",
      });
      const statuses = Array.isArray(statusesResponse.data?.content) ? statusesResponse.data.content : [];
      const filteredStatuses = statuses.filter((item: any) => {
        const type = String(item?.categoryType ?? item?.type ?? "").toLowerCase();
        const status = String(item?.status ?? "").toLowerCase();
        return type === "expense" && (status === "" || status === "enabled" || status === "enable");
      });
      const nextStatusOptions = filteredStatuses.map((item: any, index: number) => ({
        value: String(item.uid ?? item.id ?? item.encId ?? `status-${index}`),
        label: String(item.name ?? item.statusName ?? item.vendorStatusName ?? "Status"),
      }));
      setStatusOptions(nextStatusOptions);
      setStatusId(nextId || nextStatusOptions[0]?.value || "");
    } catch (error) {
      console.error("[mfe-finance] Failed to create expense status", error);
      setFormError(error instanceof Error ? error.message : "Could not create status.");
    } finally {
      setCreatingStatus(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    const parsedAmountDue = Number(amountDue || amount || 0);
    const parsedAmountPaid = Number(amountPaid || 0);
    const normalizedVendorUid = vendorUid && vendorUid !== EMPTY_UUID ? vendorUid : "";
    if (!locationUid) {
      setFormError("Location is required.");
      return;
    }
    if (!categoryId) {
      setFormError("Category is required.");
      return;
    }
    if (!title.trim()) {
      setFormError("Expense for is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedLocation = locationOptions.find((item) => item.value === locationUid);
      await financeApi.expenses.update(uid, {
        expenseFor: title.trim(),
        title: title.trim(),
        categoryUid: categoryId || undefined,
        statusUid: statusId || undefined,
        amount: parsedAmount,
        amountDue: Number.isFinite(parsedAmountDue) ? parsedAmountDue : undefined,
        amountPaid: Number.isFinite(parsedAmountPaid) ? parsedAmountPaid : undefined,
        expenseDate: toIsoDateTime(bookedOn),
        description: description.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        mode: paymentMode || undefined,
        paymentMode: paymentMode || undefined,
        consumerUid: normalizedVendorUid || undefined,
        vendorUid: normalizedVendorUid || undefined,
        locationUid: locationUid || undefined,
        locationId: locationUid || undefined,
        locationName: selectedLocation?.label || mfeProps.location?.name || undefined,
      });
      mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Update Expense",
        message: "Expense updated successfully.",
      });
      navigate("../..", { relative: "path" });
    } catch (error) {
      console.error("[mfe-finance] Failed to update expense", error);
      const msg = error instanceof Error ? error.message : "Could not update expense.";
      setFormError(msg);
      mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Update Expense",
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSelectedAttachments(Array.from(event.target.files ?? []));
  }

  return (
    <PageShell
      title="Update Expense"
      subtitle="Manage your Expense"
      back={{ label: "Back to Expenses", href: "/expense" }}
      actions={
        <div className="flex items-center gap-2">
          <Popover
            portal
            placement="bottom"
            align="end"
            trigger={
              <Button type="button" variant="outline">
                Actions
              </Button>
            }
          >
            <div className="grid min-w-[220px] p-1">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start font-normal"
                onClick={() => navigate(`${toFinanceRoute("/finance/category")}?categoryType=Expense`)}
              >
                Expense category
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start font-normal"
                onClick={() => navigate(toFinanceRoute("/finance/vendors/create"))}
              >
                Create Vendor
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start font-normal"
                onClick={() => navigate(`${toFinanceRoute("/finance/status")}?categoryType=Expense`)}
              >
                Expense Status
              </Button>
            </div>
          </Popover>
        </div>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Product" value="Finance" readOnly />
            <div />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Category *</label>
              <div className="flex items-center">
                <Select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  containerClassName="flex-1"
                  className="rounded-r-none border-r-0"
                  placeholder="Select category"
                  options={categoryOptions}
                />
                <Button type="button" className="h-[38px] rounded-l-none px-3" onClick={() => setShowCategoryDialog(true)}>
                  +
                </Button>
              </div>
            </div>
            <Select
              label="Location *"
              value={locationUid}
              onChange={(event) => setLocationUid(event.target.value)}
              placeholder="Select location"
              options={locationOptions}
            />
            <Input label="Expense for" value={title} onChange={(event) => setTitle(event.target.value)} required />
            <Input label="Reference No." value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} placeholder="Reference Number" />
            <Input label="Amount(₹) *" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Vendor</label>
              <div className="flex items-center">
                <Select
                  value={vendorUid}
                  onChange={(event) => setVendorUid(event.target.value)}
                  containerClassName="flex-1"
                  className="rounded-r-none border-r-0"
                  placeholder="Choose vendor"
                  options={vendorOptions}
                />
                <Button type="button" className="h-[38px] rounded-l-none px-3" onClick={() => navigate(toFinanceRoute("/finance/vendors/create"))}>
                  +
                </Button>
              </div>
            </div>
            <Input label="Amount Due" type="number" min="0" step="0.01" value={amountDue} onChange={(event) => setAmountDue(event.target.value)} />
            <Input label="Amount Paid" type="number" min="0" step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <div className="flex items-center">
                <Select
                  value={statusId}
                  onChange={(event) => setStatusId(event.target.value)}
                  containerClassName="flex-1"
                  className="rounded-r-none border-r-0"
                  placeholder="Select status"
                  options={statusOptions}
                />
                <Button type="button" className="h-[38px] rounded-l-none px-3" onClick={() => setShowStatusDialog(true)}>
                  +
                </Button>
              </div>
            </div>
            <DatePicker label="Expense Date *" value={bookedOn} onChange={(event) => setBookedOn(event.target.value)} required />
            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value)}
              options={[
                { value: "Cash", label: "Cash" },
                { value: "CC", label: "Credit Card" },
                { value: "DC", label: "Debit Card" },
                { value: "NB", label: "Net banking" },
                { value: "UPI", label: "UPI" },
              ]}
            />
          </div>

          <Textarea
            label="Notes"
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 500))}
            placeholder="Max.500 Characters"
            rows={4}
          />

          <div className="grid gap-3">
            <div className="text-sm font-semibold text-slate-700">Upload file/Attachment</div>
            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleAttachmentChange}
            />
            <div className="flex flex-wrap items-start gap-3">
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                className="flex min-h-[132px] w-[104px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center transition hover:border-slate-300 hover:bg-slate-100"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Icon name="folder" className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-violet-700">Upload File</span>
              </button>
              {selectedAttachments.length ? (
                <div className="grid gap-2">
                  {selectedAttachments.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      {file.name}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">{formError}</div> : null}

          <div className="flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("../..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Update"}
            </Button>
          </div>
        </form>
      </SectionCard>

      <Dialog open={showCategoryDialog} onClose={() => setShowCategoryDialog(false)} title="Create Expense Category" size="md">
        <div className="space-y-5 pt-2">
          <Input label="Category Name" placeholder="Enter Category Name" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>Close</Button>
            <Button type="button" onClick={() => void handleCreateCategory()} disabled={creatingCategory || !newCategoryName.trim()}>
              {creatingCategory ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <Dialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)} title="Create Expense Status" size="md">
        <div className="space-y-5 pt-2">
          <Input label="Status Name" placeholder="Enter Status Name" value={newStatusName} onChange={(event) => setNewStatusName(event.target.value)} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowStatusDialog(false)}>Close</Button>
            <Button type="button" onClick={() => void handleCreateStatus()} disabled={creatingStatus || !newStatusName.trim()}>
              {creatingStatus ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </PageShell>
  );
}
