import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, DataTable, EmptyState, Input, PageHeader, type ColumnDef, Badge, Popover, Drawer
} from "@jaldee/design-system";
import { LayoutGrid, List, Filter } from "lucide-react";
import { useQrLinks, type QrLink } from "../../services/useQrLinks";
import { useQrLinkSearchSchema } from "../../services/useQrLinkSearchSchema";
import { useToast } from "../../contexts/ToastContext";
import {
  SchemaFilterBuilder,
  compactSearchClauses,
} from "@jaldee/shared-modules";
import type { SearchFilterClause } from "@jaldee/shared-modules";
import { formatAppliedCustomerFilterSummary } from "../../services/customerSearch";

export default function QrLinksPage() {
  const navigate = useNavigate();
  
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilterClause[]>([]);
  const [draftFilters, setDraftFilters] = useState<SearchFilterClause[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { schema, loading: schemaLoading } = useQrLinkSearchSchema();
  const { qrLinks, loading, error, update, remove } = useQrLinks({
    filterClauses: advancedFilters,
    schema,
  });
  const { showToast } = useToast();

  const [searchVal, setSearchVal] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const getQrLinkId = (q: QrLink) => q.uid ?? q.id;

  const appliedFilterCount = useMemo(
    () => compactSearchClauses(advancedFilters, schema).length,
    [advancedFilters, schema]
  );

  const toggle = async (q: QrLink) => {
    try {
      const newStatus = (q.status ?? "").toLowerCase() === "enabled" ? "Disabled" : "Enabled";
      const id = getQrLinkId(q);
      if (!id) {
        throw new Error("QR link id is missing.");
      }
      await update(id, { ...q, status: newStatus });
      showToast("QR link status updated", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update QR link", "error");
    }
  };

  const del = async (q: QrLink) => {
    try { 
      const id = getQrLinkId(q);
      if (!id) {
        throw new Error("QR link id is missing.");
      }
      await remove(id); 
      showToast("QR link deleted", "success"); 
    } catch (e) { 
      showToast(e instanceof Error ? e.message : "Failed to delete QR link", "error"); 
    }
  };

  const openDetails = (q: QrLink) => {
    const id = getQrLinkId(q);
    if (!id) {
      showToast("QR link id is missing for this row.", "error");
      return;
    }
    navigate(`/qr-links/${id}`);
  };

  const openEdit = (q: QrLink) => {
    const id = getQrLinkId(q);
    if (!id) {
      showToast("QR link id is missing for this row.", "error");
      return;
    }
    navigate(`/qr-links/${id}/edit`);
  };

  const filtered = qrLinks.filter((q) =>
    !searchVal || (q.name?.toLowerCase().includes(searchVal.toLowerCase())));

  const columns: ColumnDef<QrLink>[] = [
    { key: "name", header: "Name", render: (q) => q.name ?? "—" },
    { 
      key: "type", 
      header: "Type", 
      render: (q) => {
        if (q.type === "CALENDAR") return "Calendar";
        if (q.type === "SCHEDULE") return "Schedule";
        if (q.type === "TIMEWINDOW") return "Time Window";
        return q.type ?? "—";
      } 
    },
    { key: "calendarName", header: "Calendar", render: (q) => q.calendarName ?? "—" },
    { 
      key: "status", 
      header: "Status", 
      render: (q) => {
        const isActive = (q.status ?? "").toLowerCase() === "enabled";
        return (
          <Badge variant={isActive ? "success" : "neutral"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      } 
    },
    {
      key: "qrLink", header: "Link",
      render: (q) => q.qrLink
        ? <a href={q.qrLink} target="_blank" rel="noreferrer" className="text-violet-600 underline">Open</a>
        : "—",
    },
    {
      key: "actions", header: "", align: "right",
      render: (q) => {
        const isActive = (q.status ?? "").toLowerCase() === "enabled";
        return (
          <div className="flex justify-end gap-1">
            <Popover
              trigger={
                <button
                  id={`bookings-qrlink-actions-${q.uid}`}
                  data-testid={`bookings-qrlink-actions-${q.uid}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              }
              placement="bottom"
              align="end"
              portal
            >
              <div className="flex min-w-[150px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg whitespace-nowrap">
                <button
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => openDetails(q)}
                >
                  View Details
                </button>
                <button
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => openEdit(q)}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => toggle(q)}
                >
                  {isActive ? "Disable" : "Enable"}
                </button>
                <button
                  className="px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                  onClick={() => del(q)}
                >
                  Delete
                </button>
              </div>
            </Popover>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col gap-4">
      <PageHeader
        title="QR Links"
        subtitle="Shareable QR codes for calendars, schedules and time windows."
        actions={<Button onClick={() => navigate("/qr-links/create")}>New QR Link</Button>}
        stackOnMobile={false}
      />

      <div className="-mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
        <Input placeholder="Search QR links…" value={searchVal} onChange={(e) => setSearchVal(e.target.value)} containerClassName="w-full sm:max-w-xs" />
        
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center justify-center rounded-md p-1.5 transition ${viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
              aria-label="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center justify-center rounded-md p-1.5 transition ${viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"}`}
              aria-label="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="secondary"
            className="flex items-center gap-2 whitespace-nowrap bg-white border-slate-200"
            onClick={() => {
              setDraftFilters(advancedFilters);
              setDrawerOpen(true);
            }}
          >
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Filters</span>
            {appliedFilterCount > 0 && (
              <Badge variant="primary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">
                {appliedFilterCount}
              </Badge>
            )}
          </Button>
          
        </div>
      </div>
      
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}

      {viewMode === "list" ? (
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(q) => String(getQrLinkId(q) ?? q.name)}
          loading={loading || schemaLoading}
          emptyState={<EmptyState title="No QR links" description="Create a QR link to share booking access." />}
          tableClassName="min-w-[700px]"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
          {loading || schemaLoading ? (
            <div className="col-span-full py-12 text-center text-sm text-slate-500">Loading QR links...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full">
              <EmptyState title="No QR links" description="Create a QR link to share booking access." />
            </div>
          ) : (
            filtered.map((q) => {
              const isActive = (q.status ?? "").toLowerCase() === "enabled";
              let typeLabel = q.type ?? "—";
              if (q.type === "CALENDAR") typeLabel = "Calendar";
              if (q.type === "SCHEDULE") typeLabel = "Schedule";
              if (q.type === "TIMEWINDOW") typeLabel = "Time Window";

              return (
                <div key={String(getQrLinkId(q) ?? q.name)} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div className="font-semibold text-slate-800 break-all">{q.name ?? "—"}</div>
                    {columns.find(c => c.key === "actions")?.render?.(q, 0)}
                  </div>
                  <div className="flex-1 text-sm text-slate-600 mb-4 space-y-2">
                    <div><span className="font-medium text-slate-700">Type:</span> {typeLabel}</div>
                    <div><span className="font-medium text-slate-700">Calendar:</span> {q.calendarName ?? "—"}</div>
                    {q.qrLink && (
                      <div className="truncate">
                        <span className="font-medium text-slate-700">Link:</span>{" "}
                        <a href={q.qrLink} target="_blank" rel="noreferrer" className="text-violet-600 underline">Open</a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-400">{(q.uid || "").slice(0, 8)}...</span>
                    <Badge variant={isActive ? "success" : "neutral"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filter QR Links"
        size="md"
        footer={
          <div className="flex w-full justify-between gap-3 px-4 py-3 sm:px-6">
            <Button
              variant="secondary"
              onClick={() => {
                setDraftFilters([]);
                setAdvancedFilters([]);
                setDrawerOpen(false);
              }}
            >
              Clear All
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setAdvancedFilters(draftFilters);
                  setDrawerOpen(false);
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        }
      >
        <div className="p-4 sm:p-6">
          <SchemaFilterBuilder
            schema={schema}
            value={draftFilters}
            onChange={setDraftFilters}
          />
        </div>
      </Drawer>
    </div>
  );
}
