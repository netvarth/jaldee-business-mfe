import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "../../utils";
import { Badge } from "../Badge/Badge";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  options: ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  "data-testid"?: string;
}

export function Combobox({
  label,
  hint,
  error,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No matches found",
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  id,
  "data-testid": testId = "combobox",
}: ComboboxProps) {
  const comboId = id ?? label?.toLowerCase().replace(/\s+/g, "-") ?? "combobox";
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedValue = isControlled ? value ?? "" : internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);

  const filteredOptions = useMemo(
    () => options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
      return haystack.includes(searchQuery.toLowerCase());
    }),
    [options, searchQuery]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
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
    if (open) {
      setHighlightedIndex(0);
    }
  }, [open, searchQuery]);

  function commitSelection(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
    setSearchQuery("");
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!filteredOptions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const nextOption = filteredOptions[highlightedIndex];
      if (nextOption && !nextOption.disabled) {
        commitSelection(nextOption.value);
      }
    }
  }

  return (
    <div ref={wrapperRef} className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={comboId} className="text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          data-testid={testId}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-sm",
            "text-left text-gray-800 transition-colors duration-100",
            "focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500",
            "disabled:cursor-not-allowed disabled:bg-gray-50",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500"
          )}
          onClick={() => {
            if (disabled) {
              return;
            }

            setOpen((current) => !current);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={`${comboId}-listbox`}
        >
          <span className={selectedOption ? "text-gray-800" : "text-gray-400"}>
            {selectedOption?.label ?? placeholder}
          </span>
          <span className="text-xs text-gray-400">{open ? "^" : "v"}</span>
        </button>

        {open && !disabled && (
          <div
            id={`${comboId}-listbox`}
            role="listbox"
            data-testid={`${testId}-menu`}
            className="absolute z-[160] mt-2 w-full rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
          >
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="mb-2 h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />

            <div className="max-h-60 space-y-1 overflow-y-auto">
              {filteredOptions.length === 0 && (
                <div className="rounded-md px-3 py-2 text-sm text-gray-500">
                  {emptyMessage}
                </div>
              )}

              {filteredOptions.map((option, index) => {
                const isSelected = option.value === selectedValue;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    data-testid={`${testId}-option-${option.value}`}
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => !option.disabled && commitSelection(option.value)}
                    className={cn(
                      "flex w-full items-start justify-between rounded-lg px-3 py-2 text-left transition-colors",
                      isHighlighted ? "bg-indigo-50" : "bg-white hover:bg-gray-50",
                      option.disabled && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-800">{option.label}</span>
                      {option.description && (
                        <span className="block text-xs text-gray-500">{option.description}</span>
                      )}
                    </span>
                    {isSelected && <Badge variant="info">Selected</Badge>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
