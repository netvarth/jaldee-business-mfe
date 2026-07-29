import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { EmptyState, SectionCard } from "@jaldee/design-system";
import { PageShell } from "../components/FinancePageLayout";

export default function PlaceholderPage() {
  const location = useLocation();
  const title = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const section = parts[1] ?? "finance";
    return section
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, [location.pathname]);

  return (
    <PageShell
      title={title}
      subtitle="This finance route is registered and ready for its feature implementation."
    >
      <SectionCard>
        <EmptyState
          title={`${title} is routed`}
          description="The route resolves through shell and the Finance microfrontend."
        />
      </SectionCard>
    </PageShell>
  );
}
