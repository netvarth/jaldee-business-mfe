import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Icon, SectionCard, Switch } from "@jaldee/design-system";
import { FeedCard, FinanceFeatureLayout, SummaryList } from "../../components/FinancePageLayout";
import { financeApi } from "../../lib/financeApi";
import { useFinanceLiveData } from "../../lib/financeLive";

function SettingsPage() {
  const navigate = useNavigate();
  const { financeCategories, financeStatuses, financeVendors } = useFinanceLiveData();
  const [expenseEnabled, setExpenseEnabled] = useState(false);
  const [invoiceEnabled, setInvoiceEnabled] = useState(false);
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
    } catch (error) {
      console.error("Failed to update tax status", error);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <FinanceFeatureLayout
      title="Finance Settings"
      subtitle="Template, category, vendor, and dashboard administration."
      stats={[
        { label: "Categories", value: String(financeCategories.length), accent: "indigo" },
        { label: "Statuses", value: String(financeStatuses.length), accent: "emerald" },
        { label: "Vendors", value: String(financeVendors.length), accent: "amber" },
        { label: "Active Vendors", value: String(financeVendors.filter((v) => v.status === "Active").length), accent: "rose" },
      ]}
      main={
        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm" title="Module Controls">
            <div className="space-y-4 divide-y divide-slate-100">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-[17px] font-semibold text-slate-900">Expense Feature</div>
                  <div className="mt-1 text-sm text-slate-500">Enable or disable the operational expense tracking feature inside the finance module.</div>
                </div>
                <Switch
                  checked={expenseEnabled}
                  disabled={updating}
                  onChange={handleToggleExpense}
                />
              </div>
              <div className="flex items-center justify-between py-2 pt-4">
                <div>
                  <div className="text-[17px] font-semibold text-slate-900">Invoice Feature</div>
                  <div className="mt-1 text-sm text-slate-500">Enable or disable the invoicing feature inside the finance module.</div>
                </div>
                <Switch
                  checked={invoiceEnabled}
                  disabled={updating}
                  onChange={handleToggleInvoice}
                />
              </div>
              <div className="flex items-center justify-between py-2 pt-4">
                <div>
                  <div className="text-[17px] font-semibold text-slate-900">Tax Feature</div>
                  <div className="mt-1 text-sm text-slate-500">Enable or disable tax configuration and tax usage inside the finance module.</div>
                </div>
                <Switch
                  checked={taxEnabled}
                  disabled={updating}
                  onChange={handleToggleTax}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="outline" onClick={() => navigate(toFinanceRoute("/finance/taxes"))}>
                Manage Taxes
              </Button>
            </div>
          </SectionCard>

          {/* <SectionCard className="border-slate-200 shadow-sm">
            <div className="text-[22px] font-semibold text-slate-900">Settings Areas</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                "Dashboard Actions",
                "Invoice Templates",
                "Vendor Permissions",
                "Status Definitions",
                "Category Mapping",
                "Cash Register Rules",
                "Report Preferences",
                "Role Access",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard> */}
        </div>
      }
      // aside={
      //   <FeedCard title="Migration Notes">
      //     <SummaryList
      //       rows={[
      //         { label: "Dashboard", value: "Migrated", note: "Legacy action grid and cards are now present." },
      //         { label: "Invoices", value: "Migrated", note: "List, detail shell, and dashboard block added." },
      //         { label: "Vendors", value: "Migrated", note: "Directory and dashboard feed added." },
      //         { label: "Deep Forms", value: "Pending", note: "Backend-connected create/edit flows still need service wiring." },
      //       ]}
      //     />
      //   </FeedCard>
      // }
    />
  );
}

export default SettingsPage;
