import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { HTMLAttributes, MouseEvent, ReactElement, ReactNode } from "react";
import { cn } from "../../utils";

type PopoverTriggerElement = ReactElement<{
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}>;

export interface PopoverProps {
  trigger: PopoverTriggerElement;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: "top" | "bottom";
  align?: "start" | "center" | "end";
  contentClassName?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function Popover({
  trigger,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  placement = "bottom",
  align = "start",
  contentClassName,
  disabled,
  "data-testid": testId = "popover",
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const popoverRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  function setOpenState(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setOpenState(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenState(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!isValidElement(trigger)) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      data-testid={testId}
      className="relative inline-flex"
    >
      {cloneElement(trigger, {
        "aria-expanded": isOpen,
        "aria-controls": contentId,
        onClick: (event: MouseEvent<HTMLElement>) => {
          trigger.props.onClick?.(event);
          if (!disabled) {
            setOpenState(!isOpen);
          }
        },
      })}

      {isOpen && !disabled && (
        <div
          id={contentId}
          role="dialog"
          data-testid={`${testId}-content`}
          className={cn(
            "absolute z-[150] min-w-[220px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg",
            placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "end" && "right-0",
            contentClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export interface PopoverSectionProps extends HTMLAttributes<HTMLDivElement> {}

export function PopoverSection({ className, ...props }: PopoverSectionProps) {
  return <div className={cn("space-y-2", className)} {...props} />;
}
