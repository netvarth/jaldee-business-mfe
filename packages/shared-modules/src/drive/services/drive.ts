import type {
  DriveActivityRow,
  DriveDataset,
  DriveFileRow,
  DriveFolderRow,
  DriveShareInput,
  DriveShareRecipient,
  DriveSharedRow,
  DriveStorage,
  DriveUploadInput,
} from "../types";

interface ScopedApi {
  get: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
  post: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  put: <T>(path: string, data?: unknown, config?: unknown) => Promise<{ data: T }>;
  delete: <T>(path: string, config?: unknown) => Promise<{ data: T }>;
}

type RawFile = Record<string, unknown>;
type RawFolder = {
  folderName?: string;
  folderSize?: number;
  files?: RawFile[];
};
type RawFileShareResponse = Record<string, RawFolder | RawFile[]>;

type UploadUrlResponse = {
  url: string;
  orderId?: number;
  driveId?: string;
};

const DRIVE_FILE_TYPES = new Set([
  "image/jpg",
  "image/png",
  "image/jpeg",
  "image/bmp",
  "image/webp",
  "application/pdf",
  "application/jfif",
  "video/mp4",
  "video/mpeg",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/doc",
  "application/ms-doc",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatSize(sizeMb: number) {
  if (sizeMb <= 0) return "0 KB";
  if (sizeMb < 1) return `${Math.max(1, Math.round(sizeMb * 1024))} KB`;
  return `${Math.round(sizeMb * 10) / 10} MB`;
}

export function formatDriveStorageGb(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 GB";
  if (value < 1) return `${Math.round(value * 1024 * 10) / 10} MB`;
  return `${value.toFixed(2)} GB`;
}

function fileTypeLabel(fileType: string) {
  if (!fileType) return "File";
  const normalized = fileType.includes("/") ? fileType.split("/").pop() ?? fileType : fileType;
  return normalized.toUpperCase();
}

function normalizeDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function extractFiles(response: RawFileShareResponse): DriveFileRow[] {
  return Object.entries(response ?? {}).flatMap(([folderId, folder]) => {
    const folderObject = Array.isArray(folder) ? { files: folder } : folder;
    const folderName = asString(folderObject.folderName, folderId);
    const files = Array.isArray(folderObject.files) ? folderObject.files : [];

    return files.map((file, index) => {
      const fileType = asString(file.fileType ?? file.type);
      const sizeMb = asNumber(file.fileSize);
      const id = String(file.id ?? file.uid ?? file.driveId ?? `${folderId}-${index}`);
      const owner = asString(file.ownerName ?? file.owner ?? file.providerName, "You");

      return {
        id,
        folderId,
        name: asString(file.fileName ?? file.name, "Untitled file"),
        category: asString(file.contextDisplayName ?? file.context ?? file.caption, fileTypeLabel(fileType)),
        owner,
        updatedOn: normalizeDate(file.uploadedDate ?? file.updatedDate ?? file.createdDate),
        size: formatSize(sizeMb),
        sizeMb,
        folderName,
        fileType,
        filePath: asString(file.filePath ?? file.s3path ?? file.url),
        context: asString(file.contextDisplayName ?? file.context),
        sharedTo: asString(file.sharedTo ?? file.sharedWith),
      };
    });
  });
}

function extractFolders(response: RawFileShareResponse): DriveFolderRow[] {
  return Object.entries(response ?? {}).map(([folderId, folder]) => {
    const folderObject = Array.isArray(folder) ? { files: folder } : folder;
    const folderName = asString(folderObject.folderName, folderId);
    const sizeMb =
      typeof folderObject.folderSize === "number"
        ? folderObject.folderSize
        : Array.isArray(folderObject.files)
          ? folderObject.files.reduce((sum, file) => sum + asNumber(file.fileSize), 0)
          : 0;

    return {
      id: folderId,
      name: folderName,
      size: formatSize(sizeMb),
      sizeMb,
      folderName,
    };
  });
}

function toSharedRows(files: DriveFileRow[]): DriveSharedRow[] {
  return files
    .filter((file) => file.folderName.toLowerCase() === "shared" || Boolean(file.sharedTo))
    .map((file) => ({
      id: file.id,
      title: file.name,
      sharedWith: file.sharedTo || file.owner || "Shared user",
      permission: "View",
      size: file.size,
      filePath: file.filePath,
    }));
}

function toActivityRows(files: DriveFileRow[]): DriveActivityRow[] {
  return files.slice(0, 10).map((file) => ({
    id: `activity-${file.id}`,
    actor: file.owner,
    action: file.folderName.toLowerCase() === "shared" ? "shared" : "uploaded",
    target: file.name,
    occurredOn: file.updatedOn || "Recent",
  }));
}

function buildSummaries(files: DriveFileRow[], shared: DriveSharedRow[], storage: DriveStorage | null): DriveDataset["summaries"] {
  const recentCount = files.filter((file) => file.updatedOn).slice(0, 7).length;

  return [
    { label: "Stored Files", value: String(files.length), accent: "violet" },
    { label: "Shared Files", value: String(shared.length), accent: "sky" },
    { label: "Recent Uploads", value: String(recentCount), accent: "emerald" },
    {
      label: "Storage Left",
      value: storage ? formatDriveStorageGb(storage.remainingStorage) : "-",
      accent: "amber",
    },
  ];
}

export async function getDriveStorage(api: ScopedApi): Promise<DriveStorage | null> {
  try {
    const response = await api.get<Record<string, unknown>>("provider/fileShare/storage");
    return {
      remainingStorage: asNumber(response.data.remainingStorage),
      totalStorage: asNumber(response.data.totalStorage),
      usedStorage: asNumber(response.data.usedStorage),
    };
  } catch {
    return null;
  }
}

export async function listDriveFiles(api: ScopedApi, filters?: Record<string, string | number>): Promise<DriveFileRow[]> {
  const response = await api.get<RawFileShareResponse>("provider/fileShare", {
    params: filters,
  });

  return extractFiles(response.data);
}

export async function listDriveFolders(api: ScopedApi, folderName: "public" | "shared"): Promise<DriveFolderRow[]> {
  const response = await api.get<RawFileShareResponse>("provider/fileShare", {
    params: { "folderName-eq": folderName },
  });

  return extractFolders(response.data);
}

export async function getDriveDataset(api: ScopedApi): Promise<DriveDataset> {
  const [files, storage] = await Promise.all([listDriveFiles(api), getDriveStorage(api)]);
  const shared = toSharedRows(files);

  return {
    title: "Jaldee Drive",
    subtitle: "Manage uploaded files, shared documents, and storage usage from live drive data.",
    summaries: buildSummaries(files, shared, storage),
    files,
    shared,
    activity: toActivityRows(files),
    storage,
  };
}

export async function deleteDriveFile(api: ScopedApi, fileId: string): Promise<unknown> {
  return api.delete(`provider/fileShare/${fileId}`);
}

export async function shareDriveFile(api: ScopedApi, input: DriveShareInput): Promise<unknown> {
  const formData = new FormData();
  const owner = Number(input.recipient);
  const attachmentId = Number(input.fileId);

  formData.append(
    "sharedto",
    new Blob(
      [
        JSON.stringify([
          {
            owner: Number.isFinite(owner) ? owner : input.recipient,
            ownerType: "ProviderConsumer",
          },
        ]),
      ],
      { type: "application/json" }
    )
  );
  formData.append(
    "attachments",
    new Blob([JSON.stringify([Number.isFinite(attachmentId) ? attachmentId : input.fileId])], {
      type: "application/json",
    })
  );
  formData.append(
    "communication",
    new Blob(
      [
        JSON.stringify({
          medium: {
            email: input.channels.email,
            whatsapp: input.channels.whatsapp,
            sms: input.channels.sms,
            pushNotification: input.channels.appNotification,
          },
          communicationMessage: input.message || "",
        }),
      ],
      { type: "application/json" }
    )
  );

  return api.post("provider/fileShare/sharefiles", formData, {
    skipLocationScope: true,
  });
}

function toShareRecipient(raw: Record<string, unknown>): DriveShareRecipient {
  const firstName = asString(raw.firstName);
  const lastName = asString(raw.lastName);
  const phone = asString(raw.phoneNo ?? raw.primaryMobileNo);
  const email = asString(raw.email);
  const jaldeeId = asString(raw.jaldeeId);
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  const nestedProviderConsumer =
    raw.providerConsumer && typeof raw.providerConsumer === "object"
      ? (raw.providerConsumer as Record<string, unknown>)
      : null;
  const nestedConsumer = raw.consumer && typeof raw.consumer === "object" ? (raw.consumer as Record<string, unknown>) : null;
  const ownerId = [
    raw.providerConsumerId,
    raw.proConId,
    nestedProviderConsumer?.id,
    nestedProviderConsumer?.uid,
    raw.id,
    raw.uid,
    raw.consumerId,
    nestedConsumer?.id,
    nestedConsumer?.uid,
    typeof raw.providerConsumer === "string" || typeof raw.providerConsumer === "number" ? raw.providerConsumer : undefined,
  ].find((value) => typeof value === "string" || typeof value === "number");

  return {
    id: ownerId === undefined || ownerId === null ? "" : String(ownerId),
    label: name || jaldeeId || phone || email || "Customer",
    detail: [jaldeeId, phone, email].filter(Boolean).join(" | "),
  };
}

function buildShareRecipientSearchParams(searchText: string) {
  const term = searchText.trim();
  const compactPhone = term.replace(/[\s\-()+]/g, "");

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(term)) {
    return { "email-eq": term };
  }

  if (/^\d{6,15}$/.test(compactPhone)) {
    return { "phoneNo-eq": compactPhone };
  }

  return {
    or: [`jaldeeId-eq=${term}`, `firstName-eq=${term}`].join(","),
  };
}

export async function searchDriveShareRecipients(api: ScopedApi, searchText: string): Promise<DriveShareRecipient[]> {
  const term = searchText.trim();
  if (!term) return [];

  const response = await api.get<Record<string, unknown>[]>("provider/customers", {
    params: buildShareRecipientSearchParams(term),
  });

  return response.data.map(toShareRecipient).filter((recipient) => recipient.id);
}

export async function uploadDriveFiles(api: ScopedApi, userId: string, input: DriveUploadInput): Promise<void> {
  const folderName = input.folderName || "privateFolder";
  const files = input.files;

  files.forEach((file) => {
    if (!DRIVE_FILE_TYPES.has(file.type)) {
      throw new Error(`Unsupported file type: ${file.name}`);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File must be under 10 MB: ${file.name}`);
    }
  });

  const uploadPayload = files.map((file, order) => ({
    owner: userId,
    fileName: file.name,
    fileSize: file.size / 1024 / 1024,
    caption: "",
    fileType: file.type.includes("/") ? file.type.split("/")[1] : file.type,
    order,
  }));

  const response = await api.post<UploadUrlResponse[]>(
    `provider/fileShare/upload/${folderName}/${userId}`,
    uploadPayload
  );

  await Promise.all(
    response.data.map((item, index) => {
      const file = files[item.orderId ?? index];
      if (!file || !item.url) return Promise.resolve();
      return fetch(item.url, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      }).then((uploadResponse) => {
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }
      });
    })
  );
}
