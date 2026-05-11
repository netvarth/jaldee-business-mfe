import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { HTMLAttributes, MouseEvent, ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
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
  portal?: boolean;
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
  portal = false,
  "data-testid": testId = "popover",
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const popoverRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [portalPosition, setPortalPosition] = useState({ top: 0, left: 0 });
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
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !contentRef.current?.contains(target)) {
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

  useEffect(() => {
    if (!isOpen || !portal) {
      return;
    }

    function updatePortalPosition() {
      const rect = popoverRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPortalPosition({
        top: placement === "bottom" ? rect.bottom + 8 : rect.top - 8,
        left: align === "end" ? rect.right : align === "center" ? rect.left + rect.width / 2 : rect.left,
      });
    }

    updatePortalPosition();
    window.addEventListener("resize", updatePortalPosition);
    window.addEventListener("scroll", updatePortalPosition, true);

    return () => {
      window.removeEventListener("resize", updatePortalPosition);
      window.removeEventListener("scroll", updatePortalPosition, true);
    };
  }, [align, isOpen, placement, portal]);

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
        portal && typeof document !== "undefined"
          ? createPortal(
            <PopoverContent
              ref={contentRef}
              contentId={contentId}
              testId={testId}
              placement={placement}
              align={align}
              contentClassName={contentClassName}
              portalPosition={portalPosition}
              portal
            >
              {children}
            </PopoverContent>,
            document.body
          )
          : (
            <PopoverContent
              ref={contentRef}
              contentId={contentId}
              testId={testId}
              placement={placement}
              align={align}
              contentClassName={contentClassName}
            >
              {children}
            </PopoverContent>
          )
      )}
    </div>
  );
}

const PopoverContent = forwardRef<HTMLDivElement, {
  contentId: string;
  testId: string;
  placement: "top" | "bottom";
  align: "start" | "center" | "end";
  contentClassName?: string;
  portalPosition?: { top: number; left: number };
  portal?: boolean;
  children: ReactNode;
}>(function PopoverContent(
  {
    contentId,
    testId,
    placement,
    align,
    contentClassName,
    portalPosition,
    portal = false,
    children,
  },
  ref
) {
  return (
  <div
    ref={ref}
    id={contentId}
    role="dialog"
    data-testid={`${testId}-content`}
    style={portal ? { top: portalPosition?.top ?? 0, left: portalPosition?.left ?? 0 } : undefined}
    className={cn(
      portal ? "fixed z-[300]" : "absolute z-[150]",
      "min-w-[220px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg",
      !portal && (placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2"),
      !portal && align === "start" && "left-0",
      !portal && align === "center" && "left-1/2 -translate-x-1/2",
      !portal && align === "end" && "right-0",
      portal && placement === "top" && "-translate-y-full",
      portal && align === "center" && "-translate-x-1/2",
      portal && align === "end" && "-translate-x-full",
      contentClassName
    )}
  >
    {children}
  </div>
  );
});

export interface PopoverSectionProps extends HTMLAttributes<HTMLDivElement> {}

export function PopoverSection({ className, ...props }: PopoverSectionProps) {
  return <div className={cn("space-y-2", className)} {...props} />;
}
