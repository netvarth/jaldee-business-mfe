import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Dialog, Input, SkeletonTable, Textarea, EmptyState } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import {
  useDeleteDriveFile,
  useDriveFiles,
  useSearchDriveShareRecipients,
  useShareDriveFile,
  useUploadDriveFiles,
} from "../queries/drive";
import type { DriveFileRow } from "../types";
import { DrivePageShell, FileGlyph, openDriveFile } from "./shared";

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

function isImageFile(row: DriveFileRow) {
  const type = row.fileType?.toLowerCase() ?? "";
  const path = row.filePath?.toLowerCase() ?? "";
  return type.includes("image") || /\.(png|jpe?g|webp|gif|bmp|jfif)(\?|$)/.test(path);
}

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;

  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function FileThumbnail({ row }: { row: DriveFileRow }) {
  if (isImageFile(row) && row.filePath) {
    return (
      <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        <img alt="" className="h-full w-full object-cover" src={row.filePath} />
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
      <FileGlyph fileType={row.fileType} />
    </span>
  );
}

function DriveActions({
  row,
  onDelete,
  onShare,
  onDownload,
  deleting,
  allowDelete,
  open,
  onToggle,
}: {
  row: DriveFileRow;
  onDelete: (id: string) => void;
  onShare: (row: DriveFileRow) => void;
  onDownload: (row: DriveFileRow) => void;
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
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
            onClick={() => onShare(row)}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path
                d="M7 12a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm13-6a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm0 12a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM6.6 10.6l7.8-3.2M6.6 13.4l7.8 3.2"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            Share
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={!row.filePath}
            onClick={() => onDownload(row)}
            type="button"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path
                d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            Download
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

function ImagePreviewDialog({
  file,
  onClose,
  onDownload,
}: {
  file: DriveFileRow | null;
  onClose: () => void;
  onDownload: (row: DriveFileRow) => void;
}) {
  return (
    <Dialog open={Boolean(file)} onClose={onClose} size="lg" title={file?.name ?? "Preview"} contentClassName="max-w-3xl rounded-md">
      {file && (
        <div className="space-y-4">
          <div className="flex max-h-[62vh] items-center justify-center overflow-auto rounded-md bg-slate-950 p-3">
            <img alt={file.name} className="max-h-[58vh] max-w-full object-contain" src={file.filePath} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              icon={
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              }
              onClick={() => onDownload(file)}
            >
              Download
            </Button>
          </div>
        </div>
      )}
    </Dialog>
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
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [selectedRecipientDetail, setSelectedRecipientDetail] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState({
    email: true,
    sms: false,
    whatsapp: false,
    appNotification: false,
  });

  const handleClose = () => {
    setRecipient("");
    setSelectedRecipientId("");
    setSelectedRecipientDetail("");
    setMessage("");
    setChannels({ email: true, sms: false, whatsapp: false, appNotification: false });
    onClose();
  };
  const recipientSearch = useSearchDriveShareRecipients();

  const handleRecipientSearch = () => {
    if (!recipient.trim()) return;
    recipientSearch.mutate(recipient.trim());
  };

  useEffect(() => {
    if (recipientSearch.data?.length !== 1 || selectedRecipientId) return;

    const firstRecipient = recipientSearch.data[0];
    setRecipient(firstRecipient.label);
    setSelectedRecipientId(firstRecipient.id);
    setSelectedRecipientDetail(firstRecipient.detail ?? "");
  }, [recipientSearch.data, selectedRecipientId]);

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
        <div>
          <div className="flex h-9 overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
            <Input
              className="h-9 rounded-none border-0 bg-transparent py-0 shadow-none focus:border-0 focus:ring-0"
              containerClassName="flex-1"
              placeholder="Search people by id/name/email/phone number"
              value={recipient}
              onChange={(event) => {
                setRecipient(event.target.value);
                setSelectedRecipientId("");
                setSelectedRecipientDetail("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleRecipientSearch();
                }
              }}
            />
            <Button
              aria-label="Search people"
              className="h-9 w-11 shrink-0 rounded-none border-0 border-l border-slate-300 bg-blue-900 px-0 text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={recipientSearch.isPending}
              icon={
                recipientSearch.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M10.5 18a7.5 7.5 0 1 1 5.3-12.8A7.5 7.5 0 0 1 10.5 18Zm5.3-2.2L21 21"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                )
              }
              iconOnly
              onClick={handleRecipientSearch}
              type="button"
            />
          </div>
          {recipientSearch.isError && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Recipient search failed.
            </div>
          )}
          {recipientSearch.data && recipientSearch.data.length > 0 && (
            <div className="mt-2 max-h-44 overflow-auto rounded-md border border-slate-200 bg-white">
              {recipientSearch.data.map((item) => (
                <button
                  className={
                    selectedRecipientId === item.id
                      ? "block w-full bg-indigo-50 px-3 py-2 text-left"
                      : "block w-full px-3 py-2 text-left hover:bg-slate-50"
                  }
                  key={item.id}
                  onClick={() => {
                    setRecipient(item.label);
                    setSelectedRecipientId(item.id);
                    setSelectedRecipientDetail(item.detail ?? "");
                  }}
                  type="button"
                >
                  <div className="text-sm font-medium text-slate-900">{item.label}</div>
                  {item.detail && <div className="text-xs text-slate-500">{item.detail}</div>}
                </button>
              ))}
            </div>
          )}
          {selectedRecipientId && (
            <div className="mt-3 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase text-indigo-700">Selected</div>
              <div className="mt-1 text-sm font-medium text-slate-950">{recipient}</div>
              {selectedRecipientDetail && <div className="text-xs text-slate-600">{selectedRecipientDetail}</div>}
            </div>
          )}
          {recipientSearch.data && recipientSearch.data.length === 0 && (
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No matching people found.
            </div>
          )}
          {recipient.trim() && !selectedRecipientId && (
            <div className="mt-2 text-xs text-slate-500">
              Search and select a person before sending.
            </div>
          )}
        </div>
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
            onClick={() => onSubmit({ recipient: selectedRecipientId, message, channels })}
            disabled={!selectedRecipientId || !Object.values(channels).some(Boolean)}
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
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<DriveFileRow | null>(null);
  const [previewFile, setPreviewFile] = useState<DriveFileRow | null>(null);
  const [shareError, setShareError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const files = useDriveFiles({ "folderName-eq": folderName });
  const upload = useUploadDriveFiles();
  const remove = useDeleteDriveFile();
  const share = useShareDriveFile();

  const visibleFiles = useMemo(() => {
    const rows = files.data ?? [];
    const folderRows = folderId ? rows.filter((row) => row.folderId === folderId) : rows;
    const query = searchText.trim().toLowerCase();

    if (!query) return folderRows;

    return folderRows.filter((row) =>
      [row.name, row.owner, row.category, row.context, row.fileType, row.size]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [files.data, folderId, searchText]);

  const totalPages = Math.max(1, Math.ceil(visibleFiles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedFiles = visibleFiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const start = visibleFiles.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, visibleFiles.length);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
      setToast({ type: "success", message: "File shared successfully." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Share failed";
      setShareError(message);
      setToast({ type: "error", message });
    }
  };

  const handleOpenFile = (row: DriveFileRow) => {
    if (!row.filePath) {
      setToast({ type: "error", message: "File preview is not available." });
      return;
    }

    if (isImageFile(row)) {
      setPreviewFile(row);
      return;
    }

    openDriveFile(row.filePath);
  };

  const handleDownload = async (row: DriveFileRow) => {
    if (!row.filePath || typeof document === "undefined") {
      setToast({ type: "error", message: "Download is not available." });
      return;
    }

    if (isIOSDevice()) {
      openDriveFile(row.filePath);
      setActiveMenuId(null);
      return;
    }

    try {
      const response = await fetch(row.filePath);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = row.name || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      openDriveFile(row.filePath);
    }

    setActiveMenuId(null);
  };

  return (
    <DrivePageShell
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative w-72 max-w-full">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 5.3-12.8A7.5 7.5 0 0 1 10.5 18Zm5.3-2.2L21 21"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <input
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              onChange={(event) => {
                setSearchText(event.target.value);
                setPage(1);
              }}
              placeholder={showOwner ? "Search file, owner, context" : "Search files"}
              type="search"
              value={searchText}
            />
            {searchText && (
              <button
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => {
                  setSearchText("");
                  setPage(1);
                }}
                type="button"
              >
                x
              </button>
            )}
          </div>
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
          <Button
            variant="outline"
            aria-label="Filter"
            icon={
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
            }
          >
            Filter
          </Button>
        </div>
      }
      title={title}
      subtitle={subtitle}
      onBack={() => navigate(backTo ?? basePath)}
    >
      {toast && (
        <div className="fixed right-5 top-20 z-[9999]">
          <div
            className={
              toast.type === "success"
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg"
                : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow-lg"
            }
            role="status"
          >
            {toast.message}
          </div>
        </div>
      )}
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
            title={searchText ? "No matching files" : "No files found"}
            description={searchText ? "Try another file name, owner, type, or context." : "Files from this drive folder will appear here."}
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
                        <button
                          className="inline-flex max-w-[260px] items-center gap-2 text-left text-slate-950 hover:text-indigo-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline"
                          disabled={!row.filePath}
                          onClick={() => handleOpenFile(row)}
                          title={row.filePath ? `Open ${row.name}` : "File preview is not available"}
                          type="button"
                        >
                          <FileThumbnail row={row} />
                          <span className="truncate">{truncateName(row.name)}</span>
                        </button>
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
                          onDownload={handleDownload}
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
      <ImagePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} onDownload={handleDownload} />
    </DrivePageShell>
  );
}
