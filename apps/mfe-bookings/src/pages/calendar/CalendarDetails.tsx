import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, PageHeader } from "@jaldee/design-system";
import type { Calendar } from "../../types";

const channelIcon: Record<string, string> = {
  Online: "Online",
  "Walk-in": "Walk-in",
  "Phone-in": "Phone-in",
};

export default function CalendarDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const calendar = (location.state as { calendar?: Calendar } | null)?.calendar;

  if (!calendar) {
    return (
      <main
        id="bookings-calendar-details-page"
        data-testid="bookings-calendar-details-page"
        data-state="empty"
        className="flex h-full flex-col bg-slate-50"
      >
        <DetailsHeader title="Calendar Details" onBack={() => navigate("/calendars")} />
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm font-medium text-slate-500">
          Select a calendar from the calendar list to view its details.
        </div>
      </main>
    );
  }

  return (
    <main
      id="bookings-calendar-details-page"
      data-testid="bookings-calendar-details-page"
      data-state="ready"
      className="flex h-full flex-col bg-slate-50"
    >
      <DetailsHeader
        title={calendar.name}
        subtitle={calendar.description || "Calendar configuration and assignments."}
        onBack={() => navigate("/calendars")}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="flex-1 p-4 md:p-6 lg:overflow-y-auto">
          <section
            id="bookings-calendar-details-summary"
            data-testid="bookings-calendar-details-summary"
            className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-start md:p-6"
          >
            <div
              className="h-12 w-12 shrink-0 rounded-xl"
              style={{ backgroundColor: calendar.color || "#3b82f6" }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">Calendar overview</h2>
                <Badge variant="success">{calendar.status || "Active"}</Badge>
              </div>
              <p className="mt-1.5 text-sm text-slate-500">
                {calendar.description || "No description"}
              </p>
              {calendar.locationName && (
                <p className="mt-3 text-sm font-medium text-slate-500">
                  {calendar.locationName}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <ActionButton
                id="edit"
                label="Edit Calendar"
                onClick={() => navigate("/calendars/edit", { state: { calendar } })}
              />
              <ActionButton
                id="customize"
                label="Customize"
                onClick={() => navigate("/calendars/customize", { state: { calendar } })}
              />
              <Button
                id="bookings-calendar-details-settings"
                data-testid="bookings-calendar-details-settings"
                onClick={() => navigate("/calendars/customize", { state: { calendar } })}
              >
                Calendar Settings
              </Button>
            </div>
          </section>
        </div>

        <aside
          id="bookings-calendar-details-sidebar"
          data-testid="bookings-calendar-details-sidebar"
          className="grid gap-6 border-t border-slate-200 bg-white p-5 sm:grid-cols-2 lg:w-72 lg:shrink-0 lg:grid-cols-1 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-6"
        >
          <ChipGroup title="Services" items={calendar.services ?? []} empty="No services assigned" />
          <ChipGroup title="Users" items={calendar.users ?? []} empty="No users assigned" />
          <ChipGroup
            title="Channels"
            items={(calendar.bookingChannels ?? []).map(
              (channel) => channelIcon[channel] ?? channel,
            )}
            empty="No channels configured"
          />
          <ChipGroup title="Labels" items={calendar.tags ?? []} empty="No labels" />
          {typeof calendar.capacityOverride === "number" && (
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Capacity override
              </h2>
              <p className="text-sm font-semibold text-slate-800">
                {calendar.capacityOverride}
              </p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function DetailsHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 pt-4 md:px-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={{ label: "Back to calendars", href: "/calendars" }}
        onNavigate={onBack}
        className="mb-4"
      />
    </header>
  );
}

function ActionButton({
  id,
  label,
  onClick,
}: {
  id: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      id={`bookings-calendar-details-${id}`}
      data-testid={`bookings-calendar-details-${id}`}
      onClick={onClick}
      variant="secondary"
    >
      {label}
    </Button>
  );
}

function ChipGroup({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">{empty}</span>
        )}
      </div>
    </div>
  );
}
