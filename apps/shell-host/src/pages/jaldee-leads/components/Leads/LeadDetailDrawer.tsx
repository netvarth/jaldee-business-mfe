import React, { useState } from 'react';
import { Button, Select, Textarea } from '@jaldee/design-system';
import { CrmLeadDto, CrmLeadPipelineDto, CrmLeadPipelineStageDto } from '../../types';
import { cn } from '../../lib/utils';
import { formatDistanceToNow, format } from '../../lib/dateUtils';
import { PriorityBadge } from './LeadCard';
import { mockUsers } from '../../mockData';
import { ICONS } from '../../constants';

interface LeadDetailDrawerProps {
  lead: CrmLeadDto;
  currentPipeline: CrmLeadPipelineDto;
  onClose: () => void;
  onUpdate: (lead: CrmLeadDto) => void;
}

function automationToken(value: unknown, fallback = "item") {
  const token = String(value ?? fallback).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return token || fallback;
}

export default function LeadDetailDrawer({ lead, currentPipeline, onClose, onUpdate }: LeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'notes'>('details');
  const [isMoveStageOpen, setIsMoveStageOpen] = useState(false);
  
  const currentStage = currentPipeline.stages.find(s => s.uid === lead.currentPipelineStageUid);

  return (
    <div data-testid={`jaldee-leads-lead-${lead.uid}-detail-drawer`} data-state="open" className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      <div 
        className="relative w-full max-w-2xl bg-slate-50 h-full shadow-[0_0_100px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border-l border-slate-200 rounded-l-[40px]"
      >
        {/* Header */}
        <div className="px-10 py-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl shrink-0 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-3">
              <div className="bg-indigo-50 p-2.5 rounded-2xl border border-indigo-100/50">
                <ICONS.IMPORT className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                 <h2 className="text-sm font-semibold text-slate-400 leading-none mb-2">Reference ID</h2>
                 <h3 className="text-3xl font-semibold text-slate-900 leading-none">
                   {lead.referenceNo}
                 </h3>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <PriorityBadge priority={lead.priority} />
                <Select
                  id={`jaldee-leads-lead-${lead.uid}-priority-select`}
                  data-testid={`jaldee-leads-lead-${lead.uid}-priority-select`}
                  value={lead.priority}
                  onChange={(e) => onUpdate({...lead, priority: e.target.value as any})}
                  options={[
                    { value: 'URGENT', label: 'URGENT' },
                    { value: 'HIGH', label: 'HIGH' },
                    { value: 'NORMAL', label: 'NORMAL' },
                    { value: 'LOW', label: 'LOW' },
                  ]}
                  fullWidth={false}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                <ICONS.DATE className="w-3 h-3" />
                <span>Deployed {format(new Date(lead.leadDate), 'MMM dd, yyyy')}</span>
              </div>
            </div>

            {lead.isDuplicate && (
              <div className="mt-8 flex items-center gap-3 bg-red-50 text-red-700 text-sm font-semibold px-4 py-3 rounded-2xl border border-red-100 shadow-sm shadow-red-500/5">
                <ICONS.ALERT className="w-4 h-4 animate-pulse" /> Anomalous Data: Potential Duplicate
              </div>
            )}
          </div>
          <Button
            id={`jaldee-leads-lead-${lead.uid}-drawer-close-button`}
            data-testid={`jaldee-leads-lead-${lead.uid}-drawer-close-button`}
            onClick={onClose}
            variant="ghost"
            icon={<ICONS.CLOSE className="w-6 h-6" />}
            iconOnly
            aria-label="Close lead details"
            className="p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-2xl"
          />
        </div>

        {/* Pipeline Controller */}
        <div className="bg-slate-900 px-10 py-8 shrink-0 relative overflow-hidden">
           {/* Decorative Background Element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-sm font-semibold text-emerald-400">Live Infrastructure</span>
              </div>
              <Button
                id={`jaldee-leads-lead-${lead.uid}-shift-workflow-button`}
                data-testid={`jaldee-leads-lead-${lead.uid}-shift-workflow-button`}
                data-state={isMoveStageOpen ? "open" : "closed"}
                onClick={() => setIsMoveStageOpen(!isMoveStageOpen)}
                variant="primary"
                icon={<ICONS.ARROW_RIGHT className="w-3 h-3" />}
                iconPosition="right"
                className="px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-xl shadow-indigo-600/20"
              >
                Shift Workflow
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-3xl backdrop-blur-sm">
                <span className="text-xs text-slate-500 font-semibold block mb-2">Process Stream</span>
                <span className="font-semibold text-white text-base truncate block">{lead.pipelineName}</span>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-400/20 p-5 rounded-3xl backdrop-blur-sm">
                <span className="text-xs text-indigo-300 font-semibold block mb-2">Operation State</span>
                <span className="font-semibold text-indigo-400 text-base truncate block">{lead.currentPipelineStageName}</span>
              </div>
            </div>

            {isMoveStageOpen && (
              <div className="bg-slate-800 border border-slate-700 rounded-[24px] p-6 mt-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-400">Select Target Vector</p>
                  <Button
                    id={`jaldee-leads-lead-${lead.uid}-stage-selector-close-button`}
                    data-testid={`jaldee-leads-lead-${lead.uid}-stage-selector-close-button`}
                    onClick={() => setIsMoveStageOpen(false)}
                    variant="ghost"
                    icon={<ICONS.CLOSE className="w-4 h-4" />}
                    iconOnly
                    aria-label="Close stage selector"
                    className="text-slate-500 hover:text-white"
                  />
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {currentPipeline.stages.map(stage => (
                    <Button
                      id={`jaldee-leads-lead-${lead.uid}-stage-${stage.uid}-button`}
                      data-testid={`jaldee-leads-lead-${lead.uid}-stage-${stage.uid}-button`}
                      data-active={lead.currentPipelineStageUid === stage.uid}
                      key={stage.uid}
                      onClick={() => {
                        onUpdate({...lead, currentPipelineStageUid: stage.uid, currentPipelineStageName: stage.stageName});
                        setIsMoveStageOpen(false);
                      }}
                      variant={lead.currentPipelineStageUid === stage.uid ? "primary" : "outline"}
                      className={cn(
                        "px-4 py-2 text-sm font-semibold border-2 rounded-xl transition-all active-scale",
                        lead.currentPipelineStageUid === stage.uid 
                          ? "border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" 
                          : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                      )}
                    >
                      {stage.stageName}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white px-10 gap-10 border-b border-slate-100 shrink-0">
          {['details', 'timeline', 'notes'].map(tab => (
            <Button
              id={`jaldee-leads-lead-${lead.uid}-${tab}-tab`}
              data-testid={`jaldee-leads-lead-${lead.uid}-${tab}-tab`}
              data-active={activeTab === tab}
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              variant="ghost"
              className={cn(
                "py-6 text-sm font-semibold transition-all relative",
                activeTab === tab 
                  ? "text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-indigo-600 after:rounded-full after:shadow-[0_-4px_12px_rgba(79,70,229,0.5)]" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab}
            </Button>
          ))}
        </div>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-10 bg-slate-50 space-y-8 no-scrollbar">
          {activeTab === 'details' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm software-shadow">
                <h3 className="text-sm font-semibold text-slate-400 mb-8 flex items-center gap-3">
                  <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                  Consumer Profile Data
                </h3>
                <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                  <div>
                    <p className="text-slate-400 text-sm font-semibold mb-2 leading-none">First Name</p>
                    <p className="font-semibold text-slate-900 text-base">{lead.consumerFirstName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-semibold mb-2 leading-none">Last Name</p>
                    <p className="font-semibold text-slate-900 text-base">{lead.consumerLastName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-semibold mb-2 leading-none">Global Contact</p>
                    <p className="font-semibold text-slate-900 text-base">{lead.consumerPhone}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-semibold mb-2 leading-none">Digital ID</p>
                    <p className="font-semibold text-slate-900 text-base truncate">{lead.consumerEmail || 'NOT_DECLARED'}</p>
                  </div>
                </div>
              </section>

              <section className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm software-shadow">
                <h3 className="text-sm font-semibold text-slate-400 mb-8 flex items-center gap-3">
                  <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                  Technical Segmentation
                </h3>
                <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                  <div>
                    <p className="text-slate-400 text-sm font-semibold mb-2 leading-none">Source Origin</p>
                    <p className="font-semibold text-slate-900 text-base flex items-center gap-2">
                      {lead.channelName.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-semibold mb-2 leading-none">Product Category</p>
                    <p className="font-semibold text-slate-900 text-base leading-tight">{lead.productName}</p>
                  </div>
                </div>
              </section>
              
              <section className="bg-white p-8 rounded-[32px] border-2 border-indigo-100 shadow-xl shadow-indigo-600/5 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <ICONS.PROFILE className="w-24 h-24" />
                </div>
                 <h3 className="text-sm font-semibold text-slate-400 mb-8 leading-none">Infrastructure Ownership</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[24px] bg-indigo-600 text-white flex items-center justify-center text-xl font-semibold shadow-xl shadow-indigo-600/30">
                      {mockUsers.find(u=>u.uid === lead.ownerId)?.avatarInitials || 'O'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-lg leading-none mb-1">{lead.ownerName}</p>
                      <p className="text-sm font-semibold text-slate-400">System Priority Handler</p>
                    </div>
                  </div>
                  <Button id={`jaldee-leads-lead-${lead.uid}-reassign-link-button`} data-testid={`jaldee-leads-lead-${lead.uid}-reassign-link-button`} variant="outline" className="text-indigo-600 text-sm font-semibold px-6 py-3 rounded-2xl">
                    Reassign Link
                  </Button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative pl-10 before:absolute before:left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-200 before:rounded-full">
                <div className="relative mb-10 last:mb-0">
                  <div className="absolute -left-10 top-0 w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center border-4 border-white shadow-lg">
                    <ICONS.DATE className="w-2.5 h-2.5" />
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 software-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Genesis Event</span>
                      <time className="text-sm font-semibold font-mono text-slate-400">{formatDistanceToNow(new Date(lead.createdAt))} ago</time>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">Lead Initialization Complete</h4>
                    <p className="text-slate-500 text-xs font-medium">Record successfully injected via {lead.channelName} gateway.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-8 rounded-[32px] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
                 <h3 className="text-sm font-semibold text-slate-400 mb-6 leading-none">Internal Annotations</h3>
                <Textarea id={`jaldee-leads-lead-${lead.uid}-note-textarea`} data-testid={`jaldee-leads-lead-${lead.uid}-note-textarea`} placeholder="Append data to record..." className="w-full text-base font-medium text-slate-800 resize-none bg-slate-50 p-6 rounded-3xl border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-300" rows={4} />
                <div className="flex justify-end mt-6">
                  <Button id={`jaldee-leads-lead-${lead.uid}-commit-note-button`} data-testid={`jaldee-leads-lead-${lead.uid}-commit-note-button`} variant="primary" className="px-8 py-3.5 rounded-2xl text-sm font-semibold shadow-xl shadow-indigo-600/30">
                    Commit Note
                  </Button>
                </div>
              </div>
              
              {lead.generalNotes.length === 0 ? (
                <div className="bg-slate-100/50 rounded-[32px] border-2 border-dashed border-slate-200 py-16 text-center">
                  <ICONS.PROFILE className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-20" />
                  <p className="text-slate-400 font-bold text-xs">No annotation history found for this record</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {lead.generalNotes.map((note) => {
                      const noteKey = automationToken(note.id || note.createdAt || note.notes, "note");
                      return (
                      <div key={noteKey} data-testid={`jaldee-leads-lead-${lead.uid}-note-${noteKey}`} className="bg-white p-6 rounded-[24px] border border-slate-200 software-shadow">
                         <p className="text-slate-800 text-sm font-medium leading-relaxed">{note.notes}</p>
                         <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                           <span className="text-xs font-semibold text-slate-400">Archived Annotation</span>
                         </div>
                      </div>
                      );
                   })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
