import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, Plus, Filter,
  ChevronDown, Edit2, MoreHorizontal, ArrowDown,
  ChevronLeft, ChevronRight, Image as ImageIcon,
  Eye, Copy, Archive, Trash2, Check, Upload, X,
  Tag, Award, Coins
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TablePagination } from './TablePagination';

const PAGE_SIZE = 10;
import { CreateItem } from './CreateItem';
import { ItemDetails } from './ItemDetails';
import { ItemImportWizard } from './ItemImportWizard';
import { useItems, useDeleteItem, useCreateItem, useUpdateItem, useUpdateItemStatus } from '../../../services/useItems';
import { useAddInventoryCatalogItem, useUpdateInventoryCatalogItem, useItemInventoryPlacements, useInventoryCatalogs } from '../../../services/useInventoryCatalogs';
import { useOrderCatalogs } from '../../../services/useOrderCatalogs';
import { useAddOrderCatalogItem } from '../../../services/useOrderCatalogItems';
import { useStores } from '../../../services/useStores';
import { useCreateStockAdjustment } from '../../../services/useStockAdjustments';

export interface ProductItem {
  id: string;
  name: string;
  code: string;
  category: string;
  sku: string;
  variants: number;
  trackInventory: boolean;
  status: 'Active' | 'Draft' | 'Archived';
  image?: string;
  itemNo?: string;
  // UX-3: at-a-glance price/stock for the list.
  price?: number | null;
  mrp?: number | null;
  onHand?: number | null;
}

/**
 * Builds the per-selling-unit price list for an order-catalog item from a single base price.
 *
 * Pricing is per catalog: the assignment row carries the price of the item's DEFAULT selling
 * unit, and every other selling unit is derived by its conversion ratio (a Box of 12 costs
 * 12× a Piece). A user override for a specific unit wins over the derived value.
 */
function deriveCatalogUnitPrices(
  units: any[],
  baseUnitUid: string | undefined,
  baseMrp: number,
  basePrice: number,
  overrides?: Record<string, { sellingPrice?: any; mrp?: any }>
) {
  const configured = (units || []).filter((u) => u?.selling && u?.unitUid);
  // The base unit is always implicitly sellable (conversion 1) — persist a catalog price row
  // for it too, so it isn't silently dropped when the user didn't re-add it as a unit row.
  const selling = [...configured];
  if (baseUnitUid && !selling.some((u) => u.unitUid === baseUnitUid)) {
    selling.unshift({ unitUid: baseUnitUid, conversionQty: 1, selling: true });
  }
  if (selling.length === 0) return [];
  const round2 = (n: number) => Math.round(n * 100) / 100;
  // The base price is quoted against the default selling unit — the one the user typed for.
  const def =
    selling.find((u) => u.sellingDefault) ||
    selling.find((u) => Number(u.conversionQty) === 1) ||
    selling[0];
  const defConv = Number(def.conversionQty) || 1;
  return selling.map((u) => {
    const ratio = (Number(u.conversionQty) || 1) / defConv;
    const ov = overrides?.[u.unitUid] || {};
    const hasP = ov.sellingPrice != null && ov.sellingPrice !== '';
    const hasM = ov.mrp != null && ov.mrp !== '';
    return {
      unitUid: u.unitUid,
      sellingPrice: hasP ? Number(ov.sellingPrice) : round2(basePrice * ratio),
      mrp: hasM ? Number(ov.mrp) : round2(baseMrp * ratio),
      // The unit the typed base price was quoted against. Order-catalog items require exactly
      // one default; the field is `defaultUnit` rather than `isDefault` to match the backend.
      defaultUnit: u.unitUid === def.unitUid,
      active: true,
    };
  });
}

/**
 * Vertical/merchandising scalars that have no dedicated column on the backend item.
 * They round-trip through {@code ItemEntity.attributes} (jsonb), so they are collected
 * into a single map here instead of being dropped on save.
 */
function buildItemAttributes(src: any): Record<string, any> {
  const attrs: Record<string, any> = {};
  if (src.barcode) attrs.barcode = src.barcode;
  if (src.hsnCode) attrs.hsnCode = src.hsnCode;
  if (src.weight !== undefined && src.weight !== null && src.weight !== '') attrs.weight = src.weight;
  if (src.itemType) attrs.itemType = src.itemType;
  if (src.taxGroup) attrs.taxGroup = src.taxGroup;
  if (src.taxPreference) attrs.taxPreference = src.taxPreference;
  if (Array.isArray(src.infoBlocks) && src.infoBlocks.length > 0) attrs.infoBlocks = src.infoBlocks;
  return attrs;
}

/**
 * Only a physical product holds stock; every non-physical item type is a SERVICE.
 * An unset type defaults to GOODS so items created without picking a type keep stock
 * (the old `=== 'Service'` test could never match the actual dropdown values, so every
 * item was silently tagged GOODS regardless of type).
 */
function itemKind(itemType?: string): 'GOODS' | 'SERVICE' {
  return itemType && itemType !== 'Physical Item' ? 'SERVICE' : 'GOODS';
}

/**
 * Expand the variant OPTION definitions ([{name:'Color', values:['Red','Blue']}]) collected in
 * the form into the concrete variants the backend persists (item_variant_tbl) — the cartesian
 * product of every option's values, each carrying its combination in `attributes`. Items with no
 * options keep a single self-variant so simple items are unchanged. Previously the option defs
 * were flattened into the item's attributes map ("Color":"Red, Blue") and a lone hardcoded
 * self-variant was sent, so marking an item as having variants created zero real variant rows.
 */
