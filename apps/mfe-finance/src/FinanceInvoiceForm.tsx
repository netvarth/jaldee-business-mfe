import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import { Button, Combobox, Input, PageHeader, SectionCard, Select, Textarea } from "@jaldee/design-system";
import type { ComboboxOption } from "@jaldee/design-system";
import { financeApi } from "./lib/financeApi";

interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  date: string;
}

interface FinanceCatalogOption extends ComboboxOption {
  price?: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export default function FinanceInvoiceForm() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [consumerName, setConsumerName] = useState("");
  const [consumerPhone, setConsumerPhone] = useState("");
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [financeCatalogOptions, setFinanceCatalogOptions] = useState<FinanceCatalogOption[]>([]);
  
  // Item builder states
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItemCatalogValue, setNewItemCatalogValue] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemDate, setNewItemDate] = useState(new Date().toISOString().slice(0, 10));

  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync amount with items total
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    setAmount(String(total));
  }, [items]);

  const selectedCatalogOption = useMemo(
    () => financeCatalogOptions.find((option) => option.value === newItemCatalogValue),
    [financeCatalogOptions, newItemCatalogValue]
  );

  function resetItemBuilder() {
    setNewItemCatalogValue("");
    setNewItemName("");
    setNewItemQty(1);
    setNewItemPrice(0);
    setNewItemDate(new Date().toISOString().slice(0, 10));
  }

  useEffect(() => {
    let active = true;
    async function loadFormData() {
      try {
        const [categoriesResult, statusesResult, servicesResult, itemsResult] = await Promise.allSettled([
          financeApi.categories.byFilter<any>({
            "categoryType-eq": "Invoice",
            "status-eq": "Enabled",
            from: 0,
            count: 100,
          }),
          financeApi.statuses.byFilter<any>({
            "categoryType-eq": "Invoice",
            "status-eq": "Enabled",
            from: 0,
            count: 100,
          }),
          financeApi.services.list<any[]>(),
          financeApi.items.list<any[]>(),
        ]);

        if (!active) return;

        const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
        const statusesResponse = statusesResult.status === "fulfilled" ? statusesResult.value : null;
        const servicesResponse = servicesResult.status === "fulfilled" ? servicesResult.value : null;
        const itemsResponse = itemsResult.status === "fulfilled" ? itemsResult.value : null;

        const categories = Array.isArray(categoriesResponse?.data?.content) ? categoriesResponse.data.content : Array.isArray(categoriesResponse?.data) ? categoriesResponse.data : [];
        const statuses = Array.isArray(statusesResponse?.data?.content) ? statusesResponse.data.content : Array.isArray(statusesResponse?.data) ? statusesResponse.data : [];
        const services = Array.isArray(servicesResponse?.data) ? servicesResponse.data : [];
        const items = Array.isArray(itemsResponse?.data?.content) ? itemsResponse.data.content : Array.isArray(itemsResponse?.data) ? itemsResponse.data : [];

        const nextCategoryOptions = categories.map((item: any) => ({
          value: String(item.categoryId ?? item.uid ?? item.id),
          label: String(item.name ?? item.categoryName ?? "Category"),
        }));
        const nextStatusOptions = statuses.map((item: any) => ({
          value: String(item.id ?? item.uid),
          label: String(item.name ?? item.statusName ?? "Status"),
        }));

        setCategoryOptions(nextCategoryOptions);
        setStatusOptions(nextStatusOptions);
        setCategoryId(current => current || nextCategoryOptions[0]?.value || "");
        setStatusId(current => current || nextStatusOptions[0]?.value || "");

        const combined: FinanceCatalogOption[] = [
          ...services
            .map((srv: any, index: number) => {
              const label = String(srv.name || srv.displayName || "").trim();
              if (!label) {
                return null;
              }
              const price = Number(srv.totalAmount ?? srv.price ?? srv.amount ?? 0);
              const uid = String(srv.id ?? srv.uid ?? srv.serviceId ?? label ?? index);
              return {
                value: `service:${uid}`,
                label,
                description: `Service${price > 0 ? ` • ${formatCurrency(price)}` : ""}`,
                price,
              };
            })
            .filter(Boolean) as FinanceCatalogOption[],
          ...items
            .map((it: any, index: number) => {
              const label = String(it.displayName || it.name || it.itemName || "").trim();
              if (!label) {
                return null;
              }
              const price = Number(it.amount ?? it.price ?? 0);
              const uid = String(it.uid ?? it.id ?? it.itemId ?? label ?? index);
              const code = String(it.code || "").trim();
              return {
                value: `item:${uid}`,
                label,
                description: `Finance Item${code ? ` • ${code}` : ""}${price > 0 ? ` • ${formatCurrency(price)}` : ""}`,
                price,
              };
            })
            .filter(Boolean) as FinanceCatalogOption[],
        ];
        setFinanceCatalogOptions(combined);

        if (isEditing && id) {
          const invoiceRes = await financeApi.invoices.detailGeneral(id);
          const invoiceData: any = invoiceRes.data;
          if (invoiceData && active) {
            setCategoryId(String(invoiceData.categoryId || ""));
            setStatusId(String(invoiceData.statusId || ""));
            setInvoiceDate(invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
            setDueDate(invoiceData.dueDate ? new Date(invoiceData.dueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
            setConsumerName(invoiceData.consumerName || "");
            setConsumerPhone(invoiceData.consumerPhone || "");
            setDescription(invoiceData.description || invoiceData.notesForCustomer || "");
            
            // Load existing items
            if (Array.isArray(invoiceData.detailList)) {
              const loadedItems = invoiceData.detailList.map((item: any, idx: number) => ({
                id: item.uid || `loaded-item-${idx}`,
                name: item.itemName || "Service Item",
                qty: Number(item.quantity || 1),
                price: Number(item.price || 0),
                date: item.processedDate ? new Date(item.processedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              }));
              setItems(loadedItems);
            }
          }
        }
      } catch (error) {
        if (!active) return;
        console.error("[mfe-finance] Failed to load invoice form data", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadFormData();
    return () => { active = false; };
  }, [id, isEditing]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(amount);
    if (!consumerName.trim()) {
      setFormError("Consumer Name is required.");
      return;
    }
    if (items.length === 0) {
      setFormError("At least one invoice item must be added.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        categoryId: Number(categoryId) || undefined,
        statusId: Number(statusId) || undefined,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        consumerName: consumerName.trim(),
        consumerPhone: consumerPhone.trim(),
        netTotal: parsedAmount,
        netTotalAfterDiscount: parsedAmount,
        amountDue: parsedAmount,
        description: description.trim() || undefined,
        locationUid: mfeProps.location?.id ?? undefined,
        locationName: mfeProps.location?.name ?? undefined,
        partyType: "B2C",
        supplyType: "INTRA_STATE",
        autoGenerated: false,
        sourceService: "API_GATEWAY",
        feature: "BASE_CRM",
        subFeature: "BASE_CRM",
        featureModule: "BASE_CRM_CORE",
        detailList: items.map((item) => ({
          itemName: item.name,
          itemType: "ADHOC_ITEM",
          itemNature: "SINGLE_ITEM",
          quantity: item.qty,
          price: item.price,
          netTotal: item.price * item.qty,
          netTotalAfterDiscount: item.price * item.qty,
          netRate: item.price,
          sourceService: "API_GATEWAY",
          feature: "BASE_CRM",
          subFeature: "BASE_CRM",
          featureModule: "BASE_CRM_CORE",
          locationUid: mfeProps.location?.id ?? undefined,
          processedDate: new Date(item.date).toISOString(),
        }))
      };

      if (isEditing && id) {
        await financeApi.invoices.updateGeneral(id, payload);
      } else {
        await financeApi.invoices.createGeneral(payload);
      }
      navigate("/finance/invoice");
    } catch (error) {
      console.error("[mfe-finance] Failed to save invoice", error);
      setFormError(error instanceof Error ? error.message : "Could not save invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading invoice form...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isEditing ? "Edit Invoice" : "Create Invoice"}
        subtitle={isEditing ? "Modify an existing invoice." : "Issue new billing manually."}
        actions={<Button variant="outline" onClick={() => navigate("/finance/invoice")}>Back</Button>}
      />
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              options={[{ value: "", label: "Select category" }, ...categoryOptions]}
            />
            <Select
              label="Status"
              value={statusId}
              onChange={(event) => setStatusId(event.target.value)}
              options={[{ value: "", label: "Select status" }, ...statusOptions]}
            />
            <Input label="Invoice Date *" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} required />
            <Input label="Due Date *" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
            <Input label="Customer Name *" value={consumerName} onChange={(event) => setConsumerName(event.target.value)} required />
            <Input label="Customer Phone" value={consumerPhone} onChange={(event) => setConsumerPhone(event.target.value)} />
            <Input label="Total Amount (Calculated)" type="text" value={formatCurrency(Number(amount))} readOnly disabled className="bg-slate-50 font-semibold" />
          </div>

          <Textarea label="Notes" value={description} onChange={(event) => setDescription(event.target.value)} />

          {/* Invoice Items Builder Section */}
          <div className="mt-4 border-t border-slate-200 pt-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Procedure/Item Details</h3>
            
            {/* Items Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <th className="px-4 py-3">Procedure/Item</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                        No items added yet. Please add at least one item below.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-center">{item.qty}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(item.price * item.qty)}</td>
                        <td className="px-4 py-3 text-slate-500">{item.date}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setItems(curr => curr.filter(i => i.id !== item.id))}
                            className="text-rose-600 hover:text-rose-900 font-semibold transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Item Form Row */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid gap-4 md:grid-cols-[2fr_1fr_1fr_1.5fr_auto] items-end">
              <div>
                <Combobox
                  label="Procedure/Item *"
                  placeholder="Choose Procedure/Item"
                  searchPlaceholder="Search finance items and services"
                  emptyMessage="No matching finance item found"
                  options={financeCatalogOptions}
                  value={newItemCatalogValue}
                  onValueChange={(value) => {
                    setNewItemCatalogValue(value);
                    const option = financeCatalogOptions.find((entry) => entry.value === value);
                    if (!option) {
                      return;
                    }
                    setNewItemName(option.label);
                    setNewItemPrice(option.price ?? 0);
                  }}
                  hint={selectedCatalogOption?.description ?? "Choose from the finance catalog to auto-fill price."}
                  id="invoice-item-picker"
                />
              </div>

              <div>
                <Input
                  label="Qty"
                  type="number"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Number(e.target.value) || 1)}
                />
              </div>

              <div>
                <Input
                  label="Price (₹)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(Number(e.target.value) || 0)}
                />
              </div>

              <div>
                <Input
                  label="Date"
                  type="date"
                  value={newItemDate}
                  onChange={(e) => setNewItemDate(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (!newItemName.trim()) return;
                    const item: InvoiceItem = {
                      id: `item-${Date.now()}`,
                      name: newItemName.trim(),
                      qty: newItemQty,
                      price: newItemPrice,
                      date: newItemDate,
                    };
                    setItems(curr => [...curr, item]);
                    resetItemBuilder();
                  }}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetItemBuilder}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          {formError ? (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/finance/invoice")}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : (isEditing ? "Update Invoice" : "Create Invoice")}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
