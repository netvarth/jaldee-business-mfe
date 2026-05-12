import type { ReactNode } from "react";
import { PageHeader } from "@jaldee/design-system";
import { useSharedNavigate } from "../../useSharedNavigate";

export function ReportsPageShell({
  title,
  subtitle,
  actions,
  back,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  back?: { label: string; href: string };
  children: ReactNode;
}) {
  const navigate = useSharedNavigate();

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <PageHeader
        actions={actions}
        back={back}
        onNavigate={navigate}
        subtitle={subtitle}
        title={title}
      />
      {children}
    </div>
  );
}

export function ReportIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
        <path d="M5 19V5m0 14h14M9 16V9m4 7V7m4 9v-5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    </span>
  );
}
