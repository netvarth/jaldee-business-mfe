import { useCallback, useEffect, useState } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { useHrApi } from "./useHrApi";
import { buildBaseServiceUrl } from "../../../../packages/shared-modules/src/serviceUrls";

/** W9 / R9.1 — asset registry + allocation lifecycle client. */

export type AssetStatus = "Available" | "Allocated" | "UnderRepair" | "Lost" | "Retired";

export interface AssetAttachment {
  fileUid?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  ownerType?: string;
  filePath?: string;
  driveId?: string | number;
  uploadedBy?: string;
  uploadedByName?: string;
  owner?: string;
  ownerName?: string;
  caption?: string;
  contextType?: string;
  sharedType?: string;
  tenantUid?: string;
  contextUid?: string[];
  action?: string;
  shortUrl?: string;
  jaldeeDriveId?: string;
  featureServiceName?: string;
  featureModuleName?: string;
}

interface AssetUploadTarget {
  fileUid: string;
  uploadUrl: string;
  filePath?: string;
  jaldeeDriveId?: string | null;
}

type AssetUploadDescriptor = {
  action: "ADD";
  caption: string;
  contextType: "ASSET";
  featureModuleName: "HR_ASSET";
  featureServiceName: "HR";
  fileName: string;
  fileType: string;
  fileSize: number;
  owner: string;
  ownerName: string;
  ownerType: "TenantUser";
  sharedType: "secureShare";
  tenantUid: string;
  uploadedBy: string;
  uploadedByName: string;
};

interface ReturnAssetOptions {
  asset: Asset;
  status: AssetStatus;
  remarks?: string;
  attachment?: AssetAttachment[];
}

export interface Asset {
  id: string;
  uid?: string;
  assetType?: string;
  name?: string;
  tagNumber?: string;
  serialNumber?: string;
  assetValue?: number;
  departmentUid?: string;
  departmentName?: string;
  ownerDepartment?: string;
  accountsRef?: string;
  status?: AssetStatus;
  notes?: string;
  holderEmployeeUid?: string;
  holderEmployeeName?: string;
  issuedOn?: string;
  remarks?: string;
  attachment?: AssetAttachment[];
}

export interface AssetAllocation {
  id: string;
  uid?: string;
  assetUid?: string;
  assetName?: string;
  assetType?: string;
  tagNumber?: string;
  employeeUid?: string;
  employeeName?: string;
  fromStatus?: AssetStatus;
  toStatus?: AssetStatus;
  remarks?: string | null;
  attachment?: AssetAttachment[];
  changedBy?: string;
  changedByName?: string;
  changedAt?: string;
  issuedOn?: string;
  issueCondition?: string;
  returnedOn?: string;
  returnCondition?: string;
}

function withId<T extends { uid?: string; id?: string }>(r: Record<string, unknown>): T {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as T;
}

function resolveFileType(file: File) {
  if (file.type.includes("/")) {
    return file.type.split("/")[1];
  }

  const segments = file.name.split(".");
  return segments.length > 1 ? segments.pop() ?? "file" : "file";
}

