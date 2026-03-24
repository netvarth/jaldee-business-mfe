import type { ReactNode } from "react";
import { cn }             from "../../utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title:        string;
  actions?:     ReactNode;
  loading?:     boolean;
  back?:        { label: string; href: string };
  breadcrumbs?: BreadcrumbItem[];
  hidden?:      boolean;
  className?:   string;
  onNavigate?:  (href: string) => void;
}

export function PageHeader({
  title,
  actions,
  loading,
  back,
  breadcrumbs,
  hidden,
  className,
  onNavigate,
}: PageHeaderProps) {
  if (hidden) return null;

  return (
    <div
      data-testid="page-header"
      className={cn(
        "flex items-center justify-between mb-6",
        className
      )}
    >
      <div className="flex flex-col gap-1">

        {back && (
          <button
            data-testid="page-header-back"
            onClick={() => onNavigate?.(back.href)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors w-fit mb-1 cursor-pointer bg-transparent border-0 p-0"
          >
            ← {back.label}
          </button>
        )}

        {breadcrumbs && !back && (
          <nav
            data-testid="page-header-breadcrumbs"
            className="flex items-center gap-1 text-xs text-gray-500 mb-1"
          >
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                {crumb.href ? (
                  <button
                    onClick={() => onNavigate?.(crumb.href!)}
                    className="hover:text-indigo-600 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-gray-800 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {loading ? (
          <div
            data-testid="page-header-title-skeleton"
            className="h-7 w-48 rounded bg-gray-100 animate-pulse"
          />
        ) : (
          <h1
            data-testid="page-header-title"
            className="m-0 text-2xl font-bold text-gray-900"
          >
            {title}
          </h1>
        )}
      </div>

      {actions && (
        <div
          data-testid="page-header-actions"
          className="flex items-center gap-3"
        >
          {actions}
        </div>
      )}
    </div>
  );
}