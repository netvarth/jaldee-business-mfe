import { EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useLocation } from "react-router-dom";

const routeLabels: Record<string, string> = {
  customers: "Customers",
  users: "Users",
  reports: "Reports",
  drive: "Drive",
  tasks: "Tasks",
  membership: "Membership",
  leads: "Leads",
  "audit-log": "Audit Log",
  settings: "Settings",
  lending: "Lending",
  hr: "HR",
  ai: "AI",
};

function titleFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const primary = parts[0] ?? "home";
  const leaf = parts.at(-1) ?? primary;
  return routeLabels[primary] ?? routeLabels[leaf] ?? leaf.replace(/-/g, " ");
}

export default function GlobalPlaceholderPage() {
  const location = useLocation();
  const title = titleFromPath(location.pathname);

  return (
    <div className="shell-home">
      <PageHeader
        title={title}
        subtitle="This route is registered in the shell and ready for its shared module."
      />
      <SectionCard>
        <EmptyState
          title={`${title} is routed`}
          description="The page resolves from the shell. Connect the shared module implementation here when it is available."
        />
      </SectionCard>
    </div>
  );
}
