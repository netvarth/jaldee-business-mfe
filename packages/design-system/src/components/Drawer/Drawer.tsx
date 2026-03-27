import type { ReactNode } from "react";
import { cn } from "../../utils";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  hideHeader?: boolean;
  showCloseButton?: boolean;
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  closeButtonClassName?: string;
  closeLabel?: string;
  closeIcon?: ReactNode;
}

const sizeMap = {
  sm: "w-96",
  md: "w-[600px]",
  lg: "w-[800px]",
};

export function Drawer({
  open,
  onClose,
  title,
  size = "md",
  children,
  hideHeader = false,
  showCloseButton = true,
  overlayClassName,
  panelClassName,
  headerClassName,
  contentClassName,
  closeButtonClassName,
  closeLabel = "Close drawer",
  closeIcon = "×",
}: DrawerProps) {
  if (!open) return null;

  return (
    <>
      <div
        data-testid="drawer-overlay"
        className={cn("fixed inset-0 z-[200] bg-black/40", overlayClassName)}
        onClick={onClose}
      />

      <div
        data-testid="drawer"
        data-state="open"
        className={cn(
          "fixed right-0 top-0 z-[201] flex h-full max-w-full flex-col bg-white shadow-xl",
          sizeMap[size],
          panelClassName
        )}
      >
        {!hideHeader && (title || showCloseButton) && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4",
              headerClassName
            )}
          >
            {title ? <h2 className="m-0 text-base font-semibold text-gray-900">{title}</h2> : <span />}
            {showCloseButton && (
              <button
                data-testid="drawer-close"
                onClick={onClose}
                aria-label={closeLabel}
                className={cn(
                  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-lg text-gray-400 transition-colors hover:bg-gray-100",
                  closeButtonClassName
                )}
              >
                {closeIcon}
              </button>
            )}
          </div>
        )}

        <div data-testid="drawer-content" className={cn("flex-1 overflow-y-auto p-5", contentClassName)}>
          {children}
        </div>
      </div>
    </>
  );
}
