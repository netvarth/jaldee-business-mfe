import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, SectionCard, Select } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import {
  useCreateOrdersItem,
  useOrdersItemDetail,
  useOrdersItemFormSettings,
  useUpdateOrdersItem,
} from "../queries/orders";
import { buildOrdersItemDetailHref, buildOrdersModuleHref } from "../services/orders";
import type { OrdersItemSettingsOption } from "../types";

type ItemAttribute = {
  attribute: string;
  position: number;
  values: string[];
};

type ItemFormState = {
  itemName: string;
  itemDescription: string;
  itemLongDescription: string;
  itemCategory: string;
  itemProperty: string;
  itemSource: string;
  itemGroup: string[];
  itemType: string;
  itemSKU: string;
  itemManufacturer: string;
  batchApplicable: boolean;
  isInventory: boolean;
  itemUnits: string[];
  HSNCode: string;
  itemTax: string[];
  taxPreference: string;
  itemCompositions: string[];
  itemAttributes: ItemAttribute[];
  reorderQuantity: string;
};

const initialFormState: ItemFormState = {
  itemName: "",
  itemDescription: "",
  itemLongDescription: "",
  itemCategory: "",
  itemProperty: "CAPSULE",
  itemSource: "GENERAL",
  itemGroup: [],
  itemType: "",
  itemSKU: "",
  itemManufacturer: "",
  batchApplicable: false,
  isInventory: true,
  itemUnits: [],
  HSNCode: "",
  itemTax: [],
  taxPreference: "",
  itemCompositions: [],
  itemAttributes: [],
  reorderQuantity: "",
};

const itemProperties = [
  { value: "CAPSULE", label: "Capsule" },
  { value: "TABLET", label: "Tablet" },
  { value: "SYRUP", label: "Syrup" },
  { value: "OTHER", label: "Other" },
];

const itemSources = [
  { value: "GENERAL", label: "General" },
  { value: "ALLOPATHIC", label: "Allopathic" },
  { value: "AYURVEDIC", label: "Ayurvedic" },
  { value: "HOMEOPATHIC", label: "Homeopathic" },
  { value: "DIET", label: "Diet" },
];

const taxPreferenceOptions = [
  { value: "", label: "Select tax preference" },
  { value: "TAXABLE", label: "Taxable" },
  { value: "EXEMPT", label: "Exempt" },
];

