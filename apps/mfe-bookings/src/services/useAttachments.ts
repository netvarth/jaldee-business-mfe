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
