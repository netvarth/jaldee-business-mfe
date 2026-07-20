import { useCallback, useEffect, useState } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { useHrApi } from "./useHrApi";
import { buildBaseServiceUrl } from "../../../../packages/shared-modules/src/serviceUrls";
import { buildHrSearchBody, EMPTY_SEARCH_FILTERS, unwrapHrSearchPage } from "./hrSearch";

/**
 * R7.1 (partial) — document request/verify workflow, live from
 * /document-requests (DocumentRequestController). Status is free-form on the
 * backend; the service defaults new requests to "REQUESTED".
 */
export interface DocumentRequest {
  id: string;
  uid?: string;
  employeeUid?: string;
  documentType?: string;
  status?: string;
  documentUrl?: string;
  verifiedByUid?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentRequestPayload {
  employeeUid?: string;
  documentType: string;
  status?: string;
  documentUrl?: string;
  verifiedByUid?: string;
  createdAt?: string;
  updatedAt?: string;
  id?: string;
}

export const DOC_REQUEST_STATUSES = ["REQUESTED", "SUBMITTED", "VERIFIED", "REJECTED"] as const;

type DocumentUploadTarget = {
  fileUid: string;
  uploadUrl: string;
  filePath?: string;
};

function resolveFileType(file: File) {
  const byMime = file.type?.split("/").pop()?.trim();
  if (byMime) return byMime.toLowerCase();
  const byName = file.name.split(".").pop()?.trim();
  return (byName || "bin").toLowerCase();
}

function withId(r: Record<string, unknown>): DocumentRequest {
  const uid = (r.uid ?? r.id) as string | undefined;
  return { ...(r as object), id: String(uid ?? ""), uid } as DocumentRequest;
}

export function useDocumentRequests(
  employeeUid?: string,
  filterClauses: SearchFilterClause[] = EMPTY_SEARCH_FILTERS,
  schema: SearchSchema | null | undefined = null,
  { page = 0, pageSize = 20, enabled = true }: { page?: number; pageSize?: number; enabled?: boolean } = {}
) {
  const api = useHrApi();
  const { api: shellApi, account, user } = useMFEProps();
  const [data, setData] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    if (!enabled || !employeeUid) { setData([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await api.post<unknown>(
        "/document-requests/search",
        buildHrSearchBody([
          { field: "employeeUid", operator: "EQ", values: [employeeUid] },
          ...filterClauses,
        ], schema, page, pageSize)
      );
      const pageResult = unwrapHrSearchPage(res);
      setData(pageResult.content.map(withId));
      setTotalElements(pageResult.totalElements);
      setTotalPages(pageResult.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load document requests");
      setData([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally { setLoading(false); }
  }, [api, employeeUid, enabled, filterClauses, page, pageSize, schema]);

  useEffect(() => { void load(); }, [load]);

  const request = useCallback(async (documentType: string) => {
    await api.post("/document-requests", { employeeUid, documentType, status: "REQUESTED" });
    await load();
  }, [api, employeeUid, load]);

  const create = useCallback(async (payload: DocumentRequestPayload) => {
    await api.post("/document-requests", {
      employeeUid,
      status: "REQUESTED",
      ...payload,
    });
    await load();
  }, [api, employeeUid, load]);

  const setStatus = useCallback(async (uid: string, status: string) => {
    await api.put(`/document-requests/${uid}`, { status });
    await load();
  }, [api, load]);

  const update = useCallback(async (uid: string, payload: Partial<DocumentRequestPayload>) => {
    await api.put(`/document-requests/${uid}`, payload);
    await load();
  }, [api, load]);

  const remove = useCallback(async (uid: string) => {
    await api.del(`/document-requests/${uid}`);
    await load();
  }, [api, load]);

  const uploadFile = useCallback(async (ownerId: string, file: File) => {
    if (!shellApi) {
      throw new Error("Drive upload is unavailable in this shell.");
    }

    const tenantUid = account.tenantUid ?? account.id;
    const userName = user.name || "User";

    const targetResponse = await shellApi.post<DocumentUploadTarget>(
      buildBaseServiceUrl("/platform-service/v1/api/drive/initiate-upload"),
      {
        action: "ADD",
        caption: file.name,
        contextType: "DOCUMENT",
        featureModuleName: "HR_EMPLOYEE",
        featureServiceName: "HR",
        fileName: file.name,
        fileType: resolveFileType(file),
        fileSize: file.size,
        owner: ownerId,
        ownerName: userName,
        ownerType: "TenantUser",
        sharedType: "secureShare",
        tenantUid,
        uploadedBy: user.id,
        uploadedByName: userName,
      },
      { _skipLocationParam: true } as any
    );

    const target = targetResponse.data;
    const uploadResponse = await fetch(target.uploadUrl, {
      method: "PUT",
      body: file,
      headers: file.type ? { "Content-Type": file.type } : undefined,
    });

    if (!uploadResponse.ok) {
      throw new Error("Unable to upload document right now.");
    }

    await shellApi.patch(
      buildBaseServiceUrl(`/platform-service/v1/api/drive/${target.fileUid}/status?status=COMPLETE`),
      null,
      { _skipLocationParam: true } as any
    );

    return target.filePath || "";
  }, [account.id, account.tenantUid, shellApi, user.id, user.name]);

  const resolveDocumentUrl = useCallback(async (filePathOrUrl?: string | null) => {
    if (!filePathOrUrl) return null;
    if (/^https?:\/\//i.test(filePathOrUrl)) return filePathOrUrl;
    const res = await api.get<{ url?: string }>(`/careers/document-url?filePath=${encodeURIComponent(filePathOrUrl)}`);
    return res?.url ?? null;
  }, [api]);

  return { data, loading, error, reload: load, request, create, setStatus, update, remove, uploadFile, resolveDocumentUrl, totalElements, totalPages };
}

export function useDocumentCompleteness(employeeUid?: string) {
  const api = useHrApi();
  const [data, setData] = useState<{ submittedCount?: number; totalRequired?: number } | null>(null);
  
  const load = useCallback(async () => {
    if (!employeeUid) return;
    try {
      const res = await api.get<Record<string, unknown>>(`/document-requests/completeness/${employeeUid}`);
      setData(res as { submittedCount?: number; totalRequired?: number });
    } catch (e) {
      console.error(e);
    }
  }, [api, employeeUid]);

  useEffect(() => { void load(); }, [load]);
  
  return data;
}