export function OrdersItemCreate() {
  const { basePath, product, routeParams } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const itemId = routeParams?.recordId ?? "";
  const isUpdate = routeParams?.subview === "update" && Boolean(itemId);
  const settingsQuery = useOrdersItemFormSettings();
  const detailQuery = useOrdersItemDetail(isUpdate ? itemId : null);
  const createItem = useCreateOrdersItem();
  const updateItem = useUpdateOrdersItem();
  const [form, setForm] = useState<ItemFormState>(initialFormState);
  const [attributeDraft, setAttributeDraft] = useState({ attribute: "", value: "" });
  const [error, setError] = useState("");
  const listHref = useMemo(() => buildOrdersModuleHref(basePath, product, "items"), [basePath, product]);

  useEffect(() => {
    if (!isUpdate || !detailQuery.data?.raw) return;
    setForm(mapDetailToForm(detailQuery.data.raw as any));
  }, [detailQuery.data?.raw, isUpdate]);

  const settings = settingsQuery.data;
  const saving = createItem.isPending || updateItem.isPending;
  const loading = settingsQuery.isLoading || (isUpdate && detailQuery.isLoading);
  const hasTax = form.itemTax.length > 0;
  const canSubmit = form.itemName.trim().length >= 3 && (!hasTax || Boolean(form.taxPreference)) && !saving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    const payload = buildItemPayload(form, isUpdate ? itemId : "");

    try {
      const result = isUpdate ? await updateItem.mutateAsync(payload) : await createItem.mutateAsync(payload);
      const nextId = readSavedItemId(result) || itemId;
      navigate(nextId ? buildOrdersItemDetailHref(basePath, nextId, product) : listHref);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Item could not be saved.");
    }
  }

  function updateField<K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addAttributeValue() {
    const attribute = attributeDraft.attribute.trim();
    const value = attributeDraft.value.trim();
    if (!attribute || !value) return;

    setForm((current) => {
      const existingIndex = current.itemAttributes.findIndex((item) => item.attribute.toLowerCase() === attribute.toLowerCase());
      const nextAttributes = [...current.itemAttributes];

      if (existingIndex >= 0) {
        const existing = nextAttributes[existingIndex];
        nextAttributes[existingIndex] = {
          ...existing,
          values: existing.values.includes(value) ? existing.values : [...existing.values, value],
        };
      } else if (nextAttributes.length < 5) {
        nextAttributes.push({ attribute, position: nextAttributes.length + 1, values: [value] });
      }

      return { ...current, itemAttributes: nextAttributes };
    });
    setAttributeDraft({ attribute: "", value: "" });
  }

  function removeAttribute(index: number) {
    setForm((current) => ({
      ...current,
      itemAttributes: current.itemAttributes
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })),
    }));
  }

  if (loading) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="text-sm text-slate-500">Loading item form...</div>
      </SectionCard>
    );
  }

  if (settingsQuery.isError || (isUpdate && detailQuery.isError)) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="Item form unavailable" description="The item form data could not be loaded." />
      </SectionCard>
    );
  }

  return (
    <div data-testid="orders-item-create-page" className="space-y-3">
      <div className="border-b border-slate-200 bg-white px-1 py-3">
        <button
          type="button"
          className="flex items-center gap-2 border-0 bg-transparent p-0 text-base font-semibold text-slate-900 transition hover:text-[#4C1D95]"
          onClick={() => navigate(listHref)}
        >
          <ArrowLeftIcon />
          <span>{isUpdate ? "Update Item" : "Create Item"}</span>
        </button>
      </div>

      <div className="px-1">
        <h1 className="m-0 text-xl font-semibold text-slate-900">{isUpdate ? "Inventory Item" : "New Inventory Item"}</h1>
        <div className="mt-1 text-sm text-slate-500">{isUpdate ? "Update Item Information" : "Create Item Information"}</div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[minmax(300px,0.34fr)_1fr]">
        <SectionCard title="Display Image" className="border-slate-200 shadow-sm">
          <div className="flex min-h-[230px] flex-col items-center justify-center rounded bg-white text-center text-xs text-slate-500">
            <div className="flex h-24 w-24 items-center justify-center rounded-md bg-slate-50 text-slate-300">
              <ImagePlaceholderIcon />
            </div>
            <div className="mt-5 max-w-[280px] font-medium text-slate-400">
              Set the product thumbnail image. Only png, jpg and jpeg image files are accepted.
            </div>
          </div>
        </SectionCard>

        <SectionCard className="border-slate-200 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <TextField label="Item Name" required value={form.itemName} onChange={(value) => updateField("itemName", value)} />
              <div className="mt-1 text-xs text-slate-400">An item name is required and recommended to be unique.</div>
            </div>
            <SelectField label="Item Property" value={form.itemProperty} options={itemProperties} onChange={(value) => updateField("itemProperty", value)} />
            <div className="md:col-span-2">
              <SelectField label="Item Source" value={form.itemSource} options={itemSources} onChange={(value) => updateField("itemSource", value)} />
            </div>
            <div className="md:col-span-2">
              <TextAreaField label="Short Description" value={form.itemDescription} onChange={(value) => updateField("itemDescription", value)} />
            </div>
            <div className="md:col-span-2">
              <TextAreaField label="Long Description" value={form.itemLongDescription} onChange={(value) => updateField("itemLongDescription", value)} rows={5} />
            </div>
            <SelectField label="Category" value={form.itemCategory} options={toSettingOptions(settings?.categories, "Select category")} onChange={(value) => updateField("itemCategory", value)} />
            <MultiSelectField label="Group" value={form.itemGroup} options={toSettingOptions(settings?.groups)} onChange={(value) => updateField("itemGroup", value)} />
            <SelectField label="Type" value={form.itemType} options={toSettingOptions(settings?.types, "Select type")} onChange={(value) => updateField("itemType", value)} />
            <SelectField label="Manufacturer" value={form.itemManufacturer} options={toSettingOptions(settings?.manufacturers, "Select manufacturer")} onChange={(value) => updateField("itemManufacturer", value)} />
            <MultiSelectField label="Item Unit" value={form.itemUnits} options={toSettingOptions(settings?.units)} onChange={(value) => updateField("itemUnits", value)} />
            <SelectField label="Track Inventory" value={String(form.isInventory)} options={booleanOptions} onChange={(value) => updateField("isInventory", value === "true")} />
            <SelectField label="Batch Applicable" value={String(form.batchApplicable)} options={booleanOptions} onChange={(value) => updateField("batchApplicable", value === "true")} />
            <SelectField label="HSN Code" value={form.HSNCode} options={toSettingOptions(settings?.hsn, "Select HSN")} onChange={(value) => updateField("HSNCode", value)} />
            <MultiSelectField label="Item Composition" value={form.itemCompositions} options={toSettingOptions(settings?.compositions)} onChange={(value) => updateField("itemCompositions", value)} />
            <TextField label="Item Threshold" value={form.reorderQuantity} inputMode="numeric" onChange={(value) => updateField("reorderQuantity", value.replace(/\D/g, ""))} />
            <TextField label="SKU" value={form.itemSKU} onChange={(value) => updateField("itemSKU", value)} />
            <MultiSelectField label="Item Tax" value={form.itemTax} options={toSettingOptions(settings?.taxes)} onChange={(value) => updateField("itemTax", value)} />
            {hasTax ? (
              <SelectField label="Tax Preference" value={form.taxPreference} options={taxPreferenceOptions} onChange={(value) => updateField("taxPreference", value)} />
            ) : null}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">Item Attributes</div>
            {form.itemAttributes.length ? (
              <div className="mb-3 space-y-2">
                {form.itemAttributes.map((item, index) => (
                  <div key={`${item.attribute}-${index}`} className="flex items-start justify-between gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.attribute}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {item.values.map((value) => (
                          <span key={value} className="rounded bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAttribute(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={attributeDraft.attribute}
                onChange={(event) => setAttributeDraft((current) => ({ ...current, attribute: event.target.value }))}
                placeholder="Option Name"
                className={inputClassName}
              />
              <input
                value={attributeDraft.value}
                onChange={(event) => setAttributeDraft((current) => ({ ...current, value: event.target.value }))}
                placeholder="Option Value"
                className={inputClassName}
              />
              <Button type="button" variant="outline" onClick={addAttributeValue} disabled={form.itemAttributes.length >= 5 && !attributeDraft.attribute}>
                Add Option
              </Button>
            </div>
          </div>

          {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(listHref)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {saving ? "Saving..." : isUpdate ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </SectionCard>
      </form>
    </div>
  );
}

const inputClassName =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-[#4C1D95] focus:outline-none focus:ring-2 focus:ring-[#4C1D95]/15";

const booleanOptions = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function TextField({
  label,
  value,
  required,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  inputMode?: "numeric";
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}{required ? " *" : ""}</span>
      <input value={value} required={required} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} className={inputClassName} />
    </label>
  );
}

function TextAreaField({ label, value, rows = 3, onChange }: { label: string; value: string; rows?: number; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className={`${inputClassName} h-auto py-2`} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <Select value={value} options={options} onChange={(event) => onChange(event.target.value)} className="w-full" />
    </label>
  );
}

function MultiSelectField({ label, value, options, onChange }: { label: string; value: string[]; options: Array<{ value: string; label: string }>; onChange: (value: string[]) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select
        multiple
        value={value}
        onChange={(event) => onChange(Array.from(event.target.selectedOptions).map((option) => option.value))}
        className={`${inputClassName} h-[92px] py-2`}
      >
        {options.filter((option) => option.value).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function toSettingOptions(options: OrdersItemSettingsOption[] | undefined, placeholder = "Select") {
  return [
    { value: "", label: placeholder },
    ...(options ?? []).map((option) => ({ value: option.id, label: option.label })),
  ];
}

function mapDetailToForm(raw: any): ItemFormState {
  return {
    ...initialFormState,
    itemName: readText(raw?.name),
    itemDescription: readText(raw?.shortDesc),
    itemLongDescription: readText(raw?.internalDesc),
    itemCategory: readText(raw?.itemCategory?.categoryCode),
    itemProperty: readText(raw?.itemPropertyType) || initialFormState.itemProperty,
    itemSource: readText(raw?.itemSourceEnum) || initialFormState.itemSource,
    itemGroup: readStringArray(raw?.itemGroups),
    itemType: readText(raw?.itemType?.typeCode),
    itemSKU: readText(raw?.sku),
    itemManufacturer: readText(raw?.itemManufacturer?.manufacturerCode),
    batchApplicable: Boolean(raw?.isBatchApplicable),
    isInventory: raw?.isInventoryItem !== false,
    itemUnits: readStringArray(raw?.itemUnits),
    HSNCode: readText(raw?.hsnCode?.hsnCode),
    itemTax: readStringArray(raw?.tax),
    taxPreference: readText(raw?.taxPreference),
    itemCompositions: readStringArray(raw?.composition),
    itemAttributes: Array.isArray(raw?.itemAttributes) ? raw.itemAttributes : [],
    reorderQuantity: raw?.reorderQuantity == null ? "" : String(raw.reorderQuantity),
  };
}

function buildItemPayload(form: ItemFormState, itemId: string) {
  const payload: Record<string, unknown> = {
    name: form.itemName.trim(),
    shortDesc: form.itemDescription.trim(),
    internalDesc: form.itemLongDescription.trim(),
    itemGroups: form.itemGroup.map(String),
    tax: form.itemTax,
    composition: form.itemCompositions,
    itemAttributes: form.itemAttributes,
    itemUnits: form.itemUnits,
    sku: form.itemSKU.trim(),
    isBatchApplicable: form.batchApplicable,
    isInventoryItem: form.isInventory,
    attachments: [],
    orderCategory: "SALES_ORDER",
    itemNature: form.itemAttributes.length ? "VIRTUAL_ITEM" : "",
    itemPropertyType: form.itemProperty,
    itemSourceEnum: form.itemSource,
  };

  if (itemId) payload.spCode = itemId;
  if (form.itemCategory) payload.itemCategory = { categoryCode: form.itemCategory };
  if (form.itemType) payload.itemType = { typeCode: form.itemType };
  if (form.HSNCode) payload.hsnCode = { hsnCode: form.HSNCode };
  if (form.itemManufacturer) payload.itemManufacturer = { manufacturerCode: form.itemManufacturer };
  if (form.taxPreference) payload.taxPreference = form.taxPreference;
  if (form.reorderQuantity) payload.reorderQuantity = Number(form.reorderQuantity);

  return payload;
}

function readSavedItemId(result: any) {
  return readText(result?.spCode) || readText(result?.uid) || readText(result?.id) || (typeof result === "string" ? result : "");
}

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M11.5 4L6.5 9L11.5 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <rect x="8" y="12" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="3" />
      <path d="M15 38L25 28L32 35L36 31L45 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="38" cy="22" r="4" fill="currentColor" />
    </svg>
  );
}
