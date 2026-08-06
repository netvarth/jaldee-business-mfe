import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Icon,
  Input,
  PageHeader,
  Popover,
  SectionCard,
  Select,
  Switch,
  Textarea,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { DataTableCard, FinanceFeatureLayout, PageShell } from "../../components/FinancePageLayout";
import { formatCurrency } from "../../lib/financeData";

function ItemsPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await financeApi.items.list<any>();
      const nextItems = Array.isArray(res.data?.content) ? res.data.content : Array.isArray(res.data) ? res.data : [];
      setItems(nextItems);
    } catch (error) {
      console.error("Failed to fetch items", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "name", header: "Item Name" },
      { key: "code", header: "Item Code" },
      { key: "displayName", header: "Display Name" },
      { key: "amount", header: "Price", align: "right", render: (row) => formatCurrency(row.amount || 0) },
      { key: "taxPreference", header: "Taxable", render: (row) => (row.taxPreference === "TAXABLE" ? "Taxable" : "Non-Taxable") },
      { key: "status", header: "Status", render: (row) => <Badge variant={row.status === "Enabled" ? "success" : "neutral"}>{row.status}</Badge> },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.uid}`)}>
              Edit
            </Button>
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
                  aria-label="Item actions"
                />
              }
            >
              <div className="grid min-w-[220px] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    const nextStatus = row.status === "Enabled" ? "Disabled" : "Enabled";
                    try {
                      await financeApi.items.changeStatus(row.uid, nextStatus);
                      loadItems();
                    } catch (err) {
                      console.error(err);
                      alert("Failed to update status");
                    }
                  }}
                >
                  {row.status === "Enabled" ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    try {
                      await financeApi.items.updateCouponApplicable(row.uid, !row.couponApplicable);
                      loadItems();
                    } catch (err) {
                      console.error(err);
                      alert("Failed to update coupon setting");
                    }
                  }}
                >
                  Coupon Applicable: {row.couponApplicable ? "On" : "Off"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    try {
                      await financeApi.items.updateDiscountApplicable(row.uid, !row.discountApplicable);
                      loadItems();
                    } catch (err) {
                      console.error(err);
                      alert("Failed to update discount setting");
                    }
                  }}
                >
                  Discount Applicable: {row.discountApplicable ? "On" : "Off"}
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Finance Items"
      subtitle="Manage items and procedures for invoicing."
      actions={<Button onClick={() => navigate("create")}>New Item</Button>}
      main={
        <DataTableCard
          title={`Items (${items.length})`}
          subtitle="Recent and active items"
          data={items}
          columns={columns}
          getRowId={(row) => String(row.uid)}
          emptyTitle="No Items"
          emptyDescription={loading ? "Loading..." : "Items will appear here."}
        />
      }
    />
  );
}

function ItemsCreatePage() {
  const navigate = useNavigate();
  const [itemName, setItemName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [amountVal, setAmountVal] = useState("");
  const [taxPreference, setTaxPreference] = useState("NON_TAXABLE");
  const [status, setStatus] = useState("Enabled");
  const [itemDesc, setItemDesc] = useState("");
  const [rateEditable, setRateEditable] = useState(true);
  const [taxInclude, setTaxInclude] = useState(true);
  const [discountApplicable, setDiscountApplicable] = useState(true);
  const [couponApplicable, setCouponApplicable] = useState(true);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!itemName.trim()) {
      setFormError("Item Name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.items.create({
        name: itemName.trim(),
        displayName: displayName.trim() || itemName.trim(),
        code: itemCode.trim() || undefined,
        description: itemDesc.trim() || undefined,
        status,
        taxPreference,
        amount: Number(amountVal) || 0,
        rateEditable,
        taxInclude,
        taxableAmount: Number(amountVal) || 0,
        taxAmount: 0,
        netRate: Number(amountVal) || 0,
        discountApplicable,
        couponApplicable,
        displayOrder: 0,
        taxList: [],
      });
      navigate("/items", { replace: true });
    } catch (error) {
      console.error("[mfe-finance] Failed to create item", error);
      setFormError(error instanceof Error ? error.message : "Could not create item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Create Item"
      subtitle="Add a new finance item/procedure to the catalog."
      back={{ label: "Back to Items", href: "/items" }}
    >
      <SectionCard className="border-slate-200 shadow-sm p-6">
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Icon name="package" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Catalog Item Configuration</h3>
              <p className="text-xs text-slate-500">Configure item code, pricing, and default settings.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Item Name *" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
            <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input label="Item Code" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
            <Input label="Amount (₹) *" type="number" min="0" step="0.01" value={amountVal} onChange={(e) => setAmountVal(e.target.value)} required />
            
            <Select
              label="Tax Preference"
              value={taxPreference}
              onChange={(e) => setTaxPreference(e.target.value)}
              options={[
                { value: "TAXABLE", label: "Taxable" },
                { value: "NON_TAXABLE", label: "Non-Taxable" },
              ]}
            />
            
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3 justify-center">
              <div className="flex items-center gap-3">
                <Switch checked={rateEditable} onChange={setRateEditable} />
                <label className="text-sm font-semibold text-slate-700">Rate Editable</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={taxInclude} onChange={setTaxInclude} />
                <label className="text-sm font-semibold text-slate-700">Tax Included</label>
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-center">
              <div className="flex items-center gap-3">
                <Switch checked={discountApplicable} onChange={setDiscountApplicable} />
                <label className="text-sm font-semibold text-slate-700">Discount Applicable</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={couponApplicable} onChange={setCouponApplicable} />
                <label className="text-sm font-semibold text-slate-700">Coupon Applicable</label>
              </div>
            </div>
          </div>

          <Textarea label="Description" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-start gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate("/items")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function ItemsEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [itemName, setItemName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [amountVal, setAmountVal] = useState("");
  const [taxPreference, setTaxPreference] = useState("NON_TAXABLE");
  const [status, setStatus] = useState("Enabled");
  const [itemDesc, setItemDesc] = useState("");
  const [rateEditable, setRateEditable] = useState(true);
  const [taxInclude, setTaxInclude] = useState(true);
  const [discountApplicable, setDiscountApplicable] = useState(true);
  const [couponApplicable, setCouponApplicable] = useState(true);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadItem() {
      if (!id) return;
      try {
        const res = await financeApi.items.detail<any>(id);
        const data = res.data;
        if (active && data) {
          setItemName(data.name || "");
          setDisplayName(data.displayName || "");
          setItemCode(data.code || "");
          setAmountVal(String(data.amount || 0));
          setTaxPreference(data.taxPreference || "NON_TAXABLE");
          setStatus(data.status || "Enabled");
          setItemDesc(data.description || "");
          setRateEditable(Boolean(data.rateEditable));
          setTaxInclude(Boolean(data.taxInclude));
          setDiscountApplicable(Boolean(data.discountApplicable));
          setCouponApplicable(Boolean(data.couponApplicable));
        }
      } catch (error) {
        console.error("Failed to load item detail", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadItem();
    return () => { active = false; };
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!itemName.trim()) {
      setFormError("Item Name is required.");
      return;
    }

    setSaving(true);
    try {
      await financeApi.items.update(id!, {
        uid: id,
        name: itemName.trim(),
        displayName: displayName.trim() || itemName.trim(),
        code: itemCode.trim() || undefined,
        description: itemDesc.trim() || undefined,
        status,
        taxPreference,
        amount: Number(amountVal) || 0,
        rateEditable,
        taxInclude,
        taxableAmount: Number(amountVal) || 0,
        taxAmount: 0,
        netRate: Number(amountVal) || 0,
        discountApplicable,
        couponApplicable,
        displayOrder: 0,
        taxList: [],
      });
      navigate("/finance/items");
    } catch (error) {
      console.error("[mfe-finance] Failed to update item", error);
      setFormError(error instanceof Error ? error.message : "Could not update item.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading item...</div>;
  }

  return (
    <PageShell
      title="Edit Item"
      subtitle="Modify catalog item properties."
      back={{ label: "Back to Items", href: "/items" }}
    >
      <SectionCard className="border-slate-200 shadow-sm p-6">
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Icon name="package" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Catalog Item Configuration</h3>
              <p className="text-xs text-slate-500">Update item details for invoicing and tracking.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Item Name *" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
            <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input label="Item Code" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
            <Input label="Amount (₹) *" type="number" min="0" step="0.01" value={amountVal} onChange={(e) => setAmountVal(e.target.value)} required />
            
            <Select
              label="Tax Preference"
              value={taxPreference}
              onChange={(e) => setTaxPreference(e.target.value)}
              options={[
                { value: "TAXABLE", label: "Taxable" },
                { value: "NON_TAXABLE", label: "Non-Taxable" },
              ]}
            />
            
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3 justify-center">
              <div className="flex items-center gap-3">
                <Switch checked={rateEditable} onChange={setRateEditable} />
                <label className="text-sm font-semibold text-slate-700">Rate Editable</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={taxInclude} onChange={setTaxInclude} />
                <label className="text-sm font-semibold text-slate-700">Tax Included</label>
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-center">
              <div className="flex items-center gap-3">
                <Switch checked={discountApplicable} onChange={setDiscountApplicable} />
                <label className="text-sm font-semibold text-slate-700">Discount Applicable</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={couponApplicable} onChange={setCouponApplicable} />
                <label className="text-sm font-semibold text-slate-700">Coupon Applicable</label>
              </div>
            </div>
          </div>

          <Textarea label="Description" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} />

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-start gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate("/items")}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

export { ItemsPage, ItemsCreatePage, ItemsEditPage };
