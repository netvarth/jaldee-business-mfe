import { useState, useEffect } from 'react';
import { Button, Checkbox, Drawer, Input, PageHeader, SectionCard, Select, Switch, Textarea } from '@jaldee/design-system';
import type { CrmLeadPipelineDto, CrmLeadPipelineStageDto, StageTaskTemplate } from '../types';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { leadPipelineService } from '../services/pipelineService';
import { AddStageDialog, EditStageDialog } from './PipelineDialogs';
import { getErrorMessage } from './pipelineUtils';
import { useTaskTemplates } from '../../tasks/queries/tasks';
import type { TaskTemplateRow } from '../../tasks/types';
import { normalizeArray } from '../../tasks/taskUtils';

const TASK_TEMPLATE_DROPDOWN_FILTERS = { from: 0, count: 100, available: true };

function sortStagesBySequenceOrder(stages: CrmLeadPipelineStageDto[] = []) {
  return [...stages].sort((a, b) => {
    const aOrder = a.sequenceOrder ?? a.stageOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sequenceOrder ?? b.stageOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.uid ?? '').localeCompare(String(b.uid ?? ''));
  });
}

export function PipelineBuilder({ pipeline, onClose, onSave }: { pipeline: CrmLeadPipelineDto, onClose: () => void, onSave: (p: CrmLeadPipelineDto) => void }) {
  const [draft, setDraft] = useState<CrmLeadPipelineDto>({ ...pipeline, stages: sortStagesBySequenceOrder(pipeline.stages) });
  const [configuringTasksStageIdx, setConfiguringTasksStageIdx] = useState<number | null>(null);
  const [editingStageIdx, setEditingStageIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingTasksStageIdx, setSavingTasksStageIdx] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraft({ ...pipeline, stages: sortStagesBySequenceOrder(pipeline.stages) });
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
        stages: sortStagesBySequenceOrder(draft.stages),
      });
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to save pipeline.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStageChange = (index: number, field: keyof CrmLeadPipelineStageDto, value: any) => {
    const newStages = [...draft.stages];
    newStages[index] = {
      ...newStages[index],
      [field]: value,
      ...(field === 'sequenceOrder' ? { stageOrder: value } : {}),
      ...(field === 'stageOrder' ? { sequenceOrder: value } : {}),
    };
    setDraft({ ...draft, stages: newStages });
  };

  const [editingStageUids, setEditingStageUids] = useState<Record<string, boolean>>({});
  const [backupStages, setBackupStages] = useState<Record<string, CrmLeadPipelineStageDto>>({});

  const startEdit = (index: number) => {
    const stage = draft.stages[index];
    if (!stage) return;
    setEditingStageIdx(index);
  };

  const refreshPipelineDraft = async () => {
    const refreshed = await leadPipelineService.detail(draft.uid);
    setDraft(prev => ({
      ...prev,
      ...refreshed,
      name: refreshed.name || prev.name,
      description: refreshed.description ?? prev.description,
      stages: sortStagesBySequenceOrder(refreshed.stages?.length ? refreshed.stages : prev.stages),
    }));
    return refreshed;
  };

  const handleUpdateStage = async (index: number, stageData: Partial<CrmLeadPipelineStageDto>) => {
    const stage = draft.stages[index];
    if (!stage) return;

    const stageForUpdate = { ...stage, ...stageData };
    await leadPipelineService.updateStage(stage.uid, stageForUpdate);
    await refreshPipelineDraft();
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
      await leadPipelineService.updateStage(stage.uid, stage);
      await refreshPipelineDraft();
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
    setDraft(prev => ({ ...prev, stages: sortStagesBySequenceOrder([...prev.stages, newStage]) }));
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

  const handleSaveTasks = async (index: number, templates: StageTaskTemplate[]) => {
    const stage = draft.stages[index];
    if (!stage) return;

    setSavingTasksStageIdx(index);
    setSaveError(null);
    try {
      const updatedStage = await leadPipelineService.updateStage(stage.uid, {
        ...stage,
        taskTemplates: templates,
        taskList: stageTaskTemplatesToTaskList(templates),
        autogenerateTasks: templates.length > 0,
        taskCompletionMode: templates.length > 0 && stage.taskCompletionMode === 'NONE' ? 'ALL' : stage.taskCompletionMode,
      });

      const stageForDraft = {
        ...stage,
        ...updatedStage,
        uid: updatedStage.uid || stage.uid,
        pipelineUid: updatedStage.pipelineUid || stage.pipelineUid,
        pipelineName: updatedStage.pipelineName || stage.pipelineName,
        stageName: updatedStage.stageName || stage.stageName,
        taskTemplates: updatedStage.taskTemplates?.length ? updatedStage.taskTemplates : templates,
        taskList: updatedStage.taskList?.length ? updatedStage.taskList : stageTaskTemplatesToTaskList(templates),
      };
      setDraft((prev) => {
        const newStages = [...prev.stages];
        newStages[index] = stageForDraft;
        return { ...prev, stages: newStages };
      });
      setConfiguringTasksStageIdx(null);
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to save stage tasks.'));
    } finally {
      setSavingTasksStageIdx(null);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-slate-50 p-3 sm:p-4 md:p-5 overflow-y-auto relative space-y-3">
      <PageHeader
        title={`Configure Pipeline: ${draft.name}`}
        subtitle="Design stage transitions, task templates, and movement rules"
        back={{ label: 'Back to Pipeline', href: '#' }}
        onNavigate={onClose}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            {saveError && <p className="text-xs font-semibold text-rose-600">{saveError}</p>}
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
              <Button onClick={onClose} variant="outline" disabled={isSaving} className="h-9 w-full whitespace-nowrap px-4 text-xs font-semibold active-scale sm:w-auto sm:px-5">Cancel</Button>
              <Button onClick={handleSave} variant="primary" loading={isSaving} className="h-9 w-full whitespace-nowrap px-4 text-xs font-semibold active-scale sm:w-auto sm:px-6">Save Pipeline</Button>
            </div>
          </div>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-visible pb-5 lg:grid lg:grid-cols-[minmax(0,35fr)_minmax(0,75fr)]">
        <SectionCard className="w-full space-y-5 border-slate-200 bg-white p-5 shadow-sm">
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
              rows={5} 
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
          <div className="mb-5 flex shrink-0 flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-400 leading-none">Pipeline Ingestion Stages</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">Design structural thresholds, movement rules & compliance task lists.</p>
            </div>
            <Button 
              onClick={() => setShowAddStageDialog(true)} 
              variant="ghost"
              icon={<ICONS.ADD className="w-4 h-4"/>}
              className="w-fit shrink-0 whitespace-nowrap rounded-lg bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
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
                <div key={stageKey(stage, i)} className={cn(
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
                          <div className="md:col-span-6">
                            <Input 
                              label="Stage Name" 
                              value={stage.stageName} 
                              onChange={e => handleStageChange(i, 'stageName', e.target.value)} 
                            />
                          </div>

                          <div className="md:col-span-2">
                            <Input
                              label="Sequence"
                              type="number"
                              min={1}
                              value={String(stage.sequenceOrder ?? stage.stageOrder ?? i + 1)}
                              onChange={e => handleStageChange(i, 'sequenceOrder', Math.max(1, parseInt(e.target.value) || 1))}
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
          saving={savingTasksStageIdx === configuringTasksStageIdx}
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
          pipelineUid={draft.uid}
          pipelineName={draft.name}
        />
      )}
    </div>
  );
}

// DRAWER/MODAL FOR CONFIGURING TASKS
interface StageTaskTemplatesDrawerProps {
  stage: CrmLeadPipelineStageDto;
  onClose: () => void;
  onSave: (templates: StageTaskTemplate[]) => void | Promise<void>;
  saving?: boolean;
}

function StageTaskTemplatesDrawer({ stage, onClose, onSave, saving = false }: StageTaskTemplatesDrawerProps) {
  const [templates, setTemplates] = useState<StageTaskTemplate[]>(stage.taskTemplates || []);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const taskTemplatesQuery = useTaskTemplates(TASK_TEMPLATE_DROPDOWN_FILTERS);
  const taskTemplateRows = normalizeArray<TaskTemplateRow>(taskTemplatesQuery.data);

  const handleAddTask = () => {
    const selectedTemplate = taskTemplateRows.find((item) => taskTemplateId(item) === selectedTemplateId);
    if (!selectedTemplate) {
      alert('Select a task template.');
      return;
    }

    if (templates.some((template) => template.uid === selectedTemplateId)) {
      alert('This task template is already selected for the stage.');
      return;
    }

    setTemplates([...templates, taskTemplateToStageTemplate(selectedTemplate)]);
    setSelectedTemplateId('');
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
    <Drawer
      open={true}
      onClose={onClose}
      title={`Stage Task Templates (${stage.stageName})`}
      size="lg"
      contentClassName="flex flex-col gap-6 p-0"
    >
       <div className="flex-1 space-y-6 overflow-y-auto p-5">
       <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
             <Select
               label="Task Template"
               value={selectedTemplateId}
               onChange={e => setSelectedTemplateId(e.target.value)}
               disabled={taskTemplatesQuery.isLoading}
               options={[
                 {
                   value: '',
                   label: taskTemplatesQuery.isLoading ? 'Loading task templates...' : 'Select task template',
                 },
                 ...taskTemplateRows.map((template) => ({
                   value: taskTemplateId(template),
                   label: taskTemplateLabel(template),
                 })),
               ]}
             />
             <Button
               onClick={handleAddTask}
               variant="primary"
               icon={<ICONS.ADD className="w-3.5 h-3.5" />}
               disabled={!selectedTemplateId}
               className="h-10 text-sm font-semibold"
             >
               Add Task
             </Button>
          </div>
          {taskTemplatesQuery.isError && (
            <p className="mt-3 text-xs font-semibold text-rose-600">Unable to load task templates.</p>
          )}
          {!taskTemplatesQuery.isLoading && taskTemplateRows.length === 0 && (
            <p className="mt-3 text-xs font-medium text-slate-500">No task templates are available.</p>
          )}
       </div>

       <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-400">Selected Stage Tasks ({templates.length})</h4>
          
          <div className="space-y-2">
             {templates.map((tpl, i) => (
               <div 
                 key={stageTaskTemplateKey(tpl, i)} 
                 className={cn(
                   "relative flex items-center justify-between gap-4 rounded-lg border p-4 transition-all",
                   tpl.active ? "border-indigo-100 bg-indigo-50/20" : "border-slate-200 bg-slate-100 opacity-60"
                 )}
               >
                 <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                       <span className={cn(
                         "rounded border px-2 py-0.5 text-xs font-semibold",
                         tpl.required ? "border-indigo-150 bg-indigo-50 text-indigo-700" : "border-slate-150 bg-slate-50 text-slate-500"
                       )}>
                          {tpl.required ? 'REQUIRED' : 'OPTIONAL'}
                       </span>
                       <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold leading-none text-rose-500">{tpl.type}</span>
                       <span className="font-mono text-xs font-bold text-slate-400">Offset: {tpl.dueOffsetHours}h</span>
                    </div>
                    <p className="truncate text-sm font-semibold text-slate-900">{stageTaskTemplateText(tpl.title) || 'Untitled task'}</p>
                    {stageTaskTemplateText(tpl.description) && <p className="mt-1 truncate text-xs font-medium text-slate-500">{stageTaskTemplateText(tpl.description)}</p>}
                 </div>

                 <div className="flex shrink-0 items-center gap-1.5">
                    <Button onClick={() => moveUp(i)} disabled={i === 0} variant="outline" iconOnly icon={<ICONS.PREV className="w-3.5 h-3.5 rotate-90" />} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700" aria-label="Move task up" />
                    <Button onClick={() => moveDown(i)} disabled={i === templates.length - 1} variant="outline" iconOnly icon={<ICONS.PREV className="w-3.5 h-3.5 -rotate-90" />} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700" aria-label="Move task down" />
                    <Button onClick={() => toggleActive(i)} variant="outline" iconOnly className="h-7 w-7 p-0 text-amber-500 hover:text-amber-700" aria-label="Toggle task active">
                       {tpl.active ? <ICONS.CHECK className="w-3.5 h-3.5 text-emerald-500" /> : <ICONS.ADD className="w-3.5 h-3.5 text-slate-400" />}
                    </Button>
                    <Button onClick={() => removeTemplate(i)} variant="outline" iconOnly icon={<ICONS.DELETE className="w-3.5 h-3.5" />} className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700" aria-label="Delete task" />
                 </div>
               </div>
             ))}
             
             {templates.length === 0 && (
               <div className="rounded-lg border-2 border-dashed border-slate-200 py-12 text-center text-xs font-bold leading-loose text-slate-400">
                  No task templates selected for this stage.<br/>All advancement checks will be bypassed.
               </div>
             )}
          </div>
       </div>
       </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white p-5">
        <Button variant="ghost" onClick={onClose} disabled={saving} className="text-xs font-semibold">Cancel</Button>
        <Button variant="primary" onClick={() => onSave(templates)} loading={saving} className="text-sm font-semibold">Apply Thresholds</Button>
      </div>
    </Drawer>
  );
}

function stageKey(stage: CrmLeadPipelineStageDto, index: number) {
  const uid = String(stage.uid || '').trim();
  if (uid) return uid;

  const order = stage.sequenceOrder ?? stage.stageOrder ?? index;
  const name = String(stage.stageName || 'stage').trim() || 'stage';
  return `${name}-${order}-${index}`;
}

function stageTaskTemplateKey(template: StageTaskTemplate, index: number) {
  const uid = String(template.uid || '').trim();
  if (uid) return uid;

  const title = stageTaskTemplateText(template.title) || 'task';
  return `${title}-${index}`;
}

function taskTemplateId(template: TaskTemplateRow) {
  return String(template.id ?? template.uid);
}

function stageTaskTemplatesToTaskList(templates: StageTaskTemplate[]) {
  return templates.map((template, index) => ({
    id: numericTaskTemplateId(template.uid),
    taskOrder: index + 1,
    taskName: stageTaskTemplateText(template.title) || 'Untitled task',
  }));
}

function numericTaskTemplateId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : String(value ?? '');
}

