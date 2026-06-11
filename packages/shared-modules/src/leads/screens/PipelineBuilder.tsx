import { useState, useEffect } from 'react';
import { Button, Checkbox, Dialog, DialogFooter, Input, PageHeader, SectionCard, Select, Switch, Textarea } from '@jaldee/design-system';
import type { CrmLeadPipelineDto, CrmLeadPipelineStageDto, StageTaskTemplate } from '../types';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { leadPipelineService } from '../services/pipelineService';
import { AddStageDialog, EditStageDialog } from './PipelineDialogs';
import { getErrorMessage } from './pipelineUtils';

export function PipelineBuilder({ pipeline, onClose, onSave }: { pipeline: CrmLeadPipelineDto, onClose: () => void, onSave: (p: CrmLeadPipelineDto) => void }) {
  const [draft, setDraft] = useState<CrmLeadPipelineDto>(pipeline);
  const [configuringTasksStageIdx, setConfiguringTasksStageIdx] = useState<number | null>(null);
  const [editingStageIdx, setEditingStageIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(pipeline);
  }, [pipeline.uid, pipeline.stages]);

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setSaveError('Pipeline name is required.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      // Pipeline already exists (created via dialog), just update basic info
      const updated = await leadPipelineService.update(draft.uid, {
        name: draft.name.trim(),
        description: draft.description,
        stagesInSequentialOrder: draft.stagesInSequentialOrder,
        isDefault: draft.isDefault,
      });
      onSave({
        ...draft,
        ...updated,
        name: updated.name && updated.name !== 'Untitled Pipeline' ? updated.name : draft.name.trim(),
        description: updated.description || draft.description,
        stages: draft.stages,
      });
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to save pipeline.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStageChange = (index: number, field: keyof CrmLeadPipelineStageDto, value: any) => {
    const newStages = [...draft.stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setDraft({ ...draft, stages: newStages });
  };

  const [editingStageUids, setEditingStageUids] = useState<Record<string, boolean>>({});
  const [backupStages, setBackupStages] = useState<Record<string, CrmLeadPipelineStageDto>>({});

  const startEdit = (index: number) => {
    const stage = draft.stages[index];
    if (!stage) return;
    setEditingStageIdx(index);
  };

  const handleUpdateStage = async (index: number, stageData: Partial<CrmLeadPipelineStageDto>) => {
    const stage = draft.stages[index];
    if (!stage) return;

    const stageForUpdate = { ...stage, ...stageData };
    const updatedStage = await leadPipelineService.updateStage(stage.uid, stageForUpdate);
    setDraft(prev => {
      const newStages = [...prev.stages];
      newStages[index] = updatedStage;
      return { ...prev, stages: newStages };
    });
    setEditingStageIdx(null);
  };

  const cancelEdit = (index: number) => {
    const stage = draft.stages[index];
    if (!stage) return;
    const backup = backupStages[stage.uid];
    if (backup) {
      setDraft(prev => {
        const newStages = [...prev.stages];
        newStages[index] = backup;
        return { ...prev, stages: newStages };
      });
    }
    setEditingStageUids(prev => ({ ...prev, [stage.uid]: false }));
  };

  const [savingStageIdx, setSavingStageIdx] = useState<number | null>(null);

  const saveStage = async (index: number) => {
    const stage = draft.stages[index];
    if (!stage) return;
    setSavingStageIdx(index);
    setSaveError(null);
    try {
      const updatedStage = await leadPipelineService.updateStage(stage.uid, stage);
      setDraft(prev => {
        const newStages = [...prev.stages];
        newStages[index] = updatedStage;
        return { ...prev, stages: newStages };
      });
      setEditingStageUids(prev => ({ ...prev, [stage.uid]: false }));
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to save stage.'));
    } finally {
      setSavingStageIdx(null);
    }
  };

  const [showAddStageDialog, setShowAddStageDialog] = useState(false);

  const handleAddStage = async (stageData: Partial<CrmLeadPipelineStageDto>) => {
    const newStage = await leadPipelineService.addStage(draft.uid, stageData);
    setDraft(prev => ({ ...prev, stages: [...prev.stages, newStage] }));
    setShowAddStageDialog(false);
  };

  const removeStage = async (index: number) => {
    const stage = draft.stages[index];
    if (!stage) return;
    if (!confirm(`Remove stage "${stage.stageName}"?`)) return;
    try {
      await leadPipelineService.deactivateStage(stage.uid);
    } catch {
      // best-effort
    }
    setDraft(prev => {
      const newStages = [...prev.stages];
      newStages.splice(index, 1);
      return { ...prev, stages: newStages };
    });
  };

  const handleSaveTasks = (index: number, templates: StageTaskTemplate[]) => {
    const newStages = [...draft.stages];
    newStages[index] = { ...newStages[index], taskTemplates: templates };
    setDraft({ ...draft, stages: newStages });
    setConfiguringTasksStageIdx(null);
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50 p-3 sm:p-4 md:p-5 overflow-y-auto relative space-y-3">
      <PageHeader
        title={`Configure Pipeline: ${draft.name}`}
        subtitle="Design stage transitions, task templates, and movement rules"
        back={{ label: 'Back to Pipeline', href: '#' }}
        onNavigate={onClose}
        actions={
          <div className="flex flex-col items-end gap-1">
            {saveError && <p className="text-xs font-semibold text-rose-600">{saveError}</p>}
            <div className="flex gap-3">
              <Button onClick={onClose} variant="outline" disabled={isSaving} className="h-9 px-5 text-xs font-semibold active-scale">Cancel</Button>
              <Button onClick={handleSave} variant="primary" loading={isSaving} className="h-9 px-6 text-xs font-semibold active-scale">Save Pipeline</Button>
            </div>
          </div>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-visible pb-5">
        <SectionCard className="w-full shrink-0 space-y-5 border-slate-200 bg-white p-5 shadow-sm lg:w-[340px]">
          <h3 className="border-b border-slate-100 pb-3 text-sm font-semibold leading-none text-slate-400 animate-fadeIn">Basic Configuration</h3>
          
          <div className="space-y-4 animate-fadeIn">
            <Input 
              label="Pipeline Identity" 
              value={draft.name} 
              onChange={e => setDraft({...draft, name: e.target.value})} 
              placeholder="e.g. Enterprise Sales" 
            />
            <Textarea 
              label="Objectives" 
              value={draft.description} 
              onChange={e => setDraft({...draft, description: e.target.value})} 
              rows={3} 
              placeholder="Describe the purpose of this pipeline..." 
            />
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-5 animate-fadeIn">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
              <span className="text-sm font-semibold text-slate-600 leading-none">Force Sequential</span>
              <Switch
                checked={!!draft.stagesInSequentialOrder}
                onChange={(checked) => setDraft({ ...draft, stagesInSequentialOrder: checked })}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard className="relative flex flex-1 flex-col overflow-visible border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex shrink-0 items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 leading-none">Pipeline Ingestion Stages</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">Design structural thresholds, movement rules & compliance task lists.</p>
            </div>
            <Button 
              onClick={() => setShowAddStageDialog(true)} 
              variant="ghost"
              icon={<ICONS.ADD className="w-4 h-4"/>}
              className="rounded-lg bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
            >
              Add Stage
            </Button>
          </div>
          
          <div className="space-y-3 pb-3">
            {draft.stages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-400 mb-4">
                  <ICONS.STRICT className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No stages yet</p>
                <p className="text-xs font-medium text-slate-400 mt-1">Click <span className="text-indigo-600 font-semibold">+ Add Stage</span> to build your pipeline flow.</p>
              </div>
            )}
            {draft.stages.map((stage, i) => {
              const isEditing = !!editingStageUids[stage.uid];
              return (
                <div key={stage.uid} className={cn(
                  "group relative flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all hover:border-indigo-200 hover:bg-white animate-fadeIn",
                  stage.isTerminal && stage.terminalType === 'WON' && "bg-emerald-50/20 border-emerald-100 hover:border-emerald-200",
                  stage.isTerminal && (stage.terminalType === 'LOST' || stage.terminalType === 'JUNK') && "bg-rose-50/20 border-rose-100 hover:border-rose-200",
                )}>
                  {isEditing ? (
                    <>
                      {/* EDIT MODE */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-1 opacity-40">
                           <ICONS.GRIP_VERTICAL className="w-4 h-4 text-slate-400 cursor-move" />
                           <span className="text-sm font-semibold font-mono text-slate-500">{i + 1}</span>
                        </div>

                        <Input
                          type="color" 
                          value={stage.color} 
                          onChange={(e) => handleStageChange(i, 'color', e.target.value)}
                          className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm p-0 cursor-pointer shrink-0"
                        />
                        
                        <div className="flex-1 grid grid-cols-1 gap-4 items-end md:grid-cols-12">
                          <div className="md:col-span-8">
                            <Input 
                              label="Stage Name" 
                              value={stage.stageName} 
                              onChange={e => handleStageChange(i, 'stageName', e.target.value)} 
                            />
                          </div>

                          <div className="flex flex-col justify-end md:col-span-4">
                             <Checkbox 
                               label="Terminal State" 
                               checked={stage.isTerminal} 
                               onChange={e => handleStageChange(i, 'isTerminal', e.target.checked)} 
                             />
                             {stage.isTerminal && (
                               <Select 
                                 value={stage.terminalType || 'WON'} 
                                 onChange={e => handleStageChange(i, 'terminalType', e.target.value as any)} 
                                 options={[
                                   { value: 'WON', label: 'WON' },
                                   { value: 'LOST', label: 'LOST' },
                                   { value: 'JUNK', label: 'JUNK' },
                                 ]}
                                 className="mt-1"
                               />
                             )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Save Button */}
                          <Button
                            onClick={() => saveStage(i)} 
                            disabled={savingStageIdx === i}
                            variant="ghost"
                            iconOnly
                            className={cn(
                              "p-2 rounded-xl transition-all shrink-0",
                              savingStageIdx === i ? "text-indigo-400 bg-indigo-50" : "text-emerald-600 hover:bg-emerald-50"
                            )}
                            title="Save"
                          >
                             {savingStageIdx === i ? (
                               <svg className="animate-spin w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                               </svg>
                             ) : (
                               <ICONS.SAVE className="w-4 h-4"/>
                             )}
                          </Button>

                          {/* Cancel Button */}
                          <Button
                            onClick={() => cancelEdit(i)} 
                            disabled={savingStageIdx === i}
                            variant="ghost"
                            iconOnly
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                            title="Cancel"
                          >
                             <ICONS.CLOSE className="w-4 h-4"/>
                          </Button>
                        </div>
                      </div>

                      {/* Task template and movement rule configuration sub-bar */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-3 border-t border-slate-100/50">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-400">Movement:</label>
                            <Select 
                              value={stage.movementRule || 'No Restriction'}
                              onChange={e => handleStageChange(i, 'movementRule', e.target.value)}
                              options={[
                                { value: 'No Restriction', label: 'No Restriction' },
                                { value: 'Strict Block', label: 'Strict Block' },
                                { value: 'Warn Only', label: 'Warn Only' },
                                { value: 'Manager/Admin Override', label: 'Manager/Admin Override' },
                              ]}
                              fullWidth={false}
                              className="text-sm"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-400">Convert Rule:</label>
                            <Select 
                              value={stage.conversionSetting || 'ALLOWED'}
                              onChange={e => handleStageChange(i, 'conversionSetting', e.target.value as any)}
                              options={[
                                { value: 'ALLOWED', label: 'Allowed' },
                                { value: 'RECOMMENDED', label: 'Recommended' },
                                { value: 'BLOCKED', label: 'Blocked' },
                              ]}
                              fullWidth={false}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
                            {stage.taskTemplates?.length || 0} Task templates defined
                          </div>
                          <Button 
                            variant="ghost"
                            onClick={() => setConfiguringTasksStageIdx(i)}
                            className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-xs font-semibold"
                          >
                            Configure Tasks
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* VIEW MODE */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Position indicator */}
                          <div className="flex flex-col items-center gap-1 opacity-40">
                             <span className="text-sm font-semibold font-mono text-slate-500">{i + 1}</span>
                          </div>

                          {/* Color dot */}
                          <div 
                            className="w-6 h-6 rounded-full border border-slate-200 shadow-sm shrink-0" 
                            style={{ backgroundColor: stage.color }}
                          />

                          {/* Stage Name */}
                          <h4 className="text-base font-bold text-slate-900 truncate">
                            {stage.stageName}
                          </h4>

                          {/* Terminal badge */}
                          {stage.isTerminal && (
                            <span className={cn(
                              "text-xs font-semibold px-2.5 py-1 rounded-lg border",
                              stage.terminalType === 'WON' ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                              stage.terminalType === 'LOST' ? "text-rose-700 bg-rose-50 border-rose-200" :
                              "text-amber-700 bg-amber-50 border-amber-200"
                            )}>
                              {stage.terminalType || 'WON'} (Terminal)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Edit button */}
                          <Button
                            id={`jaldee-leads-pipeline-stage-${stage.uid}-edit-button`}
                            data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-edit-button`}
                            type="button"
                            onClick={() => startEdit(i)} 
                            variant="ghost"
                            size="sm"
                            icon={<ICONS.EDIT className="w-4 h-4" />}
                            className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Stage"
                          >
                             Edit
                          </Button>

                          {/* Delete button */}
                          <Button
                            id={`jaldee-leads-pipeline-stage-${stage.uid}-remove-button`}
                            data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-remove-button`}
                            type="button"
                            onClick={() => removeStage(i)} 
                            variant="ghost"
                            size="sm"
                            icon={<ICONS.DELETE className="w-4 h-4" />}
                            className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Stage"
                          >
                             Remove
                          </Button>
                        </div>
                      </div>

                      {/* Sub-details for View Mode */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100/50">
                        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-500">
                          <div>
                            <span className="text-slate-400 font-medium">Movement:</span> {stage.movementRule || 'No Restriction'}
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                          <div>
                            <span className="text-slate-400 font-medium">Convert Rule:</span> {stage.conversionSetting || 'ALLOWED'}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                            {stage.taskTemplates?.length || 0} Task templates defined
                          </div>
                          <Button 
                            variant="ghost"
                            onClick={() => setConfiguringTasksStageIdx(i)}
                            className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-xs font-semibold"
                          >
                            Configure Tasks
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* STAGE TASK TEMPLATE CONFIGURATION MODAL */}
      {configuringTasksStageIdx !== null && (
        <StageTaskTemplatesDrawer 
          stage={draft.stages[configuringTasksStageIdx]}
          onClose={() => setConfiguringTasksStageIdx(null)}
          onSave={(templates) => handleSaveTasks(configuringTasksStageIdx, templates)}
        />
      )}

      {/* EDIT STAGE DETAILS MODAL */}
      {editingStageIdx !== null && draft.stages[editingStageIdx] && (
        <EditStageDialog
          stage={draft.stages[editingStageIdx]}
          onClose={() => setEditingStageIdx(null)}
          onSave={(stageData) => handleUpdateStage(editingStageIdx, stageData)}
        />
      )}

      {/* ADD STAGE MODAL */}
      {showAddStageDialog && (
        <AddStageDialog
          onClose={() => setShowAddStageDialog(false)}
          onAdd={handleAddStage}
          stageOrder={draft.stages.length + 1}
        />
      )}
    </div>
  );
}

// DRAWER/MODAL FOR CONFIGURING TASKS
interface StageTaskTemplatesDrawerProps {
  stage: CrmLeadPipelineStageDto;
  onClose: () => void;
  onSave: (templates: StageTaskTemplate[]) => void;
}

function StageTaskTemplatesDrawer({ stage, onClose, onSave }: StageTaskTemplatesDrawerProps) {
  const [templates, setTemplates] = useState<StageTaskTemplate[]>(stage.taskTemplates || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Template Form State
  const [form, setForm] = useState<Partial<StageTaskTemplate>>({
    title: '',
    type: 'TASK',
    required: true,
    autoCreate: true,
    dueOffsetHours: 24,
    assigneeRule: 'Owner',
    priority: 'NORMAL',
    outcomeRequired: true,
    active: true,
    description: ''
  });

  const handleAddTask = () => {
    if (!form.title) {
      alert('A title is mandatory for defining a stage action threshold.');
      return;
    }
    const newTemplate: StageTaskTemplate = {
      uid: 'tpl_' + Math.random().toString(36).substr(2, 5),
      title: form.title,
      type: form.type || 'TASK',
      required: form.required ?? true,
      autoCreate: form.autoCreate ?? true,
      dueOffsetHours: Number(form.dueOffsetHours) || 24,
      assigneeRule: form.assigneeRule || 'Owner',
      priority: form.priority || 'NORMAL',
      outcomeRequired: form.outcomeRequired ?? true,
      active: form.active ?? true,
      description: form.description || ''
    };

    if (editingIndex !== null) {
      const updated = [...templates];
      updated[editingIndex] = { ...newTemplate, uid: templates[editingIndex].uid };
      setTemplates(updated);
      setEditingIndex(null);
    } else {
      setTemplates([...templates, newTemplate]);
    }

    // Reset Form
    setForm({
      title: '',
      type: 'TASK',
      required: true,
      autoCreate: true,
      dueOffsetHours: 24,
      assigneeRule: 'Owner',
      priority: 'NORMAL',
      outcomeRequired: true,
      active: true,
      description: ''
    });
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setForm(templates[index]);
  };

  const removeTemplate = (index: number) => {
    if (confirm('Delete this task template?')) {
      const updated = [...templates];
      updated.splice(index, 1);
      setTemplates(updated);
    }
  };

  const toggleActive = (index: number) => {
    const updated = [...templates];
    updated[index] = { ...updated[index], active: !updated[index].active };
    setTemplates(updated);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...templates];
    const prev = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = prev;
    setTemplates(updated);
  };

  const moveDown = (index: number) => {
    if (index === templates.length - 1) return;
    const updated = [...templates];
    const next = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = next;
    setTemplates(updated);
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={`Stage Task Templates (${stage.stageName})`}
      size="lg"
      contentClassName="max-h-[90vh] overflow-y-auto"
      bodyClassName="space-y-8"
    >
       {/* Add/Edit Subform card */}
       <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 space-y-6">
          <h4 className="text-xs font-semibold text-slate-800">{editingIndex !== null ? 'Modify Action Template' : 'Register New Action Template'}</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input 
               label="Task Title *" 
               value={form.title || ''} 
               onChange={e => setForm({...form, title: e.target.value})} 
               placeholder="e.g. Schedule Introductory Call"
             />

             <Select 
               label="Action Category"
               value={form.type || 'TASK'} 
               onChange={e => setForm({...form, type: e.target.value as any})} 
               options={[
                 { value: 'CALL', label: 'Outgoing Phone Call' },
                 { value: 'EMAIL', label: 'Deliver Email Pack' },
                 { value: 'MEETING', label: 'Schedule Face-to-Face Meeting' },
                 { value: 'DOCUMENT', label: 'Compliance Document Check' },
                 { value: 'TASK', label: 'General Workflow Task' },
               ]}
             />

             <Select 
               label="Compliance Constraint"
               value={form.required ? 'true' : 'false'} 
               onChange={e => setForm({...form, required: e.target.value === 'true'})} 
               options={[
                 { value: 'true', label: 'REQUIRED (Blocks stage progression)' },
                 { value: 'false', label: 'OPTIONAL (Advisory only)' },
               ]}
             />

             <Input 
               label="Due Offset Limit (Hours)" 
               type="number" 
               value={String(form.dueOffsetHours || 24)} 
               onChange={e => setForm({...form, dueOffsetHours: parseInt(e.target.value) || 24})} 
             />

             <Select 
               label="Default Assignee Target"
               value={form.assigneeRule || 'Owner'} 
               onChange={e => setForm({...form, assigneeRule: e.target.value})} 
               options={[
                 { value: 'Owner', label: 'Assigned Lead Custodian (Owner)' },
                 { value: 'System', label: 'Automated System Agent' },
                 { value: 'Creator', label: 'Creating Manager' },
               ]}
             />

             <Select 
               label="Execution Urgency"
               value={form.priority || 'NORMAL'} 
               onChange={e => setForm({...form, priority: e.target.value as any})} 
               options={[
                 { value: 'LOW', label: 'Low Priority Focus' },
                 { value: 'NORMAL', label: 'Standard Priority Focus' },
                 { value: 'HIGH', label: 'High Priority Focus' },
                 { value: 'URGENT', label: 'Urgent Action Required' },
               ]}
             />

             <div className="space-y-2 md:col-span-2 flex items-center gap-6 pt-2">
                <Checkbox 
                  label="Auto-Create on Stage Entry" 
                  checked={form.autoCreate ?? true} 
                  onChange={e => setForm({...form, autoCreate: e.target.checked})} 
                />
                <Checkbox 
                  label="Specific Outcome Required" 
                  checked={form.outcomeRequired ?? true} 
                  onChange={e => setForm({...form, outcomeRequired: e.target.checked})} 
                />
             </div>

             <div className="md:col-span-2">
                <Textarea 
                  label="Advisory Guidance Remarks" 
                  value={form.description || ''} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  placeholder="Add compliance notes or procedural tips for lead owners..."
                  rows={2}
                />
             </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
             {editingIndex !== null && (
               <Button 
                 variant="outline" 
                 onClick={() => {
                    setEditingIndex(null);
                    setForm({ title: '', type: 'TASK', required: true, autoCreate: true, dueOffsetHours: 24, assigneeRule: 'Owner', priority: 'NORMAL', outcomeRequired: true, active: true, description: '' });
                 }}
                 className="text-sm font-semibold"
               >
                 Reset
               </Button>
             )}
             <Button 
               onClick={handleAddTask}
               variant="primary"
               icon={<ICONS.ADD className="w-3.5 h-3.5" />}
               className="text-sm font-semibold"
             >
               {editingIndex !== null ? 'Update Template' : 'Add to threshold'}
             </Button>
          </div>
       </div>

       {/* Active Templates List */}
       <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-400">Threshold Compliance Stage Tasks ({templates.length})</h4>
          
          <div className="space-y-2">
             {templates.map((tpl, i) => (
               <div 
                 key={tpl.uid} 
                 className={cn(
                   "border-2 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all relative group",
                   tpl.active ? (tpl.required ? "bg-indigo-50/20 border-indigo-100" : "bg-white border-slate-200") : "bg-slate-100 border-slate-150 opacity-50"
                 )}
               >
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                       <span className={cn(
                         "px-2 py-0.5 rounded text-xs font-semibold border",
                         tpl.required ? "bg-indigo-50 text-indigo-700 border-indigo-150" : "bg-slate-50 text-slate-500 border-slate-150"
                       )}>
                          {tpl.required ? 'REQUIRED' : 'OPTIONAL'}
                       </span>
                       <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded leading-none">{tpl.type}</span>
                       <span className="text-xs font-bold text-slate-400 font-mono">Offset: {tpl.dueOffsetHours}h</span>
                    </div>
                    <p className="font-semibold text-slate-900 text-xs">{tpl.title}</p>
                    {tpl.description && <p className="text-sm text-slate-400 font-bold truncate mt-1">{tpl.description}</p>}
                 </div>

                 <div className="flex items-center gap-1.5 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button onClick={() => moveUp(i)} disabled={i === 0} variant="outline" iconOnly icon={<ICONS.PREV className="w-3.5 h-3.5 rotate-90" />} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700" aria-label="Move task up" />
                    <Button onClick={() => moveDown(i)} disabled={i === templates.length - 1} variant="outline" iconOnly icon={<ICONS.PREV className="w-3.5 h-3.5 -rotate-90" />} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700" aria-label="Move task down" />
                    <Button onClick={() => startEdit(i)} variant="outline" iconOnly icon={<ICONS.EDIT className="w-3.5 h-3.5" />} className="h-7 w-7 p-0 text-indigo-500 hover:text-indigo-700" aria-label="Edit task" />
                    <Button onClick={() => toggleActive(i)} variant="outline" iconOnly className="h-7 w-7 p-0 text-amber-500 hover:text-amber-700" aria-label="Toggle task active">
                       {tpl.active ? <ICONS.CHECK className="w-3.5 h-3.5 text-emerald-500" /> : <ICONS.ADD className="w-3.5 h-3.5 text-slate-400" />}
                    </Button>
                    <Button onClick={() => removeTemplate(i)} variant="outline" iconOnly icon={<ICONS.DELETE className="w-3.5 h-3.5" />} className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700" aria-label="Delete task" />
                 </div>
               </div>
             ))}
             
             {templates.length === 0 && (
               <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-bold leading-loose">
                  No Task Templates registered for this stage threshold.<br/>All advancement checks will be bypassed.
               </div>
             )}
          </div>
       </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} className="text-xs font-semibold">Cancel</Button>
        <Button variant="primary" onClick={() => onSave(templates)} className="text-sm font-semibold">Apply Thresholds</Button>
      </DialogFooter>
    </Dialog>
  );
}
