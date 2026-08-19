import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SHELL_TOAST_EVENT, useMFEProps } from "@jaldee/auth-context";
import { Button, Icon, SectionCard } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { formatCurrency } from "../../lib/financeData";
import { PageShell } from "../../components/FinancePageLayout";

type VendorUploadedDocument = {
  caption?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  shortUrl?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  fileUid?: string | null;
  jaldeeDriveId?: string | null;
};

const LOCAL_DRIVE_BUCKET_BASE_URL = "https://msjaldeelocal.s3.ap-south-1.amazonaws.com";

function toFinanceRoute(routePath: string) {
  const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return normalized.startsWith("/finance") ? normalized : `/finance${normalized}`;
}

function resolveUploadFileType(file: File) {
  if (file.type.includes("/")) {
    return file.type.split("/")[1] || "file";
  }
  const segments = file.name.split(".");
  return segments.length > 1 ? segments.pop() || "file" : "file";
}

function isImageAttachment(attachment: VendorUploadedDocument) {
  const type = String(attachment.fileType ?? "").toLowerCase();
  const path = `${String(attachment.filePath ?? "")} ${String(attachment.shortUrl ?? "")}`.toLowerCase();
  return type.includes("image") || /\.(png|jpe?g|webp|gif|bmp|jfif|svg)(\?|$)/.test(path);
}

function resolveAttachmentUrl(attachment: VendorUploadedDocument) {
  const shortUrl = String(attachment.shortUrl ?? "").trim();
  if (shortUrl) {
    if (/^https?:\/\//i.test(shortUrl)) return shortUrl;
    if (typeof window !== "undefined") return `${window.location.origin}${shortUrl.startsWith("/") ? shortUrl : `/${shortUrl}`}`;
    return shortUrl;
  }

  const filePath = String(attachment.filePath ?? "").trim();
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const bucketBase =
    (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname))
      ? LOCAL_DRIVE_BUCKET_BASE_URL
      : (import.meta.env.VITE_CUSTOM_UPLOAD_S3_BASE_URL?.trim().replace(/\/$/, "") || LOCAL_DRIVE_BUCKET_BASE_URL);

  return `${bucketBase}/${filePath.replace(/^\/+/, "")}`;
}

