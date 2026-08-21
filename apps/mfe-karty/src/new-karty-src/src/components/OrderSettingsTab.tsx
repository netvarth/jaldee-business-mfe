import React, { useEffect, useState } from 'react';
import {
  RefreshCw, Check, Layers, ShoppingCart, RotateCcw, Bell,
  Star, Hash, ShieldCheck, Sparkles, Building2, FileText, ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  useStorefrontSettings,
  useUpdateStorefrontSettings,
  CommerceSettingsDto,
} from '../../../services/useStorefrontSettings';
import { writeRackEnabledSetting } from '../../../services/useRackManagement';
import { OrderNumberingCard } from './OrderNumberingCard';

type ToggleKey =
  | 'orderRequiresConsumer'
  | 'allowOrderWithoutConsumer'
  | 'partnerOrderEnabled'
  | 'requireOtpAddToCart'
  | 'autoGenerateTask'
  | 'orderRequestEnabled'
  | 'salesReturnEnabled'
  | 'warehouseRackManagementEnabled'
  | 'consumerNotificationEnabled'
  | 'providerNotificationEnabled'
  | 'feedbackPublish'
  | 'reviewEnabled'
  | 'autoSendFeedbackLink';

const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#55349A]/20',
      on ? 'bg-[#55349A]' : 'bg-slate-200'
    )}
  >
    <span
      className={cn(
        'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
        on ? 'translate-x-5' : 'translate-x-0.5'
      )}
    />
  </button>
);

