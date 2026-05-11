import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildScopedListQueryKey } from "../../queryKeys";
import { useApiScope } from "../../useApiScope";
import { useSharedModulesContext } from "../../context";
import {
  deleteDriveFile,
  getDriveDataset,
  listDriveFolders,
  listDriveFiles,
  shareDriveFile,
  uploadDriveFiles,
} from "../services/drive";
import type { ApiScope } from "../../types";
import type { DriveShareInput, DriveUploadInput } from "../types";

function driveQueryKey(apiScope: ApiScope, locationId?: string | null) {
  return buildScopedListQueryKey("drive", apiScope, locationId, {});
}

export function useDriveDataset() {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: driveQueryKey(scopedApi.apiScope, scopedApi.locationId),
    queryFn: () => getDriveDataset(scopedApi),
  });
}

export function useDriveFiles(filters?: Record<string, string | number>) {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("drive", scopedApi.apiScope, scopedApi.locationId, filters ?? {}),
    queryFn: () => listDriveFiles(scopedApi, filters),
  });
}

export function useDriveFolders(folderName: "public" | "shared") {
  const scopedApi = useApiScope();

  return useQuery({
    queryKey: buildScopedListQueryKey("drive-folders", scopedApi.apiScope, scopedApi.locationId, {
      folderName,
    }),
    queryFn: () => listDriveFolders(scopedApi, folderName),
  });
}

export function useDriveShared() {
  const dataset = useDriveDataset();
  return {
    ...dataset,
    data: dataset.data?.shared ?? [],
  };
}

export function useDriveActivity() {
  const dataset = useDriveDataset();
  return {
    ...dataset,
    data: dataset.data?.activity ?? [],
  };
}

export function useUploadDriveFiles() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();
  const { user } = useSharedModulesContext();

  return useMutation({
    mutationFn: (input: DriveUploadInput) => uploadDriveFiles(scopedApi, user.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function useDeleteDriveFile() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => deleteDriveFile(scopedApi, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}

export function useShareDriveFile() {
  const scopedApi = useApiScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DriveShareInput) => shareDriveFile(scopedApi, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drive"] });
    },
  });
}
