import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, DataTablePagination, Badge, Button, Input, Select, RichTextEditor, ErrorState, EmptyState, Drawer } from "@jaldee/design-system";
import { Filter } from "lucide-react";
import type { ColumnDef } from "@jaldee/design-system";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useCareersSite, usePostings, type JobPosting, type CareersSite } from "../../services/useCareers";
import { useCareerPostingSearchSchema } from "../../services/useHrSearchSchema";
import { useShellErrorToast, useShellFeedback } from "../../services/useShellFeedback";
import RecruitmentLayout from "../recruitment/RecruitmentLayout";
import { RecruitmentMobileCard, RecruitmentViewToggle, useRecruitmentResponsiveViewMode } from "../recruitment/recruitmentResponsive";

const templateOptions = [
  { value: "classic", label: "Classic" },
  { value: "split", label: "Split" },
  { value: "minimal", label: "Minimal" },
];

export default function CareersAdmin() {
  const navigate = useNavigate();
  const { toast, track, capture } = useShellFeedback("hr.recruitment.careers");
  const site = useCareersSite();
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { schema: postingSchema, loading: schemaLoading } = useCareerPostingSearchSchema();
  const { data: postings, loading, error, setStatus, totalElements } = usePostings(advancedFilters, postingSchema, { enabled: !schemaLoading, page: page - 1, pageSize });
  useShellErrorToast("hr.recruitment.careers", "Careers", error || site.error);

  const [busy, setBusy] = useState<string | null>(null);
  const [viewMode, setViewMode] = useRecruitmentResponsiveViewMode();
  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, postingSchema).length,
    [advancedFilters, postingSchema]
  );

  const openFilters = () => {
    setDraftFilters(advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(postingSchema));
    setFiltersOpen(true);
  };
  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(postingSchema);
    setDraftFilters(reset);
    setAdvancedFilters(reset);
    setPage(1);
  };
  const resetFilters = () => { clearFilters(); setFiltersOpen(false); };
  const applyFilters = () => { setAdvancedFilters(draftFilters); setPage(1); setFiltersOpen(false); };

  const openEdit = (posting: JobPosting) => {
    if (posting.requisitionUid) navigate(`/recruitment/careers/publish/${posting.requisitionUid}`);
  };

  const doStatus = async (uid: string, status: JobPosting["status"]) => {
    setBusy(uid);
    try {
      await setStatus(uid, status!);
      toast("success", "Careers", status === "PUBLISHED" ? "Job published." : "Job unpublished.");
      track("posting_status_changed", { status });
    } catch (errorValue) {
      capture(errorValue, { postingUid: uid, status });
      toast("error", "Careers", errorValue instanceof Error ? errorValue.message : "Status update failed.");
    } finally {
      setBusy(null);
    }
  };

  const columns: ColumnDef<JobPosting>[] = [
    {
      header: "Title",
      key: "title",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.title}</div>
          <div className="text-xs text-gray-500">/{row.slug}</div>
        </div>
      ),
    },
    { header: "Location", key: "locationText", render: (row) => row.locationText || "-" },
    { header: "Applies", key: "applyCount", render: (row) => row.applyCount ?? 0 },
    {
      header: "Status",
      key: "status",
      render: (row) => {
        const value = String(row.status);
        const variant = value === "PUBLISHED" ? "success" : value === "CLOSED" ? "danger" : "neutral";
        return <Badge variant={variant}>{value}</Badge>;
      },
    },
    {
      header: "",
      key: "uid",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" data-testid={`hr-careers-edit-${row.uid}`} onClick={() => openEdit(row)}>
            Edit
          </Button>
          {row.status !== "PUBLISHED" ? (
            <Button variant="primary" size="sm" data-testid={`hr-careers-publish-${row.uid}`} loading={busy === row.uid} onClick={() => doStatus(row.uid!, "PUBLISHED")}>
              Publish
            </Button>
          ) : (
            <Button variant="outline" size="sm" data-testid={`hr-careers-unpublish-${row.uid}`} loading={busy === row.uid} onClick={() => doStatus(row.uid!, "CLOSED")}>
              Unpublish
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <RecruitmentLayout title="Careers Page" subtitle="Publish job requisitions to your public careers site.">
      <section id="hr-careers-admin" data-testid="hr-careers-admin" className="space-y-6 p-4 md:p-6">
        <SiteSettings site={site} />

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h3 className="font-semibold text-gray-900">Published roles</h3>
              {site.data?.companySlug && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Public URL: <span className="text-violet-700">/careers/{site.data.companySlug}/&lt;slug&gt;</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Button
                type="button"
                variant={appliedFilterCount > 0 ? "primary" : "outline"}
                icon={<Filter size={16} />}
                data-testid="hr-careers-postings-filter-button"
                aria-label="Open posting filters"
                onClick={openFilters}
              >
                Filter{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ""}
              </Button>
              <RecruitmentViewToggle
                value={viewMode}
                onChange={setViewMode}
                tableTestId="hr-careers-view-table"
                cardsTestId="hr-careers-view-cards"
              />
              <span className="text-xs text-gray-400">Publish jobs from Recruitment - Requisitions</span>
            </div>
          </div>
          <div className="p-0">
            {error ? (
              <div className="p-6">
                <ErrorState title="Failed to load postings" description={error} />
              </div>
            ) : !loading && postings.length === 0 ? (
              <div className="py-12">
                <EmptyState title="No published roles yet" description="Open Requisitions and click 'Publish to careers' on a role." />
              </div>
            ) : viewMode === "cards" ? (
              <>
                <div className="grid gap-4 p-4 md:grid-cols-2">
                  {postings.map((posting) => (
                    <RecruitmentMobileCard
                      key={posting.uid}
                      title={posting.title}
                      rows={[
                        { label: "Slug", value: posting.slug ? `/${posting.slug}` : "-" },
                        { label: "Location", value: posting.locationText || "-" },
                        { label: "Applies", value: posting.applyCount ?? 0 },
                        {
                          label: "Status",
                          value: (
                            <Badge variant={posting.status === "PUBLISHED" ? "success" : posting.status === "CLOSED" ? "danger" : "neutral"}>
                              {posting.status || "-"}
                            </Badge>
                          ),
                        },
                      ]}
                      footer={
                        <>
                          <Button variant="outline" size="sm" data-testid={`hr-careers-card-edit-${posting.uid}`} onClick={() => openEdit(posting)}>
                            Edit
                          </Button>
                          {posting.status !== "PUBLISHED" ? (
                            <Button variant="primary" size="sm" data-testid={`hr-careers-card-publish-${posting.uid}`} loading={busy === posting.uid} onClick={() => doStatus(posting.uid!, "PUBLISHED")}>
                              Publish
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" data-testid={`hr-careers-card-unpublish-${posting.uid}`} loading={busy === posting.uid} onClick={() => doStatus(posting.uid!, "CLOSED")}>
                              Unpublish
                            </Button>
                          )}
                        </>
                      }
                    />
                  ))}
                </div>
                <DataTablePagination
                  testId="hr-careers-postings-pagination"
                  page={page}
                  pageSize={pageSize}
                  total={totalElements}
                  onChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </>
            ) : (
              <DataTable
                data={postings}
                columns={columns}
                loading={loading}
                pagination={{
                  page,
                  pageSize,
                  total: totalElements,
                  mode: "server",
                  onChange: setPage,
                  onPageSizeChange: (size) => {
                    setPageSize(size);
                    setPage(1);
                  },
                }}
              />
            )}
          </div>
        </div>
        <Drawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Posting Filters"
          size="sm"
          contentClassName="flex flex-col p-0 overflow-hidden"
        >
          <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="hr-careers-postings-filter-drawer">
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <SchemaFilterBuilder
                schema={postingSchema}
                value={draftFilters}
                onChange={setDraftFilters}
                appliedCount={appliedFilterCount}
                onClearAll={clearFilters}
                emptyStateMessage="No posting filters are available from the schema."
              />
            </div>
            <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
              <Button type="button" variant="outline" className="flex-1" data-testid="hr-careers-postings-filter-reset" onClick={resetFilters}>Reset All</Button>
              <Button type="button" variant="primary" className="flex-1" data-testid="hr-careers-postings-filter-apply" onClick={applyFilters}>Apply Filters</Button>
            </div>
          </div>
        </Drawer>
      </section>
    </RecruitmentLayout>
  );
}

function SiteSettings({ site }: { site: ReturnType<typeof useCareersSite> }) {
  const [form, setForm] = useState<CareersSite>(
    site.data ?? { companySlug: "", companyName: "", careersActive: true, defaultTemplate: "classic" }
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  if (!seeded && site.data) {
    setSeeded(true);
    setForm(site.data);
  }

  const set = (key: keyof CareersSite) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((previous) => ({ ...previous, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await site.save(form);
      setMsg("Saved.");
    } catch (errorValue) {
      setMsg(errorValue instanceof Error ? errorValue.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Careers site</h3>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.careersActive} onChange={(e) => setForm((previous) => ({ ...previous, careersActive: e.target.checked }))} />
          Site live
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input label="Company name" value={form.companyName} onChange={set("companyName")} placeholder="Jaldee" />
        <Input label="Company URL slug" value={form.companySlug} onChange={set("companySlug")} placeholder="jaldee" />
      </div>
      <Input label="Tagline" value={form.tagline ?? ""} onChange={set("tagline")} placeholder="The operating system for local businesses" />
      <RichTextEditor
        label="About the company"
        value={form.aboutHtml ?? ""}
        onChange={(value) => setForm((previous) => ({ ...previous, aboutHtml: value }))}
        placeholder="Write about your company, culture, mission, and what candidates can expect."
        minHeightClassName="min-h-[180px]"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select label="Default template" options={templateOptions} value={form.defaultTemplate ?? "classic"} onChange={set("defaultTemplate")} />
        <Input label="Brand colour (hex)" value={form.primaryColor ?? ""} onChange={set("primaryColor")} placeholder="#5B21D1" />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="primary" type="submit" loading={saving}>
          Save site
        </Button>
        {msg && <span className="text-sm text-gray-500">{msg}</span>}
      </div>
    </form>
  );
}
