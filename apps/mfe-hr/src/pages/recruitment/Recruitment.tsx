import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Award, Briefcase, CalendarDays, FileText, LayoutDashboard, Loader2, Plus, Search, UserPlus, Users } from "lucide-react";
import { Dialog, Input, Select, Textarea } from "@jaldee/design-system";
import { HrPageHeader as PageHeader } from "../../components/HrPageHeader";
import { useMFEProps, SHELL_TOAST_EVENT } from "@jaldee/auth-context";

type RecruitmentTab = "dashboard" | "requisitions" | "candidates" | "applications" | "interviews" | "offers";
type RequisitionStatus = "Open" | "Closed" | "On Hold" | "Draft";
type ApplicationStage = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
type OfferStatus = "Draft" | "Sent" | "Accepted" | "Declined" | "Withdrawn";

interface Requisition {
  id: string;
  title: string;
  department: string;
  branch: string;
  hiringManager: string;
  employmentType: string;
  openingsCount: number;
  experienceRequired: string;
  salaryMin: string;
  salaryMax: string;
  targetCloseDate: string;
  jobDescription: string;
  status: RequisitionStatus;
  applicants: number;
  createdAt: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  appliedAt: string;
}

interface Application {
  id: string;
  candidateId: string;
  candidateName: string;
  requisitionId: string;
  role: string;
  stage: ApplicationStage;
}

interface Interview {
  id: string;
  applicationId: string;
  candidateName: string;
  role: string;
  round: string;
  scheduledAt: string;
  mode: string;
  interviewers: string;
  score: string;
  feedback: string;
}

interface Offer {
  id: string;
  applicationId: string;
  candidateName: string;
  role: string;
  salary: string;
  status: OfferStatus;
  sentAt?: string;
}

const ROUTES: Array<{ key: RecruitmentTab; route: string; label: string; icon: ReactNode }> = [
  { key: "dashboard", route: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={15} /> },
  { key: "requisitions", route: "requisitions", label: "Requisitions", icon: <Briefcase size={15} /> },
  { key: "candidates", route: "candidates", label: "Candidates", icon: <Users size={15} /> },
  { key: "applications", route: "applications", label: "Applications", icon: <FileText size={15} /> },
  { key: "interviews", route: "interviews", label: "Interviews", icon: <CalendarDays size={15} /> },
  { key: "offers", route: "offers", label: "Offers", icon: <Award size={15} /> },
];

const initialRequisitions: Requisition[] = [
  { id: "REQ-001", title: "Senior React Developer", department: "Engineering", branch: "Bengaluru", hiringManager: "Rahul Sharma", employmentType: "Full-time", openingsCount: 2, experienceRequired: "5+ years", salaryMin: "1800000", salaryMax: "2400000", targetCloseDate: "2026-07-31", jobDescription: "Senior frontend engineer for the core HR platform.", status: "Open", applicants: 12, createdAt: "2026-06-01" },
  { id: "REQ-002", title: "Product Manager", department: "Product", branch: "Mumbai HQ", hiringManager: "Priya Patel", employmentType: "Full-time", openingsCount: 1, experienceRequired: "3-5 years", salaryMin: "1500000", salaryMax: "2000000", targetCloseDate: "2026-08-15", jobDescription: "Product manager for employee experience workflows.", status: "Open", applicants: 5, createdAt: "2026-06-15" },
  { id: "REQ-003", title: "UX Designer", department: "Design", branch: "Remote", hiringManager: "Amit Kumar", employmentType: "Contract", openingsCount: 1, experienceRequired: "3+ years", salaryMin: "1200000", salaryMax: "1500000", targetCloseDate: "2026-06-30", jobDescription: "UX designer for recruitment and ESS product surfaces.", status: "Closed", applicants: 24, createdAt: "2026-05-10" },
];

const initialCandidates: Candidate[] = [
  { id: "CAN-001", name: "Vikram Singh", email: "vikram.singh@example.in", phone: "+91 98765 43210", source: "LinkedIn", appliedAt: "2026-06-20" },
  { id: "CAN-002", name: "Neha Gupta", email: "neha.gupta@example.in", phone: "+91 87654 32109", source: "Referral", appliedAt: "2026-06-22" },
  { id: "CAN-003", name: "Anil Desai", email: "anil.desai@example.in", phone: "+91 76543 21098", source: "Careers Page", appliedAt: "2026-06-25" },
];

