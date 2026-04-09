import { useState } from "react";
import { Alert, Button, ConfirmDialog, EmptyState, FileUpload, SectionCard } from "@jaldee/design-system";
import { Avatar } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { markFileUploadComplete, requestFileUploadUrls } from "../services/customers";
import { useRemoveCustomerPhoto, useUploadCustomerPhoto } from "../queries/customers";
import type { Customer, CustomerAttachment } from "../types";

interface CustomerProfilePhotoCardProps {
  customer: Customer;
  customerLabel: string;
}

export function CustomerProfilePhotoCard({ customer, customerLabel }: CustomerProfilePhotoCardProps) {
  const { account, api } = useSharedModulesContext();
  const uploadPhoto = useUploadCustomerPhoto(customer.id);
  const deletePhoto = useRemoveCustomerPhoto(customer.id);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const existingPhoto = customer.consumerPhoto?.[0];
  const displayName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customerLabel;

  async function handleUpload() {
    if (!pendingFiles.length) {
      return;
    }

    setUploadError(null);

    try {
      const attachments = await uploadCustomerPhotoAttachments(account.id, pendingFiles, api);
      await uploadPhoto.mutateAsync(attachments);
      setPendingFiles([]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to upload profile photo right now.");
    }
  }

  return (
    <>
      <SectionCard title="Profile Photo">
        <div className="space-y-4" data-testid="customer-profile-photo-card">
          {(uploadPhoto.error || deletePhoto.error || uploadError) && (
            <Alert variant="danger">
              {uploadError || "Unable to update profile photo right now."}
            </Alert>
          )}

          <div className="flex items-center gap-4">
            {existingPhoto?.s3path || existingPhoto?.url ? (
              <img
                data-testid="customer-profile-photo-image"
                src={existingPhoto.s3path || existingPhoto.url}
                alt={displayName}
                className="h-20 w-20 rounded-full border border-[var(--color-border)] object-cover"
              />
            ) : (
              <div data-testid="customer-profile-photo-avatar">
                <Avatar name={displayName} size="lg" />
              </div>
            )}
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">{displayName}</div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                Upload a single image to use as the {customerLabel.toLowerCase()} profile photo.
              </div>
            </div>
          </div>

          <FileUpload
            label="Upload Photo"
            accept=".png,.jpg,.jpeg,.webp"
            maxSize={10 * 1024 * 1024}
            onUpload={(files) => {
              setPendingFiles(files.slice(0, 1));
              setUploadError(null);
            }}
          />

          {pendingFiles.length > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Ready to upload: {pendingFiles[0].name}
              </span>
              <Button
                data-testid="customer-profile-photo-upload"
                size="sm"
                onClick={handleUpload}
                loading={uploadPhoto.isPending}
              >
                Save Photo
              </Button>
            </div>
          ) : null}

          {existingPhoto ? (
            <div className="flex justify-end">
              <Button
                data-testid="customer-profile-photo-delete"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                Remove Photo
              </Button>
            </div>
          ) : (
            <EmptyState
              title="No profile photo"
              description={`This ${customerLabel.toLowerCase()} does not have a profile photo yet.`}
            />
          )}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!existingPhoto) {
            return;
          }

          await deletePhoto.mutateAsync([{ ...existingPhoto, action: "remove" }]);
          setConfirmDelete(false);
        }}
        title="Remove profile photo"
        description="This profile photo will be removed from the customer record."
        confirmLabel="Remove"
        confirmVariant="danger"
        loading={deletePhoto.isPending}
      />
    </>
  );
}

async function uploadCustomerPhotoAttachments(ownerId: string, files: File[], api: ReturnType<typeof useSharedModulesContext>["api"]) {
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
      throw new Error("Unable to upload profile photo right now.");
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