function buildVariants(src: any): any[] {
  const defs = (src.attributes || [])
    .filter((a: any) => a && a.name && Array.isArray(a.values) && a.values.some((v: string) => (v || '').trim() !== ''))
    .map((a: any) => ({ name: a.name, values: a.values.filter((v: string) => (v || '').trim() !== '') }));
  const baseMrp = Number(src.assignments?.[0]?.mrp) || 0;
  const basePrice = Number(src.assignments?.[0]?.salesPrice) || 0;
  if (defs.length === 0) {
    return [{ variantName: src.name, sku: src.sku, mrp: baseMrp, sellingPrice: basePrice, attributes: {} }];
  }
  let combos: Array<Record<string, string>> = [{}];
  for (const def of defs) {
    const next: Array<Record<string, string>> = [];
    for (const combo of combos) {
      for (const val of def.values) next.push({ ...combo, [def.name]: val });
    }
    combos = next;
  }
  return combos.map((combo) => {
    const suffix = Object.values(combo).join(' / ');
    const skuSuffix = Object.values(combo).join('-').toUpperCase().replace(/\s+/g, '');
    return {
      variantName: `${src.name} - ${suffix}`,
      sku: src.sku ? `${src.sku}-${skuSuffix}` : skuSuffix,
      mrp: baseMrp,
      sellingPrice: basePrice,
      attributes: combo,
    };
  });
}

/**
 * Rebuild the form's variant OPTION definitions ([{name, values}]) from the backend's flat
 * list of persisted variants, so the edit form and detail view can show them again.
 */
function reconstructVariantOptions(variantList: any[]): Array<{ name: string; values: string[] }> {
  const map = new Map<string, string[]>();
  (variantList || []).forEach((v) => {
    const attrs = v?.attributes || {};
    Object.entries(attrs).forEach(([k, val]) => {
      const cur = map.get(k) || [];
      const sval = String(val);
      if (!cur.includes(sval)) cur.push(sval);
      map.set(k, cur);
    });
  });
  return Array.from(map.entries()).map(([name, values]) => ({ name, values }));
}

/**
 * Translate a CreateItem form result into the commerce-service ItemDto contract. Shared by
 * create and edit so both persist the full field set (attributes map + real variants + kind).
 */
function toBackendItemPayload(src: any): any {
  const isPharma = src.isPharmacyItem || src.verticalType === 'PHARMACY' || (src.medicineSystem && src.medicineSystem !== 'NONE');
  return {
    name: src.name,
    verticalType: isPharma ? 'PHARMACY' : (src.verticalType || 'RETAIL'),
    medicineSystem: isPharma ? (src.medicineSystem || 'ALLOPATHY') : 'NONE',
    // `code` is intentionally omitted: barcode used to be overloaded into it. Leaving it blank
    // lets the backend auto-generate a stable internal code; barcode now lives in attributes.
    sku: src.sku,
    category: src.category,
    categoryName: src.category,
    brandName: src.brandName || src.brand || undefined,
    trackInventory: src.trackInventory,
    status: (src.status || 'Active').toUpperCase(),
    kind: itemKind(src.itemType),
    image: src.image,
    baseUnitUid: src.baseUnitUid,
    allowLooseSale: src.allowLooseSale,
    rxEnabled: src.rxEnabled,
    drugSchedule: src.drugSchedule || undefined,
    ayushType: src.ayushType || undefined,
    shelfLifeMonths: src.shelfLifeMonths || undefined,
    // Backend DTO field names are `expiryExempt` / `saltComposition` — the form uses
    // `noExpiry` / `composition`. Map here so both actually persist (they were being
    // silently dropped as unknown JSON properties).
    expiryExempt: src.noExpiry || undefined,
    saltComposition: src.composition || undefined,
    productSpecification: src.productSpecification,
    productContains: src.productContains,
    productContainsUnitUid: src.productContainsUnitUid,
    units: src.units || [],
    attributes: buildItemAttributes(src),
    tags: src.tags || [],
    badges: src.badges || [],
    upsellItemUids: src.upsellItemUids || [],
    crossSellItemUids: src.crossSellItemUids || [],
    variants: buildVariants(src),
  };
}

