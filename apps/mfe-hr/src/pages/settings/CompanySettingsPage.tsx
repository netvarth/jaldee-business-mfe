import { Building2 } from "lucide-react";
import { useMFEProps } from "@jaldee/auth-context";
import { useCompanyProfile } from "../../services/useSettingsData";
import { ConfigForm } from "./SettingsComponents";

export function CompanySettingsPage() {
  const company = useCompanyProfile();
  const { api, account, user } = useMFEProps();

  async function saveCompany(payload: Record<string, unknown>) {
    const selectedLogo = payload.logoUrl;
    if (selectedLogo instanceof File) {
      const uploadedLogo = await uploadHrBusinessLogo(selectedLogo, {
        api,
        tenantUid: account.tenantUid ?? account.id,
        userId: user.id,
        userName: user.name || "Tenant user",
      });
      payload.logoUrl = uploadedLogo.url;
      payload.attachments = [uploadedLogo.attachment];
    }
    await company.save(payload);
  }

  return <ConfigForm title="Company Profile" subtitle="Organization identity, tax & locale" icon={<Building2 size={20} />} data={company.data} loading={company.loading} error={company.error} onSave={saveCompany} automationScope="hr-settings-company" layout="companyProfile" fields={[
    { key: "name", label: "Company Name" }, { key: "legalName", label: "Legal Name" },
    { key: "logoUrl", label: "Company Logo", type: "file", full: true },
    { key: "industry", label: "Industry" }, { key: "email", label: "Contact Email" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "addressLine", label: "Address", full: true }, { key: "city", label: "City" },
    { key: "state", label: "State" }, { key: "country", label: "Country" },
    { key: "gstin", label: "GSTIN" }, { key: "pan", label: "PAN" },
    { key: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR", "GBP", "AED"] },
    { key: "workingDays", label: "Working Days", placeholder: "e.g. Mon-Fri", full: true },
  ]} />;
}

async function uploadHrBusinessLogo(file: File, context: {
  api: ReturnType<typeof useMFEProps>["api"];
  tenantUid: string;
  userId: string;
  userName: string;
}) {
  const metadata = {
    action: "ADD",
    caption: "HR business logo",
    contextType: "BUSINESS_LOGO",
    featureModuleName: "HR_CORE",
    featureServiceName: "HR",
    fileName: file.name,
    fileType: file.type.includes("/") ? file.type.split("/")[1] : "file",
    fileSize: file.size,
    owner: context.tenantUid,
    ownerName: context.userName,
    ownerType: "TenantUser",
    sharedType: "secureShare",
    tenantUid: context.tenantUid,
    uploadedBy: context.userId,
    uploadedByName: context.userName,
  };
  const response = await context.api.post<{ fileUid: string; uploadUrl: string; filePath?: string }>(
    "/platform-service/v1/api/drive/initiate-upload",
    metadata,
    { _skipLocationParam: true } as never,
  );
  const target = response.data;
  const uploadResponse = await fetch(target.uploadUrl, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : undefined,
  });
  if (!uploadResponse.ok) throw new Error("Unable to upload the HR business logo.");
  await context.api.patch(
    `/platform-service/v1/api/drive/${target.fileUid}/status?status=COMPLETE`,
    null,
    { _skipLocationParam: true } as never,
  );
  const resolvedUrl = target.filePath || target.uploadUrl.split("?")[0];
  return {
    url: resolvedUrl,
    attachment: {
      ...metadata,
      fileUid: target.fileUid,
      filePath: target.filePath || resolvedUrl,
    },
  };
}