export function useAssets() {
  const api = useHrApi();
  const { api: shellApi, account, user } = useMFEProps();
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/assets");
      setData(Array.isArray(res) ? res.map((r) => withId<Asset>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load assets"); setData([]); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (p: Record<string, unknown>) => { await api.post("/assets", p); await load(); }, [api, load]);
  const getOne = useCallback(async (uid: string) => {
    const res = await api.get<Record<string, unknown>>(`/assets/${uid}`);
    return withId<Asset>(res);
  }, [api]);
  const update = useCallback(async (uid: string, p: Record<string, unknown>) => { await api.put(`/assets/${uid}`, p); await load(); }, [api, load]);
  const remove = useCallback(async (uid: string) => { await api.del(`/assets/${uid}`); await load(); }, [api, load]);
  const allocate = useCallback(async (uid: string, employeeUid: string, condition?: string) => {
    await api.post(`/assets/${uid}/allocate`, { employeeUid, condition: condition || null }); await load();
  }, [api, load]);
  const requestUploadTargets = useCallback(async (ownerId: string, files: File[]) => {
    if (!shellApi) {
      throw new Error("Drive upload is unavailable in this shell.");
    }

    const tenantUid = account.tenantUid ?? account.id;
    const userName = user.name || "User";

    const payload = files.map((file) => ({
      action: "ADD" as const,
      caption: file.name,
      contextType: "ASSET" as const,
      featureModuleName: "HR_ASSET" as const,
      featureServiceName: "HR" as const,
      fileName: file.name,
      fileType: resolveFileType(file),
      fileSize: file.size,
      owner: ownerId,
      ownerName: userName,
      ownerType: "TenantUser" as const,
      sharedType: "secureShare" as const,
      tenantUid,
      uploadedBy: user.id,
      uploadedByName: userName,
    })) satisfies AssetUploadDescriptor[];

    const requestBody = payload.length === 1 ? payload[0] : payload;

    const response = await shellApi.post<AssetUploadTarget | AssetUploadTarget[]>(
      buildBaseServiceUrl("/platform-service/v1/api/drive/initiate-upload"),
      requestBody,
      { _skipLocationParam: true } as any
    );
    return Array.isArray(response.data) ? response.data : [response.data];
  }, [account.id, account.tenantUid, shellApi, user.id, user.name]);
  const markUploadComplete = useCallback(async (fileUid: string) => {
    if (!shellApi) {
      throw new Error("Drive upload is unavailable in this shell.");
    }

    await shellApi.patch(
      buildBaseServiceUrl(`/platform-service/v1/api/drive/${fileUid}/status?status=COMPLETE`),
      null,
      { _skipLocationParam: true } as any
    );
  }, [shellApi]);
  const uploadAttachments = useCallback(async (ownerId: string, files: File[]) => {
    if (!files.length) return [] as AssetAttachment[];
    const targets = await requestUploadTargets(ownerId, files);
    const uploaded: AssetAttachment[] = [];

    for (const [index, target] of targets.entries()) {
      const file = files[index];
      if (!file) continue;

      const response = await fetch(target.uploadUrl, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      });

      if (!response.ok) {
        throw new Error("Unable to upload attachment right now.");
      }

      await markUploadComplete(target.fileUid);

      uploaded.push({
        fileUid: target.fileUid,
        fileName: file.name,
        fileType: resolveFileType(file),
        fileSize: file.size,
        driveId: target.jaldeeDriveId ?? undefined,
        filePath: target.filePath,
        caption: "",
        action: "ADD",
        owner: user.id,
        ownerName: user.name || "User",
        ownerType: "TenantUser",
        contextType: "ASSET",
        sharedType: "secureShare",
        tenantUid: account.tenantUid ?? account.id,
        uploadedBy: user.id,
        uploadedByName: user.name || "User",
        jaldeeDriveId: target.jaldeeDriveId ?? undefined,
        featureServiceName: "HR",
        featureModuleName: "HR_ASSET",
      });
    }

    return uploaded;
  }, [account.id, account.tenantUid, markUploadComplete, requestUploadTargets, user.id, user.name]);
  const returnAsset = useCallback(async (uid: string, opts: ReturnAssetOptions) => {
    const asset = opts.asset;
    await api.post(`/assets/${uid}/return`, {
      uid: asset.uid ?? asset.id,
      assetType: asset.assetType ?? null,
      name: asset.name ?? null,
      tagNumber: asset.tagNumber ?? null,
      serialNumber: asset.serialNumber ?? null,
      assetValue: asset.assetValue ?? null,
      departmentUid: asset.departmentUid ?? null,
      departmentName: asset.departmentName ?? asset.ownerDepartment ?? null,
      accountsRef: asset.accountsRef ?? null,
      status: opts.status,
      notes: asset.notes ?? null,
      holderEmployeeUid: asset.holderEmployeeUid ?? null,
      holderEmployeeName: asset.holderEmployeeName ?? null,
      issuedOn: asset.issuedOn ?? null,
      remarks: opts.remarks ?? null,
      attachment: opts.attachment ?? asset.attachment ?? [],
    });
    await load();
  }, [api, load]);
  const history = useCallback(async (uid: string) => {
    const res = await api.get<Record<string, unknown>[]>(`/assets/${uid}/history`);
    return Array.isArray(res) ? res.map((r) => withId<AssetAllocation>(r)) : [];
  }, [api]);

  return { data, loading, error, reload: load, create, getOne, update, remove, allocate, returnAsset, history, uploadAttachments };
}

/** Assets currently (or historically) held by one employee. */
export function useEmployeeAssets(employeeUid?: string, openOnly = false) {
  const api = useHrApi();
  const [data, setData] = useState<AssetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeUid) { setData([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>(`/assets/employee/${employeeUid}?openOnly=${openOnly}`);
      setData(Array.isArray(res) ? res.map((r) => withId<AssetAllocation>(r)) : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load employee assets"); setData([]); }
    finally { setLoading(false); }
  }, [api, employeeUid, openOnly]);
  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, reload: load };
}
