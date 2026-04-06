import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DataTable,
  DataTableToolbar,
  Dialog,
  DialogFooter,
  Drawer,
  EmptyState,
  Input,
  PageHeader,
  SectionCard,
  Select,
  Textarea,
  type ColumnDef,
} from "@jaldee/design-system";
import { catalogueService, masterDataService } from "@/services";
import { formatWeight, getPurityDisplayName } from "@/lib/gold-erp-utils";
import type { ChargeType, EntityStatus, ItemType, JewelleryItem, Metal, MetalPurity } from "@/lib/gold-erp-types";

type ItemFormState = {
  itemCode: string;
  name: string;
  itemType: ItemType;
  metalUid: string;
  purityUid: string;
  typicalGrossWt: string;
  typicalNetWt: string;
  hsnCode: string;
  taxRate: string;
  description: string;
  availableOnline: boolean;
  chargeType: ChargeType;
  chargeValue: string;
  status: EntityStatus;
};

const itemTypeOptions = [
  { label: "Ring", value: "RING" },
  { label: "Necklace", value: "NECKLACE" },
  { label: "Bangle", value: "BANGLE" },
  { label: "Earring", value: "EARRING" },
] as const;

const statusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
] as const;

const chargeTypeOptions = [
  { label: "Per Gram", value: "PER_GRAM" },
  { label: "Flat", value: "FLAT" },
  { label: "Percentage", value: "PERCENTAGE" },
] as const;

function createEmptyForm(): ItemFormState {
  return {
    itemCode: "",
    name: "",
    itemType: "RING",
    metalUid: "",
    purityUid: "",
    typicalGrossWt: "",
    typicalNetWt: "",
    hsnCode: "",
    taxRate: "",
    description: "",
    availableOnline: false,
    chargeType: "PER_GRAM",
    chargeValue: "",
    status: "ACTIVE",
  };
}

function mapItemToForm(item: JewelleryItem): ItemFormState {
  return {
    itemCode: String(item.itemCode ?? ""),
    name: String(item.name ?? ""),
    itemType: (item.itemType ?? "RING") as ItemType,
    metalUid: String(item.metalUid ?? ""),
    purityUid: String(item.purityUid ?? ""),
    typicalGrossWt: String(item.typicalGrossWt ?? ""),
    typicalNetWt: String(item.typicalNetWt ?? ""),
    hsnCode: String(item.hsnCode ?? ""),
    taxRate: String(item.taxRate ?? ""),
    description: String(item.description ?? ""),
    availableOnline: Boolean(item.availableOnline),
    chargeType: (item.chargeType ?? "PER_GRAM") as ChargeType,
    chargeValue: String(item.chargeValue ?? ""),
    status: (item.status ?? "ACTIVE") as EntityStatus,
  };
}

function normalizeItem(item: JewelleryItem): JewelleryItem {
  return {
    ...item,
    itemUid: String(item.itemUid ?? ""),
    itemCode: String(item.itemCode ?? "-"),
    name: String(item.name ?? "Item"),
    itemType: item.itemType ?? "RING",
    metalUid: String(item.metalUid ?? ""),
    purityUid: String(item.purityUid ?? ""),
    metalName: item.metalName ?? "",
    status: item.status ?? "ACTIVE",
    typicalGrossWt: Number(item.typicalGrossWt ?? 0),
    typicalNetWt: Number(item.typicalNetWt ?? 0),
    taxRate: Number(item.taxRate ?? 0),
    chargeValue: Number(item.chargeValue ?? 0),
    availableOnline: Boolean(item.availableOnline),
  };
}

function getItemTypeVariant(itemType?: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (itemType === "RING") return "warning";
  if (itemType === "NECKLACE") return "info";
  if (itemType === "BANGLE") return "success";
  if (itemType === "EARRING") return "danger";
  return "neutral";
}

function getStatusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  return status === "ACTIVE" ? "success" : "neutral";
}

