import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { cn } from "@jaldee/design-system";
import "./index.css";
import { ModalProvider } from "./contexts/ModalContext";
import AppShell from "./components/AppShell";

const CalendarDashboard = lazy(() => import("./pages/calendar/CalendarDashboard"));
const AppointmentDetailsWorkspace = lazy(() => import("./pages/appointment/AppointmentDetailsWorkspace"));
const CalendarList = lazy(() => import("./pages/calendar/CalendarList"));
const CalendarWizard = lazy(() => import("./pages/calendar/CalendarWizard"));
const CalendarDetails = lazy(() => import("./pages/calendar/CalendarDetails"));
const CustomizeCalendar = lazy(() => import("./pages/calendar/CustomizeCalendar"));
const CustomizeTimeWindow = lazy(() => import("./pages/calendar/CustomizeTimeWindow"));
const CalendarSettings = lazy(() => import("./pages/calendar/CalendarSettings"));
const EditCalendar = lazy(() => import("./pages/calendar/EditCalendar"));
const EditSchedule = lazy(() => import("./pages/calendar/EditSchedule"));
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const ServicesPage = lazy(() => import("./pages/services/ServicesPage"));
const CreateServicePage = lazy(() => import("./pages/services/CreateServicePage"));
const ServiceDetailsPage = lazy(() => import("./pages/services/ServiceDetailsPage"));
const OverviewPage = lazy(() => import("./pages/overview/OverviewPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const StaffPage = lazy(() => import("./pages/users/StaffPage"));
const UsersPage = lazy(() => import("./pages/users/UsersPage"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const ServiceGroupsPage = lazy(() => import("./pages/services/ServiceGroupsPage"));
const CreateServiceGroupPage = lazy(() => import("./pages/services/CreateServiceGroupPage"));
const InstantAvailability = lazy(() => import("./pages/calendar/InstantAvailability"));
const HolidaysPage = lazy(() => import("./pages/holidays/HolidaysPage"));
const QrLinksPage = lazy(() => import("./pages/qrlinks/QrLinksPage"));
const QrLinkDetailsPage = lazy(() => import("./pages/qrlinks/QrLinkDetailsPage"));
const CustomerLabelsPage = lazy(() => import("./pages/labels/CustomerLabelsPage"));

function CalendarPage() {
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  return (
    <div className="flex h-full relative overflow-hidden">
      <div className={cn("flex-1 min-w-0 transition-all duration-300", selectedBooking ? "hidden lg:block" : "block")}>
        <CalendarDashboard onBookingSelect={setSelectedBooking} />
      </div>
      {selectedBooking && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
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
    <ModalProvider>
      <AppShell>
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading Bookings...</div>}>
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/calendar" element={<Navigate to="/" replace />} />
            <Route path="/calendars" element={<CalendarList />} />
            <Route path="/calendars/create" element={<CalendarWizard />} />
            <Route path="/calendars/details" element={<CalendarDetails />} />
            <Route path="/calendars/:uid/details" element={<CalendarDetails />} />
            <Route path="/calendars/customize" element={<CustomizeCalendar />} />
            <Route path="/calendars/:uid/customize" element={<CustomizeCalendar />} />
            <Route path="/calendars/:uid/settings" element={<CalendarSettings />} />
            <Route path="/calendar/:uid/settings" element={<CalendarSettings />} />
            <Route path="/calendars/edit" element={<EditCalendar />} />
            <Route path="/calendars/edit-schedule" element={<EditSchedule />} />
            <Route path="/calendars/instant" element={<InstantAvailability />} />
            <Route path="/calendars/:calendarUid/schedules/:scheduleUid/edit" element={<EditSchedule />} />
            <Route path="/calendars/:calendarUid/schedules/:scheduleUid/timewindows/:timeWindowUid/customize" element={<CustomizeTimeWindow />} />
            <Route path="/calendar/:calendarUid/schedules/:scheduleUid/timewindows/:timeWindowUid/customize" element={<CustomizeTimeWindow />} />
            <Route path="/dashboard" element={<OverviewPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:view" element={<CustomersPage />} />
            <Route path="/customers/:view/:subview" element={<CustomersPage />} />
            <Route path="/customers/:view/:subview/:recordId" element={<CustomersPage />} />
            <Route path="/customers/:recordId" element={<CustomersPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/create" element={<CreateServicePage />} />
            <Route path="/services/edit/:id" element={<CreateServicePage />} />
            <Route path="/services/:id/details" element={<ServiceDetailsPage />} />
            <Route path="/services/groups" element={<ServiceGroupsPage />} />
            <Route path="/services/groups/create" element={<CreateServiceGroupPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/staff/:view" element={<StaffPage />} />
            <Route path="/staff/:view/:subview" element={<StaffPage />} />
            <Route path="/staff/:view/:subview/:recordId" element={<StaffPage />} />
            <Route path="/staff/:recordId" element={<StaffPage />} />
            <Route path="/holidays" element={<HolidaysPage />} />
            <Route path="/qr-links" element={<QrLinksPage />} />
            <Route path="/qrlinks" element={<QrLinksPage />} />
            <Route path="/qrlinks/:uid" element={<QrLinkDetailsPage />} />
            <Route path="/customer-labels" element={<CustomerLabelsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<PlaceholderPage title="Not Found" note="No booking screen for this route." />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ModalProvider>
  );
}
