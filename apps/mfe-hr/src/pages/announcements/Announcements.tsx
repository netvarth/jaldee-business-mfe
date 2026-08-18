import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Plus, Search, Filter, Calendar, CheckCircle2, Pin, Paperclip, Loader2, AlertCircle, X, Megaphone, MoreVertical, Download, LayoutGrid, Table as Rows3 } from "lucide-react";
import { Badge, Button, DataTable, EmptyState, Select, DatePicker, Textarea, Dialog, SkeletonCard, Input, Checkbox, Popover, PopoverSection, Drawer, SectionCard } from "@jaldee/design-system";
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
import { useAnnouncements, type Announcement } from "../../services/useEngagement";
import { useAnnouncementSearchSchema } from "../../services/useAnnouncementSearchSchema";
import { useTelemetry } from "../../services/useTelemetry";
import { HR_ANALYTICS_BACK, isAnalyticsNavigation } from "../../lib/hrNavigation";
import { formatDate } from "../../lib/utils";
import { useHrAttachmentUpload } from "../../services/useHrAttachmentUpload";

const TEAL = "var(--primary-color)";
const TYPES = ["Policy", "Event", "Payroll", "General"];
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
  const [form, setForm] = useState({ title: "", type: "General", startDate: getTodayDateString(), endDate: "", isPinned: false, description: "" });
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const uploadAttachment = useHrAttachmentUpload();
  const [msg, setMsg] = useState<string | null>(null);
  const { data: employees } = useEmployees({ enabled: !isEmployeeView && Boolean(tracking) });
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

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const columns = useMemo<ColumnDef<Announcement>[]>(() => [
    {
      key: "type",
      header: "Type",
      width: "14%",
      render: (a) => (
        <span style={{ borderRadius: 999, padding: "4px 14px", fontWeight: 900, fontSize: 10, letterSpacing: "-0.2px", textTransform: "uppercase", color: "white", background: typeColor(a.type), display: "inline-block" }}>
          {a.type || "General"}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Start Date",
      width: "16%",
      render: (a) => (
        <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
          {formatDate(a.startDate) || "Recently"}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      width: "42%",
      render: (a) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-sm text-[var(--color-text-primary)]">
            {a.isPinned && <Pin size={14} color={TEAL} fill={TEAL} className="shrink-0" />}
            <span className="truncate">{a.title}</span>
          </div>
          {a.description && <div className="mt-0.5 text-xs text-[var(--color-text-secondary)] line-clamp-1">{a.description}</div>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "14%",
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
      key: "actions",
      header: "Actions",
      width: "18%",
      align: "right",
      render: (a) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {a.attachments?.length ? (
            <Button variant="outline" size="sm" icon={<Paperclip size={14} />} onClick={() => setAttachmentView(a)}>
              {a.attachments.length}
            </Button>
          ) : null}
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
          {viewMode === "table" ? (
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
                    <div className="flex items-center gap-2 mb-3 flex-wrap pr-8">
                      {a.isPinned && <div className="p-1 rounded bg-teal-500/10"><Pin size={14} color={TEAL} fill={TEAL} /></div>}
                      <span className="rounded-full px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider text-white" style={{ background: color }}>{a.type || "General"}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Calendar size={12} /> {formatDate(a.startDate) || "Recently"}</span>
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
                          <span id={`hr-announcement-tracking-${a.id}`} data-testid={`hr-announcement-tracking-${a.id}`} onClick={() => setTracking(a)} className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer">{a.acknowledgedBy?.length || 0} Staff</span>
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
        contentClassName="max-w-[820px] h-auto max-h-[calc(100dvh-1rem)] p-0 overflow-hidden flex flex-col max-[640px]:!h-[100dvh] max-[640px]:!max-h-none max-[640px]:!max-w-none max-[640px]:!rounded-none"
        bodyClassName="flex min-h-0 flex-none flex-col overflow-hidden sm:flex-1"
      >
        <div className="max-[640px]:!p-4" style={{ background: "rgba(17,94,89,0.05)", padding: "28px 32px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><h3 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", color: "var(--dark-text)", margin: 0 }}>Create Announcement</h3><p style={{ fontSize: 13, fontWeight: 500, color: "var(--light-text)", margin: "4px 0 0" }}>Post a new update for all employees to see.</p></div>
            <button id="hr-announcements-create-close" data-testid="hr-announcements-create-close" onClick={() => setAddOpen(false)} aria-label="Close create announcement modal" style={iconBtn}><X size={20} /></button>
          </div>
        </div>
        <div className="max-[640px]:!grid-cols-1 max-[640px]:!content-start max-[640px]:!gap-4 max-[640px]:!p-4" style={{ padding: 28, display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 24, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Input
              id="hr-announcements-title"
              data-testid="hr-announcements-title"
              label="Title"
              placeholder="Enter a catchy title…"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Select
              id="hr-announcements-category"
              testId="hr-announcements-category"
              label="Category"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={TYPES.map((t) => ({ value: t, label: t }))}
            />
            <div className="max-[480px]:!grid-cols-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DatePicker
                id="hr-announcements-start-date"
                label="Start Date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <DatePicker
                id="hr-announcements-end-date"
                label="End Date (Optional)"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="max-[480px]:!items-start max-[480px]:!gap-4" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 24, paddingTop: 4, flexWrap: "wrap" }}>
              <Button
                id="hr-announcements-attachment"
                data-testid="hr-announcements-attachment"
                type="button"
                variant="outline"
                icon={<Paperclip size={16} />}
                onClick={() => attachmentInputRef.current?.click()}
              >
                {attachments.length ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} selected` : "Add Attachment"}
              </Button>
              <input
                ref={attachmentInputRef}
                data-testid="hr-announcements-attachment-file"
                type="file"
                multiple
                hidden
                onChange={(event) => setAttachments(Array.from(event.target.files ?? []))}
              />
              <Checkbox
                id="hr-announcements-pin-top"
                data-testid="hr-announcements-pin-top"
                label="Pin to top"
                checked={form.isPinned}
                onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Textarea
              id="hr-announcements-content"
              data-testid="hr-announcements-content"
              label="Content"
              placeholder="Write your announcement here…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={8}
            />
          </div>
        </div>
        {msg && <div style={{ margin: "0 28px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
        <div className="max-[480px]:!px-4 max-[480px]:[&>button]:flex-1" style={{ padding: "20px 28px", background: "rgba(100,116,139,0.04)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
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
const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" };
