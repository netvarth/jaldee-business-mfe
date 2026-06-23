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
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: "default" | "navigation";
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
  subtitle,
  icon,
  actions,
  variant = "default",
  loading,
  back,
  breadcrumbs,
  stepper,
  hidden,
  className,
  onNavigate,
}: PageHeaderProps) {
  if (hidden) return null;

  const navigateBack = () => {
    if (!back) return;
    if (onNavigate) {
      onNavigate(back.href);
      return;
    }
    if (typeof window !== "undefined") window.location.assign(back.href);
  };

  if (variant === "navigation") {
    return (
      <div
        data-testid="page-header"
        data-variant="navigation"
        className={cn(
          "-mx-4 mb-6 flex min-h-16 flex-wrap items-center justify-between gap-3 bg-[var(--surface-bg)] px-4 py-3 shadow-[var(--shadow-sm)] sm:-mx-6 sm:flex-nowrap sm:px-6",
          className
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {back && (
            <button
              type="button"
              data-testid="page-header-back"
              onClick={navigateBack}
              aria-label={back.label}
              title={back.label}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] p-0 text-[var(--dark-text)] shadow-sm transition-colors hover:bg-[var(--app-bg)]"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}

          {loading ? (
            <div data-testid="page-header-title-skeleton" className="h-5 w-44 animate-pulse rounded bg-[var(--border-color)]" />
          ) : (
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                {icon && (
                  <div data-testid="page-header-icon" className="flex shrink-0 items-center justify-center text-[var(--primary-color)]">
                    {icon}
                  </div>
                )}
                <h1
                  data-testid="page-header-title"
                  className="m-0 truncate text-base font-bold leading-6 text-[var(--dark-text)] sm:text-lg"
                >
                  {title}
                </h1>
              </div>
              {subtitle && <p className="m-0 truncate text-xs text-[var(--light-text)]">{subtitle}</p>}
            </div>
          )}
        </div>

        {actions && (
          <div
            data-testid="page-header-actions"
            className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0 sm:flex-nowrap"
          >
            {actions}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="page-header" className={cn("mb-6", className)}>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {back && (
            <button
              type="button"
              data-testid="page-header-back"
              onClick={navigateBack}
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
                      type="button"
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
            <div className="flex min-w-0 items-start gap-3">
              {icon && (
                <div
                  data-testid="page-header-icon"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                >
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <h1
                  data-testid="page-header-title"
                  className="m-0 max-w-full text-2xl font-bold leading-tight text-gray-900"
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="m-0 mt-1 max-w-full text-sm leading-5 text-gray-500">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {actions && (
          <div
            data-testid="page-header-actions"
            className="flex w-full items-center gap-3 sm:w-auto sm:justify-end"
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
