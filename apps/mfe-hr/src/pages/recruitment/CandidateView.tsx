import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, DataTable, EmptyState, ErrorState } from "@jaldee/design-system";
import { Download, FileText, Upload } from "lucide-react";
import RecruitmentLayout from "./RecruitmentLayout";
import { RecruitmentMobileCard, RecruitmentViewToggle, useRecruitmentResponsiveViewMode } from "./recruitmentResponsive";
import { useApplications, useCandidate } from "../../services/useRecruitmentData";
import { useDocumentDownloader } from "../../services/useCareers";
import type { Application, Candidate } from "../../types";
import type { ColumnDef } from "@jaldee/design-system";

function formatDate(value?: string) {
  return value ? new Date(String(value)).toLocaleDateString() : "-";
}

function stageVariant(stage?: string) {
  const value = String(stage ?? "").toUpperCase();
  if (value === "HIRED") return "success";
  if (value === "REJECTED") return "danger";
  if (value === "OFFER" || value === "INTERVIEW" || value === "SCREENING") return "warning";
  return "neutral";
}

function candidateApplicationMatch(application: Application, candidateId: string) {
  return (
    application.candidateId === candidateId ||
    application.candidateUid === candidateId ||
    application.candidate?.id === candidateId ||
    application.candidate?.uid === candidateId
  );
}

function candidateRows(candidate: Candidate) {
  return [
    { label: "Email", value: candidate.email || "-" },
    { label: "Phone", value: candidate.phone || "-" },
    { label: "Source", value: candidate.source || "-" },
    { label: "Experience", value: candidate.experienceYears != null ? `${candidate.experienceYears} year(s)` : "-" },
    { label: "Current Company", value: candidate.currentCompany || "-" },
    { label: "Designation", value: candidate.currentDesignation || "-" },
    { label: "Added On", value: formatDate(candidate.addedAt || candidate.appliedAt) },
    { label: "Skills", value: candidate.skills || "-" },
    { label: "Notes", value: candidate.notes || "-" },
  ];
}

function candidateResumeRef(candidate?: Candidate | null) {
  if (!candidate) return null;
  return candidate.resumeUrl || candidate.resumeFileRef || null;
}

function applicationResumeRef(application?: Application | null) {
  if (!application) return null;
  return application.resumeUrl || application.resumeFileRef || null;
}

function getFileExtension(value?: string | null) {
  if (!value) return "";
  const clean = value.split("?")[0].split("#")[0];
  const last = clean.split(".").pop();
  return (last || "").toLowerCase();
}

