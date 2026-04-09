import {
  Root,
  Portal,
  Overlay,
  Content,
  Title,
  Description,
  Close,
} from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "../../utils";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md" | "lg" | "fullscreen";
  children: ReactNode;
  hideHeader?: boolean;
  showCloseButton?: boolean;
  overlayClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  closeButtonClassName?: string;
  closeLabel?: string;
  closeIcon?: ReactNode;
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  fullscreen: "max-w-full h-full",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  hideHeader = false,
  showCloseButton = true,
  overlayClassName,
  contentClassName,
  headerClassName,
  bodyClassName,
  closeButtonClassName,
  closeLabel = "Close dialog",
  closeIcon = "×",
}: DialogProps) {
  const shouldRenderHeader = !hideHeader && (title || description || showCloseButton);

  return (
    <Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Portal>
        <Overlay
          data-testid="dialog-overlay"
          className={cn("fixed inset-0 bg-black/40 z-[200] animate-in fade-in-0", overlayClassName)}
        />
        <Content
          data-testid="dialog"
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "bg-white rounded-xl shadow-xl z-[201] w-full p-6",
            "animate-in fade-in-0 zoom-in-95",
            sizeMap[size],
            contentClassName
          )}
        >
          {shouldRenderHeader && (
            <div className={cn("mb-4 flex items-start justify-between", headerClassName)}>
              <div>
                {title && (
                  <Title data-testid="dialog-title" className="m-0 text-[length:var(--text-lg)] font-bold text-gray-900">
                    {title}
                  </Title>
                )}
                {description && (
                  <Description
                    data-testid="dialog-description"
                    className="m-0 mt-1 text-[length:var(--text-sm)] text-gray-500"
                  >
                    {description}
                  </Description>
                )}
              </div>
              {showCloseButton && (
                <Close
                  data-testid="dialog-close"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className={cn(
                    "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[length:var(--text-lg)] text-gray-400 transition-colors hover:bg-gray-100",
                    closeButtonClassName
                  )}
                >
                  {closeIcon}
                </Close>
              )}
            </div>
          )}
          <div data-testid="dialog-content" className={bodyClassName}>
            {children}
          </div>
        </Content>
      </Portal>
    </Root>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="dialog-footer"
      className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4"
    >
      {children}
    </div>
  );
}
