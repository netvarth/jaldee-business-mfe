import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Plus, Search, Filter, Calendar, CheckCircle2, Pin, Paperclip, Loader2, AlertCircle, X, Megaphone, MoreVertical, Download, LayoutGrid, Table as Rows3, Globe, Target, Users, Building2, Briefcase, MapPin, ShieldAlert } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, Select, DatePicker, Textarea, Dialog, SkeletonCard, Input, Checkbox, Popover, PopoverSection, Drawer, SectionCard, cn } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import {
  SchemaFilterBuilder,
  buildDefaultSearchClauses,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useLocation, useNavigate } from "react-router-dom";
import { useEmployees } from "../../services/useEmployees";
import { useAnnouncements, type Announcement, type TargetAudience } from "../../services/useEngagement";
import { useAnnouncementSearchSchema } from "../../services/useAnnouncementSearchSchema";
import { useTelemetry } from "../../services/useTelemetry";
import { HR_ANALYTICS_BACK, isAnalyticsNavigation } from "../../lib/hrNavigation";
import { formatDate } from "../../lib/utils";
import { useHrAttachmentUpload } from "../../services/useHrAttachmentUpload";

const TEAL = "var(--primary-color)";
const TYPES = ["Policy", "Event", "Payroll", "General"];
const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)", padding: 4 };

const EMPLOYMENT_TYPES = [
  { value: "FullTime", label: "Full-Time" },
  { value: "PartTime", label: "Part-Time" },
  { value: "DailyWage", label: "Daily Wage" },
  { value: "Intern", label: "Intern" },
  { value: "Contract", label: "Contract" },
  { value: "Consultant", label: "Consultant" },
];

const DEPARTMENTS = [
  { id: "dept-eng", name: "Engineering" },
  { id: "dept-sales", name: "Sales" },
  { id: "dept-hr", name: "HR & People" },
  { id: "dept-fin", name: "Finance" },
  { id: "dept-ops", name: "Operations" },
];

const DESIGNATIONS = [
  { id: "desig-mgr", name: "Manager" },
  { id: "desig-tl", name: "Team Lead" },
  { id: "desig-assoc", name: "Associate" },
  { id: "desig-exec", name: "Executive" },
];

const LOCATIONS = [
  { id: "loc-blr", name: "HQ - Bangalore" },
  { id: "loc-mum", name: "Branch - Mumbai" },
  { id: "loc-del", name: "Branch - Delhi" },
  { id: "loc-rem", name: "Remote" },
];
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const panel: CSSProperties = { background: "var(--surface-bg)", border: "1px solid rgba(148,163,184,0.16)", borderRadius: 16, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)" };
const sectionStack: CSSProperties = { display: "flex", flexDirection: "column", gap: 20, width: "100%" };

function typeColor(t?: string): string {
  switch (t) {
    case "Policy": return "#6366f1";
    case "Event": return "#10b981";
    case "Payroll": return "#f59e0b";
    default: return "#115E59";
  }
}

