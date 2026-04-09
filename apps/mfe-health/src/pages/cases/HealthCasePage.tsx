import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, DescriptionList, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";

export default function HealthCasePage() {
  const navigate = useNavigate();
  const params = useParams();

  const detailItems = useMemo(
    () => [
      { label: "Customer ID", value: params.recordId ?? "-" },
      { label: "Case ID", value: params.caseId ?? "New case" },
      { label: "Mode", value: params.caseId ? "Existing case" : "Create case" },
      { label: "Route", value: params.caseId ? "case" : "new-case" },
    ],
    [params.caseId, params.recordId]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={params.caseId ? "Case Workspace" : "Create Case"}
        subtitle="Health case route scaffold"
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <SectionCard title="Case Context">
        <DescriptionList items={detailItems} />
      </SectionCard>

      <SectionCard>
        <EmptyState
          title="Case workflow placeholder"
          description="The route is now available and wired from the patient/customer list. Build the full case workspace here next."
        />
      </SectionCard>
    </div>
  );
}
