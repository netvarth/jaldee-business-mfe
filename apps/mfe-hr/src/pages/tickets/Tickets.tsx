import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Plus, Search, Filter, MessageSquare, Clock, CheckCircle2, AlertCircle, Send, Paperclip, Loader2, X } from "lucide-react";
import { Input, Select, Textarea, EmptyState, Dialog, SkeletonCard, Button, Drawer, DataTablePagination } from "@jaldee/design-system";
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
import { useTickets, type Ticket } from "../../services/useEngagement";
import { useTicketSearchSchema } from "../../services/useHrSearchSchema";
import { useMyProfile } from "../../services/useEss";
import { HR_ANALYTICS_BACK, isAnalyticsNavigation } from "../../lib/hrNavigation";

const TEAL = "var(--primary-color)";
const CATEGORIES = ["Payroll", "IT Support", "HR Policy", "Admin/Facility"];
const lbl: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--light-text)",
};
const field: CSSProperties = {
  width: "100%",
  height: 52,
  borderRadius: 16,
  border: "none",
  background: "rgba(100,116,139,0.06)",
  padding: "0 16px",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--dark-text)",
};
const panel: CSSProperties = {
  background: "var(--surface-bg)",
  border: "1px solid rgba(148,163,184,0.16)",
  borderRadius: 8,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
};
const sectionStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

function statusBar(s?: string): string {
  if (s === "Open") return "#3b82f6";
  if (s === "In Progress") return "#f59e0b";
  return "#10b981";
}

function statusBadge(s?: string): { bg: string; icon: ReactNode } {
  if (s === "Resolved") return { bg: "#10b981", icon: <CheckCircle2 size={12} /> };
  if (s === "In Progress") return { bg: "#f59e0b", icon: <Clock size={12} /> };
  return { bg: "#3b82f6", icon: <AlertCircle size={12} /> };
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: ReactNode }) {
  return (
    <div style={{ ...panel, padding: 16, borderRadius: 8, display: "flex", alignItems: "center", gap: 12, minHeight: 82 }}>
      <div
        style={{
          height: 38,
          width: 38,
          borderRadius: 6,
          background: `${tone}18`,
          color: tone,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ ...lbl, marginBottom: 3 }}>{label}</p>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.8px", lineHeight: 1.05, color: "var(--dark-text)" }}>{value}</div>
      </div>
    </div>
  );
}

