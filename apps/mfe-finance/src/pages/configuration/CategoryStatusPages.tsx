import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Icon, Input, Popover, SectionCard, Select, Textarea } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { financeApi } from "../../lib/financeApi";
import { DataTableCard, FinanceFeatureLayout, PageShell } from "../../components/FinancePageLayout";

export function CategoryPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const location = useLocation();
  const [financeCategories, setFinanceCategories] = useState<Array<{
    id: string;
    name: string;
    usageCount: number;
    linkedTo: string;
    status: string;
    defaultCategory: boolean;
    configCategoryId: string;
  }>>([]);
  const [updatingCategoryId, setUpdatingCategoryId] = useState("");

  const categoryTypeFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("categoryType") || "";
  }, [location.search]);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      const filter: Record<string, unknown> = mfeProps.location?.id
        ? { "locationId-eq": mfeProps.location.id, from: 0, count: 100 }
        : { from: 0, count: 100 };

      if (categoryTypeFilter) {
        filter.page = 0;
        filter.size = 100;
        filter.sort = [{ field: "createdAt", direction: "DESC" }];
        filter.filters = {
          field: "categoryType",
          operator: "IN",
          values: [categoryTypeFilter],
        };
        filter.view = "SUMMARY";
      }

      try {
        const response = await financeApi.categories.search<any>(filter);
        if (!active) {
          return;
        }

        const records = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.content)
            ? response.data.content
            : [];

        setFinanceCategories(
          records.map((item: any, index: number) => ({
            id: String(item.uid ?? item.id ?? item.categoryId ?? `category-${index}`),
            name: String(item.categoryName ?? item.name ?? item.displayName ?? "Category"),
            usageCount: Number(item.usageCount ?? item.count ?? item.linkedCount ?? 0) || 0,
            linkedTo: String(item.categoryType ?? item.linkedTo ?? item.type ?? "General"),
            status: String(item.status ?? item.statusValue ?? "Enabled"),
            defaultCategory: Boolean(item.defaultCategory),
            configCategoryId: String(item.configCategoryId ?? ""),
          })),
        );
      } catch (error) {
        console.error("[mfe-finance] Failed to load categories", error);
        if (active) {
          setFinanceCategories([]);
        }
      }
    }

    void loadCategories();

    return () => {
      active = false;
    };
  }, [categoryTypeFilter, mfeProps.location?.id]);

  async function handleCategoryStatusChange(row: (typeof financeCategories)[number]) {
    const currentStatus = row.status.trim().toLowerCase();
    const nextStatus = currentStatus === "enabled" || currentStatus === "enable" ? "Disabled" : "Enabled";

    setUpdatingCategoryId(row.id);
    try {
      await financeApi.categories.updateStatus(row.id, nextStatus);
      setFinanceCategories((current) =>
        current.map((item) => (item.id === row.id ? { ...item, status: nextStatus } : item))
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to update category status", error);
    } finally {
      setUpdatingCategoryId("");
    }
  }

  const columns = useMemo<ColumnDef<(typeof financeCategories)[number]>[]>(
    () => [
      { key: "name", header: "Name" },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={row.status === "Enabled" ? "success" : "neutral"}>{row.status || "Disabled"}</Badge>,
      },
      {
        key: "actions",
        header: "",
        render: (row) => {
          const canToggle = !row.defaultCategory && !row.configCategoryId;
          const currentStatus = row.status.trim().toLowerCase();
          const nextStatus = currentStatus === "enabled" || currentStatus === "enable" ? "Disable" : "Enable";

          if (!canToggle) {
            return null;
          }

          return (
            <Popover
              portal
              placement="bottom"
              align="end"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                  aria-label="Category actions"
                />
              }
            >
              <div className="grid min-w-[180px] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  disabled={updatingCategoryId === row.id}
                  onClick={() => void handleCategoryStatusChange(row)}
                >
                  {updatingCategoryId === row.id ? "Updating..." : nextStatus}
                </Button>
              </div>
            </Popover>
          );
        },
      },
    ],
    [updatingCategoryId]
  );

  return (
    <FinanceFeatureLayout
      title="Categories"
      subtitle="Finance categories used across invoices, expenses, and ledger flows."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button onClick={() => navigate("create", { state: { from: `${location.pathname}${location.search}` } })}>
            Create Category
          </Button>
        </div>
      }
      // stats={[
      //   { label: "Categories", value: String(financeCategories.length), accent: "indigo" },
      //   { label: "Invoice Tags", value: String(financeCategories.filter((item) => item.linkedTo === "Invoices").length), accent: "emerald" },
      //   { label: "Expense Tags", value: String(financeCategories.filter((item) => item.linkedTo === "Expenses").length), accent: "amber" },
      //   { label: "Ledger Tags", value: String(financeCategories.filter((item) => item.linkedTo === "Ledger").length), accent: "rose" },
      // ]}
      main={
        <DataTableCard
          title="Category List"
          subtitle="Reusable finance categories."
          data={financeCategories}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No categories"
          emptyDescription="Categories will appear here."
        />
      }
      // aside={
      //   <FeedCard title="Usage Summary">
      //     <SummaryList
      //       rows={financeCategories.map((item) => ({
      //         label: item.name,
      //         value: String(item.usageCount),
      //         note: `Linked to ${item.linkedTo}`,
      //       }))}
      //     />
      //   </FeedCard>
      // }
    />
  );
}

