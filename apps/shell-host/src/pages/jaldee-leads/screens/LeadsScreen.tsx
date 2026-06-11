import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CrmLeadDto, CrmLeadPipelineDto, Product, Channel, FormTemplate } from '../types';
import { ICONS } from '../constants';
import { format } from '../lib/dateUtils';
import { cameFromDashboard, navigateBackToDashboard } from '../lib/navigationOrigin';
import { Button, Badge, Select, Tabs, PageHeader, SectionCard, DataTable, DataTableToolbar, EmptyState, Drawer } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useUrlPagination } from "@jaldee/shared-modules";

interface LeadsScreenProps {
  leads: CrmLeadDto[];
  setLeads: React.Dispatch<React.SetStateAction<CrmLeadDto[]>>;
  pipelines: CrmLeadPipelineDto[];
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
  products: Product[];
  channels: Channel[];
  forms: FormTemplate[];
  initialForceCreate?: boolean;
  fetchLeads?: (filters?: Record<string, unknown>, options?: { force?: boolean }) => void;
  fetchPipelines?: () => void;
  fetchProducts?: () => void;
  fetchChannels?: () => void;
  fetchTemplates?: () => void;
}

export default function LeadsScreen({
  leads,
  setLeads,
  pipelines,
  setPipelines,
  products,
  channels,
  forms,
  initialForceCreate,
  fetchLeads,
  fetchPipelines,
  fetchProducts,
  fetchChannels,
  fetchTemplates
}: LeadsScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const showDashboardBack = cameFromDashboard(location);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'OVERDUE' | 'UNASSIGNED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [pipelineFilter, setPipelineFilter] = useState<string>('ALL');
  const [draftPriorityFilter, setDraftPriorityFilter] = useState<string>('ALL');
  const [draftProductFilter, setDraftProductFilter] = useState<string>('ALL');
  const [draftChannelFilter, setDraftChannelFilter] = useState<string>('ALL');
  const [draftPipelineFilter, setDraftPipelineFilter] = useState<string>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const appliedFilterCount = [priorityFilter, productFilter, channelFilter, pipelineFilter].filter((value) => value !== 'ALL').length;
  const { page, setPage, pageSize, setPageSize } = useUrlPagination({
    namespace: "leadsList",
    defaultPageSize: 10,
    resetDeps: [search, statusTab, priorityFilter, productFilter, channelFilter, pipelineFilter],
  });

  const filteredLeads = useMemo(() => leads.filter(lead => {
    // Search filter
    const matchesSearch = 
      (lead.consumerFirstName?.toLowerCase() || '').includes(search.toLowerCase()) || 
      (lead.consumerLastName?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.consumerEmail?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.company?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.referenceNo?.toLowerCase() || '').includes(search.toLowerCase());
    
    // Priority filter
    const matchesPriority = priorityFilter === 'ALL' || lead.priority === priorityFilter;

    // Practical tab filter
    let matchesTab = true;
    if (statusTab === 'ACTIVE') {
      matchesTab = lead.internalStatus === 'ACTIVE' && !lead.isRejected && !lead.isConverted;
    } else if (statusTab === 'COMPLETED') {
      matchesTab = lead.internalStatus === 'COMPLETED' || lead.isConverted;
    } else if (statusTab === 'REJECTED') {
      matchesTab = lead.internalStatus === 'REJECTED' || lead.isRejected;
    } else if (statusTab === 'UNASSIGNED') {
      matchesTab = !lead.ownerName || lead.ownerName === 'Unassigned' || lead.ownerId === 'unassigned';
    } else if (statusTab === 'OVERDUE') {
      // Treats as having overdue follow-up or incomplete required tasks
      const hasFollowupInPast = lead.nextFollowupAt ? new Date(lead.nextFollowupAt) < new Date() : false;
      const hasPendingTasks = lead.stageTasks?.some(t => !t.completed && t.required) || false;
      matchesTab = hasFollowupInPast || hasPendingTasks || (lead.currentPipelineStageUid === 's1-1' && !lead.isConverted && !lead.isRejected);
    }

    return matchesSearch && matchesPriority && matchesTab;
  }), [leads, priorityFilter, search, statusTab]);

  const getStatusVariant = (status: string, isConverted?: boolean, isRejected?: boolean) => {
    if (isConverted) return 'success';
    if (isRejected) return 'danger';
    switch ((status || '').toLowerCase()) {
      case 'active': return 'info';
      case 'completed': return 'success';
      case 'rejected': return 'danger';
      default: return 'neutral';
    }
  };

  const getPriorityVariant = (p: string) => {
    switch ((p || '').toUpperCase()) {
      case 'URGENT': return 'danger';
      case 'HIGH': return 'warning';
      case 'NORMAL': return 'info';
      default: return 'neutral';
    }
  };

  const columns = useMemo<ColumnDef<CrmLeadDto>[]>(
    () => [
      {
        key: "leadName",
        header: "Lead Name",
        sortable: true,
        width: "14%",
        sortFn: (a, b) =>
          `${a.consumerFirstName ?? ""} ${a.consumerLastName ?? ""}`.localeCompare(
            `${b.consumerFirstName ?? ""} ${b.consumerLastName ?? ""}`,
            undefined,
            { sensitivity: "base" }
          ),
        render: (lead) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-xs shrink-0">
              {lead.consumerFirstName?.[0] || 'L'}{lead.consumerLastName?.[0] || ''}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 overflow-hidden break-words text-sm font-semibold leading-4 text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {lead.consumerFirstName} {lead.consumerLastName}
              </p>
              <span className="block truncate text-xs font-mono text-slate-400">{lead.referenceNo}</span>
            </div>
          </div>
        ),
      },
      {
        key: "internalStatus",
        header: "Status",
        sortable: true,
        width: "6%",
        align: "center",
        headerClassName: "!px-1 whitespace-nowrap break-normal [overflow-wrap:normal] [word-break:normal]",
        className: "!px-1 whitespace-nowrap break-normal [overflow-wrap:normal] [word-break:normal]",
        render: (lead) => (
          <Badge className="mx-auto w-fit max-w-none shrink-0 whitespace-nowrap break-normal px-2 py-0.5 text-[10px] leading-4 [overflow-wrap:normal] [word-break:normal]" variant={getStatusVariant(lead.internalStatus, lead.isConverted, lead.isRejected)}>
            {lead.isConverted ? 'CONVERTED' : lead.isRejected ? 'REJECTED' : lead.internalStatus}
          </Badge>
        ),
      },
      {
        key: "pipelineName",
        header: "Pipeline",
        sortable: true,
        width: "13%",
        render: (lead) => (
          <span className="block whitespace-normal break-words font-semibold leading-5 text-slate-600" title={lead.pipelineName || 'STANDARD'}>
            {lead.pipelineName || 'STANDARD'}
          </span>
        ),
      },
      {
        key: "productName",
        header: "Product/Service",
        sortable: true,
        width: "12%",
        render: (lead) => (
          <span className="block whitespace-normal break-words font-semibold leading-5 text-slate-700" title={lead.productName || 'GENERAL'}>
            {lead.productName || 'GENERAL'}
          </span>
        ),
      },
      {
        key: "channelName",
        header: "Channel",
        sortable: true,
        width: "10%",
        render: (lead) => (
          <span className="block whitespace-normal break-words font-medium leading-5 text-slate-500" title={lead.channelName || 'DIRECT'}>
            {lead.channelName || 'DIRECT'}
          </span>
        ),
      },
      {
        key: "currentPipelineStageName",
        header: "Stage",
        sortable: true,
        width: "15%",
        render: (lead) => (
          <div className="flex min-w-0 items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
            <span className="min-w-0 whitespace-normal break-words font-semibold leading-5 text-slate-900" title={lead.currentPipelineStageName || 'ASSESSING'}>
              {lead.currentPipelineStageName || 'ASSESSING'}
            </span>
          </div>
        ),
      },
      {
        key: "nextFollowupAt",
        header: "Next Follow-up",
        sortable: true,
        width: "8%",
        sortFn: (a, b) =>
          new Date(a.nextFollowupAt ?? 0).getTime() - new Date(b.nextFollowupAt ?? 0).getTime(),
        render: (lead) => (
          <span className="block whitespace-normal break-words font-mono font-semibold leading-5 text-slate-500">
            {lead.nextFollowupAt ? format(new Date(lead.nextFollowupAt), 'dd MMM yy HH:mm') : 'NOT SET'}
          </span>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        sortable: true,
        width: "7%",
        render: (lead) => (
          <Badge className="max-w-full whitespace-normal break-words text-left leading-4" variant={getPriorityVariant(lead.priority)}>
            {lead.priority}
          </Badge>
        ),
      },
      {
        key: "ownerName",
        header: "Owner",
        sortable: true,
        width: "15%",
        render: (lead) => (
          <div className="flex min-w-0 items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600 shrink-0">
              {lead.ownerName?.[0] || 'U'}
            </div>
            <span className="min-w-0 whitespace-normal break-normal font-semibold leading-5 text-slate-500" title={lead.ownerName || 'UNASSIGNED'}>
              {lead.ownerName || 'UNASSIGNED'}
            </span>
          </div>
        ),
      },
    ],
    [navigate],
  );

  function buildSearchFilters(
    nextFilters: {
      priority: string;
      product: string;
      channel: string;
      pipeline: string;
    } = {
      priority: priorityFilter,
      product: productFilter,
      channel: channelFilter,
      pipeline: pipelineFilter,
    },
  ) {
    const filters: Record<string, unknown> = {};
    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      filters.q = trimmedSearch;
    }
    if (['ACTIVE', 'COMPLETED', 'REJECTED'].includes(statusTab)) {
      filters.status = statusTab;
    }
    if (nextFilters.priority !== 'ALL') {
      filters.priority = nextFilters.priority;
    }
    if (nextFilters.product !== 'ALL') {
      filters.productUid = nextFilters.product;
    }
    if (nextFilters.channel !== 'ALL') {
      filters.channelUid = nextFilters.channel;
    }
    if (nextFilters.pipeline !== 'ALL') {
      filters.pipelineUid = nextFilters.pipeline;
    }

    return filters;
  }

  function applyLeadFilters() {
    const nextFilters = {
      priority: draftPriorityFilter,
      product: draftProductFilter,
      channel: draftChannelFilter,
      pipeline: draftPipelineFilter,
    };
    setPriorityFilter(nextFilters.priority);
    setProductFilter(nextFilters.product);
    setChannelFilter(nextFilters.channel);
    setPipelineFilter(nextFilters.pipeline);
    setPage(1);
    fetchLeads?.(buildSearchFilters(nextFilters));
    setFiltersOpen(false);
  }

  function resetLeadFilters() {
    setPriorityFilter('ALL');
    setProductFilter('ALL');
    setChannelFilter('ALL');
    setPipelineFilter('ALL');
    setDraftPriorityFilter('ALL');
    setDraftProductFilter('ALL');
    setDraftChannelFilter('ALL');
    setDraftPipelineFilter('ALL');
    setFilterResetKey((key) => key + 1);
    setPage(1);
    fetchLeads?.(search.trim() ? { q: search.trim() } : {}, { force: true });
    setFiltersOpen(false);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div data-testid="jaldee-leads-list-page" className="h-full min-h-0 flex flex-col bg-slate-50 p-3 sm:p-4 md:p-5 overflow-hidden relative space-y-3">
      <PageHeader
        back={showDashboardBack ? { label: 'Back to Dashboard', href: '/jaldee-leads/dashboard' } : undefined}
        onNavigate={() => navigateBackToDashboard(navigate)}
        title={`Leads (${filteredLeads.length})`}
        subtitle="Ingested Portfolio & Operational Executions"
        actions={
          <Button 
            id="jaldee-leads-add-lead-button"
            data-testid="jaldee-leads-add-lead-button"
            onClick={() => navigate('/jaldee-leads/list/create')}
            variant="primary"
            icon={<ICONS.ADD className="w-4 h-4" />}
            className="px-6 h-10 text-sm font-semibold active-scale"
          >
            Add Lead
          </Button>
        }
      />

      <SectionCard className="min-h-0 flex-1 overflow-hidden border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div data-testid="jaldee-leads-list-search-toolbar">
                <DataTableToolbar
                  query={search}
                  onQueryChange={handleSearchChange}
                  searchPlaceholder="Search leads..."
                />
              </div>
            </div>

            <div className="flex w-full items-center justify-between gap-3 xl:w-auto xl:justify-end">
            <div data-testid="jaldee-leads-list-status-tabs" className="min-w-0 flex-1 xl:flex-none">
              <div className="md:hidden">
                <Select
                  data-testid="jaldee-leads-list-status-select"
                  value={statusTab}
                  onChange={event => setStatusTab(event.target.value as any)}
                  options={LEAD_STATUS_OPTIONS}
                />
              </div>
              <div className="hidden md:block">
                <Tabs
                  value={statusTab}
                  onValueChange={val => setStatusTab(val as any)}
                  className="border-b-0"
                  items={LEAD_STATUS_OPTIONS}
                />
              </div>
            </div>
            
            <Button
              type="button"
              id="jaldee-leads-list-filter-button"
              data-testid="jaldee-leads-list-filter-button"
              variant={appliedFilterCount > 0 ? "primary" : "outline"}
              className={`ml-auto flex shrink-0 items-center gap-2 rounded-md px-4 py-2 font-semibold ${
                appliedFilterCount > 0 ? "" : "border-indigo-100 text-indigo-700 hover:bg-indigo-50/20"
              }`}
              onClick={() => {
                setDraftPriorityFilter(priorityFilter);
                setDraftProductFilter(productFilter);
                setDraftChannelFilter(channelFilter);
                setDraftPipelineFilter(pipelineFilter);
                setFiltersOpen(true);
              }}
            >
              <FilterIcon />
              <span>Filter</span>
              {appliedFilterCount > 0 ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-600">
                  {appliedFilterCount}
                </span>
              ) : null}
            </Button>

            </div>
          </div>
        </div>

        <div data-testid="jaldee-leads-list-table" className="min-h-0 p-2 pt-2 sm:p-3">
          <DataTable
            data-testid="jaldee-leads-list-datatable"
            data={filteredLeads}
            columns={columns}
            getRowId={(lead) => lead.uid}
            onRowClick={(lead) => navigate(`/jaldee-leads/list/${lead.uid}`)}
            className="[&>div:first-of-type]:max-h-[calc(100vh-16rem)] [&>div:first-of-type]:overflow-auto [&_[data-testid='jaldee-leads-list-datatable-pagination']]:md:flex-row-reverse [&_tbody_tr:last-child]:border-b-0 border-0 shadow-none"
          tableClassName="w-full table-fixed [&_thead_th]:py-3 [&_thead_th]:text-[length:var(--text-xs)] [&_tbody_td]:py-3 [&_tbody_td]:whitespace-normal [&_tbody_td]:break-normal"
            pagination={{
              page,
              pageSize,
              total: filteredLeads.length,
              onChange: setPage,
              onPageSizeChange: setPageSize,
              mode: "client",
            }}
            emptyState={
              <EmptyState
                title="No matching leads found"
                description="Adjust the current filters or create a new lead."
              />
            }
          />
        </div>
      </SectionCard>
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Advanced Filters"
        size="sm"
        contentClassName="flex flex-col p-0 overflow-hidden"
      >
        <div data-testid="jaldee-leads-list-filter-panel" className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <Select
              key={`priority-${filterResetKey}`}
              id="jaldee-leads-list-priority-filter"
              data-testid="jaldee-leads-list-priority-filter"
              label="Priority"
              value={draftPriorityFilter}
              onChange={e => setDraftPriorityFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Priorities" },
                { value: "LOW", label: "Low" },
                { value: "NORMAL", label: "Normal" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" }
              ]}
            />
            <Select
              key={`product-${filterResetKey}`}
              id="jaldee-leads-list-product-filter"
              data-testid="jaldee-leads-list-product-filter"
              label="Product"
              value={draftProductFilter}
              onChange={e => setDraftProductFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Products" },
                ...products.map((product) => ({ value: product.uid, label: product.name || product.displayName || product.uid }))
              ]}
            />
            <Select
              key={`channel-${filterResetKey}`}
              id="jaldee-leads-list-channel-filter"
              data-testid="jaldee-leads-list-channel-filter"
              label="Channel"
              value={draftChannelFilter}
              onChange={e => setDraftChannelFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Channels" },
                ...channels.map((channel) => ({ value: channel.uid, label: channel.name || channel.channelName || channel.uid }))
              ]}
            />
            <Select
              key={`pipeline-${filterResetKey}`}
              id="jaldee-leads-list-pipeline-filter"
              data-testid="jaldee-leads-list-pipeline-filter"
              label="Pipeline"
              value={draftPipelineFilter}
              onChange={e => setDraftPipelineFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Pipelines" },
                ...pipelines.map((pipeline) => ({ value: pipeline.uid, label: pipeline.name || pipeline.pipelineName || pipeline.uid }))
              ]}
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
            <Button
              type="button"
              id="jaldee-leads-list-filter-reset-button"
              data-testid="jaldee-leads-list-filter-reset-button"
              variant="outline"
              className="font-semibold"
              onClick={resetLeadFilters}
            >
              Reset All
            </Button>
            <Button
              type="button"
              id="jaldee-leads-list-filter-apply-button"
              data-testid="jaldee-leads-list-filter-apply-button"
              variant="primary"
              className="font-semibold"
              onClick={applyLeadFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

const LEAD_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'UNASSIGNED', label: 'Unassigned' }
];

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 stroke-[2.2]"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}