function taskTemplateLabel(template: TaskTemplateRow) {
  return (
    templateFieldText(template, 'templateName') ||
    templateFieldText(template, 'name') ||
    templateFieldText(template, 'title') ||
    templateFieldText(template, 'taskName') ||
    `Task template ${taskTemplateId(template)}`
  );
}

function taskTemplateDescription(template: TaskTemplateRow) {
  return templateFieldText(template, 'description') || stageTaskTemplateText(template.description);
}

function taskTemplateToStageTemplate(template: TaskTemplateRow): StageTaskTemplate {
  return {
    uid: taskTemplateId(template),
    title: taskTemplateFieldValueText(template, 'title') || taskTemplateLabel(template),
    type: normalizeStageTaskType(taskTemplateLookupName(template, 'type')),
    required: Boolean((template as any)?.title?.ismandatory ?? true),
    autoCreate: true,
    dueOffsetHours: templateDueOffsetHours(template),
    assigneeRule: taskTemplateLookupName(template, 'assignee') || 'Owner',
    priority: normalizeStageTaskPriority(taskTemplateLookupName(template, 'priority')),
    outcomeRequired: Boolean((template as any)?.targetResult?.ismandatory ?? false),
    active: true,
    description: taskTemplateDescription(template),
  };
}

function taskTemplateFieldValueText(template: TaskTemplateRow, key: string) {
  const value = (template as any)?.[key]?.value;
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return String(value.name ?? value.label ?? value.title ?? '');
  return String(value);
}

