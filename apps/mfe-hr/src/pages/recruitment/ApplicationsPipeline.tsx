import { useState } from "react";
import { KanbanBoard, ErrorState, EmptyState, Skeleton, Button } from "@jaldee/design-system";
import { useApplications } from "../../services/useRecruitmentData";
import { ConvertToEmployeeModal } from "./ConvertToEmployeeModal";
import RecruitmentLayout from "./RecruitmentLayout";
import type { Application } from "../../types";

const STAGES = [
  { id: "APPLIED", label: "Applied" },
  { id: "SCREENING", label: "Screening" },
  { id: "INTERVIEW", label: "Interview" },
  { id: "OFFER", label: "Offer" },
];

export default function ApplicationsPipeline() {
  const { data, loading, error, updateStage, hire } = useApplications();
  const [onboarding, setOnboarding] = useState<Application | null>(null);

  if (error) {
    return (
      <RecruitmentLayout title="Applications Pipeline" subtitle="Drag and drop applications across recruitment stages.">
        <ErrorState title="Failed to load Applications" description={error} />
      </RecruitmentLayout>
    );
  }

  const kanbanItems = data.map((app) => ({
    ...app,
    columnId: app.stage || "APPLIED",
  }));

  const handleDragEnd = (itemId: string, newColumnId: string) => {
    void updateStage(itemId, newColumnId);
  };

  const handleHire = (e: React.MouseEvent, app: Application) => {
    e.stopPropagation();
    setOnboarding(app);
  };

  const renderCard = (item: unknown) => {
    const app = item as Application;
    const isHired = app.stage === "HIRED";

    return (
      <div className="mb-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <h4 className="text-sm font-semibold text-gray-900">{app.candidate?.name || "Unknown Candidate"}</h4>
        <p className="mt-0.5 text-xs text-gray-500">{app.requisition?.title || "Unknown Role"}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>REQ: {app.requisitionId?.substring(0, 8)}</span>
          <span>{app.id?.substring(0, 8)}</span>
        </div>
        {isHired && (
          <Button variant="primary" size="sm" className="mt-3 w-full" onClick={(e) => handleHire(e, app)}>
            Onboard Employee
          </Button>
        )}
      </div>
    );
  };

  return (
    <RecruitmentLayout title="Applications Pipeline" subtitle="Drag and drop applications across recruitment stages.">
      <div className="flex-1 overflow-x-auto p-4 md:p-6">
        <div className="h-full min-w-[1000px]">
          {loading ? (
            <div className="flex gap-6">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-[400px] w-[260px] rounded-xl" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState title="No Applications" description="Wait for candidates to apply." />
          ) : (
            <KanbanBoard
              columns={STAGES}
              items={kanbanItems}
              onDragEnd={handleDragEnd}
              renderCard={renderCard}
              className="h-full"
            />
          )}
        </div>
      </div>

      <ConvertToEmployeeModal
        key={onboarding?.id ?? "onboard"}
        isOpen={!!onboarding}
        onClose={() => setOnboarding(null)}
        offer={null}
        candidate={onboarding?.candidate ?? null}
        applicationId={onboarding?.id}
        onConvert={hire}
      />
    </RecruitmentLayout>
  );
}
