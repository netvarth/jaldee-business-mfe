import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Store,
  Truck,
  Layers,
  Activity,
  Check,
  RotateCcw,
  Save,
  Info,
  ShieldCheck,
  AlertCircle,
  Building2,
  Utensils,
  Film,
  Boxes
} from "lucide-react";
import {
  useCapabilities,
  useUpdateCapabilities,
  useStoreCapabilities,
  useUpdateStoreCapabilities,
  usePresets,
  useApplyPreset,
  useApplyStorePreset
} from "../../../services/useCapabilities";
import { useStores } from "../../../services/useStores";

interface CapabilityMeta {
  key: string;
  label: string;
  description: string;
  category: "sales" | "logistics" | "inventory" | "pharma" | "hospitality";
}

const CAPABILITIES: CapabilityMeta[] = [
  // Sales & Wholesale
  { key: "b2bEnabled", label: "B2B Trade Partners & Credit", description: "Enables trade partners, wholesale price lists, partner ledger, and credit limits.", category: "sales" },
  { key: "b2bPartnerOrdersEnabled", label: "B2B Partner Direct Orders", description: "Allows trade partners to place wholesale purchase orders via connected portal.", category: "sales" },
  { key: "schemesEnabled", label: "Trade Schemes & Discounts", description: "Enables quantity slab discounts, BOGO free-goods, and promotional benefits.", category: "sales" },
  { key: "quotesEnabled", label: "Quotations & Proforma Invoices", description: "Enables quote/estimate documents and conversion to confirmed orders.", category: "sales" },
  { key: "taxInvoiceEnabled", label: "Formal GST Tax Invoicing", description: "Automates GST tax invoice generation via finance service with state-wise supply split.", category: "sales" },

  // Fulfillment & Logistics
  { key: "deliveryEnabled", label: "Local Home Delivery", description: "Allows local courier and home delivery fulfillment method.", category: "logistics" },
  { key: "pickupEnabled", label: "In-Store Pickup", description: "Allows in-store click-and-collect and counter orders.", category: "logistics" },
  { key: "shiprocketEnabled", label: "Shiprocket Courier Integration", description: "Enables automated AWB generation, manifest printing, and tracking webhooks.", category: "logistics" },
  { key: "printThermalEnabled", label: "Thermal Shipping Labels (4x6)", description: "Generates structured thermal shipping sticker payloads with barcode data.", category: "logistics" },

  // Inventory & Warehousing
  { key: "batchTrackingEnabled", label: "Batch & Expiry Tracking", description: "Requires batch selection and enforces FEFO expiry date validation on sales.", category: "inventory" },
  { key: "barcodeScanningEnabled", label: "Barcode Generation & Scanning", description: "Enables EAN-13/Code128 barcode generation and fast scanning lookup.", category: "inventory" },
  { key: "rackManagementEnabled", label: "Warehouse Racks & Bin Locations", description: "Manages warehouse zones, racks, shelves, and stock pick locations.", category: "inventory" },
  { key: "binPutawayEnabled", label: "Bin Putaway & Staging Rules", description: "Automates inbound receiving putaway suggestions based on bin capacity.", category: "inventory" },
  { key: "transfersEnabled", label: "Inter-Store Stock Transfers", description: "Enables transfer orders between warehouse, pharmacy, and retail stores.", category: "inventory" },
  { key: "cycleCountEnabled", label: "Periodic Cycle Counting", description: "Supports physical stock verification audits with variance reconciliation.", category: "inventory" },
  { key: "reorderAlertsEnabled", label: "Reorder & Low Stock Alerts", description: "Automated alert sweeps when stock drops below minimum reorder points.", category: "inventory" },

  // Pharmacy & Healthcare
  { key: "pharmaModeEnabled", label: "Pharmacy Scheduled Drugs & Register", description: "Classifies Schedule H/H1/Narcotic drugs and maintains statutory drug sales register.", category: "pharma" },
  { key: "doctorRxValidationEnabled", label: "Prescription (Rx) Mandatory Gate", description: "Requires prescription reference and prescriber details for controlled drugs.", category: "pharma" },
  { key: "productionBomEnabled", label: "Ayurvedic Compounding & Recipe BOM", description: "Enables herbal decoction recipes, production batches, and raw herb deduction.", category: "pharma" },

  // Hospitality & Food & Cinema
  { key: "kotEnabled", label: "Kitchen Order Ticket (KOT)", description: "Routes kitchen items to chef display systems or thermal kitchen printers.", category: "hospitality" },
  { key: "tableServiceEnabled", label: "Dine-In Table Management", description: "Manages restaurant table layout, open tabs, split bills, and table transfers.", category: "hospitality" },
  { key: "modifiersEnabled", label: "Food Add-ons & Modifiers", description: "Custom spice levels, toppings, preparation notes, and combo variations.", category: "hospitality" },
  { key: "seatTicketEnabled", label: "Cinema Seat Selection & Ticketing", description: "Enables seat layout maps, showtime schedules, and ticket barcode verification.", category: "hospitality" },
];

