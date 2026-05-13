import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  SectionCard,
  type ColumnDef,
} from "@jaldee/design-system";
import {
  useUserAccountProfile,
  useUserNonWorkingDays,
  useUserNonWorkingDaysCount,
  useUserQueues,
  useUserSchedules,
  useUserServices,
} from "../queries/users";
import type {
  UserNonWorkingDay,
  UserQueueAssignment,
  UserScheduleAssignment,
  UserServiceAssignment,
} from "../types";
import { UserStatusBadge } from "./shared";

function CardHeader({
  title,
  description,
  actionLabel,
}: {
  title: string;
  description: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="max-w-3xl text-sm text-slate-500">{description}</p>
      </div>
      {actionLabel ? (
        <Button type="button" variant="outline" size="sm" onClick={() => {}}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function DataSection<T>({
  title,
  description,
  actionLabel,
  rows,
  columns,
  loading,
  emptyTitle,
  emptyDescription,
  pagination,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  rows: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
}) {
  return (
    <SectionCard className="border-slate-200 bg-white shadow-sm" padding={false}>
      <CardHeader title={title} description={description} actionLabel={actionLabel} />
      <div className="p-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <DataTable
            data={rows}
            columns={columns}
            loading={loading}
            pagination={
              pagination
                ? {
                    ...pagination,
                    mode: "server",
                  }
                : undefined
            }
            className="rounded-xl border-0 shadow-none"
            tableClassName="[&_thead_th]:bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_40%,white)] [&_thead_th]:py-3.5 [&_thead_th]:text-[length:var(--text-xs)] [&_tbody_td]:py-4"
            emptyState={<EmptyState title={emptyTitle} description={emptyDescription} />}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function ToggleBadge({ enabled }: { enabled: boolean }) {
  return <Badge variant={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Disabled"}</Badge>;
}

export function UserAccountPanel({ userId }: { userId: string }) {
  const profileQuery = useUserAccountProfile(userId);
  const profile = profileQuery.data;
  const summaryItems = [
    { label: "Public Search ID", value: profile?.customId || "-" },
    { label: "Public URL", value: profile?.shortUrl || "-" },
    {
      label: "Search Visibility",
      value:
        profile?.publicSearchEnabled === undefined
          ? "-"
          : profile.publicSearchEnabled
            ? "Enabled"
            : "Disabled",
    },
    {
      label: "Business Profile",
      value:
        profile?.businessProfilePermitted === undefined
          ? "-"
          : profile.businessProfilePermitted
            ? "Permitted"
            : "Restricted",
    },
  ];

  return (
    <SectionCard className="border-slate-200 bg-white shadow-sm" padding={false}>
      <CardHeader
        title="My Account"
        description="A design-system version of the legacy business profile area, focused on public profile settings and account discoverability."
        actionLabel="Edit Profile"
      />
      <div className="space-y-6 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="mt-2 break-words text-sm font-semibold text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">About</div>
            <p className="text-sm leading-6 text-slate-600">{profile?.about || "No profile description available."}</p>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Specializations</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(profile?.specializations?.length ? profile.specializations : ["No specializations"]).map((item) => (
                  <Badge key={item} variant="neutral">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Languages</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(profile?.languages?.length ? profile.languages : ["No languages"]).map((item) => (
                  <Badge key={item} variant="neutral">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">Social Links</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(profile?.socialLinks?.length ? profile.socialLinks : [{ label: "Links", value: "No social links connected." }]).map((item) => (
              <div key={`${item.label}-${item.value}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</div>
                <div className="mt-1 break-all text-sm text-slate-700">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {profileQuery.isError ? (
        <div className="border-t border-slate-200 px-5 py-4 text-sm text-amber-700">
          Account profile data could not be loaded from the provider profile endpoint.
        </div>
      ) : null}
    </SectionCard>
  );
}

export function UserServicesPanel({ userId }: { userId: string }) {
  const servicesQuery = useUserServices(userId);
  const columns = useMemo<ColumnDef<UserServiceAssignment>[]>(
    () => [
      { key: "name", header: "Service Name", headerClassName: "font-semibold text-slate-900" },
      { key: "serviceType", header: "Service Type", headerClassName: "font-semibold text-slate-900" },
      {
        key: "departmentName",
        header: "Department",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.departmentName || "-",
      },
      {
        key: "durationLabel",
        header: "Duration",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.durationLabel || "-",
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <UserStatusBadge status={row.status} />,
      },
    ],
    []
  );

  return (
    <DataSection
      title="Services"
      description="Assigned user services from the provider services endpoint, aligned with the legacy `user-services` slice."
      actionLabel="Add Service"
      rows={servicesQuery.data ?? []}
      columns={columns}
      loading={servicesQuery.isLoading}
      emptyTitle="No services assigned"
      emptyDescription="This user does not have any mapped services yet."
    />
  );
}

export function UserQueuesPanel({ userId }: { userId: string }) {
  const queuesQuery = useUserQueues(userId);
  const columns = useMemo<ColumnDef<UserQueueAssignment>[]>(
    () => [
      { key: "name", header: "Queue", headerClassName: "font-semibold text-slate-900" },
      {
        key: "locationName",
        header: "Location",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.locationName || "-",
      },
      {
        key: "serviceNames",
        header: "Services",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => (row.serviceNames.length ? row.serviceNames.join(", ") : "-"),
      },
      {
        key: "timeRange",
        header: "Hours",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.timeRange || "-",
      },
      {
        key: "todayEnabled",
        header: "Today",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <ToggleBadge enabled={row.todayEnabled} />,
      },
      {
        key: "futureEnabled",
        header: "Future",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <ToggleBadge enabled={row.futureEnabled} />,
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <UserStatusBadge status={row.status} />,
      },
    ],
    []
  );

  return (
    <DataSection
      title="Queues"
      description="Queue assignments for this user, using the same waitlist queue endpoint the legacy screen relied on."
      actionLabel="Add Queue"
      rows={queuesQuery.data ?? []}
      columns={columns}
      loading={queuesQuery.isLoading}
      emptyTitle="No queues available"
      emptyDescription="This user has no queue assignments yet."
    />
  );
}

export function UserSchedulesPanel({ userId }: { userId: string }) {
  const schedulesQuery = useUserSchedules(userId);
  const columns = useMemo<ColumnDef<UserScheduleAssignment>[]>(
    () => [
      { key: "name", header: "Schedule", headerClassName: "font-semibold text-slate-900" },
      {
        key: "locationName",
        header: "Location",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.locationName || "-",
      },
      {
        key: "daySummary",
        header: "Days",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.daySummary || "-",
      },
      {
        key: "timeRange",
        header: "Hours",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.timeRange || "-",
      },
      {
        key: "todayEnabled",
        header: "Today",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <ToggleBadge enabled={row.todayEnabled} />,
      },
      {
        key: "futureEnabled",
        header: "Future",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <ToggleBadge enabled={row.futureEnabled} />,
      },
      {
        key: "status",
        header: "Status",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <UserStatusBadge status={row.status} />,
      },
    ],
    []
  );

  return (
    <DataSection
      title="Schedules"
      description="User schedule coverage from the appointment schedule endpoint, simplified into a maintainable data table."
      actionLabel="Add Schedule"
      rows={schedulesQuery.data ?? []}
      columns={columns}
      loading={schedulesQuery.isLoading}
      emptyTitle="No schedules available"
      emptyDescription="This user has no schedule assignments yet."
    />
  );
}

export function UserNonWorkingDaysPanel({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const nonWorkingDaysQuery = useUserNonWorkingDays(userId, page, pageSize);
  const countQuery = useUserNonWorkingDaysCount(userId);
  const columns = useMemo<ColumnDef<UserNonWorkingDay>[]>(
    () => [
      { key: "dateRange", header: "Date", headerClassName: "font-semibold text-slate-900" },
      { key: "description", header: "Reason", headerClassName: "font-semibold text-slate-900" },
      {
        key: "timeRange",
        header: "Time",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => row.timeRange || "Full Day",
      },
      {
        key: "editable",
        header: "Edit Window",
        headerClassName: "font-semibold text-slate-900",
        render: (row) => <Badge variant={row.editable ? "info" : "neutral"}>{row.editable ? "Editable" : "Locked"}</Badge>,
      },
    ],
    []
  );

  return (
    <DataSection
      title="Non Working Days"
      description="Vacation and holiday entries for this user, using the same vacation endpoints as the legacy implementation."
      actionLabel="Add Day"
      rows={nonWorkingDaysQuery.data ?? []}
      columns={columns}
      loading={nonWorkingDaysQuery.isLoading}
      emptyTitle="No non-working days"
      emptyDescription="This user does not have any non-working days configured."
      pagination={{
        page,
        pageSize,
        total: countQuery.data || 0,
        onChange: setPage,
        onPageSizeChange: setPageSize,
      }}
    />
  );
}
