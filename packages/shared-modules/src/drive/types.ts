export type DriveSummary = {
  label: string;
  value: string;
  accent: "violet" | "sky" | "emerald" | "amber";
};

export type DriveFileFolder = "private" | "public" | "shared" | string;

export type DriveFileRow = {
  id: string;
  folderId?: string;
  name: string;
  category: string;
  owner: string;
  updatedOn: string;
  size: string;
  sizeMb: number;
  folderName: DriveFileFolder;
  fileType?: string;
  filePath?: string;
  context?: string;
  sharedTo?: string;
};

export type DriveFolderRow = {
  id: string;
  name: string;
  size: string;
  sizeMb: number;
  folderName: string;
};

export type DriveSharedRow = {
  id: string;
  title: string;
  sharedWith: string;
  permission: "View" | "Edit";
  expiresOn?: string;
  size: string;
  filePath?: string;
};

export type DriveActivityRow = {
  id: string;
  actor: string;
  action: string;
  target: string;
  occurredOn: string;
};

export type DriveStorage = {
  remainingStorage: number;
  totalStorage: number;
  usedStorage: number;
};

export type DriveDataset = {
  title: string;
  subtitle: string;
  summaries: DriveSummary[];
  files: DriveFileRow[];
  shared: DriveSharedRow[];
  activity: DriveActivityRow[];
  storage: DriveStorage | null;
};

export type DriveViewKey = "overview" | "files" | "shared" | "activity" | "settings";

export type DriveUploadInput = {
  files: File[];
  folderName?: string;
};

export type DriveShareInput = {
  fileId: string;
  fileName: string;
  recipient: string;
  message?: string;
  channels: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    appNotification: boolean;
  };
};
