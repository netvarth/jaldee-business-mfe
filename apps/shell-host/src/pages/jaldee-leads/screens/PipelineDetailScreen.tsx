import React, { useMemo, useState } from 'react';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { CrmLeadPipelineDto, CrmLeadDto } from '../types';
import { mockProducts } from '../mockData';
import { format } from '../lib/dateUtils';
import { PageHeader, SectionCard, Button, Input, Select, DataTable, EmptyState, Badge } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";

interface PipelineDetailScreenProps {
  pipeline: CrmLeadPipelineDto;
  leads: CrmLeadDto[];
  onBack: () => void;
  onEdit: () => void;
  editLoading?: boolean;
  onNavigate: (route: string, selection?: any) => void;
}

export default function PipelineDetailScreen({ pipeline, leads, onBack, onEdit, editLoading = false, onNavigate }: PipelineDetailScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const stageSequence = useMemo(
    () => [...(pipeline.stages || [])].sort((a, b) => {
      const aOrder = a.sequenceOrder || a.stageOrder || 0;
      const bOrder = b.sequenceOrder || b.stageOrder || 0;
      return aOrder - bOrder;
    }),
    [pipeline.stages],
  );
  
  const linkedProducts = mockProducts.filter(p => pipeline.productUids.includes(p.uid));
  const pipelineLeads = (leads || []).filter(l => l.pipelineUid === pipeline.uid);

  const filteredLeads = pipelineLeads.filter(l => {
    const matchesSearch = 
      (l.referenceNo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (l.consumerFirstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (l.consumerLastName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'ALL' || l.currentPipelineStageName === stageFilter;

    return matchesSearch && matchesStage;
  });

  const leadColumns = useMemo<ColumnDef<CrmLeadDto>[]>(
    () => [
      {
        key: "referenceNo",
        header: "Reference No",
        width: 170,
        render: (lead) => (
          <div className="flex flex-col">
            <span className="font-[var(--font-weight-bold)] text-blue-600 text-[length:var(--text-sm)] underline-offset-2 hover:underline">
              {lead.referenceNo}
            </span>
            <span className="text-[length:var(--text-xs)] font-[var(--font-weight-semibold)] text-[var(--color-text-secondary)] leading-none mt-[var(--space-1)]">
              {lead.uid.toUpperCase()}
            </span>
          </div>
        ),
      },
      {
        key: "consumerFirstName",
        header: "Consumer Details",
        width: 260,
        render: (lead) => (
          <div className="flex flex-col">
            <span className="font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] text-[length:var(--text-xs)]">
              {lead.consumerFirstName} {lead.consumerLastName}
            </span>
            <span className="text-[length:var(--text-xs)] font-[var(--font-weight-medium)] text-[var(--color-text-secondary)] mt-[var(--space-1)]">
              {lead.consumerPhone || 'No Phone'} {lead.consumerEmail ? `- ${lead.consumerEmail}` : ''}
            </span>
          </div>
        ),
      },
      {
        key: "currentPipelineStageName",
        header: "Current Stage",
        width: 180,
        render: (lead) => (
          <span className="inline-flex items-center gap-[var(--space-2)] px-[var(--space-2)] py-[var(--space-1)] bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-primary)] rounded-[var(--radius-lg)] text-[length:var(--text-xs)] font-[var(--font-weight-bold)] leading-none">
            <div className="w-[var(--space-2)] h-[var(--space-2)] rounded-full bg-[var(--color-primary)]" />
            {lead.currentPipelineStageName}
          </span>
        ),
      },
      {
        key: "priority",
        header: "Priority / Agent",
        width: 220,
        render: (lead) => (
          <div className="flex items-center gap-[var(--space-2)]">
            <Badge
              variant={lead.priority === 'URGENT' ? 'danger' : lead.priority === 'HIGH' ? 'warning' : 'neutral'}
            >
              {lead.priority}
            </Badge>
            <span className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] font-[var(--font-weight-bold)]">{lead.ownerName || 'Unassigned'}</span>
          </div>
        ),
      },
      {
        key: "lastActivityAt",
        header: "Last Active",
        align: "right",
        width: 150,
        render: (lead) => (
          <span className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-secondary)]">
            {lead.lastActivityAt ? format(new Date(lead.lastActivityAt), 'dd MMM yy') : 'N/A'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50 p-3 sm:p-4 md:p-5 overflow-y-auto text-[var(--color-text-primary)] space-y-3">

      <PageHeader
        title={`Pipeline: ${pipeline.name}`}
        subtitle="Strategic stage configuration and performance statistics"
        back={{ label: "Back", href: "#" }}
        onNavigate={onBack}
        actions={
          <Button
            id={`jaldee-leads-pipeline-${pipeline.uid}-modify-button`}
            data-testid={`jaldee-leads-pipeline-${pipeline.uid}-modify-button`}
            onClick={onEdit}
            variant="primary"
            loading={editLoading}
            disabled={editLoading}
            className="active-scale"
          >
            {editLoading ? "Loading..." : "Modify"}
          </Button>
        }
      />

      <div className="w-full space-y-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
            
            {/* Sidebar Stats */}
            <div className="space-y-3 xl:col-span-4">
               <SectionCard className="border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-secondary)] mb-[var(--space-4)]">Strategic Mapping</p>

                  <div className="space-y-[var(--space-2)] text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-secondary)]">
                    <div className="flex justify-between py-[var(--space-1)] border-b border-[var(--color-border)]">
                       <span>Total Steps</span>
                       <span className="text-[var(--color-text-primary)]">{stageSequence.length}</span>
                    </div>
                    <div className="flex justify-between py-[var(--space-1)] border-b border-[var(--color-border)]">
                       <span>Products</span>
                       <span className="text-[var(--color-primary)]">{linkedProducts.length} linked</span>
                    </div>
                  </div>
                  
                  {linkedProducts.length > 0 && (
                    <div className="mt-[var(--space-6)] pt-[var(--space-6)] border-t border-[var(--color-border)] space-y-[var(--space-3)]">
                       <p className="text-[length:var(--text-xs)] font-[var(--font-weight-semibold)] text-[var(--color-text-secondary)]">Deployed In</p>
                       <div className="space-y-[var(--space-2)]">
                         {linkedProducts.map(lp => (
                           <Button
                             key={lp.uid}
                             onClick={() => onNavigate('products', { type: 'product', id: lp.uid })}
                             variant="outline"
                             className="w-full justify-between"
                           >
                              <span className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] truncate text-left">{lp.name}</span>
                           </Button>
                         ))}
                       </div>
                    </div>
                  )}
               </SectionCard>

               <div className="overflow-hidden rounded-lg bg-slate-900 p-5 text-white shadow-sm">
                <p className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-indigo-400 mb-[var(--space-4)]">Live Performance</p>
                <div className="grid grid-cols-2 gap-[var(--space-4)]">
                   <div>
                      <p className="text-[length:var(--text-xs)] font-[var(--font-weight-semibold)] text-white/70 mb-[var(--space-1)]">Conv.</p>
                      <p className="text-[length:var(--text-xl)] font-[var(--font-weight-semibold)] text-white">18.4%</p>
                   </div>
                   <div>
                      <p className="text-[length:var(--text-xs)] font-[var(--font-weight-semibold)] text-white/70 mb-[var(--space-1)]">Cycle</p>
                      <p className="text-[length:var(--text-xl)] font-[var(--font-weight-semibold)] text-white">12.4d</p>
                   </div>
                </div>
             </div>
            </div>

            {/* Sequence List */}
            <div className="xl:col-span-8">
               <SectionCard className="overflow-hidden border-slate-200 bg-white shadow-sm" padding={false}>
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                    <h2 className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">Stage Sequence</h2>
                    <span className="text-[length:var(--text-xs)] font-[var(--font-weight-semibold)] text-[var(--color-primary)]">Active State</span>
                  </div>
                  <div
                    className="divide-y divide-[var(--color-border)]"
                    data-testid={`jaldee-leads-pipeline-${pipeline.uid}-stage-sequence`}
                    data-state={stageSequence.length ? "ready" : "empty"}
                  >
                     {stageSequence.length === 0 && (
                       <div className="p-[var(--space-6)]">
                         <EmptyState
                           title="No stages configured"
                           description="This pipeline does not have stages returned from the pipeline detail API."
                         />
                       </div>
                     )}
                     {stageSequence.map((stage, idx) => {
                       const reqs = stage.taskTemplates?.filter(t => t.required) || [];
                       const opts = stage.taskTemplates?.filter(t => !t.required) || [];
                       return (
                           <div
                             key={stage.uid || `${stage.stageName}-${idx}`}
                             data-testid={`jaldee-leads-pipeline-${pipeline.uid}-stage-${stage.uid || idx}-row`}
                             data-active={stage.isActive !== false}
                             className="group flex items-center gap-4 p-4 transition-colors hover:bg-slate-50"
                           >
                              <div className={cn(
                                "w-8 h-8 rounded-[var(--radius-lg)] shrink-0 flex items-center justify-center font-[var(--font-weight-semibold)] text-[length:var(--text-xs)] border",
                                stage.isTerminal ? "bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success-light)]" : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all"
                              )}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center justify-between">
                                    <h4 className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] truncate">{stage.stageName}</h4>
                                    <div className="flex items-center gap-[var(--space-1)]">
                                      {stage.isTerminal && (
                                         <span className={cn(
                                           "text-[length:var(--text-xs)] font-[var(--font-weight-semibold)] px-[var(--space-2)] py-[var(--space-1)] rounded mr-2",
                                           stage.terminalType === 'WON' ? "bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]" : "bg-[var(--color-error-light)] text-[var(--color-error)] border-[var(--color-error-light)]"
                                         )}>
                                           {stage.terminalType}
                                         </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                        title="Edit stage"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                                      >
                                        <ICONS.EDIT className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); }}
                                        title="Remove stage"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                                      >
                                        <ICONS.DELETE className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                 </div>
                                 <div className="mt-[var(--space-1)] flex flex-wrap items-center gap-[var(--space-2)] text-[length:var(--text-xs)] font-[var(--font-weight-bold)] text-[var(--color-text-secondary)] leading-[var(--line-height-relaxed)]">
                                    <span className="text-[var(--color-text-primary)]">{stage.activeLeadCount || 0} Leads</span>
                                    <span className="text-[var(--color-primary)] font-[var(--font-weight-semibold)]">{reqs.length} Required / {opts.length} Optional Tasks</span>
                                 </div>
                              </div>
                           </div>
                       );
                     })}
                  </div>
               </SectionCard>
            </div>
          </div>

          {/* Associated Leads Panel */}
          <SectionCard className="overflow-hidden border-slate-200 bg-white shadow-sm" padding={false}>
             <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
               <div>
                 <h2 className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] leading-tight">Leads Moving Through This Pipeline</h2>
                 <p className="text-[length:var(--text-xs)] font-[var(--font-weight-bold)] text-[var(--color-text-secondary)] mt-[var(--space-1)]">Associated active & terminal records ({pipelineLeads.length})</p>
               </div>
               
               <div className="flex flex-wrap items-center gap-[var(--space-3)]">
                 {/* Search Input */}
                 <Input 
                   type="text" 
                   placeholder="Search pipeline leads..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   icon={<ICONS.SEARCH className="w-[var(--space-4)] h-[var(--space-4)] text-[var(--color-text-secondary)]" />}
                   fullWidth={false}
                   className="w-48"
                 />

                 {/* Stage Dropdown Filter */}
                 <Select
                   value={stageFilter}
                   onChange={(e) => setStageFilter(e.target.value)}
                   options={[
                     { value: 'ALL', label: 'All Stages' },
                     ...stageSequence.map(stg => ({ value: stg.stageName, label: stg.stageName }))
                   ]}
                   fullWidth={false}
                 />
               </div>
             </div>

             <div className="p-3">
               <DataTable
                 data={filteredLeads}
                 columns={leadColumns}
                 getRowId={(lead) => lead.uid}
                 onRowClick={(lead) => onNavigate(`list/${lead.uid}`)}
                 emptyState={
                   <EmptyState
                     title="No associated leads"
                     description="No associated leads match the current filters."
                   />
                 }
               />
             </div>
          </SectionCard>
        </div>
    </div>
  );
}