const CATEGORIES = [
  { id: "sales", label: "Sales & Wholesale", icon: <Store size={18} />, desc: "B2B dealer connect, price lists, and trade schemes" },
  { id: "logistics", label: "Fulfillment & Shipping", icon: <Truck size={18} />, desc: "Delivery modes, Shiprocket, and thermal printing" },
  { id: "inventory", label: "Inventory & Warehousing", icon: <Layers size={18} />, desc: "Batch tracking, racks, bins, transfers, and cycle counts" },
  { id: "pharma", label: "Pharma & AYUSH Healthcare", icon: <Activity size={18} />, desc: "Drug schedules, statutory register, Rx gates, and compounding" },
  { id: "hospitality", label: "Food, Cafe & Entertainment", icon: <Utensils size={18} />, desc: "KOT, table service, food modifiers, and cinema ticketing" },
] as const;

const PRESET_OPTIONS = [
  { id: "RETAIL", name: "Standard Retail", desc: "Walk-in POS, home delivery, barcode scanning." },
  { id: "PHARMACY", name: "Retail Pharmacy", desc: "Batches, FEFO, Schedule H1 register & Rx gates." },
  { id: "AYURVEDA", name: "Ayurveda Pharmacy", desc: "Arishtas (no-expiry), herbal compounding & BOM." },
  { id: "DISTRIBUTOR", name: "B2B Distributor", desc: "Wholesale, price lists, trade partners & credit limits." },
  { id: "WAREHOUSE", name: "Central Warehouse", desc: "Zone/rack bins, putaway rules & inter-store transfers." },
  { id: "CAFE", name: "Cafe & Bakery", desc: "Counter ordering, takeaway, recipe modifiers." },
  { id: "RESTAURANT", name: "Restaurant / Dine-In", desc: "Table layout, KOT printing & split billing." },
  { id: "CINEMA", name: "Cinema & Concessions", desc: "Seat ticketing, showtimes & snack counters." },
];

