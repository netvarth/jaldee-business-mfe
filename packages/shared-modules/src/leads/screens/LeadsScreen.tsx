import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CrmLeadDto, CrmLeadPipelineDto, Product, Channel, FormTemplate } from '../types';
import { ICONS } from '../constants';
import { format } from '../lib/dateUtils';
import { cameFromDashboard, navigateBackToDashboard } from '../lib/navigationOrigin';
import { Button, Badge, Select, Tabs, PageHeader, SectionCard, DataTable, DataTableToolbar, EmptyState } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";

interface LeadsScreenProps {
  leads: CrmLeadDto[];
  setLeads: React.Dispatch<React.SetStateAction<CrmLeadDto[]>>;
  pipelines: CrmLeadPipelineDto[];
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
  products: Product[];
  channels: Channel[];
  forms: FormTemplate[];
  initialForceCreate?: boolean;
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
        width: "16%",
        render: (lead) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-xs shrink-0">
              {lead.consumerFirstName?.[0] || 'L'}{lead.consumerLastName?.[0] || ''}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 overflow-hidden break-words text-sm font-semibold leading-4 text-indigo-600 hover:text-indigo-800 transition-colors [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
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
        width: "7%",
        render: (lead) => (
          <Badge className="max-w-full truncate" variant={getStatusVariant(lead.internalStatus, lead.isConverted, lead.isRejected)} dot>
            {lead.isConverted ? 'CONVERTED' : lead.isRejected ? 'REJECTED' : lead.internalStatus}
          </Badge>
        ),
      },
      {
        key: "pipelineName",
        header: "Pipeline",
        width: "11%",
        render: (lead) => (
          <span className="block truncate font-semibold text-slate-600" title={lead.pipelineName || 'STANDARD'}>
            {lead.pipelineName || 'STANDARD'}
          </span>
        ),
      },
      {
        key: "productName",
        header: "Product/Service",
        width: "13%",
        render: (lead) => (
          <span className="block truncate font-semibold text-slate-700" title={lead.productName || 'GENERAL'}>
            {lead.productName || 'GENERAL'}
          </span>
        ),
      },
      {
        key: "channelName",
        header: "Channel",
        width: "9%",
        render: (lead) => (
          <span className="block truncate font-medium text-slate-500" title={lead.channelName || 'DIRECT'}>
            {lead.channelName || 'DIRECT'}
          </span>
        ),
      },
      {
        key: "currentPipelineStageName",
        header: "Stage",
        width: "12%",
        render: (lead) => (
          <div className="flex min-w-0 items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
            <span className="truncate font-semibold text-slate-900" title={lead.currentPipelineStageName || 'ASSESSING'}>
              {lead.currentPipelineStageName || 'ASSESSING'}
            </span>
          </div>
        ),
      },
      {
        key: "nextFollowupAt",
        header: "Next Follow-up",
        width: "11%",
        render: (lead) => (
          <span className="block truncate font-mono text-slate-500 font-semibold">
            {lead.nextFollowupAt ? format(new Date(lead.nextFollowupAt), 'dd MMM yy HH:mm') : 'NOT SET'}
          </span>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        width: "6%",
        render: (lead) => (
          <Badge className="max-w-full truncate" variant={getPriorityVariant(lead.priority)}>
            {lead.priority}
          </Badge>
        ),
      },
      {
        key: "ownerName",
        header: "Owner",
        width: "9%",
        render: (lead) => (
          <div className="flex min-w-0 items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600 shrink-0">
              {lead.ownerName?.[0] || 'U'}
            </div>
            <span className="truncate font-semibold text-slate-500" title={lead.ownerName || 'UNASSIGNED'}>
              {lead.ownerName || 'UNASSIGNED'}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        width: "6%",
        align: "right",
        render: (lead) => (
          <Button
            id={`jaldee-leads-lead-${lead.uid}-workspace-button`}
            data-testid={`jaldee-leads-lead-${lead.uid}-workspace-button`}
            variant="ghost"
            size="sm"
            className="px-2 text-xs font-semibold"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/leads/leads/${lead.uid}`);
            }}
          >
            Open
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <div data-testid="jaldee-leads-list-page" className="h-full flex flex-col bg-slate-50 p-3 sm:p-4 md:p-5 no-scrollbar overflow-y-auto pb-24 relative space-y-4">
      <PageHeader
        back={showDashboardBack ? { label: 'Back to Dashboard', href: '/leads/dashboard' } : undefined}
        onNavigate={() => navigateBackToDashboard(navigate)}
        title="Leads Manager"
        subtitle="Ingested Portfolio & Operational Executions"
        actions={
          <Button 
            id="jaldee-leads-add-lead-button"
            data-testid="jaldee-leads-add-lead-button"
            onClick={() => navigate('/leads/leads/create')}
            variant="primary"
            icon={<ICONS.ADD className="w-4 h-4" />}
            className="px-6 h-10 text-sm font-semibold active-scale"
          >
            Add Lead
          </Button>
        }
      />

      <SectionCard className="border-slate-200 shadow-sm" padding={false}>
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div data-testid="jaldee-leads-list-search-toolbar">
                <DataTableToolbar
                  query={search}
                  onQueryChange={setSearch}
                  searchPlaceholder="Search leads..."
                  recordCount={filteredLeads.length}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
            <div data-testid="jaldee-leads-list-status-tabs">
              <Tabs
                value={statusTab}
                onValueChange={val => setStatusTab(val as any)}
                className="border-b-0"
                items={[
                  { value: 'ALL', label: 'All' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'OVERDUE', label: 'Overdue' },
                  { value: 'UNASSIGNED', label: 'Unassigned' }
                ]}
              />
            </div>
            
            <Select 
              id="jaldee-leads-list-priority-filter"
              data-testid="jaldee-leads-list-priority-filter"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Priorities" },
                { value: "LOW", label: "Low" },
                { value: "NORMAL", label: "Normal" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" }
              ]}
              fullWidth={false}
              className="w-44 text-sm font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl"
            />
            </div>
          </div>
        </div>

        <div data-testid="jaldee-leads-list-table" className="p-3 pt-3 sm:p-4">
          <DataTable
            data={filteredLeads}
            columns={columns}
            getRowId={(lead) => lead.uid}
            onRowClick={(lead) => navigate(`/leads/leads/${lead.uid}`)}
            className="border-0 shadow-none"
            emptyState={
              <EmptyState
                title="No matching leads found"
                description="Adjust the current filters or create a new lead."
              />
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}
