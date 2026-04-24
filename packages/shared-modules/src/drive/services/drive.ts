import type { DriveDataset } from "../types";

export function getDriveDataset(): DriveDataset {
  return {
    title: "Drive Workspace",
    subtitle:
      "Keep patient documents, forms, imaging, and internal attachments organized in one shared workspace.",
    summaries: [
      { label: "Stored Files", value: "1,248", accent: "violet" },
      { label: "Shared Links", value: "86", accent: "sky" },
      { label: "Recent Uploads", value: "24", accent: "emerald" },
      { label: "Pending Reviews", value: "7", accent: "amber" },
    ],
    files: [
      {
        id: "drv-1",
        name: "MRI Brain Report.pdf",
        category: "Radiology",
        owner: "Dr. Asha Thomas",
        updatedOn: "2026-04-22",
        size: "3.4 MB",
      },
      {
        id: "drv-2",
        name: "Discharge Summary - Rahul.docx",
        category: "IP Records",
        owner: "Ward Desk",
        updatedOn: "2026-04-21",
        size: "420 KB",
      },
      {
        id: "drv-3",
        name: "Insurance Preauth Form.pdf",
        category: "Billing",
        owner: "Front Office",
        updatedOn: "2026-04-20",
        size: "1.2 MB",
      },
      {
        id: "drv-4",
        name: "Lab Trend Sheet.xlsx",
        category: "Diagnostics",
        owner: "Lab Team",
        updatedOn: "2026-04-20",
        size: "210 KB",
      },
    ],
    shared: [
      {
        id: "shr-1",
        title: "Anita Joseph - Surgery Notes",
        sharedWith: "Dr. Meera Nair",
        permission: "Edit",
        expiresOn: "2026-04-30",
      },
      {
        id: "shr-2",
        title: "Billing Pack - Ward A",
        sharedWith: "Accounts Team",
        permission: "View",
      },
      {
        id: "shr-3",
        title: "Daily Census Sheet",
        sharedWith: "Operations",
        permission: "Edit",
        expiresOn: "2026-04-25",
      },
    ],
    activity: [
      {
        id: "act-1",
        actor: "Ward Desk",
        action: "uploaded",
        target: "Discharge Summary - Rahul.docx",
        occurredOn: "2026-04-22 09:14",
      },
      {
        id: "act-2",
        actor: "Dr. Asha Thomas",
        action: "reviewed",
        target: "MRI Brain Report.pdf",
        occurredOn: "2026-04-22 08:48",
      },
      {
        id: "act-3",
        actor: "Accounts Team",
        action: "shared",
        target: "Insurance Preauth Form.pdf",
        occurredOn: "2026-04-21 18:10",
      },
      {
        id: "act-4",
        actor: "Lab Team",
        action: "updated",
        target: "Lab Trend Sheet.xlsx",
        occurredOn: "2026-04-21 16:32",
      },
    ],
  };
}
