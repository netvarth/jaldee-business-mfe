import { useMemo } from "react";
import { getDriveDataset } from "../services/drive";

export function useDriveDataset() {
  return useMemo(() => getDriveDataset(), []);
}

export function useDriveFiles() {
  return useDriveDataset().files;
}

export function useDriveShared() {
  return useDriveDataset().shared;
}

export function useDriveActivity() {
  return useDriveDataset().activity;
}
