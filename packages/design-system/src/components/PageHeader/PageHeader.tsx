import type { ReactNode } from "react";
import { cn } from "../../utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface StepperItem {
  label: string;
  description?: string;
  state?: "complete" | "current" | "upcoming";
}

export interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
  loading?: boolean;
  back?: { label: string; href: string };
  breadcrumbs?: BreadcrumbItem[];
  stepper?: StepperItem[];
  hidden?: boolean;
  className?: string;
  onNavigate?: (href: string) => void;
}

export function PageHeader({
  title,
  actions,
  loading,
  back,
  breadcrumbs,
  stepper,
  hidden,
  className,
  onNavigate,
}: PageHeaderProps) {
  if (hidden) return null;

  return (
    <div data-testid="page-header" className={cn("mb-6", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          {back && (
            <button
              data-testid="page-header-back"
              onClick={() => onNavigate?.(back.href)}
              className="mb-1 flex w-fit items-center gap-1 border-0 bg-transparent p-0 text-xs text-gray-500 transition-colors hover:text-indigo-600"
            >
              ← {back.label}
            </button>
          )}

          {breadcrumbs && !back && (
            <nav
              data-testid="page-header-breadcrumbs"
              className="mb-1 flex items-center gap-1 text-xs text-gray-500"
            >
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span>/</span>}
                  {crumb.href ? (
                    <button
                      onClick={() => crumb.href && onNavigate?.(crumb.href)}
                      className="cursor-pointer border-0 bg-transparent p-0 transition-colors hover:text-indigo-600"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="font-medium text-gray-800">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          {loading ? (
            <div
              data-testid="page-header-title-skeleton"
              className="h-7 w-48 animate-pulse rounded bg-gray-100"
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

      {stepper && stepper.length > 0 && (
        <div
          data-testid="page-header-stepper"
          className="mt-5 flex flex-wrap items-start gap-3"
        >
          {stepper.map((step, index) => (
            <div
              key={`${step.label}-${index}`}
              data-testid={`page-header-step-${index}`}
              className="flex min-w-[150px] items-start gap-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                    step.state === "complete" && "border-emerald-600 bg-emerald-600 text-white",
                    step.state === "current" && "border-indigo-600 bg-indigo-50 text-indigo-700",
                    (!step.state || step.state === "upcoming") && "border-gray-200 bg-white text-gray-500"
                  )}
                >
                  {step.state === "complete" ? "✓" : index + 1}
                </span>
                {index < stepper.length - 1 && (
                  <span className="hidden h-px w-10 bg-gray-200 md:block" />
                )}
              </div>

              <div className="min-w-0">
                <p
                  className={cn(
                    "m-0 text-sm font-medium",
                    step.state === "current" ? "text-gray-900" : "text-gray-700"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="mt-1 text-xs text-gray-500">{step.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
