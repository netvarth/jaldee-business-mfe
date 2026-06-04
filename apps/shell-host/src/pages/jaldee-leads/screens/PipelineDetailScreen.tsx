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
    <div className="h-full flex flex-col bg-[var(--color-surface-secondary)] overflow-y-auto no-scrollbar text-[var(--color-text-primary)] p-4 sm:p-6 md:p-8 pb-24 space-y-6">

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

      <div className="w-full space-y-[var(--space-8)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-[var(--space-6)]">
            
            {/* Sidebar Stats */}
            <div className="md:col-span-4 space-y-[var(--space-6)]">
               <SectionCard>
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

               <div className="bg-slate-900 rounded-lg p-[var(--space-6)] text-white overflow-hidden shadow-xl">
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
            <div className="md:col-span-8">
               <SectionCard>
                  <div className="px-[var(--space-6)] py-[var(--space-4)] border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]">
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
                            className="p-[var(--space-4)] flex items-center gap-[var(--space-4)] hover:bg-[var(--color-surface-hover)] transition-colors group"
                          >
                             <div className={cn(
                               "w-8 h-8 rounded-[var(--radius-lg)] shrink-0 flex items-center justify-center font-[var(--font-weight-semibold)] text-[length:var(--text-xs)] border",
                               stage.isTerminal ? "bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success-light)]" : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all"
                             )}>
                               {idx + 1}
                             </div>
                             <div className="flex-1">
                                <div className="flex items-center justify-between">
                                   <h4 className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] truncate">{stage.stageName}</h4>
                                   <div className="flex gap-[var(--space-2)]">
                                     {stage.isTerminal && (
                                        <span className={cn(
                                          "text-[length:var(--text-xs)] font-[var(--font-weight-semibold)] px-[var(--space-2)] py-[var(--space-1)] rounded",
                                          stage.terminalType === 'WON' ? "bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]" : "bg-[var(--color-error-light)] text-[var(--color-error)] border-[var(--color-error-light)]"
                                        )}>
                                          {stage.terminalType}
                                        </span>
                                     )}
                                   </div>
                                </div>
                                <div className="mt-[var(--space-1)] flex flex-wrap items-center gap-[var(--space-2)] text-[length:var(--text-xs)] font-[var(--font-weight-bold)] text-[var(--color-text-secondary)] leading-[var(--line-height-relaxed)]">
                                   <span className="text-[var(--color-text-primary)]">{stage.activeLeadCount || 0} Leads</span>
                                   <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                                   <span className="text-[var(--color-error)] font-[var(--font-weight-semibold)]">{stage.movementRule || 'No Restriction'}</span>
                                   <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
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
          <SectionCard>
             <div className="px-[var(--space-6)] py-[var(--space-5)] border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--space-4)] bg-[var(--color-surface-alt)]">
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

             <div className="p-[var(--space-6)] pt-[var(--space-4)]">
               <DataTable
                 data={filteredLeads}
                 columns={leadColumns}
                 getRowId={(lead) => lead.uid}
                 onRowClick={(lead) => onNavigate(`leads/${lead.uid}`)}
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
