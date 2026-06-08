import React from 'react';
import { Button, Checkbox, Dialog, DialogFooter, Input, Select, Textarea } from "@jaldee/design-system";
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { format } from '../lib/dateUtils';
import type { CrmLeadDto, CrmLeadPipelineDto, LeadStageTask, Product } from '../types';
import type { TaskLookupOption } from '../services/leadService';

type Stage = CrmLeadPipelineDto['stages'][number];
type ConversionMapping = NonNullable<Product['conversionMapping']>;
type ConversionSuccessData = {
  success: boolean;
  reference: string;
  targetType: string;
  serviceModule: string;
  ingestionTime: string;
  notes: string;
};
type ConversionForm = {
  consumerPhone: string;
  consumerEmail: string;
  company: string;
  consumerDob: string;
  consumerAddress: string;
  notes: string;
  overrideReason: string;
};
type TaskLocation = {
  id: string | number;
  name: string;
};
type TaskUser = {
  id: string | number;
  name: string;
};

interface LeadDetailDialogsProps {
  lead: CrmLeadDto;
  showMoveModal: boolean;
  setShowMoveModal: React.Dispatch<React.SetStateAction<boolean>>;
  currentStage?: Stage;
  targetStageUid: string;
  setTargetStageUid: React.Dispatch<React.SetStateAction<string>>;
  stages: Stage[];
  moveStatus: 'ALLOWED' | 'WARN' | 'BLOCKED';
  requiredTasksCompleted: LeadStageTask[];
  requiredTasksTotal: LeadStageTask[];
  optionalAndManualTasksCompleted: LeadStageTask[];
  optionalAndManualTasksTotal: LeadStageTask[];
  movementRule: string;
  overrideReason: string;
  setOverrideReason: React.Dispatch<React.SetStateAction<string>>;
  canOverrideBlock: boolean;
  handleProcessMoveStage: () => void;
  showAddManualTaskModal: boolean;
  setShowAddManualTaskModal: React.Dispatch<React.SetStateAction<boolean>>;
  manualTaskTitle: string;
  setManualTaskTitle: React.Dispatch<React.SetStateAction<string>>;
  manualTaskRequired: boolean;
  setManualTaskRequired: React.Dispatch<React.SetStateAction<boolean>>;
  manualTaskType: string;
  setManualTaskType: React.Dispatch<React.SetStateAction<string>>;
  manualTaskPriority: string;
  setManualTaskPriority: React.Dispatch<React.SetStateAction<string>>;
  manualTaskDescription: string;
  setManualTaskDescription: React.Dispatch<React.SetStateAction<string>>;
  manualTaskLocation: string;
  setManualTaskLocation: React.Dispatch<React.SetStateAction<string>>;
  manualTaskAssignee: string;
  setManualTaskAssignee: React.Dispatch<React.SetStateAction<string>>;
  manualTaskDate: string;
  setManualTaskDate: React.Dispatch<React.SetStateAction<string>>;
  manualTaskCategory: string;
  setManualTaskCategory: React.Dispatch<React.SetStateAction<string>>;
  manualTaskStatus: string;
  setManualTaskStatus: React.Dispatch<React.SetStateAction<string>>;
  taskPriorities: TaskLookupOption[];
  taskTypes: TaskLookupOption[];
  taskCategories: TaskLookupOption[];
  taskStatuses: TaskLookupOption[];
  taskLookupsLoading: boolean;
  taskCreateLoading: boolean;
  effectiveTaskLocations: TaskLocation[];
  taskUsers: TaskUser[];
  handleSaveManualTask: () => void;
  showAddStageModal: boolean;
  setShowAddStageModal: React.Dispatch<React.SetStateAction<boolean>>;
  currentPipeline?: CrmLeadPipelineDto;
  newStageName: string;
  setNewStageName: React.Dispatch<React.SetStateAction<string>>;
  newStageRule: 'Strict Block' | 'Warn Only' | 'Manager/Admin Override' | 'No Restriction';
  setNewStageRule: React.Dispatch<React.SetStateAction<'Strict Block' | 'Warn Only' | 'Manager/Admin Override' | 'No Restriction'>>;
  handleAddNewStage: () => void;
  showConversionModal: boolean;
  setShowConversionModal: React.Dispatch<React.SetStateAction<boolean>>;
  conversionSuccessData: ConversionSuccessData | null;
  setConversionSuccessData: React.Dispatch<React.SetStateAction<ConversionSuccessData | null>>;
  onBack: () => void;
  actingRole: 'ADMIN' | 'MANAGER' | 'SALES_REP';
  duplicateLead?: CrmLeadDto;
  isBlockedByDuplicate: boolean;
  conversionMapping?: ConversionMapping;
  conversionForm: ConversionForm;
  setConversionForm: React.Dispatch<React.SetStateAction<ConversionForm>>;
  isConversionDisabled: boolean;
  handleConfirmConversion: () => void;
  isRequiredComplete: boolean;
}

