import { Wallet } from "lucide-react";
import { usePayrollSettings } from "../../services/useSettingsData";
import { ConfigForm } from "./SettingsComponents";

export function PayrollSettingsPage() {
  const payroll = usePayrollSettings();
  return <ConfigForm title="Payroll Settings" subtitle="Pay cycle, statutory rates & deductions" icon={<Wallet size={20} />} data={payroll.data} loading={payroll.loading} error={payroll.error} onSave={payroll.save} automationScope="hr-settings-payroll" fields={[
    { key: "payCycle", label: "Pay Cycle", type: "select", options: ["Monthly", "Bi-Weekly", "Weekly"] },
    { key: "payDay", label: "Pay Day (day of month)", type: "number" },
    { key: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR", "GBP", "AED"] },
    { key: "professionalTax", label: "Professional Tax (₹)", type: "number" },
    { key: "pfRate", label: "PF Rate (%)", type: "number" }, { key: "esiRate", label: "ESI Rate (%)", type: "number" },
    { key: "pfEnabled", label: "Provident Fund (PF) Enabled", type: "checkbox" },
    { key: "esiEnabled", label: "ESI Enabled", type: "checkbox" },
    { key: "tdsEnabled", label: "TDS Deduction Enabled", type: "checkbox" },
  ]} />;
}
