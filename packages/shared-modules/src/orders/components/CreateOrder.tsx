import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Dialog, EmptyState, Input, SectionCard, Textarea } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { type Customer } from "../../customers";
import {
  CreateOrderSetupDialog,
  clearPersistedCreateOrderSetup,
  persistCreateOrderSetup,
  readPersistedCreateOrderSetup,
  type CreateOrderSetupData,
} from "./CreateOrderSetupDialog";
import { SharedOrdersLayout } from "./shared";

type OrderItemOption = {
  id: string;
  name: string;
  imageUrl?: string;
  status?: string;
  catalogName?: string;
  raw?: unknown;
};

type SelectedOrderItem = {
  id: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  raw?: unknown;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function CreateOrder() {
  const { api, basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [setupData, setSetupData] = useState<CreateOrderSetupData | null>(() => readPersistedCreateOrderSetup());
  const [setupOpen, setSetupOpen] = useState(!readPersistedCreateOrderSetup());
  const [businessName, setBusinessName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [notesToCustomer, setNotesToCustomer] = useState("");
  const [notesFromStaff, setNotesFromStaff] = useState("");
  const [notesDialog, setNotesDialog] = useState<"customer" | "staff" | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [itemDialogSearch, setItemDialogSearch] = useState("");
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [virtualSpCode, setVirtualSpCode] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [pendingSelection, setPendingSelection] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const [itemPageSize, setItemPageSize] = useState(10);

  const catalogId = setupData?.selectedCatalogId ?? "";

  const itemsCountQuery = useQuery({
    queryKey: ["orders", "create-order", "items-count", catalogId, itemDialogSearch.trim()],
    enabled: itemDialogOpen && Boolean(catalogId),
    queryFn: async () => {
      const params: Record<string, string | number> = {
        "sorderCatalogEncId-eq": catalogId,
        "parentItemId-eq": 0,
        "status-eq": "Enable",
      };
      if (itemDialogSearch.trim()) {
        params["name-like"] = itemDialogSearch.trim();
      }
      const payload = await api
        .get<number>("provider/so/catalog/item/count", { params })
        .then((r) => r.data);
      return typeof payload === "number" ? payload : 0;
    },
    staleTime: 30_000,
  });

  const itemsQuery = useQuery({
    queryKey: ["orders", "create-order", "items", catalogId, itemPage, itemPageSize, itemDialogSearch.trim()],
    enabled: Boolean(setupData) && Boolean(catalogId) && itemDialogOpen,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        from: (itemPage - 1) * itemPageSize,
        count: itemPageSize,
        "sorderCatalogEncId-eq": catalogId,
        "parentItemId-eq": 0,
        "status-eq": "Enable",
      };
      if (itemDialogSearch.trim()) {
        params["name-like"] = itemDialogSearch.trim();
      }
      const payload = await api
        .get<any[]>("provider/so/catalog/item", { params })
        .then((r) => r.data);

      return (Array.isArray(payload) ? payload : []).map((item, index) => ({
        id: String(item?.encId ?? item?.uid ?? item?.spItemUid ?? item?.spCode ?? item?.id ?? `item-${index + 1}`),
        name: String(item?.name ?? item?.itemName ?? item?.displayName ?? item?.spItem?.name ?? "Item"),
        imageUrl: readImageUrl(item),
        status: String(item?.status ?? item?.itemStatus ?? ""),
        catalogName: String(item?.catalogName ?? item?.catalog?.catalogName ?? item?.catalog?.name ?? ""),
        raw: item,
      })) satisfies OrderItemOption[];
    },
    staleTime: 30_000,
  });

  const itemOptions = itemsQuery.data ?? [];

  // For main page inline search — still client-side on already-loaded items
  const filteredItems = useMemo(() => {
    const normalized = itemSearch.trim().toLowerCase();
    if (!normalized) return itemOptions.slice(0, 16);
    return itemOptions.filter((item) => item.name.toLowerCase().includes(normalized)).slice(0, 16);
  }, [itemOptions, itemSearch]);

  // Server-side: items come pre-filtered from the API
  const paginatedDialogItems = itemOptions;
  const totalCount = itemsCountQuery.data ?? 0;
  const totalDialogPages = Math.max(1, Math.ceil(totalCount / itemPageSize));

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const orderTotal = 0;

  function handleSetupSubmit(data: CreateOrderSetupData) {
    persistCreateOrderSetup(data);
    setSetupData(data);
    setSetupOpen(false);
  }

  function openItemDialog() {
    setPendingSelection(new Set(selectedItems.map((i) => i.id)));
    setItemDialogSearch("");
    setItemPage(1);
    setItemDialogOpen(true);
  }

  function handleItemRowClick(item: OrderItemOption) {
    const isVirtual = item.raw && (
      (item.raw as any).itemNature === "VIRTUAL_ITEM" ||
      (item.raw as any).spItem?.itemNature === "VIRTUAL_ITEM"
    );
    if (isVirtual) {
      const spCode = (item.raw as any).spItem?.spCode ?? (item.raw as any).spCode ?? "";
      if (spCode) {
        setVirtualSpCode(spCode);
      }
    } else {
      togglePendingItem(item);
    }
  }

  function handleVirtualItemSelect(newItem: SelectedOrderItem) {
    setSelectedItems((current) => {
      const exists = current.some((i) => i.id === newItem.id);
      if (exists) {
        return current.map((i) => (i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...current, newItem];
    });
    setPendingSelection((prev) => {
      const next = new Set(prev);
      next.add(newItem.id);
      return next;
    });
    setVirtualSpCode("");
  }

  function togglePendingItem(item: OrderItemOption) {
    setPendingSelection((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  function commitSelection() {
    setSelectedItems((current) => {
      const currentMap = new Map(current.map((i) => [i.id, i]));
      const result: SelectedOrderItem[] = [];

      for (const id of pendingSelection) {
        if (currentMap.has(id)) {
          result.push(currentMap.get(id)!);
        } else {
          const found = itemOptions.find((o) => o.id === id);
          if (found) {
            result.push({ id: found.id, name: found.name, imageUrl: found.imageUrl, quantity: 1, raw: found.raw });
          }
        }
      }

      return result;
    });
    setItemDialogOpen(false);
  }

  function updateItemQuantity(itemId: string, delta: number) {
    setSelectedItems((current) =>
      current
        .map((item) => (item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(itemId: string) {
    setSelectedItems((current) => current.filter((item) => item.id !== itemId));
  }

  function handleActionClick(kind: "draft" | "confirm") {
    setActionMessage(
      kind === "draft"
        ? "Draft save is not wired to the backend yet."
        : "Order confirmation is not wired to the backend yet."
    );
  }

  const selectedCustomer = setupData?.selectedCustomer ?? null;
  const selectedDealerName = setupData?.selectedDealerName ?? "";
  const guestMode = Boolean(setupData?.guestMode);
  const guestName = setupData?.guestName ?? "";

  return (
    <SharedOrdersLayout
      title="Back"
      subtitle=""
      backHref={`${basePath}/orders/dashboard`}
      backLabel="Back"
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
          Edit Setup
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_420px]">
        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[18px] font-semibold text-slate-900">Items</h3>
              </div>
              <div className="flex gap-3">
                <Input
                  id="orders-create-item-search"
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="Search items"
                  className="h-[42px] flex-1"
                />
                <Button type="button" variant="primary" className="whitespace-nowrap" onClick={openItemDialog}>
                  + Add Item
                </Button>
              </div>

              <div className="min-h-[300px] rounded-lg border border-slate-200 bg-white p-4">
                {selectedItems.length === 0 ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center">
                    <EmptyState title="No items added!" description="Please search & add items" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ItemThumbnail name={item.name} imageUrl={item.imageUrl} />
                          <div>
                            <div className="font-medium text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-500">{item.id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => updateItemQuantity(item.id, -1)}>-</Button>
                          <div className="min-w-[28px] text-center text-sm font-semibold text-slate-800">{item.quantity}</div>
                          <Button type="button" variant="outline" size="sm" onClick={() => updateItemQuantity(item.id, 1)}>+</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => removeItem(item.id)}>Remove</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-[18px] font-semibold text-slate-900">Summary</h3>
              <div className="rounded-lg border border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between py-1 text-slate-700">
                  <span>Total Items</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[30px] font-semibold text-slate-900">
                  <span className="text-lg">Total</span>
                  <span>₹{orderTotal.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={() => setNotesDialog("customer")}>Notes to customer</Button>
                <Button type="button" variant="outline" onClick={() => setNotesDialog("staff")}>Notes from staff member</Button>
              </div>
              {actionMessage ? <div className="text-sm text-amber-700">{actionMessage}</div> : null}
            </div>
          </SectionCard>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => {
                clearPersistedCreateOrderSetup();
                navigate(`${basePath}/orders/dashboard`);
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="secondary" size="sm" className="whitespace-nowrap" onClick={() => handleActionClick("draft")} disabled={selectedItems.length === 0}>
              Save as draft
            </Button>
            <Button type="button" variant="primary" size="sm" className="whitespace-nowrap" onClick={() => handleActionClick("confirm")} disabled={selectedItems.length === 0}>
              Confirm Order
            </Button>
          </div>
        </div>

        <SectionCard className="h-fit border-slate-200 shadow-sm">
          <div className="space-y-5">
            <div>
              <div className="border-b border-slate-200 pb-2 text-[18px] font-semibold text-slate-900">Customer Details</div>
              <div className="mt-4">
                {guestMode ? (
                  <div className="flex items-center gap-3">
                    <ProfileBadge letter={(guestName.trim()[0] ?? "G").toUpperCase()} />
                    <div>
                      <div className="font-semibold text-slate-900">{guestName.trim() || "Guest Order"}</div>
                      <div className="text-sm text-slate-500">Guest Mode</div>
                    </div>
                  </div>
                ) : selectedCustomer ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <ProfileBadge letter={(selectedCustomer.firstName?.[0] ?? "C").toUpperCase()} />
                      <div>
                        <div className="font-semibold text-slate-900">{formatCustomerName(selectedCustomer)}</div>
                        <div className="text-sm text-slate-500">Id : {selectedCustomer.jaldeeId || selectedCustomer.id}</div>
                      </div>
                    </div>
                    <DetailBlock title="Contact Information" lines={[formatCustomerPhone(selectedCustomer), selectedCustomer.email ?? ""]} />
                  </div>
                ) : selectedDealerName ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <ProfileBadge letter={(selectedDealerName[0] ?? "D").toUpperCase()} />
                      <div>
                        <div className="font-semibold text-slate-900">{selectedDealerName}</div>
                        <div className="text-sm text-slate-500">Dealer</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No customer selected.</div>
                )}
              </div>
            </div>

            <div>
              <div className="border-b border-slate-200 pb-2 text-[18px] font-semibold text-slate-900">Business Details</div>
              <div className="mt-4 space-y-4">
                <Input id="orders-create-gst" label="GST No:" value={gstNumber} onChange={(event) => setGstNumber(event.target.value)} placeholder="GST Number" className="h-[42px]" />
                <Input id="orders-create-business-name" label="Business Name:" value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Business Name" className="h-[42px]" />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <CreateOrderSetupDialog
        open={setupOpen}
        initialData={setupData}
        onClose={() => navigate(`${basePath}/orders/dashboard`)}
        onSubmit={handleSetupSubmit}
      />

      {/* ── Select Items Dialog ── */}
      <Dialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        title="Select Items"
        description=""
        size="lg"
        contentClassName="max-w-[820px] rounded-xl px-7 py-8"
        closeButtonClassName="text-slate-500 hover:bg-transparent"
        closeIcon={<DialogCloseGlyph />}
      >
        <div className="space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Input
                id="orders-create-item-dialog-search"
                value={itemDialogSearch}
                onChange={(event) => {
                  setItemDialogSearch(event.target.value);
                  setItemPage(1);
                }}
                placeholder="Search Items"
                className="h-[38px] w-[200px]"
              />
              <Button type="button" variant="primary" size="sm">
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </Button>
            </div>
            <Button type="button" variant="primary" size="sm" onClick={commitSelection}>
              ✓ Done
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="w-14 px-4 py-3 text-left font-semibold text-slate-700"></th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Item Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Catalog</th>
                </tr>
              </thead>
              <tbody>
                {itemsQuery.isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading items...</td>
                  </tr>
                ) : paginatedDialogItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No items found.</td>
                  </tr>
                ) : (
                  paginatedDialogItems.map((item) => {
                    const isVirtual = item.raw && (
                      (item.raw as any).itemNature === "VIRTUAL_ITEM" ||
                      (item.raw as any).spItem?.itemNature === "VIRTUAL_ITEM"
                    );
                    const checked = isVirtual
                      ? selectedItems.some((s) => {
                          const parentSp = (s.raw as any)?.parentItemSpCode ?? (s.raw as any)?.spItem?.parentItemSpCode ?? "";
                          const parentId = (s.raw as any)?.parentItemId ?? (s.raw as any)?.spItem?.parentItemId ?? "";
                          const itemSpCode = (item.raw as any)?.spItem?.spCode ?? (item.raw as any)?.spCode ?? "";
                          return (parentSp && parentSp === itemSpCode) || (parentId && String(parentId) === item.id);
                        })
                      : pendingSelection.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleItemRowClick(item)}
                        className="cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleItemRowClick(item)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.name}
                          {isVirtual && (
                            <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 border border-indigo-100">
                              Configurable
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.status || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.catalogName || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination row */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <span>
                  Showing {Math.min((itemPage - 1) * itemPageSize + 1, totalCount)} to{" "}
                  {Math.min(itemPage * itemPageSize, totalCount)} of {totalCount} items
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setItemPage(1)} disabled={itemPage === 1} className="rounded px-1 py-0.5 hover:bg-slate-200 disabled:opacity-40">«</button>
                  <button type="button" onClick={() => setItemPage((p) => Math.max(1, p - 1))} disabled={itemPage === 1} className="rounded px-1 py-0.5 hover:bg-slate-200 disabled:opacity-40">‹</button>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">{itemPage}</span>
                  <button type="button" onClick={() => setItemPage((p) => Math.min(totalDialogPages, p + 1))} disabled={itemPage === totalDialogPages} className="rounded px-1 py-0.5 hover:bg-slate-200 disabled:opacity-40">›</button>
                  <button type="button" onClick={() => setItemPage(totalDialogPages)} disabled={itemPage === totalDialogPages} className="rounded px-1 py-0.5 hover:bg-slate-200 disabled:opacity-40">»</button>
                  <select
                    value={itemPageSize}
                    onChange={(e) => { setItemPageSize(Number(e.target.value)); setItemPage(1); }}
                    className="ml-2 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Cancel / Done */}
          <div className="flex justify-center gap-4 pt-2">
            <Button type="button" variant="danger" onClick={() => setItemDialogOpen(false)}>✕ Cancel</Button>
            <Button type="button" variant="primary" onClick={commitSelection}>✓ Done</Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={notesDialog !== null}
        onClose={() => setNotesDialog(null)}
        title={notesDialog === "customer" ? "Notes to customer" : "Notes from staff member"}
        description=""
        size="lg"
        contentClassName="max-w-[620px] rounded-xl px-7 py-8"
        closeButtonClassName="text-slate-500 hover:bg-transparent"
        closeIcon={<DialogCloseGlyph />}
      >
        <div className="space-y-4">
          <Textarea
            id="orders-create-notes"
            rows={6}
            value={notesDialog === "customer" ? notesToCustomer : notesFromStaff}
            onChange={(event) => (notesDialog === "customer" ? setNotesToCustomer(event.target.value) : setNotesFromStaff(event.target.value))}
          />
        </div>
      </Dialog>

      <VirtualItemConfiguratorDialog
        open={Boolean(virtualSpCode)}
        onClose={() => setVirtualSpCode("")}
        spCode={virtualSpCode}
        catalogId={catalogId}
        api={api}
        onSelect={handleVirtualItemSelect}
      />
    </SharedOrdersLayout>
  );
}

interface VirtualItemConfiguratorDialogProps {
  open: boolean;
  onClose: () => void;
  spCode: string;
  catalogId: string;
  api: any;
  onSelect: (selectedItem: SelectedOrderItem) => void;
}

function VirtualItemConfiguratorDialog({
  open,
  onClose,
  spCode,
  catalogId,
  api,
  onSelect,
}: VirtualItemConfiguratorDialogProps) {
  // 1. Parent Item Query
  const parentItemQuery = useQuery({
    queryKey: ["orders", "virtual-item", "parent", spCode],
    enabled: open && Boolean(spCode),
    queryFn: async () => {
      const response = await api.get<any>(`provider/spitem/${spCode}`);
      return response.data;
    },
    staleTime: 30_000,
  });

  // 2. Child Items List Query
  const childSpItemsQuery = useQuery({
    queryKey: ["orders", "virtual-item", "child-spitems", spCode],
    enabled: open && Boolean(spCode),
    queryFn: async () => {
      const params = { "parentItemSpCode-eq": spCode };
      const response = await api.get<any[]>("provider/spitem", { params });
      return response.data ?? [];
    },
    staleTime: 30_000,
  });

  // 3. Child Catalog Variations Query
  const catalogVariationsQuery = useQuery({
    queryKey: ["orders", "virtual-item", "catalog-variations", spCode, catalogId],
    enabled: open && Boolean(spCode) && Boolean(catalogId),
    queryFn: async () => {
      const params = {
        "parentItemSpCode-eq": spCode,
        "sorderCatalogEncId-eq": catalogId,
        "status-eq": "Enable",
      };
      const response = await api.get<any[]>("provider/so/catalog/item", { params });
      return response.data ?? [];
    },
    staleTime: 30_000,
  });

  // 3b. Child Catalog Variations Count Query
  const catalogVariationsCountQuery = useQuery({
    queryKey: ["orders", "virtual-item", "catalog-variations-count", spCode, catalogId],
    enabled: open && Boolean(spCode) && Boolean(catalogId),
    queryFn: async () => {
      const params = {
        "parentItemSpCode-eq": spCode,
        "sorderCatalogEncId-eq": catalogId,
        "status-eq": "Enable",
      };
      const response = await api.get<number>("provider/so/catalog/item/count", { params });
      return response.data ?? 0;
    },
    staleTime: 30_000,
  });

  const parentItem = parentItemQuery.data;
  const childSpItems = childSpItemsQuery.data ?? [];
  const catalogVariations = catalogVariationsQuery.data ?? [];

  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});

  // Initialize selected values to first available option for each attribute
  useEffect(() => {
    if (parentItem?.itemAttributes) {
      const initial: Record<string, string> = {};
      parentItem.itemAttributes.forEach((attr: any) => {
        if (attr.values && attr.values.length > 0) {
          initial[attr.attribute] = attr.values[0];
        }
      });
      setSelectedValues(initial);
    }
  }, [parentItem]);

  const selectValue = (attribute: string, value: string) => {
    setSelectedValues((prev) => ({
      ...prev,
      [attribute]: value,
    }));
  };

  // Resolution logic matching exactly the Angular version
  const selectedValuesString = Object.values(selectedValues)
    .map((val) => (val ?? "").toString().trim())
    .filter((val) => val !== "")
    .join(" / ");

  const parentName = parentItem?.name || "";
  const constructedItemName = `${parentName.toString().trim()} ${selectedValuesString}`.trim();

  const normalizeValue = (value: any) => {
    return (value ?? "").toString().trim().replace(/\s+/g, " ").toLowerCase();
  };

  const targetName = normalizeValue(constructedItemName);

  // 1. Try matching by full item name
  let resolvedChild = (childSpItems || []).find(
    (item: any) => normalizeValue(item?.name) === targetName
  );

  // 2. Fallback matching by selectedAttributes
  if (!resolvedChild) {
    resolvedChild = (childSpItems || []).find((item: any) => {
      const attrs = item?.selectedAttributes || {};
      return Object.keys(selectedValues || {}).every((key) => {
        const sel = normalizeValue(selectedValues[key]);
        const itemVal = normalizeValue(attrs[key]);
        return sel === itemVal;
      });
    });
  }

  // 3. Find corresponding catalog item
  const resolvedCatalogItem = resolvedChild
    ? (catalogVariations || []).find(
        (catItem: any) => catItem.spItem?.spCode === resolvedChild?.spCode
      )
    : null;

  // Trigger optional details / batches fetch if a child is found
  const forCreateOrderQuery = useQuery({
    queryKey: ["orders", "virtual-item", "for-create-order", resolvedCatalogItem?.encId],
    enabled: Boolean(resolvedCatalogItem?.encId),
    queryFn: async () => {
      const response = await api.get<any>(
        `provider/so/catalog/item/${resolvedCatalogItem?.encId}/forcreateorder`
      );
      return response.data;
    },
  });

  const isLoading = parentItemQuery.isLoading || childSpItemsQuery.isLoading || catalogVariationsQuery.isLoading;

  const handleSaveToCart = () => {
    if (resolvedChild && resolvedCatalogItem) {
      onSelect({
        id: resolvedCatalogItem.encId,
        name: resolvedChild.name,
        imageUrl: readImageUrl(resolvedChild),
        quantity: 1,
        raw: resolvedCatalogItem,
      });
    }
  };

  const parentImageUrl = readImageUrl(parentItem);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Configure Item"
      description=""
      size="md"
      contentClassName="max-w-[600px] rounded-xl px-7 py-8"
      closeButtonClassName="text-slate-500 hover:bg-transparent"
      closeIcon={<DialogCloseGlyph />}
    >
      {isLoading ? (
        <div className="flex justify-center py-12 text-slate-500">Loading item attributes...</div>
      ) : (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <ItemThumbnail name={parentName} imageUrl={parentImageUrl} />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{parentName}</h2>
              <div className="text-xs font-semibold text-slate-500">Id: {spCode}</div>
              {parentItem?.status === "Enable" && (
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {parentItem?.shortDesc && (
            <div className="text-sm text-slate-600 border-b border-slate-100 pb-4">
              {parentItem.shortDesc}
            </div>
          )}

          {/* Attributes configuration lists */}
          {parentItem?.itemAttributes && parentItem.itemAttributes.length > 0 && (
            <div className="space-y-5">
              {parentItem.itemAttributes.map((attr: any) => (
                <div key={attr.attribute} className="space-y-2">
                  <div className="text-sm font-semibold text-slate-800">{attr.attribute}:</div>
                  <div className="flex flex-wrap gap-2">
                    {attr.values?.map((val: string) => {
                      const isSelected = selectedValues[attr.attribute] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => selectValue(attr.attribute, val)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 shadow-sm ${
                            isSelected
                              ? "bg-indigo-600 text-white font-semibold ring-2 ring-indigo-600 ring-offset-2"
                              : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pricing Summary */}
          <div className="border-t border-slate-100 pt-5">
            {resolvedCatalogItem ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Resolved Item</div>
                  <div className="text-sm font-semibold text-slate-900">{constructedItemName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Price</div>
                  <div className="text-2xl font-bold text-slate-900">₹{resolvedCatalogItem.price?.toFixed(2)}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center text-sm font-semibold text-amber-700 animate-pulse">
                Currently Not Available
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="danger" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!resolvedCatalogItem}
              onClick={handleSaveToCart}
            >
              Select Item
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function ItemThumbnail({ name, imageUrl }: { name: string; imageUrl?: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name} className="h-12 w-12 rounded-lg object-cover shadow-sm" />;
  }
  return <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 shadow-sm">{(name[0] ?? "I").toUpperCase()}</div>;
}

function ProfileBadge({ letter }: { letter: string }) {
  return <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-lg font-semibold text-white">{letter}</div>;
}

function DetailBlock({ title, lines }: { title: string; lines: string[] }) {
  const visibleLines = lines.filter((line) => Boolean(line.trim()));
  if (visibleLines.length === 0) return null;
  return (
    <div>
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-2 space-y-1 text-slate-700">
        {visibleLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function formatCustomerName(customer: Customer) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Customer";
}

function formatCustomerPhone(customer: Customer) {
  const countryCode = String(customer.countryCode ?? "").trim();
  const phone = String(customer.phoneNo ?? "").trim();
  if (!countryCode && !phone) return "";
  return `${countryCode ? `+${countryCode} ` : ""}${phone}`.trim();
}

function readImageUrl(raw: unknown) {
  if (!raw || typeof raw !== "object") return "";
  const queue: unknown[] = [raw];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current as object)) continue;
    visited.add(current as object);

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    const record = current as Record<string, unknown>;
    const attachments = record.attachments;
    if (Array.isArray(attachments)) {
      for (const attachment of attachments) {
        if (!attachment || typeof attachment !== "object") continue;
        const image = (attachment as Record<string, unknown>).s3path;
        if (typeof image === "string" && image.trim()) return image.trim();
      }
    }

    const nestedItem = record.spItem;
    if (nestedItem && typeof nestedItem === "object") {
      queue.push(nestedItem);
    }
  }

  return "";
}

function DialogCloseGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M5.5 5.5L16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.5 5.5L5.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
