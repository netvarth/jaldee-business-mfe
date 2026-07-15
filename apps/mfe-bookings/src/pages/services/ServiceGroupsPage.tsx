import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, DataTable, EmptyState, Input, PageHeader, Popover, Tabs, type ColumnDef } from "@jaldee/design-system";
import { useServices } from "../../services/useServices";
import { useServiceGroups } from "../../services/useServiceGroups";
import type { ServiceGroupItem, ServiceItem } from "../../types";

export default function ServiceGroupsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { services } = useServices();
  const { groups, deleteGroup } = useServiceGroups();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const serviceMap = useMemo(
    () => new Map(services.map((service) => [service.uid ?? service.id, service])),
    [services],
  );

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups;
    return groups.filter((group) =>
      group.name.toLowerCase().includes(normalized) ||
      (group.description ?? "").toLowerCase().includes(normalized),
    );
  }, [groups, query]);

  const columns = useMemo<ColumnDef<ServiceGroupItem>[]>(() => [
    {
      key: "name",
      header: "PACKAGE NAME & ID",
      render: (group) => {
        const initials = group.name.substring(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
              {initials}
            </div>
            <div>
              <p className="font-bold text-slate-900">{group.name}</p>
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span className="text-[#7c3aed]">#{group.id?.substring(0, 8).toUpperCase() || "N/A"}</span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "services",
      header: "INCLUDED SERVICES",
      render: (group) => (
        <div className="flex flex-wrap gap-2">
          {group.serviceIds.length ? group.serviceIds.map((serviceId) => (
            <span key={serviceId} className="rounded-full bg-[#f1f3f9] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              {serviceMap.get(serviceId)?.name ?? serviceId}
            </span>
          )) : <span className="text-sm text-slate-400">No services linked</span>}
        </div>
      ),
    },
    {
      key: "labels",
      header: "LABELS",
      render: (group) => (
        <div className="flex flex-wrap gap-2">
          {["Popular", "Specialty"].map((label, idx) => (
            <span key={idx} className="rounded-sm bg-[#f5f3ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7c3aed]">
              {label}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (group) => {
        const isActive = group.status === 'Active';
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-white ${isActive ? 'border-emerald-400 text-emerald-600' : 'border-slate-300 text-slate-500'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            {group.status || 'ACTIVE'}
          </span>
        );
      }
    },
    {
      key: "pricing",
      header: "FEE",
      render: (group) => (
        <span className="font-bold text-slate-900">
          {group.priceMode === "fixed" ? `₹${group.price ?? 0}` : "Dynamic"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      width: 120,
      render: (group) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/services/groups/${group.id}/details`);
            }}
          >
            {/* Eye Icon */}
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </button>
          
          <Popover
            trigger={
              <button className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
              </button>
            }
            placement="bottom"
            align="end"
            portal
          >
            <div className="flex min-w-[120px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => navigate("/services/groups/create", { state: { group } })}
              >
                Edit
              </button>
              <button
                className="px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                onClick={() => deleteGroup(group.id)}
              >
                Delete
              </button>
            </div>
          </Popover>
        </div>
      ),
    },
  ], [deleteGroup, navigate, serviceMap]);

  const groupedServices = useMemo(() => {
    const assigned = new Set<string>();
    groups.forEach((group) => {
      group.serviceIds.forEach((id) => assigned.add(id));
    });
    const ungrouped = services.filter((service) => {
      if (service.uid) {
        return !assigned.has(service.uid);
      } else {
        return !assigned.has(service.id);
      }
    });
    return { ungrouped, assignedCount: assigned.size };
  }, [groups, services]);

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-white p-4 md:p-6">
      <PageHeader
        title="Services and Service Packages"
        subtitle="Configure and manage clinical consultation services offered by Global Care Hospital"
      />

      <div className="mt-4 mb-6">
        <Tabs
          value="groups"
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
            id="bookings-service-groups-search"
            type="search"
            placeholder="Search packages..."
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
          onClick={() => navigate("/services/groups/create")}
          className="bg-[#4F2B85] hover:bg-[#3D2168] text-white"
        >
          + Create New Package
        </Button>
      </div>

      <DataTable
        data={filteredGroups}
        columns={columns}
        getRowId={(group) => group.id}
        rowClassName={(group) => group.status === "Active" ? "" : "opacity-60"}
        pagination={{
          page,
          pageSize: 10,
          total: filteredGroups.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No Service Packages" description="Create a package to bundle services for scheduling and booking." />}
      />

      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Catalog Coverage</h2>
            <p className="mt-1 text-sm text-slate-500">Services not linked to a package remain bookable individually.</p>
          </div>
          <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            {groupedServices.assignedCount} grouped
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {groupedServices.ungrouped.length ? groupedServices.ungrouped.map((service) => (
            <span key={service.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
              {service.name}
            </span>
          )) : <span className="text-sm text-slate-400">All services are assigned to packages.</span>}
        </div>
      </section>
    </section>
  );
}
