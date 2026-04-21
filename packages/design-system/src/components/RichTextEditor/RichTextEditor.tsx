import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "../../utils";

export interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  id?: string;
  placeholder?: string;
  fullWidth?: boolean;
  minHeightClassName?: string;
}

type ToolbarAction = {
  label: ReactNode;
  command: string;
  value?: string;
  title: string;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: <span className="font-semibold">B</span>, command: "bold", title: "Bold" },
  { label: <span className="italic">I</span>, command: "italic", title: "Italic" },
  { label: <span className="underline">U</span>, command: "underline", title: "Underline" },
  { label: "Bullets", command: "insertUnorderedList", title: "Bullet list" },
  { label: "1. List", command: "insertOrderedList", title: "Numbered list" },
];

function normalizeHtml(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "<br>" || trimmed === "<div><br></div>" || trimmed === "<p><br></p>") {
    return "";
  }

  return trimmed;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  error,
  hint,
  id,
  placeholder = "Enter description",
  fullWidth = true,
  minHeightClassName = "min-h-[180px]",
}: RichTextEditorProps) {
  const generatedId = useId();
  const editorId = id ?? label?.toLowerCase().replace(/\s+/g, "-") ?? `rich-text-editor-${generatedId}`;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const normalizedValue = normalizeHtml(value);
    const currentValue = normalizeHtml(editor.innerHTML);

    if (currentValue !== normalizedValue) {
      editor.innerHTML = normalizedValue;
    }
  }, [value]);

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(normalizeHtml(editor.innerHTML));
  }

  function runCommand(command: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();

    if (key === "b") {
      event.preventDefault();
      runCommand("bold");
    }
    if (key === "i") {
      event.preventDefault();
      runCommand("italic");
    }
    if (key === "u") {
      event.preventDefault();
      runCommand("underline");
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
      {label ? (
        <label htmlFor={editorId} className="ds-form-label">
          {label}
        </label>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-control)] border bg-[color:color-mix(in_srgb,var(--color-surface)_92%,white)]",
          "border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
          isFocused && "border-[color:color-mix(in_srgb,var(--color-border-focus)_70%,white)] ring-2 ring-[color:color-mix(in_srgb,var(--color-border-focus)_14%,transparent)]",
          error && "border-[var(--color-danger)] ring-0"
        )}
      >
        <div className="flex flex-wrap gap-2 border-b border-[color:color-mix(in_srgb,var(--color-border)_78%,white)] bg-slate-50 px-3 py-2">
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.title}
              type="button"
              title={action.title}
              onClick={() => runCommand(action.command, action.value)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="relative">
          {!normalizeHtml(value) && !isFocused ? (
            <div className="pointer-events-none absolute left-0 top-0 px-3 py-2 text-sm text-[var(--color-text-secondary)]">
              {placeholder}
            </div>
          ) : null}
          <div
            ref={editorRef}
            id={editorId}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-invalid={!!error}
            className={cn(
              "w-full px-3 py-2 text-sm leading-6 text-[var(--color-text-primary)] focus:outline-none",
              minHeightClassName
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              emitChange();
            }}
            onInput={emitChange}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {hint && !error ? <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">{hint}</p> : null}
      {error ? <p role="alert" className="text-[length:var(--text-xs)] text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
