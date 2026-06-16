import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { cn } from "@jaldee/design-system";
import "./index.css"; // tailwind base + modal/toast styles (also load in federated mode)
import { ToastProvider } from "./contexts/ToastContext";
import { ModalProvider } from "./contexts/ModalContext";
import AppShell from "./components/AppShell";

import CalendarDashboard from "./pages/calendar/CalendarDashboard";
import AppointmentDetailsWorkspace from "./pages/appointment/AppointmentDetailsWorkspace";
import CalendarList from "./pages/calendar/CalendarList";
import CalendarWizard from "./pages/calendar/CalendarWizard";
import CalendarDetails from "./pages/calendar/CalendarDetails";
import CustomizeCalendar from "./pages/calendar/CustomizeCalendar";
import EditCalendar from "./pages/calendar/EditCalendar";
import EditSchedule from "./pages/calendar/EditSchedule";
import CustomersPage from "./pages/customers/CustomersPage";
import ServicesPage from "./pages/services/ServicesPage";
import CreateServicePage from "./pages/services/CreateServicePage";
import OverviewPage from "./pages/overview/OverviewPage";
import SettingsPage from "./pages/settings/SettingsPage";
import StaffPage from "./pages/users/StaffPage";
import UsersPage from "./pages/users/UsersPage";
import PlaceholderPage from "./pages/PlaceholderPage";

function CalendarPage() {
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  return (
    <div className="flex h-full relative overflow-hidden">
      <div className={cn("flex-1 min-w-0 transition-all duration-300", selectedBooking ? "hidden lg:block" : "block")}>
        <CalendarDashboard onBookingSelect={setSelectedBooking} />
      </div>
      {selectedBooking && (
        <div className="absolute inset-0 z-40 lg:static lg:inset-auto lg:z-auto flex justify-end bg-slate-900/20 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none">
          <AppointmentDetailsWorkspace
            bookingId={selectedBooking}
            onClose={() => setSelectedBooking(null)}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ModalProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/calendar" element={<Navigate to="/" replace />} />
            <Route path="/calendars" element={<CalendarList />} />
            <Route path="/calendars/create" element={<CalendarWizard />} />
            <Route path="/calendars/details" element={<CalendarDetails />} />
            <Route path="/calendars/customize" element={<CustomizeCalendar />} />
            <Route path="/calendars/edit" element={<EditCalendar />} />
            <Route path="/calendars/edit-schedule" element={<EditSchedule />} />
            <Route path="/dashboard" element={<OverviewPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/services" element={<div className="p-4 md:p-6 h-full"><ServicesPage /></div>} />
            <Route path="/services/create" element={<CreateServicePage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<PlaceholderPage title="Not Found" note="No booking screen for this route." />} />
          </Routes>
        </AppShell>
      </ModalProvider>
    </ToastProvider>
  );
}
