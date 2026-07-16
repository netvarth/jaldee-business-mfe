import { useState } from "react";
import { Alert, Button, ConfirmDialog, EmptyState, SectionCard, Textarea } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { emitCustomerErrorToast, emitCustomerSuccessToast, getReadableCustomerApiError } from "../lib/errorEvents";
import { useCreateCustomerNote, useCustomerNotes, useDeleteCustomerNote, useUpdateCustomerNote } from "../queries/customers";
import type { CustomerNote } from "../types";

interface CustomerNotesCardProps {
  customerId: string;
  customerLabel: string;
}

export function CustomerNotesCard({ customerId, customerLabel }: CustomerNotesCardProps) {
  const { eventBus } = useSharedModulesContext();
  const notesQuery = useCustomerNotes(customerId);
  const createNote = useCreateCustomerNote(customerId);
  const updateNote = useUpdateCustomerNote(customerId);
  const deleteNote = useDeleteCustomerNote(customerId);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<CustomerNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerNote | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit() {
    const value = draft.trim();
    if (!value) {
      setFieldError("Note is required.");
      setFormError(`Enter a note for this ${customerLabel.toLowerCase()}.`);
      return;
    }

    try {
      if (editing) {
        await updateNote.mutateAsync({
          id: editing.id,
          customerId,
          note: value,
        });
      } else {
        await createNote.mutateAsync({
          note: value,
        });
      }

      emitCustomerSuccessToast(eventBus, editing ? "Customer note updated successfully." : "Customer note added successfully.");
      setDraft("");
      setEditing(null);
      setFormError(null);
      setFieldError(null);
    } catch (error) {
      const readable = getReadableCustomerApiError(
        error,
        editing ? "Unable to update the customer note right now." : "Unable to add the customer note right now."
      );
      setFormError(readable.message);
      setFieldError(/note/i.test(readable.message) ? readable.message : null);
      emitCustomerErrorToast(eventBus, error, readable.message);
    }
  }

  function handleEdit(note: CustomerNote) {
    setEditing(note);
    setDraft(note.note);
    setFormError(null);
    setFieldError(null);
  }

  function handleCancel() {
    setEditing(null);
    setDraft("");
    setFormError(null);
    setFieldError(null);
  }

  return (
    <>
      <SectionCard
        title={`${customerLabel} Notes`}
        actions={
          editing ? (
            <Button data-testid="customer-notes-cancel-edit" variant="ghost" size="sm" onClick={handleCancel}>
              Cancel edit
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4" data-testid="customer-notes-card">
          {formError ? <Alert variant="danger">{formError}</Alert> : null}

          <div className="space-y-3">
            <Textarea
              data-testid="customer-notes-input"
              label={editing ? "Edit note" : "Add note"}
              rows={4}
              value={draft}
              error={fieldError ?? undefined}
              onChange={(event) => {
                setDraft(event.target.value);
                if (fieldError) {
                  setFieldError(null);
                }
                if (formError) {
                  setFormError(null);
                }
              }}
              placeholder={`Write a note about this ${customerLabel.toLowerCase()}.`}
            />
            <div className="flex items-center justify-end gap-3">
              {editing && (
                <Button data-testid="customer-notes-cancel" variant="secondary" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button
                data-testid="customer-notes-submit"
                size="sm"
                onClick={handleSubmit}
                loading={createNote.isPending || updateNote.isPending}
                disabled={!draft.trim()}
              >
                {editing ? "Save Note" : "Add Note"}
              </Button>
            </div>
          </div>

          {notesQuery.isLoading ? (
            <div className="text-sm text-[var(--color-text-secondary)]">Loading notes...</div>
          ) : !notesQuery.data?.length ? (
            <EmptyState
              title="No notes yet"
              description={`Create the first note for this ${customerLabel.toLowerCase()}.`}
            />
          ) : (
            <div className="space-y-3">
              {notesQuery.data.map((note) => (
                <div
                  key={note.id}
                  data-testid={`customer-note-${note.id}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_22%,white)] p-4"
                >
                  <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-primary)]">
                    {note.note}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {note.updatedAt || note.createdAt || "Recently added"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button data-testid={`customer-note-edit-${note.id}`} variant="outline" size="sm" onClick={() => handleEdit(note)}>
                        Edit
                      </Button>
                      <Button data-testid={`customer-note-delete-${note.id}`} variant="outline" size="sm" onClick={() => setDeleteTarget(note)}>
                        Delete
                      </Button>
                    </div>
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
          if (!deleteTarget) {
            return;
          }

          try {
            await deleteNote.mutateAsync(deleteTarget.id);
            emitCustomerSuccessToast(eventBus, "Customer note deleted successfully.");
            if (editing?.id === deleteTarget.id) {
              handleCancel();
            }
            setDeleteTarget(null);
          } catch (error) {
            emitCustomerErrorToast(eventBus, error, "Unable to delete the customer note right now.");
          }
        }}
        title="Delete note"
        description="This note will be removed from the customer record."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteNote.isPending}
      />
    </>
  );
}