const getTodayDateString = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function Announcements() {
  const { eventBus } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const fromAnalytics = isAnalyticsNavigation(location.state);
  const isEmployeeView = location.pathname.includes("/me/");
  const { trackEvent, captureError } = useTelemetry();
  const isEmployeeLogin = isEmployeeView;
  const [tracking, setTracking] = useState<Announcement | null>(null);
  const [attachmentView, setAttachmentView] = useState<Announcement | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<{ href: string; fileName: string } | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "General",
    startDate: getTodayDateString(),
    endDate: "",
    isPinned: false,
    mandatoryAck: false,
    description: "",
    targetType: "ALL" as "ALL" | "TARGETED",
    targetEmploymentTypes: [] as string[],
    targetDepartmentUids: [] as string[],
    targetDesignationUids: [] as string[],
    targetLocationUids: [] as string[],
    targetEmployeeUids: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const uploadAttachment = useHrAttachmentUpload();
  const [msg, setMsg] = useState<string | null>(null);
  const { data: employees } = useEmployees({ enabled: !isEmployeeView && (Boolean(tracking) || addOpen) });

  const audienceSummary = useMemo(() => {
    if (form.targetType === "ALL") {
      return "Company-wide broadcast (All Employees)";
    }
    const parts: string[] = [];
    if (form.targetEmploymentTypes.length) {
      const names = form.targetEmploymentTypes.map((t) => EMPLOYMENT_TYPES.find((e) => e.value === t)?.label || t);
      parts.push(`${form.targetEmploymentTypes.length} Employment Type${form.targetEmploymentTypes.length > 1 ? "s" : ""} (${names.join(", ")})`);
    }
    if (form.targetDepartmentUids.length) {
      const names = form.targetDepartmentUids.map((id) => DEPARTMENTS.find((d) => d.id === id)?.name || id);
      parts.push(`${form.targetDepartmentUids.length} Department${form.targetDepartmentUids.length > 1 ? "s" : ""} (${names.join(", ")})`);
    }
    if (form.targetDesignationUids.length) {
      const names = form.targetDesignationUids.map((id) => DESIGNATIONS.find((d) => d.id === id)?.name || id);
      parts.push(`${form.targetDesignationUids.length} Designation${form.targetDesignationUids.length > 1 ? "s" : ""} (${names.join(", ")})`);
    }
    if (form.targetLocationUids.length) {
      const names = form.targetLocationUids.map((id) => LOCATIONS.find((l) => l.id === id)?.name || id);
      parts.push(`${form.targetLocationUids.length} Location${form.targetLocationUids.length > 1 ? "s" : ""} (${names.join(", ")})`);
    }
    if (form.targetEmployeeUids.length) {
      parts.push(`${form.targetEmployeeUids.length} Specific Employee${form.targetEmployeeUids.length > 1 ? "s" : ""}`);
    }
    return parts.length ? parts.join(" • ") : "No targeting criteria selected yet";
  }, [form]);

  const { schema: rawAnnouncementSearchSchema, loading: schemaLoading } = useAnnouncementSearchSchema();
  const announcementSearchSchema = useMemo(() => {
    if (!rawAnnouncementSearchSchema) return null;
    const ORDER = ["type", "startdate", "title", "status"];
    const fieldMap = new Map(
      rawAnnouncementSearchSchema.fields.map((f) => [
        (f.name || f.key || f.label || "").toLowerCase().replace(/[^a-z0-9]/g, ""),
        f,
      ])
    );
    const orderedFields = ORDER.map((key) => fieldMap.get(key)).filter((f): f is NonNullable<typeof f> => Boolean(f));
    return {
      ...rawAnnouncementSearchSchema,
      fields: orderedFields.length > 0 ? orderedFields : rawAnnouncementSearchSchema.fields,
    };
  }, [rawAnnouncementSearchSchema]);

  const ann = useAnnouncements(
    advancedFilters,
    announcementSearchSchema,
    { scope: isEmployeeLogin ? "ess" : "general", enabled: !schemaLoading }
  );

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, announcementSearchSchema).length,
    [advancedFilters, announcementSearchSchema]
  );

  const openFilters = () => {
    setDraftFilters(
      advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(announcementSearchSchema)
    );
    setFiltersOpen(true);
  };

  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(announcementSearchSchema);
    setDraftFilters(reset);
    setAdvancedFilters(reset);
  };

  const resetFilters = () => {
    clearFilters();
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    setAdvancedFilters(draftFilters);
    setFiltersOpen(false);
  };

  useEffect(() => {
    if (ann.error) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "StaffSpace",
        message: ann.error,
      });
    }
  }, [ann.error, eventBus]);

  const items = useMemo(() => {
    const q = search.toLowerCase();
    return ann.data
      .filter((a) => !q || (a.title || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q) || (a.type || "").toLowerCase().includes(q))
      .slice().sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [ann.data, search]);

  const [viewMode, setViewMode] = useState<"table" | "cards">(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "cards" : "table"
  );
  const showTable = viewMode === "table" && (typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches);

  const columns = useMemo<ColumnDef<Announcement>[]>(() => [
    {
      key: "type",
      header: "Type",
      width: "10%",
      render: (a) => (
        <span style={{ borderRadius: 999, padding: "4px 12px", fontWeight: 900, fontSize: 10, letterSpacing: "-0.2px", textTransform: "uppercase", color: "white", background: typeColor(a.type), display: "inline-block" }}>
          {a.type || "General"}
        </span>
      ),
    },
    {
      key: "targetAudience",
      header: "Audience",
      width: "14%",
      render: (a) => {
        const isTargeted = a.targetAudience?.targetType === "TARGETED";
        return isTargeted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-800">
            <Target size={11} /> Targeted
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
            <Globe size={11} /> All Staff
          </span>
        );
      },
    },
    {
      key: "startDate",
      header: "Start Date",
      width: "12%",
      render: (a) => (
        <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
          {formatDate(a.startDate) || "Recently"}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      width: "28%",
      render: (a) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-sm text-[var(--color-text-primary)] flex-wrap">
            {a.isPinned && <Pin size={14} color={TEAL} fill={TEAL} className="shrink-0" />}
            <span className="truncate">{a.title}</span>
            {a.mandatoryAck && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800 uppercase tracking-wider">
                <ShieldAlert size={10} /> Mandatory
              </span>
            )}
            {Boolean(a.attachments?.length) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAttachmentView(a);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-extrabold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
              >
                <Paperclip size={11} /> {a.attachments?.length}
              </button>
            )}
          </div>
          {a.description && <div className="mt-0.5 text-xs text-[var(--color-text-secondary)] line-clamp-1">{a.description}</div>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "12%",
      render: (a) => {
        const disabled = a.status === "Disabled";
        return (
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] ${disabled ? "border-slate-200 bg-slate-100 text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {a.status || "Enabled"}
          </span>
        );
      },
    },
    {
      key: "acknowledged",
      header: "Acknowledged",
      width: "16%",
      render: (a) => {
        const count = a.acknowledgedBy?.length || 0;
        if (!isEmployeeLogin) {
          return (
            <button
              type="button"
              id={`hr-announcement-tracking-table-${a.id}`}
              data-testid={`hr-announcement-tracking-table-${a.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setTracking(a);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-800 transition-colors cursor-pointer"
            >
              <CheckCircle2 size={13} className="text-slate-400" />
              {count} Acknowledged
            </button>
          );
        }
        return a.isAcknowledged ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">
            <CheckCircle2 size={13} className="text-emerald-600" /> Acknowledged
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-700">
            Pending
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: "14%",
      align: "right",
      render: (a) => (
        <div className="flex items-center justify-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!isEmployeeLogin ? (
            <Button variant="outline" size="sm" onClick={() => handleToggleStatus(a.id, a.status || "Enabled")}>
              {a.status === "Disabled" ? "Enable" : "Disable"}
            </Button>
          ) : (
            a.isAcknowledged ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-extrabold text-emerald-700">
                <CheckCircle2 size={14} className="text-emerald-600" /> Acknowledged
              </span>
            ) : (
              <Button
                id={`hr-announcement-ack-${a.id}`}
                data-testid={`hr-announcement-ack-${a.id}`}
                variant="primary"
                size="sm"
                className="bg-teal-700 text-white font-extrabold hover:bg-teal-800"
                onClick={() => handleAcknowledge(a.id)}
              >
                Acknowledge
              </Button>
            )
          )}
        </div>
      ),
    },
  ], [isEmployeeLogin]);

  const toLocalISOString = (date: Date): string => {
    const tzOffset = -date.getTimezoneOffset();
    const diff = tzOffset >= 0 ? "+" : "-";
    const pad = (n: number) => String(n).padStart(2, "0");
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    const absOffsetHour = pad(Math.floor(Math.abs(tzOffset) / 60));
    const absOffsetMin = pad(Math.abs(tzOffset) % 60);
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${diff}${absOffsetHour}:${absOffsetMin}`;
  };

  const post = async () => {
    if (!form.title || !form.description) { setMsg("Title and content are required."); return; }
    setSaving(true); setMsg(null);
    try {
      const start = form.startDate
        ? (() => {
            const [y, m, d] = form.startDate.split("-").map(Number);
            const now = new Date();
            return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
          })()
        : new Date();
      const end = form.endDate 
        ? (() => {
            const [y, m, d] = form.endDate.split("-").map(Number);
            return new Date(y, m - 1, d, 23, 59, 59);
          })()
        : (() => {
            const d = new Date(start);
            d.setMonth(d.getMonth() + 1);
            return d;
          })();

      const uploadedAttachments = await Promise.all(attachments.map((file) => uploadAttachment(file, "ANNOUNCEMENT")));
      await ann.create({
        title: form.title,
        description: form.description,
        type: form.type,
        status: "Enabled",
        startDate: toLocalISOString(start),
        endDate: toLocalISOString(end),
        isPinned: form.isPinned,
        acknowledgedBy: [],
        attachments: uploadedAttachments.map((uploaded) => uploaded.attachment),
      });
      trackEvent("hr.announcement.created", {
        type: form.type,
        isPinned: form.isPinned,
        hasEndDate: !!form.endDate,
      });
      setForm({ title: "", type: "General", startDate: getTodayDateString(), endDate: "", isPinned: false, description: "" });
      setAttachments([]);
      setAddOpen(false);
    } catch (e) {
      captureError(e instanceof Error ? e : new Error("Announcement create failed"));
      setMsg(e instanceof Error ? e.message : "Failed to post.");
    }
    finally { setSaving(false); }
  };

  const handleAcknowledge = async (id: string) => {
    if (!isEmployeeLogin) return;
    try {
      await ann.acknowledge(id);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "StaffSpace",
        message: "Announcement acknowledged successfully.",
      });
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "StaffSpace",
        message: e instanceof Error ? e.message : "Failed to acknowledge announcement.",
      });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Disabled" ? "Enabled" : "Disabled";
    try {
      await ann.updateStatus(id, nextStatus);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "StaffSpace",
        message: `Announcement ${nextStatus.toLowerCase()} successfully.`,
      });
    } catch (e) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "StaffSpace",
        message: e instanceof Error ? e.message : "Failed to update status.",
      });
    }
  };

  return (
    <section id="hr-announcements-page" data-testid="hr-announcements-page" className="page-section active hr-page-shell" style={{ display: "flex", flexDirection: "column" }}>
      <div style={sectionStack}>
        {!isEmployeeView ? (
          <PageHeader
            variant={fromAnalytics ? "navigation" : "default"}
            back={fromAnalytics ? HR_ANALYTICS_BACK : undefined}
            onNavigate={(href) => navigate(href)}
            title="StaffSpace"
            subtitle="Stay updated with the latest company news and policies."
            actions={!isEmployeeLogin ? (
              <Button id="hr-announcements-create-button" data-testid="hr-announcements-create-button" variant="primary" icon={<Plus size={16} />} onClick={() => { setMsg(null); setAddOpen(true); }}>
                New Announcement
              </Button>
            ) : undefined}
          />
        ) : null}

        {/* SEARCH & FEED IN INTEGRATED CARD */}
        <SectionCard className="border-[color:color-mix(in_srgb,var(--color-border)_72%,white)] shadow-sm" padding={false}>
          <div className="flex gap-2 border-b border-[var(--color-border)] p-4 sm:items-center">
            <Input
              id="hr-announcements-search"
              data-testid="hr-announcements-search"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={16} />}
              containerClassName="min-w-0 flex-1 sm:max-w-md"
            />
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button
                type="button"
                id="hr-announcements-filter-button"
                data-testid="hr-announcements-filter-button"
                variant={appliedFilterCount > 0 ? "primary" : "outline"}
                icon={<Filter size={16} />}
                aria-label="Filter announcements"
                onClick={openFilters}
              >
                Filter{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ""}
              </Button>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs shrink-0">
                <button
                  type="button"
                  aria-label="Table view"
                  onClick={() => setViewMode("table")}
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                    viewMode === "table" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Rows3 size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Card view"
                  onClick={() => setViewMode("cards")}
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                    viewMode === "cards" ? "bg-teal-50 text-teal-700 font-bold" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* FEED / TABLE */}
          {showTable ? (
            <div data-testid="hr-announcements-table-container">
              <DataTable
                data-testid="hr-announcements-table"
                data={items}
                columns={columns}
                getRowId={(a) => a.id}
                loading={ann.loading}
                className="rounded-none border-0 bg-transparent shadow-none"
                tableClassName="w-full min-w-0"
                emptyState={
                  <EmptyState
                    icon={<Megaphone size={36} strokeWidth={1.5} />}
                    title="No announcements yet"
                    description="Official updates, policy releases, and company news will appear here."
                  />
                }
              />
            </div>
          ) : (
        <div className="p-5 sm:p-6 grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {ann.loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : items.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", background: "var(--surface-bg)", borderRadius: 24, padding: "32px 0", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <EmptyState
                icon={<Megaphone size={40} className="text-gray-300" style={{ display: "inline" }} />}
                title="No announcements yet"
                description="Stay tuned! Official updates, policy releases, and company news will appear here."
              />
            </div>
          ) : items.map((a) => {
            const color = typeColor(a.type);
            return (
              <div key={a.id} className="rounded-2xl border-0 bg-slate-50/80 shadow-2xs transition-all hover:bg-slate-100/80 flex overflow-hidden">
                <div style={{ width: 6, background: color, flexShrink: 0 }} />
                <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between relative">
                  <div>
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap pr-8">
                      {a.isPinned && (
                        <div className="p-1 rounded bg-teal-500/10" title="Pinned Announcement">
                          <Pin size={14} color={TEAL} fill={TEAL} />
                        </div>
                      )}
                      <span className="rounded-full px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider text-white" style={{ background: color }}>
                        {a.type || "General"}
                      </span>
                      {a.targetAudience?.targetType === "TARGETED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-sky-800">
                          <Target size={10} /> Targeted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-600">
                          <Globe size={10} /> All Staff
                        </span>
                      )}
                      {a.mandatoryAck && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900">
                          <ShieldAlert size={10} /> Mandatory
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 ml-auto">
                        <Calendar size={12} /> {formatDate(a.startDate) || "Recently"}
                      </span>
                    </div>
                    {!isEmployeeLogin ? (
                      <div className="absolute top-5 right-5">
                        <Popover
                          data-testid={`announcement-action-${a.id}`}
                          align="end"
                          contentClassName="min-w-[140px] p-2"
                          trigger={
                            <button
                              type="button"
                              aria-label="More actions"
                              className="inline-flex items-center justify-center p-1 text-slate-400 hover:text-slate-600"
                            >
                              <MoreVertical size={16} />
                            </button>
                          }
                        >
                          <PopoverSection>
                            <button
                              type="button"
                              className="flex w-full items-center rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                              onClick={() => handleToggleStatus(a.id, a.status || "Enabled")}
                            >
                              {a.status === "Disabled" ? "Enable" : "Disable"}
                            </button>
                          </PopoverSection>
                        </Popover>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h2 className="text-sm font-semibold text-slate-900 m-0">{a.title}</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${a.status === "Disabled" ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>{a.status || "Enabled"}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">{a.description}</p>
                    {a.attachments?.length ? (
                      <Button
                        type="button"
                        id={`hr-announcement-attachments-${a.id}`}
                        data-testid={`hr-announcement-attachments-${a.id}`}
                        variant="outline"
                        size="sm"
                        className="!h-7 text-xs !px-2.5 mb-3"
                        icon={<Paperclip size={13} />}
                        onClick={() => setAttachmentView(a)}
                      >
                        Attachments ({a.attachments.length})
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/70">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-teal-500/10 text-teal-700 flex items-center justify-center font-bold text-xs">A</div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-800">Official Update</div>
                      </div>
                    </div>
                    {isEmployeeLogin ? (
                      a.isAcknowledged ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                          <CheckCircle2 size={13} />
                          Acknowledged
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Button id={`hr-announcement-acknowledge-${a.id}`} data-testid={`hr-announcement-acknowledge-${a.id}`} variant="primary" size="sm" className="!h-7 text-xs" onClick={() => handleAcknowledge(a.id)}>Acknowledge</Button>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <button type="button" id={`hr-announcement-tracking-${a.id}`} data-testid={`hr-announcement-tracking-${a.id}`} onClick={() => setTracking(a)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/80 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-800 transition-colors cursor-pointer">
                            <CheckCircle2 size={13} className="text-slate-400" />
                            {a.acknowledgedBy?.length || 0} Acknowledged
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
        </SectionCard>
      </div>

      <Dialog
        open={!!attachmentView}
        onClose={() => setAttachmentView(null)}
        testId="hr-announcements-attachments-modal"
        title="Announcement Attachments"
        description={attachmentView?.title}
        contentClassName="max-w-[560px]"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {attachmentView?.attachments?.map((item, index) => {
            const attachmentItem = typeof item === "string" ? { filePath: item } : item;
            const href = attachmentItem.filePath || attachmentItem.shortUrl || attachmentItem.url;
            const fileName = attachmentItem.fileName || `Attachment ${index + 1}`;
            const fileType = String("fileType" in attachmentItem ? attachmentItem.fileType || "" : "").toLowerCase();
            const isImage = fileType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
            return (
              <div key={attachmentItem.fileUid || `${fileName}-${index}`} data-testid={`hr-announcement-attachment-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid var(--border-color)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {isImage && href ? (
                    <button type="button" onClick={() => setAttachmentPreview({ href, fileName })} aria-label={`Preview ${fileName}`} style={{ width: 44, height: 44, padding: 0, overflow: "hidden", flexShrink: 0, border: "1px solid var(--border-color)", borderRadius: 9, background: "rgba(100,116,139,0.04)", cursor: "pointer" }}>
                      <img src={href} alt="" loading="lazy" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
                    </button>
                  ) : (
                    <span style={{ width: 44, height: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: 9, background: "rgba(17,94,89,0.06)", color: TEAL }}><Paperclip size={17} /></span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dark-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
                    <div style={{ fontSize: 12, color: "var(--light-text)" }}>{attachmentItem.fileType || "Attachment"}</div>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={!href} onClick={() => {
                  if (!href) return;
                  if (isImage) setAttachmentPreview({ href, fileName });
                  else window.open(href, "_blank", "noopener,noreferrer");
                }}>
                  View
                </Button>
              </div>
            );
          })}
        </div>
      </Dialog>

      <Dialog
        open={!!attachmentPreview}
        onClose={() => setAttachmentPreview(null)}
        title={attachmentPreview?.fileName || "Attachment preview"}
        testId="hr-announcement-attachment-preview"
        contentClassName="max-w-4xl p-0 overflow-hidden"
      >
        {attachmentPreview ? (
          <div className="flex max-h-[78vh] flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[rgba(15,23,42,0.04)] p-4">
              <img src={attachmentPreview.href} alt={attachmentPreview.fileName} className="max-h-[62vh] max-w-full object-contain" />
            </div>
            <div className="flex items-center justify-end border-t border-[var(--border-color)] bg-[var(--surface-bg)] p-4">
              <a href={attachmentPreview.href} download={attachmentPreview.fileName} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 text-sm font-bold text-white no-underline">
                <Download size={16} /> Download
              </a>
            </div>
          </div>
        ) : null}
      </Dialog>


      {/* CREATE MODAL */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        testId="hr-announcements-create-modal"
        hideHeader
        contentClassName="max-w-[880px] h-auto max-h-[calc(100dvh-1rem)] p-0 overflow-hidden flex flex-col max-[640px]:!h-[100dvh] max-[640px]:!max-h-none max-[640px]:!max-w-none max-[640px]:!rounded-none"
        bodyClassName="flex min-h-0 flex-none flex-col overflow-hidden sm:flex-1"
      >
        <div className="max-[640px]:!p-4" style={{ background: "rgba(17,94,89,0.05)", padding: "24px 28px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", color: "var(--dark-text)", margin: 0 }}>Post New Announcement</h3>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--light-text)", margin: "4px 0 0" }}>Broadcast updates company-wide or send targeted notices to specific employee groups.</p>
            </div>
            <button id="hr-announcements-create-close" data-testid="hr-announcements-create-close" onClick={() => setAddOpen(false)} aria-label="Close create announcement modal" style={iconBtn}><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 max-h-[72vh]">
          {/* Section 1: Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="hr-announcements-title"
              data-testid="hr-announcements-title"
              label="Announcement Title"
              placeholder="e.g. Q3 Safety Protocol Update"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Select
              id="hr-announcements-category"
              testId="hr-announcements-category"
              label="Category / Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={TYPES.map((t) => ({ value: t, label: t }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DatePicker
              id="hr-announcements-start-date"
              label="Validity Start Date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <DatePicker
              id="hr-announcements-end-date"
              label="Validity End Date (Optional)"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>

          <Textarea
            id="hr-announcements-content"
            data-testid="hr-announcements-content"
            label="Announcement Content & Description"
            placeholder="Write the full announcement text here..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
          />

          <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Button
                id="hr-announcements-attachment"
                data-testid="hr-announcements-attachment"
                type="button"
                variant="outline"
                size="sm"
                icon={<Paperclip size={15} />}
                onClick={() => attachmentInputRef.current?.click()}
              >
                {attachments.length ? `${attachments.length} file${attachments.length === 1 ? "" : "s"} attached` : "Attach Files"}
              </Button>
              <input
                ref={attachmentInputRef}
                data-testid="hr-announcements-attachment-file"
                type="file"
                multiple
                hidden
                onChange={(event) => setAttachments(Array.from(event.target.files ?? []))}
              />
            </div>

            <div className="flex items-center gap-5">
              <Checkbox
                id="hr-announcements-pin-top"
                data-testid="hr-announcements-pin-top"
                label="Pin to top"
                checked={form.isPinned}
                onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
              />
              <Checkbox
                id="hr-announcements-mandatory-ack"
                data-testid="hr-announcements-mandatory-ack"
                label="Mandatory Acknowledgement"
                checked={form.mandatoryAck}
                onChange={(e) => setForm({ ...form, mandatoryAck: e.target.checked })}
              />
            </div>
          </div>

          {/* Section 2: Audience Targeting Control Panel */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-teal-700" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">Audience Targeting Control Panel</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">Define broadcast scope</span>
            </div>

            {/* Segmented Radio Buttons */}
            <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
              <button
                type="button"
                id="hr-announcement-target-all"
                data-testid="hr-announcement-target-all"
                onClick={() => setForm({ ...form, targetType: "ALL" })}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer",
                  form.targetType === "ALL"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900 bg-transparent"
                )}
              >
                <Globe size={15} /> 🌐 All Employees (Company-wide)
              </button>

              <button
                type="button"
                id="hr-announcement-target-groups"
                data-testid="hr-announcement-target-groups"
                onClick={() => setForm({ ...form, targetType: "TARGETED" })}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer",
                  form.targetType === "TARGETED"
                    ? "bg-teal-700 text-white shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900 bg-transparent"
                )}
              >
                <Target size={15} /> 🎯 Targeted Groups (Segmented)
              </button>
            </div>

            {/* Expanded Targeted Pickers */}
            {form.targetType === "TARGETED" && (
              <div className="space-y-4 pt-3 border-t border-slate-200">
                {/* Employment Types */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Briefcase size={12} /> Employment Types
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMPLOYMENT_TYPES.map((type) => {
                      const selected = form.targetEmploymentTypes.includes(type.value);
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? form.targetEmploymentTypes.filter((t) => t !== type.value)
                              : [...form.targetEmploymentTypes, type.value];
                            setForm({ ...form, targetEmploymentTypes: next });
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer",
                            selected
                              ? "bg-teal-50 border-teal-300 text-teal-900 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {selected ? "✓ " : "+ "}{type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Departments */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Building2 size={12} /> Departments
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPARTMENTS.map((dept) => {
                      const selected = form.targetDepartmentUids.includes(dept.id);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? form.targetDepartmentUids.filter((d) => d !== dept.id)
                              : [...form.targetDepartmentUids, dept.id];
                            setForm({ ...form, targetDepartmentUids: next });
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer",
                            selected
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {selected ? "✓ " : "+ "}{dept.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Designations / Roles */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Users size={12} /> Designations / Roles
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DESIGNATIONS.map((desig) => {
                      const selected = form.targetDesignationUids.includes(desig.id);
                      return (
                        <button
                          key={desig.id}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? form.targetDesignationUids.filter((d) => d !== desig.id)
                              : [...form.targetDesignationUids, desig.id];
                            setForm({ ...form, targetDesignationUids: next });
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer",
                            selected
                              ? "bg-purple-50 border-purple-300 text-purple-900 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {selected ? "✓ " : "+ "}{desig.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <MapPin size={12} /> Locations
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {LOCATIONS.map((loc) => {
                      const selected = form.targetLocationUids.includes(loc.id);
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? form.targetLocationUids.filter((l) => l !== loc.id)
                              : [...form.targetLocationUids, loc.id];
                            setForm({ ...form, targetLocationUids: next });
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer",
                            selected
                              ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {selected ? "✓ " : "+ "}{loc.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Audience Summary Bar */}
            <div className="rounded-lg bg-white border border-slate-200 p-2.5 text-xs font-semibold text-slate-700 flex items-center gap-2">
              <span className="text-teal-700 font-extrabold shrink-0">Audience Summary:</span>
              <span className="text-slate-600 truncate">{audienceSummary}</span>
            </div>
          </div>
        </div>

        {msg && <div style={{ margin: "0 24px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13, fontWeight: 600 }}>{msg}</div>}

        <div className="max-[480px]:!px-4 max-[480px]:[&>button]:flex-1" style={{ padding: "16px 24px", background: "rgba(100,116,139,0.04)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
          <Button
            id="hr-announcements-cancel"
            data-testid="hr-announcements-cancel"
            variant="outline"
            onClick={() => setAddOpen(false)}
          >
            Cancel
          </Button>
          <Button
            id="hr-announcements-submit"
            data-testid="hr-announcements-submit"
            variant="primary"
            onClick={post}
            loading={saving}
          >
            Post Announcement
          </Button>
        </div>
      </Dialog>

      {/* TRACKING MODAL */}
      <Dialog
        open={!!tracking}
        onClose={() => setTracking(null)}
        testId="hr-announcements-tracking-modal"
        hideHeader
        contentClassName="max-w-[440px] p-0 overflow-hidden"
      >
        {tracking && (
          <>
            <div style={{ padding: "24px 28px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.6px", color: "var(--dark-text)", margin: 0 }}>Acknowledgment Tracking</h3><p style={{ fontSize: 13, fontWeight: 500, color: "var(--light-text)", margin: "4px 0 0" }}>Staff who have acknowledged this announcement.</p></div>
              <button id="hr-announcements-tracking-close" data-testid="hr-announcements-tracking-close" onClick={() => setTracking(null)} aria-label="Close tracking modal" style={iconBtn}><X size={20} /></button>
            </div>
            <div style={{ padding: "8px 24px 24px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "60vh", overflowY: "auto" }}>
              {!tracking.acknowledgedBy?.length ? (
                <p style={{ textAlign: "center", color: "var(--light-text)", fontWeight: 500, padding: "32px 0" }}>No one has acknowledged this yet.</p>
              ) : tracking.acknowledgedBy.map((id) => {
                const emp = empMap.get(id);
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(100,116,139,0.06)", padding: 12, borderRadius: 16 }}>
                    <div style={{ height: 40, width: 40, borderRadius: 12, background: "rgba(17,94,89,0.1)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{emp?.name?.charAt(0) || "?"}</div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 900, fontSize: 13, color: "var(--dark-text)" }}>{emp?.name || "Unknown Staff"}</div><div style={{ fontSize: 12, color: "var(--light-text)", fontWeight: 500 }}>{emp?.designation || "Staff"}</div></div>
                    <CheckCircle2 size={18} color="#10b981" />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Dialog>

      {/* FILTER DRAWER */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Advanced Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="hr-announcements-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={announcementSearchSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No announcement filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-testid="hr-announcements-filter-reset"
              onClick={resetFilters}
            >
              Reset All
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              data-testid="hr-announcements-filter-apply"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 32, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh" };
