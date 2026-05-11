import { useMemo, useRef, useState } from "react";
import { Button, Checkbox, Dialog, Input, SkeletonTable, Textarea, EmptyState } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useDeleteDriveFile, useDriveFiles, useShareDriveFile, useUploadDriveFiles } from "../queries/drive";
import type { DriveFileRow } from "../types";
import { DrivePageShell, FileGlyph } from "./shared";

type DriveFilesListProps = {
  folderName?: "private" | "public" | "shared";
  folderId?: string | null;
  title?: string;
  subtitle?: string;
  showOwner?: boolean;
  showContext?: boolean;
  allowUpload?: boolean;
  backTo?: string;
};

function truncateName(value: string) {
  return value.length > 14 ? `${value.slice(0, 10)}...` : value;
}

function DriveActions({
  row,
  onDelete,
  onShare,
  deleting,
  allowDelete,
  open,
  onToggle,
}: {
  row: DriveFileRow;
  onDelete: (id: string) => void;
  onShare: (row: DriveFileRow) => void;
  deleting: boolean;
  allowDelete: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative flex justify-end">
      <button
        aria-label={`Actions for ${row.name}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-slate-700 hover:bg-slate-100"
        onClick={onToggle}
        type="button"
      >
        ...
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-left shadow-lg">
          <button
            className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
            onClick={() => onShare(row)}
            type="button"
          >
            Share
          </button>
          {allowDelete && (
            <button
              className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
              disabled={deleting}
              onClick={() => onDelete(row.id)}
              type="button"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ShareFileDialog({
  file,
  open,
  loading,
  error,
  onClose,
  onSubmit,
}: {
  file: DriveFileRow | null;
  open: boolean;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: {
    recipient: string;
    message: string;
    channels: { email: boolean; sms: boolean; whatsapp: boolean; appNotification: boolean };
  }) => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState({
    email: true,
    sms: false,
    whatsapp: false,
    appNotification: false,
  });

  const handleClose = () => {
    setRecipient("");
    setMessage("");
    setChannels({ email: true, sms: false, whatsapp: false, appNotification: false });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="lg"
      title={
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-white">-&gt;</span>
          Share with people
        </span>
      }
      contentClassName="rounded-md"
    >
      <div className="space-y-4">
        <Input
          placeholder="Search people by id/name/email/phone number"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
        />
        <Textarea
          placeholder="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
        />
        {file && (
          <div className="inline-flex max-w-xs items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <FileGlyph fileType={file.fileType} />
            <span className="truncate">{file.name}</span>
          </div>
        )}
        <div>
          <p className="mb-3 text-sm text-slate-600">Share file via</p>
          <div className="flex flex-wrap gap-5">
            <Checkbox
              checked={channels.email}
              label="Email"
              onChange={(event) => setChannels((current) => ({ ...current, email: event.target.checked }))}
            />
            <Checkbox
              checked={channels.sms}
              label="SMS"
              onChange={(event) => setChannels((current) => ({ ...current, sms: event.target.checked }))}
            />
            <Checkbox
              checked={channels.whatsapp}
              label="Whatsapp"
              onChange={(event) => setChannels((current) => ({ ...current, whatsapp: event.target.checked }))}
            />
            <Checkbox
              checked={channels.appNotification}
              label="App notification"
              onChange={(event) =>
                setChannels((current) => ({ ...current, appNotification: event.target.checked }))
              }
            />
          </div>
        </div>
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex justify-start gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() => onSubmit({ recipient, message, channels })}
            disabled={!recipient.trim() || !Object.values(channels).some(Boolean)}
          >
            Send
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function DriveFilesList({
  folderName = "private",
  folderId,
  title = "My Files",
  subtitle = "Manage your own files!",
  showOwner = false,
  showContext = false,
  allowUpload = true,
  backTo,
}: DriveFilesListProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<DriveFileRow | null>(null);
  const [shareError, setShareError] = useState("");
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const files = useDriveFiles({ "folderName-eq": folderName });
  const upload = useUploadDriveFiles();
  const remove = useDeleteDriveFile();
  const share = useShareDriveFile();

  const visibleFiles = useMemo(() => {
    const rows = files.data ?? [];
    return folderId ? rows.filter((row) => row.folderId === folderId) : rows;
  }, [files.data, folderId]);

  const totalPages = Math.max(1, Math.ceil(visibleFiles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedFiles = visibleFiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const start = visibleFiles.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, visibleFiles.length);

  const handleUpload = async (selectedFiles: FileList | null) => {
    setError("");
    const nextFiles = Array.from(selectedFiles ?? []);
    if (nextFiles.length === 0) return;

    try {
      await upload.mutateAsync({ files: nextFiles, folderName: "privateFolder" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await remove.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleShare = async (values: {
    recipient: string;
    message: string;
    channels: { email: boolean; sms: boolean; whatsapp: boolean; appNotification: boolean };
  }) => {
    if (!shareFile) return;
    setShareError("");
    try {
      await share.mutateAsync({
        fileId: shareFile.id,
        fileName: shareFile.name,
        recipient: values.recipient.trim(),
        message: values.message,
        channels: values.channels,
      });
      setShareFile(null);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Share failed");
    }
  };

  return (
    <DrivePageShell
      actions={
        <div className="flex items-center gap-2">
          {allowUpload && (
            <>
              <input
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={(event) => handleUpload(event.currentTarget.files)}
                type="file"
              />
              <Button loading={upload.isPending} onClick={() => fileInputRef.current?.click()}>
                + Upload File
              </Button>
            </>
          )}
          <Button variant="outline" aria-label="Filter">
            Filter
          </Button>
        </div>
      }
      title={title}
      subtitle={subtitle}
      onBack={() => navigate(backTo ?? basePath)}
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">

        {error && (
          <div className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {files.isLoading && (
          <div className="p-4">
            <SkeletonTable rows={5} columns={showOwner ? 5 : 4} />
          </div>
        )}

        {files.isError && (
          <EmptyState
            title="Files could not load"
            description="The drive files API returned an error."
            action={<Button onClick={() => files.refetch()}>Retry</Button>}
          />
        )}

        {!files.isLoading && !files.isError && visibleFiles.length === 0 && (
          <EmptyState
            title="No files found"
            description="Files from this drive folder will appear here."
            action={
              allowUpload ? <Button onClick={() => fileInputRef.current?.click()}>Upload File</Button> : undefined
            }
          />
        )}

        {!files.isLoading && !files.isError && visibleFiles.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-sm text-slate-950">
                    <th className="px-4 py-5 font-semibold">Name</th>
                    {showOwner && <th className="px-4 py-5 font-semibold">Owner</th>}
                    <th className="px-4 py-5 font-semibold">Date</th>
                    <th className="px-4 py-5 font-semibold">Size</th>
                    {showContext && <th className="px-4 py-5 font-semibold">Context</th>}
                    <th className="px-4 py-5 text-right font-semibold">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFiles.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 align-middle transition-colors hover:bg-slate-50 last:border-0">
                      <td className="px-4 py-5">
                        <div className="inline-flex items-center gap-2 text-left text-slate-950">
                          <FileGlyph fileType={row.fileType} />
                          {truncateName(row.name)}
                        </div>
                      </td>
                      {showOwner && <td className="px-4 py-5 text-slate-950">{row.owner}</td>}
                      <td className="px-4 py-5 text-slate-950">{row.updatedOn || "-"}</td>
                      <td className="px-4 py-5 text-slate-950">{row.size}</td>
                      {showContext && <td className="px-4 py-5 text-slate-950">{row.context || row.category}</td>}
                      <td className="px-4 py-5 text-right">
                        <DriveActions
                          row={row}
                          deleting={remove.isPending && remove.variables === row.id}
                          allowDelete={folderName === "private"}
                          onDelete={handleDelete}
                          onShare={(selectedRow) => {
                            setActiveMenuId(null);
                            setShareError("");
                            setShareFile(selectedRow);
                          }}
                          open={activeMenuId === row.id}
                          onToggle={() => setActiveMenuId((current) => (current === row.id ? null : row.id))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 border-t border-slate-200 px-4 py-4 text-sm text-slate-600">
              <span>
                Showing {start} to {end} of {visibleFiles.length} entries
              </span>
              <div className="flex items-center gap-3">
                <button disabled={currentPage === 1} onClick={() => setPage(1)} type="button">
                  &lt;&lt;
                </button>
                <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} type="button">
                  &lt;
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                  const nextPage = index + 1;
                  return (
                    <button
                      key={nextPage}
                      className={
                        nextPage === currentPage
                          ? "h-10 w-10 rounded-full bg-indigo-100 text-indigo-800"
                          : "h-10 w-10 text-slate-700"
                      }
                      onClick={() => setPage(nextPage)}
                      type="button"
                    >
                      {nextPage}
                    </button>
                  );
                })}
                <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} type="button">
                  &gt;
                </button>
              </div>
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3"
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                value={pageSize}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </>
        )}
      </div>
      <ShareFileDialog
        file={shareFile}
        open={Boolean(shareFile)}
        loading={share.isPending}
        error={shareError}
        onClose={() => {
          setShareFile(null);
          setShareError("");
        }}
        onSubmit={handleShare}
      />
    </DrivePageShell>
  );
}
