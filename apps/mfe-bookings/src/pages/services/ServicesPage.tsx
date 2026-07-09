import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  type ColumnDef,
} from "@jaldee/design-system";
import { useServices } from "../../services/useServices";
import { useServiceGroups } from "../../services/useServiceGroups";
import type { ServiceItem } from "../../types";

export default function ServicesPage() {
  const { services, loading } = useServices();
  const { groups } = useServiceGroups();
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

  const groupMap = useMemo(() => {
    const entries = new Map<string, string>();
    groups.forEach((group) => {
      group.serviceIds.forEach((serviceId) => entries.set(serviceId, group.name));
    });
    return entries;
  }, [groups]);

  const columns = useMemo<ColumnDef<ServiceItem>[]>(
    () => [
      {
        key: "name",
        header: "Service",
        sortable: true,
        width: "28%",
        render: (service) => (
          <div>
            <p className="font-semibold text-slate-900">{service.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">ID: {service.id}</p>
          </div>
        ),
      },
      {
        key: "labels",
        header: "Tags",
        render: (service) => (
          <div className="flex flex-wrap gap-1">
            {(service.labels?.length ? service.labels : ["OPD"]).map((label) => (
              <Badge key={label} variant="neutral">{label}</Badge>
            ))}
          </div>
        ),
      },
      {
        key: "group",
        header: "Service Group",
        render: (service) => {
          const groupName = groupMap.get(service.uid ?? service.id) ?? groupMap.get(service.id);
          return groupName ? <Badge variant="neutral">{groupName}</Badge> : <span className="text-slate-400">Ungrouped</span>;
        },
      },
      {
        key: "price",
        header: "Type and price",
        sortable: true,
        render: (service) => (
          <div>
            <p className="text-xs font-semibold text-slate-700">
              {service.serviceType ?? "Onsite Consultation"}
            </p>
            <p className="mt-0.5 font-bold text-emerald-700">
              ₹{service.price}{" "}
              <span className="text-xs font-medium text-slate-500">
                ({service.duration} mins)
              </span>
            </p>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        sticky: "right",
        width: 220,
        render: (service) => {
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                id={`bookings-service-edit-${service.id}`}
                data-testid={`bookings-service-edit-${service.id}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/services/edit/${service.id}`);
                }}
                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                id={`bookings-service-details-${service.id}`}
                data-testid={`bookings-service-details-${service.id}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/services/${service.id}/details`);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Details
              </Button>
            </div>
          );
        },
      },
    ],
    [groupMap, navigate],
  );

  return (
    <section
      id="bookings-services-page"
      data-testid="bookings-services-page"
      className="flex h-full flex-col gap-4 overflow-y-auto bg-slate-50"
    >
      <PageHeader
        title="Services"
        subtitle="Define the services and treatments you offer."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate("/services/groups")}>Service Groups</Button>
            <Button
              id="bookings-services-create"
              data-testid="bookings-services-create"
              onClick={() => navigate("/services/create")}
            >
              Create Service
            </Button>
          </div>
        }
      />

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

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(service) => service.id}
        loading={loading}
        rowClassName={(service) => service.status === "Active" ? "" : "opacity-55"}
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
