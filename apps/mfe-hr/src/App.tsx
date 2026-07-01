import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import "./index.css";

const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const EmployeeMaster = lazy(() => import("./pages/employees/EmployeeMaster"));
const NewEmployeeWizard = lazy(() => import("./pages/employees/NewEmployeeWizard"));
const EmployeeDetails = lazy(() => import("./pages/employees/EmployeeDetails"));
const Attendance = lazy(() => import("./pages/attendance/Attendance"));
const Leave = lazy(() => import("./pages/leave/Leave"));
const Payroll = lazy(() => import("./pages/payroll/Payroll"));
const Expenses = lazy(() => import("./pages/expenses/Expenses"));
const Announcements = lazy(() => import("./pages/announcements/Announcements"));
const Tickets = lazy(() => import("./pages/tickets/Tickets"));
const Reports = lazy(() => import("./pages/reports/Reports"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const EssPortal = lazy(() => import("./pages/ess/EssPortal"));
const Recruitment = lazy(() => import("./pages/recruitment/Recruitment"));

export default function App() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading HR...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<EmployeeMaster />} />
            <Route path="/employees/new" element={<NewEmployeeWizard />} />
            <Route path="/employees/:id" element={<EmployeeDetails />} />
            <Route path="/employees/:id/:tab" element={<EmployeeDetails />} />
            <Route path="/attendance/*" element={<Attendance />} />
            <Route path="/leave/*" element={<Leave />} />
            <Route path="/payroll/*" element={<Payroll />} />
            <Route path="/expenses/*" element={<Expenses />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/recruitment/*" element={<Recruitment />} />
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
