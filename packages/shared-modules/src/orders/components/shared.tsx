import type { ReactNode } from "react";
import { Button, PageHeader, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";

export function SharedOrdersLayout({
  title,
  subtitle,
  backHref,
  backLabel,
  showBack,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  const resolvedBackHref = backHref ?? basePath;
  const resolvedBackLabel = backLabel ?? "Back";
  const resolvedShowBack = showBack ?? true;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={resolvedShowBack ? { label: resolvedBackLabel, href: resolvedBackHref } : undefined}
        onNavigate={navigate}
        actions={actions}
      />
      {children}
    </div>
  );
}

export function OrdersSectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <SectionCard className="border-slate-200 shadow-sm">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </SectionCard>
  );
}

export function NavigateButton({ href, children }: { href: string; children: ReactNode }) {
  const navigate = useSharedNavigate();
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => navigate(href)}>
      {children}
    </Button>
  );
}
