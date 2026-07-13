import { useState } from "react";
import { Button } from "@jaldee/design-system";
import { useAttachments, type Attachment } from "../../services/useAttachments";
import { useToast } from "../../contexts/ToastContext";

/**
 * Attachments panel for a booking (AttachmentController @ /attachments).
 * The physical file upload to drive happens elsewhere; this records/lists/removes
 * the attachment reference on the booking. Add takes a fileName + filePath (the
 * drive path/URL) so a reference can be attached without re-implementing upload here.
 */
export default function AttachmentsPanel({ bookingUid }: { bookingUid: string }) {
  const { attachments, loading, error, add, remove } = useAttachments(bookingUid);
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!fileName.trim() || !filePath.trim()) {
      showToast("File name and path are required", "error");
      return;
    }
    setBusy(true);
    try {
      const dto: Attachment = { fileName: fileName.trim(), filePath: filePath.trim(), caption: caption.trim() || undefined };
      await add(dto);
      showToast("Attachment added", "success");
      setFileName(""); setFilePath(""); setCaption(""); setOpen(false);
    } catch (e) {
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
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Attachments</h4>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Add"}</Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {open && (
        <div className="mb-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <input className="w-full text-sm rounded border border-slate-200 px-2 py-1.5" placeholder="File name"
            value={fileName} onChange={(e) => setFileName(e.target.value)} />
          <input className="w-full text-sm rounded border border-slate-200 px-2 py-1.5" placeholder="File path / drive URL"
            value={filePath} onChange={(e) => setFilePath(e.target.value)} />
          <input className="w-full text-sm rounded border border-slate-200 px-2 py-1.5" placeholder="Caption (optional)"
            value={caption} onChange={(e) => setCaption(e.target.value)} />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add attachment"}</Button>
          </div>
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
