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
import { cn }             from "../../utils";

export interface DialogProps {
  open:         boolean;
  onClose:      () => void;
  title:        string;
  description?: string;
  size?:        "sm" | "md" | "lg" | "fullscreen";
  children:     ReactNode;
}

const sizeMap = {
  sm:         "max-w-sm",
  md:         "max-w-md",
  lg:         "max-w-2xl",
  fullscreen: "max-w-full h-full",
};

export function Dialog({ open, onClose, title, description, size = "md", children }: DialogProps) {
  return (
    <Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Portal>
        <Overlay
          data-testid="dialog-overlay"
          className="fixed inset-0 bg-black/40 z-[200] animate-in fade-in-0"
        />
        <Content
          data-testid="dialog"
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "bg-white rounded-xl shadow-xl z-[201] w-full p-6",
            "animate-in fade-in-0 zoom-in-95",
            sizeMap[size]
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <Title
                data-testid="dialog-title"
                className="text-lg font-bold text-gray-900 m-0"
              >
                {title}
              </Title>
              {description && (
                <Description
                  data-testid="dialog-description"
                  className="text-sm text-gray-500 mt-1 m-0"
                >
                  {description}
                </Description>
              )}
            </div>
            <Close
              data-testid="dialog-close"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent text-lg"
            >
              ✕
            </Close>
          </div>
          <div data-testid="dialog-content">{children}</div>
        </Content>
      </Portal>
    </Root>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="dialog-footer"
      className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200"
    >
      {children}
    </div>
  );
}