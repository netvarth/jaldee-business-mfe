import { useState } from "react";
import { KanbanBoard, ErrorState, EmptyState, Skeleton, Button } from "@jaldee/design-system";
import { useApplications } from "../../services/useRecruitmentData";
import { ConvertToEmployeeModal } from "./ConvertToEmployeeModal";
import RecruitmentLayout from "./RecruitmentLayout";
import type { Application } from "../../types";
import { RecruitmentMobileCard, RecruitmentViewToggle, useRecruitmentResponsiveViewMode } from "./recruitmentResponsive";

const STAGES = [
  { id: "APPLIED", label: "Applied" },
  { id: "SCREENING", label: "Screening" },
  { id: "INTERVIEW", label: "Interview" },
  { id: "OFFER", label: "Offer" },
];

export default function ApplicationsPipeline() {
  const { data, loading, error, updateStage, hire } = useApplications();
  const [onboarding, setOnboarding] = useState<Application | null>(null);
  const [viewMode, setViewMode] = useRecruitmentResponsiveViewMode();

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

  const groupedByStage = STAGES.map((stage) => ({
    ...stage,
    items: data.filter((app) => (app.stage || "APPLIED") === stage.id),
  }));

  return (
    <RecruitmentLayout title="Applications Pipeline" subtitle="Drag and drop applications across recruitment stages.">
      <div className="p-4 md:p-6">
        <div className="mb-4 flex w-full items-center justify-between gap-3 flex-wrap rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="text-sm text-gray-500">Review applications by stage and move candidates through the pipeline.</div>
          <div className="ml-auto shrink-0">
            <RecruitmentViewToggle
              value={viewMode}
              onChange={setViewMode}
              tableTestId="hr-recruitment-applications-view-board"
              cardsTestId="hr-recruitment-applications-view-cards"
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className={viewMode === "table" ? "h-full min-w-[1000px]" : "h-full min-w-0"}>
          {loading ? (
            <div className={viewMode === "table" ? "flex gap-6" : "grid gap-4 md:grid-cols-2"}>
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-[400px] w-[260px] rounded-xl" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState title="No Applications" description="Wait for candidates to apply." />
          ) : viewMode === "cards" ? (
            <div className="grid gap-4">
              {groupedByStage.map((stage) => (
                <div key={stage.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">{stage.label}</div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{stage.items.length}</span>
                  </div>
                  <div className="grid gap-3 p-4">
                    {stage.items.length === 0 ? (
                      <div className="py-6 text-center text-sm font-medium text-gray-400">No applications</div>
                    ) : stage.items.map((app) => (
                      <RecruitmentMobileCard
                        key={app.id}
                        title={app.candidate?.name || "Unknown Candidate"}
                        rows={[
                          { label: "Role", value: app.requisition?.title || "Unknown Role" },
                          { label: "Req", value: app.requisitionId?.substring(0, 8) || "-" },
                          { label: "App", value: app.id?.substring(0, 8) || "-" },
                        ]}
                        footer={app.stage === "HIRED" ? (
                          <Button variant="primary" size="sm" className="w-full sm:w-auto" onClick={(e) => handleHire(e, app)}>
                            Onboard Employee
                          </Button>
                        ) : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
