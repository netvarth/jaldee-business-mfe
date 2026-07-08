import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Badge, Button, Input, ErrorState, EmptyState } from "@jaldee/design-system";
import { useJobRequisitions } from "../../services/useRecruitmentData";
import { usePostings } from "../../services/useCareers";
import { useShellErrorToast, useShellFeedback } from "../../services/useShellFeedback";
import { NewRequisitionModal } from "./NewRequisitionModal";
import RecruitmentLayout from "./RecruitmentLayout";
import type { ColumnDef } from "@jaldee/design-system";
import type { JobRequisition } from "../../types";

export default function JobRequisitions() {
  const navigate = useNavigate();
  const { data, loading, error, save } = useJobRequisitions();
  const { toast, track, capture } = useShellFeedback("hr.recruitment.requisitions");
  useShellErrorToast("hr.recruitment.requisitions", "Requisitions", error);
  const { data: postings } = usePostings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? data.filter(r => r.title?.toLowerCase().includes(search.toLowerCase()))
    : data;

  const postingFor = (reqId: string) => postings.find((p) => p.requisitionUid === reqId);

  const columns: ColumnDef<JobRequisition>[] = [
    { header: "Title", key: "title" },
    { header: "Type", key: "employmentType" },
    { header: "Openings", key: "openings" },
    {
      header: "Status",
      key: "status",
      render: (row) => {
        const v = String(row.status ?? "").toUpperCase();
        const variant = v === "OPEN" ? "success" : v === "CLOSED" || v === "FILLED" ? "danger" : v === "ON_HOLD" ? "warning" : "neutral";
        return <Badge variant={variant}>{v || "—"}</Badge>;
      },
    },
    {
      header: "Careers",
      key: "id",
      render: (row) => {
        const p = postingFor(row.id);
        if (p?.status === "PUBLISHED") return <Badge variant="info">● Live</Badge>;
        if (p) return <Badge variant="neutral">Draft</Badge>;
        return <span className="text-xs text-gray-400">Not published</span>;
      },
    },
    {
      header: "",
      key: "uid",
      align: "right",
      render: (row) => {
        const published = postingFor(row.id)?.status === "PUBLISHED";
        return (
          <Button variant={published ? "outline" : "primary"} size="sm"
            onClick={() => navigate(`/recruitment/careers/publish/${row.id}`)}>
            {published ? "Edit careers page" : "Publish to careers"}
          </Button>
        );
      },
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
      <div className="p-8">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <Input
              id="hr-recruitment-requisitions-search"
              data-testid="hr-recruitment-requisitions-search"
              placeholder="Search requisitions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="max-w-xs"
              icon={<SearchIcon />}
            />
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
          </div>

          {/* Table */}
          <div className="p-0">
            {!loading && filtered.length === 0 ? (
              <div className="py-12">
                <EmptyState title="No Requisitions" description="Create a job requisition to start hiring." />
              </div>
            ) : (
              <DataTable
                data={filtered}
                columns={columns}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>

      <NewRequisitionModal
        isOpen={isModalOpen}
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
