import { Routes, Route } from "react-router-dom";
import "./index.css";
import "./vanilla-style.css";
import PlaceholderPage from "./pages/PlaceholderPage";
import EmployeeMaster from "./pages/employees/EmployeeMaster";
import NewEmployeeWizard from "./pages/employees/NewEmployeeWizard";
import EmployeeDetails from "./pages/employees/EmployeeDetails";
import Attendance from "./pages/attendance/Attendance";
import Leave from "./pages/leave/Leave";
import Payroll from "./pages/payroll/Payroll";
import Expenses from "./pages/expenses/Expenses";
import Announcements from "./pages/announcements/Announcements";
import Tickets from "./pages/tickets/Tickets";
import Reports from "./pages/reports/Reports";
import Settings from "./pages/settings/Settings";
import Dashboard from "./pages/dashboard/Dashboard";

export default function App() {
  return (
    <div className="flex h-full min-h-[calc(100vh-56px)] flex-col bg-background text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<EmployeeMaster />} />
        <Route path="/employees/new" element={<NewEmployeeWizard />} />
        <Route path="/employees/:id" element={<EmployeeDetails />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leave" element={<Leave />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<PlaceholderPage title="Not Found" note="No HR screen for this route." />} />
      </Routes>
      </div>
    </div>
  );
}
