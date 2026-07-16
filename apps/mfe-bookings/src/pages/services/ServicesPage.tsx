import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  Popover,
  Tabs,
  type ColumnDef,
} from "@jaldee/design-system";
import { useServices } from "../../services/useServices";
import type { ServiceItem } from "../../types";

export default function ServicesPage() {
  const { services, loading } = useServices();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return services.filter(
      (service) =>
        !normalized ||
        service.name.toLowerCase().includes(normalized) ||
        (service.description ?? "").toLowerCase().includes(normalized),
    );
  }, [query, services]);

  const formatServiceStatus = (status?: ServiceItem["status"]) => (status === "Active" ? "Active" : "Inactive");
  const serviceStatusVariant = (status?: ServiceItem["status"]): "success" | "neutral" =>
    status === "Active" ? "success" : "neutral";

  const columns = useMemo<ColumnDef<ServiceItem>[]>(
    () => [
      {
        key: "name",
        header: "SERVICE NAME & ID",
        sortable: true,
        width: "28%",
        render: (service) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{service.name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {service.id || "-"}
            </p>
          </div>
        ),
      },
      {
        key: "labels",
        header: "TAGS",
        render: (service) => (
          <div className="flex flex-wrap gap-1.5">
            {(service.labels?.length ? service.labels : ["OPD"]).map((label) => {
              return (
                <span key={label} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                  {label}
                </span>
              );
            })}
          </div>
        ),
      },
      {
        key: "status",
        header: "STATUS",
        render: (service) => {
          return (
            <Badge variant={serviceStatusVariant(service.status)}>
              {formatServiceStatus(service.status)}
            </Badge>
          );
        }
      },
      {
        key: "price",
        header: "SERVICE TYPE & FEE",
        sortable: true,
        render: (service) => (
          <div>
            <p className="text-xs font-medium text-slate-700">
              {service.serviceType ?? "Consultation"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">₹{service.price}</p>
          </div>
        ),
      },
      {
        key: "actions",
        header: "ACTIONS",
        align: "right",
        width: 140,
        render: (service) => {
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/services/${service.id}/details`);
                }}
                className="font-semibold"
              >
                Details
              </Button>
              <Popover
                trigger={
                  <button className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                  </button>
                }
                placement="bottom"
                align="end"
                portal
              >
                <div className="flex min-w-[120px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    onClick={() => navigate(`/services/edit/${service.id}`)}
                  >
                    Edit
                  </button>
                </div>
              </Popover>
            </div>
          );
        },
      },
    ],
    [navigate],
  );

  return (
    <section
      id="bookings-services-page"
      data-testid="bookings-services-page"
      className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 md:p-6"
    >
      <PageHeader
        title="Services"
        subtitle="Configure and manage booking services."
        actions={
          <Button
            id="bookings-services-create"
            data-testid="bookings-services-create"
            onClick={() => navigate("/services/create")}
          >
            Create Service
          </Button>
        }
      />

      <div className="mt-4 mb-6">
        <Tabs
          value="services"
          onValueChange={(val) => navigate(val === "groups" ? "/services/groups" : "/services")}
          items={[
            { value: "services", label: "Services List" },
            { value: "groups", label: "Service Packages" },
          ]}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Input
          id="bookings-services-search"
          data-testid="bookings-services-search"
          type="search"
          placeholder="Search services"
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
        getRowId={(service) => service.id}
        loading={loading}
        rowClassName={(service) => service.status === "Active" ? "" : "opacity-60"}
        pagination={{
          page,
          pageSize: 10,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No services found" description="Try changing the search." />}
        data-testid="bookings-services"
      />
    </section>
  );
}
