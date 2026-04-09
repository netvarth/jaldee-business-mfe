import { useState } from "react";
import { Alert, Button, ConfirmDialog, EmptyState, FileUpload, Input, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useCreateCustomerMedicalHistory,
  useCustomerMedicalHistory,
  useDeleteCustomerMedicalHistory,
  useUpdateCustomerMedicalHistory,
} from "../queries/customers";
import { markFileUploadComplete, requestFileUploadUrls } from "../services/customers";
import type { CustomerAttachment, CustomerMedicalHistory } from "../types";

interface CustomerMedicalHistoryCardProps {
  customerId: string;
  customerLabel: string;
}

export function CustomerMedicalHistoryCard({ customerId, customerLabel }: CustomerMedicalHistoryCardProps) {
  const { account, api } = useSharedModulesContext();
  const historyQuery = useCustomerMedicalHistory(customerId);
  const createHistory = useCreateCustomerMedicalHistory(customerId);
  const updateHistory = useUpdateCustomerMedicalHistory(customerId);
  const deleteHistory = useDeleteCustomerMedicalHistory(customerId);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<CustomerMedicalHistory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerMedicalHistory | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleSubmit() {
    const value = title.trim();
    if (!value) {
      return;
    }

    setUploadError(null);

    let uploadedAttachments: CustomerAttachment[] = [];

    if (pendingFiles.length > 0) {
      try {
        uploadedAttachments = await uploadMedicalHistoryAttachments(account.id, pendingFiles, api);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Unable to upload attachments right now.");
        return;
      }
    }

    const mergedAttachments = [...(editing?.medicalHistoryAttachments ?? []), ...uploadedAttachments];

    if (editing) {
      await updateHistory.mutateAsync({
        id: editing.id,
        providerConsumerId: customerId,
        title: value,
        medicalHistoryAttachments: mergedAttachments,
      });
    } else {
      await createHistory.mutateAsync({
        title: value,
        medicalHistoryAttachments: uploadedAttachments,
      });
    }

    setTitle("");
    setEditing(null);
    setPendingFiles([]);
  }

  return (
    <>
      <SectionCard
        title="Medical History"
        actions={
          editing ? (
            <Button data-testid="customer-medical-history-cancel-edit" variant="ghost" size="sm" onClick={() => {
              setEditing(null);
              setTitle("");
            }}>
              Cancel edit
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4" data-testid="customer-medical-history-card">
          {(createHistory.error || updateHistory.error || deleteHistory.error || uploadError) && (
            <Alert variant="danger">
              {uploadError || "Unable to update medical history right now."}
            </Alert>
          )}

          <div className="space-y-3">
            <Input
              data-testid="customer-medical-history-input"
              label={editing ? "Edit medical history item" : "Add medical history item"}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={`Enter ${customerLabel.toLowerCase()} medical history`}
            />
            <div data-testid="customer-medical-history-upload">
              <FileUpload
                label="Attachments"
                accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.txt,.xls,.xlsx,.mp3,.mp4"
                multiple
                maxSize={10 * 1024 * 1024}
                onUpload={(files) => {
                  setPendingFiles(files);
                  setUploadError(null);
                }}
              />
            </div>
            {pendingFiles.length > 0 && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                {pendingFiles.length} attachment{pendingFiles.length === 1 ? "" : "s"} ready to upload.
              </p>
            )}
            {editing?.medicalHistoryAttachments?.length ? (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Existing attachments will be preserved when you save changes.
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-3">
              {editing && (
                <Button
                  data-testid="customer-medical-history-cancel"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setTitle("");
                    setPendingFiles([]);
                    setUploadError(null);
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                data-testid="customer-medical-history-submit"
                size="sm"
                onClick={handleSubmit}
                loading={createHistory.isPending || updateHistory.isPending}
                disabled={!title.trim()}
              >
                {editing ? "Save Item" : "Add Item"}
              </Button>
            </div>
          </div>

          {historyQuery.isLoading ? (
            <div className="text-sm text-[var(--color-text-secondary)]">Loading medical history...</div>
          ) : !historyQuery.data?.length ? (
            <EmptyState
              title="No medical history"
              description={`No medical history entries have been added for this ${customerLabel.toLowerCase()}.`}
            />
          ) : (
            <div className="space-y-3">
              {historyQuery.data.map((item) => (
                <div
                  key={item.id}
                  data-testid={`customer-medical-history-item-${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_22%,white)] p-4"
                >
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">{item.title}</div>
                  {item.medicalHistoryAttachments?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.medicalHistoryAttachments.map((attachment, index) => {
                        const href = resolveAttachmentUrl(attachment);
                        return href ? (
                          <a
                            key={`${attachment.driveId ?? attachment.fileName}-${index}`}
                            data-testid={`customer-medical-history-attachment-${item.id}-${index}`}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-link)] hover:bg-[var(--color-surface-alt)]"
                          >
                            {attachment.fileName}
                          </a>
                        ) : (
                          <span
                            key={`${attachment.driveId ?? attachment.fileName}-${index}`}
                            className="inline-flex rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]"
                          >
                            {attachment.fileName}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Button
                      data-testid={`customer-medical-history-edit-${item.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(item);
                        setTitle(item.title);
                        setPendingFiles([]);
                        setUploadError(null);
                      }}
                    >
                      Edit
                    </Button>
                    <Button data-testid={`customer-medical-history-delete-${item.id}`} variant="outline" size="sm" onClick={() => setDeleteTarget(item)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteHistory.mutateAsync(deleteTarget.id);
          if (editing?.id === deleteTarget.id) {
            setEditing(null);
            setTitle("");
          }
          setDeleteTarget(null);
        }}
        title="Delete medical history item"
        description="This entry will be removed from the medical history."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteHistory.isPending}
      />
    </>
  );
}

async function uploadMedicalHistoryAttachments(ownerId: string, files: File[], api: ReturnType<typeof useSharedModulesContext>["api"]) {
  const uploadRequests = files.map((file, index) => ({
    owner: ownerId,
    ownerType: "Provider" as const,
    fileName: file.name,
    fileSize: file.size / (1024 * 1024),
    caption: "",
    fileType: resolveFileType(file),
    action: "add" as const,
    order: index,
  }));

  const uploadTargets = await requestFileUploadUrls(api, uploadRequests);
  const uploadedAttachments: CustomerAttachment[] = [];

  for (const target of uploadTargets) {
    const file = files[target.orderId];
    if (!file) {
      continue;
    }

    const response = await fetch(target.url, {
      method: "PUT",
      body: file,
      headers: file.type ? { "Content-Type": file.type } : undefined,
    });

    if (!response.ok) {
      throw new Error("Unable to upload attachments right now.");
    }

    await markFileUploadComplete(api, target.driveId);

    uploadedAttachments.push({
      fileName: file.name,
      fileType: resolveFileType(file),
      caption: "",
      driveId: target.driveId,
      s3path: target.url.split("?")[0],
      url: target.url.split("?")[0],
      action: "add",
      order: target.orderId,
    });
  }

  return uploadedAttachments;
}

function resolveFileType(file: File) {
  if (file.type.includes("/")) {
    return file.type.split("/")[1];
  }

  const segments = file.name.split(".");
  return segments.length > 1 ? segments.pop() ?? "file" : "file";
}

function resolveAttachmentUrl(attachment: CustomerAttachment) {
  return attachment.url || attachment.s3path || null;
}