export function LeadDetailDialogs({
  lead,
  showMoveModal,
  setShowMoveModal,
  currentStage,
  targetStageUid,
  setTargetStageUid,
  stages,
  moveStatus,
  requiredTasksCompleted,
  requiredTasksTotal,
  optionalAndManualTasksCompleted,
  optionalAndManualTasksTotal,
  movementRule,
  overrideReason,
  setOverrideReason,
  canOverrideBlock,
  handleProcessMoveStage,
  showAddManualTaskModal,
  setShowAddManualTaskModal,
  manualTaskTitle,
  setManualTaskTitle,
  manualTaskRequired,
  setManualTaskRequired,
  manualTaskType,
  setManualTaskType,
  manualTaskPriority,
  setManualTaskPriority,
  manualTaskDescription,
  setManualTaskDescription,
  manualTaskLocation,
  setManualTaskLocation,
  manualTaskAssignee,
  setManualTaskAssignee,
  manualTaskDate,
  setManualTaskDate,
  manualTaskCategory,
  setManualTaskCategory,
  manualTaskStatus,
  setManualTaskStatus,
  taskPriorities,
  taskTypes,
  taskCategories,
  taskStatuses,
  taskLookupsLoading,
  taskCreateLoading,
  effectiveTaskLocations,
  taskUsers,
  handleSaveManualTask,
  showAddStageModal,
  setShowAddStageModal,
  currentPipeline,
  newStageName,
  setNewStageName,
  newStageRule,
  setNewStageRule,
  handleAddNewStage,
  showConversionModal,
  setShowConversionModal,
  conversionSuccessData,
  setConversionSuccessData,
  onBack,
  actingRole,
  duplicateLead,
  isBlockedByDuplicate,
  conversionMapping,
  conversionForm,
  setConversionForm,
  isConversionDisabled,
  handleConfirmConversion,
  isRequiredComplete,
}: LeadDetailDialogsProps) {
  return (
    <>
      <Dialog
        open={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        title="Advance Pipeline Lead"
        size="md"
        bodyClassName="space-y-4 text-slate-900"
      >
        <p className="text-sm font-semibold text-slate-400 -mt-2">Compliance & Gate validation</p>

        {/* Stats overview in Modal */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-150 p-4 rounded-2xl text-xs font-semibold text-slate-400">
           <div>
              <span className="block text-slate-400 text-xs">Current Stage</span>
              <span className="text-slate-900 font-semibold text-xs block truncate mt-1">{lead.currentPipelineStageName}</span>
           </div>
           <div>
              <span className="block text-slate-400 text-xs">Stage Movement Gate</span>
              <span className={cn(
                 "text-xs font-semibold px-2 py-0.5 rounded border inline-block mt-1",
                 movementRule === 'Strict Block' ? "bg-red-50 text-red-600 border-red-155" : "bg-amber-50 text-amber-600 border-amber-100"
              )}>
                 {movementRule}
              </span>
           </div>
           <div>
              <span className="block text-slate-400 text-xs">Required Completed</span>
              <span className="text-slate-900 font-mono text-xs block mt-1">{requiredTasksCompleted.length}/{requiredTasksTotal.length}</span>
           </div>
           <div>
              <span className="block text-slate-400 text-xs">Optional Completed</span>
              <span className="text-slate-900 font-mono text-xs block mt-1">{optionalAndManualTasksCompleted.length}/{optionalAndManualTasksTotal.length}</span>
           </div>
        </div>

        {/* Target Selector */}
        <Select 
          label="Select Destination Stage"
          value={targetStageUid}
          onChange={e => setTargetStageUid(e.target.value)}
          options={[
            { value: "", label: "-- CHOOSE PIPELINE DESTINATION --" },
            ...stages.filter(s => s.uid !== lead.currentPipelineStageUid).map(s => ({
              value: s.uid,
              label: s.stageName.toUpperCase()
            }))
          ]}
        />

        {/* Compliance checks */}
        {!isRequiredComplete && targetStageUid && (
           <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
              <p className="font-semibold text-amber-800 text-xs">⚠️ INCOMPLETE STAGE COMPLIANCE CHECKS</p>
              <p className="text-amber-700 font-medium">The following required predefined tasks for "{lead.currentPipelineStageName}" are incomplete:</p>
              <ul className="list-disc pl-4 text-amber-700 font-semibold text-xs">
                 {requiredTasksTotal.filter(t => !t.completed).map(t => (
                   <li key={t.uid}>{t.title}</li>
                 ))}
              </ul>

              {movementRule === 'Strict Block' ? (
                 <p className="text-red-600 font-semibold text-xs bg-red-50 p-2 rounded-xl border border-red-100 mt-2">
                    🚫 MOVEMENT STRICTLY BLOCKED: YOU MUST COMPLETE THE DISCLOSURE REQUIREMENTS BEFORE ADVANCING.
                 </p>
              ) : (
                 <Textarea 
                   label="Override Justification Description *"
                   value={overrideReason}
                   onChange={e => setOverrideReason(e.target.value)}
                   placeholder="State justification for authorization override..."
                   rows={2}
                 />
              )}
           </div>
        )}

        <DialogFooter>
           <Button 
             onClick={() => setShowMoveModal(false)}
             variant="ghost"
             className="text-xs font-semibold"
           >
              Keep Current Position
           </Button>
           <Button 
             disabled={!targetStageUid || (!isRequiredComplete && movementRule === 'Strict Block')}
             onClick={handleProcessMoveStage}
             variant="primary"
             className="text-xs font-semibold active-scale"
           >
              Confirm Transition
           </Button>
        </DialogFooter>
      </Dialog>

      {/* CUSTOM ADD MANUAL TASK MODAL */}
      <Dialog
        open={showAddManualTaskModal}
        onClose={() => setShowAddManualTaskModal(false)}
        title="Create Task"
        size="lg"
        bodyClassName="space-y-4 text-slate-900"
      >
         {/* Row 1: Task Name * & Priority */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Task Name *" 
              value={manualTaskTitle}
              onChange={e => setManualTaskTitle(e.target.value)}
              placeholder="Enter Task Name"
            />
            <Select 
              label="Priority"
              value={manualTaskPriority}
              onChange={e => setManualTaskPriority(e.target.value)}
              options={[
                { value: "", label: taskLookupsLoading ? "Loading priorities..." : "Select Priority" },
                ...taskPriorities.map(priority => ({ value: String(priority.id), label: priority.name }))
              ]}
            />
         </div>

         {/* Row 2: Task Description */}
         <Textarea 
           label="Task Description"
           value={manualTaskDescription}
           onChange={e => setManualTaskDescription(e.target.value)}
           placeholder="Enter Task Description"
           rows={3}
         />

         {/* Row 3: Location & Assignees */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="Location"
              value={manualTaskLocation}
              onChange={e => setManualTaskLocation(e.target.value)}
              options={[
                { value: "", label: taskLookupsLoading ? "Loading locations..." : "Select Location" },
                ...effectiveTaskLocations.map(location => ({ value: String(location.id), label: location.name }))
              ]}
            />
            <Select 
              label="Assignees"
              value={manualTaskAssignee}
              onChange={e => setManualTaskAssignee(e.target.value)}
              options={[
                { value: "", label: "Select Assignee" },
                ...taskUsers.map(user => ({ value: String(user.id), label: user.name }))
              ]}
            />
         </div>

         {/* Row 4: Task Date *, Type & Category */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
              label="Task Date *"
              type="date" 
              value={manualTaskDate}
              onChange={e => setManualTaskDate(e.target.value)}
            />
            <Select
              label="Type"
              value={manualTaskType}
              onChange={e => setManualTaskType(e.target.value)}
              options={[
                { value: "", label: taskLookupsLoading ? "Loading types..." : "Select Type" },
                ...taskTypes.map(type => ({ value: String(type.id), label: type.name }))
              ]}
            />
            <Select 
              label="Category"
              value={manualTaskCategory}
              onChange={e => setManualTaskCategory(e.target.value)}
              options={[
                { value: "", label: taskLookupsLoading ? "Loading categories..." : "Select Category" },
                ...taskCategories.map(category => ({ value: String(category.id), label: category.name }))
              ]}
            />
         </div>

         {/* Row 5: Status & Stage-requirement toggle */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="Status"
              value={manualTaskStatus}
              onChange={e => setManualTaskStatus(e.target.value)}
              options={[
                { value: "", label: taskLookupsLoading ? "Loading statuses..." : "Select Status" },
                ...taskStatuses.map(status => ({ value: String(status.id), label: status.name }))
              ]}
            />
            <div className="pt-6">
              <Checkbox 
                label="Required for Stage Compliance"
                checked={manualTaskRequired}
                onChange={e => setManualTaskRequired(e.target.checked)}
              />
            </div>
         </div>

         <DialogFooter>
            <Button 
              onClick={() => setShowAddManualTaskModal(false)}
              variant="ghost"
              className="text-xs font-semibold font-bold"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveManualTask}
              variant="primary"
              loading={taskCreateLoading}
              disabled={taskLookupsLoading || taskCreateLoading}
              className="text-xs font-semibold"
            >
              Create
            </Button>
         </DialogFooter>
      </Dialog>

      {/* CUSTOM ADD PIPELINE STAGE MODAL */}
      <Dialog
        open={showAddStageModal}
        onClose={() => setShowAddStageModal(false)}
        title="Add Pipeline Stage Limit"
        size="md"
        bodyClassName="space-y-4 text-slate-900"
      >
        <p className="text-sm font-semibold text-slate-400 -mt-2">Append custom threshold step to "{currentPipeline?.name}"</p>

        <Input 
          label="Stage Name *"
          value={newStageName}
          onChange={e => setNewStageName(e.target.value)}
          placeholder="e.g. Document Verification"
        />

        <Select 
          label="Gate Movement Rule"
          value={newStageRule}
          onChange={e => setNewStageRule(e.target.value as any)}
          options={[
            { value: "Strict Block", label: "Strict Block (Tasks completed before advance)" },
            { value: "Warn Only", label: "Warn Only (Allow transition with caution alert)" },
            { value: "Manager/Admin Override", label: "Manager/Admin Override Authorized" },
            { value: "No Restriction", label: "No Restriction (Instant pass)" }
          ]}
        />

        <DialogFooter>
           <Button 
             onClick={() => setShowAddStageModal(false)}
             variant="ghost"
             className="text-xs font-semibold font-bold"
           >
              Cancel
           </Button>
           <Button 
             onClick={handleAddNewStage}
             variant="primary"
             className="text-xs font-semibold active-scale"
           >
              Apply New Stage
           </Button>
        </DialogFooter>
      </Dialog>

      {/* ENTERPRISE OPERATIONAL LEAD CONVERSION OVERLAY MODAL */}
      <Dialog
        open={showConversionModal}
        onClose={() => {
          if (!conversionSuccessData) {
            setShowConversionModal(false);
          }
        }}
        title={conversionSuccessData ? "Lead Converted" : "Convert to Operational Object"}
        size="md"
        bodyClassName="space-y-4 text-slate-900"
      >
        {conversionSuccessData ? (
          <div className="flex flex-col items-center text-center justify-center py-2 space-y-4 text-slate-900">
             <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-md shrink-0">
                <ICONS.USER_CHECK className="w-6 h-6" />
             </div>
             
             <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-600 leading-none">Qualification Target Achieved</p>
                <p className="text-sm font-bold text-slate-400 mt-0.5">Operational Object Provisioned in CRM Ledger.</p>
             </div>

             {/* Operational Receipt */}
             <div className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-4 text-left text-xs font-semibold space-y-3">
                <p className="text-sm font-semibold text-slate-400 text-center leading-none border-b border-slate-200 pb-2">DOCUMENT METRIC DETAILS</p>
                <div className="space-y-1.5 font-bold text-slate-600 text-sm normal-case">
                   <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5">
                     <span className="text-slate-400 font-semibold text-xs">OBJECT TARGET:</span>
                     <strong className="text-slate-800">{conversionSuccessData.targetType}</strong>
                   </div>
                   <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-1.5">
                     <span className="text-slate-400 font-semibold text-xs">INTEGRATIVE SECTOR:</span>
                     <strong className="text-indigo-600">{conversionSuccessData.serviceModule}</strong>
                   </div>
                   <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-2 rounded-lg font-mono text-xs mt-1">
                     <span className="text-indigo-600 font-semibold text-sm">DOC REF NO:</span>
                     <strong className="text-indigo-700 text-sm font-semibold">{conversionSuccessData.reference}</strong>
                   </div>
                   <div className="flex justify-between items-center pt-1.5">
                     <span className="text-slate-400 font-semibold text-xs">INGESTION TIME:</span>
                     <span className="text-slate-700 font-mono text-sm">{format(new Date(conversionSuccessData.ingestionTime), 'dd/MM/yyyy HH:mm:ss')}</span>
                   </div>
                </div>
             </div>

             <div className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-left">
                <p className="text-xs font-semibold text-emerald-800">Operational Dispatch Note</p>
                <p className="text-sm font-semibold text-slate-600 mt-1 leading-relaxed normal-case italic">
                  "{conversionSuccessData.notes}"
                </p>
             </div>

             <div className="w-full pt-2">
                <Button
                  onClick={() => {
                    setConversionSuccessData(null);
                    setShowConversionModal(false);
                    if (onBack) onBack(); // Return to lead list to see updated status
                  }}
                  variant="primary"
                  className="w-full text-xs font-semibold"
                >
                  Complete & Exit Dossier
                </Button>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex items-center justify-between -mt-2">
                <p className="text-xs font-semibold text-indigo-600">Enterprise Conversion Pipeline</p>
                <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 font-mono text-xs font-semibold rounded-lg">{actingRole}</span>
             </div>

             {/* Dynamic Duplicate Warnings */}
             {duplicateLead && (
                isBlockedByDuplicate ? (
                  <div className="p-4 bg-rose-50 border border-rose-150 rounded-2xl text-sm text-rose-700 font-semibold space-y-1 text-left">
                     <p className="font-semibold text-sm text-rose-700">❌ Strict Duplicate Prevention Locked</p>
                     <p className="normal-case text-slate-500 text-sm font-medium leading-normal mt-0.5 font-bold">
                       Another lead of client <strong>"{duplicateLead.consumerFirstName} {duplicateLead.consumerLastName}"</strong> already configured contacts matching details below in this CRM pipeline. Reps are blocked from converting.
                     </p>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-150 rounded-2xl text-sm text-amber-800 font-semibold space-y-1 text-left">
                     <p className="font-semibold text-sm text-amber-900 mb-0.5">⚠️ Duplicate Warnings Override Bypass Available</p>
                     <p className="normal-case text-slate-600 text-sm font-medium leading-normal font-bold">
                       Match discovered for <strong>"{duplicateLead.consumerFirstName} {duplicateLead.consumerLastName}"</strong> contact fields. Your security clearance ({actingRole}) allows forced duplicate bypass conversion.
                     </p>
                  </div>
                )
             )}

             {/* Required fields checklist mapping */}
             <div className="space-y-3 bg-slate-50/50 border border-slate-200 p-4 rounded-2xl text-left">
                <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-1.5 mb-1.5">Consumer Mandates Verification</p>
                
                <div className="space-y-3">
                   <Input 
                     label={`Mobile Phone Number ${conversionMapping?.requiredFields?.includes('consumerPhone') ? '*' : ''}`}
                     value={conversionForm.consumerPhone}
                     onChange={e => setConversionForm({ ...conversionForm, consumerPhone: e.target.value })}
                     placeholder="+91 90000 00000"
                     className={cn(
                       conversionMapping?.requiredFields?.includes('consumerPhone') && !conversionForm.consumerPhone.trim() && "border-rose-300 focus:border-rose-500 bg-rose-50/20"
                     )}
                   />

                   <Input 
                     label={`Electronic Email Address ${conversionMapping?.requiredFields?.includes('consumerEmail') ? '*' : ''}`}
                     type="email"
                     value={conversionForm.consumerEmail}
                     onChange={e => setConversionForm({ ...conversionForm, consumerEmail: e.target.value })}
                     placeholder="client@jaldee.com"
                     className={cn(
                       conversionMapping?.requiredFields?.includes('consumerEmail') && !conversionForm.consumerEmail.trim() && "border-rose-300 focus:border-rose-500 bg-rose-50/20"
                     )}
                   />

                   <Input 
                     label={`Business Company / Enterprise Name ${conversionMapping?.requiredFields?.includes('company') ? '*' : ''}`}
                     value={conversionForm.company}
                     onChange={e => setConversionForm({ ...conversionForm, company: e.target.value })}
                     placeholder="Jaldee Software Corp"
                     className={cn(
                       conversionMapping?.requiredFields?.includes('company') && !conversionForm.company.trim() && "border-rose-300 focus:border-rose-500 bg-rose-50/20"
                     )}
                   />

                   <Input 
                     label={`Date of Birth (DOB) ${conversionMapping?.requiredFields?.includes('consumerDob') ? '*' : ''}`}
                     type="date"
                     value={conversionForm.consumerDob}
                     onChange={e => setConversionForm({ ...conversionForm, consumerDob: e.target.value })}
                     className={cn(
                       conversionMapping?.requiredFields?.includes('consumerDob') && !conversionForm.consumerDob.trim() && "border-rose-300 focus:border-rose-500 bg-rose-50/20 text-rose-900"
                     )}
                   />

                   <Textarea 
                     label={`Physical Living Address ${conversionMapping?.requiredFields?.includes('consumerAddress') ? '*' : ''}`}
                     value={conversionForm.consumerAddress}
                     onChange={e => setConversionForm({ ...conversionForm, consumerAddress: e.target.value })}
                     placeholder="Enter street name, building number and landmark..."
                     rows={2}
                     className={cn(
                       conversionMapping?.requiredFields?.includes('consumerAddress') && !conversionForm.consumerAddress.trim() && "border-rose-300 focus:border-rose-500 bg-rose-50/20"
                     )}
                   />
                </div>
             </div>

             {/* Simulated Dynamic Custom Properties */}
             <div className="space-y-3 bg-indigo-50/20 border border-indigo-100 rounded-2xl p-4 text-left">
                <p className="text-sm font-semibold text-indigo-700 border-b border-indigo-100 pb-1.5 mb-1.5">Dynamic Product Custom Attributes</p>
                <div className="grid grid-cols-2 gap-3 text-left">
                   <Select 
                     label="Segment Priority Rating"
                     options={[
                       { value: "CRITICAL / EXPEDITED", label: "CRITICAL / EXPEDITED" },
                       { value: "STANDARD TIER", label: "STANDARD TIER" },
                       { value: "MONITORING ONLY", label: "MONITORING ONLY" }
                     ]}
                   />
                   <Input 
                     label="Assigned Branch Location"
                     value="Delhi Central Hub"
                     disabled
                   />
                </div>
             </div>

             {/* Ingestion Notes / Remarks */}
             <Textarea 
               label="Operational dispatch Notes / Remarks"
               value={conversionForm.notes}
               onChange={e => setConversionForm({ ...conversionForm, notes: e.target.value })}
               placeholder="e.g., Client wants a morning/afternoon appointment. Needs dental history checklist mapped in active intake profiles."
               rows={2}
             />

             <DialogFooter>
                <Button
                  onClick={() => setShowConversionModal(false)}
                  variant="ghost"
                  className="text-xs font-semibold font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmConversion}
                  disabled={isConversionDisabled}
                  variant="primary"
                  className="text-xs font-semibold active-scale"
                >
                  Confirm Conversion ⚡
                </Button>
             </DialogFooter>
          </div>
        )}
      </Dialog>
    </>
  );
}
