import type { ReactNode } from "react";
import { PageHeader } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";

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
  const navigate = useSharedNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={{ label: "Back", href: basePath }}
        onNavigate={navigate}
        actions={actions}
      />
      {children}
    </div>
  );
}