export function FeaturesSettingsTab() {
  const { data: stores } = useStores();
  const [selectedStoreUid, setSelectedStoreUid] = useState<string>(""); // empty string = Tenant Level

  // Tenant-level hooks
  const { capabilities: tenantCaps, isLoading: tenantLoading } = useCapabilities();
  const updateTenantMutation = useUpdateCapabilities();
  const applyTenantPresetMutation = useApplyPreset();

  // Store-level hooks
  const { capabilities: storeCaps, isLoading: storeLoading } = useStoreCapabilities(selectedStoreUid || undefined);
  const updateStoreMutation = useUpdateStoreCapabilities();
  const applyStorePresetMutation = useApplyStorePreset();

  const activeCaps = selectedStoreUid ? storeCaps : tenantCaps;
  const isLoading = selectedStoreUid ? storeLoading : tenantLoading;

  const [localCaps, setLocalCaps] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (activeCaps) {
      setLocalCaps(activeCaps);
      setHasChanges(false);
    }
  }, [activeCaps, selectedStoreUid]);

  const handleToggle = (key: string) => {
    setLocalCaps((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      if (selectedStoreUid) {
        await updateStoreMutation.mutateAsync({ storeUid: selectedStoreUid, overrides: localCaps });
      } else {
        await updateTenantMutation.mutateAsync(localCaps);
      }
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to save capabilities", e);
      alert("Failed to save capabilities.");
    }
  };

  const handleApplyPreset = async (presetName: string) => {
    const scopeName = selectedStoreUid
      ? (stores || []).find((s: any) => (s.id || s.uid) === selectedStoreUid)?.name || "selected store"
      : "all tenant stores";

    if (!window.confirm(`Apply the "${presetName}" preset to ${scopeName}? This will configure standard feature flags.`)) {
      return;
    }

    try {
      if (selectedStoreUid) {
        await applyStorePresetMutation.mutateAsync({ storeUid: selectedStoreUid, preset: presetName, reset: false });
      } else {
        await applyTenantPresetMutation.mutateAsync({ preset: presetName, reset: false });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to apply preset", e);
      alert("Failed to apply preset.");
    }
  };

  const isSaving = updateTenantMutation.isPending || updateStoreMutation.isPending || applyTenantPresetMutation.isPending || applyStorePresetMutation.isPending;

  return (
    <div className="space-y-8 max-w-5xl text-left font-sans">
      {/* Scope Switcher (Tenant vs Specific Store) */}
      <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 text-primary-600 rounded-xl border border-primary-100">
            <Building2 size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-900">Configuration Scope</h3>
            <p className="text-xs text-surface-500">Configure account-wide defaults or store-specific capability overrides.</p>
          </div>
        </div>

        <select
          value={selectedStoreUid}
          onChange={(e) => setSelectedStoreUid(e.target.value)}
          className="px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Tenant Default Capabilities (Account-wide)</option>
          {(stores || []).map((s: any) => (
            <option key={s.id || s.uid} value={s.id || s.uid}>
              Store: {s.name} [{s.verticalType || s.type || 'RETAIL'}]
            </option>
          ))}
        </select>
      </div>

      {/* Header with Save bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2">
            <Sparkles className="text-primary-600" size={22} />
            {selectedStoreUid ? "Store-Level Capabilities" : "Tenant Feature Capabilities & Presets"}
          </h2>
          <p className="text-sm text-surface-500 mt-1">
            Progressive disclosure controls: Enable features dynamically without changing code.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
              <Check size={14} /> Saved
            </span>
          )}
          <button
            type="button"
            disabled={!hasChanges || isSaving}
            onClick={handleSave}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              hasChanges
                ? "bg-primary-600 hover:bg-primary-700 text-white cursor-pointer"
                : "bg-surface-100 text-surface-400 cursor-not-allowed"
            }`}
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Capabilities"}
          </button>
        </div>
      </div>

      {/* Business Presets Quick Select */}
      <div className="bg-gradient-to-br from-surface-50 to-surface-100/60 p-5 rounded-2xl border border-surface-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary-600" />
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Industry Vertical Presets
            </h3>
          </div>
          <span className="text-xs text-surface-500">Auto-configure capability flags</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {PRESET_OPTIONS.map((p) => (
            <div
              key={p.id}
              className="bg-white p-3.5 rounded-xl border border-surface-200 hover:border-primary-300 transition-all flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="font-bold text-xs text-surface-900">{p.name}</div>
                <p className="text-[11px] text-surface-500 mt-1 line-clamp-2">{p.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => handleApplyPreset(p.id)}
                disabled={isSaving}
                className="mt-3 text-[11px] font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg border border-primary-200 transition-colors w-full text-center cursor-pointer"
              >
                Apply Preset
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Categorized Capability Switches */}
      <div className="space-y-6">
        {CATEGORIES.map((cat) => {
          const items = CAPABILITIES.filter((c) => c.category === cat.id);
          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 bg-surface-50/70 border-b border-surface-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white rounded-lg border border-surface-200 text-primary-600">
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-900">{cat.label}</h3>
                    <p className="text-xs text-surface-500">{cat.desc}</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-surface-100">
                {items.map((item) => {
                  const enabled = !!localCaps[item.key];
                  return (
                    <div
                      key={item.key}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-50/40 transition-colors"
                    >
                      <div className="pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-surface-900">{item.label}</span>
                          <span className="text-[10px] font-mono bg-surface-100 text-surface-600 px-1.5 py-0.5 rounded font-bold">
                            {item.key}
                          </span>
                        </div>
                        <p className="text-xs text-surface-500 mt-0.5 max-w-2xl">{item.description}</p>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        onClick={() => handleToggle(item.key)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          enabled ? "bg-primary-600" : "bg-surface-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            enabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
