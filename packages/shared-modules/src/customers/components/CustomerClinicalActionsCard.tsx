import { Button, SectionCard } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";

interface CustomerClinicalActionsCardProps {
  customerId: string;
  customerLabel: string;
}

export function CustomerClinicalActionsCard({ customerId, customerLabel }: CustomerClinicalActionsCardProps) {
  const { basePath, product } = useSharedModulesContext();

  function getMedicalRecordsBasePath() {
    if (basePath.endsWith("/customers")) {
      return `${basePath.slice(0, -"/customers".length)}/medical-records`;
    }

    if (basePath.endsWith("/patients")) {
      return `${basePath.slice(0, -"/patients".length)}/medical-records`;
    }

    return `/${product}/medical-records`;
  }

  function openClinicalRoute(view: "records" | "prescription" | "clinical-notes") {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.origin + getMedicalRecordsBasePath());
    url.searchParams.set("customerId", customerId);
    url.searchParams.set("source", "customers");
    url.searchParams.set("view", view);
    window.location.assign(url.pathname + url.search);
  }

  return (
    <SectionCard title="Clinical Actions">
      <div className="space-y-3" data-testid="customer-clinical-actions-card">
        <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          Continue this {customerLabel.toLowerCase()} into the medical records workspace.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button data-testid="customer-clinical-open-records" variant="outline" size="sm" onClick={() => openClinicalRoute("records")}>
            Open Medical Records
          </Button>
          <Button data-testid="customer-clinical-open-notes" variant="outline" size="sm" onClick={() => openClinicalRoute("clinical-notes")}>
            Clinical Notes
          </Button>
          <Button data-testid="customer-clinical-open-prescription" variant="outline" size="sm" onClick={() => openClinicalRoute("prescription")}>
            Prescription
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
