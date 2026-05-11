import { EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useLocation } from "react-router-dom";

const labels: Record<string, string> = {
  op: "Outpatient",
  "medical-records": "Medical Records",
  "consent-forms": "Consent Forms",
  referrals: "Referrals",
  triage: "Triage",
  "diet-nutrition": "Diet & Nutrition",
  "nursing-notes": "Nursing Notes",
  vaccinations: "Vaccinations",
  allergies: "Allergies",
  ot: "OT Schedule",
  tasks: "Clinical Tasks",
  users: "Clinical Staff",
  analytics: "Health Analytics",
  reports: "Clinical Reports",
  membership: "Membership",
  "audit-log": "Health Audit Log",
  settings: "Health Settings",
};

export default function PlaceholderPage() {
  const location = useLocation();
  const section = location.pathname.split("/").filter(Boolean)[1] ?? "";
  const title = labels[section] ?? "Health Overview";

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <PageHeader
          title={title}
          subtitle="This route is registered in the Health microfrontend."
        />
        <SectionCard>
          <EmptyState
            title={`${title} is ready for implementation`}
            description="The route resolves through shell and the Health remote. Connect the feature page here next."
          />
        </SectionCard>
      </div>
    </div>
  );
}