export default function Tickets() {
  const { eventBus } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const fromAnalytics = isAnalyticsNavigation(location.state);
  const isEmployeeView = location.pathname.includes("/me/");
  const { data: employees } = useEmployees({ enabled: !isEmployeeView });
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsPageSize, setTicketsPageSize] = useState(20);
  const { schema: ticketSchema, loading: schemaLoading } = useTicketSearchSchema();
  const tickets = useTickets(advancedFilters, ticketSchema, { enabled: !schemaLoading, page: ticketsPage - 1, pageSize: ticketsPageSize });
  const { data: myProfile } = useMyProfile({ enabled: isEmployeeView });

  useEffect(() => {
    if (tickets.error) {
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "error",
        title: "Helpdesk",
        message: tickets.error,
      });
    }
  }, [tickets.error, eventBus]);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e] as const)), [employees]);
  const empName = (uid?: string) => {
    if (uid && myProfile?.id === uid) return myProfile.name ?? "Employee";
    return uid ? empMap.get(uid)?.name ?? "Staff" : "Staff";
  };

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [closeTarget, setCloseTarget] = useState<Ticket | null>(null);
  const [form, setForm] = useState({ employeeUid: "", title: "", category: "Payroll", priority: "Medium", description: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeRemarks, setCloseRemarks] = useState("");
  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, ticketSchema).length,
    [advancedFilters, ticketSchema]
  );

  const openFilters = () => {
    setDraftFilters(advancedFilters.length ? advancedFilters : buildDefaultSearchClauses(ticketSchema));
    setFiltersOpen(true);
  };
  const clearFilters = () => {
    const reset = buildDefaultSearchClauses(ticketSchema);
    setDraftFilters(reset);
    setAdvancedFilters(reset);
    setTicketsPage(1);
  };
  const resetFilters = () => { clearFilters(); setFiltersOpen(false); };
  const applyFilters = () => { setAdvancedFilters(draftFilters); setTicketsPage(1); setFiltersOpen(false); };

  const scopedTickets = useMemo(
    () => (isEmployeeView && myProfile?.id ? tickets.data.filter((t) => t.employeeUid === myProfile.id) : tickets.data),
    [isEmployeeView, myProfile?.id, tickets.data],
  );

  const counts = useMemo(
    () => ({
      open: scopedTickets.filter((t) => t.status === "Open").length,
      progress: scopedTickets.filter((t) => t.status === "In Progress").length,
      resolved: scopedTickets.filter((t) => t.status === "Resolved").length,
      total: scopedTickets.length,
    }),
    [scopedTickets],
  );

  const items = useMemo(() => {
    const q = search.toLowerCase();
    return scopedTickets.filter(
      (t) =>
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        (t.id || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q),
    );
  }, [scopedTickets, search]);

  const raise = async () => {
    const employeeUid = isEmployeeView ? myProfile?.id || "" : form.employeeUid;
    if (!employeeUid || !form.title || !form.description) {
      setMsg("Employee, subject and description are required.");
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      await tickets.create({
        employeeUid,
        title: form.title,
        category: form.category,
        description: form.description,
        department: form.category.toUpperCase(),
        status: "Open",
        responses: [],
      });
      setForm({ employeeUid: "", title: "", category: "Payroll", priority: "Medium", description: "" });
      setAddOpen(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to raise ticket.");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;

    setReplying(true);
    try {
      await tickets.reply(selected.id, replyText.trim());
      setReplyText("");
      const fresh = tickets.data.find((t) => t.id === selected.id);
      if (fresh) setSelected(fresh);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Reply failed.");
    } finally {
      setReplying(false);
    }
  };

  const closeTicket = async () => {
    if (!closeTarget || closing) return;
    if (!closeRemarks.trim()) {
      setMsg("Closure remarks are required.");
      return;
    }
    setClosing(true);
    setMsg(null);
    try {
      await tickets.close(closeTarget.id, closeRemarks.trim());
      setSelected((current) => current?.id === closeTarget.id ? { ...current, status: "Closed" } : current);
      setCloseRemarks("");
      setCloseTarget(null);
      eventBus?.emit(SHELL_TOAST_EVENT, {
        intent: "success",
        title: "Helpdesk",
        message: "Ticket closed successfully.",
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to close ticket.");
    } finally {
      setClosing(false);
    }
  };

  const liveSelected = selected ? tickets.data.find((t) => t.id === selected.id) ?? selected : null;

  return (
    <section id="hr-tickets-page" data-testid="hr-tickets-page" className="page-section active hr-page-shell">
      <div style={sectionStack}>
        {!isEmployeeView ? (
          <PageHeader
            variant={fromAnalytics ? "navigation" : "default"}
            back={fromAnalytics ? HR_ANALYTICS_BACK : undefined}
            onNavigate={(href) => navigate(href)}
            title="HR Helpdesk"
            subtitle="Raise and track your HR or admin-related issues."
            actions={
              <Button
                id="hr-tickets-create-button"
                data-testid="hr-tickets-create-button"
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setMsg(null);
                  setAddOpen(true);
                }}
              >
                Raise New Ticket
              </Button>
            }
          />
        ) : null}

        {isEmployeeView ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              id="hr-tickets-create-button"
              data-testid="hr-tickets-create-button"
              variant="primary"
              className="bg-[linear-gradient(135deg,#0f766e_0%,#0f9f8c_100%)] text-white hover:brightness-95 active:brightness-90"
              icon={<Plus size={16} />}
              onClick={() => {
                setMsg(null);
                setAddOpen(true);
              }}
            >
              New Ticket
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
          <StatCard label="Open Tickets" value={counts.open} tone="#3b82f6" icon={<AlertCircle size={22} />} />
          <StatCard label="In Progress" value={counts.progress} tone="#f59e0b" icon={<Clock size={22} />} />
          <StatCard label="Resolved (MTD)" value={counts.resolved} tone="#10b981" icon={<CheckCircle2 size={22} />} />
          <StatCard label="Total Tickets" value={counts.total} tone={TEAL} icon={<Send size={22} />} />
          <div aria-hidden="true" className="hidden xl:block" />
        </div>

        <div
          style={{
            ...panel,
            padding: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Input
            id="hr-tickets-search"
            data-testid="hr-tickets-search"
            placeholder="Search tickets by ID or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
            containerClassName="flex-1"
            className="h-12 rounded-xl bg-white text-base font-semibold shadow-sm"
          />
          {!isEmployeeView ? (
            <Button
              id="hr-tickets-filter-button"
              data-testid="hr-tickets-filter-button"
              variant={appliedFilterCount > 0 ? "primary" : "outline"}
              icon={<Filter size={16} />}
              aria-label="Filter tickets"
              onClick={openFilters}
            >
              Filter{appliedFilterCount > 0 ? ` (${appliedFilterCount})` : ""}
            </Button>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {tickets.loading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : items.length === 0 ? (
            <div style={{ ...panel, padding: "24px 0" }}>
              <EmptyState
                icon={<MessageSquare size={40} />}
                title={search.trim() ? "No matching tickets" : "No helpdesk tickets yet"}
                description={
                  search.trim()
                    ? "Try a different ticket ID, subject, or keyword."
                    : "Raise your first HR or administration request and track its progress here."
                }
                action={
                  search.trim() ? (
                    <Button variant="outline" onClick={() => setSearch("")}>Clear search</Button>
                  ) : (
                    <Button
                      variant="primary"
                      className={isEmployeeView ? "bg-[linear-gradient(135deg,#0f766e_0%,#0f9f8c_100%)] text-white hover:brightness-95 active:brightness-90" : undefined}
                      icon={<Plus size={16} />}
                      onClick={() => {
                        setMsg(null);
                        setAddOpen(true);
                      }}
                    >
                      Raise New Ticket
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            items.map((t) => {
              const sb = statusBadge(t.status);
              return (
                <div
                  key={t.id}
                  data-testid={`hr-ticket-card-${t.id}`}
                  onClick={() => {
                    setMsg(null);
                    setReplyText("");
                    setSelected(t);
                  }}
                  style={{ ...panel, borderRadius: 8, overflow: "hidden", display: "flex", cursor: "pointer" }}
                >
                  <div style={{ width: 6, background: statusBar(t.status), flexShrink: 0 }} />
                  <div
                    className="grid grid-cols-1 min-[981px]:grid-cols-[minmax(0,1fr)_auto] gap-[18px]"
                    style={{
                      flex: 1,
                      padding: "16px 18px",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span
                          style={{
                            ...lbl,
                            color: TEAL,
                            background: "rgba(17,94,89,0.05)",
                            padding: "3px 8px",
                            borderRadius: 4,
                            letterSpacing: "0.08em",
                          }}
                        >
                          {(t.id || "").slice(-6).toUpperCase()}
                        </span>
                        <span
                          style={{
                            borderRadius: 4,
                            padding: "4px 10px",
                            fontWeight: 900,
                            fontSize: 10,
                            letterSpacing: "-0.1px",
                            textTransform: "uppercase",
                            color: "var(--dark-text)",
                            border: "1px solid rgba(148,163,184,0.2)",
                            background: "rgba(248,250,252,0.9)",
                          }}
                        >
                          {t.category}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.3px", color: "var(--dark-text)", margin: "0 0 4px" }}>{t.title}</h3>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--light-text)",
                          fontWeight: 500,
                          lineHeight: 1.45,
                          margin: 0,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {t.description}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        background: "rgba(248,250,252,0.92)",
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(148,163,184,0.14)",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <p style={{ ...lbl, fontSize: 9, marginBottom: 4 }}>Created</p>
                        <p style={{ fontSize: 12, fontWeight: 900, color: "var(--dark-text)" }}>{t.createdAtTs ? new Date(t.createdAtTs).toLocaleDateString() : "N/A"}</p>
                      </div>
                      <div>
                        <p style={{ ...lbl, fontSize: 9, marginBottom: 4 }}>Dept</p>
                        <p style={{ fontSize: 12, fontWeight: 900, color: "var(--dark-text)" }}>{t.department || "-"}</p>
                      </div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          borderRadius: 4,
                          padding: "4px 10px",
                          fontWeight: 900,
                          fontSize: 10,
                          letterSpacing: "-0.2px",
                          textTransform: "uppercase",
                          color: "white",
                          background: sb.bg,
                        }}
                      >
                        {sb.icon} {t.status}
                      </span>
                      {String(t.status || "").toLowerCase() !== "closed" ? (
                        <Button
                          id={`hr-ticket-card-close-${t.id}`}
                          data-testid={`hr-ticket-card-close-${t.id}`}
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMsg(null);
                            setCloseRemarks("");
                            setCloseTarget(t);
                          }}
                        >
                          Close Ticket
                        </Button>
                      ) : null}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--light-text)" }}>
                        <MessageSquare size={16} />
                        <span style={{ fontSize: 13, fontWeight: 900 }}>{t.responses?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <DataTablePagination
            testId="hr-tickets-pagination"
            page={ticketsPage}
            pageSize={ticketsPageSize}
            total={tickets.totalElements}
            onChange={setTicketsPage}
            onPageSizeChange={(size) => {
              setTicketsPageSize(size);
              setTicketsPage(1);
            }}
          />
        </div>
      </div>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        testId="hr-tickets-create-modal"
        hideHeader
        contentClassName="max-w-[820px] p-0 overflow-hidden"
      >
        <div style={{ background: "rgba(17,94,89,0.05)", padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1px", color: "var(--dark-text)", margin: 0 }}>Raise a Ticket</h3>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--light-text)", margin: "4px 0 0" }}>Provide details about your issue so we can help you better.</p>
          </div>
          <button id="hr-tickets-create-close" data-testid="hr-tickets-create-close" onClick={() => setAddOpen(false)} style={iconBtn}><X size={20} /></button>
        </div>
        <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="max-[820px]:grid-cols-1">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {!isEmployeeView ? (
              <Select
                id="hr-tickets-employee"
                testId="hr-tickets-employee"
                label="Claimant Employee"
                value={form.employeeUid}
                onChange={(e) => setForm({ ...form, employeeUid: e.target.value })}
                placeholder="Select employee"
                options={employees.map((e) => ({ value: e.id, label: e.name }))}
              />
            ) : (
              <div>
                <label style={lbl}>Employee</label>
                <div style={{ ...field, marginTop: 6, display: "flex", alignItems: "center" }}>{myProfile?.name || "Employee"}</div>
              </div>
            )}
            <Input
              id="hr-tickets-subject"
              data-testid="hr-tickets-subject"
              label="Subject"
              placeholder="Brief summary of the issue..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Select
                id="hr-tickets-category"
                testId="hr-tickets-category"
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Select
                id="hr-tickets-priority"
                testId="hr-tickets-priority"
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                options={["Low", "Medium", "High"].map((p) => ({ value: p, label: p }))}
              />
            </div>
            <Button id="hr-tickets-attachment" data-testid="hr-tickets-attachment" type="button" variant="outline" icon={<Paperclip size={16} />}>Attachment (Optional)</Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Textarea
              id="hr-tickets-description"
              data-testid="hr-tickets-description"
              label="Description"
              placeholder="Provide more details about your issue..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={9}
            />
          </div>
        </div>
        {msg && <div style={{ margin: "0 28px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
        <div style={{ padding: "20px 28px", background: "rgba(100,116,139,0.04)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Button id="hr-tickets-cancel" data-testid="hr-tickets-cancel" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button id="hr-tickets-submit" data-testid="hr-tickets-submit" variant="primary" className={isEmployeeView ? "bg-[linear-gradient(135deg,#0f766e_0%,#0f9f8c_100%)] text-white hover:brightness-95 active:brightness-90" : undefined} onClick={raise} loading={saving}>Submit Ticket</Button>
        </div>
      </Dialog>

      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Ticket Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden" data-testid="hr-tickets-filter-drawer">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <SchemaFilterBuilder
              schema={ticketSchema}
              value={draftFilters}
              onChange={setDraftFilters}
              appliedCount={appliedFilterCount}
              onClearAll={clearFilters}
              emptyStateMessage="No ticket filters are available from the schema."
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-gray-200 p-5">
            <Button type="button" variant="outline" className="flex-1" data-testid="hr-tickets-filter-reset" onClick={resetFilters}>Reset All</Button>
            <Button type="button" variant="primary" className="flex-1" data-testid="hr-tickets-filter-apply" onClick={applyFilters}>Apply Filters</Button>
          </div>
        </div>
      </Drawer>

      <Dialog
        open={!!closeTarget}
        onClose={() => {
          if (!closing) {
            setCloseTarget(null);
            setCloseRemarks("");
            setMsg(null);
          }
        }}
        testId="hr-tickets-close-modal"
        title="Close Ticket"
        description={closeTarget ? `Add a closure reason for ticket ${(closeTarget.id || "").slice(-6).toUpperCase()}.` : undefined}
        contentClassName="max-w-[520px]"
      >
        <div className="space-y-5">
          <Textarea
            id="hr-tickets-close-reason"
            data-testid="hr-tickets-close-reason"
            label="Closure reason"
            placeholder="Explain why this ticket is being closed..."
            value={closeRemarks}
            onChange={(event) => setCloseRemarks(event.target.value)}
            rows={5}
            disabled={closing}
          />
          {msg ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{msg}</div> : null}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCloseTarget(null)} disabled={closing}>Cancel</Button>
            <Button id="hr-tickets-close-confirm" data-testid="hr-tickets-close-confirm" variant="primary" onClick={closeTicket} loading={closing} disabled={!closeRemarks.trim()}>Close Ticket</Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!liveSelected}
        onClose={() => setSelected(null)}
        testId="hr-tickets-detail-modal"
        hideHeader
        contentClassName="max-w-[620px] p-0 overflow-hidden"
      >
        {liveSelected && (
          <>
            <div style={{ background: "rgba(17,94,89,0.05)", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ ...lbl, color: TEAL, background: "rgba(17,94,89,0.08)", padding: "3px 10px", borderRadius: 8 }}>{(liveSelected.id || "").slice(-6).toUpperCase()}</span>
                  {(() => {
                    const sb = statusBadge(liveSelected.status);
                    return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, padding: "3px 12px", fontWeight: 900, fontSize: 9, textTransform: "uppercase", color: "white", background: sb.bg }}>{sb.icon} {liveSelected.status}</span>;
                  })()}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.8px", color: "var(--dark-text)", margin: 0 }}>{liveSelected.title}</h3>
                <p style={{ ...lbl, marginTop: 4 }}>{liveSelected.category} · {empName(liveSelected.employeeUid)}</p>
              </div>
              <button id="hr-tickets-detail-close" data-testid="hr-tickets-detail-close" onClick={() => setSelected(null)} style={iconBtn}><X size={20} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, maxHeight: "62vh", overflowY: "auto" }}>
              <div style={{ background: "rgba(100,116,139,0.04)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 16 }}>
                <span style={{ ...lbl, fontSize: 9 }}>Issue Description</span>
                <p style={{ fontSize: 14.5, fontWeight: 500, color: "var(--dark-text)", lineHeight: 1.5, margin: "8px 0 0" }}>{liveSelected.description}</p>
              </div>
              <div>
                <span style={{ ...lbl, fontSize: 9, marginBottom: 10, display: "block" }}>Conversation ({liveSelected.responses?.length || 0})</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {!liveSelected.responses?.length ? (
                    <p style={{ fontSize: 13, color: "var(--light-text)", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>No replies yet. Start the conversation below.</p>
                  ) : (
                    liveSelected.responses.map((r) => {
                      const replyKey =
                        `${r.respondedAt || r.respondedBy || "reply"}-${(r.message || "").slice(0, 24)}`
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "") || "reply";
                      return (
                        <div key={replyKey} data-testid={`hr-ticket-reply-${liveSelected.id}-${replyKey}`} style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ ...lbl, fontSize: 9, color: TEAL }}>{r.respondedBy || "Support Desk"}</span>
                            <span style={{ ...lbl, fontSize: 8 }}>{r.respondedAt ? new Date(r.respondedAt).toLocaleString() : ""}</span>
                          </div>
                          <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--dark-text)", margin: 0 }}>{r.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 10 }}>
              <input id="hr-tickets-reply-input" data-testid="hr-tickets-reply-input" placeholder="Write a reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} style={{ ...field, height: 46, borderRadius: 14 }} />
              <Button id="hr-tickets-reply-send" data-testid="hr-tickets-reply-send" variant="primary" onClick={sendReply} disabled={!replyText.trim()} loading={replying} icon={<Send size={16} />}>Send</Button>
            </div>
            {msg && <div style={{ margin: "0 24px 16px", padding: "10px 14px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)", color: "#e11d48", borderRadius: 12, fontSize: 13 }}>{msg}</div>}
          </>
        )}
      </Dialog>
    </section>
  );
}

const iconBtn: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--light-text)" };
