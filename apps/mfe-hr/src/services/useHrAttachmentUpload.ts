import { useCallback } from "react";
import { useMFEProps } from "@jaldee/auth-context";
import { buildBaseServiceUrl } from "../../../../packages/shared-modules/src/serviceUrls";

interface UploadTarget {
  fileUid: string;
  uploadUrl: string;
  filePath?: string;
  shortUrl?: string;
  jaldeeDriveId?: string;
}

export function useHrAttachmentUpload() {
  const { api, account, user } = useMFEProps();

  return useCallback(async (file: File, contextType: "HELPDESK" | "ANNOUNCEMENT") => {
    if (!api) throw new Error("Attachment upload is unavailable in this shell.");
    const ownerName = user.name || "User";
    const metadata = {
      action: "ADD",
      caption: file.name,
      contextType,
      featureModuleName: contextType === "HELPDESK" ? "HR_HELPDESK" : "HR_ANNOUNCEMENT",
      featureServiceName: "HR",
      fileName: file.name,
      fileType: file.type.includes("/") ? file.type.split("/")[1] : "file",
      fileSize: file.size,
      owner: user.id,
      ownerName,
      ownerType: "TenantUser",
      sharedType: "secureShare",
      tenantUid: account.tenantUid ?? account.id,
      uploadedBy: user.id,
      uploadedByName: ownerName,
    };
    const response = await api.post<UploadTarget>(
      buildBaseServiceUrl("/platform-service/v1/api/drive/initiate-upload"),
      metadata,
      { _skipLocationParam: true } as any,
    );
    const target = response.data;
    const upload = await fetch(target.uploadUrl, {
      method: "PUT",
      body: file,
      headers: file.type ? { "Content-Type": file.type } : undefined,
    });
    if (!upload.ok) throw new Error(`Unable to upload ${file.name}.`);
    await api.patch(
      buildBaseServiceUrl(`/platform-service/v1/api/drive/${target.fileUid}/status?status=COMPLETE`),
      null,
      { _skipLocationParam: true } as any,
    );
    const url = target.shortUrl || target.filePath || target.uploadUrl.split("?")[0];
    return {
      url,
      attachment: {
        ...metadata,
        fileUid: target.fileUid,
        filePath: target.filePath || url,
        jaldeeDriveId: target.jaldeeDriveId,
      },
    };
  }, [account.id, account.tenantUid, api, user.id, user.name]);
}
