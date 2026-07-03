export const DRIVE_CONTEXT_TYPES = {
  APPOINTMENT: "APPOINTMENT",
  WAITLIST: "WAITLIST",
  ORDER: "ORDER",
  DONATION: "DONATION",
  MEDICAL_RECORD: "MEDICAL_RECORD",
  COMMUNICATION: "COMMUNICATION",
  MASS_COMMUNICATION: "MASS_COMMUNICATION",
  JALDEE_DRIVE: "JALDEE_DRIVE",
  ITEM_CREATION: "ITEM_CREATION",
  CONSUMER_TASK: "CONSUMER_TASK",
  PROVIDER_TASK: "PROVIDER_TASK",
  SERVICE_CREATION: "SERVICE_CREATION",
  PROFILE_CREATION: "PROFILE_CREATION",
  CATALOG_CREATION: "CATALOG_CREATION",
  LEAD: "LEAD",
  ENQUIRY: "ENQUIRY",
  PRESCRIPTION: "PRESCRIPTION",
  KYC: "KYC",
  TEMP: "TEMP",
  LOAN: "LOAN",
  BRANCH: "BRANCH",
  BUSINESS_LOGO: "BUSINESS_LOGO",
  DEPARTMENT_LOGO: "DEPARTMENT_LOGO",
  IVR: "IVR",
  VENDOR: "VENDOR",
  EXPENSE: "EXPENSE",
  REVENUE: "REVENUE",
  PAYMENTS_OUT: "PAYMENTS_OUT",
  INVOICE: "INVOICE",
  FINANCE: "FINANCE",
  FINANCE_CATEGORY: "FINANCE_CATEGORY",
  MEDICAL_HISTORY: "MEDICAL_HISTORY",
  MR_CASE: "MR_CASE",
  CONSENT_FORM: "CONSENT_FORM",
  SP_ITEM: "SP_ITEM",
  SO_CATALOG: "SO_CATALOG",
  STORE: "STORE",
  INVENTORY_PURCHASE: "INVENTORY_PURCHASE",
  PATIENTS_DATA_EXPORT: "PATIENTS_DATA_EXPORT",
  SP_ITEM_CATEGORY: "SP_ITEM_CATEGORY",
  CRM_LEAD_CHANNEL: "CRM_LEAD_CHANNEL",
  SP_DATA_EXPORT: "SP_DATA_EXPORT",
  CRM_LEAD_CONSUMER: "CRM_LEAD_CONSUMER",
  CRM_LEAD_STAGE: "CRM_LEAD_STAGE",
  LOS_LEAD_STAGE: "LOS_LEAD_STAGE",
  LOS_DOCUMENTS: "LOS_DOCUMENTS",
  MEMBERSHIP: "MEMBERSHIP",
  MEMBERSHIP_SERVICE: "MEMBERSHIP_SERVICE",
  IN_PATIENT: "IN_PATIENT",
  DIET_PLAN: "DIET_PLAN",
  CRM_LEAD_PRODUCT: "CRM_LEAD_PRODUCT",
} as const;

export type DriveContextType = typeof DRIVE_CONTEXT_TYPES[keyof typeof DRIVE_CONTEXT_TYPES];

type BuildCrmLeadAttachmentMetadataInput = {
  caption: string;
  contextType: DriveContextType;
  fileName: string;
  filePath?: string;
  fileSize: number;
  fileType: string;
  fileUid?: string;
  jaldeeDriveId?: string | null;
  tenantUid: string;
  userId: string;
  userName: string;
};

export function buildCrmLeadAttachmentMetadata({
  caption,
  contextType,
  fileName,
  filePath,
  fileSize,
  fileType,
  fileUid,
  jaldeeDriveId,
  tenantUid,
  userId,
  userName,
}: BuildCrmLeadAttachmentMetadataInput) {
  return {
    action: "ADD" as const,
    caption,
    contextType,
    featureModuleName: "CRM_LEAD" as const,
    featureServiceName: "BASE_CRM" as const,
    fileName,
    filePath,
    fileSize,
    fileType,
    ...(fileUid ? { fileUid } : {}),
    ...(jaldeeDriveId ? { jaldeeDriveId } : {}),
    owner: userId,
    ownerName: userName,
    ownerType: "TenantUser" as const,
    sharedType: "secureShare" as const,
    tenantUid,
    uploadedBy: userId,
    uploadedByName: userName,
  };
}
