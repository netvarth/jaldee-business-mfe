import { useState } from "react";
import { Button, FileUpload } from "@jaldee/design-system";
import { useAttachments, uploadAttachmentsToDrive, type Attachment } from "../../services/useAttachments";
import { useBookingApi } from "../../services/useBookingApi";
import { useToast } from "../../contexts/ToastContext";
import { useMFEProps } from "@jaldee/auth-context";

/**
 * Attachments panel for a booking (AttachmentController @ /attachments).
 * It uploads the selected physical file(s) to the drive, then adds the drive
 * file reference to the booking.
 */
export default function AttachmentsPanel({ bookingUid }: { bookingUid: string }) {
  const { attachments, loading, error, add, remove } = useAttachments(bookingUid);
  const api = useBookingApi();
  const { showToast } = useToast();
  const { user, account } = useMFEProps();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setBusy(true);
    setUploadError(null);
    try {
      const driveAttachments = await uploadAttachmentsToDrive(api, files, user, account.id || "");
      for (const att of driveAttachments) {
        await add(att);
      }
      showToast("Attachment(s) added successfully", "success");
      setOpen(false);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to add attachment");
      showToast(e instanceof Error ? e.message : "Failed to add attachment", "error");
    } finally {
      setBusy(false);
    }
  };

  const del = async (a: Attachment) => {
    try { await remove(a.filePath); showToast("Attachment removed", "success"); }
    catch (e) { showToast(e instanceof Error ? e.message : "Failed to remove attachment", "error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#91a4c2]">Attachments</h4>
        <Button variant="ghost" size="sm" onClick={() => { setOpen((o) => !o); setUploadError(null); }}>
          {open ? "Close" : "Add"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {open && (
        <div className="mb-3 space-y-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <FileUpload
            label={busy ? "Uploading..." : "Upload Attachment"}
            multiple
            onUpload={handleUpload}
          />
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-slate-400">No attachments.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div key={a.filePath} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white p-2">
              <div className="min-w-0">
                {a.shortUrl ? (
                  <a href={a.shortUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-violet-600 underline truncate block">{a.fileName}</a>
                ) : (
                  <span className="text-sm font-medium text-slate-700 truncate block">{a.fileName}</span>
                )}
                {a.caption && <span className="text-xs text-slate-400">{a.caption}</span>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(a)}>Remove</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
