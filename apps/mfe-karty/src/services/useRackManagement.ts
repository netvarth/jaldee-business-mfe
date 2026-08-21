import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export type ZoneType = 'PICKING' | 'BULK_STORAGE' | 'COLD_STORAGE' | 'RECEIVING' | 'QUARANTINE' | 'FRONT_DISPLAY';
export type RackType = 'STANDARD' | 'PALLET_RACK' | 'CANTILEVER' | 'GRAVITY_FLOW' | 'REFRIGERATED';
export type BinType = 'PRIMARY_PICK' | 'RESERVE' | 'OVERFLOW' | 'HAZMAT';
export type BinStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'MAINTENANCE';

export interface WarehouseBin {
  uid: string;
  shelfUid: string;
  binCode: string;
  barcode: string;
  binNumber: number;
  maxCapacityUnits: number;
  binType: BinType;
  status: BinStatus;
  allocatedItems?: BinStockAllocation[];
}

export interface WarehouseShelf {
  uid: string;
  rackUid: string;
  shelfNumber: number;
  name: string;
  maxWeightKg?: number;
  bins: WarehouseBin[];
}

export interface WarehouseRack {
  uid: string;
  zoneUid: string;
  name: string;
  code: string;
  rackType: RackType;
  totalShelves: number;
  shelves: WarehouseShelf[];
}

export interface WarehouseZone {
  uid: string;
  storeUid: string;
  name: string;
  code: string;
  zoneType: ZoneType;
  description?: string;
  racks: WarehouseRack[];
}

export interface BinStockAllocation {
  uid: string;
  binUid: string;
  itemUid: string;
  itemName: string;
  itemSku: string;
  batchUid?: string;
  batchNumber?: string;
  expiryDate?: string;
  qtyOnHand: number;
  qtyReserved: number;
  unitPrice?: number;
  lastPutawayAt?: string;
}

const STORAGE_KEY = 'karty_warehouse_live_state_v1';

function getLocalState(storeUid: string): WarehouseZone[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY + '_' + storeUid) : null;
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load local rack state", e);
  }
  return [];
}

function saveLocalState(storeUid: string, zones: WarehouseZone[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY + '_' + storeUid, JSON.stringify(zones));
    }
  } catch (e) {
    console.error("Failed to save local rack state", e);
  }
}

export function useWarehouseZones(storeUid?: string) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["warehouse-zones", storeUid],
    queryFn: async () => {
      if (!storeUid) return [];
      try {
        const res = await api.get<WarehouseZone[]>(`/v1/api/tenant/warehouse/zones?storeUid=${storeUid}`);
        if (Array.isArray(res)) {
          saveLocalState(storeUid, res);
          return res;
        }
      } catch (err: any) {
        // If backend returns 404 (needs restart), read from local store
        console.warn("Backend warehouse zones API not yet active on running instance, using store cache", err);
      }
      return getLocalState(storeUid);
    },
    enabled: !!storeUid,
    staleTime: 1000 * 15
  });
}

export function useRackHierarchy(storeUid?: string) {
  return useWarehouseZones(storeUid);
}

