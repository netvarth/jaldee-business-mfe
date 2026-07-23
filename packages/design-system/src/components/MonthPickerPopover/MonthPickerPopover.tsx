import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "../Button/Button";
import { cn } from "../../utils";

export interface MonthPickerPopoverProps {
  selectedDate?: Date | null;
  anchorRect?: DOMRect | null;
  anchorRef?: React.RefObject<HTMLElement> | null;
  onSelectMonth?: (date: Date) => void;
  onClose?: () => void;
  onClear?: () => void;
  title?: string;
  width?: number;
  align?: "start" | "end";
  className?: string;
  overlayClassName?: string;
}

const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function MonthPickerPopover({
  selectedDate,
  anchorRect,
  anchorRef,
  onSelectMonth,
  onClose,
  onClear,
  title = "Select month",
  width = 310,
  align = "end",
  className,
  overlayClassName,
}: MonthPickerPopoverProps) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(() =>
    selectedDate ? selectedDate.getFullYear() : today.getFullYear()
  );
  const [coords, setCoords] = useState<{ top?: number; left?: number; width?: number }>({});

  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
    }
  }, [selectedDate]);

  const { innerWidth, innerHeight } = typeof window !== "undefined" ? window : { innerWidth: 1024, innerHeight: 768 };
  const estimatedHeight = 230;

  useEffect(() => {
    const updatePosition = () => {
      const rect = anchorRef?.current?.getBoundingClientRect() || anchorRect;
      if (!rect) return;

      const spaceBelow = innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const shouldOpenAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

      const preferredTop = shouldOpenAbove
        ? Math.max(8, rect.top - estimatedHeight - 6)
        : rect.bottom + 6;
      const computedTop = Math.min(
        Math.max(8, preferredTop),
        Math.max(8, innerHeight - estimatedHeight - 8)
      );

      const anchorLeft = align === "end" ? rect.right - width : rect.left;
      const computedLeft = Math.min(Math.max(8, anchorLeft), innerWidth - width - 16);

      setCoords({
        top: computedTop,
        left: computedLeft,
        width: Math.min(width, innerWidth - 16),
      });
    };

    updatePosition();

    window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", updatePosition, { capture: true });
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorRect, anchorRef, width, align, innerWidth, innerHeight]);

  const popoverStyle: CSSProperties = {
    position: "fixed",
    top: coords.top,
    left: coords.left,
    width: coords.width ? `${coords.width}px` : `min(${width}px, 92vw)`,
  };

  const handleSelectMonth = (monthIndex: number) => {
    const nextDate = new Date(viewYear, monthIndex, 1);
    onSelectMonth?.(nextDate);
    onClose?.();
  };

  const handleThisMonth = () => {
    const now = new Date();
    onSelectMonth?.(new Date(now.getFullYear(), now.getMonth(), 1));
    onClose?.();
  };

  const content = (
    <div
      data-testid="month-picker-popover"
      className={cn("fixed inset-0 z-[9999] pointer-events-auto", overlayClassName)}
      onClick={onClose}
    >
      <div
        className={cn(
          "box-border flex h-auto flex-col gap-2.5 rounded-[16px] border border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)]",
          className
        )}
        style={popoverStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
            {title}
          </p>
        </div>

        {/* Year Selector Row */}
        <div className="flex items-center justify-between bg-[var(--color-primary-subtle)] rounded-lg p-1 border border-[var(--color-primary-muted)]">
          <Button
            type="button"
            variant="ghost"
            className="h-7 w-7 rounded-md p-0 font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
            onClick={() => setViewYear((y) => y - 1)}
            aria-label="Previous year"
          >
            ‹
          </Button>
          <strong className="text-sm font-bold text-[var(--color-text-primary)]">
            {viewYear}
          </strong>
          <Button
            type="button"
            variant="ghost"
            className="h-7 w-7 rounded-md p-0 font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
            onClick={() => setViewYear((y) => y + 1)}
            aria-label="Next year"
          >
            ›
          </Button>
        </div>

        {/* Months Grid (4 columns) */}
        <div className="grid grid-cols-4 gap-2 py-1">
          {MONTH_LABELS_SHORT.map((m, index) => {
            const isSelected =
              selectedDate &&
              selectedDate.getFullYear() === viewYear &&
              selectedDate.getMonth() === index;
            const isCurrentMonth =
              today.getFullYear() === viewYear && today.getMonth() === index;

            return (
              <Button
                key={m}
                type="button"
                variant="ghost"
                className={cn(
                  "flex h-9 items-center justify-center rounded-[8px] border-0 bg-transparent p-0 text-[0.82rem] font-medium text-[var(--color-text-primary)]",
                  "transition-colors duration-200 hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]",
                  isSelected &&
                    "bg-[var(--color-primary)] text-white shadow-[0_8px_16px_var(--color-primary-subtle)] hover:bg-[var(--color-primary)] hover:text-white",
                  isCurrentMonth &&
                    !isSelected &&
                    "border border-[var(--color-primary-muted)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                )}
                onClick={() => handleSelectMonth(index)}
              >
                {m}
              </Button>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 text-xs font-bold text-red-500 hover:bg-transparent hover:text-red-700"
            onClick={() => {
              onClear?.();
              onClose?.();
            }}
          >
            Clear
          </Button>
          <Button
            data-testid="month-picker-this-month"
            type="button"
            variant="ghost"
            className="h-auto p-0 text-xs font-bold text-[var(--color-primary)] hover:bg-transparent hover:text-[var(--color-primary-hover)]"
            onClick={handleThisMonth}
          >
            This month
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}