const initialApplications: Application[] = [
  { id: "APP-001", candidateId: "CAN-001", candidateName: "Vikram Singh", requisitionId: "REQ-001", role: "Senior React Developer", stage: "SCREENING" },
  { id: "APP-002", candidateId: "CAN-002", candidateName: "Neha Gupta", requisitionId: "REQ-002", role: "Product Manager", stage: "INTERVIEW" },
  { id: "APP-003", candidateId: "CAN-003", candidateName: "Anil Desai", requisitionId: "REQ-001", role: "Senior React Developer", stage: "APPLIED" },
];

const initialInterviews: Interview[] = [
  { id: "INT-001", applicationId: "APP-002", candidateName: "Neha Gupta", role: "Product Manager", round: "Technical", scheduledAt: "2026-06-30T10:00", mode: "Video", interviewers: "Sunita Reddy", score: "8/10", feedback: "Strong product sense." },
];

const initialOffers: Offer[] = [
  { id: "OFF-001", applicationId: "APP-001", candidateName: "Vikram Singh", role: "Senior React Developer", salary: "2200000", status: "Draft" },
];

const TEAL = "var(--primary-color)";
const card: CSSProperties = { background: "var(--surface-bg)", border: "1px solid var(--border-color)", borderRadius: 16, overflow: "hidden" };
const th: CSSProperties = { textAlign: "left", padding: "11px 14px", fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)", background: "rgba(100,116,139,0.04)" };
const td: CSSProperties = { padding: "13px 14px", borderTop: "1px solid var(--border-color)", fontSize: 13, color: "var(--dark-text)", verticalAlign: "top" };
const lbl: CSSProperties = { fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--light-text)" };
const primaryBtn: CSSProperties = { height: 40, padding: "0 16px", borderRadius: 12, border: "none", background: TEAL, color: "white", fontWeight: 900, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 };
const ghostBtn: CSSProperties = { height: 40, padding: "0 14px", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--surface-bg)", color: "var(--dark-text)", fontWeight: 800, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 };

function tabFromPath(pathname: string): RecruitmentTab {
  const last = pathname.split("/").filter(Boolean).at(-1);
  const match = ROUTES.find((route) => route.route === last || route.key === last);
  return match?.key || "dashboard";
}

function statusPill(value: string): CSSProperties {
  const v = value.toLowerCase();
  const color = v.includes("open") || v.includes("accepted") || v.includes("hired") ? "#059669"
    : v.includes("closed") || v.includes("rejected") || v.includes("declined") ? "#e11d48"
      : v.includes("hold") || v.includes("draft") ? "#d97706"
        : "#2563eb";
  return { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "3px 9px", background: `${color}12`, color, border: `1px solid ${color}24`, fontSize: 10, fontWeight: 900 };
}

