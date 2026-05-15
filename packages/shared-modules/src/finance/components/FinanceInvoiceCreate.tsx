import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Dialog, DialogFooter, EmptyState, Icon, Input, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useCreateFinanceCategory, useCreateFinanceInvoice, useFinanceInvoiceCategories } from "../queries/finance";
import { SharedFinanceLayout } from "./shared";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function readErrorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Invoice could not be created.";
}

export function FinanceInvoiceCreate() {
  const { location, navigate } = useSharedModulesContext();
  const categoriesQuery = useFinanceInvoiceCategories();
  const createInvoice = useCreateFinanceInvoice();

  const categories = categoriesQuery.data ?? [];
  const [customerSearch, setCustomerSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState(location?.id || "");
  const [invoiceNo, setInvoiceNo] = useState("3"); // Example value from screenshot
  const [referralNo, setReferralNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayIsoDate());
  const [dueDate, setDueDate] = useState("");
  const [subject, setSubject] = useState("");
  const [notesForProvider, setNotesForProvider] = useState("");
  const [notesForCustomer, setNotesForCustomer] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  
  const [items, setItems] = useState<Array<{ id: string; name: string; quantity: string; price: string }>>([]);
  const [formError, setFormError] = useState("");

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const createCategory = useCreateFinanceCategory();

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      const financeCat = categories.find(c => c.name.toLowerCase() === "finance") || categories[0];
      setCategoryId(financeCat.id);
    }
  }, [categories, categoryId]);

  const total = useMemo(() => {
    return items.reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price) || 0;
      return acc + (q * p);
    }, 0);
  }, [items]);

  const handleAddItem = () => {
    setItems([...items, { id: crypto.randomUUID(), name: "", quantity: "1", price: "" }]);
  };

  const handleUpdateItem = (id: string, field: string, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const result = await createCategory.mutateAsync({
        name: newCategoryName.trim(),
        categoryType: "Invoice",
        status: "Enable",
      });
      
      const newId = (result as any)?.id || (result as any)?.uid;
      if (newId) {
        setCategoryId(newId);
      }
      
      setNewCategoryName("");
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error("Failed to create category:", error);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!customerSearch.trim()) {
      setFormError("Customer selection is required.");
      return;
    }
    if (items.length === 0) {
      setFormError("At least one item is required.");
      return;
    }

    await createInvoice.mutateAsync({
      locationId: locationId || undefined,
      categoryId: categoryId || undefined,
      invoiceDate,
      dueDate: dueDate || undefined,
      invoiceLabel: subject.trim() || undefined,
      referenceNo: referralNo.trim() || undefined,
      notesForCustomer: notesForCustomer.trim() || undefined,
      notesForProvider: notesForProvider.trim() || undefined,
      termsConditions: termsConditions.trim() || undefined,
      providerConsumerId: customerSearch.trim(), // Assuming search value is the ID for now
      detailList: items.map(item => ({
        itemType: "ADHOC_ITEM",
        itemName: item.name.trim(),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
      })),
    });

    navigate?.("/finance/invoices");
  };

  return (
    <SharedFinanceLayout
      title="Create Invoice"
      subtitle="Create Invoice for your customers"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" iconOnly icon={<Icon name="list" className="h-5 w-5" />} className="bg-indigo-900 text-white hover:bg-indigo-800" />
          <Button variant="outline" size="sm" icon={<Icon name="globe" className="h-4 w-4" />} className="text-indigo-900 border-indigo-900">Actions</Button>
        </div>
      }
    >
      <SectionCard className="border-slate-200 shadow-sm overflow-visible">
        {categoriesQuery.isError ? (
          <EmptyState title="Invoice setup unavailable" description="Invoice categories could not be loaded right now." />
        ) : (
          <form className="grid gap-6 p-2" onSubmit={handleSubmit}>
            {/* Customer Search */}
            <div className="relative">
              <Input
                placeholder="Enter Name or Phone or Email or Id"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                className="h-12 text-slate-600 bg-slate-50 border-slate-200"
                icon={<Icon name="search" className="h-5 w-5 text-slate-400" />}
              />
            </div>

            <button type="button" className="text-indigo-900 font-semibold text-sm flex items-center gap-1 w-fit hover:underline">
              <span className="text-lg">+</span> Billing Address
            </button>

            {/* Form Fields Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Invoice Category</label>
                <div className="flex items-center">
                  <Select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    containerClassName="flex-1"
                    className="rounded-r-none border-r-0 h-[38px]"
                    options={categories.map((category) => ({ value: category.id, label: category.name }))}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="bg-indigo-900 text-white h-[38px] w-10 p-0 rounded-l-none shrink-0" 
                    icon={<span className="text-xl">+</span>} 
                    onClick={() => setIsCategoryModalOpen(true)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Location</label>
                <Select
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                  options={[
                    { value: location?.id || "", label: location?.place || "Select Location" }
                  ]}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Invoice#</label>
                <Input
                  value={invoiceNo}
                  onChange={(event) => setInvoiceNo(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Referral Number</label>
                <Input
                  placeholder="Referral Number"
                  value={referralNo}
                  onChange={(event) => setReferralNo(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Input
                  label={<span className="font-bold text-slate-700">Invoice Date</span>}
                  type="date"
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Input
                  label={<span className="font-bold text-slate-700">Due Date</span>}
                  type="date"
                  placeholder="DD/MM/YYYY"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Subject</label>
              <Input
                placeholder="Let your customer know what this invoice is for"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            {/* Items Section */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 min-h-[100px]">
              <div className="flex flex-col gap-4">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_120px_40px] gap-3 items-end">
                    <Input label="Item" value={item.name} onChange={(e) => handleUpdateItem(item.id, "name", e.target.value)} />
                    <Input label="Qty" type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, "quantity", e.target.value)} />
                    <Input label="Price" type="number" value={item.price} onChange={(e) => handleUpdateItem(item.id, "price", e.target.value)} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="text-rose-600 p-0 h-10 w-10">✕</Button>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddItem}
                  className="w-fit text-indigo-900 border-indigo-900 font-semibold"
                >
                  <span className="text-lg mr-2">+</span> Add Service/Item
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Your Notes</label>
                <Input placeholder="Private Note" value={notesForProvider} onChange={(e) => setNotesForProvider(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Customer Notes</label>
                <Input placeholder="Shared with customer" value={notesForCustomer} onChange={(e) => setNotesForCustomer(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">Terms & Conditions</label>
              <Input placeholder="Terms and condition" value={termsConditions} onChange={(e) => setTermsConditions(e.target.value)} />
            </div>

            {formError && (
              <div className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {formError}
              </div>
            )}

            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="bg-slate-500 text-white border-none hover:bg-slate-600" onClick={() => navigate?.("/finance/invoices")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createInvoice.isPending} className="bg-green-700 text-white hover:bg-green-800 border-none">
                  {createInvoice.isPending ? "Creating..." : "Save"}
                </Button>
              </div>
              <Button type="button" className="bg-indigo-900 text-white hover:bg-indigo-800 border-none">
                Save As Template
              </Button>
            </div>
          </form>
        )}
      </SectionCard>

      <Dialog
        open={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Create Invoice Category"
        size="md"
      >
        <div className="space-y-6 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="Enter Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              fullWidth
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Category Type</label>
            <Input value="Invoice" disabled fullWidth />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-8"
            >
              CLOSE
            </Button>
            <Button 
              onClick={handleCreateCategory} 
              loading={createCategory.isPending}
              disabled={!newCategoryName.trim()}
              className="bg-indigo-200 text-indigo-900 hover:bg-indigo-300 px-8 border-0"
            >
              SAVE
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </SharedFinanceLayout>
  );
}
