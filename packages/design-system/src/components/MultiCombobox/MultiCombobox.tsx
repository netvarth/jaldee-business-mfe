import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils";

export interface MultiComboboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface MultiComboboxProps {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  options: MultiComboboxOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  disabled?: boolean;
  id?: string;
  "data-testid"?: string;
  maxDisplay?: number;
}

export function MultiCombobox({
  label,
  hint,
  error,
  placeholder = "Select options",
  searchPlaceholder = "Search...",
  emptyMessage = "No matches found",
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  id,
  "data-testid": testId = "multi-combobox",
  maxDisplay = 2,
}: MultiComboboxProps) {
  const comboId = id ?? label?.toLowerCase().replace(/\s+/g, "-") ?? "multi-combobox";
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedValues = isControlled ? value ?? [] : internalValue;

  const filteredOptions = useMemo(
    () =>
      options.filter((option) => {
        const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
      }),
    [options, searchQuery]
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearchQuery("");
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) setHighlightedIndex(0);
  }, [open, searchQuery]);

  function toggleOption(optionValue: string) {
    const isPresent = selectedValues.some((v) => v.toLowerCase() === optionValue.toLowerCase());
    const next = isPresent
      ? selectedValues.filter((v) => v.toLowerCase() !== optionValue.toLowerCase())
      : [...selectedValues, optionValue];

    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  }

  function clearAll() {
    if (!isControlled) setInternalValue([]);
    onValueChange?.([]);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!filteredOptions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const opt = filteredOptions[highlightedIndex];
      if (opt && !opt.disabled) toggleOption(opt.value);
    }
  }

  // Trigger button label
  const triggerLabel = (() => {
    if (selectedValues.length === 0) return null;
    const labels = selectedValues
      .map((v) => {
        const found = options.find((o) => o.value.toLowerCase() === v.toLowerCase());
        return found ? found.label : v;
      })
      .filter(Boolean) as string[];
    if (labels.length <= maxDisplay) return labels.join(", ");
    return `${labels.slice(0, maxDisplay).join(", ")} +${labels.length - maxDisplay} more`;
  })();

  return (
    <div ref={wrapperRef} className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={comboId} className="ds-form-label">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Trigger */}
        <button
          id={comboId}
          type="button"
          data-testid={testId}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${comboId}-listbox`}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
            if (!open) window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-sm text-left transition-colors duration-100",
            "focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
            "disabled:cursor-not-allowed disabled:bg-gray-50",
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-200"
          )}
        >
          <span
            className={cn(
              "flex-1 truncate text-sm",
              triggerLabel ? "text-gray-800" : "text-gray-400"
            )}
          >
            {triggerLabel ?? placeholder}
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            {selectedValues.length > 0 && (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold leading-none text-white"
                aria-label={`${selectedValues.length} selected`}
              >
                {selectedValues.length}
              </span>
            )}
            {/* Chevron */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
              className={cn("text-gray-400 transition-transform duration-150", open && "rotate-180")}
            >
              <path
                d="M3 5L7 9L11 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        {/* Dropdown */}
        {open && !disabled && (
          <div
            id={`${comboId}-listbox`}
            role="listbox"
            aria-multiselectable="true"
            data-testid={`${testId}-menu`}
            className="absolute z-[160] mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            {/* Search bar */}
            <div className="border-b border-gray-100 p-2">
              <div className="relative">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-56 overflow-y-auto p-1.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-400">{emptyMessage}</div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isChecked = selectedValues.some((v) => v.toLowerCase() === option.value.toLowerCase());
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isChecked}
                      disabled={option.disabled}
                      data-testid={`${testId}-option-${option.value}`}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => !option.disabled && toggleOption(option.value)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                        isHighlighted ? "bg-indigo-50" : "hover:bg-gray-50",
                        option.disabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      {/* Custom checkbox */}
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          isChecked
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-gray-300 bg-white"
                        )}
                        aria-hidden="true"
                      >
                        {isChecked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                            <path
                              d="M1 4L3.5 6.5L9 1"
                              stroke="white"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-800">
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="block truncate text-xs text-gray-500">
                            {option.description}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer: selected count + clear */}
            {selectedValues.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                <span className="text-xs text-gray-500">
                  {selectedValues.length} selected
                </span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
