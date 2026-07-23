import { Building2 } from "lucide-react";
import { useCompanyProfile } from "../../services/useSettingsData";
import { ConfigForm } from "./SettingsComponents";

export function CompanySettingsPage() {
  const company = useCompanyProfile();
  return <ConfigForm title="Company Profile" subtitle="Organization identity, tax & locale" icon={<Building2 size={20} />} data={company.data} loading={company.loading} error={company.error} onSave={company.save} automationScope="hr-settings-company" fields={[
    { key: "name", label: "Company Name" }, { key: "legalName", label: "Legal Name" },
    { key: "industry", label: "Industry" }, { key: "email", label: "Contact Email" },
    { key: "phone", label: "Phone" }, { key: "logoUrl", label: "Logo URL" },
    { key: "addressLine", label: "Address", full: true }, { key: "city", label: "City" },
    { key: "state", label: "State" }, { key: "country", label: "Country" },
    { key: "gstin", label: "GSTIN" }, { key: "pan", label: "PAN" },
    { key: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR", "GBP", "AED"] },
    { key: "workingDays", label: "Working Days", placeholder: "e.g. Mon-Fri", full: true },
  ]} />;
}
