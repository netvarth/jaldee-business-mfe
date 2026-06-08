import React from 'react';
import { PageHeader, SectionCard, Button, Input, Textarea } from "@jaldee/design-system";
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { format } from '../lib/dateUtils';
import type { CrmLeadDto, CrmLeadPipelineDto, LeadStageTask, Product } from '../types';

type Stage = CrmLeadPipelineDto['stages'][number];
type ConversionMapping = NonNullable<Product['conversionMapping']>;

interface LeadDetailBodyProps {
  lead: CrmLeadDto;
  editedLead: CrmLeadDto;
  currentPipeline?: CrmLeadPipelineDto;
  stages: Stage[];
  totalStageCount: number;
  completedStageCount: number;
  movementRule: string;
  requiredTasksCompleted: LeadStageTask[];
  requiredTasksTotal: LeadStageTask[];
  optionalTasksTotal: LeadStageTask[];
  manualTasks: LeadStageTask[];
  optionalAndManualTasksCompleted: LeadStageTask[];
  optionalAndManualTasksTotal: LeadStageTask[];
  isEditing: boolean;
  actingRole: 'ADMIN' | 'MANAGER' | 'SALES_REP';
  missingFields: string[];
  productDisplayName: string;
  isOwnerRestricted: boolean;
  isStageBlocked: boolean;
  canOverrideBlock: boolean;
  isConversionRestricted: boolean;
  setTargetStageUid: React.Dispatch<React.SetStateAction<string>>;
  setShowMoveModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddStageModal: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setEditedLead: React.Dispatch<React.SetStateAction<CrmLeadDto>>;
  setActingRole: React.Dispatch<React.SetStateAction<'ADMIN' | 'MANAGER' | 'SALES_REP'>>;
  setShowConversionModal: React.Dispatch<React.SetStateAction<boolean>>;
  onBack: () => void;
  handleSaveContactDetails: () => void;
  handleTimelineStageClick: (stageUid: string) => void;
  handleAddManualTask: () => void;
  handleToggleTask: (taskUid: string) => void;
  currentStage?: Stage;
  conversionMapping?: ConversionMapping;
}

