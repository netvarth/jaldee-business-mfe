import { EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useLocation } from "react-router-dom";

const labels: Record<string, string> = {
  appointments: "Appointments",
  requests: "Requests",
  tokens: "Tokens",
  checkin: "Self Check-in",
  queue: "Live Queue",
  "schedule-settings": "Queue / Schedule Settings",
  calendar: "Calendar",
  resources: "Resources",
  services: "Services",
  "staff-availability": "Staff Availability",
  "online-page": "Online Booking Page",
  deposits: "Booking Deposits",
  customers: "Booking Customers",
  leads: "Booking Leads",
  tasks: "Booking Tasks",
  users: "Booking Staff",
  finance: "Booking Payments",
  analytics: "Booking Analytics",
  reports: "Booking Reports",
  membership: "Membership",
  "audit-log": "Booking Audit Log",
  settings: "Booking Settings",
};

export default function PlaceholderPage() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  const section = parts[1] ?? parts[0] ?? "";
  const title = labels[section] ?? (section ? section.replace(/-/g, " ") : "Bookings");

  return (
    <div className="app-shell">
      <div className="app-main">
        <div className="p-6">
          <PageHeader
            title={title}
            subtitle="This route is registered in the Bookings microfrontend."
          />
          <SectionCard>
            <EmptyState
              title={`${title} is ready for implementation`}
              description="The route resolves through shell and the Bookings remote. Connect the feature page here next."
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