export const OrderSettingsTab = () => {
  const { data, isLoading } = useStorefrontSettings();
  const update = useUpdateStorefrontSettings();

  const [form, setForm] = useState<CommerceSettingsDto>({});
  const [orderPreSetupWizard, setOrderPreSetupWizard] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('karty_enable_order_presetup');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [defaultPosViewMode, setDefaultPosViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('karty_default_pos_view_mode');
      return (saved === 'list' || saved === 'grid') ? saved : 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetDefaultPosViewMode = (mode: 'grid' | 'list') => {
    setDefaultPosViewMode(mode);
    try {
      localStorage.setItem('karty_default_pos_view_mode', mode);
    } catch {}
  };

  const toggleOrderPreSetupWizard = () => {
    setOrderPreSetupWizard(prev => {
      const next = !prev;
      try {
        localStorage.setItem('karty_enable_order_presetup', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const toggle = (key: ToggleKey) => {
    setForm((f) => {
      const next = { ...f, [key]: !f[key] };
      // Also sync warehouse rack setting to local store key for instant responsiveness
      if (key === 'warehouseRackManagementEnabled') {
        writeRackEnabledSetting('default', !!next[key]);
      }
      return next;
    });
  };

  const save = () => {
    update.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-xs font-bold text-slate-400">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        Loading configuration preferences…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans text-left max-w-4xl">

      {/* 1. Header with Save Action */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 tracking-tight">Orders & Workflow Policies</h2>
            <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-[#55349A] border border-purple-200/80">
              Live Commerce Core
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Configure order creation rules, warehouse rack coordinates, quotation flows, and returns.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className={cn(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition-all cursor-pointer active:scale-98',
            update.isSuccess
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
              : 'bg-[#55349A] hover:bg-[#43297a] shadow-[#55349A]/20'
          )}
        >
          {update.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : update.isSuccess ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : null}
          <span>{update.isPending ? 'Saving…' : update.isSuccess ? 'Changes Applied!' : 'Save Changes'}</span>
        </button>
      </div>

      {update.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4.5 py-3 text-xs font-bold text-rose-800">
          Couldn't save settings: {update.error instanceof Error ? update.error.message : 'the service rejected the change.'}
        </div>
      ) : null}

      {/* 2. CARD 1: WAREHOUSE & INVENTORY LOCATION (FEATURED) */}
      <div className="rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/40 via-white to-white p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-purple-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#55349A] text-white flex items-center justify-center shadow-xs font-bold">
              <Layers className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Warehouse Rack & Bin Location Tracking
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Multi-tier warehouse zones, rack bays, shelf tiers, and bin coordinates
              </p>
            </div>
          </div>

          <Toggle
            on={!!form.warehouseRackManagementEnabled}
            onClick={() => toggle('warehouseRackManagementEnabled')}
          />
        </div>

        <div className="text-[11.5px] text-slate-600 font-normal leading-relaxed pt-1 flex items-start gap-2">
          <span className="text-[#55349A] font-bold shrink-0">📍 When enabled:</span>
          <span>
            The system provides 2D rack elevation visualization, generates bin barcodes, and displays physical coordinates (<code className="bg-purple-100/70 text-[#55349A] px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">R01-S04-B01</code>) on POS catalog cards, cart checkout lines, and warehouse pick lists. When disabled, standard retail POS remains completely clean without location tags.
          </span>
        </div>
      </div>

      {/* 3. CARD 2: CHECKOUT & ORDERING POLICIES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Checkout & Customer Attachment Rules
          </h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <span>Order Creation Setup Wizard (Step 1)</span>
                <span className="px-2 py-0.2 rounded bg-purple-100 text-[#55349A] text-[9.5px] font-black uppercase">Wizard Flow</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Show Store, Catalog, and Customer pre-selection page before opening the POS catalog. If disabled, opens directly into the fast POS terminal.
              </div>
            </div>
            <Toggle on={orderPreSetupWizard} onClick={toggleOrderPreSetupWizard} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <span>Default POS View Mode</span>
                <span className="px-2 py-0.2 rounded bg-blue-100 text-blue-800 text-[9.5px] font-black uppercase">Layout</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Select the initial layout when opening POS. Grid shows visual product cards, and List shows the detailed item workspace.
              </div>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleSetDefaultPosViewMode('grid')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  defaultPosViewMode === 'grid'
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                ⊞ Grid View
              </button>
              <button
                type="button"
                onClick={() => handleSetDefaultPosViewMode('list')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  defaultPosViewMode === 'list'
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                ☰ List View
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Require a customer on orders</div>
              <div className="text-[11px] text-slate-500 font-medium">An order must be linked to a customer identity when created.</div>
            </div>
            <Toggle on={!!form.orderRequiresConsumer} onClick={() => toggle('orderRequiresConsumer')} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Allow walk-in orders</div>
              <div className="text-[11px] text-slate-500 font-medium">Permit quick counter sales without a linked customer profile.</div>
            </div>
            <Toggle on={!!form.allowOrderWithoutConsumer} onClick={() => toggle('allowOrderWithoutConsumer')} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Partner (B2B) orders</div>
              <div className="text-[11px] text-slate-500 font-medium">Allow wholesale partners and distributor connections to place orders.</div>
            </div>
            <Toggle on={!!form.partnerOrderEnabled} onClick={() => toggle('partnerOrderEnabled')} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">OTP authentication to add to cart</div>
              <div className="text-[11px] text-slate-500 font-medium">Require consumer mobile OTP validation before adding items to active cart.</div>
            </div>
            <Toggle on={!!form.requireOtpAddToCart} onClick={() => toggle('requireOtpAddToCart')} />
          </div>
        </div>
      </div>

      {/* 4. CARD 3: QUOTATIONS, TASKS & SALES RETURNS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <RotateCcw className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Fulfillment, Quotes & Sales Returns
          </h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Order requests & Quotations</div>
              <div className="text-[11px] text-slate-500 font-medium">Enable quote/order-request capture before converting to confirmed sales orders.</div>
            </div>
            <Toggle on={!!form.orderRequestEnabled} onClick={() => toggle('orderRequestEnabled')} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Auto-create task on order</div>
              <div className="text-[11px] text-slate-500 font-medium">Raise an internal staff fulfillment task automatically when an order is placed.</div>
            </div>
            <Toggle on={!!form.autoGenerateTask} onClick={() => toggle('autoGenerateTask')} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Allow sales returns</div>
              <div className="text-[11px] text-slate-500 font-medium">Let customers return products against completed orders with ledger credit.</div>
            </div>
            <Toggle on={!!form.salesReturnEnabled} onClick={() => toggle('salesReturnEnabled')} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Sales return eligibility window</div>
              <div className="text-[11px] text-slate-500 font-medium">Days after delivery a return is accepted (0 = no limit).</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={form.salesReturnDays ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, salesReturnDays: parseInt(e.target.value) || 0 }))}
                className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-center font-bold text-xs text-slate-900 outline-none focus:border-[#55349A]"
              />
              <span className="text-slate-400 font-semibold text-xs">Days</span>
            </div>
          </div>
        </div>
      </div>

            {/* CARD: CUSTOMER & STAFF NOTIFICATIONS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
            <Bell className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Customer & Staff Notifications
          </h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Customer order notifications</div>
              <div className="text-[11px] text-slate-500 font-medium">Send real-time order confirmation, status updates, and tracking alerts to consumers via SMS / WhatsApp / Email.</div>
            </div>
            <Toggle on={!!form.consumerNotificationEnabled} onClick={() => toggle('consumerNotificationEnabled')} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Staff & provider notifications</div>
              <div className="text-[11px] text-slate-500 font-medium">Alert fulfillment staff and managers when new orders are placed or require immediate action.</div>
            </div>
            <Toggle on={!!form.providerNotificationEnabled} onClick={() => toggle('providerNotificationEnabled')} />
          </div>
        </div>
      </div>

      {/* 5. CARD 4: REVIEWS & STOREFRONT FEEDBACK */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Star className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Customer Feedback & Reviews
          </h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Collect reviews</div>
              <div className="text-[11px] text-slate-500 font-medium">Enable post-order rating and testimonial capture.</div>
            </div>
            <Toggle on={!!form.reviewEnabled} onClick={() => toggle('reviewEnabled')} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Publish feedback on storefront</div>
              <div className="text-[11px] text-slate-500 font-medium">Display verified customer testimonials on public portal.</div>
            </div>
            <Toggle on={!!form.feedbackPublish} onClick={() => toggle('feedbackPublish')} />
          </div>

          <div className="flex items-center justify-between gap-6 py-3">
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs">Auto-send feedback link</div>
              <div className="text-[11px] text-slate-500 font-medium">Send an automated review link via SMS/WhatsApp upon order fulfillment.</div>
            </div>
            <Toggle on={!!form.autoSendFeedbackLink} onClick={() => toggle('autoSendFeedbackLink')} />
          </div>
        </div>
      </div>

      {/* 6. CARD 5: DOCUMENT SEQUENCING & GSTIN */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Building2 className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Tax Identification & Document Sequences
          </h3>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Business GSTIN (Provider State Tax)</label>
              <input
                type="text"
                value={form.gstin ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                placeholder="e.g. 32ABCDE1234F1Z5"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#55349A]"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Order-Request Prefix</label>
              <input
                type="text"
                value={form.orderRefPrefix ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, orderRefPrefix: e.target.value }))}
                placeholder="e.g. REQ-"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#55349A]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900 text-xs">Order Numbering Scope</div>
              <div className="text-[11px] text-slate-500 font-medium">Number sequences per store or unified across all stores.</div>
            </div>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 p-0.5 bg-slate-50">
              {(['STORE', 'TENANT'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, orderNumberScope: opt }))}
                  className={cn(
                    'px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer',
                    (form.orderNumberScope ?? 'STORE') === opt
                      ? 'bg-[#55349A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white',
                  )}
                >
                  {opt === 'STORE' ? 'Per Store' : 'Shared Global Stream'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <OrderNumberingCard scope={form.orderNumberScope ?? 'STORE'} />

    </div>
  );
};

export default OrderSettingsTab;