function nextId(prefix: string, count: number) {
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function Recruitment() {
  const { eventBus } = useMFEProps();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = tabFromPath(location.pathname);
  const [requisitions, setRequisitions] = useState(initialRequisitions);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [applications, setApplications] = useState(initialApplications);
  const [interviews, setInterviews] = useState(initialInterviews);
  const [offers, setOffers] = useState(initialOffers);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"requisition" | "candidate" | "interview" | "offer" | null>(null);
  const [saving, setSaving] = useState(false);
  const [reqForm, setReqForm] = useState({ title: "", department: "", branch: "", hiringManager: "", employmentType: "Full-time", openingsCount: "1", experienceRequired: "", salaryMin: "", salaryMax: "", targetCloseDate: "", jobDescription: "", status: "Open" as RequisitionStatus });
  const [candidateForm, setCandidateForm] = useState({ name: "", email: "", phone: "", source: "LinkedIn" });
  const [interviewForm, setInterviewForm] = useState({ applicationId: "", round: "Technical", date: "", time: "", mode: "Video", interviewers: "", score: "", feedback: "" });
  const [offerForm, setOfferForm] = useState({ applicationId: "", salary: "", status: "Draft" as OfferStatus });

  const stats = useMemo(() => ({
    openRequisitions: requisitions.filter((item) => item.status === "Open").length,
    totalCandidates: candidates.length,
    interviewsScheduled: interviews.length,
    offersPending: offers.filter((item) => item.status === "Draft" || item.status === "Sent").length,
    timeToFill: "18 days",
  }), [requisitions, candidates, interviews, offers]);

  const q = search.trim().toLowerCase();
  const filteredRequisitions = requisitions.filter((item) => !q || [item.title, item.department, item.hiringManager, item.status].some((value) => value.toLowerCase().includes(q)));
  const filteredCandidates = candidates.filter((item) => !q || [item.name, item.email, item.phone, item.source].some((value) => value.toLowerCase().includes(q)));
  const filteredInterviews = interviews.filter((item) => !q || [item.candidateName, item.role, item.round, item.interviewers].some((value) => value.toLowerCase().includes(q)));
  const filteredOffers = offers.filter((item) => !q || [item.candidateName, item.role, item.status].some((value) => value.toLowerCase().includes(q)));

  const toast = (intent: "success" | "error", title: string, message: string) => {
    eventBus?.emit(SHELL_TOAST_EVENT, { intent, title, message });
  };

  const createRequisition = async () => {
    if (!reqForm.title || !reqForm.department || !reqForm.jobDescription) {
      toast("error", "Recruitment", "Title, department and job description are required.");
      return;
    }
    setSaving(true);
    try {
      setRequisitions((items) => [{
        ...reqForm,
        id: nextId("REQ", items.length),
        openingsCount: Number(reqForm.openingsCount || 1),
        applicants: 0,
        createdAt: today(),
      }, ...items]);
      setDialog(null);
      setReqForm({ title: "", department: "", branch: "", hiringManager: "", employmentType: "Full-time", openingsCount: "1", experienceRequired: "", salaryMin: "", salaryMax: "", targetCloseDate: "", jobDescription: "", status: "Open" });
      toast("success", "Recruitment", "Requisition created.");
    } finally {
      setSaving(false);
    }
  };

  const createCandidate = async () => {
    if (!candidateForm.name || !candidateForm.email) {
      toast("error", "Recruitment", "Candidate name and email are required.");
      return;
    }
    setSaving(true);
    try {
      setCandidates((items) => [{ ...candidateForm, id: nextId("CAN", items.length), appliedAt: today() }, ...items]);
      setDialog(null);
      setCandidateForm({ name: "", email: "", phone: "", source: "LinkedIn" });
      toast("success", "Recruitment", "Candidate saved.");
    } finally {
      setSaving(false);
    }
  };

  const createInterview = async () => {
    const app = applications.find((item) => item.id === interviewForm.applicationId);
    if (!app || !interviewForm.date || !interviewForm.time || !interviewForm.interviewers) {
      toast("error", "Recruitment", "Candidate, date, time and interviewer are required.");
      return;
    }
    setSaving(true);
    try {
      setInterviews((items) => [{
        id: nextId("INT", items.length),
        applicationId: app.id,
        candidateName: app.candidateName,
        role: app.role,
        round: interviewForm.round,
        scheduledAt: `${interviewForm.date}T${interviewForm.time}`,
        mode: interviewForm.mode,
        interviewers: interviewForm.interviewers,
        score: interviewForm.score,
        feedback: interviewForm.feedback,
      }, ...items]);
      setApplications((items) => items.map((item) => item.id === app.id ? { ...item, stage: "INTERVIEW" } : item));
      setDialog(null);
      setInterviewForm({ applicationId: "", round: "Technical", date: "", time: "", mode: "Video", interviewers: "", score: "", feedback: "" });
      toast("success", "Recruitment", "Interview scheduled.");
    } finally {
      setSaving(false);
    }
  };

  const createOffer = async () => {
    const app = applications.find((item) => item.id === offerForm.applicationId);
    if (!app || !offerForm.salary) {
      toast("error", "Recruitment", "Candidate and salary are required.");
      return;
    }
    setSaving(true);
    try {
      setOffers((items) => [{ id: nextId("OFF", items.length), applicationId: app.id, candidateName: app.candidateName, role: app.role, salary: offerForm.salary, status: offerForm.status }, ...items]);
      setApplications((items) => items.map((item) => item.id === app.id ? { ...item, stage: "OFFER" } : item));
      setDialog(null);
      setOfferForm({ applicationId: "", salary: "", status: "Draft" });
      toast("success", "Recruitment", "Offer saved.");
    } finally {
      setSaving(false);
    }
  };

  const updateApplicationStage = (id: string, stage: ApplicationStage) => {
    setApplications((items) => items.map((item) => item.id === id ? { ...item, stage } : item));
    toast("success", "Application", `Moved to ${stage}.`);
  };

  const updateOfferStatus = (id: string, status: OfferStatus) => {
    setOffers((items) => items.map((item) => item.id === id ? { ...item, status, sentAt: status === "Sent" ? today() : item.sentAt } : item));
    toast(status === "Declined" ? "error" : "success", "Offer", `Offer ${status.toLowerCase()}.`);
  };

  const currentRoute = ROUTES.find((item) => item.key === tab) || ROUTES[0];

  return (
    <section id="hr-recruitment-page" data-testid="hr-recruitment-page" className="page-section active hr-page-shell">
      <PageHeader
        title="Recruitment"
        subtitle="Requisitions, candidates, interviews and offers"
        actions={<HeaderAction tab={tab} onOpen={setDialog} />}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22 }}>
        {ROUTES.map((item) => (
          <button
            key={item.key}
            id={`hr-recruitment-tab-${item.key}`}
            data-testid={`hr-recruitment-tab-${item.key}`}
            data-active={tab === item.key ? "true" : "false"}
            onClick={() => navigate(item.key === "dashboard" ? "/recruitment" : `/recruitment/${item.route}`)}
            style={{ height: 38, padding: "0 14px", borderRadius: 12, border: tab === item.key ? "1px solid rgba(17,94,89,0.2)" : "1px solid transparent", background: tab === item.key ? "white" : "rgba(100,116,139,0.07)", color: tab === item.key ? "var(--dark-text)" : "var(--light-text)", fontWeight: 900, fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer" }}
          >
            {item.icon}{item.label}
          </button>
        ))}
      </div>

      {tab !== "dashboard" && (
        <div style={{ ...card, padding: 14, marginBottom: 18 }}>
          <div style={{ position: "relative", maxWidth: 460 }}>
            <Search size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--light-text)" }} />
            <Input id={`hr-recruitment-${tab}-search`} data-testid={`hr-recruitment-${tab}-search`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${currentRoute.label.toLowerCase()}...`} className="!h-10 rounded-xl pl-10" />
          </div>
        </div>
      )}

      {tab === "dashboard" && <DashboardView stats={stats} requisitions={requisitions} applications={applications} />}
      {tab === "requisitions" && <RequisitionsView rows={filteredRequisitions} onStatus={(id, status) => setRequisitions((items) => items.map((item) => item.id === id ? { ...item, status } : item))} />}
      {tab === "candidates" && <CandidatesView rows={filteredCandidates} applications={applications} />}
      {tab === "applications" && <ApplicationsView rows={applications} onStage={updateApplicationStage} />}
      {tab === "interviews" && <InterviewsView rows={filteredInterviews} />}
      {tab === "offers" && <OffersView rows={filteredOffers} onStatus={updateOfferStatus} />}

      <RequisitionDialog open={dialog === "requisition"} form={reqForm} saving={saving} onChange={setReqForm} onClose={() => setDialog(null)} onSave={createRequisition} />
      <CandidateDialog open={dialog === "candidate"} form={candidateForm} saving={saving} onChange={setCandidateForm} onClose={() => setDialog(null)} onSave={createCandidate} />
      <InterviewDialog open={dialog === "interview"} applications={applications} form={interviewForm} saving={saving} onChange={setInterviewForm} onClose={() => setDialog(null)} onSave={createInterview} />
      <OfferDialog open={dialog === "offer"} applications={applications} form={offerForm} saving={saving} onChange={setOfferForm} onClose={() => setDialog(null)} onSave={createOffer} />
    </section>
  );
}

function HeaderAction({ tab, onOpen }: { tab: RecruitmentTab; onOpen: (dialog: "requisition" | "candidate" | "interview" | "offer") => void }) {
  if (tab === "requisitions") return <button id="hr-recruitment-create-requisition" data-testid="hr-recruitment-create-requisition" style={primaryBtn} onClick={() => onOpen("requisition")}><Plus size={16} /> New Requisition</button>;
  if (tab === "candidates") return <button id="hr-recruitment-create-candidate" data-testid="hr-recruitment-create-candidate" style={primaryBtn} onClick={() => onOpen("candidate")}><UserPlus size={16} /> Add Candidate</button>;
  if (tab === "interviews") return <button id="hr-recruitment-schedule-interview" data-testid="hr-recruitment-schedule-interview" style={primaryBtn} onClick={() => onOpen("interview")}><CalendarDays size={16} /> Schedule Interview</button>;
  if (tab === "offers") return <button id="hr-recruitment-create-offer" data-testid="hr-recruitment-create-offer" style={primaryBtn} onClick={() => onOpen("offer")}><Award size={16} /> Create Offer</button>;
  return null;
}

function DashboardView({ stats, requisitions, applications }: { stats: { openRequisitions: number; totalCandidates: number; interviewsScheduled: number; offersPending: number; timeToFill: string }; requisitions: Requisition[]; applications: Application[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        <Metric label="Open Requisitions" value={stats.openRequisitions} icon={<Briefcase size={18} />} />
        <Metric label="Candidates" value={stats.totalCandidates} icon={<Users size={18} />} />
        <Metric label="Interviews" value={stats.interviewsScheduled} icon={<CalendarDays size={18} />} />
        <Metric label="Pending Offers" value={stats.offersPending} icon={<Award size={18} />} />
        <Metric label="Time to Fill" value={stats.timeToFill} icon={<FileText size={18} />} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
        <div style={card}>
          <PanelTitle title="Open Roles" subtitle="Active headcount requests" />
          {requisitions.filter((item) => item.status === "Open").slice(0, 4).map((item) => (
            <div key={item.id} style={{ padding: 16, borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div><b>{item.title}</b><div style={{ ...lbl, marginTop: 3 }}>{item.department} - {item.applicants} applicants</div></div>
              <span style={statusPill(item.status)}>{item.status}</span>
            </div>
          ))}
        </div>
        <div style={card}>
          <PanelTitle title="Pipeline" subtitle="Applications by stage" />
          {(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED"] as ApplicationStage[]).map((stage) => (
            <div key={stage} style={{ padding: "12px 16px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{stage}</span>
              <span style={statusPill(stage)}>{applications.filter((item) => item.stage === stage).length}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div style={{ ...card, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div><span style={lbl}>{label}</span><div style={{ fontSize: 24, fontWeight: 950, color: "var(--dark-text)", marginTop: 4 }}>{value}</div></div>
      <div style={{ height: 40, width: 40, borderRadius: 14, background: "rgba(17,94,89,0.08)", color: TEAL, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
    </div>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div style={{ padding: 16 }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 950, color: "var(--dark-text)" }}>{title}</h3><p style={{ ...lbl, marginTop: 4 }}>{subtitle}</p></div>;
}

function RequisitionsView({ rows, onStatus }: { rows: Requisition[]; onStatus: (id: string, status: RequisitionStatus) => void }) {
  return <Table empty="No requisitions found." cols={["Role", "Department", "Openings", "Target", "Status", "Action"]}>{rows.map((row) => (
    <tr key={row.id}><td style={td}><b>{row.title}</b><div style={lbl}>{row.id} - {row.branch}</div></td><td style={td}>{row.department}<div style={lbl}>{row.hiringManager || "-"}</div></td><td style={td}>{row.openingsCount}</td><td style={td}>{row.targetCloseDate || "-"}</td><td style={td}><span style={statusPill(row.status)}>{row.status}</span></td><td style={td}><Select id={`hr-recruitment-req-status-${row.id}`} testId={`hr-recruitment-req-status-${row.id}`} value={row.status} onChange={(event) => onStatus(row.id, event.target.value as RequisitionStatus)} options={["Open", "On Hold", "Closed", "Draft"].map((value) => ({ value, label: value }))} /></td></tr>
  ))}</Table>;
}

function CandidatesView({ rows, applications }: { rows: Candidate[]; applications: Application[] }) {
  return <Table empty="No candidates found." cols={["Candidate", "Contact", "Source", "Applied", "Applications"]}>{rows.map((row) => (
    <tr key={row.id}><td style={td}><b>{row.name}</b><div style={lbl}>{row.id}</div></td><td style={td}>{row.email}<div style={lbl}>{row.phone || "-"}</div></td><td style={td}>{row.source}</td><td style={td}>{row.appliedAt}</td><td style={td}>{applications.filter((item) => item.candidateId === row.id).length}</td></tr>
  ))}</Table>;
}

function ApplicationsView({ rows, onStage }: { rows: Application[]; onStage: (id: string, stage: ApplicationStage) => void }) {
  const stages: ApplicationStage[] = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
      {stages.map((stage) => (
        <div key={stage} style={card}>
          <div style={{ padding: 14, borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><b>{stage}</b><span style={statusPill(stage)}>{rows.filter((row) => row.stage === stage).length}</span></div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.filter((row) => row.stage === stage).length === 0 ? <div style={{ ...lbl, textAlign: "center", padding: "18px 0" }}>No applications</div> : rows.filter((row) => row.stage === stage).map((row) => (
              <div key={row.id} style={{ border: "1px solid var(--border-color)", borderRadius: 12, padding: 12, background: "rgba(100,116,139,0.03)" }}>
                <b style={{ fontSize: 13 }}>{row.candidateName}</b><div style={{ ...lbl, marginTop: 3 }}>{row.role}</div>
                <Select id={`hr-recruitment-app-stage-${row.id}`} testId={`hr-recruitment-app-stage-${row.id}`} value={row.stage} onChange={(event) => onStage(row.id, event.target.value as ApplicationStage)} options={stages.map((value) => ({ value, label: value }))} containerClassName="mt-3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InterviewsView({ rows }: { rows: Interview[] }) {
  return <Table empty="No interviews scheduled." cols={["Candidate", "Round", "Schedule", "Mode", "Interviewers", "Feedback"]}>{rows.map((row) => (
    <tr key={row.id}><td style={td}><b>{row.candidateName}</b><div style={lbl}>{row.role}</div></td><td style={td}>{row.round}</td><td style={td}>{row.scheduledAt.replace("T", " ")}</td><td style={td}>{row.mode}</td><td style={td}>{row.interviewers}</td><td style={td}>{row.score || "-"}<div style={lbl}>{row.feedback || "No feedback"}</div></td></tr>
  ))}</Table>;
}

function OffersView({ rows, onStatus }: { rows: Offer[]; onStatus: (id: string, status: OfferStatus) => void }) {
  return <Table empty="No offers found." cols={["Candidate", "Role", "Salary", "Status", "Action"]}>{rows.map((row) => (
    <tr key={row.id}><td style={td}><b>{row.candidateName}</b><div style={lbl}>{row.id}</div></td><td style={td}>{row.role}</td><td style={td}>INR {Number(row.salary || 0).toLocaleString("en-IN")}</td><td style={td}><span style={statusPill(row.status)}>{row.status}</span></td><td style={td}><Select id={`hr-recruitment-offer-status-${row.id}`} testId={`hr-recruitment-offer-status-${row.id}`} value={row.status} onChange={(event) => onStatus(row.id, event.target.value as OfferStatus)} options={["Draft", "Sent", "Accepted", "Declined", "Withdrawn"].map((value) => ({ value, label: value }))} /></td></tr>
  ))}</Table>;
}

function Table({ cols, children, empty }: { cols: string[]; children: ReactNode; empty: string }) {
  const rows = Array.isArray(children) ? children : [];
  return (
    <div style={card}>
      <div className="overflow-x-auto w-full">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{cols.map((col) => <th key={col} style={th}>{col}</th>)}</tr></thead>
          <tbody>{rows.length === 0 ? <tr><td colSpan={cols.length} style={{ ...td, textAlign: "center", padding: "32px 16px", color: "var(--light-text)", fontWeight: 800 }}>{empty}</td></tr> : children}</tbody>
        </table>
      </div>
    </div>
  );
}

function RequisitionDialog({ open, form, saving, onChange, onClose, onSave }: { open: boolean; form: any; saving: boolean; onChange: (form: any) => void; onClose: () => void; onSave: () => void }) {
  return <Dialog open={open} onClose={onClose} testId="hr-recruitment-requisition-dialog" title="New Requisition" contentClassName="max-w-[720px]"><div style={formGrid}><Field label="Title"><Input id="hr-recruitment-req-title" data-testid="hr-recruitment-req-title" value={form.title} onChange={(e) => onChange({ ...form, title: e.target.value })} /></Field><Field label="Department"><Input id="hr-recruitment-req-department" data-testid="hr-recruitment-req-department" value={form.department} onChange={(e) => onChange({ ...form, department: e.target.value })} /></Field><Field label="Branch"><Input id="hr-recruitment-req-branch" data-testid="hr-recruitment-req-branch" value={form.branch} onChange={(e) => onChange({ ...form, branch: e.target.value })} /></Field><Field label="Hiring Manager"><Input id="hr-recruitment-req-manager" data-testid="hr-recruitment-req-manager" value={form.hiringManager} onChange={(e) => onChange({ ...form, hiringManager: e.target.value })} /></Field><Field label="Employment Type"><Select id="hr-recruitment-req-type" testId="hr-recruitment-req-type" value={form.employmentType} onChange={(e) => onChange({ ...form, employmentType: e.target.value })} options={["Full-time", "Contract", "Part-time", "Internship"].map((value) => ({ value, label: value }))} /></Field><Field label="Openings"><Input id="hr-recruitment-req-openings" data-testid="hr-recruitment-req-openings" type="number" value={form.openingsCount} onChange={(e) => onChange({ ...form, openingsCount: e.target.value })} /></Field><Field label="Experience"><Input id="hr-recruitment-req-experience" data-testid="hr-recruitment-req-experience" value={form.experienceRequired} onChange={(e) => onChange({ ...form, experienceRequired: e.target.value })} /></Field><Field label="Target Close"><Input id="hr-recruitment-req-close" data-testid="hr-recruitment-req-close" type="date" value={form.targetCloseDate} onChange={(e) => onChange({ ...form, targetCloseDate: e.target.value })} /></Field><Field label="Salary Min"><Input id="hr-recruitment-req-salary-min" data-testid="hr-recruitment-req-salary-min" type="number" value={form.salaryMin} onChange={(e) => onChange({ ...form, salaryMin: e.target.value })} /></Field><Field label="Salary Max"><Input id="hr-recruitment-req-salary-max" data-testid="hr-recruitment-req-salary-max" type="number" value={form.salaryMax} onChange={(e) => onChange({ ...form, salaryMax: e.target.value })} /></Field><Field label="Job Description" full><Textarea id="hr-recruitment-req-description" data-testid="hr-recruitment-req-description" rows={4} value={form.jobDescription} onChange={(e) => onChange({ ...form, jobDescription: e.target.value })} /></Field></div><DialogActions saving={saving} saveLabel="Save Requisition" onClose={onClose} onSave={onSave} /></Dialog>;
}

function CandidateDialog({ open, form, saving, onChange, onClose, onSave }: { open: boolean; form: any; saving: boolean; onChange: (form: any) => void; onClose: () => void; onSave: () => void }) {
  return <Dialog open={open} onClose={onClose} testId="hr-recruitment-candidate-dialog" title="Add Candidate"><div style={formGrid}><Field label="Name"><Input id="hr-recruitment-candidate-name" data-testid="hr-recruitment-candidate-name" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} /></Field><Field label="Email"><Input id="hr-recruitment-candidate-email" data-testid="hr-recruitment-candidate-email" value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })} /></Field><Field label="Phone"><Input id="hr-recruitment-candidate-phone" data-testid="hr-recruitment-candidate-phone" value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} /></Field><Field label="Source"><Select id="hr-recruitment-candidate-source" testId="hr-recruitment-candidate-source" value={form.source} onChange={(e) => onChange({ ...form, source: e.target.value })} options={["LinkedIn", "Referral", "Careers Page", "Agency", "Walk-in"].map((value) => ({ value, label: value }))} /></Field></div><DialogActions saving={saving} saveLabel="Save Candidate" onClose={onClose} onSave={onSave} /></Dialog>;
}

function InterviewDialog({ open, applications, form, saving, onChange, onClose, onSave }: { open: boolean; applications: Application[]; form: any; saving: boolean; onChange: (form: any) => void; onClose: () => void; onSave: () => void }) {
  return <Dialog open={open} onClose={onClose} testId="hr-recruitment-interview-dialog" title="Schedule Interview"><div style={formGrid}><Field label="Application" full><Select id="hr-recruitment-interview-application" testId="hr-recruitment-interview-application" value={form.applicationId} onChange={(e) => onChange({ ...form, applicationId: e.target.value })} options={applications.filter((item) => ["APPLIED", "SCREENING", "INTERVIEW"].includes(item.stage)).map((item) => ({ value: item.id, label: `${item.candidateName} - ${item.role}` }))} /></Field><Field label="Round"><Select id="hr-recruitment-interview-round" testId="hr-recruitment-interview-round" value={form.round} onChange={(e) => onChange({ ...form, round: e.target.value })} options={["Screening", "Technical", "Manager", "HR"].map((value) => ({ value, label: value }))} /></Field><Field label="Mode"><Select id="hr-recruitment-interview-mode" testId="hr-recruitment-interview-mode" value={form.mode} onChange={(e) => onChange({ ...form, mode: e.target.value })} options={["Video", "In-person", "Phone"].map((value) => ({ value, label: value }))} /></Field><Field label="Date"><Input id="hr-recruitment-interview-date" data-testid="hr-recruitment-interview-date" type="date" value={form.date} onChange={(e) => onChange({ ...form, date: e.target.value })} /></Field><Field label="Time"><Input id="hr-recruitment-interview-time" data-testid="hr-recruitment-interview-time" type="time" value={form.time} onChange={(e) => onChange({ ...form, time: e.target.value })} /></Field><Field label="Interviewers" full><Input id="hr-recruitment-interviewers" data-testid="hr-recruitment-interviewers" value={form.interviewers} onChange={(e) => onChange({ ...form, interviewers: e.target.value })} /></Field></div><DialogActions saving={saving} saveLabel="Save Interview" onClose={onClose} onSave={onSave} /></Dialog>;
}

function OfferDialog({ open, applications, form, saving, onChange, onClose, onSave }: { open: boolean; applications: Application[]; form: any; saving: boolean; onChange: (form: any) => void; onClose: () => void; onSave: () => void }) {
  return <Dialog open={open} onClose={onClose} testId="hr-recruitment-offer-dialog" title="Create Offer"><div style={formGrid}><Field label="Application" full><Select id="hr-recruitment-offer-application" testId="hr-recruitment-offer-application" value={form.applicationId} onChange={(e) => onChange({ ...form, applicationId: e.target.value })} options={applications.filter((item) => ["INTERVIEW", "OFFER", "HIRED"].includes(item.stage)).map((item) => ({ value: item.id, label: `${item.candidateName} - ${item.role}` }))} /></Field><Field label="Salary"><Input id="hr-recruitment-offer-salary" data-testid="hr-recruitment-offer-salary" type="number" value={form.salary} onChange={(e) => onChange({ ...form, salary: e.target.value })} /></Field><Field label="Status"><Select id="hr-recruitment-offer-status" testId="hr-recruitment-offer-status" value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value as OfferStatus })} options={["Draft", "Sent"].map((value) => ({ value, label: value }))} /></Field></div><DialogActions saving={saving} saveLabel="Save Offer" onClose={onClose} onSave={onSave} /></Dialog>;
}

const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 };

function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return <div style={{ gridColumn: full ? "1 / -1" : undefined }}><label style={{ ...lbl, display: "block", marginBottom: 6 }}>{label}</label>{children}</div>;
}

function DialogActions({ saving, saveLabel, onClose, onSave }: { saving: boolean; saveLabel: string; onClose: () => void; onSave: () => void }) {
  return <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}><button style={ghostBtn} onClick={onClose}>Cancel</button><button style={primaryBtn} onClick={onSave} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{saveLabel}</button></div>;
}
