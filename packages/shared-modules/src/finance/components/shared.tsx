import type { ReactNode } from "react";
import { PageHeader } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";

export function SharedFinanceLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { basePath } = useSharedModulesContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={{ label: "Back", href: basePath }}
        onNavigate={(href) => window.location.assign(href)}
        actions={actions}
      />
      {children}
    </div>
  );
}