export default function CandidateView() {
  const location = useLocation();
  const navigate = useNavigate();
  const downloadDocument = useDocumentDownloader();
  const { candidateId = "" } = useParams();
  const { data: candidate, loading: candidateLoading, error: candidateError, uploadResume } = useCandidate(candidateId);
  const { data: applications, loading: applicationsLoading, error: applicationsError } = useApplications();
  const [viewMode, setViewMode] = useRecruitmentResponsiveViewMode();
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const relatedApplications = useMemo(
    () => applications.filter((item) => candidateApplicationMatch(item, candidateId)),
    [applications, candidateId]
  );

  const fallbackResumeApplication = useMemo(
    () => relatedApplications.find((item) => !!applicationResumeRef(item)) ?? null,
    [relatedApplications]
  );

  const columns: ColumnDef<Application>[] = [
    {
      header: "Role",
      key: "role",
      render: (row) => row.requisition?.title || row.role || "-",
    },
    {
      header: "Stage",
      key: "stage",
      render: (row) => <Badge variant={stageVariant(row.stage)}>{String(row.stage || "-")}</Badge>,
    },
    {
      header: "Applied On",
      key: "createdAt",
      render: (row) => formatDate(row.createdAt),
    },
    {
      header: "Application",
      key: "id",
      render: (row) => <span className="text-xs text-[var(--color-text-secondary)]">{row.id}</span>,
    },
  ];

  const error = candidateError || applicationsError;
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo || "/recruitment/candidates";
  const backLabel = returnTo === "/recruitment/applications" ? "Back to Applications" : "Back to Candidates";
  const resumeRef = candidateResumeRef(candidate) || applicationResumeRef(fallbackResumeApplication);
  const resumeLabel =
    candidate?.resumeFileName ||
    fallbackResumeApplication?.resumeFileName ||
    "Resume";

  const handleResumeDownload = async () => {
    if (!resumeRef) return;
    setDownloadError(null);
    setDownloadBusy(true);
    try {
      await downloadDocument(resumeRef, resumeLabel);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Unable to download file.");
    } finally {
      setDownloadBusy(false);
    }
  };

  const handleResumeUpload = async (file?: File | null) => {
    if (!file) return;
    setUploadError(null);
    setUploadBusy(true);
    try {
      await uploadResume(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to upload file.");
    } finally {
      setUploadBusy(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  if (error) {
    return (
      <RecruitmentLayout title="Candidate View" subtitle="Candidate profile and application progress.">
        <ErrorState title="Failed to load candidate" description={error} />
      </RecruitmentLayout>
    );
  }

  if (!candidateLoading && !candidate) {
    return (
      <RecruitmentLayout title="Candidate View" subtitle="Candidate profile and application progress.">
        <div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <EmptyState title="Candidate not found" description="The selected candidate could not be located." />
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => navigate(returnTo)}>
                {backLabel}
              </Button>
            </div>
          </div>
        </div>
      </RecruitmentLayout>
    );
  }

  return (
    <RecruitmentLayout title="Candidate View" subtitle="Candidate profile and application progress.">
      <div>
        <div className="grid gap-6">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm md:p-6">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Candidate</div>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{candidate?.name || "Candidate"}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {candidate?.source ? <Badge variant="info">{candidate.source}</Badge> : null}
                {candidate?.currentDesignation ? <Badge variant="neutral">{candidate.currentDesignation}</Badge> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate(returnTo)}>
                {backLabel}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="border-b border-[var(--color-border)] px-4 py-4 md:px-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Uploaded File</h3>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Resume or file submitted by the candidate.</p>
            </div>
            <div className="p-4 md:p-6">
              <div className="mb-4 flex flex-wrap justify-end gap-2">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => void handleResumeUpload(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  onClick={() => uploadInputRef.current?.click()}
                  loading={uploadBusy}
                  data-testid="hr-recruitment-candidate-resume-upload"
                >
                  <Upload size={16} />
                  Upload Resume
                </Button>
              </div>
              {resumeRef ? (
                <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{resumeLabel}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                        {getFileExtension(resumeLabel || resumeRef || "") || "file"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void handleResumeDownload()}
                      data-testid="hr-recruitment-candidate-resume-download"
                      loading={downloadBusy}
                    >
                      <Download size={16} />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState title="No file uploaded" description="This candidate does not have a resume or attachment yet." />
              )}

              {downloadError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {downloadError}
                </div>
              ) : null}
              {uploadError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {uploadError}
                </div>
              ) : null}
            </div>
          </div>

          {candidate ? (
            viewMode === "cards" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {candidateRows(candidate).map((row) => (
                  <RecruitmentMobileCard
                    key={row.label}
                    title={row.label}
                    rows={[{ label: row.label, value: row.value }]}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
                <div className="grid gap-0 divide-y divide-[var(--color-border)] md:grid-cols-2 md:divide-x md:divide-y-0">
                  {candidateRows(candidate).map((row) => (
                    <div key={row.label} className="grid gap-2 p-4 md:p-5">
                      <div className="text-xs font-black uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">{row.label}</div>
                      <div className="text-sm font-medium text-[var(--color-text-primary)] break-words">{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : null}

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Applications ({relatedApplications.length})
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Roles and stages linked to this candidate.</p>
              </div>
              <div className="ml-auto shrink-0">
                <RecruitmentViewToggle
                  value={viewMode}
                  onChange={setViewMode}
                  tableTestId="hr-recruitment-candidate-detail-view-table"
                  cardsTestId="hr-recruitment-candidate-detail-view-cards"
                />
              </div>
            </div>

            <div className="p-0">
              {!applicationsLoading && relatedApplications.length === 0 ? (
                <div className="py-12">
                  <EmptyState title="No applications" description="This candidate has no linked application records yet." />
                </div>
              ) : viewMode === "cards" ? (
                <div className="grid gap-4 p-4 md:grid-cols-2">
                  {relatedApplications.map((application) => (
                    <RecruitmentMobileCard
                      key={application.id}
                      title={application.requisition?.title || application.role || "Application"}
                      rows={[
                        { label: "Stage", value: <Badge variant={stageVariant(application.stage)}>{String(application.stage || "-")}</Badge> },
                        { label: "Applied On", value: formatDate(application.createdAt) },
                        { label: "Application", value: application.id },
                      ]}
                    />
                  ))}
                </div>
              ) : (
                <DataTable data={relatedApplications} columns={columns} loading={applicationsLoading} />
              )}
            </div>
          </div>
        </div>
      </div>
    </RecruitmentLayout>
  );
}