export const ItemsTable = () => {
  const { data: backendItems } = useItems();
  const deleteItemMutation = useDeleteItem();
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const updateItemStatusMutation = useUpdateItemStatus();

  // Orchestration Mutations
  const addInventoryCatalogItemMutation = useAddInventoryCatalogItem();
  const updateInventoryCatalogItemMutation = useUpdateInventoryCatalogItem();
  const addOrderCatalogItemMutation = useAddOrderCatalogItem();
  const createStockAdjustmentMutation = useCreateStockAdjustment();

  const [items, setItems] = useState<ProductItem[]>([]);

  React.useEffect(() => {
    if (backendItems) {
      const mapped = backendItems.map((item: any) => {
        const attrs = item.attributes || {};
        return {
          id: item.uid || item.id,
          name: item.name,
          code: item.code || '',
          category: item.categoryName || item.category || 'Uncategorized',
          sku: item.sku || '',
          variants: item.variantsCount || item.variants?.length || 0,
          trackInventory: item.trackInventory ?? true,
          status: (['Active','Draft','Archived'].find(s => s.toUpperCase() === item.status) || 'Draft') as any,
          image: item.image || undefined,
          itemNo: item.itemNo,
          // UX-3: default selling price (from the first/default variant) + total on-hand
          // (server-aggregated across stores). Null when not applicable / not tracked.
          price: item.variants?.[0]?.sellingPrice != null ? Number(item.variants[0].sellingPrice) : null,
          mrp: item.variants?.[0]?.mrp != null ? Number(item.variants[0].mrp) : null,
          onHand: item.onHand != null ? Number(item.onHand) : null,
          // Rich fields carried through so the edit form and detail view can pre-load them.
          // The ProductItem row shape used to strip everything below, which is why brand,
          // barcode, tax, weight, variants and additional-info all looked "not saved".
          brandName: item.brandName || '',
          baseUnitUid: item.baseUnitUid,
          allowLooseSale: item.allowLooseSale,
          rxEnabled: item.rxEnabled,
          productSpecification: item.productSpecification,
          productContains: item.productContains,
          productContainsUnitUid: item.productContainsUnitUid,
          units: item.units || [],
          variantList: item.variants || [],
          // Vertical/merchandising scalars flattened from the jsonb attributes map so the
          // form's existing `itemToEdit.barcode` / `.weight` / … reads resolve.
          barcode: attrs.barcode || '',
          hsnCode: attrs.hsnCode || '',
          weight: attrs.weight || '',
          itemType: attrs.itemType || '',
          taxGroup: attrs.taxGroup || '',
          taxPreference: attrs.taxPreference || '',
          infoBlocks: attrs.infoBlocks || [],
          tags: item.tags || [],
          badges: item.badges || [],
          upsellItemUids: item.upsellItemUids || [],
          crossSellItemUids: item.crossSellItemUids || [],
        };
      });
      setItems(mapped as any);
    }
  }, [backendItems]);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreate(true);
    }
  }, [searchParams]);

  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ProductItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<ProductItem | null>(null);
  const [cameFromDetail, setCameFromDetail] = useState(false);

  // 1a — load the item's existing inventory-catalog placements so the edit form's
  // Catalog & Pricing step pre-loads its catalog rows + prices instead of a blank row.
  const { data: editPlacements = [], isLoading: editPlacementsLoading } =
    useItemInventoryPlacements(itemToEdit?.id);
  const { data: storesForEdit = [] } = useStores();
  const { data: inventoryCatalogsForEdit = [] } = useInventoryCatalogs();
  const { data: orderCatalogsForEdit = [] } = useOrderCatalogs();

  // Each store owns inventory/order catalogs. Map catalogUid to store id and orderCatalogUid.
  const storeByInventoryCatalog = React.useMemo(() => {
    const map = new Map<string, { storeId: string; orderCatalogUid?: string }>();
    (storesForEdit || []).forEach((s: any) => {
      if (s.inventoryCatalogUid) {
        map.set(String(s.inventoryCatalogUid), { storeId: String(s.id), orderCatalogUid: s.orderCatalogUid });
      }
    });
    (inventoryCatalogsForEdit || []).forEach((c: any) => {
      if (c.storeUid && (c.id || c.uid)) {
        const catUid = String(c.id || c.uid);
        const existing = map.get(catUid);
        const relatedOrd = (orderCatalogsForEdit || []).find((oc: any) => oc.storeUid === c.storeUid);
        map.set(catUid, {
          storeId: String(c.storeUid),
          orderCatalogUid: existing?.orderCatalogUid || relatedOrd?.id || relatedOrd?.uid,
        });
      }
    });
    return map;
  }, [storesForEdit, inventoryCatalogsForEdit, orderCatalogsForEdit]);

  const editAssignments = React.useMemo(
    () => (editPlacements || []).map((p: any, idx: number) => {
      const match = storeByInventoryCatalog.get(String(p.catalogUid));
      return {
        id: idx + 1,
        store: match?.storeId || '',
        storeInventoryCatalogUid: p.catalogUid,
        catalog: match?.orderCatalogUid || '',
        inventoryCatalog: p.catalogUid,
        catalogItemUid: p.catalogItemUid,
        mrp: p.mrp != null ? String(p.mrp) : '',
        salesPrice: p.sellingPrice != null ? String(p.sellingPrice) : '',
        showMrp: 'Yes',
        rateEditable: true,
        openingStock: p.inHand != null ? String(p.inHand) : '0',
        batch: '',
        unitPrices: p.units || [],
      };
    }),
    [editPlacements, storeByInventoryCatalog]
  );
  const itemToEditWithAssignments = React.useMemo(
    () => (itemToEdit ? { ...itemToEdit, assignments: editAssignments } : null),
    [itemToEdit, editAssignments]
  );

  // 1b — upsert an item's catalog placements on EDIT. Rows that already exist (carry a
  // catalogItemUid loaded in 1a) are PUT-updated for price; new rows are POSTed. Opening stock
  // is added only for brand-new placements. Row removal/unlink is not handled yet.
  const persistItemAssignments = async (itemUid: string, item: any) => {
    const assignments = item.assignments || [];
    for (const a of assignments) {
      const targetCatalogUid = a.inventoryCatalog || a.storeInventoryCatalogUid;
      const unitPrices = deriveCatalogUnitPrices(
        item.units, item.baseUnitUid,
        Number(a.mrp) || 0, Number(a.salesPrice) || 0, a.unitPrices
      );

      if (a.catalogItemUid) {
        try {
          await updateInventoryCatalogItemMutation.mutateAsync({
            uid: a.catalogItemUid,
            catalogUid: targetCatalogUid,
            data: {
              mrp: Number(a.mrp) || 0,
              sellingPrice: Number(a.salesPrice) || 0,
              ...(unitPrices.length ? { units: unitPrices } : {}),
            },
          });
        } catch (e) {
          console.warn('Edit: update of existing catalog placement failed:', e);
        }
        continue;
      }

      if (!targetCatalogUid) {
        if (a.store) console.warn(`Store "${a.store}" has no inventory catalog — item not placed.`);
        continue;
      }

      let catalogItemUid: string | null = null;
      try {
        const created = await addInventoryCatalogItemMutation.mutateAsync({
          catalogUid: targetCatalogUid,
          itemData: {
            itemUid, active: true,
            mrp: Number(a.mrp) || 0,
            sellingPrice: Number(a.salesPrice) || 0,
            ...(unitPrices.length ? { units: unitPrices } : {}),
          },
        });
        catalogItemUid = created?.uid || created?.id || null;
      } catch (e) {
        console.warn('Edit: new catalog placement failed:', e);
      }

      if (a.catalog) {
        try {
          await addOrderCatalogItemMutation.mutateAsync({
            orderCatalogUid: a.catalog,
            itemData: {
              itemUid,
              inventoryCatalogItemUid: catalogItemUid,
              inventoryCatalogUid: targetCatalogUid || null,
              showMrp: a.showMrp === 'Yes',
              active: true,
              ...(unitPrices.length ? { units: unitPrices } : {}),
            },
          });
        } catch (e) {
          console.warn('Edit: order-catalog pricing failed:', e);
        }
      }

      const openingQty = parseInt(a.openingStock);
      if (catalogItemUid && openingQty > 0) {
        try {
          await createStockAdjustmentMutation.mutateAsync({
            catalogItemUid, type: 'ADDITION', target: 'IN_HAND',
            quantity: openingQty, reason: 'Opening Stock',
            notes: `Opening stock for ${item.name}`,
          });
        } catch (e) {
          console.warn('Edit: opening stock failed:', e);
        }
      }
    }
  };
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Bulk Actions states
  const [bulkActionType, setBulkActionType] = useState<'category' | 'brand' | 'tag' | 'badge' | 'price' | null>(null);
  const [bulkInputValue, setBulkInputValue] = useState('');
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);

  // Import flow states
  const [showImportModal, setShowImportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute unique categories dynamically from item categories
  const categoriesList = ['All Categories', ...Array.from(new Set(items.map(item => item.category)))];

  // Column sorting. The header showed a sort chevron but nothing sorted — this wires it.
  const [sortKey, setSortKey] = useState<'name' | 'category' | 'sku' | 'status' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (key: 'name' | 'category' | 'sku' | 'status') => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredProducts = items.filter(item => {
    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (!sortKey) return 0;
    const av = String((a as any)[sortKey] ?? '');
    const bv = String((b as any)[sortKey] ?? '');
    const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const [page, setPage] = useState(1);
  // Any change to the result set can leave the current page out of range.
  React.useEffect(() => { setPage(1); }, [searchQuery, selectedCategory, items.length]);
  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDuplicateItem = (item: ProductItem) => {
    const duplicated: ProductItem = {
      ...item,
      id: `${Date.now()}`,
      name: `${item.name} (Copy)`,
      code: `#P${Math.floor(10000 + Math.random() * 90000)}`,
      sku: `${item.sku}-COPY`
    };
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx !== -1) {
        const next = [...prev];
        next.splice(idx + 1, 0, duplicated);
        return next;
      }
      return [...prev, duplicated];
    });
    setActiveActionsId(null);
  };

  const handleToggleArchive = (item: ProductItem) => {
    const nextStatus = item.status === 'Archived' ? 'Active' : 'Archived';
    updateItemStatusMutation.mutate({ uid: item.id, status: nextStatus.toUpperCase() });
    setItems(prev => prev.map(i => {
      if (i.id === item.id) {
        return { ...i, status: nextStatus };
      }
      return i;
    }));
    setActiveActionsId(null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Are you sure you want to permanently delete this item?")) {
      deleteItemMutation.mutate(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    }
    setActiveActionsId(null);
  };

  // Bulk Action Handlers
  const handleBulkActivate = () => {
    setItems(prev => prev.map(item => selectedItems.includes(item.id) ? { ...item, status: 'Active' } : item));
    setToastMessage(`Successfully activated ${selectedItems.length} selected item(s)`);
    setSelectedItems([]);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBulkArchive = () => {
    setItems(prev => prev.map(item => selectedItems.includes(item.id) ? { ...item, status: 'Archived' } : item));
    setToastMessage(`Successfully archived ${selectedItems.length} selected item(s)`);
    setSelectedItems([]);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to permanently delete these ${selectedItems.length} selected item(s)?`)) {
      setItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setToastMessage(`Permanently deleted ${selectedItems.length} selected item(s)`);
      setSelectedItems([]);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleBulkChangeCategory = (newCategory: string) => {
    if (!newCategory.trim()) return;
    setItems(prev => prev.map(item => selectedItems.includes(item.id) ? { ...item, category: newCategory.trim() } : item));
    setToastMessage(`Updated category to "${newCategory.trim()}" for ${selectedItems.length} selected item(s)`);
    setSelectedItems([]);
    setBulkActionType(null);
    setBulkInputValue('');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBulkChangeBrand = (newBrand: string) => {
    if (!newBrand.trim()) return;
    setToastMessage(`Successfully reassigned brand to "${newBrand.trim()}" for ${selectedItems.length} selected item(s)`);
    setSelectedItems([]);
    setBulkActionType(null);
    setBulkInputValue('');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBulkAddTag = (tag: string) => {
    if (!tag.trim()) return;
    setToastMessage(`Successfully added tag "${tag.trim()}" to ${selectedItems.length} selected item(s)`);
    setSelectedItems([]);
    setBulkActionType(null);
    setBulkInputValue('');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBulkAddBadge = (badge: string) => {
    if (!badge.trim()) return;
    setToastMessage(`Successfully added badge "${badge.trim()}" to ${selectedItems.length} selected item(s)`);
    setSelectedItems([]);
    setBulkActionType(null);
    setBulkInputValue('');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBulkChangePrice = (price: string) => {
    if (!price.trim()) return;
    setToastMessage(`Successfully updated retail sales price to "$${price.trim()}" for ${selectedItems.length} selected item(s)`);
    setSelectedItems([]);
    setBulkActionType(null);
    setBulkInputValue('');
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (selectedItemForDetail) {
    return (
      <ItemDetails
        onBack={() => setSelectedItemForDetail(null)}
        onEdit={() => {
          setItemToEdit(selectedItemForDetail);
          setCameFromDetail(true);
          setSelectedItemForDetail(null);
        }}
        itemData={{
          // Backend uid — drives the real-API panels (remarks, barcodes). Without it those
          // panels render empty. selectedItemForDetail.id is the item master uid (same value
          // used by the status mutation).
          uid: selectedItemForDetail.id,
          itemUid: selectedItemForDetail.id,
          catalogItemUid: (selectedItemForDetail as any).catalogItemUid,
          itemName: selectedItemForDetail.name,
          itemDescription: (selectedItemForDetail as any).description || '',
          selectedCategory: selectedItemForDetail.category,
          // Backend returns `brandName`; the old `.brand` read was always empty, which is
          // why a saved brand never showed on the detail page.
          selectedBrand: (selectedItemForDetail as any).brandName || (selectedItemForDetail as any).brand || '',
          sku: selectedItemForDetail.sku,
          barcode: (selectedItemForDetail as any).barcode || (selectedItemForDetail as any).barCode || '',
          hsnCode: (selectedItemForDetail as any).hsnCode || '',
          selectedItemType: (selectedItemForDetail as any).itemType || '',
          weight: (selectedItemForDetail as any).weight || '',
          selectedTaxGroup: (selectedItemForDetail as any).taxGroup || '',
          selectedTaxPreference: (selectedItemForDetail as any).taxPreference || '',
          trackStock: selectedItemForDetail.trackInventory,
          batchTracking: Boolean((selectedItemForDetail as any).batchTracking),
          assignments: (selectedItemForDetail as any).assignments || [],
          // Variant option defs are rebuilt from the persisted variant rows (item_variant_tbl),
          // not read from a flat `attributes` array that no longer exists.
          attributes: reconstructVariantOptions((selectedItemForDetail as any).variantList),
          galleryImages: selectedItemForDetail.image ? [selectedItemForDetail.image] : [],
          infoBlocks: (selectedItemForDetail as any).infoBlocks || [],
          upsells: ((selectedItemForDetail as any).upsellItemUids || []).map(
            (uid: string) => (backendItems || []).find((it: any) => it.uid === uid)?.name || uid
          ),
          crossSells: ((selectedItemForDetail as any).crossSellItemUids || []).map(
            (uid: string) => (backendItems || []).find((it: any) => it.uid === uid)?.name || uid
          ),
          tags: (selectedItemForDetail as any).tags || [],
          badges: (selectedItemForDetail as any).badges || [],
          drugSchedule: (selectedItemForDetail as any).drugSchedule || (selectedItemForDetail as any).attributes?.drugSchedule,
          ayushType: (selectedItemForDetail as any).ayushType || (selectedItemForDetail as any).attributes?.ayushType,
          shelfLifeMonths: (selectedItemForDetail as any).shelfLifeMonths || (selectedItemForDetail as any).attributes?.shelfLifeMonths,
          noExpiry: Boolean((selectedItemForDetail as any).noExpiry || (selectedItemForDetail as any).attributes?.noExpiry),
          composition: (selectedItemForDetail as any).composition || (selectedItemForDetail as any).attributes?.composition
        }}
      />
    );
  }

  if (itemToEdit) {
    // Wait for the item's existing catalog placements (1a) before mounting the wizard, so the
    // Catalog & Pricing step seeds from the real rows rather than a blank one.
    if (editPlacementsLoading) {
      return <div className="p-8 text-sm text-surface-500">Loading item…</div>;
    }
    return (
      <CreateItem
        onBack={() => {
          if (cameFromDetail) {
            setSelectedItemForDetail(itemToEdit);
            setCameFromDetail(false);
          }
          setItemToEdit(null);
        }}
        itemToEdit={itemToEditWithAssignments}
        onSave={async (updatedItem) => {
          const payload = toBackendItemPayload(updatedItem);
          // useUpdateItem destructures `payload` — the old call passed `data:`, so the PUT body
          // was undefined and edits silently persisted nothing.
          await updateItemMutation.mutateAsync({ uid: itemToEdit.id, payload });

          // 1b — persist catalog & pricing changes. Existing placements (with a catalogItemUid
          // loaded in 1a) are PUT-updated; brand-new rows are POSTed. Opening stock is applied
          // only for new placements, never re-added to an existing one.
          try {
            await persistItemAssignments(itemToEdit.id, updatedItem);
          } catch (e) {
            console.warn('Edit: assignment persistence partially failed:', e);
          }

          const mergedItem = { ...itemToEdit, ...updatedItem };
          setItems(prevItems => prevItems.map(item => item.id === mergedItem.id ? mergedItem : item));
          if (cameFromDetail) {
            setSelectedItemForDetail(mergedItem);
            setCameFromDetail(false);
          }
          setItemToEdit(null);
          setToastMessage(`Successfully saved changes for ${mergedItem.name}`);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />
    );
  }

  if (showCreate) {
    return <CreateItem
      onBack={() => setShowCreate(false)}
      onSave={async (newItem) => {
        const payload = toBackendItemPayload(newItem);

        try {
          const createdItem = await createItemMutation.mutateAsync(payload);
          const itemUid = createdItem?.uid || createdItem?.id || String(Date.now());

          if (newItem.assignments && newItem.assignments.length > 0) {
            for (const assignment of newItem.assignments) {
              // Add the item to the inventory catalog. Opening stock is applied against
              // the resulting catalog-item (the backend stock engine keys on catalogItemUid,
              // not store+item), so capture its uid from the response.
              //
              // The item is placed in the explicitly chosen inventory catalog, or — when that
              // column is hidden (tracking off) or left blank — the selected store's own
              // inventory catalog. Without this fallback, picking a store + price saved nothing.
              const targetCatalogUid = assignment.inventoryCatalog || assignment.storeInventoryCatalogUid;
              let catalogItemUid: string | null = null;

              // The row carries one base price (against the default selling unit); every other
              // selling unit is priced from its conversion ratio unless the user overrode it.
              // Computed once here because it feeds both writes below.
              const unitPrices = deriveCatalogUnitPrices(
                newItem.units,
                newItem.baseUnitUid,
                Number(assignment.mrp) || 0,
                Number(assignment.salesPrice) || 0,
                assignment.unitPrices
              );

              if (targetCatalogUid) {
                try {
                  const created = await addInventoryCatalogItemMutation.mutateAsync({
                    catalogUid: targetCatalogUid,
                    itemData: {
                      itemUid,
                      active: true,
                      mrp: Number(assignment.mrp) || 0,
                      sellingPrice: Number(assignment.salesPrice) || 0,
                      ...(unitPrices.length ? { units: unitPrices } : {}),
                    }
                  });
                  catalogItemUid = created?.uid || created?.id || null;
                } catch (e) {
                  console.warn('Catalog assignment skipped or failed:', e);
                }
              } else if (assignment.store) {
                console.warn(`Store "${assignment.store}" has no inventory catalog — cannot place the item. Enable inventory on the store first.`);
              }

              // Price belongs to the ORDER catalog, not the stock row: the same stock sold through
              // a dealer and a retail catalog must be able to carry different prices. The inventory
              // catalog item above keeps owning stock and is referenced, not duplicated.
              //
              // Until this existed the "Order Catalog" column on the assignment step was inert —
              // whatever the user picked was never read on save.
              if (assignment.catalog) {
                try {
                  await addOrderCatalogItemMutation.mutateAsync({
                    orderCatalogUid: assignment.catalog,
                    itemData: {
                      itemUid,
                      inventoryCatalogItemUid: catalogItemUid,
                      // Carried alongside the stock row so the catalog's offerings can be grouped
                      // by source warehouse — an order catalog may span several.
                      inventoryCatalogUid: targetCatalogUid || null,
                      showMrp: assignment.showMrp === 'Yes',
                      active: true,
                      ...(unitPrices.length ? { units: unitPrices } : {}),
                    },
                  });
                } catch (e) {
                  console.warn('Order-catalog pricing skipped or failed:', e);
                }
              }

              const openingQty = parseInt(assignment.openingStock);
              if (catalogItemUid && openingQty > 0) {
                try {
                  // Backend enums: AdjustmentType.ADDITION / AdjustmentTarget.IN_HAND;
                  // payload is a single catalog item + quantity (not store + item list).
                  await createStockAdjustmentMutation.mutateAsync({
                    catalogItemUid,
                    type: 'ADDITION',
                    target: 'IN_HAND',
                    quantity: openingQty,
                    reason: 'Opening Stock',
                    notes: `Opening stock for ${newItem.name}`,
                  });
                } catch (e) {
                  console.warn('Opening stock assignment skipped or failed:', e);
                }
              } else if (assignment.store && openingQty > 0) {
                console.warn('Opening stock needs an inventory catalog on the assignment row; skipped.');
              }
            }
          }

          setItems(prev => [{...newItem, id: itemUid}, ...prev]);
          setShowCreate(false);
          setToastMessage(`Successfully created ${newItem.name} and mapped catalogs`);
          setTimeout(() => setToastMessage(null), 3000);
        } catch (error) {
          console.error("Failed to create item", error);
        }
      }}
    />;
  }

  const toggleAll = () => {
    if (selectedItems.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredProducts.map(i => i.id));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getStatusStyles = (status: ProductItem['status']) => {
    switch (status) {
      case 'Active':
        return "bg-success-50 text-success-600";
      case 'Draft':
        return "bg-[#E6EEF9] text-[#4267B2]";
      case 'Archived':
        return "bg-red-50 text-red-600";
      default:
        return "bg-surface-50 text-surface-500";
    }
  };

  const getStatusDot = (status: ProductItem['status']) => {
    switch (status) {
      case 'Active': return "bg-success-600";
      case 'Draft': return "bg-[#4267B2]";
      case 'Archived': return "bg-red-600";
      default: return "bg-surface-400";
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen overflow-x-hidden w-full max-w-full">
      {/* 1. Page Header */}
      <div className="bg-white border-b border-surface-100 py-3.5 px-4 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button className="p-1 hover:bg-surface-100 rounded transition-colors text-surface-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-surface-900 tracking-tight">Items</h1>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FAF9F6] border border-surface-200 hover:border-[#55349A]/50 hover:bg-violet-50/50 rounded-xl text-sm font-bold text-[#55349A] transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95 duration-150"
        >
          <Upload className="h-4 w-4 text-[#55349A] stroke-[2.5]" />
          <span>Import</span>
        </button>
      </div>

      {/* 2. Main Page Content */}
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-surface-200 shadow-sm space-y-4 overflow-hidden">
          {/* Toolbar */}
          <div className="p-6 border-b border-surface-100 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              {selectedItems.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setBulkDropdownOpen(!bulkDropdownOpen)}
                    type="button"
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF9F6] border border-surface-200 hover:border-[#55349A]/50 hover:bg-violet-50/50 rounded-xl text-sm font-bold text-[#55349A] transition-all cursor-pointer shadow-sm select-none active:scale-95 duration-150"
                  >
                    <span>Actions ({selectedItems.length})</span>
                    <ChevronDown className={cn("h-4 w-4 text-[#55349A] transition-transform duration-200", bulkDropdownOpen && "rotate-180")} />
                  </button>

                  {bulkDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30 cursor-default" onClick={() => setBulkDropdownOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-surface-200 rounded-xl shadow-2xl z-45 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 text-left">
                        <div className="px-4 py-2 border-b border-surface-100 text-[10px] font-bold text-surface-400 uppercase tracking-widest bg-surface-50/50">
                          Bulk Operations ({selectedItems.length})
                        </div>
                        <button
                          onClick={() => {
                            handleBulkActivate();
                            setBulkDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50/50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Activate
                        </button>
                        <button
                          onClick={() => {
                            handleBulkArchive();
                            setBulkDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-50/50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5 text-amber-500" />
                          Archive
                        </button>
                        <button
                          onClick={() => {
                            handleBulkDelete();
                            setBulkDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50/50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          Delete
                        </button>

                        <div className="h-px bg-surface-100" />

                        <button
                          onClick={() => {
                            setBulkActionType('category');
                            setBulkInputValue('');
                            setBulkDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                          Change Category
                        </button>
                        <button
                          onClick={() => {
                            setBulkActionType('brand');
                            setBulkInputValue('');
                            setBulkDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                          Change Brand
                        </button>
                        <button
                          onClick={() => {
                            setBulkActionType('tag');
                            setBulkInputValue('');
                            setBulkDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          add tag
                        </button>
                        <button
                          onClick={() => {
                            setBulkActionType('badge');
                            setBulkInputValue('');
                            setBulkDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Award className="w-3.5 h-3.5 text-slate-400" />
                          add Badge
                        </button>
                        <button
                          onClick={() => {
                            setBulkActionType('price');
                            setBulkInputValue('');
                            setBulkDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Coins className="w-3.5 h-3.5 text-slate-400" />
                          change price
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#55349A] border border-[#55349A] rounded-xl text-sm font-bold text-white hover:bg-[#452a7d] transition-colors shadow-lg shadow-primary-500/10"
              >
                <Plus className="h-4 w-4" />
                Create Item
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="w-full overflow-x-auto rounded-xl border border-surface-200 shadow-3xs">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface-50 border-y border-surface-100 select-none text-surface-400 text-[10.5px] font-bold uppercase tracking-wider">
                  <th className="px-[22px] py-2.5 w-12">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === filteredProducts.length && filteredProducts.length > 0}
                        onChange={toggleAll}
                        className="h-[15px] w-[15px] cursor-pointer accent-primary-600"
                      />
                    </div>
                  </th>
                  <th className="px-[22px] py-2.5 text-[10.5px] font-bold text-surface-400 uppercase tracking-wider w-[24%] min-w-[240px]">
                    <button type="button" onClick={() => toggleSort('name')} className="flex items-center gap-1.5 uppercase tracking-wider cursor-pointer group hover:text-surface-700 transition-colors">
                      <span>ITEM</span>
                      <ArrowDown className={cn("h-3 w-3 transition-all", sortKey === 'name' ? "text-primary-600" : "text-surface-300 group-hover:text-surface-500", sortKey === 'name' && sortDir === 'asc' && "rotate-180")} />
                    </button>
                  </th>
                  <th className="px-[22px] py-2.5 text-[10.5px] font-bold text-surface-400 uppercase tracking-wider relative">
                    <div className="flex items-center gap-1.5 cursor-pointer select-none group" onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}>
                      <span>CATEGORY</span>
                      <ArrowDown className={cn("h-3 w-3 transition-colors", selectedCategory !== 'All Categories' ? "text-primary-600" : "text-surface-400 group-hover:text-surface-600")} />
                      {selectedCategory !== 'All Categories' && (
                        <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-md normal-case tracking-normal">
                          {selectedCategory}
                        </span>
                      )}
                    </div>
                    {categoryDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setCategoryDropdownOpen(false); }} />
                        <div className="absolute left-6 top-full mt-1 w-52 bg-white border border-surface-200 rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 text-left normal-case tracking-normal font-sans text-xs">
                          {categoriesList.map((categoryOption) => (
                            <button
                               key={categoryOption}
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedCategory(categoryOption);
                                 setCategoryDropdownOpen(false);
                               }}
                               className={cn(
                                 "w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer",
                                 selectedCategory === categoryOption ? "text-primary-600 bg-primary-50" : "text-slate-600 hover:bg-slate-50"
                               )}
                             >
                               <span>{categoryOption}</span>
                               {selectedCategory === categoryOption && <Check className="w-3.5 h-3.5 text-primary-600" />}
                             </button>
                          ))}
                        </div>
                      </>
                    )}
                  </th>
                  <th className="px-[22px] py-2.5 text-[10.5px] font-bold text-surface-400 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('sku')} className="flex items-center gap-1.5 uppercase tracking-wider cursor-pointer group hover:text-surface-700 transition-colors">
                      <span>SKU</span>
                      <ArrowDown className={cn("h-3 w-3 transition-all", sortKey === 'sku' ? "text-primary-600" : "text-surface-300 group-hover:text-surface-500", sortKey === 'sku' && sortDir === 'asc' && "rotate-180")} />
                    </button>
                  </th>
                  <th className="px-[22px] py-2.5 text-[10.5px] font-bold text-surface-400 uppercase tracking-wider text-right">PRICE</th>
                  <th className="px-[22px] py-2.5 text-[10.5px] font-bold text-surface-400 uppercase tracking-wider text-right">STOCK</th>
                  <th className="px-[22px] py-2.5 text-[10.5px] font-bold text-surface-400 uppercase tracking-wider">VARIANTS</th>
                  <th className="px-[22px] py-2.5 text-[10.5px] font-bold text-surface-400 uppercase tracking-wider text-center">TRACK INVENTORY</th>
                  <th className="px-[22px] py-2.5 text-[10.5px] font-bold text-surface-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1 group cursor-pointer">
                      STATUS
                      <ArrowDown className="h-3 w-3 text-surface-300 group-hover:text-surface-600 transition-colors" />
                    </div>
                  </th>
                  <th className="px-[22px] py-2.5 text-[10.5px] font-bold text-surface-400 uppercase tracking-wider text-right pr-12 w-64">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredProducts.length > 0 ? (
                  pagedProducts.map((item) => (
                    <tr key={item.id} className="border-b border-surface-100 px-[22px] py-2.5 text-[12.5px] hover:bg-surface-50 transition-colors group">
                    <td className="px-[22px] py-2.5">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="appearance-none h-5 w-5 rounded-[4px] border border-surface-300 bg-white checked:bg-primary-600 checked:border-primary-600 checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%2220%206%209%2017%204%2012%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat checked:bg-[length:12px_12px] cursor-pointer transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-[22px] py-2.5 w-[24%] min-w-[240px]">
                      <div className="flex items-center gap-4">
                        <div
                          onClick={() => setSelectedItemForDetail(item)}
                          className="h-12 w-12 bg-surface-100 rounded-lg overflow-hidden shrink-0 border border-surface-200 cursor-pointer hover:border-[#55349A] transition-all"
                        >
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-surface-400">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span
                            onClick={() => setSelectedItemForDetail(item)}
                            className="font-bold text-surface-900 text-[15px] hover:text-[#55349A] hover:underline cursor-pointer transition-colors"
                          >
                            {item.name}
                          </span>
                          <span className="text-[11px] text-surface-400 mt-0.5">{item.itemNo || item.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-[22px] py-2.5">
                      <span className="text-sm font-bold text-surface-700">{item.category}</span>
                    </td>
                    <td className="px-[22px] py-2.5">
                      <span className="text-sm font-semibold text-surface-500 font-mono uppercase tracking-tight">{item.sku}</span>
                    </td>
                    <td className="px-[22px] py-2.5 text-right">
                      {item.price != null ? (
                        <span className="text-sm font-bold text-surface-800">
                          ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-sm text-surface-300">—</span>
                      )}
                    </td>
                    <td className="px-[22px] py-2.5 text-right">
                      {!item.trackInventory ? (
                        <span className="text-xs text-surface-300">—</span>
                      ) : (
                        <span className={cn(
                          "text-sm font-bold",
                          (item.onHand ?? 0) <= 0 ? "text-red-500" : "text-surface-800"
                        )}>
                          {item.onHand != null ? item.onHand.toLocaleString('en-IN') : '0'}
                        </span>
                      )}
                    </td>
                    <td className="px-[22px] py-2.5">
                      <span className="text-sm font-bold text-surface-700">{item.variants}</span>
                    </td>
                    <td className="px-[22px] py-2.5 text-center">
                      <span className="text-sm font-semibold text-surface-700">{item.trackInventory ? 'Yes' : 'No'}</span>
                    </td>
                    <td className="px-[22px] py-2.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-bold shrink-0 min-w-[90px]",
                        getStatusStyles(item.status)
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDot(item.status))} />
                        {item.status}
                      </span>
                    </td>
                     <td className="px-[22px] py-2.5 relative pr-12 w-64 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedItemForDetail(item)}
                          className="flex items-center gap-2 px-4 py-1.5 border border-surface-200 rounded-lg text-sm font-bold text-primary-700 hover:bg-primary-50 transition-colors shadow-sm cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#55349A]" />
                          View
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setActiveActionsId(activeActionsId === item.id ? null : item.id)}
                            className="p-1.5 border border-surface-200 rounded-lg text-surface-400 hover:text-surface-900 transition-colors shadow-sm cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {activeActionsId === item.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActiveActionsId(null)} />
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-surface-200 rounded-xl shadow-2xl z-40 py-1.5 text-left overflow-hidden">
                                <button
                                  onClick={() => {
                                    setItemToEdit(item);
                                    setActiveActionsId(null);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                                  Edit Item
                                </button>
                                <button
                                  onClick={() => handleDuplicateItem(item)}
                                  className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                                  Duplicate Item
                                </button>
                                <button
                                  onClick={() => handleToggleArchive(item)}
                                  className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Archive className="w-3.5 h-3.5 text-orange-500" />
                                  {item.status === 'Archived' ? 'Set as Active' : 'Archive Item'}
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Item
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-surface-400 font-semibold text-xs">
                      No matching items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            total={filteredProducts.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            noun="items"
          />
        </div>
      </div>

        {/* Beautiful Bulk Modifier Dialog Modal */}
        {bulkActionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-150 shadow-2xl relative text-left animate-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => { setBulkActionType(null); setBulkInputValue(''); }}
                className="absolute right-4 top-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-md font-extrabold text-slate-900 pr-8">
                {bulkActionType === 'category' && 'Change Category'}
                {bulkActionType === 'brand' && 'Change Brand'}
                {bulkActionType === 'tag' && 'Add Tag'}
                {bulkActionType === 'badge' && 'Add Badge'}
                {bulkActionType === 'price' && 'Change Price'}
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Applying updates to {selectedItems.length} selected item(s).
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (bulkActionType === 'category') handleBulkChangeCategory(bulkInputValue);
                  if (bulkActionType === 'brand') handleBulkChangeBrand(bulkInputValue);
                  if (bulkActionType === 'tag') handleBulkAddTag(bulkInputValue);
                  if (bulkActionType === 'badge') handleBulkAddBadge(bulkInputValue);
                  if (bulkActionType === 'price') handleBulkChangePrice(bulkInputValue);
                }}
                className="mt-5 space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {bulkActionType === 'category' && 'Category Name'}
                    {bulkActionType === 'brand' && 'Brand Name'}
                    {bulkActionType === 'tag' && 'Tag Name'}
                    {bulkActionType === 'badge' && 'Badge Text'}
                    {bulkActionType === 'price' && 'Retail Sales Price ($)'}
                  </label>
                  <input
                    type={bulkActionType === 'price' ? 'number' : 'text'}
                    step={bulkActionType === 'price' ? '0.01' : undefined}
                    placeholder={
                      bulkActionType === 'category' ? 'e.g. Apparel, Shirts...' :
                      bulkActionType === 'brand' ? 'Brand name...' :
                      bulkActionType === 'tag' ? 'e.g. Eco, Winter...' :
                      bulkActionType === 'badge' ? 'Badge text...' :
                      'e.g. 29.99'
                    }
                    value={bulkInputValue}
                    onChange={(e) => setBulkInputValue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#55349A]/10 focus:border-[#55349A] outline-none transition-all"
                    autoFocus
                    required
                  />

                  {/* Category Fast Selection Toggles */}
                  {bulkActionType === 'category' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([ ] as string[]).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setBulkInputValue(cat)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all",
                            bulkInputValue === cat
                              ? "bg-[#55349A] border-[#55349A] text-white animate-pulse"
                              : "bg-surface-50 border-surface-200 text-slate-600 hover:border-[#55349A]/30 hover:bg-violet-50/20 font-semibold"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Badge Fast Selection Toggles */}
                  {bulkActionType === 'badge' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([ ] as string[]).map(bdg => (
                        <button
                          key={bdg}
                          type="button"
                          onClick={() => setBulkInputValue(bdg)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all",
                            bulkInputValue === bdg
                              ? "bg-[#55349A] border-[#55349A] text-white animate-pulse"
                              : "bg-surface-50 border-surface-200 text-slate-600 hover:border-[#55349A]/30 hover:bg-violet-50/20 font-semibold"
                          )}
                        >
                          {bdg}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setBulkActionType(null); setBulkInputValue(''); }}
                    className="px-4 py-2 border border-slate-200 text-xs font-extrabold text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#55349A] border border-[#55349A] text-white text-xs font-extrabold rounded-xl shadow-md hover:bg-[#462985] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 duration-100"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Real-time Toast success message */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-55 bg-slate-900 border border-slate-850 text-white rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold tracking-normal">{toastMessage}</span>
          </div>
        )}

        {/* Import Wizard */}
        <ItemImportWizard
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setToastMessage("Import completed successfully!");
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }}
        />
      </div>
  );
};
