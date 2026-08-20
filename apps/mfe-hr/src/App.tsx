// MFE HR Root Application Routes
import { ComponentType, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import "./index.css";
import { AutomationTestIdBoundary } from "./components/AutomationTestIdBoundary";

function safeLazy<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      console.warn("[safeLazy] Dynamic import failed, retrying...", error);
      await new Promise((r) => setTimeout(r, 200));
      try {
        return await factory();
      } catch (retryError) {
        await new Promise((r) => setTimeout(r, 400));
        return await factory();
      }
    }
  });
}

const PlaceholderPage = safeLazy(() => import("./pages/PlaceholderPage"));
const EmployeeMaster = safeLazy(() => import("./pages/employees/EmployeeMaster"));
const NewEmployeeWizard = safeLazy(() => import("./pages/employees/NewEmployeeWizard"));
const EmployeeDetails = safeLazy(() => import("./pages/employees/EmployeeDetails"));
const OrganizationHub = safeLazy(() => import("./pages/org/OrganizationHub"));
const Separation = safeLazy(() => import("./pages/separation/Separation"));
const Assets = safeLazy(() => import("./pages/assets/Assets"));
const Attendance = safeLazy(() => import("./pages/attendance/Attendance"));
const Leave = safeLazy(() => import("./pages/leave/Leave"));
const Payroll = safeLazy(() => import("./pages/payroll/Payroll"));
const Expenses = safeLazy(() => import("./pages/expenses/Expenses"));
const Announcements = safeLazy(() => import("./pages/announcements/Announcements"));
const Tickets = safeLazy(() => import("./pages/tickets/Tickets"));
const Grievances = safeLazy(() => import("./pages/grievances/Grievances"));
const PoshGrievance = safeLazy(() =>
  import("./pages/posh/PoshGrievance").then((module) => ({ default: module.PoshGrievance }))
);
const Reports = safeLazy(() => import("./pages/reports/Reports"));
const AuditLogs = safeLazy(() => import("./pages/audit/AuditLogs"));
const WarningMemosAdmin = safeLazy(() => import("./pages/enforcement/WarningMemosAdmin"));
const HrUserManagement = safeLazy(() =>
  import("./pages/settings/HrUserManagement").then((m) => ({ default: m.HrUserManagement }))
);
const Settings = safeLazy(() => import("./pages/settings/Settings"));
const Dashboard = safeLazy(() => import("./pages/dashboard/Dashboard"));
const EssPortal = safeLazy(() => import("./pages/ess/EssPortal"));
const RecruitmentDashboard = safeLazy(() => import("./pages/recruitment/Dashboard"));
const JobRequisitions = safeLazy(() => import("./pages/recruitment/JobRequisitions"));
const Candidates = safeLazy(() => import("./pages/recruitment/Candidates"));
const CandidateView = safeLazy(() => import("./pages/recruitment/CandidateView"));
const ApplicationsPipeline = safeLazy(() => import("./pages/recruitment/ApplicationsPipeline"));
const Interviews = safeLazy(() => import("./pages/recruitment/Interviews"));
const Offers = safeLazy(() => import("./pages/recruitment/Offers"));
const CareersAdmin = safeLazy(() => import("./pages/careers/CareersAdmin"));
const CareersPublishPage = safeLazy(() => import("./pages/careers/CareersPublishPage"));
const PublicJobList = safeLazy(() => import("./pages/careers/PublicJobList"));
const PublicJobPage = safeLazy(() => import("./pages/careers/PublicJobPage"));

import { GlobalHrMobileNav } from "./components/GlobalHrMobileNav";

function PublicListRoute() {
  const { companySlug } = useParams();
  const navigate = useNavigate();

  return (
    <PublicJobList
      companySlug={companySlug ?? ""}
      onOpen={(slug) => navigate(`/careers/${companySlug}/${slug}`)}
    />
  );
}

function PublicJobRoute() {
  const { companySlug, jobSlug } = useParams();

  return <PublicJobPage companySlug={companySlug ?? ""} jobSlug={jobSlug ?? ""} />;
}

export default function App() {
  return (
    <AutomationTestIdBoundary>
      <div className="min-h-full w-full bg-background text-foreground">
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading HR...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<EmployeeMaster />} />
            <Route path="/employees/new" element={<NewEmployeeWizard />} />
            <Route path="/employees/:id" element={<EmployeeDetails />} />
            <Route path="/employees/:id/:tab" element={<EmployeeDetails />} />
            <Route path="/org" element={<OrganizationHub />} />
            <Route path="/org/*" element={<OrganizationHub />} />
            <Route path="/separation" element={<Separation />} />
            <Route path="/separation/*" element={<Separation />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/assets/*" element={<Assets />} />
            <Route path="/attendance/*" element={<Attendance />} />
            <Route path="/leave/*" element={<Leave />} />
            <Route path="/payroll/*" element={<Payroll />} />
            <Route path="/expenses/*" element={<Expenses />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/helpdesk" element={<Tickets />} />
            <Route path="/helpdesk/*" element={<Tickets />} />
            <Route path="/grievances" element={<Grievances />} />
            <Route path="/grievances/*" element={<Grievances />} />
            <Route path="/posh" element={<PoshGrievance />} />
            <Route path="/posh/*" element={<PoshGrievance />} />
            <Route path="/recruitment" element={<RecruitmentDashboard />} />
            <Route path="/recruitment/requisitions" element={<JobRequisitions />} />
            <Route path="/recruitment/candidates" element={<Candidates />} />
            <Route path="/recruitment/candidates/:candidateId" element={<CandidateView />} />
            <Route path="/recruitment/applications" element={<ApplicationsPipeline />} />
            <Route path="/recruitment/interviews" element={<Interviews />} />
            <Route path="/recruitment/offers" element={<Offers />} />
            <Route path="/recruitment/careers" element={<CareersAdmin />} />
            <Route path="/recruitment/careers/publish/:requisitionUid" element={<CareersPublishPage />} />
            <Route path="/careers/:companySlug" element={<PublicListRoute />} />
            <Route path="/careers/:companySlug/:jobSlug" element={<PublicJobRoute />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/users" element={<HrUserManagement />} />
            <Route path="/users/*" element={<HrUserManagement />} />
            <Route path="/enforcement" element={<WarningMemosAdmin />} />
            <Route path="/enforcement/*" element={<WarningMemosAdmin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/:section" element={<Settings />} />
            <Route path="/settings/:section/:subsection" element={<Settings />} />
            <Route path="/me" element={<EssPortal />} />
            <Route path="/me/*" element={<EssPortal />} />
            <Route path="*" element={<PlaceholderPage title="Not Found" note="No HR screen for this route." />} />
          </Routes>
        </Suspense>
        <GlobalHrMobileNav />
      </div>
    </AutomationTestIdBoundary>
  );
}
