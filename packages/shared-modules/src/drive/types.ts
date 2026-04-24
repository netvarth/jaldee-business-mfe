export type DriveSummary = {
  label: string;
  value: string;
  accent: "violet" | "sky" | "emerald" | "amber";
};

export type DriveFileRow = {
  id: string;
  name: string;
  category: string;
  owner: string;
  updatedOn: string;
  size: string;
};

export type DriveSharedRow = {
  id: string;
  title: string;
  sharedWith: string;
  permission: "View" | "Edit";
  expiresOn?: string;
};

export type DriveActivityRow = {
  id: string;
  actor: string;
  action: string;
  target: string;
  occurredOn: string;
};

export type DriveDataset = {
  title: string;
  subtitle: string;
  summaries: DriveSummary[];
  files: DriveFileRow[];
  shared: DriveSharedRow[];
  activity: DriveActivityRow[];
};

export type DriveViewKey = "overview" | "files" | "shared" | "activity" | "settings";
