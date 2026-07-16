import { lazy, Suspense } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import "./index.css";

const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const EmployeeMaster = lazy(() => import("./pages/employees/EmployeeMaster"));
const NewEmployeeWizard = lazy(() => import("./pages/employees/NewEmployeeWizard"));
const EmployeeDetails = lazy(() => import("./pages/employees/EmployeeDetails"));
const OrganizationHub = lazy(() => import("./pages/org/OrganizationHub"));
const Separation = lazy(() => import("./pages/separation/Separation"));
const Assets = lazy(() => import("./pages/assets/Assets"));
const Attendance = lazy(() => import("./pages/attendance/Attendance"));
const Leave = lazy(() => import("./pages/leave/Leave"));
const Payroll = lazy(() => import("./pages/payroll/Payroll"));
const Expenses = lazy(() => import("./pages/expenses/Expenses"));
const Announcements = lazy(() => import("./pages/announcements/Announcements"));
const Tickets = lazy(() => import("./pages/tickets/Tickets"));
const Grievances = lazy(() => import("./pages/grievances/Grievances"));
const PoshGrievance = lazy(() =>
  import("./pages/posh/PoshGrievance").then((module) => ({ default: module.PoshGrievance }))
);
const Reports = lazy(() => import("./pages/reports/Reports"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const EssPortal = lazy(() => import("./pages/ess/EssPortal"));
const RecruitmentDashboard = lazy(() => import("./pages/recruitment/Dashboard"));
const JobRequisitions = lazy(() => import("./pages/recruitment/JobRequisitions"));
const Candidates = lazy(() => import("./pages/recruitment/Candidates"));
const ApplicationsPipeline = lazy(() => import("./pages/recruitment/ApplicationsPipeline"));
const Interviews = lazy(() => import("./pages/recruitment/Interviews"));
const Offers = lazy(() => import("./pages/recruitment/Offers"));
const CareersAdmin = lazy(() => import("./pages/careers/CareersAdmin"));
const CareersPublishPage = lazy(() => import("./pages/careers/CareersPublishPage"));
const PublicJobList = lazy(() => import("./pages/careers/PublicJobList"));
const PublicJobPage = lazy(() => import("./pages/careers/PublicJobPage"));

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
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <div className="flex min-h-full flex-1 flex-col">
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
            <Route path="/grievances" element={<Grievances />} />
            <Route path="/grievances/*" element={<Grievances />} />
            <Route path="/posh" element={<PoshGrievance />} />
            <Route path="/posh/*" element={<PoshGrievance />} />
            <Route path="/recruitment" element={<RecruitmentDashboard />} />
            <Route path="/recruitment/requisitions" element={<JobRequisitions />} />
            <Route path="/recruitment/candidates" element={<Candidates />} />
            <Route path="/recruitment/applications" element={<ApplicationsPipeline />} />
            <Route path="/recruitment/interviews" element={<Interviews />} />
            <Route path="/recruitment/offers" element={<Offers />} />
            <Route path="/recruitment/careers" element={<CareersAdmin />} />
            <Route path="/recruitment/careers/publish/:requisitionUid" element={<CareersPublishPage />} />
            <Route path="/careers/:companySlug" element={<PublicListRoute />} />
            <Route path="/careers/:companySlug/:jobSlug" element={<PublicJobRoute />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/:section" element={<Settings />} />
            <Route path="/settings/:section/:subsection" element={<Settings />} />
            <Route path="/me" element={<EssPortal />} />
            <Route path="/me/*" element={<EssPortal />} />
            <Route path="*" element={<PlaceholderPage title="Not Found" note="No HR screen for this route." />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
