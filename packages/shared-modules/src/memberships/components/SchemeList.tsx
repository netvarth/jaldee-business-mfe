import { useMemo, useState } from "react";
import { Button, DataTable, DataTableToolbar, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useUrlPagination } from "../../useUrlPagination";
import {
  useChangeServiceStatus,
  useServiceCount,
  useServices,
} from "../queries/memberships";
import { formatDate, getServiceStatusLabel, unwrapCount, unwrapList } from "./serviceShared";

type ServiceRow = {
  uid: string;
  id: string;
  name: string;
  imageUrl: string | null;
  type: string;
  validFrom: string;
  validTo: string;
  status: string;
};

function getServiceStatusVariant(status: string): "success" | "danger" | "warning" | "neutral" {
  const normalized = getServiceStatusLabel(status).toLowerCase();

  if (normalized === "active") return "success";
  if (normalized === "inactive") return "danger";
  if (normalized === "pending") return "warning";

  return "neutral";
}

function getServiceStatusOptions(status: string) {
  const current = getServiceStatusLabel(status);

  if (current === "Active") {
    return [{ value: "Inactive", label: "Inactive" }];
  }

  if (current === "Pending") {
    return [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ];
  }

  return [{ value: "Active", label: "Active" }];
}

function toServiceRows(data: unknown): ServiceRow[] {
  return unwrapList(data).map((service: any, index: number) => ({
    uid: String(service.uid ?? service.id ?? index),
    id: String(service.id ?? service.uid ?? index),
    name: String(service.serviceName ?? service.name ?? `Service ${index + 1}`),
    imageUrl: Array.isArray(service.serviceImage) && service.serviceImage.length > 0
      ? String(service.serviceImage[service.serviceImage.length - 1]?.s3path ?? "")
      : null,
    type: String(
      service.serviceCategory?.categoryName ??
      service.serviceCategory?.name ??
      service.serviceType?.name ??
      service.serviceTypeName ??
      service.type ??
      "-"
    ),
    validFrom: formatDate(service.validityStartDate ?? service.validFrom ?? service.startDate ?? service.createdDate ?? service.createdAt),
    validTo: formatDate(service.validityEndDate ?? service.validTo ?? service.expiryDate ?? service.endDate ?? service.validityEndDate),
    status: String(service.status ?? service.transactionStatus ?? "Pending"),
  }));
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

export function SchemeList() {
  const { assetsBaseUrl, basePath, routeParams } = useSharedModulesContext();
  const isServiceView = routeParams?.view === "service";
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "membershipServices",
    resetDeps: [appliedSearchQuery],
  });
  const [statusError, setStatusError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      ...(appliedSearchQuery ? { "servicename-like": appliedSearchQuery } : {}),
      from: (page - 1) * pageSize,
      count: pageSize,
    }),
    [appliedSearchQuery, page, pageSize]
  );

  const servicesQuery = useServices(filters);
  const serviceCountQuery = useServiceCount(
    appliedSearchQuery ? { "servicename-like": appliedSearchQuery } : {}
  );
  const changeServiceStatusMutation = useChangeServiceStatus();

  const serviceRows = useMemo(() => toServiceRows(servicesQuery.data), [servicesQuery.data]);
  const totalServices = unwrapCount(serviceCountQuery.data) || serviceRows.length;
  const noSchemeImage = assetsBaseUrl
    ? `${assetsBaseUrl.replace(/\/+$/, "")}/assets/images/membership/dashboard-actions/noscheme.png`
    : "/assets/images/membership/dashboard-actions/noscheme.png";

  const serviceColumns = useMemo<ColumnDef<ServiceRow>[]>(
    () => [
      {
        key: "name",
        header: "Service Name",
        render: (service) => (
          <div className="flex items-center gap-3">
            {service.imageUrl ? (
              <img src={service.imageUrl} alt="" className="h-12 w-12 rounded-full border border-slate-200 object-cover" />
            ) : (
              <img
                src={noSchemeImage}
                alt=""
                className="h-12 w-12 rounded-full border border-slate-200 object-cover"
              />
            )}
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">{service.name}</div>
            </div>
          </div>
        ),
      },
      { key: "type", header: "Type" },
      { key: "validFrom", header: "Validity Start Date" },
      { key: "validTo", header: "Validity End Date" },
      {
        key: "status",
        header: "Status",
        render: (service) => {
          const label = getServiceStatusLabel(service.status);
          const options = getServiceStatusOptions(service.status);

          return (
            <div className="flex items-center gap-2">
              <select
                aria-label={`Change status for ${service.name}`}
                value=""
                disabled={changeServiceStatusMutation.isPending}
                className={
                  `rounded-md border px-3 py-2 text-sm font-medium outline-none ${
                    label === "Active"
                      ? "border-emerald-500 text-emerald-700"
                      : label === "Inactive"
                        ? "border-rose-500 text-rose-600"
                        : "border-amber-400 text-amber-700"
                  }`
                }
                onClick={(event) => event.stopPropagation()}
                onChange={async (event) => {
                  const nextStatus = event.target.value;

                  if (!nextStatus || nextStatus === label) return;

                  try {
                    setStatusError(null);
                    await changeServiceStatusMutation.mutateAsync({
                      uid: service.uid,
                      statusId: nextStatus,
                    });
                    await servicesQuery.refetch();
                    await serviceCountQuery.refetch();
                  } catch (error: any) {
                    setStatusError(
                      typeof error?.message === "string"
                        ? error.message
                        : "Unable to change the service status."
                    );
                  }
                }}
              >
                <option value="" disabled>{label}</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (service) => (
          <div className="flex justify-end gap-2">
            {getServiceStatusLabel(service.status) === "Active" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  window.location.assign(`${basePath}/service/update/${service.uid}`);
                }}
              >
                Edit
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="border-[#437EF7] text-[#437EF7]"
              onClick={(event) => {
                event.stopPropagation();
                window.location.assign(`${basePath}/service/servicedetails/${service.uid}`);
              }}
            >
              View
            </Button>
          </div>
        ),
      },
    ],
    [assetsBaseUrl, basePath, changeServiceStatusMutation, noSchemeImage, serviceCountQuery, servicesQuery]
  );

  if (!isServiceView) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">Schemes</h1>
        <SectionCard title="Schemes">
          <p>Schemes management coming soon...</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership Services"
        subtitle="Create, review, and manage membership services from one place."
        back={{ label: "Back", href: `${basePath}/dashboard` }}
        onNavigate={(href) => window.location.assign(href)}
        actions={(
          <Button onClick={() => window.location.assign(`${basePath}/service/create`)}>
            Create
          </Button>
        )}
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="space-y-4">
          {statusError ? <ErrorBanner message={statusError} /> : null}

          <div className="border-b border-slate-200 px-6 py-4">
            <DataTableToolbar
              query={searchQuery}
              onQueryChange={(value) => {
                setSearchQuery(value);
                setAppliedSearchQuery(value.trim());
              }}
              searchPlaceholder="Search services by name..."
              recordCount={totalServices}
            />
          </div>

          <div className="p-6 pt-4">
            <DataTable
              data={serviceRows}
              columns={serviceColumns}
              getRowId={(row) => row.uid}
              loading={servicesQuery.isLoading || serviceCountQuery.isLoading}
              onRowClick={(service) => window.location.assign(`${basePath}/service/servicedetails/${service.uid}`)}
              pagination={{
                page,
                pageSize,
                total: totalServices,
                onChange: setPage,
                onPageSizeChange: setPageSize,
                mode: "server",
              }}
              emptyState={(
                <EmptyState
                  title="No services found"
                  description="Create a service or adjust the current search."
                />
              )}
              data-testid="membership-services-page-table"
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