export function CategoryCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState("PaymentsInOut");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const returnPath =
    typeof (location.state as { from?: unknown } | null)?.from === "string"
      ? String((location.state as { from: string }).from)
      : "/finance/category";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Category name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.categories.create({
        categoryName: name.trim(),
        name: name.trim(),
        categoryType,
      });
      navigate(returnPath);
    } catch (error) {
      console.error("[mfe-finance] Failed to create category", error);
      setFormError(error instanceof Error ? error.message : "Could not create category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Create Category"
      subtitle="Create a finance category using the tenant category API."
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-4 md:max-w-2xl" onSubmit={handleSubmit}>
          <Input
            label="Category Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Travel"
            fullWidth
          />
          <Select
            label="Category Type"
            value={categoryType}
            onChange={(event) => setCategoryType(event.target.value)}
            options={[
              { value: "PaymentsInOut", label: "Payments In/Out" },
              { value: "Expense", label: "Expense" },
              { value: "Invoice", label: "Invoice" },
            ]}
            fullWidth
          />
          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(returnPath)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating" : "Create Category"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

export function StatusCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState("PaymentsInOut");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const returnPath =
    typeof (location.state as { from?: unknown } | null)?.from === "string"
      ? String((location.state as { from: string }).from)
      : "/finance/status";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Status name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.statuses.create({
        name: name.trim(),
        categoryType,
        status: "Enabled",
      });
      navigate(returnPath);
    } catch (error) {
      console.error("[mfe-finance] Failed to create status", error);
      setFormError(error instanceof Error ? error.message : "Could not create status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Create Status"
      subtitle="Create a finance workflow status using the tenant status API."
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-4 md:max-w-2xl" onSubmit={handleSubmit}>
          <Input
            label="Status Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="In Progress"
            fullWidth
          />
          <Select
            label="Applies To"
            value={categoryType}
            onChange={(event) => setCategoryType(event.target.value)}
            options={[
              { value: "PaymentsInOut", label: "Payments In/Out" },
              { value: "Expense", label: "Expense" },
              { value: "Invoice", label: "Invoice" },
            ]}
            fullWidth
          />
          {formError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(returnPath)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating" : "Create Status"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

export function StatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [financeStatuses, setFinanceStatuses] = useState<Array<{
    id: string;
    name: string;
    status: string;
    colorHint: string;
    defaultStatus: boolean;
    configStatusId: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatusId, setUpdatingStatusId] = useState("");

  const categoryTypeFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("categoryType") || "";
  }, [location.search]);

  useEffect(() => {
    let active = true;

    async function loadStatuses() {
      setLoading(true);
      try {
        const response = await financeApi.statuses.search<any>({
          page: 0,
          size: 100,
          sort: [
            {
              field: "createdAt",
              direction: "DESC",
            },
          ],
          ...(categoryTypeFilter
            ? {
                filters: {
                  field: "categoryType",
                  operator: "IN",
                  values: [categoryTypeFilter],
                },
                view: "SUMMARY",
              }
            : {
                view: "SUMMARY",
              }),
        });

        if (!active) {
          return;
        }

        const records = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.content)
            ? response.data.content
            : Array.isArray(response.data?.data)
              ? response.data.data
              : Array.isArray(response.data?.data?.content)
                ? response.data.data.content
                : [];

        setFinanceStatuses(
          records.map((item: any, index: number) => ({
            id: String(item.uid ?? item.id ?? item.statusId ?? `status-${index}`),
            name: String(item.statusName ?? item.name ?? "-"),
            status: String(item.status ?? item.statusValue ?? item.state ?? "Enabled"),
            colorHint: String(item.colorHint ?? item.color ?? item.statusColor ?? "Default"),
            defaultStatus: Boolean(item.defaultStatus),
            configStatusId: String(item.configStatusId ?? item.configId ?? ""),
          })),
        );
      } catch (error) {
        console.error("[mfe-finance] Failed to load statuses", error);
        if (active) {
          setFinanceStatuses([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadStatuses();
    return () => {
      active = false;
    };
  }, [categoryTypeFilter]);

  async function handleStatusChange(row: (typeof financeStatuses)[number]) {
    const currentStatus = row.status.trim().toLowerCase();
    const nextStatus = currentStatus === "enabled" || currentStatus === "enable" ? "Disabled" : "Enabled";

    setUpdatingStatusId(row.id);
    try {
      await financeApi.statuses.updateStatus(row.id, nextStatus);
      setFinanceStatuses((current) =>
        current.map((item) => (item.id === row.id ? { ...item, status: nextStatus } : item))
      );
    } catch (error) {
      console.error("[mfe-finance] Failed to update status", error);
    } finally {
      setUpdatingStatusId("");
    }
  }

  const columns = useMemo<ColumnDef<(typeof financeStatuses)[number]>[]>(
    () => [
      { key: "name", header: "Name" },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={row.status === "Enabled" ? "success" : "neutral"}>{row.status || "Disabled"}</Badge>,
      },
      {
        key: "actions",
        header: "",
        render: (row) => {
          const canToggle = !row.defaultStatus && !row.configStatusId;
          const currentStatus = row.status.trim().toLowerCase();
          const nextStatus = currentStatus === "enabled" || currentStatus === "enable" ? "Disable" : "Enable";

          if (!canToggle) {
            return null;
          }

          return (
            <Popover
              portal
              placement="bottom"
              align="end"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                  aria-label="Status actions"
                />
              }
            >
              <div className="grid min-w-[180px] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  disabled={updatingStatusId === row.id}
                  onClick={() => void handleStatusChange(row)}
                >
                  {updatingStatusId === row.id ? "Updating..." : nextStatus}
                </Button>
              </div>
            </Popover>
          );
        },
      },
    ],
    [updatingStatusId]
  );

  return (
    <FinanceFeatureLayout
      title="Statuses"
      subtitle={categoryTypeFilter === "PaymentsInOut" ? "Manage receivable statuses." : "Manage finance workflow statuses."}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button onClick={() => navigate("create", { state: { from: `${location.pathname}${location.search}` } })}>
            Create Status
          </Button>
        </div>
      }
      // stats={[
      //   { label: "Statuses", value: String(financeStatuses.length), accent: "indigo" },
      //   { label: "Invoice Statuses", value: String(financeStatuses.filter((item) => item.appliesTo === "Invoices").length), accent: "emerald" },
      //   { label: "Receivable Statuses", value: String(financeStatuses.filter((item) => item.appliesTo === "Receivables").length), accent: "amber" },
      //   { label: "Vendor Statuses", value: String(financeStatuses.filter((item) => item.appliesTo === "Vendors").length), accent: "rose" },
      // ]}
      main={
        <DataTableCard
          title="Status Registry"
          subtitle={categoryTypeFilter === "PaymentsInOut" ? "Status values used in receivables." : "Status values used across the finance product."}
          data={financeStatuses}
          columns={columns}
          getRowId={(row) => row.id}
          emptyTitle="No statuses"
          emptyDescription={loading ? "Loading statuses..." : "Statuses will appear here."}
        />
      }
      // aside={
      //   <FeedCard title="Status Notes">
      //     <SummaryList
      //       rows={financeStatuses.map((item) => ({
      //         label: item.name,
      //         value: item.colorHint,
      //         note: `Applies to ${item.appliesTo}`,
      //       }))}
      //     />
      //   </FeedCard>
      // }
    />
  );
}
