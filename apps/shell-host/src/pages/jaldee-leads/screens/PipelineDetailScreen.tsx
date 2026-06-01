import React, { useState } from 'react';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { CrmLeadPipelineDto, CrmLeadDto } from '../types';
import { mockProducts } from '../mockData';
import { format } from '../lib/dateUtils';
import { PageHeader, SectionCard, Button, Input, Select } from "@jaldee/design-system";

interface PipelineDetailScreenProps {
  pipeline: CrmLeadPipelineDto;
  leads: CrmLeadDto[];
  onBack: () => void;
  onEdit: () => void;
  onNavigate: (route: string, selection?: any) => void;
}

export default function PipelineDetailScreen({ pipeline, leads, onBack, onEdit, onNavigate }: PipelineDetailScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  
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

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900 border-l border-slate-200">

      {/* Header */}
      <div className="px-4 py-3 shrink-0">
        <PageHeader
          title={`Pipeline: ${pipeline.name}`}
          subtitle="Strategic stage configuration and performance statistics"
          back={{ label: "Back", href: "#" }}
          onNavigate={onBack}
          actions={
            <Button onClick={onEdit} variant="primary" className="text-sm font-semibold active-scale">
              Modify
            </Button>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Sidebar Stats */}
            <div className="md:col-span-4 space-y-4">
               <SectionCard className="p-6">
                  <p className="text-sm font-semibold text-slate-400 mb-4">Strategic Mapping</p>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed italic border-l-2 border-indigo-600 pl-3 py-1 bg-slate-50 rounded-r-lg mb-6">
                    {pipeline.description || 'Optimized flow for high-velocity lead conversions.'}
                  </p>
                  <div className="space-y-2 text-sm font-semibold text-slate-400">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                       <span>Total Steps</span>
                       <span className="text-slate-900 font-mono">{pipeline.stages.length}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                       <span>Products</span>
                       <span className="text-indigo-600">{linkedProducts.length} linked</span>
                    </div>
                  </div>
                  
                  {linkedProducts.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                       <p className="text-xs font-semibold text-slate-400">Deployed In</p>
                       <div className="space-y-2">
                         {linkedProducts.map(lp => (
                           <button 
                             key={lp.uid}
                             onClick={() => onNavigate('products', { type: 'product', id: lp.uid })}
                             className="w-full flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group pointer-events-none"
                           >
                              <span className="text-sm font-semibold text-slate-700 truncate text-left">{lp.name}</span>
                           </button>
                         ))}
                       </div>
                    </div>
                  )}
               </SectionCard>

               <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden shadow-xl">
                  <p className="text-sm font-semibold text-indigo-400 mb-4">Live Performance</p>
                  <div className="grid grid-cols-2 gap-4 font-mono">
                     <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Conv.</p>
                        <p className="text-xl font-semibold">18.4%</p>
                     </div>
                     <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Cycle</p>
                        <p className="text-xl font-semibold">12.4d</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Sequence List */}
            <div className="md:col-span-8">
               <SectionCard className="overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-sm font-semibold text-slate-900">Stage Sequence</h2>
                    <span className="text-xs font-semibold text-indigo-600">Active State</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                     {pipeline.stages.map((stage, idx) => {
                       const reqs = stage.taskTemplates?.filter(t => t.required) || [];
                       const opts = stage.taskTemplates?.filter(t => !t.required) || [];
                       return (
                          <div key={stage.uid} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                             <div className={cn(
                               "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-mono font-semibold text-xs border",
                               stage.isTerminal ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all"
                             )}>
                               {idx + 1}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                   <h4 className="text-sm font-semibold text-slate-900 truncate">{stage.stageName}</h4>
                                   <div className="flex gap-2">
                                     {stage.isTerminal && (
                                        <span className={cn(
                                          "text-xs font-semibold px-1.5 py-0.5 rounded",
                                          stage.terminalType === 'WON' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                                        )}>
                                          {stage.terminalType}
                                        </span>
                                     )}
                                   </div>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-400 leading-relaxed">
                                   <span className="text-slate-700">{stage.activeLeadCount || 0} Leads</span>
                                   <span className="w-1 h-1 rounded-full bg-slate-200" />
                                   <span className="text-rose-600 font-semibold">{stage.movementRule || 'No Restriction'}</span>
                                   <span className="w-1 h-1 rounded-full bg-slate-200" />
                                   <span className="text-indigo-600 font-semibold">{reqs.length} Required / {opts.length} Optional Tasks</span>
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
          <SectionCard className="overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
               <div>
                 <h2 className="text-sm font-semibold text-slate-900/90 leading-tight">Leads Moving Through This Pipeline</h2>
                 <p className="text-xs font-bold text-slate-400 mt-1">Associated active & terminal records ({pipelineLeads.length})</p>
               </div>
               
               <div className="flex flex-wrap items-center gap-3">
                 {/* Search Input */}
                 <Input 
                   type="text" 
                   placeholder="Search pipeline leads..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   icon={<ICONS.SEARCH className="w-3.5 h-3.5 text-slate-400" />}
                   fullWidth={false}
                   className="w-48"
                 />

                 {/* Stage Dropdown Filter */}
                 <Select
                   value={stageFilter}
                   onChange={(e) => setStageFilter(e.target.value)}
                   options={[
                     { value: 'ALL', label: 'All Stages' },
                     ...pipeline.stages.map(stg => ({ value: stg.stageName, label: stg.stageName }))
                   ]}
                   fullWidth={false}
                 />
               </div>
             </div>

             {/* Leads Table */}
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/30 border-b border-slate-100 text-xs font-semibold text-slate-400 select-none">
                     <th className="px-6 py-4">Reference No</th>
                     <th className="px-6 py-4">Consumer Details</th>
                     <th className="px-6 py-4">Current Stage</th>
                     <th className="px-6 py-4">Priority / Agent</th>
                     <th className="px-6 py-4 text-right">Last Active</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 text-slate-800">
                   {filteredLeads.map((lead) => (
                     <tr key={lead.uid} className="hover:bg-slate-50/80 transition-colors group">
                       <td className="px-6 py-4">
                         <div className="flex flex-col">
                           <span className="font-mono font-semibold text-slate-900 text-xs">
                             {lead.referenceNo}
                           </span>
                           <span className="text-xs font-semibold text-slate-400 leading-none mt-1">
                             {lead.uid.toUpperCase()}
                           </span>
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         <div className="flex flex-col">
                           <span className="font-semibold text-slate-900 text-xs">
                             {lead.consumerFirstName} {lead.consumerLastName}
                           </span>
                           <span className="text-xs font-medium text-slate-400 mt-0.5">
                             {lead.consumerPhone || 'No Phone'} {lead.consumerEmail ? `• ${lead.consumerEmail}` : ''}
                           </span>
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-bold leading-none">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                           {lead.currentPipelineStageName}
                         </span>
                       </td>
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                           <span className={cn(
                             "px-2 py-0.5 rounded text-xs font-semibold border",
                             lead.priority === 'URGENT' ? "bg-red-50 text-red-600 border-red-100" :
                             lead.priority === 'HIGH' ? "bg-amber-50 text-amber-600 border-amber-100" :
                             "bg-slate-50 text-slate-600 border-slate-100"
                           )}>
                             {lead.priority}
                           </span>
                           <span className="text-sm text-slate-500 font-bold">{lead.ownerName || 'Unassigned'}</span>
                         </div>
                       </td>
                       <td className="px-6 py-4 text-right text-sm font-semibold text-slate-400 font-mono">
                         {lead.lastActivityAt ? format(new Date(lead.lastActivityAt), 'dd MMM yy') : 'N/A'}
                       </td>
                     </tr>
                   ))}
                   {filteredLeads.length === 0 && (
                     <tr>
                       <td colSpan={5} className="py-16 text-center text-slate-400 text-sm font-semibold italic leading-loose">
                         No associated leads match the current filters.
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
