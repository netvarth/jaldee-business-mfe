import React, { useState } from "react";
import { StickyNote } from "lucide-react";
import { useCreateCustomerNote, useCustomerNotes } from "@jaldee/shared-modules";

import { formatDate, initialsOf } from "../theme";
import { EmptyBlock, LoadErrorBlock, SkeletonBar, card, primaryBtn } from "../parts";

/**
 * Customer notes, shared with every other product's view of the same customer — they are
 * CRM data, not commerce data, so this uses the same hooks the shared customers module
 * does rather than keeping a Karty-only copy.
 */
export function NotesTab({ uid }: { uid: string }) {
  const notesQ = useCustomerNotes(uid);
  const createNote = useCreateCustomerNote(uid);
  const [draft, setDraft] = useState("");

  const notes = notesQ.data ?? [];

  async function save() {
    const note = draft.trim();
    if (!note) return;
    await createNote.mutateAsync({ note });
    setDraft("");
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: 14,
          border: "1px solid var(--kt-border2)",
          borderRadius: 12,
          background: "var(--kt-surface)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "var(--kt-accentWeak)",
            color: "var(--kt-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          You
        </div>
        <div style={{ flex: 1 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note about this customer…"
            style={{
              width: "100%",
              minHeight: 58,
              padding: "9px 12px",
              fontSize: 13,
              fontFamily: "var(--kt-fsans)",
              border: "1px solid var(--kt-border2)",
              borderRadius: 9,
              resize: "vertical",
              background: "var(--kt-surface2)",
              color: "var(--kt-text)",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 9 }}>
            <button
              type="button"
              onClick={save}
              disabled={!draft.trim() || createNote.isPending}
              style={{
                ...primaryBtn,
                padding: "8px 16px",
                fontSize: 12.5,
                opacity: !draft.trim() || createNote.isPending ? 0.55 : 1,
                cursor: !draft.trim() || createNote.isPending ? "not-allowed" : "pointer",
              }}
            >
              {createNote.isPending ? "Saving…" : "Save note"}
            </button>
          </div>
          {createNote.isError ? (
            <div style={{ fontSize: 12, color: "var(--kt-bad)", marginTop: 8 }}>
              Couldn't save the note.
            </div>
          ) : null}
        </div>
      </div>

      {notesQ.isLoading ? (
        <div style={{ ...card, padding: 16 }}>
          <SkeletonBar w="70%" />
        </div>
      ) : notesQ.isError ? (
        <LoadErrorBlock
          what="notes"
          detail={(notesQ.error as { message?: string })?.message}
          onRetry={() => notesQ.refetch()}
        />
      ) : notes.length === 0 ? (
        <EmptyBlock
          icon={<StickyNote size={26} />}
          title="No notes yet"
          body="Notes are how the counter staff pass context to each other — preferences, complaints, promises made."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notes.map((n) => (
            <div key={n.id} style={{ ...card, display: "flex", gap: 12, padding: 14, borderRadius: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "var(--kt-surface3)",
                  color: "var(--kt-text2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {initialsOf(n.note)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: "var(--kt-text3)" }}>
                  {formatDate(n.createdAt ?? n.updatedAt)}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--kt-text2)",
                    marginTop: 6,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {n.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
