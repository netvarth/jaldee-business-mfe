import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, DataTable, EmptyState, Input, PageHeader, type ColumnDef } from "@jaldee/design-system";
import { useServices } from "../../services/useServices";
import { useServiceGroups } from "../../services/useServiceGroups";
import type { ServiceGroupItem, ServiceItem } from "../../types";

export default function ServiceGroupsPage() {
  const navigate = useNavigate();
  const { services } = useServices();
  const { groups, deleteGroup } = useServiceGroups();
  const [query, setQuery] = useState("");

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
      header: "Group Name",
      render: (group) => <span className="font-semibold text-slate-900">{group.name}</span>,
    },
    {
      key: "services",
      header: "Services",
      render: (group) => (
        <div className="flex flex-wrap gap-1">
          {group.serviceIds.length ? group.serviceIds.map((serviceId) => (
            <span key={serviceId} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
              {serviceMap.get(serviceId)?.name ?? serviceId}
            </span>
          )) : <span className="text-slate-400">No services linked</span>}
        </div>
      ),
    },
    {
      key: "pricing",
      header: "Pricing",
      render: (group) => group.priceMode === "fixed" ? `Fixed · ₹${group.price ?? 0}` : "Derived from services",
    },
    {
      key: "status",
      header: "Status",
      render: (group) => (
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${group.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {group.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (group) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={(event) => {
            event.stopPropagation();
            navigate("/services/groups/create", { state: { group } });
          }}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={(event) => {
            event.stopPropagation();
            deleteGroup(group.id);
          }}>
            Delete
          </Button>
        </div>
      ),
    },
  ], [deleteGroup, navigate, serviceMap]);

  const groupedServices = useMemo(() => {
    const ungrouped: ServiceItem[] = [];
    const assigned = new Set(groups.flatMap((group) => group.serviceIds));
    services.forEach((service) => {
      const id = service.uid ?? service.id;
      if (!assigned.has(id)) {
        ungrouped.push(service);
      }
    });
    return { ungrouped, assignedCount: assigned.size };
  }, [groups, services]);

  return (
    <section className="flex h-full flex-col gap-4 overflow-y-auto bg-slate-50 p-4 md:p-6">
      <PageHeader
        title="Service Groups"
        subtitle="Create reusable service bundles and keep the catalog grouped for booking teams."
        actions={<Button onClick={() => navigate("/services/groups/create")}>Create Service Group</Button>}
      />

      <Input
        id="bookings-service-groups-search"
        type="search"
        placeholder="Search service groups"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        containerClassName="sm:max-w-sm"
      />

      <DataTable
        data={filteredGroups}
        columns={columns}
        getRowId={(group) => group.id}
        emptyState={<EmptyState title="No Service Groups" description="Create a group to bundle services for scheduling and booking." />}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Catalog Coverage</h2>
            <p className="mt-1 text-sm text-slate-500">Services not linked to a group remain bookable individually.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {groupedServices.assignedCount} grouped
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {groupedServices.ungrouped.length ? groupedServices.ungrouped.map((service) => (
            <span key={service.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
              {service.name}
            </span>
          )) : <span className="text-sm text-slate-400">All services are assigned to groups.</span>}
        </div>
      </section>
    </section>
  );
}