export function useCreateZone(storeUid?: string) {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newZone: {
      storeUid: string;
      name: string;
      code: string;
      zoneType: ZoneType;
      description?: string;
      racksCount?: number;
      shelvesPerRack?: number;
      binsPerShelf?: number;
    }) => {
      try {
        const res = await api.post<WarehouseZone>('/v1/api/tenant/warehouse/zones', newZone);
        if (res && res.uid) return res;
      } catch (err: any) {
        console.warn("Backend create zone unavailable (restart required), saving to local store", err);
      }

      // Generate local zone with requested rack bays, shelves, and bins
      const current = getLocalState(newZone.storeUid);
      const zoneUid = 'zone-' + Date.now();
      const racksCount = newZone.racksCount || 2;
      const shelvesCount = newZone.shelvesPerRack || 4;
      const binsCount = newZone.binsPerShelf || 4;

      const generatedRacks: WarehouseRack[] = Array.from({ length: racksCount }, (_, rIdx) => {
        const rackUid = zoneUid + '-r' + (rIdx + 1);
        const rackCode = 'R' + String(rIdx + 1).padStart(2, '0');

        const shelves: WarehouseShelf[] = Array.from({ length: shelvesCount }, (_, sIdx) => {
          const shelfNum = shelvesCount - sIdx;
          const shelfUid = rackUid + '-s' + shelfNum;

          const bins: WarehouseBin[] = Array.from({ length: binsCount }, (_, bIdx) => {
            const binNum = bIdx + 1;
            const binCode = newZone.code + '-' + rackCode + '-S' + String(shelfNum).padStart(2, '0') + '-B' + String(binNum).padStart(2, '0');
            return {
              uid: shelfUid + '-b' + binNum,
              shelfUid,
              binCode,
              barcode: 'BIN-' + binCode,
              binNumber: binNum,
              maxCapacityUnits: 100,
              binType: 'PRIMARY_PICK' as BinType,
              status: 'ACTIVE' as BinStatus,
              allocatedItems: []
            };
          });

          return {
            uid: shelfUid,
            rackUid,
            shelfNumber: shelfNum,
            name: 'Shelf ' + shelfNum,
            bins
          };
        });

        return {
          uid: rackUid,
          zoneUid,
          name: 'Rack ' + newZone.code + (rIdx + 1),
          code: rackCode,
          rackType: 'STANDARD' as RackType,
          totalShelves: shelvesCount,
          shelves
        };
      });

      const fullZone: WarehouseZone = {
        uid: zoneUid,
        storeUid: newZone.storeUid,
        name: newZone.name,
        code: newZone.code,
        zoneType: newZone.zoneType,
        description: newZone.description,
        racks: generatedRacks
      };

      const updated = [...current, fullZone];
      saveLocalState(newZone.storeUid, updated);
      return fullZone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-zones", storeUid] });
    }
  });
}

export function useCreateRack(storeUid?: string) {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newRack: {
      zoneUid: string;
      name: string;
      code: string;
      rackType: RackType;
      totalShelves?: number;
    }) => {
      try {
        const res = await api.post<WarehouseRack>('/v1/api/tenant/warehouse/racks', newRack);
        if (res && res.uid) return res;
      } catch (err: any) {
        console.warn("Backend create rack unavailable (restart required), saving to local store", err);
      }

      if (!storeUid) throw new Error("Store UID is required");
      const current = getLocalState(storeUid);
      const zone = current.find(z => z.uid === newRack.zoneUid);
      if (!zone) throw new Error("Zone not found");

      const rackUid = 'rack-' + Date.now();
      const shelvesCount = newRack.totalShelves || 4;
      const binsPerShelf = 4;

      const shelves: WarehouseShelf[] = Array.from({ length: shelvesCount }, (_, sIdx) => {
        const shelfNum = shelvesCount - sIdx;
        const shelfUid = rackUid + '-s' + shelfNum;

        const bins: WarehouseBin[] = Array.from({ length: binsPerShelf }, (_, bIdx) => {
          const binNum = bIdx + 1;
          const binCode = zone.code + '-' + newRack.code + '-S' + String(shelfNum).padStart(2, '0') + '-B' + String(binNum).padStart(2, '0');
          return {
            uid: shelfUid + '-b' + binNum,
            shelfUid,
            binCode,
            barcode: 'BIN-' + binCode,
            binNumber: binNum,
            maxCapacityUnits: 100,
            binType: 'PRIMARY_PICK' as BinType,
            status: 'ACTIVE' as BinStatus,
            allocatedItems: []
          };
        });

        return {
          uid: shelfUid,
          rackUid,
          shelfNumber: shelfNum,
          name: 'Shelf ' + shelfNum,
          bins
        };
      });

      const generatedRack: WarehouseRack = {
        uid: rackUid,
        zoneUid: newRack.zoneUid,
        name: newRack.name,
        code: newRack.code,
        rackType: newRackTypeSafe(newRack.rackType),
        totalShelves: shelvesCount,
        shelves
      };

      zone.racks = zone.racks || [];
      zone.racks.push(generatedRack);
      saveLocalState(storeUid, current);
      return generatedRack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-zones", storeUid] });
    }
  });
}

function newRackTypeSafe(t?: RackType): RackType {
  return t || 'STANDARD';
}

