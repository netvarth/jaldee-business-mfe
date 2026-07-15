import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Plus, Search, Filter, Calendar, CheckCircle2, Pin, Paperclip, Loader2, AlertCircle, X, Megaphone, MoreVertical } from "lucide-react";
import { PageHeader, EmptyState, Select, DatePicker, Textarea, Dialog, SkeletonCard, Input, Checkbox, Button, Popover, PopoverSection } from "@jaldee/design-system";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";
import { useLocation } from "react-router-dom";
import { useEmployees } from "../../services/useEmployees";
import { useAnnouncements, type Announcement } from "../../services/useEngagement";
import { useMyProfile } from "../../services/useEss";
import { useTelemetry } from "../../services/useTelemetry";

const TEAL = "var(--primary-color)";
const TYPES = ["Policy", "Event", "Payroll", "General"];
const lbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--light-text)" };
const panel: CSSProperties = { background: "var(--surface-bg)", border: "1px solid rgba(148,163,184,0.16)", borderRadius: 16, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)" };
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
  const isEmployeeView = location.pathname.includes("/me/");
  const { data: employees } = useEmployees({ enabled: !isEmployeeView });
  const ann = useAnnouncements();
  const { data: myProfile } = useMyProfile();
  const { trackEvent, captureError } = useTelemetry();
  const isEmployeeLogin = isEmployeeView || (myProfile?.role || "").toLowerCase() === "employee";

  useEffect(() => {
    if (ann.error) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "StaffSpace",
        message: ann.error,
      });
    }
  }, [ann.error, eventBus]);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e] as const)), [employees]);

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [tracking, setTracking] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: "", type: "General", startDate: getTodayDateString(), endDate: "", isPinned: false, description: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const items = useMemo(() => {
    const q = search.toLowerCase();
    return ann.data
      .filter((a) => !q || (a.title || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q) || (a.type || "").toLowerCase().includes(q))
      .slice().sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [ann.data, search]);

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

      await ann.create({
        title: form.title,
        description: form.description,
        type: form.type,
        status: "Enabled",
        startDate: toLocalISOString(start),
        endDate: toLocalISOString(end),
        isPinned: form.isPinned,
        acknowledgedBy: []
      });
      trackEvent("hr.announcement.created", {
        type: form.type,
        isPinned: form.isPinned,
        hasEndDate: !!form.endDate,
      });
      setForm({ title: "", type: "General", startDate: getTodayDateString(), endDate: "", isPinned: false, description: "" });
      setAddOpen(false);
    } catch (e) {
      captureError(e instanceof Error ? e : new Error("Announcement create failed"));
      setMsg(e instanceof Error ? e.message : "Failed to post.");
    }
    finally { setSaving(false); }
  };

  const handleAcknowledge = async (id: string) => {
    if (!isEmployeeLogin) return;
    if (!myProfile?.id) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "StaffSpace",
        message: "Employee profile not loaded.",
      });
      return;
    }
    try {
      await ann.acknowledge(id, myProfile.id);
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
            title="StaffSpace"
            subtitle="Stay updated with the latest company news and policies."
            actions={!isEmployeeLogin ? <button id="hr-announcements-create-button" data-testid="hr-announcements-create-button" onClick={() => { setMsg(null); setAddOpen(true); }} style={{ height: 42, padding: "0 22px", borderRadius: 12, border: "none", cursor: "pointer", background: TEAL, color: "white", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Plus size={16} /> New Announcement</button> : undefined}
          />
        ) : null}

        {/* SEARCH */}
        <div style={{ ...panel, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <Input
            id="hr-announcements-search"
            data-testid="hr-announcements-search"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
            containerClassName="flex-1"
            className="h-12 rounded-xl bg-white text-base font-semibold shadow-sm"
          />
          <Button
            id="hr-announcements-filter-button"
            data-testid="hr-announcements-filter-button"
            variant="outline"
            size="lg"
            iconOnly
            icon={<Filter size={18} />}
            className="w-12 shrink-0 rounded-xl"
            aria-label="Filter announcements"
          />
        </div>



        {/* FEED */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 24 }}>
          {ann.loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : items.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", background: "var(--surface-bg)", borderRadius: 36, padding: "24px 0", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <EmptyState
                icon={<Megaphone size={40} className="text-gray-300" style={{ display: "inline" }} />}
                title="No announcements yet"
                description="Stay tuned! Official updates, policy releases, and company news will appear here."
              />
            </div>
          ) : items.map((a) => {
            const color = typeColor(a.type);
            return (
              <div key={a.id} style={{ background: a.isPinned ? "rgba(17,94,89,0.02)" : "var(--surface-bg)", borderRadius: 36, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: a.isPinned ? "2px solid rgba(17,94,89,0.2)" : "1px solid transparent", display: "flex" }}>
                <div style={{ width: 8, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "32px 36px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10, paddingRight: 32 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                        {a.isPinned && <div style={{ background: "rgba(17,94,89,0.1)", padding: 8, borderRadius: 12, display: "flex" }}><Pin size={16} color={TEAL} fill={TEAL} /></div>}
                        <span style={{ borderRadius: 999, padding: "5px 16px", fontWeight: 900, fontSize: 10, letterSpacing: "-0.2px", textTransform: "uppercase", color: "white", background: color }}>{a.type || "General"}</span>
                        <span style={{ borderRadius: 999, padding: "5px 16px", fontWeight: 900, fontSize: 10, letterSpacing: "-0.2px", textTransform: "uppercase", color: a.status === "Disabled" ? "#374151" : "#065f46", background: a.status === "Disabled" ? "#f3f4f6" : "#d1fae5" }}>{a.status || "Enabled"}</span>
                        <span style={{ ...lbl, display: "inline-flex", alignItems: "center", gap: 6 }}><Calendar size={12} /> {a.startDate ? new Date(a.startDate).toLocaleDateString() : "Recently"}</span>
                      </div>
                    </div>
                    {!isEmployeeLogin ? (
                      <div style={{ position: "absolute", top: 32, right: 36 }}>
                        <Popover
                          data-testid={`announcement-action-${a.id}`}
                          align="end"
                          contentClassName="min-w-[140px] p-2"
                          trigger={
                            <button
                              type="button"
                              aria-label="More actions"
                              style={{ background: "none", border: "none", color: "var(--light-text)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 4 }}
                            >
                              <MoreVertical size={20} />
                            </button>
                          }
                        >
                          <PopoverSection>
                            <button
                              type="button"
                              className="flex w-full items-center rounded-md px-3 py-2 text-left text-[length:var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)]"
                              onClick={() => handleToggleStatus(a.id, a.status || "Enabled")}
                            >
                              {a.status === "Disabled" ? "Enable" : "Disable"}
                            </button>
                          </PopoverSection>
                        </Popover>
                      </div>
                    ) : null}
                    <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", color: "var(--dark-text)", margin: "0 0 16px" }}>{a.title}</h2>
                    <p style={{ fontSize: 15, color: "var(--light-text)", fontWeight: 500, lineHeight: 1.6, margin: "0 0 32px" }}>{a.description}</p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24, paddingTop: 28, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ height: 48, width: 48, borderRadius: 16, background: "rgba(17,94,89,0.1)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18 }}>A</div>
                      <div><div style={{ ...lbl, color: "var(--dark-text)" }}>Official Update</div><div style={{ fontSize: 12, color: "var(--light-text)", fontWeight: 500 }}>Organization Board</div></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, ...lbl, color: "#10b981", marginBottom: 2 }}><CheckCircle2 size={14} /> Acknowledged</div>
                        <span id={`hr-announcement-tracking-${a.id}`} data-testid={`hr-announcement-tracking-${a.id}`} onClick={!isEmployeeLogin ? () => setTracking(a) : undefined} style={{ fontSize: 14, fontWeight: 900, color: "var(--light-text)", cursor: !isEmployeeLogin ? "pointer" : "default" }}>{a.acknowledgedBy?.length || 0} Staff</span>
                      </div>
                      {isEmployeeLogin ? (
                        <button id={`hr-announcement-acknowledge-${a.id}`} data-testid={`hr-announcement-acknowledge-${a.id}`} onClick={() => handleAcknowledge(a.id)} style={{ height: 48, padding: "0 30px", borderRadius: 16, border: "none", cursor: "pointer", background: TEAL, color: "white", fontWeight: 900, fontSize: 14, boxShadow: "0 8px 18px rgba(17,94,89,0.12)" }}>Acknowledge</button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* CREATE MODAL */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        testId="hr-announcements-create-modal"
        hideHeader
        contentClassName="max-w-[820px] p-0 overflow-hidden"
      >
        <div style={{ background: "rgba(17,94,89,0.05)", padding: "28px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><h3 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", color: "var(--dark-text)", margin: 0 }}>Create Announcement</h3><p style={{ fontSize: 13, fontWeight: 500, color: "var(--light-text)", margin: "4px 0 0" }}>Post a new update for all employees to see.</p></div>
            <button id="hr-announcements-create-close" data-testid="hr-announcements-create-close" onClick={() => setAddOpen(false)} aria-label="Close create announcement modal" style={iconBtn}><X size={20} /></button>
          </div>
        </div>
        <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 24 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 24, paddingTop: 4 }}>
              <Button
                id="hr-announcements-attachment"
                data-testid="hr-announcements-attachment"
                type="button"
                variant="outline"
                icon={<Paperclip size={16} />}
              >
                Add Attachment
              </Button>
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
        <div style={{ padding: "20px 28px", background: "rgba(100,116,139,0.04)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
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
    </section>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modalBox: CSSProperties = { background: "var(--surface-bg)", borderRadius: 32, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", overflow: "hidden", maxHeight: "92vh" };
const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" };
const ghostBtn: CSSProperties = { height: 44, padding: "0 22px", borderRadius: 12, border: "2px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const primaryBtn: CSSProperties = { height: 44, padding: "0 26px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 900, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