export default function CataloguePage() {
  const [items, setItems] = useState<JewelleryItem[]>([]);
  const [metals, setMetals] = useState<Metal[]>([]);
  const [purities, setPurities] = useState<MetalPurity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<JewelleryItem | null>(null);
  const [editingItem, setEditingItem] = useState<JewelleryItem | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [formState, setFormState] = useState<ItemFormState>(createEmptyForm());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogue() {
      setIsLoading(true);
      setError("");

      try {
        const [loadedItems, loadedMetals, loadedPurities] = await Promise.all([
          catalogueService.getItems(),
          masterDataService.getMetals(),
          masterDataService.getPurities(),
        ]);

        if (cancelled) return;

        setItems(Array.isArray(loadedItems) ? loadedItems.map(normalizeItem) : []);
        setMetals(Array.isArray(loadedMetals) ? loadedMetals : []);
        setPurities(Array.isArray(loadedPurities) ? loadedPurities : []);
      } catch (loadError) {
        console.error("[CataloguePage] failed to load catalogue", loadError);
        if (cancelled) return;
        setItems([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to load jewellery items.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCatalogue();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.itemCode.toLowerCase().includes(query);
        const matchesType = typeFilter === "all" || item.itemType === typeFilter;
        return matchesSearch && matchesType;
      }),
    [items, search, typeFilter],
  );

  const visiblePurities = useMemo(
    () => purities.filter((purity) => !formState.metalUid || purity.metalUid === formState.metalUid),
    [formState.metalUid, purities],
  );

  function updateForm<K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function openCreateDialog() {
    setEditingItem(null);
    setFormState(createEmptyForm());
    setIsItemDialogOpen(true);
  }

  function openEditDialog(item: JewelleryItem) {
    setSelectedItem(null);
    setEditingItem(item);
    setFormState(mapItemToForm(item));
    setIsItemDialogOpen(true);
  }

  async function reloadItems() {
    const loadedItems = await catalogueService.getItems();
    setItems(Array.isArray(loadedItems) ? loadedItems.map(normalizeItem) : []);
  }

  async function handleSaveItem() {
    if (!formState.itemCode.trim() || !formState.name.trim() || !formState.metalUid || !formState.purityUid) {
      setError("Item code, name, metal, and purity are required.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        itemCode: formState.itemCode.trim(),
        name: formState.name.trim(),
        itemType: formState.itemType,
        metalUid: formState.metalUid,
        purityUid: formState.purityUid,
        typicalGrossWt: Number(formState.typicalGrossWt || 0),
        typicalNetWt: Number(formState.typicalNetWt || 0),
        hsnCode: formState.hsnCode.trim(),
        taxRate: Number(formState.taxRate || 0),
        description: formState.description.trim() || undefined,
        availableOnline: formState.availableOnline,
        chargeType: formState.chargeType,
        chargeValue: Number(formState.chargeValue || 0),
        status: formState.status,
      };

      if (editingItem) {
        await catalogueService.updateItem(editingItem.itemUid, payload);
      } else {
        await catalogueService.createItem(payload);
      }

      await reloadItems();
      setIsItemDialogOpen(false);
      setEditingItem(null);
      setFormState(createEmptyForm());
    } catch (saveError) {
      console.error("[CataloguePage] failed to save item", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save item.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns = useMemo<ColumnDef<JewelleryItem>[]>(
    () => [
      {
        key: "itemCode",
        header: "Item Code",
        render: (item) => <span className="font-mono text-xs font-medium">{item.itemCode}</span>,
      },
      {
        key: "name",
        header: "Name",
        render: (item) => <span className="font-medium">{item.name}</span>,
      },
      {
        key: "itemType",
        header: "Type",
        render: (item) => <Badge variant={getItemTypeVariant(item.itemType)}>{item.itemType}</Badge>,
      },
      {
        key: "metalName",
        header: "Metal",
        render: (item) => item.metalName || "-",
      },
      {
        key: "purity",
        header: "Purity",
        render: (item) => getPurityDisplayName(item),
      },
      {
        key: "status",
        header: "Status",
        render: (item) => <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (item) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)}>
              View
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title="Jewellery Items"
          subtitle="Jewellery templates used during purchase receipt and tag generation"
          actions={
            <Button size="sm" onClick={openCreateDialog}>
              Create Item
            </Button>
          }
        />

        {error ? (
          <Alert variant="danger" title="Catalogue error">
            {error}
          </Alert>
        ) : null}

        <SectionCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <DataTableToolbar
              query={search}
              onQueryChange={setSearch}
              searchPlaceholder="Search by name or item code..."
              recordCount={filtered.length}
            />
            <div className="w-full md:max-w-[220px]">
              <Select
                label="Item Type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                options={[
                  { label: "All", value: "all" },
                  ...itemTypeOptions.map((option) => ({ label: option.label, value: option.value })),
                ]}
              />
            </div>
          </div>

          <div className="mt-4">
            <DataTable
              data={filtered}
              columns={columns}
              getRowId={(item) => item.itemUid}
              loading={isLoading}
              emptyState={<EmptyState title="No catalogue items found" description="Create a jewellery item or adjust the current search and item-type filter." />}
              className="border-0 shadow-none"
            />
          </div>
        </SectionCard>

        <Dialog
          open={isItemDialogOpen}
          onClose={() => {
            setIsItemDialogOpen(false);
            setEditingItem(null);
            setFormState(createEmptyForm());
          }}
          title={editingItem ? "Edit Item" : "Create Item"}
          description="Maintain the item template used during inward receipt and tag generation."
          size="lg"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Item Code" value={formState.itemCode} onChange={(event) => updateForm("itemCode", event.target.value)} />
            <Input label="Item Name" value={formState.name} onChange={(event) => updateForm("name", event.target.value)} />
            <Select
              label="Item Type"
              value={formState.itemType}
              onChange={(event) => updateForm("itemType", event.target.value as ItemType)}
              options={itemTypeOptions.map((option) => ({ label: option.label, value: option.value }))}
            />
            <Select
              label="Status"
              value={formState.status}
              onChange={(event) => updateForm("status", event.target.value as EntityStatus)}
              options={statusOptions.map((option) => ({ label: option.label, value: option.value }))}
            />
            <Select
              label="Metal"
              value={formState.metalUid}
              onChange={(event) => {
                updateForm("metalUid", event.target.value);
                updateForm("purityUid", "");
              }}
              options={metals.map((metal) => ({ label: metal.name, value: metal.metalUid }))}
              placeholder="Select metal"
            />
            <Select
              label="Purity"
              value={formState.purityUid}
              onChange={(event) => updateForm("purityUid", event.target.value)}
              options={visiblePurities.map((purity) => ({ label: purity.label, value: purity.purityUid }))}
              placeholder="Select purity"
            />
            <Input label="Typical Gross Wt (g)" type="number" value={formState.typicalGrossWt} onChange={(event) => updateForm("typicalGrossWt", event.target.value)} />
            <Input label="Typical Net Wt (g)" type="number" value={formState.typicalNetWt} onChange={(event) => updateForm("typicalNetWt", event.target.value)} />
            <Input label="HSN Code" value={formState.hsnCode} onChange={(event) => updateForm("hsnCode", event.target.value)} />
            <Input label="Tax Rate" type="number" value={formState.taxRate} onChange={(event) => updateForm("taxRate", event.target.value)} suffix="%" />
            <Select
              label="Charge Type"
              value={formState.chargeType}
              onChange={(event) => updateForm("chargeType", event.target.value as ChargeType)}
              options={chargeTypeOptions.map((option) => ({ label: option.label, value: option.value }))}
            />
            <Input label="Charge Value" type="number" value={formState.chargeValue} onChange={(event) => updateForm("chargeValue", event.target.value)} />
          </div>

          <div className="mt-4">
            <Textarea label="Description" rows={3} value={formState.description} onChange={(event) => updateForm("description", event.target.value)} />
          </div>

          <div className="mt-4">
            <Checkbox
              checked={formState.availableOnline}
              onChange={(event) => updateForm("availableOnline", event.target.checked)}
              label="Available for online sale"
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsItemDialogOpen(false);
                setEditingItem(null);
                setFormState(createEmptyForm());
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSaveItem()} loading={isSaving}>
              {editingItem ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </Dialog>

        <Drawer
          open={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title={selectedItem ? selectedItem.name : "Item Details"}
          size="md"
        >
          {selectedItem ? (
            <div className="space-y-5">
              <SectionCard title="Overview">
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField label="Item Code" value={selectedItem.itemCode} />
                  <DetailField label="Item Type" value={selectedItem.itemType || "-"} />
                  <DetailField label="Metal" value={selectedItem.metalName || "-"} />
                  <DetailField label="Purity" value={getPurityDisplayName(selectedItem)} />
                  <DetailField label="Gross Weight" value={formatWeight(Number(selectedItem.typicalGrossWt ?? 0))} />
                  <DetailField label="Net Weight" value={formatWeight(Number(selectedItem.typicalNetWt ?? 0))} />
                  <DetailField label="Charge Type" value={selectedItem.chargeType || "-"} />
                  <DetailField label="Charge Value" value={String(selectedItem.chargeValue ?? 0)} />
                  <DetailField label="Tax Rate" value={`${selectedItem.taxRate ?? 0}%`} />
                  <DetailField label="Status" value={selectedItem.status} />
                  <DetailField label="HSN Code" value={selectedItem.hsnCode || "-"} />
                  <DetailField label="Available Online" value={selectedItem.availableOnline ? "Yes" : "No"} />
                </div>
              </SectionCard>

              <SectionCard title="Description">
                <p className="m-0 text-sm text-[var(--color-text-secondary)]">{selectedItem.description || "No description available."}</p>
              </SectionCard>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => openEditDialog(selectedItem)}>
                  Edit Item
                </Button>
              </div>
            </div>
          ) : null}
        </Drawer>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
