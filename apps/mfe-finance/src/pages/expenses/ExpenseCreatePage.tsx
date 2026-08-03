import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import { Button, Dialog, DialogFooter, Input, PageHeader, Popover, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
function toFinanceRoute(routePath:string){const n=String(routePath||"").trim();if(!n)return "/";return n.replace(/^\/finance(?=\/|$)/,"")||"/";}

export default function ExpenseCreatePage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [amount, setAmount] = useState("");
  const [bookedOn, setBookedOn] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newStatusName, setNewStatusName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingStatus, setCreatingStatus] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFormData(selectNew?: { categoryId?: string; statusId?: string }) {
      const result = await Promise.allSettled([
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
      ]);

      if (!active) return;

      const categoriesResponse = result[0].status === "fulfilled" ? result[0].value : null;
      const statusesResponse = result[1].status === "fulfilled" ? result[1].value : null;
      const categories = Array.isArray(categoriesResponse?.data)
        ? categoriesResponse.data
        : Array.isArray(categoriesResponse?.data?.content)
          ? categoriesResponse.data.content
          : [];
      const statuses = Array.isArray(statusesResponse?.data)
        ? statusesResponse.data
        : Array.isArray(statusesResponse?.data?.content)
          ? statusesResponse.data.content
          : [];

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

      setCategoryOptions(nextCategoryOptions);
      setStatusOptions(nextStatusOptions);
      setCategoryId((current) => selectNew?.categoryId || current || nextCategoryOptions[0]?.value || "");
      setStatusId((current) => selectNew?.statusId || current || nextStatusOptions[0]?.value || "");
    }

    void loadFormData();
    return () => {
      active = false;
    };
  }, []);

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
    if (!title.trim()) {
      setFormError("Expense title is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.expenses.create({
        expenseFor: title.trim(),
        title: title.trim(),
        categoryUid: categoryId || undefined,
        statusUid: statusId || undefined,
        amount: parsedAmount,
        expenseDate: toIsoDateTime(bookedOn),
        createdDate: toIsoDateTime(bookedOn),
        description: description.trim() || undefined,
        locationUid: mfeProps.location?.id ?? undefined,
        locationName: mfeProps.location?.name ?? undefined,
      });
      navigate("/finance/expense");
    } catch (error) {
      console.error("[mfe-finance] Failed to create expense", error);
      setFormError(error instanceof Error ? error.message : "Could not create expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create Expense"
        subtitle="Create a finance expense record."
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
            <Button variant="outline" onClick={() => navigate(toFinanceRoute("/finance/expense"))}>Back</Button>
          </div>
        }
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5 p-5 md:p-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Expense Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Category</label>
              <div className="flex items-center">
                <Select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  containerClassName="flex-1"
                  className="rounded-r-none border-r-0"
                  options={[{ value: "", label: "Select category" }, ...categoryOptions]}
                />
                <Button type="button" className="h-[38px] rounded-l-none px-3" onClick={() => setShowCategoryDialog(true)}>
                  +
                </Button>
              </div>
            </div>
            <Input label="Booked On" type="date" value={bookedOn} onChange={(event) => setBookedOn(event.target.value)} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <div className="flex items-center">
                <Select
                  value={statusId}
                  onChange={(event) => setStatusId(event.target.value)}
                  containerClassName="flex-1"
                  className="rounded-r-none border-r-0"
                  options={[{ value: "", label: "Select status" }, ...statusOptions]}
                />
                <Button type="button" className="h-[38px] rounded-l-none px-3" onClick={() => setShowStatusDialog(true)}>
                  +
                </Button>
              </div>
            </div>
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </div>
          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(toFinanceRoute("/finance/expense"))}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Expense"}
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
    </div>
  );
}
