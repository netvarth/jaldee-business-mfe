import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Badge, Button, Input, ErrorState, EmptyState } from "@jaldee/design-system";
import { useJobRequisitions } from "../../services/useRecruitmentData";
import { useDepartments } from "../../services/useSettingsData";
import { useEmployees } from "../../services/useEmployees";
import { useShellErrorToast, useShellFeedback } from "../../services/useShellFeedback";
import { NewRequisitionModal } from "./NewRequisitionModal";
import RecruitmentLayout from "./RecruitmentLayout";
import { RecruitmentMobileCard, RecruitmentViewToggle, useRecruitmentResponsiveViewMode } from "./recruitmentResponsive";
import type { ColumnDef } from "@jaldee/design-system";
import type { JobRequisition } from "../../types";

export default function JobRequisitions() {
  const navigate = useNavigate();
  const { data, loading, error, save } = useJobRequisitions();
  const { data: departments } = useDepartments();
  const { data: employees } = useEmployees();
  const { toast, track, capture } = useShellFeedback("hr.recruitment.requisitions");
  useShellErrorToast("hr.recruitment.requisitions", "Requisitions", error);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useRecruitmentResponsiveViewMode();

  const filtered = search
    ? data.filter((requisition) => requisition.title?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const statusVariant = (status?: string) => {
    const value = String(status ?? "").toUpperCase();
    if (value === "OPEN") return "success";
    if (value === "CLOSED" || value === "FILLED") return "danger";
    if (value === "ON_HOLD") return "warning";
    return "neutral";
  };
  const statusLabel = (status?: string) => String(status ?? "").toUpperCase() || "-";

  const columns: ColumnDef<JobRequisition>[] = [
    { header: "Title", key: "title" },
    { header: "Type", key: "employmentType" },
    { header: "Openings", key: "openings" },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>,
    },
    {
      header: "",
      key: "uid",
      align: "right",
      render: (row) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/recruitment/careers/publish/${row.id}`)}
        >
          Manage careers page
        </Button>
      ),
    },
  ];

  if (error) {
    return (
      <RecruitmentLayout title="Job Requisitions" subtitle="Manage open roles and headcount requests.">
        <ErrorState title="Failed to load Requisitions" description={error} />
      </RecruitmentLayout>
    );
  }

  return (
    <RecruitmentLayout title="Job Requisitions" subtitle="Manage open roles and headcount requests.">
      <div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex w-full items-center justify-between gap-3 flex-wrap md:w-auto md:order-2 md:flex-row md:items-center">
              <Button
                variant="primary"
                data-testid="hr-recruitment-new-requisition"
                onClick={() => {
                  track("create_opened");
                  setIsModalOpen(true);
                }}
              >
                + New Requisition
              </Button>
              <div className="ml-auto shrink-0">
                <RecruitmentViewToggle
                  value={viewMode}
                  onChange={setViewMode}
                  tableTestId="hr-recruitment-requisitions-view-table"
                  cardsTestId="hr-recruitment-requisitions-view-cards"
                />
              </div>
            </div>
            <Input
              id="hr-recruitment-requisitions-search"
              data-testid="hr-recruitment-requisitions-search"
              placeholder="Search requisitions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="w-full md:order-1 md:max-w-xs"
              icon={<SearchIcon />}
            />
          </div>

          <div className="p-0">
            {!loading && filtered.length === 0 ? (
              <div className="py-12">
                <EmptyState title="No Requisitions" description="Create a job requisition to start hiring." />
              </div>
            ) : viewMode === "cards" ? (
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {filtered.map((row) => {
                  return (
                    <RecruitmentMobileCard
                      key={row.id}
                      title={row.title}
                      rows={[
                        { label: "Type", value: row.employmentType || "-" },
                        { label: "Openings", value: row.openings ?? "-" },
                        { label: "Status", value: <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge> },
                      ]}
                      footer={
                        <Button
                          variant="primary"
                          size="sm"
                          data-testid={`hr-recruitment-publish-card-${row.id}`}
                          onClick={() => navigate(`/recruitment/careers/publish/${row.id}`)}
                        >
                          Manage careers page
                        </Button>
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <DataTable data={filtered} columns={columns} loading={loading} />
            )}
          </div>
        </div>
      </div>

      <NewRequisitionModal
        isOpen={isModalOpen}
        departments={departments}
        employees={employees}
        onClose={() => setIsModalOpen(false)}
        onSave={async (payload) => {
          try {
            await save(payload);
            toast("success", "Recruitment", "Requisition saved.");
            track("created");
          } catch (err) {
            capture(err);
            toast("error", "Recruitment", err instanceof Error ? err.message : "Could not save requisition.");
            throw err;
          }
        }}
      />
    </RecruitmentLayout>
  );
}

function SearchIcon() {
  return <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
