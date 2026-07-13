import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  type ColumnDef,
} from "@jaldee/design-system";
import { useCalendars } from "../../services/useCalendars";
import type { Calendar } from "../../types";

import { useServices } from "../../services/useServices";
import { useUsers } from "../../services/useUsers";

function ChipRow({ label, items }: { label: string; items?: string[] }) {
  const list = items ?? [];
  if (list.length === 0) {
    return <span className="text-xs text-slate-400">{`No ${label.toLowerCase()}`}</span>;
  }
  const shown = list.slice(0, 2);
  const extra = list.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((item) => (
        <span
          key={item}
          className="max-w-[120px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
          title={item}
        >
          {item}
        </span>
      ))}
      {extra > 0 && <span className="text-xs font-medium text-slate-500">{`+${extra}`}</span>}
    </div>
  );
}

function AssignedCell({ services, users }: { services?: string[]; users?: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Services</span>
        <ChipRow label="services" items={services} />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Users</span>
        <ChipRow label="users" items={users} />
      </div>
    </div>
  );
}

function statusClass(status?: string) {
  if (status === "DRAFT") return "bg-slate-100 text-slate-600";
  if (status === "INACTIVE") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-700";
}

function statusLabel(status?: string) {
  if (status === "DRAFT") return "Draft";
  if (status === "INACTIVE") return "Inactive";
  return "Active";
}

function resolveAssignedServiceNames(
  services: Calendar["services"],
  allServices: Array<{ id?: string; uid?: string; name?: string }>,
) {
  return (services ?? [])
    .map((service) => {
      if (!service) return null;

      const serviceId =
        typeof service === "string" ? service : service.uid || service.id || null;
      const serviceName =
        typeof service === "object" && "name" in service ? service.name : null;

      if (!serviceId && !serviceName) return null;

      const found = allServices.find((item) => item.id === serviceId || item.uid === serviceId);
      return found?.name || serviceName || serviceId;
    })
    .filter((value): value is string => Boolean(value));
}

function resolveAssignedUserNames(
  users: Calendar["users"],
  allUsers: Array<{
    id?: string;
    uid?: string;
    userUid?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  }>,
) {
  return (users ?? [])
    .map((user) => {
      if (!user) return null;

      const userId =
        typeof user === "string" ? user : user.userUid || user.uid || user.id || null;
      const userName =
        typeof user === "object" && (user.displayName || user.firstName)
          ? user.displayName || `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : null;

      if (!userId && !userName) return null;

      const found = allUsers.find(
        (item) => item.userUid === userId || item.uid === userId || item.id === userId,
      );
      return found
        ? found.displayName || `${found.firstName || ""} ${found.lastName || ""}`.trim()
        : userName || userId;
    })
    .filter((value): value is string => Boolean(value));
}

export default function CalendarList() {
  const { calendars, loading } = useCalendars();
  const { services: allServices } = useServices();
  const { users: allUsers } = useUsers();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return calendars;
    return calendars.filter(
      (calendar) =>
        calendar.name.toLowerCase().includes(normalized) ||
        (calendar.description ?? "").toLowerCase().includes(normalized),
    );
  }, [calendars, query]);

  const columns = useMemo<ColumnDef<Calendar>[]>(
    () => [
      {
        key: "name",
        header: "Calendar name",
        sortable: true,
        width: "32%",
        render: (calendar) => (
          <div className="flex items-center gap-3">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded"
              style={{ backgroundColor: calendar.color || "#9333ea" }}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{calendar.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {calendar.description || "No description"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "locationName",
        header: "Location",
        sortable: true,
        render: (calendar) => calendar.locationName || "-",
      },
      {
        key: "bookingChannels",
        header: "Booking channels",
        render: (calendar) => (
          <div className="flex flex-wrap gap-1.5">
            {(calendar.bookingChannels ?? []).length ? (
              calendar.bookingChannels?.map((channel) => (
                <span
                  key={channel}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  {channel}
                </span>
              ))
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </div>
        ),
      },
      {
        key: "assigned",
        header: "Assigned",
        render: (calendar) => (
          <AssignedCell
            services={resolveAssignedServiceNames(calendar.services, allServices)}
            users={resolveAssignedUserNames(calendar.users, allUsers)}
          />
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (calendar) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(calendar.status)}`}>
            {statusLabel(calendar.status)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        sticky: "right",
        width: 100,
        render: (calendar) => (
          <Button
            variant="outline"
            size="sm"
            id={`bookings-calendar-edit-${calendar.uid}`}
            data-testid={`bookings-calendar-edit-${calendar.uid}`}
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={(event) => {
              event.stopPropagation();
              if (calendar.status === "DRAFT") {
                navigate("/calendars/create", { state: { calendar } });
              } else {
                navigate("/calendars/edit", { state: { calendar } });
              }
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    [allServices, allUsers, navigate],
  );

  return (
    <section
      id="page-calendars"
      data-testid="bookings-calendar-list-page"
      className="flex h-full flex-col gap-4 overflow-y-auto bg-slate-50 p-4 md:p-6"
    >
      <PageHeader
        title="Calendars"
        subtitle="Manage appointment calendars, channels, and assigned teams."
        actions={
          <Button
            id="bookings-calendar-list-create"
            data-testid="bookings-calendar-list-create"
            onClick={() => navigate("/calendars/create")}
          >
            Create Calendar
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          id="bookings-calendar-list-search"
          data-testid="bookings-calendar-list-search"
          type="search"
          placeholder="Search calendars"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-sm"
        />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(calendar) => calendar.uid}
        loading={loading}
        onRowClick={(calendar) =>
          navigate(`/calendars/${calendar.uid}/details`, { state: { calendar } })
        }
        pagination={{
          page,
          pageSize: 10,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={
          <EmptyState
            title="No calendars found"
            description="No calendars match the current search."
          />
        }
        data-testid="bookings-calendar"
      />
    </section>
  );
}