export function LeadDetailBody({
  lead,
  editedLead,
  currentPipeline,
  stages,
  totalStageCount,
  completedStageCount,
  movementRule,
  requiredTasksCompleted,
  requiredTasksTotal,
  optionalTasksTotal,
  manualTasks,
  optionalAndManualTasksCompleted,
  optionalAndManualTasksTotal,
  isEditing,
  actingRole,
  missingFields,
  productDisplayName,
  isOwnerRestricted,
  isStageBlocked,
  canOverrideBlock,
  isConversionRestricted,
  setTargetStageUid,
  setShowMoveModal,
  setShowAddStageModal,
  setIsEditing,
  setEditedLead,
  setActingRole,
  setShowConversionModal,
  onBack,
  handleSaveContactDetails,
  handleTimelineStageClick,
  handleAddManualTask,
  handleToggleTask,
  currentStage,
  conversionMapping,
}: LeadDetailBodyProps) {
  return (
    <>
      {/* 1. Dynamic Header Workspace */}
      <div className="px-4 py-3 md:px-6 md:py-4 shrink-0">
        <PageHeader
          title={`${lead.consumerFirstName} ${lead.consumerLastName}`}
          subtitle={`Ref: ${lead.referenceNo} • Added ${format(new Date(lead.createdAt), 'dd MMM yy')} • Stage: ${lead.currentPipelineStageName}`}
          back={{ label: "Back", href: "#" }}
          onNavigate={onBack}
          actions={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setTargetStageUid('');
                  setShowMoveModal(true);
                }}
                variant="primary"
                icon={<ICONS.NEXT className="w-3.5 h-3.5" />}
                className="text-sm font-semibold active-scale"
              >
                Advance Stage
              </Button>
              {isEditing ? (
                <Button onClick={handleSaveContactDetails} variant="primary" className="text-sm font-semibold">
                  Save
                </Button>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="text-sm font-semibold">
                  Edit File
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
         <div className="w-full p-4 md:p-6 space-y-6">

            {/* Visual Steps/Stages Timeline Section */}
            <SectionCard className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                <div>
                   <h3 className="text-sm font-semibold text-slate-900">Pipeline Sequence Timeline</h3>
                   <p className="text-sm font-bold text-slate-400 mt-0.5">Move the lead across operational stages dynamically</p>
                </div>
                <Button 
                  onClick={() => setShowAddStageModal(true)}
                  variant="outline"
                  icon={<ICONS.ADD className="w-3.5 h-3.5" />}
                  className="text-xs font-semibold px-4 py-2"
                >
                  New Pipeline Stage
                </Button>
              </div>

              {/* Horizontal Scrollable Row for Stages */}
              <div className="overflow-x-auto scroll-smooth py-2 pb-3">
                 <div className="flex w-max min-w-full items-center gap-2 select-none">
                    {/* Compute custom sorted stages */}
                    {(() => {
                      const sortedStages = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
                      const currentStageIdx = sortedStages.findIndex(s => s.uid === lead.currentPipelineStageUid);

                      return sortedStages.map((stage, idx) => {
                        const isCurrent = stage.uid === lead.currentPipelineStageUid;
                        const isPast = idx < currentStageIdx;
                        const isFuture = idx > currentStageIdx;

                        return (
                          <React.Fragment key={stage.uid}>
                            {/* Connector line (if not first stage) */}
                            {idx > 0 && (
                              <div className="h-[2px] w-7 sm:w-9 shrink-0 transition-all duration-300 relative">
                                <div className={cn(
                                  "absolute inset-0 rounded-full",
                                  isPast ? "bg-indigo-600" : isCurrent ? "bg-gradient-to-r from-indigo-600 to-slate-200" : "bg-slate-205 bg-slate-200"
                                )} />
                              </div>
                            )}

                            {/* Stage Node */}
                            <div 
                              onClick={() => handleTimelineStageClick(stage.uid)}
                              className={cn(
                                "relative flex min-h-[72px] w-[104px] sm:w-[120px] md:w-[132px] shrink-0 flex-col items-center justify-center group cursor-pointer text-center px-2 sm:px-3 py-3 rounded-2xl border transition-all duration-200 shadow-sm",
                                isCurrent
                                  ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-105 border-slate-800"
                                  : isPast
                                    ? "bg-indigo-50/70 border-indigo-100 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50"
                                    : "bg-white border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40"
                              )}
                            >
                               {/* Indicator dot or circle */}
                               <div className={cn(
                                 "w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono font-semibold text-xs transition-all relative z-10 shadow-sm",
                                 isCurrent ? "bg-white border-indigo-500 text-indigo-600" :
                                 isPast ? "bg-indigo-50 border-indigo-500 text-indigo-600" :
                                 "bg-white border-slate-200 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600"
                               )}>
                                 {isPast || isCurrent ? (
                                   <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                     <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                   </svg>
                                 ) : (
                                   idx + 1
                                 )}
                               </div>

                               {/* Text metrics */}
                               <p className={cn(
                                 "w-full mt-2.5 text-[11px] font-semibold leading-tight whitespace-normal break-words",
                                 isCurrent ? "text-white" : isPast ? "text-indigo-700" : "text-slate-800"
                               )}>
                                 {stage.stageName}
                               </p>
                               


                               {/* Tooltip */}
                               {isFuture && (
                                 <div className="absolute top-[-24px] bg-slate-800 text-white text-xs font-bold py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md transform pointer-events-none mb-1">
                                   Advance Lead to here
                                 </div>
                               )}
                            </div>
                          </React.Fragment>
                        );
                      });
                    })()}

                    {/* Dotted Connection to Action Node */}
                    <div className="border-t-2 border-dashed border-slate-200 mx-2 w-7 sm:w-9 shrink-0" />

                    {/* Interactive add stage circle node */}
                    <button 
                      onClick={() => setShowAddStageModal(true)}
                      className="flex flex-col items-center group cursor-pointer text-center px-2 py-2 rounded-2xl hover:bg-indigo-50/20 transition-all duration-200 min-w-[120px]"
                    >
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 group-hover:border-indigo-600 bg-white group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center font-semibold transition-all shadow-sm">
                        <ICONS.ADD className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-semibold mt-2.5 text-slate-500 group-hover:text-indigo-600">Add Stage</p>
                      <span className="text-xs font-bold text-slate-400 mt-1">Configure threshold</span>
                    </button>
                 </div>
              </div>
            </SectionCard>
            
            {/* Stage Execution Progress Stats Panel */}
            <SectionCard className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
               <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:items-center">
                 <div>
                   <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Active Pipeline</span>
                   <p className="mt-1 text-sm font-bold uppercase leading-tight text-indigo-600">{currentPipeline?.name || 'Standard Sales'}</p>
                 </div>
                 <div className="sm:text-center">
                   <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Required Compliance</span>
                   <p className="mt-1 text-sm font-mono font-bold leading-tight text-slate-800">
                     {totalStageCount}/{completedStageCount}
                   </p>
                 </div>
                 <div className="sm:text-left">
                   <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Stage Movement Rule</span>
                   <span className={cn(
                      "mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase leading-none",
                      movementRule === 'Strict Block' ? "bg-red-50 text-red-600 border-red-200" :
                      movementRule === 'Warn Only' ? "bg-amber-50 text-amber-600 border-amber-200" :
                      "bg-slate-50 text-slate-500 border-slate-200"
                   )}>
                     {movementRule}
                   </span>
                 </div>
               </div>
            </SectionCard>

            {/* Split Task Layout List */}
            <SectionCard className="p-6">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
                  <div>
                     <h3 className="text-sm font-semibold text-slate-900">Lead Activity Playbook</h3>
                     <p className="text-sm font-bold text-slate-400 mt-0.5">Complete tasks to pass compliance and advance</p>
                  </div>
                  <Button 
                    onClick={handleAddManualTask}
                    variant="outline"
                    className="text-xs font-semibold px-4 py-2 self-start sm:self-auto shrink-0"
                  >
                     + Add Manual Task
                  </Button>
               </div>               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Required Predefined Tasks */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <h4 className="text-sm font-semibold text-slate-400">Required Predefined Tasks</h4>
                       <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold font-semibold">
                         {requiredTasksCompleted.length}/{requiredTasksTotal.length} COMPLETED
                       </span>
                     </div>
                     <div className="space-y-2">
                       {requiredTasksTotal.map(task => {
                         const hasDetails = task.description || task.priority || task.location || task.assigneeName || task.dueDate || task.category || task.status;
                         return (
                           <div 
                             key={task.uid}
                             data-testid={`jaldee-leads-lead-${lead.uid}-required-task-${task.uid}-row`}
                             data-active={String(task.completed)}
                             onClick={() => handleToggleTask(task.uid)}
                             className={cn(
                               "flex flex-col gap-1 p-4 bg-white border rounded-2xl transition-all cursor-pointer group",
                               task.completed ? "border-slate-150 bg-slate-50/50 opacity-60" : "border-slate-200 hover:border-indigo-600"
                             )}
                           >
                              <div className="flex items-start gap-3">
                                 <div className={cn(
                                   "w-5 h-5 rounded-md border flex items-center justify-center transition-all mt-0.5 shrink-0",
                                   task.completed ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 group-hover:border-indigo-600 bg-white"
                                 )}>
                                    {task.completed && <ICONS.USER_CHECK className="w-3.5 h-3.5" />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs font-semibold", task.completed ? "text-slate-400 line-through" : "text-slate-900")}>
                                      {task.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                       <span className="text-xs font-semibold text-slate-400 bg-slate-50 border px-1.5 py-0.5 rounded">REQUIRED</span>
                                       {task.priority && (
                                         <span className={cn(
                                           "text-xs font-semibold px-1.5 py-0.5 rounded border",
                                           task.priority === 'URGENT' ? "bg-red-50 text-red-650 border-red-150" :
                                           task.priority === 'HIGH' ? "bg-amber-50 text-amber-700 border-amber-150" :
                                           task.priority === 'NORMAL' ? "bg-blue-50 text-blue-650 border-blue-150" :
                                           "bg-slate-50 text-slate-500 border-slate-150"
                                         )}>
                                           {task.priority}
                                         </span>
                                       )}
                                       {task.status && (
                                         <span className="text-xs font-semibold text-indigo-705 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded">
                                           {task.status}
                                         </span>
                                       )}
                                    </div>
                                 </div>
                              </div>

                              {hasDetails && (
                                <div className="pl-8 pt-2 mt-1 border-t border-slate-50 space-y-2 text-sm text-slate-500 font-bold">
                                   {task.description && (
                                     <p className="text-slate-600 normal-case font-medium text-sm leading-relaxed mb-1 bg-slate-50/50 p-2 rounded-lg">
                                       {task.description}
                                     </p>
                                   )}
                                   <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold text-slate-400">
                                      {task.location && <div>📍 <span className="text-slate-600">{task.location}</span></div>}
                                      {task.assigneeName && <div>👤 <span className="text-slate-600">{task.assigneeName}</span></div>}
                                      {task.dueDate && <div>📅 <span className="text-slate-600">{task.dueDate}</span></div>}
                                      {task.category && <div>🏷️ <span className="text-slate-600">{task.category}</span></div>}
                                   </div>
                                </div>
                              )}
                           </div>
                         );
                       })}
                       {requiredTasksTotal.length === 0 && (
                         <p className="text-sm text-slate-400 italic font-semibold text-center py-6">No required tasks configured.</p>
                       )}
                     </div>
                  </div>

                  {/* Right Column: Optional Tasks & Manual Tasks */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <h4 className="text-sm font-semibold text-slate-400">Optional & Manual Lead Tasks</h4>
                       <span className="text-sm font-mono text-slate-700 font-semibold">
                         {optionalAndManualTasksCompleted.length}/{optionalAndManualTasksTotal.length} OPTIONAL
                       </span>
                     </div>
                     <div className="space-y-2">
                       {/* Optional predefined list */}
                       {optionalTasksTotal.map(task => {
                         const hasDetails = task.description || task.priority || task.location || task.assigneeName || task.dueDate || task.category || task.status;
                         return (
                           <div 
                             key={task.uid}
                             data-testid={`jaldee-leads-lead-${lead.uid}-optional-task-${task.uid}-row`}
                             data-active={String(task.completed)}
                             onClick={() => handleToggleTask(task.uid)}
                             className={cn(
                               "flex flex-col gap-1 p-4 bg-white border rounded-2xl transition-all cursor-pointer group",
                               task.completed ? "border-slate-150 bg-slate-50/50 opacity-60" : "border-slate-250 hover:border-indigo-600"
                             )}
                           >
                              <div className="flex items-start gap-3">
                                 <div className={cn(
                                   "w-5 h-5 rounded-md border flex items-center justify-center transition-all mt-0.5 shrink-0",
                                   task.completed ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 group-hover:border-indigo-600 bg-white"
                                 )}>
                                    {task.completed && <ICONS.USER_CHECK className="w-3.5 h-3.5" />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs font-semibold", task.completed ? "text-slate-400 line-through" : "text-slate-900")}>
                                      {task.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                       <span className="text-xs font-semibold text-slate-400 bg-slate-100 border px-1.5 py-0.5 rounded">OPTIONAL</span>
                                       {task.priority && (
                                         <span className={cn(
                                           "text-xs font-semibold px-1.5 py-0.5 rounded border",
                                           task.priority === 'URGENT' ? "bg-red-50 text-red-655 border-red-150" :
                                           task.priority === 'HIGH' ? "bg-amber-50 text-amber-707 border-amber-150" :
                                           task.priority === 'NORMAL' ? "bg-blue-50 text-blue-655 border-blue-150" :
                                           "bg-slate-50 text-slate-505 border-slate-150"
                                         )}>
                                           {task.priority}
                                         </span>
                                       )}
                                       {task.status && (
                                         <span className="text-xs font-semibold text-indigo-755 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded">
                                           {task.status}
                                         </span>
                                       )}
                                    </div>
                                 </div>
                              </div>

                              {hasDetails && (
                                <div className="pl-8 pt-2 mt-1 border-t border-slate-50 space-y-2 text-sm text-slate-500 font-bold">
                                   {task.description && (
                                     <p className="text-slate-600 normal-case font-medium text-sm leading-relaxed mb-1 bg-slate-50/50 p-2 rounded-lg">
                                       {task.description}
                                     </p>
                                   )}
                                   <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold text-slate-400">
                                      {task.location && <div>📍 <span className="text-slate-600">{task.location}</span></div>}
                                      {task.assigneeName && <div>👤 <span className="text-slate-600">{task.assigneeName}</span></div>}
                                      {task.dueDate && <div>📅 <span className="text-slate-600">{task.dueDate}</span></div>}
                                      {task.category && <div>🏷️ <span className="text-slate-600">{task.category}</span></div>}
                                   </div>
                                </div>
                              )}
                           </div>
                         );
                       })}

                       {/* Manual lead execution tasks */}
                       {manualTasks.map(task => {
                         const hasDetails = task.description || task.priority || task.location || task.assigneeName || task.dueDate || task.category || task.status;
                         return (
                           <div 
                             key={task.uid}
                             onClick={() => handleToggleTask(task.uid)}
                             className={cn(
                               "flex flex-col gap-1 p-4 bg-white border border-dashed rounded-2xl transition-all cursor-pointer group",
                               task.completed ? "border-slate-200 bg-slate-50/50 opacity-60" : "border-indigo-200 bg-indigo-50/10 hover:border-indigo-650"
                             )}
                           >
                              <div className="flex items-start gap-3">
                                 <div className={cn(
                                   "w-5 h-5 rounded-md border flex items-center justify-center transition-all mt-0.5 shrink-0",
                                   task.completed ? "bg-indigo-600 border-indigo-600 text-white" : "border-indigo-300 group-hover:border-indigo-600 bg-white"
                                 )}>
                                    {task.completed && <ICONS.USER_CHECK className="w-3.5 h-3.5" />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs font-semibold text-indigo-750", task.completed ? "text-slate-400 line-through" : "text-slate-900")}>
                                      {task.title}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                       <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">MANUAL ADDITIONAL</span>
                                       {task.priority && (
                                         <span className={cn(
                                           "text-xs font-semibold px-1.5 py-0.5 rounded border",
                                           task.priority === 'URGENT' ? "bg-red-50 text-red-600 border-red-150" :
                                           task.priority === 'HIGH' ? "bg-amber-50 text-amber-700 border-amber-150" :
                                           task.priority === 'NORMAL' ? "bg-blue-50 text-blue-600 border-blue-150" :
                                           "bg-slate-50 text-slate-500 border-slate-150"
                                         )}>
                                           {task.priority}
                                         </span>
                                       )}
                                       {task.status && (
                                         <span className="text-xs font-semibold text-indigo-750 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                           {task.status}
                                         </span>
                                       )}
                                    </div>
                                 </div>
                              </div>

                              {hasDetails && (
                                <div className="pl-8 pt-2 mt-1 border-t border-slate-50 space-y-2 text-sm text-slate-500 font-bold">
                                   {task.description && (
                                     <p className="text-slate-600 normal-case font-medium text-sm leading-relaxed mb-1 bg-slate-50/50 p-2 rounded-lg">
                                       {task.description}
                                     </p>
                                   )}
                                   <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold text-slate-400">
                                      {task.location && <div>📍 <span className="text-slate-605 text-slate-600">{task.location}</span></div>}
                                      {task.assigneeName && <div>👤 <span className="text-slate-605 text-slate-600">{task.assigneeName}</span></div>}
                                      {task.dueDate && <div>📅 <span className="text-slate-601 text-slate-600">{task.dueDate}</span></div>}
                                      {task.category && <div>🏷️ <span className="text-slate-605 text-slate-600">{task.category}</span></div>}
                                   </div>
                                </div>
                              )}
                           </div>
                         );
                       })}

                       {optionalTasksTotal.length === 0 && manualTasks.length === 0 && (
                         <p className="text-sm text-slate-400 italic font-semibold text-center py-6">No additional tasks created.</p>
                       )}
                     </div>
                  </div>
               </div>
            </SectionCard>

            {/* Split Information Details Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-6 animate-fade-in">
                  
                  {/* Lead Master Details Panel */}
                  <SectionCard className="p-6 md:p-8 space-y-6 text-slate-900">
                     <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <h3 className="text-sm font-semibold text-slate-900">Contact dossier</h3>
                        <ICONS.USER_CHECK className="w-4 h-4 text-indigo-600" />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
                        <div>
                           <label className="text-xs font-semibold text-slate-400 block mb-1">First Name</label>
                           {isEditing ? (
                             <Input 
                               value={editedLead.consumerFirstName} 
                               onChange={e => setEditedLead({ ...editedLead, consumerFirstName: e.target.value })}
                               className="w-full"
                             />
                           ) : (
                             <p className="text-sm font-semibold text-slate-800">{lead.consumerFirstName}</p>
                           )}
                        </div>

                        <div>
                           <label className="text-xs font-semibold text-slate-400 block mb-1">Last Name</label>
                           {isEditing ? (
                             <Input 
                               value={editedLead.consumerLastName} 
                               onChange={e => setEditedLead({ ...editedLead, consumerLastName: e.target.value })}
                               className="w-full"
                             />
                           ) : (
                             <p className="text-sm font-semibold text-slate-800">{lead.consumerLastName}</p>
                           )}
                        </div>

                        <div>
                           <label className="text-xs font-semibold text-slate-400 block mb-1">Company / Enterprise</label>
                           {isEditing ? (
                             <Input 
                               value={editedLead.company || ''} 
                               onChange={e => setEditedLead({ ...editedLead, company: e.target.value })}
                               className="w-full"
                             />
                           ) : (
                             <p className="text-sm font-semibold text-slate-800">{lead.company || 'INDIVIDUAL CONSUMER'}</p>
                           )}
                        </div>

                        <div>
                           <label className="text-xs font-semibold text-slate-400 block mb-1">Interest SKU Selection</label>
                           <p className="text-sm font-semibold text-slate-800">{lead.productName || 'GENERAL INQUIRY'}</p>
                        </div>

                        <div>
                           <label className="text-xs font-semibold text-slate-400 block mb-1">Contact Email Address</label>
                           {isEditing ? (
                             <Input 
                               value={editedLead.consumerEmail || ''} 
                               onChange={e => setEditedLead({ ...editedLead, consumerEmail: e.target.value })}
                               className="w-full"
                             />
                           ) : (
                             <p className="text-sm font-semibold text-slate-800 lowercase">{lead.consumerEmail || 'N/A'}</p>
                           )}
                        </div>

                        <div>
                           <label className="text-xs font-semibold text-slate-400 block mb-1">Telephone Contact</label>
                           {isEditing ? (
                             <Input 
                               value={editedLead.consumerPhone || ''} 
                               onChange={e => setEditedLead({ ...editedLead, consumerPhone: e.target.value })}
                               className="w-full"
                             />
                           ) : (
                             <p className="text-sm font-semibold text-slate-800 font-mono">{lead.consumerPhone}</p>
                           )}
                        </div>
                     </div>
                  </SectionCard>

                  {/* Activity History Workflow Audit Grid */}
                  <SectionCard className="p-6 md:p-8 space-y-6">
                     <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900">Activity & compliance Audit log</h3>
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded">SYSTEM AUDITED</span>
                     </div>

                     <div className="space-y-4 no-scrollbar max-h-96 overflow-y-auto pr-2">
                        {lead.stageHistory?.map((hist, idx) => (
                           <div key={idx} className="flex gap-4 items-start border-l-2 border-indigo-600/30 pl-4 py-1 relative">
                              <div className="absolute -left-[5px] top-2.5 w-2 h-2 rounded-full bg-indigo-600" />
                              <div className="flex-1 text-xs">
                                 <p className="font-semibold text-slate-900">Advance to {hist.toStageName}</p>
                                 <p className="font-bold text-slate-400 text-xs mt-0.5">Moved out of {hist.fromStageName} by {hist.movedByName} • {format(new Date(hist.movedAt), 'dd MMM yy HH:mm')}</p>
                                 {hist.reasonNote && (
                                   <p className="text-slate-600 italic mt-1 font-medium bg-slate-50 border border-slate-100 p-2 rounded text-sm leading-relaxed">Compliance: {hist.reasonNote}</p>
                                 )}
                              </div>
                           </div>
                        ))}

                        {lead.generalNotes?.map((note) => (
                           <div key={note.id} className="flex gap-4 items-start border-l-2 border-slate-200 pl-4 py-1 relative">
                              <div className="absolute -left-[5.5px] top-2.5 w-2.5 h-2.5 rounded-full bg-slate-400 border border-white" />
                              <div className="flex-1 text-xs">
                                 <p className="font-bold text-slate-600">{note.notes}</p>
                                 <p className="font-bold text-slate-400 text-xs mt-0.5">{format(new Date(note.createdDate), 'dd MMM yy')}</p>
                              </div>
                           </div>
                        ))}

                        {!lead.stageHistory?.length && !lead.generalNotes?.length && (
                           <p className="text-sm text-slate-400 text-center italic py-6">No audits registered for this record.</p>
                        )}
                     </div>
                  </SectionCard>
               </div>

               {/* Right Side Info Area */}
               <div className="space-y-6">
                  <SectionCard className="bg-slate-900 text-white p-6 space-y-4 shadow-lg shadow-slate-900/10">
                     <p className="mb-3 text-sm font-semibold text-indigo-400">Owner Assignment</p>
                     
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-650 text-white flex items-center justify-center font-semibold">
                           {lead.ownerName?.[0] || 'U'}
                        </div>
                        <div>
                           <p className="text-xs font-semibold text-white">{lead.ownerName || 'Unassigned custodian'}</p>
                           <p className="text-xs font-semibold text-slate-400">Active representative</p>
                        </div>
                     </div>
                  </SectionCard>

                  <SectionCard className="p-6 space-y-4 text-xs font-semibold text-slate-400">
                     <div className="border-b border-slate-50 pb-3">
                        <p className="text-xs text-slate-400">Source Landing channel</p>
                        <p className="text-slate-800 text-xs font-semibold mt-1.5">{lead.channelName || 'Direct'}</p>
                     </div>

                     <div className="border-b border-slate-50 pb-3">
                        <p className="text-xs text-slate-400">Target Product offered</p>
                        <p className="text-slate-800 text-xs font-semibold mt-1.5">{productDisplayName}</p>
                     </div>

                     <div>
                        <p className="text-xs text-slate-400">Priority Tier</p>
                        <span className={cn(
                           "text-xs font-semibold px-2 py-0.5 rounded border inline-block mt-1.5",
                           lead.priority === 'URGENT' ? "bg-red-50 text-red-600 border-red-100" :
                           lead.priority === 'HIGH' ? "bg-amber-50 text-amber-600 border-amber-100" :
                           "bg-indigo-50 text-indigo-600 border-indigo-100"
                        )}>
                           {lead.priority}
                        </span>
                     </div>
                  </SectionCard>

                  {/* Lead Operational Conversion Panel */}
                  <SectionCard className="p-6 space-y-4">
                     <div className="border-b border-slate-100 pb-3">
                        <p className="text-sm font-semibold text-slate-400">Security / Role Simulation</p>
                        <div className="flex gap-1.5 mt-2 bg-slate-50 border border-slate-100 p-1 rounded-xl">
                          {(['ADMIN', 'MANAGER', 'SALES_REP'] as const).map(role => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => setActingRole(role)}
                              className={cn(
                                "flex-1 py-1 px-1.5 rounded-lg text-xs font-semibold transition-all",
                                actingRole === role 
                                  ? "bg-slate-900 text-white shadow" 
                                  : "text-slate-400 hover:text-slate-700 font-bold"
                              )}
                            >
                              {role === 'SALES_REP' ? 'REP' : role}
                            </button>
                          ))}
                        </div>
                     </div>

                     <div className="space-y-3 text-xs text-slate-600">
                        <p className="text-sm font-semibold text-slate-400">Operation Conversion Target</p>
                        
                        {lead.isConverted ? (
                          <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 space-y-3 animate-fadeIn text-xs text-slate-800">
                             <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold">
                                 ✓
                               </div>
                               <div className="min-w-0">
                                 <span className="text-xs font-semibold text-emerald-800 block leading-none truncate">Record Converted</span>
                                 <span className="text-xs font-semibold text-slate-400 mt-0.5 truncate block">{lead.convertedOn ? format(new Date(lead.convertedOn), 'dd MMM yy HH:mm') : ''}</span>
                               </div>
                             </div>

                             <div className="text-xs font-semibold text-slate-500 space-y-1 bg-white/60 p-2.5 rounded-xl border border-emerald-100">
                               <div>TARGET: <strong className="text-slate-800">{lead.convertedTargetType}</strong></div>
                               <div>DOC REF: <strong className="text-indigo-600 font-mono text-xs">{lead.convertedObjectRef}</strong></div>
                               <div>AGENT: <strong className="text-slate-650">{lead.convertedBy || 'System'}</strong></div>
                               {lead.convertedNotes && (
                                 <div className="mt-1.5 pt-1 border-t border-slate-100 normal-case italic font-medium text-slate-500 text-sm leading-relaxed">
                                   "{lead.convertedNotes}"
                                 </div>
                               )}
                             </div>

                             <div className="text-center pt-1 shrink-0">
                                <Button 
                                  onClick={() => {
                                    alert(`Opening operational downstream object ${lead.convertedObjectRef} dashboard workflow!`);
                                  }}
                                  variant="primary"
                                  className="w-full text-xs font-semibold active-scale cursor-pointer py-2"
                                >
                                  Open Converted Module Link ↗
                                </Button>
                             </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                             <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-sm font-semibold text-slate-400 space-y-1">
                               <div>BLUEPRINT: <span className="text-slate-805 text-slate-900 font-semibold">{conversionMapping?.targetType || 'Appointment (Fallback)'}</span></div>
                               <div>SUB-CORE: <span className="font-mono text-indigo-600 font-bold">{conversionMapping?.targetModule || 'Intake Dispatch'}</span></div>
                               <div>DUPLICATES: <span className="text-indigo-650 font-bold">{conversionMapping?.duplicateRule || 'Ignore'}</span></div>
                             </div>

                             {/* Eligibility diagnostics banner */}
                             {isConversionRestricted ? (
                               <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-sm font-semibold text-rose-600 space-y-1">
                                 <p className="font-semibold text-xs leading-snug">❌ CONVERSION BLOCKED IN STAGE</p>
                                 <p className="text-xs font-bold text-slate-400 normal-case leading-normal mt-0.5">Sales reps cannot initiate conversion at this threshold stage. Ask an Admin or Manager override.</p>
                               </div>
                             ) : isStageBlocked ? (
                               <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm font-semibold text-amber-700 space-y-1">
                                 <p className="font-semibold text-xs leading-snug">⚠️ BLOCKED STAGE (OVERRIDABLE)</p>
                                 <p className="text-xs font-bold text-slate-500 leading-normal mb-1.5 normal-case">Stage is transition-blocked, but your active simulated security authorization ({actingRole}) grants override bypass.</p>
                               </div>
                             ) : currentStage?.conversionSetting === 'RECOMMENDED' ? (
                               <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-2.5 text-xs font-semibold text-emerald-800 font-semibold text-center">
                                 🌟 RECOMMENDED TRANSITION THRESHOLD
                               </div>
                             ) : null}

                             {isOwnerRestricted && (
                               <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
                                 ❌ ASSIGNED ASSISTANT REQUIRED: Only {lead.ownerName || 'assigned owner'} has permissions in Rep Mode. Switch to ADMIN or MANAGER to bypass.
                               </div>
                             )}

                             {missingFields.length > 0 && (
                               <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600 text-wrap leading-tight mt-1 space-y-1">
                                 <p className="font-semibold">⚠️ MISSING CONVERSION MANDATES:</p>
                                 <ul className="list-disc list-inside text-xs text-slate-500 normal-case font-bold pl-0.5">
                                   {missingFields.map((f, vi) => <li key={vi}>{f}</li>)}
                                 </ul>
                               </div>
                             )}

                             <Button
                               onClick={() => {
                                 if (isConversionRestricted) {
                                   alert("Your simulated role does not have authorization to bypass conversion blockages on this pipeline stage.");
                                   return;
                                 }
                                 if (isOwnerRestricted) {
                                   alert(`Sales representative conversion access denied: This record is assigned to ${lead.ownerName}.`);
                                   return;
                                 }
                                 setShowConversionModal(true);
                               }}
                               disabled={isConversionRestricted || isOwnerRestricted}
                               variant="primary"
                               className="w-full text-sm font-semibold cursor-pointer py-3"
                             >
                               {conversionMapping?.buttonLabel || 'Convert Record ⚡'}
                             </Button>
                          </div>
                        )}
                     </div>
                  </SectionCard>
             </div>

         </div>
      </div>
    </div>
    </>
  );
}
