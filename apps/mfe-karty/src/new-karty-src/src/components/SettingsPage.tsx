import React, { useState, useEffect } from 'react';
import {
  Sliders,
  FileText,
  Receipt,
  DollarSign,
  Truck,
  Globe,
  Building,
  Check,
  RefreshCw,
  Save,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import { TaxSettingsTab } from './TaxSettingsTab';
import { ShippingSettingsTab } from './ShippingSettingsTab';
import { StorefrontSettingsTab } from './storefront/StorefrontSettingsTab';
import { OrderSettingsTab } from './OrderSettingsTab';
import { FeaturesSettingsTab } from './FeaturesSettingsTab';
import { useStorefrontSettings, useUpdateStorefrontSettings } from '../../../services/useStorefrontSettings';

interface GeneralSettings {
  hospitalName: string;
  defaultLocation: string;
  primaryCurrency: string;
  operationalHours: string;
  timeZone: string;
  enableSafetyMargin: boolean;
  lockConfirmedOrders: boolean;
  requirePrescription: boolean;
  autoGstCalculation: boolean;
  allowGuestCheckout: boolean;
}

interface InvoiceSettings {
  defaultInvoiceType: string;
  taxRatePercentage: number;
  invoiceHeading: string;
  termsAndConditions: string;
  gstIn: string;
  footerNotes: string;
  showSignatureLine: boolean;
  enableRoundOff: boolean;
}

interface PrefixSuffixSettings {
  orderPrefix: string;
  orderSuffix: string;
  invoicePrefix: string;
  invoiceSuffix: string;
  patientPrefix: string;
  patientSuffix: string;
  batchPrefix: string;
  batchSuffix: string;
  transferPrefix: string;
  transferSuffix: string;
  purchasePrefix: string;
  purchaseSuffix: string;
}

const SECTIONS = [
  { key: 'features', label: 'Feature Capabilities', icon: <Sparkles size={18} />, subtitle: 'Toggle progressive disclosure flags' },
  { key: 'orders', label: 'Orders & Workflow', icon: <FileText size={18} />, subtitle: 'Policies, racks & checkout' },
  { key: 'general', label: 'General & Operations', icon: <Sliders size={18} />, subtitle: 'Locks, thresholds & store profile' },
  { key: 'invoice', label: 'Invoicing & Tax Rates', icon: <Receipt size={18} />, subtitle: 'GST parameters & print layouts' },
  { key: 'tax', label: 'Tax Schedules', icon: <DollarSign size={18} />, subtitle: 'HSN tax slabs & rules' },
  { key: 'shipping', label: 'Shipping & Delivery', icon: <Truck size={18} />, subtitle: 'Delivery profiles & rates' },
  { key: 'storefront', label: 'Storefront Portal', icon: <Globe size={18} />, subtitle: 'Catalog display & themes' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

export const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<SectionKey>('orders');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Live commerce-settings (source of truth for the backed fields on General & Invoicing)
  const { data: commerceSettings } = useStorefrontSettings();
  const updateSettings = useUpdateStorefrontSettings();

  const [general, setGeneral] = useState<GeneralSettings>({
    hospitalName: 'Main Distribution & Fulfillment Hub',
    defaultLocation: 'Kerala Distribution Hub - Main Floor',
    primaryCurrency: 'INR (₹)',
    operationalHours: '08:00 AM - 10:00 PM',
    timeZone: 'Asia/Kolkata (IST)',
    enableSafetyMargin: true,
    lockConfirmedOrders: true,
    requirePrescription: true,
    autoGstCalculation: true,
    allowGuestCheckout: false
  });

  const [invoice, setInvoice] = useState<InvoiceSettings>({
    defaultInvoiceType: 'Standard Tax Invoice',
    taxRatePercentage: 18,
    invoiceHeading: 'TAX INVOICE',
    termsAndConditions: '1. Goods once sold will be accepted for return under return policy within eligibility window.\n2. Subject to local state jurisdiction.',
    gstIn: '32AABCT2345E1Z8',
    footerNotes: 'Thank you for your business!',
    showSignatureLine: true,
    enableRoundOff: true
  });

  const [prefixSuffix, setPrefixSuffix] = useState<PrefixSuffixSettings>({
    orderPrefix: 'ORD-',
    orderSuffix: '',
    invoicePrefix: 'INV-',
    invoiceSuffix: '/2026',
    patientPrefix: 'PAT-',
    patientSuffix: '',
    batchPrefix: 'BAT-',
    batchSuffix: '',
    transferPrefix: 'TRSF-',
    transferSuffix: '',
    purchasePrefix: 'PUR-',
    purchaseSuffix: ''
  });

  // Seed the backed fields from the live commerce settings once loaded
  useEffect(() => {
    if (!commerceSettings) return;
    setGeneral((g) => ({
      ...g,
      primaryCurrency: commerceSettings.primaryCurrency ?? g.primaryCurrency,
      timeZone: commerceSettings.timeZone ?? g.timeZone,
    }));
    setInvoice((i) => ({
      ...i,
      gstIn: commerceSettings.gstin ?? i.gstIn,
    }));
  }, [commerceSettings]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      // Only the backend-backed fields are persisted (partial PUT — mapper ignores nulls)
      if (activeTab === 'general') {
        await updateSettings.mutateAsync({
          primaryCurrency: general.primaryCurrency || null,
          timeZone: general.timeZone || null,
        } as any);
      } else if (activeTab === 'invoice') {
        await updateSettings.mutateAsync({ gstin: invoice.gstIn || null } as any);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch {
      setSaveStatus(null);
    }
  };

  const handleReset = () => {
    if (confirm('Revert all general configuration back to standard defaults?')) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 text-slate-900 font-sans p-7 md:p-8 min-h-screen text-left">

      {/* Top Header matching HR Settings (PageHeader style) */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Settings</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Organization configuration, warehouse locations & commerce policy control
          </p>
        </div>

        {activeTab !== 'orders' && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-white hover:text-slate-900 transition-colors text-xs font-bold cursor-pointer shadow-3xs"
            >
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4.5 py-2 bg-[#55349A] hover:bg-[#43297a] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-98"
            >
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Changes Applied!</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 2-Column Grid Layout: 260px Left Nav Card + Main Content (Exact HR Settings layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-7 items-start">

        {/* LEFT NAV CARD */}
        <nav className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-2xs sticky top-4 space-y-1">
          {SECTIONS.map((s) => {
            const isActive = activeTab === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveTab(s.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-transparent transition-all text-xs font-bold text-left cursor-pointer",
                  isActive
                    ? "bg-[#55349A]/8 text-[#55349A] font-black border-[#55349A]/15 shadow-3xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span className={cn(isActive ? "text-[#55349A]" : "text-slate-400")}>
                  {s.icon}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* RIGHT CONTENT PANE */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                <OrderSettingsTab />
              </motion.div>
            )}

            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="space-y-6"
              >
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5 shadow-2xs">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                    <Building className="h-5 w-5 text-[#55349A]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Organization & Store Profile
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Primary Currency</label>
                      <select
                        value={general.primaryCurrency}
                        onChange={(e) => setGeneral({ ...general, primaryCurrency: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#55349A]/20"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="AED">AED (د.إ)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Time Zone</label>
                      <select
                        value={general.timeZone}
                        onChange={(e) => setGeneral({ ...general, timeZone: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#55349A]/20"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York (ET)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Currency and time zone are stored on the commerce settings and apply across POS, orders and invoices.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'invoice' && (
              <motion.div
                key="invoice"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="space-y-6"
              >
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5 shadow-2xs">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                    <Receipt className="h-5 w-5 text-[#55349A]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Invoicing Headers & Tax Notes
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="space-y-1.5 md:max-w-sm">
                      <label className="font-bold text-slate-700">Business GSTIN (Provider State Tax)</label>
                      <input
                        type="text"
                        value={invoice.gstIn}
                        onChange={(e) => setInvoice({ ...invoice, gstIn: e.target.value.toUpperCase() })}
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800 uppercase"
                      />
                      <p className="text-[11px] text-slate-400 font-medium">
                        Used as the seller GSTIN on GST tax invoices and to decide CGST/SGST vs IGST split.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tax' && <TaxSettingsTab />}
            {activeTab === 'shipping' && <ShippingSettingsTab />}
            {activeTab === 'storefront' && <StorefrontSettingsTab />}

            {activeTab === 'features' && (
              <motion.div
                key="features"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                <FeaturesSettingsTab />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
};

export default SettingsPage;
