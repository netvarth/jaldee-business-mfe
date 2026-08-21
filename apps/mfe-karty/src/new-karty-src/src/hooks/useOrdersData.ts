import { useMemo } from 'react';
import {
  useOrders,
  useCreateOrder,
  useUpdateOrder,
  useUpdateOrderStatus,
  useCancelOrder,
  useReviewOrder,
  useAttachConsumer,
  useRaiseOrderInvoice,
  useRecordOrderPayment,
  useAssignOrder,
  useSetOrderLabel,
} from '../../../services/useOrders';
import { useUsers } from '../../../services/useUsers';
import { useTradePartners } from '../../../services/useTradePartners';
import { useItems } from '../../../services/useItems';
import { useStores } from '../../../services/useStores';
import { useOrderCatalogs } from '../../../services/useOrderCatalogs';
import { useStoreCatalogProducts } from '../../../services/useOrderCatalogItems';
import { useUnits } from '../../../services/useUnits';
import { useCustomers, useCreateCustomer } from '../../../services/useCustomers';
import { useStorefrontSettings } from '../../../services/useStorefrontSettings';
import type { POSUnit, POSProduct } from '../components/OrdersTable';

export function useOrdersData(selectedStore?: string) {
  const { data: backendOrders, isLoading: ordersLoading } = useOrders();
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const updateStatusMutation = useUpdateOrderStatus();
  const cancelOrderMutation = useCancelOrder();
  const raiseInvoiceMutation = useRaiseOrderInvoice();
  const recordPaymentMutation = useRecordOrderPayment();
  const reviewOrderMutation = useReviewOrder();
  const attachConsumer = useAttachConsumer();
  const assignOrderMutation = useAssignOrder();
  const setOrderLabelMutation = useSetOrderLabel();

  // Live Staff Assignees from CRM
  const { data: staffUsersData } = useUsers('', 'Active');
  const staffAssignees = useMemo(() => {
    const users = staffUsersData?.content || [];
    return [
      { uid: 'UNASSIGN', name: 'Unassigned', role: 'Clear current assignee', avatar: '—' },
      ...users.map((u) => {
        const name = (u.userDisplayName || `${u.firstName || ''} ${u.lastName || ''}`.trim()) || 'Staff Member';
        const initials = ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase() || 'ST';
        return {
          uid: u.uid,
          name,
          role: u.departmentName || 'Staff Assignee',
          avatar: initials,
        };
      }),
    ];
  }, [staffUsersData]);

  const { data: backendItems } = useItems();
  const { data: backendStores } = useStores();
  const { data: backendCatalogs } = useOrderCatalogs();
  const { data: tradePartners } = useTradePartners();
  const { data: backendUnits } = useUnits();
  const { data: backendCustomers } = useCustomers();
  const createCustomerMutation = useCreateCustomer();
  const { data: commerceSettings } = useStorefrontSettings();
  const consumerMandatory = !!commerceSettings?.orderRequiresConsumer;

  const existingCustomers = useMemo(
    () =>
      (backendCustomers || []).map((c: any) => ({
        name:
          c.displayName ||
          [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
          c.consumerNo ||
          'Customer',
        id: c.uid,
        consumerNo: c.consumerNo || '',
        phone: c.phoneE164 || '',
        email: c.email || '',
        address: c.address || '',
      })),
    [backendCustomers]
  );

  const availableStores = useMemo(() => {
    const list = (backendStores || [])
      .filter((store: any) => store.status === 'Active' || store.status === 'ACTIVE' || !store.status)
      .map((store: any) => ({
        name: store.name || store.storeName || store.id || store.uid,
        code: store.code || store.id || store.uid || '',
      }))
      .filter((store: any) => store.name);

    if (list.length > 0) return list;
    if (backendStores && backendStores.length > 0) {
      return backendStores.map((s: any) => ({ name: s.name || s.id, code: s.code || '' })).filter((s: any) => s.name);
    }
    return [{ name: 'Main Store', code: 'MAIN' }];
  }, [backendStores]);

  // Product catalogs are store-scoped: each order catalog belongs to a store (storeUid), so the
  // POS catalog picker must show only the catalogs of the selected fulfillment store (plus any
  // store-agnostic catalog). Falls back to all catalogs when no store resolves or none match.
  const availableCatalogs = useMemo(() => {
    const cats = backendCatalogs || [];
    const storeUid = (backendStores || []).find((s: any) => s.name === selectedStore)?.id || null;
    // Once a store is chosen, show only its catalogs (plus any store-agnostic one). A store with no
    // catalog shows none — surfacing that it needs one — rather than borrowing other stores'
    // catalogs. Before a store is chosen, show all.
    const src = storeUid
      ? cats.filter((c: any) => !c.storeUid || c.storeUid === storeUid)
      : cats;
    return src.map((catalog: any) => catalog.name || catalog.catalogName || catalog.id || catalog.uid).filter(Boolean);
  }, [backendCatalogs, backendStores, selectedStore]);

  const unitNameByUid = useMemo(() => {
    const map: Record<string, string> = {};
    (backendUnits || []).forEach((u: any) => { if (u?.uid) map[u.uid] = u.name || u.symbol || 'Unit'; });
    return map;
  }, [backendUnits]);

  const backendItemMap = useMemo(() => {
    const map = new Map<string, any>();
    (backendItems || []).forEach((item: any) => {
      if (item.uid) map.set(item.uid, item);
      if (item.id) map.set(item.id, item);
    });
    return map;
  }, [backendItems]);

  const activeProducts = useMemo(() => {
    if (backendItems && backendItems.length > 0) {
      const seen = new Set<string>();
      return backendItems.filter((item: any) => {
        const id = item.uid || item.id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      }).map((item: any) => {
        const units: POSUnit[] = (item.units || [])
          .filter((u: any) => u?.selling)
          .map((u: any) => ({
            unitUid: u.unitUid,
            name: unitNameByUid[u.unitUid] || u.unitName || u.name || 'Unit',
            conversionQty: Number(u.conversionQty) || 1,
            sellingPrice: Number(u.sellingPrice) || 0,
            isDefault: !!u.isDefault,
          }));
        const defaultUnit = units.find((u) => u.isDefault) || units[0];
        const catName = item.categoryName || item.category?.name || 'General';
        const imgUrl = item.image || item.displayImage || item.imageUrl || item.images?.[0]?.url || item.thumbnailUrl || '';
        const barcode = item.attributes?.barcode || item.barcode || '';
        const sku = item.sku || item.code || '';
        const code = item.code || '';
        const brand = item.brandName || item.brand || '';

        return {
          id: item.uid || item.id,
          itemUid: item.uid || item.id,
          name: item.name || 'Unknown Item',
          category: catName,
          price: defaultUnit?.sellingPrice || item.price || 0,
          image: imgUrl || '',
          sizes: ['Standard'],
          colors: ['Default'],
          units,
          code,
          sku,
          barcode,
          brand,
        } as POSProduct;
      });
    }
    return [] as POSProduct[];
  }, [backendItems, unitNameByUid]);

  const productCategories = useMemo(
    () => ['All', ...Array.from(new Set(activeProducts.map((product) => product.category).filter(Boolean)))],
    [activeProducts]
  );

  const selectedStoreUid = useMemo(
    () => (backendStores || []).find((s: any) => s.name === selectedStore)?.id || null,
    [backendStores, selectedStore]
  );
  const { data: storeCatalogItems } = useStoreCatalogProducts(selectedStoreUid);

  return {
    backendOrders,
    ordersLoading,
    createOrderMutation,
    updateOrderMutation,
    updateStatusMutation,
    cancelOrderMutation,
    raiseInvoiceMutation,
    recordPaymentMutation,
    reviewOrderMutation,
    attachConsumer,
    assignOrderMutation,
    setOrderLabelMutation,
    staffAssignees,
    backendItems,
    backendStores,
    backendCatalogs,
    tradePartners,
    backendUnits,
    backendCustomers,
    createCustomerMutation,
    consumerMandatory,
    existingCustomers,
    availableStores,
    availableCatalogs,
    unitNameByUid,
    backendItemMap,
    activeProducts,
    productCategories,
    selectedStoreUid,
    storeCatalogItems,
  };
}

export type OrdersDataHook = ReturnType<typeof useOrdersData>;
