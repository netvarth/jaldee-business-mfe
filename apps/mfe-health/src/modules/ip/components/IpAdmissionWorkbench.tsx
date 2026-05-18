import { Button, EmptyState, Input, SectionCard, Select } from "@jaldee/design-system";
import { useState } from "react";
import { useSharedModulesContext, useSharedNavigate } from "@jaldee/shared-modules";

export function IpAdmissionWorkbench() {
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [mode, setMode] = useState("Walk-in");

  return (
    <div className="space-y-6">
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-semibold text-slate-900">New Admission</div>
            <div className="text-sm text-slate-500">React conversion shell for the Angular admission workflow.</div>
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate(`${basePath}/admissions`)}>
            Back to Admissions
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Admission Mode"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            options={[
              { value: "Walk-in", label: "Walk-in" },
              { value: "Reserve", label: "Reserve" },
            ]}
          />
          <Input label="Patient Search" placeholder="Search with patient name / phone / ID" />
          <Input label="Admitted Doctor" placeholder="Select admitted doctor" />
          <Input label="Reason for Admission" placeholder="Reason for admission" />
          <Input label="Expected Check-In Date" type="date" />
          <Input label="Expected Check-Out Date" type="date" />
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="primary">
            Continue
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="border-dashed border-slate-300 bg-slate-50 shadow-sm">
        <EmptyState
          title="Admission workflow shell"
          description="This screen now follows the Angular route structure. The full patient creation, bed assignment, and registration flow still needs to be ported feature-by-feature."
        />
      </SectionCard>
    </div>
  );
}

