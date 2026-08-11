import { financeApi } from "../../lib/financeApi";

type SharedInvoiceAttachment = {
  file: Record<string, never>;
  type: "invoice";
  fileName: string;
  fileType: string;
  fileSize: number;
  caption: string;
  driveId: string;
  fileUid?: string;
  filePath?: string;
  jaldeeDriveId?: string;
  action: "add";
  order: number;
  lastModified: number;
  ownerType: "TenantUser";
  owner: string;
};

type DriveUploadTarget = {
  fileUid?: string;
  uploadUrl?: string;
  filePath?: string;
  jaldeeDriveId?: string | null;
};

function resolveUploadFileType(file: File) {
  if (file.type.includes("/")) {
    return file.type.split("/")[1] || "pdf";
  }
  const segments = file.name.split(".");
  return segments.length > 1 ? segments.pop() || "pdf" : "pdf";
}

function normalizeCountryCode(rawValue?: string) {
  const digits = String(rawValue ?? "").replace(/[^\d]/g, "");
  return digits || "91";
}

function normalizePhoneNumber(rawValue?: string) {
  return String(rawValue ?? "").replace(/[^\d]/g, "");
}

export async function generateInvoicePdfFile(
  element: HTMLElement | null,
  meta: { invoiceNumber: string }
): Promise<File | null> {
  if (typeof window === "undefined" || !element) {
    return null;
  }

  const [{ default: html2canvas }, { jsPDF }]: any = await Promise.all([import("html2canvas"), import("jspdf")]);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.maxWidth = "980px";
  clone.style.margin = "0 auto";
  clone.style.background = "#fff";
  clone.style.padding = "24px";

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "1024px";
  wrapper.style.background = "#fff";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#FFFFFF",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const blob = pdf.output("blob") as Blob;
    const invoiceNum = String(meta.invoiceNumber || "invoice").replace(/[^\w.-]+/g, "_");
    const datePart = new Date().toISOString().replace(/[:.]/g, "-");
    return new File([blob], `${invoiceNum}_${datePart}.pdf`, { type: "application/pdf" });
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function triggerInvoicePdfPrint(file: File) {
  if (typeof window === "undefined") {
    return;
  }

  const url = URL.createObjectURL(file);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = url;
  iframe.onload = () => {
    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        window.setTimeout(() => {
          URL.revokeObjectURL(url);
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  };
  document.body.appendChild(iframe);
}

export async function uploadInvoicePdfAttachment(
  input: { tenantUid: string; userId: string; userName?: string },
  file: File
): Promise<SharedInvoiceAttachment> {
  const tenantUid = String(input.tenantUid ?? "").trim();
  const userId = String(input.userId ?? "").trim();
  const userName = String(input.userName ?? "").trim() || "User";
  if (!tenantUid) {
    throw new Error("Provider account id is required to upload the invoice PDF.");
  }
  if (!userId) {
    throw new Error("Logged in user id is required to upload the invoice PDF.");
  }

  const fileType = file.type || resolveUploadFileType(file);
  const response = await financeApi.assets.initiateDriveUpload<DriveUploadTarget>({
    action: "ADD",
    caption: file.name,
    contextType: "INVOICE",
    featureModuleName: "FINANCE_INVOICE",
    featureServiceName: "FINANCE",
    fileName: file.name,
    fileSize: file.size,
    fileType,
    owner: userId,
    ownerName: userName,
    ownerType: "TenantUser",
    sharedType: "secureShare",
    tenantUid,
    uploadedBy: userId,
    uploadedByName: userName,
  });
  const target = response?.data ?? null;
  const fileUid = String(target?.fileUid ?? "").trim();
  const uploadUrl = String(target?.uploadUrl ?? "").trim();
  const jaldeeDriveId = String(target?.jaldeeDriveId ?? "").trim();
  if (!uploadUrl || !fileUid) {
    throw new Error("File upload target was not returned by the server.");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : undefined,
  });
  if (!uploadResponse.ok) {
    throw new Error("Unable to upload invoice PDF right now.");
  }
  await financeApi.assets.markDriveUploadComplete(fileUid);

  return {
    file: {},
    type: "invoice",
    fileName: file.name,
    fileType: resolveUploadFileType(file),
    fileSize: file.size / (1024 * 1024),
    caption: "Invoice PDF",
    driveId: jaldeeDriveId || fileUid,
    fileUid,
    filePath: String(target?.filePath ?? "").trim() || undefined,
    jaldeeDriveId: jaldeeDriveId || undefined,
    action: "add",
    order: 1,
    lastModified: file.lastModified,
    ownerType: "TenantUser",
    owner: userId,
  };
}

export async function shareInvoicePdfAttachment(
  invoiceUid: string,
  attachment: SharedInvoiceAttachment,
  options: {
    email?: string;
    mobile?: string;
    smsCountryCode?: string;
    whatsappCountryCode?: string;
  }
) {
  const resolvedInvoiceUid = String(invoiceUid ?? "").trim();
  if (!resolvedInvoiceUid) {
    throw new Error("Invoice id is required to share the invoice.");
  }

  const email = String(options.email ?? "").trim();
  const mobile = normalizePhoneNumber(options.mobile);
  const smsCountryCode = normalizeCountryCode(options.smsCountryCode);
  const whatsappCountryCode = normalizeCountryCode(options.whatsappCountryCode);
  const sendEmail = Boolean(email);
  const sendSms = Boolean(mobile);
  const sendWhatsapp = Boolean(mobile);

  await financeApi.invoices.sharePdfAttachment(resolvedInvoiceUid, {
    sendEmail,
    emails: sendEmail ? [email] : [],
    sendSms,
    phoneNumbers: sendSms
      ? [
        {
          countryCode: smsCountryCode,
          number: mobile,
        },
      ]
      : [],
    sendWhatsapp,
    whatsappNumbers: sendWhatsapp
      ? [
        {
          countryCode: whatsappCountryCode,
          number: mobile,
        },
      ]
      : [],
    html: "",
    driveId: attachment.driveId || 0,
    invoiceAttachments: [{ ...attachment, order: 1 }],
  });
}
