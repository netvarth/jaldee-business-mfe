import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers, Store, Plus, Search, Filter, ArrowRight, Check, X,
  RotateCcw, Printer, QrCode, Barcode, Box, ArrowLeftRight,
  TrendingUp, AlertCircle, CheckCircle2, ShieldCheck, Thermometer,
  Grid, List, Sparkles, RefreshCw, ChevronRight, Package, Eye, AlertTriangle
} from 'lucide-react';
import {
  useWarehouseZones,
  useCreateZone,
  useCreateRack,
  useTransferBinStock,
  useAssignItemToBin,
  readRackEnabledSetting,
  writeRackEnabledSetting,
  type WarehouseZone,
  type WarehouseRack,
  type WarehouseShelf,
  type WarehouseBin,
  type BinStockAllocation,
  type ZoneType,
  type RackType
} from '../services/useRackManagement';
import { useStores } from '../services/useStores';
import { useItems } from '../services/useItems';
import { useInventoryStock } from '../services/useStock';
import { cn } from '../new-karty-src/src/lib/utils';

export function RackManagementPage() {
  const storesQ = useStores();
  const itemsQ = useItems();
  const stores = storesQ.data ?? [];

  const [selectedStoreUid, setSelectedStoreUid] = useState<string>("");
  const [selectedZoneUid, setSelectedZoneUid] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const stockQ = useInventoryStock(selectedStoreUid);

  // Default to first real store once stores are loaded
  useEffect(() => {
    if (!selectedStoreUid && stores.length > 0) {
      setSelectedStoreUid(stores[0].id || stores[0].uid);
    }
  }, [stores, selectedStoreUid]);

  // Selected Bin for Slide-over Drawer
  const [selectedBin, setSelectedBin] = useState<WarehouseBin | null>(null);

  // Rack Management Feature Toggle State per store
  const [isRackEnabled, setIsRackEnabled] = useState<boolean>(() => {
    // This page defaults to enabled when the store has never set the toggle.
    return readRackEnabledSetting(selectedStoreUid || 'default') ?? true;
  });

  const toggleRackEnabled = () => {
    const nextVal = !isRackEnabled;
    setIsRackEnabled(nextVal);
    if (selectedStoreUid) {
      writeRackEnabledSetting(selectedStoreUid, nextVal);
    }
    showToast("info", `Rack Management ${nextVal ? 'Enabled' : 'Disabled'} for this store.`);
  };

  // In-app UI Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Modals
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState<boolean>(false);
  const [isCreateRackOpen, setIsCreateRackOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isPrintLabelOpen, setIsPrintLabelOpen] = useState<boolean>(false);

  // Transfer State
  const [transferSourceBinUid, setTransferSourceBinUid] = useState<string>("");
  const [transferTargetBinUid, setTransferTargetBinUid] = useState<string>("");
  const [transferItemUid, setTransferItemUid] = useState<string>("");
  const [transferBatchNo, setTransferBatchNo] = useState<string>("");
  const [transferQty, setTransferQty] = useState<string>("");

  // Assign Product State
  const [assignItemUid, setAssignItemUid] = useState<string>("");
  const [assignBatchNo, setAssignBatchNo] = useState<string>("");
  const [assignExpiry, setAssignExpiry] = useState<string>("");
  const [selectedBatchUid, setSelectedBatchUid] = useState<string>("custom");
  const [assignQty, setAssignQty] = useState<string>("50");

  // Create Zone State
  const [newZoneName, setNewZoneName] = useState<string>("");
  const [newZoneCode, setNewZoneCode] = useState<string>("");
  const [newZoneType, setNewZoneType] = useState<ZoneType>("PICKING");
  const [newZoneDesc, setNewZoneDesc] = useState<string>("");
  const [newZoneRacksCount, setNewZoneRacksCount] = useState<number>(2);

  // Create Rack State
  const [newRackName, setNewRackName] = useState<string>("");
  const [newRackCode, setNewRackCode] = useState<string>("");
  const [newRackType, setNewRackType] = useState<RackType>("STANDARD");
  const [newRackShelves, setNewRackShelves] = useState<number>(4);

  const zonesQ = useWarehouseZones(selectedStoreUid);
  const createZone = useCreateZone(selectedStoreUid);
  const createRack = useCreateRack(selectedStoreUid);
  const transferStock = useTransferBinStock(selectedStoreUid);
  const assignItem = useAssignItemToBin(selectedStoreUid);

  const zones: WarehouseZone[] = zonesQ.data || [];

  // Available stock items in this store from purchase / inventory stock
  const storeStockItems = useMemo(() => {
    const stockList = stockQ.data ?? [];
    const itemsList = itemsQ.data ?? [];

    // Group stock by itemUid
    const stockMap = new Map<string, { totalInHand: number; batches: any[] }>();
    stockList.forEach((s: any) => {
      const existing = stockMap.get(s.itemUid) || { totalInHand: 0, batches: [] };
      existing.totalInHand += Number(s.inHand || 0);
      existing.batches.push(s);
      stockMap.set(s.itemUid, existing);
    });

    return itemsList.map((item: any) => {
      const stockInfo = stockMap.get(item.uid || item.id);
      return {
        ...item,
        inHand: stockInfo?.totalInHand || 0,
        batches: stockInfo?.batches || []
      };
    });
  }, [stockQ.data, itemsQ.data]);

  // Selected item object
  const selectedItemObj = useMemo(() => {
    return storeStockItems.find((i: any) => (i.uid || i.id) === assignItemUid) || null;
  }, [storeStockItems, assignItemUid]);

  // Available batches for selected item
  const itemAvailableBatches = useMemo(() => {
    if (!selectedItemObj) return [];
    return selectedItemObj.batches || [];
  }, [selectedItemObj]);

  // Max available stock to allocate
  const availableStockToPutaway = useMemo(() => {
    if (!selectedItemObj) return 0;
    if (selectedBatchUid !== 'custom') {
      const batch = itemAvailableBatches.find((b: any) => (b.batchUid || b.uid) === selectedBatchUid);
      return batch ? Math.max(0, Number(batch.inHand || 0) - Number(batch.onHold || 0)) : Number(selectedItemObj.inHand || 0);
    }
    return Number(selectedItemObj.inHand || 0);
  }, [selectedItemObj, selectedBatchUid, itemAvailableBatches]);


  // Keep selectedBin in sync when zone stock changes
  useEffect(() => {
    if (selectedBin) {
      for (const z of zones) {
        for (const r of (z.racks || [])) {
          for (const s of (r.shelves || [])) {
            for (const b of (s.bins || [])) {
              if (b.uid === selectedBin.uid) {
                setSelectedBin(b);
                return;
              }
            }
          }
        }
      }
    }
  }, [zones]);

  // Set initial selected zone if none selected
  const activeZone = useMemo(() => {
    if (selectedZoneUid) {
      return zones.find(z => z.uid === selectedZoneUid) || zones[0];
    }
    return zones[0] || null;
  }, [zones, selectedZoneUid]);

  // Flatten all bins across active zone for metrics
  const activeZoneBins = useMemo(() => {
    if (!activeZone) return [];
    const bins: WarehouseBin[] = [];
    (activeZone.racks || []).forEach(r => {
      (r.shelves || []).forEach(s => {
        (s.bins || []).forEach(b => bins.push(b));
      });
    });
    return bins;
  }, [activeZone]);

  const totalCapacityUnits = activeZoneBins.reduce((sum, b) => sum + (b.maxCapacityUnits || 100), 0);
  const totalOccupiedUnits = activeZoneBins.reduce((sum, b) => {
    const itemsCount = (b.allocatedItems || []).reduce((acc, it) => acc + Number(it.qtyOnHand || 0), 0);
    return sum + itemsCount;
  }, 0);

  const occupiedBinsCount = activeZoneBins.filter(b => (b.allocatedItems || []).length > 0).length;
  const occupancyPercent = totalCapacityUnits > 0 ? Math.round((totalOccupiedUnits / totalCapacityUnits) * 100) : 0;

  // Flatten all available bins across the store for transfer dropdown
  const allStoreBins = useMemo(() => {
    const list: { bin: WarehouseBin; label: string }[] = [];
    zones.forEach(z => {
      (z.racks || []).forEach(r => {
        (r.shelves || []).forEach(s => {
          (s.bins || []).forEach(b => {
            list.push({
              bin: b,
              label: `${z.name} ➔ ${r.name} ➔ ${s.name} (${b.binCode})`
            });
          });
        });
      });
    });
    return list;
  }, [zones]);

  // Filtered racks/bins by search
  const filteredRacks = useMemo(() => {
    if (!activeZone || !activeZone.racks) return [];
    if (!searchQuery.trim()) return activeZone.racks;

    const q = searchQuery.toLowerCase();
    return activeZone.racks.map(rack => {
      const matchRack = rack.name.toLowerCase().includes(q) || rack.code.toLowerCase().includes(q);
      const matchingShelves = (rack.shelves || []).map(shelf => {
        const matchingBins = (shelf.bins || []).filter(bin => {
          const matchBin = bin.binCode.toLowerCase().includes(q) || (bin.barcode && bin.barcode.toLowerCase().includes(q));
          const matchItems = (bin.allocatedItems || []).some(
            it => it.itemName.toLowerCase().includes(q) || it.itemSku.toLowerCase().includes(q) || (it.batchNumber && it.batchNumber.toLowerCase().includes(q))
          );
          return matchBin || matchItems || matchRack;
        });
        return { ...shelf, bins: matchingBins };
      });
      return { ...rack, shelves: matchingShelves };
    });
  }, [activeZone, searchQuery]);

  const handleCreateZoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreUid) {
      showToast("error", "Please select a store first.");
      return;
    }
    if (!newZoneName || !newZoneCode) {
      showToast("error", "Please provide a zone name and code.");
      return;
    }
    createZone.mutate({
      storeUid: selectedStoreUid,
      name: newZoneName,
      code: newZoneCode.toUpperCase(),
      zoneType: newZoneType,
      description: newZoneDesc,
      racksCount: newZoneRacksCount,
      shelvesPerRack: 4,
      binsPerShelf: 4
    }, {
      onSuccess: (res) => {
        setIsCreateZoneOpen(false);
        if (res && res.uid) setSelectedZoneUid(res.uid);
        setNewZoneName("");
        setNewZoneCode("");
        setNewZoneDesc("");
      },
      onError: (err: any) => {
        showToast("error", "Failed to create zone: " + (err?.message || "Unknown error"));
      }
    });
  };

  const handleCreateRackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeZone) return;
    if (!newRackName || !newRackCode) {
      showToast("error", "Please provide a rack name and code.");
      return;
    }
    createRack.mutate({
      zoneUid: activeZone.uid,
      name: newRackName,
      code: newRackCode.toUpperCase(),
      rackType: newRackType,
      totalShelves: newRackShelves
    }, {
      onSuccess: () => {
        setIsCreateRackOpen(false);
        setNewRackName("");
        setNewRackCode("");
      },
      onError: (err: any) => {
        showToast("error", "Failed to create rack: " + (err?.message || "Unknown error"));
      }
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(transferQty);
    if (!transferSourceBinUid || !transferTargetBinUid || !transferItemUid || isNaN(qty) || qty <= 0) {
      showToast("error", "Please fill all required transfer fields.");
      return;
    }
    transferStock.mutate({
      sourceBinUid: transferSourceBinUid,
      targetBinUid: transferTargetBinUid,
      itemUid: transferItemUid,
      batchNumber: transferBatchNo || undefined,
      qtyToMove: qty
    }, {
      onSuccess: () => {
        setIsTransferModalOpen(false);
        setTransferQty("");
        showToast("success", "Stock transferred successfully between bins!");
      },
      onError: (err: any) => {
        showToast("error", "Transfer failed: " + (err?.message || "Check stock levels in origin bin"));
      }
    });
  };

  const handleAssignItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBin) return;
    const qty = parseInt(assignQty);
    const selectedItemObj = (itemsQ.data ?? []).find((i: any) => i.uid === assignItemUid || i.id === assignItemUid);

    if (!assignItemUid || isNaN(qty) || qty <= 0) {
      showToast("error", "Please select an item and enter a valid quantity.");
      return;
    }

    assignItem.mutate({
      binUid: selectedBin.uid,
      itemUid: assignItemUid,
      itemName: selectedItemObj?.name || "Assigned Product",
      itemSku: selectedItemObj?.sku || "SKU-AUTO",
      batchNumber: assignBatchNo || `BAT-${new Date().getFullYear()}-01`,
      expiryDate: assignExpiry || "2028-12-31",
      qty,
      unitPrice: selectedItemObj?.price || 100
    }, {
      onSuccess: () => {
        setIsAssignModalOpen(false);
        setAssignQty("50");
        showToast("success", "Item allocated to storage bin successfully!");
      },
      onError: (err: any) => {
        showToast("error", "Putaway failed: " + (err?.message || "Unknown error"));
      }
    });
  };

  return (
    <div className="h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] flex flex-col bg-slate-50 font-sans overflow-hidden">

      {/* 1. TOP HEADER & STORE CONTROLLER */}
      <header className="bg-white border-b border-slate-200 px-7 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-2xs z-20">
        <div className="flex items-center gap-3.5 min-w-0 md:min-w-[18rem] flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#55349A] text-white flex items-center justify-center shadow-md shrink-0">
            <Layers className="h-5 w-5 stroke-[2.5]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Rack & Warehouse Bin Management
              </h1>
              <span className="text-[11px] font-bold bg-purple-50 text-[#55349A] border border-[#55349A]/20 px-2.5 py-0.5 rounded-full">
                Live Backend Connected
              </span>

              {/* Instant Enable/Disable Toggle */}
              <button
                type="button"
                onClick={toggleRackEnabled}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black transition-all cursor-pointer border",
                  isRackEnabled
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                )}
                title="Toggle Rack & Warehouse Location features for this store"
              >
                <span className={cn("w-2 h-2 rounded-full", isRackEnabled ? "bg-emerald-500" : "bg-slate-400")} />
                <span>Rack Tracking: {isRackEnabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Multi-tier warehouse location hierarchy · 2D Rack Elevation Matrix · Stock Putaway & Picking Coordinates
            </p>
          </div>
        </div>

        {/* Store Selection & Global Actions */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Store Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Store className="h-4 w-4 text-slate-500" />
            <select
              value={selectedStoreUid}
              onChange={(e) => {
                setSelectedStoreUid(e.target.value);
                setSelectedZoneUid("");
              }}
              className="bg-transparent border-none outline-none font-bold text-slate-800 cursor-pointer pr-2"
            >
              {stores.length === 0 ? (
                <option value="">No stores configured</option>
              ) : (
                stores.map((s: any) => (
                  <option key={s.id || s.uid} value={s.id || s.uid}>
                    🏪 {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Quick Transfer Button */}
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            disabled={zones.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Bin Transfer</span>
          </button>

          {/* Add Rack Button */}
          <button
            type="button"
            onClick={() => setIsCreateRackOpen(true)}
            disabled={!activeZone}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>Add Rack</span>
          </button>

          {/* Add Zone Button */}
          <button
            type="button"
            onClick={() => setIsCreateZoneOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#55349A] hover:bg-[#462980] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md active:scale-98"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>New Zone</span>
          </button>
        </div>
      </header>

      {/* Backend Disconnection Alert if applicable */}
      {zonesQ.isError && (
        <div className="bg-amber-50 border-b border-amber-200 px-7 py-2.5 flex items-center gap-2.5 text-xs text-amber-800 shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Commerce Service is starting or unreachable at localhost:9105. Verify that <code>feature-commerce-service</code> is running.</span>
        </div>
      )}

      {/* 2. ZONE TABS & KPI METRICS BAR */}
      {zones.length > 0 && (
        <div className="bg-white border-b border-slate-200 px-7 py-3 shrink-0 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* Zone Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {zones.map((zone) => {
                const isSelected = activeZone?.uid === zone.uid;
                const isCold = zone.zoneType === 'COLD_STORAGE';
                const isBulk = zone.zoneType === 'BULK_STORAGE';
                return (
                  <button
                    key={zone.uid}
                    type="button"
                    onClick={() => setSelectedZoneUid(zone.uid)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                      isSelected
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80"
                    )}
                  >
                    {isCold ? (
                      <Thermometer className={cn("h-3.5 w-3.5", isSelected ? "text-cyan-300" : "text-cyan-600")} />
                    ) : isBulk ? (
                      <Box className={cn("h-3.5 w-3.5", isSelected ? "text-amber-300" : "text-amber-600")} />
                    ) : (
                      <Layers className={cn("h-3.5 w-3.5", isSelected ? "text-purple-300" : "text-[#55349A]")} />
                    )}
                    <span>{zone.name}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded font-mono",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    )}>
                      {(zone.racks || []).length} Racks
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[260px] md:min-w-[320px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by Product, SKU, Batch, or Bin..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] bg-slate-50/50"
              />
            </div>

          </div>
        </div>
      )}

      {/* 3. ZONE KPI OVERVIEW METRICS */}
      {zones.length > 0 && (
        <div className="bg-slate-100/70 border-b border-slate-200 px-7 py-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">

            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-3xs flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Total Bins</span>
                <span className="text-base font-black text-slate-900">{activeZoneBins.length} Bins</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                {activeZone?.racks?.length || 0}R
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-3xs flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Occupied Bins</span>
                <span className="text-base font-black text-slate-900">{occupiedBinsCount} / {activeZoneBins.length}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                ✓
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-3xs flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Stock In Zone</span>
                <span className="text-base font-black text-slate-900">{totalOccupiedUnits.toLocaleString()} Units</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#55349A] flex items-center justify-center font-bold">
                📦
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-3xs flex items-center justify-between">
              <div>
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Capacity Utilization</span>
                <span className="text-base font-black text-slate-900">{occupancyPercent}%</span>
              </div>
              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                <div
                  className={cn("h-full rounded-full", occupancyPercent > 80 ? "bg-amber-500" : "bg-emerald-500")}
                  style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. MAIN 2D RACK ELEVATION MATRIX (SCROLLABLE WORKSPACE) */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="max-w-7xl mx-auto space-y-6">

          {zones.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm my-8">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#55349A] flex items-center justify-center mx-auto shadow-xs">
                <Layers className="h-7 w-7 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">No Warehouse Zones Created Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Start by creating your first storage zone (e.g. Zone A - Fast Picking, Zone B - Bulk Pallets) to automatically provision rack bays, shelf tiers, and bin coordinates in the PostgreSQL database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateZoneOpen(true)}
                className="px-5 py-2.5 bg-[#55349A] hover:bg-[#462980] text-white font-black rounded-xl text-xs shadow-md transition-all active:scale-98 cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Create First Warehouse Zone</span>
              </button>
            </div>
          ) : filteredRacks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
              <Layers className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-900">No racks found in this zone</h3>
              <p className="text-xs text-slate-500">Create your first rack bay or clear search filters to display storage bins.</p>
              <button
                type="button"
                onClick={() => setIsCreateRackOpen(true)}
                className="px-4 py-2 bg-[#55349A] text-white font-bold rounded-xl text-xs"
              >
                + Add Rack Bay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {filteredRacks.map((rack) => {
                const shelves = rack.shelves || [];
                const totalRackBins = shelves.reduce((acc, s) => acc + (s.bins || []).length, 0);
                const totalRackItems = shelves.reduce((acc, s) => {
                  return acc + (s.bins || []).reduce((bAcc, b) => bAcc + (b.allocatedItems || []).reduce((iAcc, it) => iAcc + Number(it.qtyOnHand || 0), 0), 0);
                }, 0);

                return (
                  <div
                    key={rack.uid}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
                  >
                    {/* Rack Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                          {rack.code}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 tracking-tight">
                            {rack.name}
                          </h3>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {rack.totalShelves} Shelves · {totalRackBins} Bins · {totalRackItems} Units Stored
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {rack.rackType}
                        </span>
                      </div>
                    </div>

                    {/* 2D Elevation Shelves Stack (Top Shelf ➔ Bottom Shelf) */}
                    <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                      {shelves.map((shelf) => (
                        <div key={shelf.uid} className="space-y-1.5">

                          {/* Shelf Rail Label */}
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                              Level {shelf.shelfNumber} · {shelf.name}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">
                              {(shelf.bins || []).length} Bins
                            </span>
                          </div>

                          {/* Horizontal Bins on this Shelf */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(shelf.bins || []).map((bin) => {
                              const itemsCount = (bin.allocatedItems || []).reduce((sum, it) => sum + Number(it.qtyOnHand || 0), 0);
                              const isOccupied = itemsCount > 0;
                              const fillRatio = Math.min(100, Math.round((itemsCount / (bin.maxCapacityUnits || 100)) * 100));
                              const firstItem = bin.allocatedItems?.[0];

                              return (
                                <div
                                  key={bin.uid}
                                  onClick={() => setSelectedBin(bin)}
                                  className={cn(
                                    "p-3 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between min-h-[90px]",
                                    isOccupied
                                      ? "bg-white border-purple-200/90 hover:border-[#55349A] hover:shadow-md"
                                      : "bg-slate-100/60 border-slate-200 hover:bg-white hover:border-slate-300"
                                  )}
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10.5px] font-black text-slate-900">
                                        {bin.binCode.split('-').slice(-2).join('-')}
                                      </span>
                                      <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        isOccupied ? (fillRatio > 80 ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-300"
                                      )} />
                                    </div>

                                    {isOccupied ? (
                                      <div className="mt-1.5 space-y-0.5">
                                        <p className="text-[11px] font-bold text-slate-900 truncate" title={firstItem?.itemName}>
                                          {firstItem?.itemName}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium truncate">
                                          SKU: {firstItem?.itemSku}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="mt-2 text-[10px] font-semibold text-slate-400">
                                        Empty Slot
                                      </div>
                                    )}
                                  </div>

                                  {/* Bin Capacity Progress Bar */}
                                  <div className="mt-2 pt-1 border-t border-slate-100">
                                    <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-500 mb-0.5">
                                      <span>{itemsCount} units</span>
                                      <span>{fillRatio}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className={cn("h-full rounded-full", fillRatio > 80 ? "bg-amber-500" : "bg-[#55349A]")}
                                        style={{ width: `${fillRatio}%` }}
                                      />
                                    </div>
                                  </div>

                                </div>
                              );
                            })}
                          </div>

                        </div>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* 5. BIN INSPECTOR SLIDE-OVER DRAWER */}
      {selectedBin && (
        <div className="fixed top-[56px] inset-x-0 bottom-0 bg-slate-900/30 backdrop-blur-2xs flex justify-end z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-slate-200">

            {/* Drawer Header */}
            <div>
              <div className="px-6 py-4.5 border-b border-slate-200 bg-white flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                    BIN
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 tracking-tight truncate">
                      {selectedBin.binCode}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                      Barcode: <span className="font-bold text-slate-700">{selectedBin.barcode}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBin(null)}
                  className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Close Drawer"
                >
                  <X className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Drawer Content (Scrollable) */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-210px)]">

                {/* Bin Info Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Max Capacity</span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedBin.maxCapacityUnits} Units</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Bin Type</span>
                    <span className="font-extrabold text-[#55349A] text-sm">{selectedBin.binType ? selectedBin.binType.replace('_', ' ') : 'PRIMARY'}</span>
                  </div>
                </div>

                {/* Stored Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Stored Products & Batches ({(selectedBin.allocatedItems || []).length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="text-xs font-bold text-[#55349A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Assign Product</span>
                    </button>
                  </div>

                  {(selectedBin.allocatedItems || []).length === 0 ? (
                    <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Box className="h-6 w-6 stroke-[2]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">This bin is currently empty</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">No products or batches allocated to this slot yet.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAssignModalOpen(true)}
                        className="px-4 py-2 bg-[#55349A] hover:bg-[#462980] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-98"
                      >
                        + Putaway Product Here
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(selectedBin.allocatedItems || []).map((alloc) => (
                        <div
                          key={alloc.uid}
                          className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 leading-snug">{alloc.itemName}</h5>
                              <div className="text-[11px] text-slate-400 font-medium mt-1 space-x-1.5">
                                <span>SKU: <span className="font-semibold text-slate-700">{alloc.itemSku}</span></span>
                                <span>·</span>
                                <span>Batch: <span className="font-semibold text-slate-700">{alloc.batchNumber || '—'}</span></span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs shrink-0">
                              {alloc.qtyOnHand} units
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100">
                            <span>Expiry: <span className="font-bold text-slate-700">{alloc.expiryDate || '—'}</span></span>
                            <span>Putaway: <span className="font-medium text-slate-700">{alloc.lastPutawayAt ? String(alloc.lastPutawayAt).substring(0, 10) : 'Recent'}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Drawer Sticky Footer Actions */}
            <div className="p-5 border-t border-slate-200 bg-white flex items-center gap-3 shrink-0 shadow-lg z-30">
              <button
                type="button"
                onClick={() => setIsPrintLabelOpen(true)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Printer className="h-4 w-4" />
                <span>Print Shelf Label</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTransferSourceBinUid(selectedBin.uid);
                  if (selectedBin.allocatedItems?.[0]) {
                    setTransferItemUid(selectedBin.allocatedItems[0].itemUid);
                    setTransferBatchNo(selectedBin.allocatedItems[0].batchNumber || '');
                  }
                  setIsTransferModalOpen(true);
                }}
                disabled={(selectedBin.allocatedItems || []).length === 0}
                className="flex-1 py-2.5 bg-[#55349A] hover:bg-[#462980] disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span>Transfer Stock</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. PRINTABLE SHELF / BIN LABEL MODAL */}
      {isPrintLabelOpen && selectedBin && (
        <div className="fixed top-[56px] inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 space-y-4 text-center">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Printable Shelf Label</h3>
              <button
                type="button"
                onClick={() => setIsPrintLabelOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Physical Label Mockup */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-white space-y-3">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                JALDEE WAREHOUSE LOCATION
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {selectedBin.binCode}
              </div>

              {/* Barcode Mockup */}
              <div className="py-2 flex flex-col items-center justify-center">
                <div className="font-mono text-3xl tracking-widest text-slate-900 select-none">
                  ||| | |||| | ||| || |||
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-600 mt-1">
                  {selectedBin.barcode}
                </span>
              </div>

              <div className="flex justify-between text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-100">
                <span>{activeZone?.name}</span>
                <span>CAP: {selectedBin.maxCapacityUnits}U</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPrintLabelOpen(false)}
                className="flex-1 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Label</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. BIN-TO-BIN STOCK TRANSFER MODAL */}
      {isTransferModalOpen && (
        <div className="fixed top-[56px] inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <ArrowLeftRight className="h-5 w-5 text-[#55349A]" />
                <h3 className="text-base font-extrabold text-slate-900">Bin-to-Bin Stock Transfer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Source Bin</label>
                <select
                  value={transferSourceBinUid}
                  onChange={(e) => setTransferSourceBinUid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  required
                >
                  <option value="">Select Origin Bin...</option>
                  {allStoreBins.map(({ bin, label }) => (
                    <option key={bin.uid} value={bin.uid}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Destination Bin</label>
                <select
                  value={transferTargetBinUid}
                  onChange={(e) => setTransferTargetBinUid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  required
                >
                  <option value="">Select Destination Bin...</option>
                  {allStoreBins
                    .filter(({ bin }) => bin.uid !== transferSourceBinUid)
                    .map(({ bin, label }) => (
                      <option key={bin.uid} value={bin.uid}>{label}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Product SKU / Item</label>
                <select
                  value={transferItemUid}
                  onChange={(e) => setTransferItemUid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  required
                >
                  <option value="">Select Item to Move...</option>
                  {(itemsQ.data ?? []).map((i: any) => (
                    <option key={i.uid || i.id} value={i.uid || i.id}>
                      {i.name} ({i.sku || 'SKU'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={transferBatchNo}
                    onChange={(e) => setTransferBatchNo(e.target.value)}
                    placeholder="e.g. BAT-2026-01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Transfer Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    placeholder="Units to move"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferStock.isPending}
                  className="px-5 py-2 bg-[#55349A] hover:bg-[#462980] text-white font-black rounded-xl text-xs shadow-md"
                >
                  {transferStock.isPending ? 'Transferring…' : 'Execute Transfer'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      /* 8. ASSIGN PRODUCT TO BIN MODAL */
      {isAssignModalOpen && selectedBin && (
        <div className="fixed top-[56px] inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-5">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#55349A] flex items-center justify-center font-bold shadow-xs">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Putaway Product to {selectedBin.binCode}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Allocate purchased store stock into this warehouse storage bin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleAssignItemSubmit} className="space-y-4 text-xs">

              {/* Product Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Select Product from Store Inventory</span>
                  {selectedItemObj && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Total In Store: {selectedItemObj.inHand} units
                    </span>
                  )}
                </label>
                <select
                  value={assignItemUid}
                  onChange={(e) => {
                    const itUid = e.target.value;
                    setAssignItemUid(itUid);
                    setSelectedBatchUid("custom");
                    setAssignBatchNo("");
                    setAssignExpiry("");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A]"
                  required
                >
                  <option value="">Choose item from store...</option>
                  {storeStockItems.map((i: any) => (
                    <option key={i.uid || i.id} value={i.uid || i.id}>
                      {i.name} (SKU: {i.sku || 'N/A'}) — {i.inHand} units in store
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Selector from real purchased stock */}
              {selectedItemObj && (
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                      <span>Purchased Batch & Expiry</span>
                      <span className="text-[10.5px] font-semibold text-slate-400">
                        {itemAvailableBatches.length > 0 ? `${itemAvailableBatches.length} batches available` : 'No batch split'}
                      </span>
                    </label>

                    {itemAvailableBatches.length > 0 ? (
                      <select
                        value={selectedBatchUid}
                        onChange={(e) => {
                          const bUid = e.target.value;
                          setSelectedBatchUid(bUid);
                          if (bUid !== 'custom') {
                            const b = itemAvailableBatches.find((item: any) => (item.batchUid || item.uid) === bUid);
                            if (b) {
                              setAssignBatchNo(b.batchNumber || b.batchNo || `BAT-${b.batchUid ? b.batchUid.substring(0, 6) : '01'}`);
                              setAssignExpiry(b.expiryDate ? b.expiryDate.substring(0, 10) : '2028-12-31');
                            }
                          } else {
                            setAssignBatchNo("");
                            setAssignExpiry("");
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white text-xs text-slate-800 mb-2.5"
                      >
                        <option value="custom">+ Enter / Create Custom Batch</option>
                        {itemAvailableBatches.map((b: any) => (
                          <option key={b.batchUid || b.uid} value={b.batchUid || b.uid}>
                            🏷️ Batch {b.batchNumber || b.batchNo || 'Main'} · Available: {Number(b.inHand || 0) - Number(b.onHold || 0)} units {b.expiryDate ? `(Exp: ${b.expiryDate.substring(0, 10)})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    {/* Batch Number & Expiry Date Inputs */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[10.5px] font-bold text-slate-500 block mb-1">Batch Number</span>
                        <input
                          type="text"
                          value={assignBatchNo}
                          onChange={(e) => setAssignBatchNo(e.target.value)}
                          placeholder="e.g. BAT-2026-01"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white text-xs"
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10.5px] font-bold text-slate-500 block mb-1">Expiry Date</span>
                        <input
                          type="date"
                          value={assignExpiry}
                          onChange={(e) => setAssignExpiry(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity to Putaway */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">Quantity to Add to Bin</label>
                  {selectedItemObj && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      Max Available: {availableStockToPutaway > 0 ? availableStockToPutaway : 500} units
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={availableStockToPutaway > 0 ? availableStockToPutaway : 500}
                    value={assignQty}
                    onChange={(e) => setAssignQty(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 font-extrabold text-sm text-slate-900 bg-white"
                    placeholder="Enter units"
                    required
                  />

                  {/* Quick Fill Buttons */}
                  <div className="flex items-center gap-1">
                    {[10, 25, 50].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAssignQty(String(amt))}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        +{amt}
                      </button>
                    ))}
                    {availableStockToPutaway > 0 && (
                      <button
                        type="button"
                        onClick={() => setAssignQty(String(availableStockToPutaway))}
                        className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-[#55349A] border border-[#55349A]/20 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        Max ({availableStockToPutaway})
                      </button>
                    )}
                  </div>
                </div>

                {/* Capacity utilization indicator */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
                  <span>Target Bin Max Capacity: {selectedBin.maxCapacityUnits} Units</span>
                  <span className="text-slate-600 font-bold">
                    Will use {Math.min(100, Math.round((Number(assignQty || 0) / (selectedBin.maxCapacityUnits || 100)) * 100))}% of bin
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignItem.isPending || !assignItemUid || !assignQty}
                  className="px-6 py-2.5 bg-[#55349A] hover:bg-[#462980] disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-1.5"
                >
                  {assignItem.isPending ? 'Allocating…' : 'Putaway to Bin'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 9. CREATE ZONE MODAL */}
      {isCreateZoneOpen && (
        <div className="fixed top-[56px] inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Create Warehouse Zone</h3>
              <button
                type="button"
                onClick={() => setIsCreateZoneOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateZoneSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Zone Name</label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g. Zone D — Quarantine & Returns"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Zone Code (Prefix)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newZoneCode}
                    onChange={(e) => setNewZoneCode(e.target.value)}
                    placeholder="ZD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Zone Type</label>
                  <select
                    value={newZoneType}
                    onChange={(e) => setNewZoneType(e.target.value as ZoneType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    <option value="PICKING">PICKING — Fast Picking</option>
                    <option value="BULK_STORAGE">BULK — Pallet Reserve</option>
                    <option value="COLD_STORAGE">COLD — Refrigerated 2-8°C</option>
                    <option value="RECEIVING">RECEIVING — Inbound Staging</option>
                    <option value="QUARANTINE">QUARANTINE — Hold / QC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Initial Rack Bays to Generate</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newZoneRacksCount}
                  onChange={(e) => setNewZoneRacksCount(parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateZoneOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createZone.isPending}
                  className="px-5 py-2 bg-[#55349A] hover:bg-[#462980] text-white font-black rounded-xl text-xs shadow-md"
                >
                  {createZone.isPending ? 'Creating…' : 'Create Zone'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* FLOATING IN-APP UI TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-20 right-8 z-[100] animate-slideIn">
          <div className={cn(
            "flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold transition-all backdrop-blur-md",
            toast.type === 'success'
              ? "bg-slate-900/95 text-white border-slate-700/80 shadow-slate-900/30"
              : toast.type === 'error'
              ? "bg-rose-950/95 text-rose-100 border-rose-800/80 shadow-rose-950/30"
              : "bg-slate-900 text-white border-slate-700 shadow-xl"
          )}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 10. CREATE RACK MODAL */}
      {isCreateRackOpen && activeZone && (
        <div className="fixed top-[56px] inset-x-0 bottom-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Add Rack Bay to {activeZone.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateRackOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRackSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rack Name</label>
                <input
                  type="text"
                  value={newRackName}
                  onChange={(e) => setNewRackName(e.target.value)}
                  placeholder="e.g. Rack A3 (Antibiotics & Pain Relief)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rack Code</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newRackCode}
                    onChange={(e) => setNewRackCode(e.target.value)}
                    placeholder="R03"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rack Structure</label>
                  <select
                    value={newRackType}
                    onChange={(e) => setNewRackType(e.target.value as RackType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    <option value="STANDARD">STANDARD — Multi-shelf</option>
                    <option value="PALLET_RACK">PALLET RACK — Heavy Bay</option>
                    <option value="REFRIGERATED">REFRIGERATED — Cold Unit</option>
                    <option value="CANTILEVER">CANTILEVER — Long Items</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Shelves Levels</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={newRackShelves}
                  onChange={(e) => setNewRackShelves(parseInt(e.target.value) || 4)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateRackOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRack.isPending}
                  className="px-5 py-2 bg-[#55349A] hover:bg-[#462980] text-white font-black rounded-xl text-xs shadow-md"
                >
                  {createRack.isPending ? 'Adding…' : 'Add Rack Bay'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default RackManagementPage;
