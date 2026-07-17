import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Button, Input, ErrorState, EmptyState } from "@jaldee/design-system";
import { useCandidates } from "../../services/useRecruitmentData";
import { NewCandidateModal } from "./NewCandidateModal";
import RecruitmentLayout from "./RecruitmentLayout";
import { RecruitmentMobileCard, RecruitmentViewToggle, useRecruitmentResponsiveViewMode } from "./recruitmentResponsive";
import type { ColumnDef } from "@jaldee/design-system";
import type { Candidate } from "../../types";

export default function Candidates() {
  const navigate = useNavigate();
  const { data, loading, error, save } = useCandidates();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useRecruitmentResponsiveViewMode();

  const openCandidate = (candidate: Candidate) => {
    const candidateKey = candidate.uid ?? candidate.id;
    if (!candidateKey) return;
    navigate(`/recruitment/candidates/${candidateKey}`, { state: { returnTo: "/recruitment/candidates" } });
  };

  const filtered = search
    ? data.filter((candidate) =>
        candidate.name?.toLowerCase().includes(search.toLowerCase()) ||
        candidate.email?.toLowerCase().includes(search.toLowerCase())
      )
    : data;

  const columns: ColumnDef<Candidate>[] = [
    { header: "Name", key: "name" },
    {
      header: "Contact Info",
      key: "email",
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.email}</div>
          {row.phone && <div className="text-xs text-gray-500">{row.phone}</div>}
        </div>
      ),
    },
    { header: "Source", key: "source" },
    {
      header: "Added On",
      key: "addedAt",
      render: (row) => (row.addedAt ? new Date(String(row.addedAt)).toLocaleDateString() : "-"),
    },
    {
      header: "",
      key: "id",
      align: "right",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          className="whitespace-nowrap"
          data-testid={`hr-recruitment-candidate-view-${row.id}`}
          onClick={() => openCandidate(row)}
        >
          View
        </Button>
      ),
    },
  ];

  if (error) {
    return (
      <RecruitmentLayout title="Candidate Pool" subtitle="Global list of all candidates and their profiles.">
        <ErrorState title="Failed to load Candidates" description={error} />
      </RecruitmentLayout>
    );
  }

  return (
    <RecruitmentLayout title="Candidate Pool" subtitle="Global list of all candidates and their profiles.">
      <div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex w-full items-center justify-between gap-3 flex-wrap md:w-auto md:order-2 md:flex-row md:items-center">
              <Button variant="primary" data-testid="hr-recruitment-new-candidate" onClick={() => setIsModalOpen(true)}>
                + Add Candidate
              </Button>
              <div className="ml-auto shrink-0">
                <RecruitmentViewToggle
                  value={viewMode}
                  onChange={setViewMode}
                  tableTestId="hr-recruitment-candidates-view-table"
                  cardsTestId="hr-recruitment-candidates-view-cards"
                />
              </div>
            </div>
            <Input
              id="hr-recruitment-candidates-search"
              data-testid="hr-recruitment-candidates-search"
              placeholder="Search candidates by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="w-full md:order-1 md:max-w-xs"
              icon={<SearchIcon />}
            />
          </div>

          <div className="p-0">
            {!loading && filtered.length === 0 ? (
              <div className="py-12">
                <EmptyState title="No Candidates" description="Add candidates to start the hiring process." />
              </div>
            ) : viewMode === "cards" ? (
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {filtered.map((candidate) => (
                  <RecruitmentMobileCard
                    key={candidate.id}
                    title={candidate.name}
                    rows={[
                      { label: "Email", value: candidate.email || "-" },
                      { label: "Phone", value: candidate.phone || "-" },
                      { label: "Source", value: candidate.source || "-" },
                      { label: "Added On", value: candidate.addedAt ? new Date(String(candidate.addedAt)).toLocaleDateString() : "-" },
                    ]}
                    footer={
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`hr-recruitment-candidate-card-view-${candidate.id}`}
                        onClick={() => openCandidate(candidate)}
                      >
                        View
                      </Button>
                    }
                  />
                ))}
              </div>
            ) : (
              <DataTable data={filtered} columns={columns} loading={loading} />
            )}
          </div>
        </div>
      </div>

      <NewCandidateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={save} />
    </RecruitmentLayout>
  );
}

function SearchIcon() {
  return <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