async function uploadVendorImageAttachment(
  file: File,
  input: {
    api: { post: <T = unknown>(url: string, data?: unknown, config?: unknown) => Promise<{ data: T }>; patch: <T = unknown>(url: string, data?: unknown, config?: unknown) => Promise<{ data: T }> } | null | undefined;
    tenantUid: string;
    userId: string;
    userName: string;
  },
) {
  if (!input.api) {
    throw new Error("Vendor image upload is unavailable in this shell.");
  }

  const fileType = file.type || resolveUploadFileType(file);
  const response = await input.api.post<{
    fileUid?: string;
    uploadUrl?: string;
    filePath?: string;
    shortUrl?: string;
    jaldeeDriveId?: string | number | null;
  }>(
    "/platform-service/v1/api/drive/initiate-upload",
    {
      action: "ADD",
      caption: file.name,
      contextType: "BOOKING",
      featureModuleName: "BASE_CRM_CORE",
      featureServiceName: "BASE_CRM",
      fileName: file.name,
      fileSize: file.size,
      fileType,
      owner: input.userId,
      ownerName: input.userName,
      ownerType: "TenantUser",
      sharedType: "secureShare",
      tenantUid: input.tenantUid,
      uploadedBy: input.userId,
      uploadedByName: input.userName,
    },
    { _skipLocationParam: true } as any,
  );

  const target = response?.data ?? null;
  const fileUid = String(target?.fileUid ?? "").trim();
  const uploadUrl = String(target?.uploadUrl ?? "").trim();
  const filePath = String(target?.filePath ?? "").trim();
  const shortUrl = String(target?.shortUrl ?? "").trim();
  const jaldeeDriveId = target?.jaldeeDriveId == null ? null : String(target.jaldeeDriveId);

  if (!fileUid || !uploadUrl) {
    throw new Error(`Upload target was not returned for ${file.name}.`);
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : undefined,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Unable to upload ${file.name}.`);
  }

  await input.api.patch(
    `/platform-service/v1/api/drive/${fileUid}/status?status=COMPLETE`,
    null,
    { _skipLocationParam: true } as any,
  );

  return {
    action: null,
    caption: file.name,
    contextType: "BOOKING" as const,
    contextUid: null,
    driveId: null,
    featureModuleName: "BASE_CRM_CORE" as const,
    featureServiceName: "BASE_CRM" as const,
    fileName: file.name,
    filePath: filePath || uploadUrl.split("?")[0],
    fileSize: file.size,
    fileType: file.type || "",
    fileUid,
    jaldeeDriveId,
    owner: input.userId,
    ownerName: input.userName,
    ownerType: "TenantUser" as const,
    sharedTo: null,
    sharedType: "secureShare" as const,
    shortUrl: shortUrl || null,
    tenantUid: input.tenantUid,
    uploadedBy: input.userId,
    uploadedByName: input.userName,
  };
}

export default function VendorDetailPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"expenses" | "payments">("expenses");
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [expenseRows, setExpenseRows] = useState<Array<{ id: string; date: string; amount: number; category: string; paymentMode: string; status: string }>>([]);
  const [paymentRows, setPaymentRows] = useState<Array<{ id: string; date: string; amount: number; category: string; paymentMode: string; status: string }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadVendorDetails() {
      setLoading(true);
      try {
        const [detailResponse, expensesResponse, paymentsResponse] = await Promise.allSettled([
          financeApi.vendors.detail<any>(id),
          financeApi.expenses.list<any>({ vendorUid: id, page: 0, size: 10 }),
          financeApi.payables.list<any>({ vendorUid: id, page: 0, size: 10 }),
        ]);

        if (!active) {
          return;
        }

        const detail = detailResponse.status === "fulfilled" ? detailResponse.value.data : null;
        const expenseItems = expensesResponse.status === "fulfilled"
          ? Array.isArray(expensesResponse.value.data)
            ? expensesResponse.value.data
            : Array.isArray((expensesResponse.value.data as any)?.content)
              ? (expensesResponse.value.data as any).content
              : Array.isArray((expensesResponse.value.data as any)?.data)
                ? (expensesResponse.value.data as any).data
                : Array.isArray((expensesResponse.value.data as any)?.data?.content)
                  ? (expensesResponse.value.data as any).data.content
                  : []
          : [];
        const paymentItems = paymentsResponse.status === "fulfilled"
          ? Array.isArray(paymentsResponse.value.data)
            ? paymentsResponse.value.data
            : Array.isArray((paymentsResponse.value.data as any)?.content)
              ? (paymentsResponse.value.data as any).content
              : Array.isArray((paymentsResponse.value.data as any)?.data)
                ? (paymentsResponse.value.data as any).data
                : Array.isArray((paymentsResponse.value.data as any)?.data?.content)
                  ? (paymentsResponse.value.data as any).data.content
                  : []
          : [];

        setVendor(detail);
        setExpenseRows(
          expenseItems.map((item: any, index: number) => ({
            id: String(item.expenseUid ?? item.uid ?? item.id ?? `expense-${index}`),
            date: item.expenseDate || item.paidDate || item.createdDate
              ? new Date(item.expenseDate ?? item.paidDate ?? item.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-",
            amount: Number(item.amount ?? item.totalAmount ?? item.expenseAmount ?? 0) || 0,
            category: String(item.categoryName ?? item.expenseCategoryName ?? item.category ?? "-"),
            paymentMode: String(item.paymentMode ?? item.mode ?? "-"),
            status: String(item.expenseStatusName ?? item.statusName ?? item.status ?? "-"),
          })),
        );
        setPaymentRows(
          paymentItems.map((item: any, index: number) => ({
            id: String(item.paymentsOutUid ?? item.payInOutUid ?? item.uid ?? item.id ?? `payment-${index}`),
            date: item.paymentOn || item.paidDate || item.createdDate
              ? new Date(item.paymentOn ?? item.paidDate ?? item.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-",
            amount: Number(item.amount ?? item.paymentAmount ?? item.totalAmount ?? 0) || 0,
            category: String(item.categoryName ?? item.paymentCategory ?? "-"),
            paymentMode: String(item.paymentMode ?? item.mode ?? "-"),
            status: String(item.statusName ?? item.vendorStatusName ?? item.status ?? "-"),
          })),
        );
      } catch (error) {
        console.error("[mfe-finance] Failed to load vendor detail", error);
        if (active) {
          setVendor(null);
          setExpenseRows([]);
          setPaymentRows([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadVendorDetails();
    return () => {
      active = false;
    };
  }, [id]);

  const detail = vendor ?? {};
  const detailRows = [
    { label: "Owner", value: String(detail.contactName ?? "-") },
    { label: "Status", value: String(detail.vendorStatusName ?? detail.statusName ?? detail.vendorStatus ?? detail.status ?? "-") },
    { label: "Phone", value: String(detail.phoneNumber ?? "-") },
    { label: "Email", value: String(detail.email ?? "-") },
    { label: "State", value: String(detail.state ?? "-") },
    { label: "Pin", value: String(detail.pincode ?? "-") },
    { label: "Address", value: String(detail.address ?? "-") },
  ];
  const bankRows = [
    { label: "Bank Name", value: String(detail.bankName ?? "-") },
    { label: "Account No", value: String(detail.bankaccountNo ?? "-") },
    { label: "Branch", value: String(detail.state ?? "-") },
    { label: "GST No", value: String(detail.gstNumber ?? "-") },
    { label: "IFSC Code", value: String(detail.ifscCode ?? "-") },
    { label: "PAN No", value: String(detail.pancardNo ?? "-") },
  ];
  const rows = activeTab === "expenses" ? expenseRows : paymentRows;
  const uploadedDocuments = Array.isArray(detail.uploadedDocuments)
    ? (detail.uploadedDocuments as VendorUploadedDocument[])
    : [];
  const profileImageAttachment = uploadedDocuments.find((item) => isImageAttachment(item)) ?? uploadedDocuments[0] ?? null;
  const profileImageUrl = profileImageAttachment ? resolveAttachmentUrl(profileImageAttachment) : null;

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    setUploadError("");
    setUploadingImage(true);

    try {
      const uploadedAttachment = await uploadVendorImageAttachment(file, {
        api: mfeProps.api,
        tenantUid: String(mfeProps.account?.id ?? mfeProps.account?.tenantUid ?? detail.tenantUid ?? "").trim(),
        userId: String(mfeProps.user?.id ?? "").trim(),
        userName: String(mfeProps.user?.name ?? mfeProps.user?.fullName ?? "").trim() || "User",
      });

      const nextUploadedDocuments = [
        uploadedAttachment,
        ...uploadedDocuments.filter((item) => !isImageAttachment(item)),
      ];

      const payload = {
        uid: String(detail.uid ?? id) || undefined,
        tenantUid: detail.tenantUid || String(mfeProps.account?.id ?? mfeProps.account?.tenantUid ?? "").trim() || undefined,
        sourceService: String(detail.sourceService ?? "API_GATEWAY") || undefined,
        feature: String(detail.feature ?? "BASE_CRM") || undefined,
        subFeature: String(detail.subFeature ?? "BASE_CRM") || undefined,
        featureModule: String(detail.featureModule ?? "BASE_CRM_CORE") || undefined,
        vendorCategoryId: Number(detail.vendorCategoryId ?? detail.configCategoryId) || undefined,
        vendorCategoryName: detail.vendorCategoryName ?? detail.categoryName ?? undefined,
        vendorStatusId: Number(detail.vendorStatusId) || undefined,
        vendorStatusName: detail.vendorStatusName ?? detail.statusName ?? undefined,
        vendorId: String(detail.vendorId ?? "").trim() || undefined,
        name: String(detail.name ?? detail.vendorName ?? "").trim() || undefined,
        contactName: String(detail.contactName ?? "").trim() || undefined,
        phoneNumber: String(detail.phoneNumber ?? "").trim() || undefined,
        alternativePhoneNum: String(detail.alternativePhoneNum ?? "").trim() || undefined,
        email: String(detail.email ?? "").trim() || undefined,
        address: String(detail.address ?? "").trim() || undefined,
        state: String(detail.state ?? "").trim() || undefined,
        pincode: String(detail.pincode ?? "").trim() || undefined,
        bankaccountNo: String(detail.bankaccountNo ?? "").trim() || undefined,
        ifscCode: String(detail.ifscCode ?? "").trim() || undefined,
        bankName: String(detail.bankName ?? "").trim() || undefined,
        upiId: String(detail.upiId ?? "").trim() || undefined,
        locationUid: String(detail.locationUid ?? "").trim() || undefined,
        locationName: String(detail.locationName ?? "").trim() || undefined,
        pancardNo: String(detail.pancardNo ?? "").trim() || undefined,
        gstNumber: String(detail.gstNumber ?? "").trim() || undefined,
        preferredPaymentMode: Array.isArray(detail.preferredPaymentMode)
          ? detail.preferredPaymentMode
          : detail.preferredPaymentMode
            ? [detail.preferredPaymentMode]
            : undefined,
        lastPaymentModeUsed: String(detail.lastPaymentModeUsed ?? "").trim() || undefined,
        currency: String(detail.currency ?? "").trim() || undefined,
        timezone: String(detail.timezone ?? "").trim() || undefined,
        uploadedDocuments: nextUploadedDocuments,
      };

      await financeApi.vendors.update(id, payload);
      setVendor((current: any) => ({
        ...(current ?? {}),
        uploadedDocuments: nextUploadedDocuments,
      }));
      mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Vendor Image",
        message: "Vendor image updated successfully.",
      });
    } catch (error) {
      console.error("[mfe-finance] Failed to upload vendor image", error);
      const message = error instanceof Error ? error.message : "Could not upload vendor image.";
      setUploadError(message);
      mfeProps.eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Vendor Image",
        message,
      });
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  if (loading) {
    return (
      <PageShell title="Vendor Details" subtitle="Loading vendor details..." back={{ label: "Back to Vendors", href: "/vendors" }}>
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="py-8 text-center text-slate-500">Loading vendor details...</div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Vendor Details"
      back={{ label: "Back to Vendors", href: "/vendors" }}
      actions={
        <div className="flex gap-2">
          <Button disabled>Ledger</Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  title={uploadingImage ? "Uploading image..." : "Upload vendor image"}
                >
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt={String(detail.name ?? "Vendor")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200 text-2xl font-semibold text-slate-700">
                      {String(detail.name ?? "?").trim().charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-slate-900/45 text-white">
                    <Icon name={uploadingImage ? "folder" : "edit"} className="h-3.5 w-3.5" />
                  </div>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.gif"
                  className="hidden"
                  onChange={handleImageSelection}
                />
                <div>
                  <div className="text-3xl font-semibold text-slate-900">{String(detail.name ?? "-")}</div>
                  <div className="mt-1 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                    {`Vendor Id : ${String(detail.vendorId ?? detail.id ?? "-")}`}
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-500">
                    {uploadingImage ? "Uploading image..." : "Click image to upload"}
                  </div>
                  {uploadError ? (
                    <div className="mt-1 text-xs font-medium text-red-600">{uploadError}</div>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                className="h-9 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:opacity-95"
                onClick={() => navigate(toFinanceRoute(`/vendors/edit/${id}`))}
              >
                Edit
              </Button>
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="mb-4 text-2xl font-semibold text-slate-900">Basic Information</div>
            <div className="space-y-3">
              {detailRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[110px_1fr] gap-4 text-sm">
                  <div className="text-slate-500">{row.label}</div>
                  <div className="text-slate-900">{row.value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-2xl font-semibold text-slate-900">Bank Information</div>
              <Button variant="outline" disabled>Add</Button>
            </div>
            <div className="space-y-3">
              {bankRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[110px_1fr] gap-4 text-sm">
                  <div className="text-slate-500">{row.label}</div>
                  <div className="text-slate-900">{row.value}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard className="border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center gap-6 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("expenses")}
              className={`border-b-2 px-2 py-3 text-sm font-semibold ${activeTab === "expenses" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`border-b-2 px-2 py-3 text-sm font-semibold ${activeTab === "payments" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
            >
              Payments
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Amount</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Payment Mode</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-medium text-slate-500">
                      {activeTab === "expenses" ? "No expenses found" : "No payments found"}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-4">{row.date}</td>
                      <td className="px-4 py-4">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-4">{row.category}</td>
                      <td className="px-4 py-4">{row.paymentMode}</td>
                      <td className="px-4 py-4">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
