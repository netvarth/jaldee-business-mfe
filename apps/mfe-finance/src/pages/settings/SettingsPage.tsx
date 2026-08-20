import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Icon, SectionCard, Switch } from "@jaldee/design-system";
import { FinanceFeatureLayout } from "../../components/FinancePageLayout";
import { financeApi } from "../../lib/financeApi";
import { useFinanceLiveData } from "../../lib/financeLive";

const FINANCE_SIDEBAR_SETTINGS_UPDATED_EVENT = "finance:sidebar-settings-updated";

function SettingsPage() {
  const navigate = useNavigate();
  const { financeCategories, financeStatuses, financeVendors } = useFinanceLiveData();
  const [expenseEnabled, setExpenseEnabled] = useState(false);
  const [invoiceEnabled, setInvoiceEnabled] = useState(false);
  const [masterInvoiceEnabled, setMasterInvoiceEnabled] = useState(false);
  const [cashRegisterEnabled, setCashRegisterEnabled] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const response = await financeApi.settings.provider();
        if (active && response.data) {
          const data: any = response.data;
          const isExpenseEnabled = 
            data.expenseStatus === "Enabled" ||
            data.expense === "Enabled" ||
            data.enableExpense === true ||
            data.expenseEnabled === true;
          setExpenseEnabled(isExpenseEnabled);

          const isInvoiceEnabled = 
            data.invoiceStatus === "Enabled" ||
            data.invoice === "Enabled" ||
            data.enableInvoice === true ||
            data.invoiceEnabled === true;
          setInvoiceEnabled(isInvoiceEnabled);

          const isMasterInvoiceEnabled =
            data.masterInvoiceStatus === "Enabled" ||
            data.masterInvoice === "Enabled" ||
            data.enableMasterInvoice === true ||
            data.masterInvoiceEnabled === true;
          setMasterInvoiceEnabled(isMasterInvoiceEnabled);

          const isCashRegisterEnabled =
            data.cashRegisterStatus === "Enabled" ||
            data.cashRegister === "Enabled" ||
            data.enableCashRegister === true ||
            data.cashRegisterEnabled === true;
          setCashRegisterEnabled(isCashRegisterEnabled);

          const isTaxEnabled =
            data.enableTaxStatus === "Enabled" ||
            data.taxStatus === "Enabled" ||
            data.enableTax === true ||
            data.tax === "Enabled" ||
            data.taxEnabled === true;
          setTaxEnabled(isTaxEnabled);
        }
      } catch (error) {
        console.error("Failed to load finance settings", error);
      }
    }
    loadSettings();
    return () => { active = false; };
  }, []);

  async function handleToggleExpense(checked: boolean) {
    setUpdating(true);
    const nextStatus = checked ? "Enabled" : "Disabled";
    try {
      await financeApi.settings.expenseFeature(nextStatus);
      setExpenseEnabled(checked);
    } catch (error) {
      console.error("Failed to update expense status", error);
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleInvoice(checked: boolean) {
    setUpdating(true);
    const nextStatus = checked ? "Enabled" : "Disabled";
    try {
      await financeApi.settings.invoiceFeature(nextStatus);
      setInvoiceEnabled(checked);
    } catch (error) {
      console.error("Failed to update invoice status", error);
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleTax(checked: boolean) {
    setUpdating(true);
    const nextStatus = checked ? "Enabled" : "Disabled";
    try {
      await financeApi.settings.taxFeature(nextStatus);
      setTaxEnabled(checked);
      if (checked) {
        try {
          const response = await financeApi.taxes.byFilter<any>({});
          const payload = response.data;
          const records = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.content)
              ? payload.content
              : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.data?.content)
                  ? payload.data.content
                  : [];
          navigate(records.length > 0 ? "../taxes" : "../taxes/create");
        } catch (error) {
          console.error("Failed to resolve tax setup screen", error);
          navigate("../taxes/create");
        }
      }
    } catch (error) {
      console.error("Failed to update tax status", error);
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleMasterInvoice(checked: boolean) {
    setUpdating(true);
    const nextStatus = checked ? "Enabled" : "Disabled";
    try {
      await financeApi.settings.masterInvoiceFeature(nextStatus);
      setMasterInvoiceEnabled(checked);
    } catch (error) {
      console.error("Failed to update master invoice status", error);
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleCashRegister(checked: boolean) {
    setUpdating(true);
    const nextStatus = checked ? "Enabled" : "Disabled";
    try {
      await financeApi.settings.cashRegisterFeature(nextStatus);
      setCashRegisterEnabled(checked);
      window.dispatchEvent(new Event(FINANCE_SIDEBAR_SETTINGS_UPDATED_EVENT));
    } catch (error) {
      console.error("Failed to update cash register status", error);
    } finally {
      setUpdating(false);
    }
  }

  const moduleControls = [
    {
      key: "expense",
      title: "Expense Feature",
      description: "Enable or disable the operational expense tracking feature inside the finance module.",
      enabled: expenseEnabled,
      onChange: handleToggleExpense,
      icon: "history" as const,
    },
    {
      key: "invoice",
      title: "Invoice Feature",
      description: "Enable or disable the invoicing feature inside the finance module.",
      enabled: invoiceEnabled,
      onChange: handleToggleInvoice,
      icon: "list" as const,
    },
    {
      key: "tax",
      title: "Tax Feature",
      description: "Enable or disable tax configuration and tax usage inside the finance module.",
      enabled: taxEnabled,
      onChange: handleToggleTax,
      icon: "globe" as const,
    },
    {
      key: "masterInvoice",
      title: "Master Invoice Feature",
      description: "Enable or disable master invoice creation inside the finance module.",
      enabled: masterInvoiceEnabled,
      onChange: handleToggleMasterInvoice,
      icon: "layers" as const,
    },
    {
      key: "cashRegister",
      title: "Cash Register Feature",
      description: "Enable or disable cash register operations inside the finance module.",
      enabled: cashRegisterEnabled,
      onChange: handleToggleCashRegister,
      icon: "database" as const,
    },
  ];

  return (
    <FinanceFeatureLayout
      title="Finance Settings"
      subtitle="Template, category, vendor, and dashboard administration."
      main={
        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm" title="Module Controls">
            <div className="grid gap-4 md:grid-cols-2">
              {moduleControls.map((control) => (
                <div
                  key={control.key}
                  className={`rounded-2xl border px-5 py-5 shadow-sm transition ${
                    control.enabled
                      ? "border-[var(--color-primary-muted)] bg-[var(--color-primary-subtle)]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          control.enabled
                            ? "bg-white text-[var(--color-primary)]"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon name={control.icon} className="h-5 w-5" />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="text-[17px] font-semibold text-slate-950">{control.title}</div>
                        <Badge variant={control.enabled ? "success" : "neutral"}>
                          {control.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{control.description}</div>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-2 py-2 shadow-sm">
                      <Switch
                        checked={control.enabled}
                        disabled={updating}
                        onChange={control.onChange}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => navigate("../taxes")}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--color-primary-muted)] bg-white px-4 py-4 text-left transition hover:bg-[var(--color-primary-subtle)]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                    <Icon name="globe" className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Manage Taxes</div>
                    <div className="mt-1 text-sm text-slate-500">Open GST details and tax percentages.</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("../hsn-codes")}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--color-primary-muted)] bg-white px-4 py-4 text-left transition hover:bg-[var(--color-primary-subtle)]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                    <Icon name="database" className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">HSN Codes</div>
                    <div className="mt-1 text-sm text-slate-500">Maintain HSN codes used in finance records.</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("../sequence-template")}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--color-primary-muted)] bg-white px-4 py-4 text-left transition hover:bg-[var(--color-primary-subtle)]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                    <Icon name="layers" className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Sequence Templates</div>
                    <div className="mt-1 text-sm text-slate-500">Manage numbering templates used across finance flows.</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("../sequence-settings")}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--color-primary-muted)] bg-white px-4 py-4 text-left transition hover:bg-[var(--color-primary-subtle)]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                    <Icon name="database" className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Sequence Settings</div>
                    <div className="mt-1 text-sm text-slate-500">Configure numbering contexts and sequence behavior.</div>
                  </div>
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      }
    />
  );
}

export default SettingsPage;
