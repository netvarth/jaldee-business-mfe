import type { ReactNode } from "react";
import { cn }             from "../../utils";

export interface DrawerProps {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  size?:    "sm" | "md" | "lg";
  children: ReactNode;
}

const sizeMap = {
  sm: "w-96",
  md: "w-[600px]",
  lg: "w-[800px]",
};

export function Drawer({ open, onClose, title, size = "md", children }: DrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        data-testid="drawer-overlay"
        className="fixed inset-0 bg-black/40 z-[200]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        data-testid="drawer"
        data-state="open"
        className={cn(
          "fixed top-0 right-0 h-full bg-white shadow-xl z-[201]",
          "flex flex-col",
          sizeMap[size],
          "max-w-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 m-0">{title}</h2>
          <button
            data-testid="drawer-close"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          data-testid="drawer-content"
          className="flex-1 overflow-y-auto p-5"
        >
          {children}
        </div>
      </div>
    </>
  );
}