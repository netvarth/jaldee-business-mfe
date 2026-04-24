import type { ReactNode } from "react";
import { Dialog, DialogFooter } from "../Dialog/Dialog";
import { Button }               from "../Button/Button";

export interface ConfirmDialogProps {
  open:            boolean;
  onClose:         () => void;
  onConfirm:       () => void;
  title:           ReactNode;
  description?:    string;
  confirmLabel?:   string;
  cancelLabel?:    string;
  confirmVariant?: "primary" | "danger";
  loading?:        boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm,
  title, description,
  confirmLabel   = "Confirm",
  cancelLabel    = "Cancel",
  confirmVariant = "primary",
  loading,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
    >
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={loading}
          data-testid="confirm-dialog-cancel"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          loading={loading}
          data-testid="confirm-dialog-confirm"
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