export function useTransferBinStock(storeUid?: string) {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferReq: {
      sourceBinUid: string;
      targetBinUid: string;
      itemUid: string;
      batchNumber?: string;
      qtyToMove: number;
    }) => {
      try {
        const res = await api.post<boolean>('/v1/api/tenant/warehouse/bins/transfer', transferReq);
        if (res) return { success: true };
      } catch (err: any) {
        console.warn("Backend transfer unavailable, moving in local store", err);
      }

      if (!storeUid) throw new Error("Store UID is required");
      const current = getLocalState(storeUid);
      let sourceBin: WarehouseBin | null = null;
      let targetBin: WarehouseBin | null = null;

      for (const z of current) {
        for (const r of (z.racks || [])) {
          for (const s of (r.shelves || [])) {
            for (const b of (s.bins || [])) {
              if (b.uid === transferReq.sourceBinUid) sourceBin = b;
              if (b.uid === transferReq.targetBinUid) targetBin = b;
            }
          }
        }
      }

      if (!sourceBin || !targetBin) throw new Error("Source or destination bin not found");

      sourceBin.allocatedItems = sourceBin.allocatedItems || [];
      targetBin.allocatedItems = targetBin.allocatedItems || [];

      const sourceAllocIndex = sourceBin.allocatedItems.findIndex(
        a => a.itemUid === transferReq.itemUid && (!transferReq.batchNumber || a.batchNumber === transferReq.batchNumber)
      );

      if (sourceAllocIndex === -1) throw new Error("Item not found in source bin");
      const sourceAlloc = sourceBin.allocatedItems[sourceAllocIndex];

      if (sourceAlloc.qtyOnHand < transferReq.qtyToMove) {
        throw new Error('Insufficient stock in source bin. Available: ' + sourceAlloc.qtyOnHand);
      }

      sourceAlloc.qtyOnHand -= transferReq.qtyToMove;
      if (sourceAlloc.qtyOnHand <= 0) {
        sourceBin.allocatedItems.splice(sourceAllocIndex, 1);
      }

      const targetAlloc = targetBin.allocatedItems.find(
        a => a.itemUid === transferReq.itemUid && (!transferReq.batchNumber || a.batchNumber === transferReq.batchNumber)
      );

      if (targetAlloc) {
        targetAlloc.qtyOnHand += transferReq.qtyToMove;
      } else {
        targetBin.allocatedItems.push({
          uid: 'alloc-' + Date.now(),
          binUid: targetBin.uid,
          itemUid: sourceAlloc.itemUid,
          itemName: sourceAlloc.itemName,
          itemSku: sourceAlloc.itemSku,
          batchNumber: sourceAlloc.batchNumber,
          expiryDate: sourceAlloc.expiryDate,
          qtyOnHand: transferReq.qtyToMove,
          qtyReserved: 0,
          unitPrice: sourceAlloc.unitPrice,
          lastPutawayAt: new Date().toISOString().split('T')[0]
        });
      }

      saveLocalState(storeUid, current);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-zones", storeUid] });
    }
  });
}

export function useAssignItemToBin(storeUid?: string) {
  const api = useCommerceApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (putawayReq: {
      binUid: string;
      itemUid: string;
      itemName: string;
      itemSku: string;
      batchNumber?: string;
      expiryDate?: string;
      qty: number;
      unitPrice?: number;
    }) => {
      try {
        const res = await api.post<BinStockAllocation>('/v1/api/tenant/warehouse/bins/putaway', putawayReq);
        if (res && res.uid) return res;
      } catch (err: any) {
        console.warn("Backend putaway unavailable, allocating to local store", err);
      }

      if (!storeUid) throw new Error("Store UID is required");
      const current = getLocalState(storeUid);
      let targetBin: WarehouseBin | null = null;

      for (const z of current) {
        for (const r of (z.racks || [])) {
          for (const s of (r.shelves || [])) {
            for (const b of (s.bins || [])) {
              if (b.uid === putawayReq.binUid) targetBin = b;
            }
          }
        }
      }

      if (!targetBin) throw new Error("Destination bin not found");

      targetBin.allocatedItems = targetBin.allocatedItems || [];
      const existing = targetBin.allocatedItems.find(
        a => a.itemUid === putawayReq.itemUid && (!putawayReq.batchNumber || a.batchNumber === putawayReq.batchNumber)
      );

      if (existing) {
        existing.qtyOnHand += putawayReq.qty;
      } else {
        targetBin.allocatedItems.push({
          uid: 'alloc-' + Date.now(),
          binUid: targetBin.uid,
          itemUid: putawayReq.itemUid,
          itemName: putawayReq.itemName,
          itemSku: putawayReq.itemSku,
          batchNumber: putawayReq.batchNumber,
          expiryDate: putawayReq.expiryDate,
          qtyOnHand: putawayReq.qty,
          qtyReserved: 0,
          unitPrice: putawayReq.unitPrice || 0,
          lastPutawayAt: new Date().toISOString().split('T')[0]
        });
      }

      saveLocalState(storeUid, current);
      return targetBin;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-zones", storeUid] });
    }
  });
}

