import { useState, useEffect, useCallback } from "react";
import { useBookingApi } from "../services/useBookingApi";

/** Mirrors shared drive AttachmentsDto (the fields the booking attachments API uses). */
export interface Attachment {
  fileName: string;
  fileType?: string;
  fileSize?: number;
  filePath: string;
  caption?: string;
  shortUrl?: string;
  uploadedByName?: string;
}

/**
 * Booking attachments — AttachmentController @ /attachments:
 *   GET    /{bookingUid}/attachments
 *   POST   /{bookingUid}/attachments   (body: AttachmentsDto)
 *   DELETE /{bookingUid}/attachments?filePath=...
 * Attachments live on the booking; the drive upload itself happens elsewhere,
 * this only records/lists/removes the reference on the booking.
 */
export function useAttachments(bookingUid?: string) {
  const api = useBookingApi();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bookingUid) {
      setAttachments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Attachment[]>(`/attachments/${bookingUid}/attachments`);
      setAttachments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attachments.");
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [api, bookingUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(
    async (attachment: Attachment) => {
      if (!bookingUid) return;
      await api.post<Attachment>(`/attachments/${bookingUid}/attachments`, attachment);
      await load();
    },
    [api, bookingUid, load],
  );

  const remove = useCallback(
    async (filePath: string) => {
      if (!bookingUid) return;
      await api.del(`/attachments/${bookingUid}/attachments`, { params: { filePath } });
      await load();
    },
    [api, bookingUid, load],
  );

  return { attachments, loading, error, reload: load, add, remove };
}

function resolveFileType(file: File) {
  if (file.type && file.type.includes("/")) {
    return file.type.split("/")[1];
  }
  const parts = file.name.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "unknown";
}

export async function uploadAttachmentsToDrive(
  api: ReturnType<typeof useBookingApi>,
  files: File[],
  user: { id: string; name: string },
  accountId: string
) {
  const uploadedAttachments: Attachment[] = [];

  for (const file of files) {
    const resolvedUserName = user.name || "User";
    
    const initiatePayload = {
      action: "ADD",
      caption: file.name,
      contextType: "BOOKING",
      featureModuleName: "BOOKING_APPOINTMENT",
      featureServiceName: "BOOKING",
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || resolveFileType(file),
      owner: user.id,
      ownerName: resolvedUserName,
      ownerType: "TenantUser",
      sharedType: "secureShare",
      tenantUid: accountId,
      uploadedBy: user.id,
      uploadedByName: resolvedUserName,
    };

    const initiateRes = await api.post<any>(
      "/platform-service/v1/api/drive/initiate-upload",
      initiatePayload,
      { _skipLocationParam: true } as any
    );

    // api.post returns the unwrapped data payload
    const initiateData = initiateRes;
    const { fileUid, uploadUrl, filePath } = initiateData;

    if (!uploadUrl) {
      throw new Error("No upload URL returned from initiate-upload");
    }

    const s3Res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: file.type ? { "Content-Type": file.type } : undefined,
    });

    if (!s3Res.ok) {
      throw new Error(`AWS S3 upload failed for ${file.name}`);
    }

    await api.patch(
      `/platform-service/v1/api/drive/${fileUid}/status?status=COMPLETE`,
      null,
      { _skipLocationParam: true } as any
    );

    uploadedAttachments.push({
      fileName: file.name,
      fileType: file.type || resolveFileType(file),
      caption: file.name,
      filePath: filePath,
      fileSize: file.size,
      uploadedByName: resolvedUserName,
    });
  }

  return uploadedAttachments;
}