function templateFieldText(template: TaskTemplateRow, key: string) {
  const value = (template as any)?.[key];
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return stageTaskTemplateText(value.value?.name ?? value.value ?? value.name ?? value.label);
  return String(value);
}

function stageTaskTemplateText(value: unknown) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    const objectValue = value as any;
    return stageTaskTemplateText(objectValue.value ?? objectValue.name ?? objectValue.label ?? objectValue.title ?? objectValue.taskName);
  }
  return String(value);
}

function taskTemplateLookupName(template: TaskTemplateRow, key: string) {
  return taskTemplateFieldValueText(template, key) || templateFieldText(template, key);
}

function templateDueOffsetHours(template: TaskTemplateRow) {
  const duration = (template as any)?.estDuration?.value ?? template.estDuration;
  const days = Number(duration?.days) || 0;
  const hours = Number(duration?.hours) || 0;
  const minutes = Number(duration?.minutes) || 0;
  const totalHours = days * 24 + hours + Math.ceil(minutes / 60);

  return totalHours > 0 ? totalHours : 24;
}

function normalizeStageTaskType(value: string): StageTaskTemplate['type'] {
  const normalized = value.trim().toUpperCase();
  if (['CALL', 'EMAIL', 'MEETING', 'DOCUMENT', 'TASK'].includes(normalized)) {
    return normalized as StageTaskTemplate['type'];
  }
  return 'TASK';
}

function normalizeStageTaskPriority(value: string): StageTaskTemplate['priority'] {
  const normalized = value.trim().toUpperCase();
  if (['URGENT', 'HIGH', 'NORMAL', 'LOW'].includes(normalized)) {
    return normalized as StageTaskTemplate['priority'];
  }
  return 'NORMAL';
}
