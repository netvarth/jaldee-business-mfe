import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  cn,
  type ColumnDef,
} from "@jaldee/design-system";
import { Ban, CheckCircle } from "../../components/icons";
import { useServices } from "../../services/useServices";
import type { ServiceItem } from "../../types";

export default function ServicesPage() {
  const { services, loading, toggleStatus } = useServices();
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
      { key: "department", header: "Department", sortable: true, className: "font-medium" },
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
        width: 150,
        render: (service) => {
          const active = service.status === "Active";
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                id={`bookings-service-edit-${service.id}`}
                data-testid={`bookings-service-edit-${service.id}`}
                type="button"
                onClick={(event) => event.stopPropagation()}
                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconOnly
                icon={active ? <Ban size={16} /> : <CheckCircle size={16} />}
                id={`bookings-service-status-${service.id}`}
                data-testid={`bookings-service-status-${service.id}`}
                data-active={active ? "true" : "false"}
                type="button"
                title={active ? "Disable" : "Enable"}
                onClick={(event) => {
                  event.stopPropagation();
                  void toggleStatus(service);
                }}
                className={cn(
                  "rounded-lg border p-1.5 transition-colors",
                  active
                    ? "border-red-200 text-red-500 hover:bg-red-50"
                    : "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
                )}
              />
            </div>
          );
        },
      },
    ],
    [toggleStatus],
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
          <Button
            id="bookings-services-create"
            data-testid="bookings-services-create"
            onClick={() => navigate("/services/create")}
          >
            Create Service
          </Button>
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
