import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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

  const columns = useMemo<ColumnDef<ServiceItem>[]>(
    () => [
      {
        key: "name",
        header: "SERVICE NAME & ID",
        sortable: true,
        width: "28%",
        render: (service) => (
          <div>
            <p className="font-semibold text-slate-900">{service.name}</p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span className="text-[#7c3aed]">#{service.id?.substring(0, 8).toUpperCase() || "N/A"}</span>
            </p>
          </div>
        ),
      },
      {
        key: "labels",
        header: "TAGS",
        render: (service) => (
          <div className="flex flex-wrap gap-2">
            {(service.labels?.length ? service.labels : ["OPD"]).map((label, idx) => {
              const tagColors = [
                "border-red-200 text-red-600 bg-red-50",
                "border-emerald-200 text-emerald-600 bg-emerald-50",
                "border-amber-200 text-amber-600 bg-amber-50",
                "border-blue-200 text-blue-600 bg-blue-50",
                "border-purple-200 text-purple-600 bg-purple-50"
              ];
              const color = tagColors[idx % tagColors.length];
              return (
                <span key={label} className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${color}`}>
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
          const isActive = service.status === 'Active';
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-white ${isActive ? 'border-emerald-400 text-emerald-600' : 'border-slate-300 text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              {service.status || 'ACTIVE'}
            </span>
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
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                {service.serviceMode ?? "ONLINE"}
              </span>
              <span className="text-sm font-bold text-slate-900">
                ₹{service.price}
              </span>
            </div>
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
                className="rounded-full font-semibold border-slate-200 text-slate-700"
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
      className="flex h-full flex-col overflow-y-auto bg-white p-4 md:p-6"
    >
      <PageHeader
        title="Services and Service Packages"
        subtitle="Configure and manage clinical consultation services offered by Global Care Hospital"
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Input
            id="bookings-services-search"
            data-testid="bookings-services-search"
            type="search"
            placeholder="Search services..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            className="w-72"
            containerClassName="w-auto"
          />
          <Button variant="outline" className="text-slate-500 font-semibold border-slate-200 h-10 px-4">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            Filter
          </Button>
        </div>
        <Button
          id="bookings-services-create"
          data-testid="bookings-services-create"
          onClick={() => navigate("/services/create")}
          className="bg-[#4F2B85] hover:bg-[#3D2168] text-white"
        >
          + Create New Service
        </Button>
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