export interface WarehousePickLocation {
  itemUid: string;
  binUid: string;
  binCode: string;
  barcode: string;
  zoneName?: string;
  zoneCode?: string;
  rackName?: string;
  rackCode?: string;
  shelfName?: string;
  shelfNumber?: number;
  binNumber?: number;
  batchNumber?: string;
  qtyOnHand: number;
}

export function usePickLocations(storeUid?: string, itemUids?: string[]) {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["warehouse-pick-locations", storeUid, itemUids],
    queryFn: async () => {
      if (!storeUid) return [];
      try {
        let url = `/v1/api/tenant/warehouse/pick-locations?storeUid=${storeUid}`;
        if (itemUids && itemUids.length > 0) {
          url += `&itemUids=${itemUids.join(',')}`;
        }
        const res = await api.get<WarehousePickLocation[]>(url);
        if (Array.isArray(res)) return res;
      } catch (err) {
        // Fallback to reading from local state
      }

      // Local fallback lookup
      const current = getLocalState(storeUid);
      const pickList: WarehousePickLocation[] = [];

      const targetItemSet = itemUids && itemUids.length > 0 ? new Set(itemUids) : null;

      for (const z of current) {
        for (const r of (z.racks || [])) {
          for (const s of (r.shelves || [])) {
            for (const b of (s.bins || [])) {
              for (const alloc of (b.allocatedItems || [])) {
                if (!targetItemSet || targetItemSet.has(alloc.itemUid)) {
                  pickList.push({
                    itemUid: alloc.itemUid,
                    binUid: b.uid,
                    binCode: b.binCode,
                    barcode: b.barcode,
                    zoneName: z.name,
                    zoneCode: z.code,
                    rackName: r.name,
                    rackCode: r.code,
                    shelfName: s.name,
                    shelfNumber: s.shelfNumber,
                    binNumber: b.binNumber,
                    batchNumber: alloc.batchNumber,
                    qtyOnHand: alloc.qtyOnHand
                  });
                }
              }
            }
          }
        }
      }
      return pickList;
    },
    enabled: !!storeUid,
    staleTime: 1000 * 20
  });
}

export const RACK_ENABLED_KEY = 'karty_rack_management_enabled_';

/**
 * Single source of truth for the per-store rack-management toggle stored in localStorage.
 * Reads the explicit setting only — returns `null` when the user has never toggled it, so
 * each caller can apply its own context-appropriate default (local zones, live pick
 * locations, or a hardcoded default). Use these instead of hand-rolling the key + window
 * guard at every call site.
 */
export function readRackEnabledSetting(storeUid?: string): boolean | null {
  if (!storeUid || typeof window === 'undefined') return null;
  const saved = localStorage.getItem(RACK_ENABLED_KEY + storeUid);
  return saved === null ? null : saved === 'true';
}

export function writeRackEnabledSetting(storeUid: string, enabled: boolean): void {
  if (storeUid && typeof window !== 'undefined') {
    localStorage.setItem(RACK_ENABLED_KEY + storeUid, enabled ? 'true' : 'false');
  }
}

export function isRackManagementEnabledForStore(storeUid?: string): boolean {
  if (!storeUid) return false;
  const explicit = readRackEnabledSetting(storeUid);
  if (explicit !== null) return explicit;
  // Default to enabled only if zones have already been created for this store
  return getLocalState(storeUid).length > 0;
}

export function setRackManagementEnabledForStore(storeUid: string, enabled: boolean) {
  writeRackEnabledSetting(storeUid, enabled);
}
