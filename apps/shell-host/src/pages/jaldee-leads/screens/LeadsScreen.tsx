import React, { useState } from 'react';
import { CrmLeadDto, CrmLeadPipelineDto, Product, Channel, FormTemplate } from '../types';
import CreateLeadScreen from './CreateLeadScreen';
import LeadDetailScreen from './LeadDetailScreen';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { format } from '../lib/dateUtils';
import { Button, Badge, Input, Select, Tabs, PageHeader, SectionCard } from "@jaldee/design-system";

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
  const [isCreatingLead, setIsCreatingLead] = useState(!!initialForceCreate);
  const [selectedLead, setSelectedLead] = useState<CrmLeadDto | null>(null);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'OVERDUE' | 'UNASSIGNED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  React.useEffect(() => {
    if (isCreatingLead) {
      fetchPipelines?.();
      fetchProducts?.();
      fetchChannels?.();
      fetchTemplates?.();
    }
  }, [isCreatingLead, fetchPipelines, fetchProducts, fetchChannels, fetchTemplates]);

  React.useEffect(() => {
    if (selectedLead) {
      fetchPipelines?.();
      fetchProducts?.();
    }
  }, [selectedLead, fetchPipelines, fetchProducts]);

  const filteredLeads = leads.filter(lead => {
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
  });

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

  if (isCreatingLead) {
    return (
      <CreateLeadScreen 
        pipelines={pipelines}
        products={products}
        channels={channels}
        leads={leads}
        forms={forms}
        onBack={() => setIsCreatingLead(false)}
        onSave={(newLead) => {
          setLeads([newLead, ...leads]);
          setIsCreatingLead(false);
        }}
      />
    );
  }

  if (selectedLead) {
    return (
      <LeadDetailScreen 
        lead={selectedLead}
        pipelines={pipelines}
        setPipelines={setPipelines}
        products={products}
        leads={leads}
        onBack={() => setSelectedLead(null)}
        onUpdate={(updatedLead) => {
          setLeads(leads.map(l => l.uid === updatedLead.uid ? updatedLead : l));
          setSelectedLead(updatedLead);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar overflow-y-auto pb-24 relative">
      <PageHeader
        title="Leads Manager"
        subtitle="Ingested Portfolio & Operational Executions"
        actions={
          <div className="flex flex-wrap items-center gap-4">
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
            
            <Select 
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

            <Input 
              type="text" 
              placeholder="Search leads..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<ICONS.SEARCH className="w-4 h-4 text-slate-400" />}
              fullWidth={false}
              className="w-full md:w-64"
            />
            
            <Button 
              onClick={() => setIsCreatingLead(true)}
              variant="primary"
              icon={<ICONS.ADD className="w-4 h-4" />}
              className="px-8 h-10 text-xs font-semibold active-scale"
            >
              Add Lead
            </Button>
          </div>
        }
      />

      <div className="flex-1 mt-6">
        <SectionCard>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[1100px]">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-sm font-semibold text-slate-400">
                <tr>
                  <th className="pl-6 pr-3 py-4">Lead Name</th>
                  <th className="px-3 py-4">Status</th>
                  <th className="px-3 py-4">Product/Service</th>
                  <th className="px-3 py-4">Channel</th>
                  <th className="px-3 py-4">Pipeline</th>
                  <th className="px-3 py-4">Stage</th>
                  <th className="px-3 py-4">Next Follow-up</th>
                  <th className="px-3 py-4">Priority</th>
                  <th className="px-3 py-4">Owner</th>
                  <th className="pr-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead, i) => (
                  <tr 
                    key={lead.uid} 
                    className="hover:bg-slate-50/40 transition-colors cursor-pointer group text-slate-800" 
                    onClick={() => setSelectedLead(lead)}
                  >
                    {/* Lead Name */}
                    <td className="pl-6 pr-3 py-4.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                          {lead.consumerFirstName?.[0] || 'L'}{lead.consumerLastName?.[0] || ''}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs truncate mb-0.5">{lead.consumerFirstName} {lead.consumerLastName}</p>
                          <span className="text-xs text-slate-440 font-mono text-slate-400">{lead.referenceNo}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-4.5">
                      <Badge variant={getStatusVariant(lead.internalStatus, lead.isConverted, lead.isRejected)} dot>
                        {lead.isConverted ? 'CONVERTED' : lead.isRejected ? 'REJECTED' : lead.internalStatus}
                      </Badge>
                    </td>

                    {/* Product/Service */}
                    <td className="px-3 py-4.5">
                      <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{lead.productName || 'GENERAL'}</p>
                    </td>

                    {/* Channel */}
                    <td className="px-3 py-4.5">
                      <span className="text-xs font-medium text-slate-500">{lead.channelName || 'DIRECT'}</span>
                    </td>

                    {/* Pipeline */}
                    <td className="px-3 py-4.5">
                      <span className="text-xs font-semibold text-slate-600">{lead.pipelineName || 'STANDARD'}</span>
                    </td>

                    {/* Stage */}
                    <td className="px-3 py-4.5">
                       <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                         <span className="text-xs font-semibold text-slate-900">{lead.currentPipelineStageName || 'ASSESSING'}</span>
                       </div>
                    </td>

                    {/* Next Follow-up */}
                    <td className="px-3 py-4.5">
                      <span className="text-xs font-mono text-slate-500 font-bold">
                        {lead.nextFollowupAt ? format(new Date(lead.nextFollowupAt), 'dd MMM yy HH:mm') : 'NOT SET'}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-4.5">
                       <Badge variant={getPriorityVariant(lead.priority)}>
                         {lead.priority}
                       </Badge>
                    </td>

                    {/* Owner */}
                    <td className="px-3 py-4.5">
                      <div className="flex items-center gap-2">
                         <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600">{lead.ownerName?.[0] || 'U'}</div>
                         <span className="text-xs font-bold text-slate-500 truncate max-w-[100px]">{lead.ownerName || 'UNASSIGNED'}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="pr-6 py-4.5 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-sm font-semibold">
                        Workspace
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <ICONS.SEARCH className="w-8 h-8 text-slate-200 mx-auto mb-4" />
                      <p className="text-xs font-semibold text-slate-300">No matching leads found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
