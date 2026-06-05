import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { CrmLeadPipelineDto, CrmLeadPipelineStageDto, StageTaskTemplate, CrmLeadDto } from '../types';
import { cn } from '../lib/utils';
import { ICONS } from '../constants';

import { PageHeader, SectionCard, Button, Input, Select, Textarea, Checkbox, Dialog, DialogFooter, Switch, Popover, PopoverSection } from "@jaldee/design-system";
import { leadPipelineService } from '../services/pipelineService';
import { cameFromDashboard, navigateBackToDashboard } from '../lib/navigationOrigin';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const maybeAxios = err as any;
    const serverMessage =
      maybeAxios.response?.data?.message ||
      maybeAxios.response?.data?.error ||
      (typeof maybeAxios.response?.data === 'string' ? maybeAxios.response.data : null);

    if (serverMessage && typeof serverMessage === 'string') {
      return serverMessage;
    }
    if (maybeAxios.message && typeof maybeAxios.message === 'string') {
      return maybeAxios.message;
    }
  }
  return err instanceof Error ? err.message : fallback;
}

interface PipelinesScreenProps {
  pipelines: CrmLeadPipelineDto[];
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
  leads: CrmLeadDto[];
  initialSelectedId?: string;
  onNavigate: (route: string, selection?: any) => void;
}

type PipelineCardAction = 'set-default' | 'activate' | 'deactivate' | 'delete';

export default function PipelinesScreen({ pipelines, setPipelines, leads, initialSelectedId, onNavigate }: PipelinesScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const showDashboardBack = cameFromDashboard(location);
  const [editingPipeline, setEditingPipeline] = useState<CrmLeadPipelineDto | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [openMenuUid, setOpenMenuUid] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: PipelineCardAction; pipeline: CrmLeadPipelineDto } | null>(null);
  const [mutatingPipelineUid, setMutatingPipelineUid] = useState<string | null>(null);
  const [pipelineActionError, setPipelineActionError] = useState<string | null>(null);
  const [loadingPipelineUid, setLoadingPipelineUid] = useState<string | null>(null);

  const handleSelectPipeline = (p: CrmLeadPipelineDto) => {
    onNavigate(`pipelines/${p.uid}/matrix`);
  };

  const requestPipelineAction = (type: PipelineCardAction, pipeline: CrmLeadPipelineDto) => {
    setOpenMenuUid(null);
    setPipelineActionError(null);
    setPendingAction({ type, pipeline });
  };

  const confirmPipelineAction = async () => {
    if (!pendingAction) return;

    const { type, pipeline } = pendingAction;
    setMutatingPipelineUid(pipeline.uid);
    setPipelineActionError(null);

    try {
      if (type === 'set-default') {
        await leadPipelineService.setDefault(pipeline.uid);
        setPipelines((current) =>
          current.map((item) => ({ ...item, isDefault: item.uid === pipeline.uid }))
        );
      } else if (type === 'activate') {
        await leadPipelineService.activate(pipeline.uid);
        setPipelines((current) =>
          current.map((item) => item.uid === pipeline.uid ? { ...item, isActive: true } : item)
        );
      } else if (type === 'deactivate') {
        await leadPipelineService.deactivate(pipeline.uid);
        setPipelines((current) =>
          current.map((item) => item.uid === pipeline.uid ? { ...item, isActive: false, isDefault: false } : item)
        );
      } else {
        await leadPipelineService.delete(pipeline.uid);
        setPipelines((current) => current.filter((item) => item.uid !== pipeline.uid));
      }
      setPendingAction(null);
    } catch (err) {
      setPipelineActionError(getErrorMessage(
        err,
        type === 'set-default'
          ? 'Failed to set default pipeline.'
          : type === 'activate'
            ? 'Failed to activate pipeline.'
            : type === 'deactivate'
              ? 'Failed to deactivate pipeline.'
              : 'Failed to delete pipeline.',
      ));
    } finally {
      setMutatingPipelineUid(null);
    }
  };

  const visiblePipelines = pipelines;

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar overflow-y-auto pb-24 relative space-y-6">
      {editingPipeline ? (
        <PipelineBuilder 
          pipeline={editingPipeline} 
          onClose={async () => {
            setEditingPipeline(null);
            try {
              const updatedPipelines = await leadPipelineService.search({}, { page: 0, size: 100 });
              if (updatedPipelines && updatedPipelines.length > 0) {
                setPipelines(updatedPipelines);
              }
            } catch (err) {
              console.error("Failed to refetch pipelines after close:", err);
            }
          }} 
          onSave={async (p) => {


            const isNew = !pipelines.find(exp => exp.uid === p.uid);
            setPipelines(isNew ? [...pipelines, p] : pipelines.map(exp => exp.uid === p.uid ? p : exp));
            setEditingPipeline(null);
            try {
              const updatedPipelines = await leadPipelineService.search({}, { page: 0, size: 100 });
              if (updatedPipelines && updatedPipelines.length > 0) {
                setPipelines(updatedPipelines);
              }
            } catch (err) {
              console.error("Failed to refetch pipelines after save:", err);
            }
          }}
        />
      ) : (
        <>
          <PageHeader
            back={showDashboardBack ? { label: 'Back to Dashboard', href: '/jaldee-leads/dashboard' } : undefined}
            onNavigate={() => navigateBackToDashboard(navigate)}
            title="Sales Pipelines"
            subtitle="Workflow Architecture & Stage Execution Templates"
            actions={
              <Button 
                onClick={() => setShowCreateDialog(true)}
                variant="primary"
                icon={<ICONS.ADD className="w-4 h-4" />}
                className="px-6 py-3 text-xs font-semibold active-scale"
              >
                Create Pipeline
              </Button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visiblePipelines.map(p => {
              const pipelineLeadCount = leads.filter(l => l.pipelineUid === p.uid).length;
              const templateCount = p.stages.reduce((sum, s) => sum + (s.taskTemplates?.length || 0), 0);
              const linkedProducts = p.productUids.length;
              const isMutating = mutatingPipelineUid === p.uid;
              const isInactive = p.isActive === false;

              return (
                <div 
                  key={p.uid} 
                  onClick={() => {
                    if (loadingPipelineUid !== p.uid) {
                      handleSelectPipeline(p);
                    }
                  }}
                  className={cn(
                    "bg-white rounded-3xl border border-slate-200 p-6 relative group transition-all cursor-pointer min-h-[240px] flex flex-col justify-between",
                    isInactive
                      ? "opacity-75 grayscale hover:border-slate-300"
                      : "hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-600/5",
                    (loadingPipelineUid === p.uid || isMutating) && "opacity-75 pointer-events-none"
                  )}
                >
                   <div className="flex items-start justify-between">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 transition-all shadow-sm",
                        isInactive ? "bg-slate-100 text-slate-400" : "group-hover:bg-indigo-600 group-hover:text-white"
                      )}>
                         <ICONS.STRICT className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                        {isInactive && (
                          <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">Inactive</span>
                        )}
                        {p.isDefault && (
                          <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">Standard Agent</span>
                        )}
                        <Popover
                          open={openMenuUid === p.uid}
                          onOpenChange={(open) => setOpenMenuUid(open ? p.uid : null)}
                          align="end"
                          portal
                          contentClassName="min-w-[180px] p-2"
                          trigger={
                            <Button
                              id={`jaldee-leads-pipeline-${p.uid}-menu-button`}
                              data-testid={`jaldee-leads-pipeline-${p.uid}-menu-button`}
                              type="button"
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon={<span className="block text-xl leading-none">...</span>}
                              disabled={isMutating}
                              className="h-9 w-9 rounded-xl px-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              aria-label={`Open actions for ${p.name}`}
                              onClick={(event) => event.stopPropagation()}
                            />
                          }
                        >
                          <PopoverSection className="space-y-1">
                            <button
                              type="button"
                              disabled={p.isDefault || isInactive}
                              onClick={() => requestPipelineAction('set-default', p)}
                              className={cn(
                                "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors",
                                p.isDefault || isInactive
                                  ? "cursor-not-allowed text-slate-300"
                                  : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <ICONS.STRICT className="h-4 w-4" />
                                Set as Default
                              </span>
                              {p.isDefault && <span className="text-[10px] uppercase tracking-wide">Current</span>}
                            </button>
                            {isInactive && (
                              <button
                                type="button"
                                onClick={() => requestPipelineAction('activate', p)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-50"
                              >
                                <ICONS.SAVE className="h-4 w-4" />
                                Make active
                              </button>
                            )}
                            {!isInactive && (
                              <button
                                type="button"
                                onClick={() => requestPipelineAction('deactivate', p)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-50"
                              >
                                <ICONS.CLOSE className="h-4 w-4" />
                                Deactivate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => requestPipelineAction('delete', p)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                            >
                              <ICONS.DELETE className="h-4 w-4" />
                              Delete
                            </button>
                          </PopoverSection>
                        </Popover>
                      </div>
                   </div>
    
                   <div>
                      <h3 className="text-base font-semibold text-slate-900 truncate leading-normal mb-2 group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                      <div className="text-xs font-semibold text-slate-400 flex flex-wrap items-center gap-1.5">
                         <span>{p.stages.length} Stages</span>
                         <span className="w-1 h-1 rounded-full bg-slate-300"></span> 
                         <span>{linkedProducts} Linked Products</span>
                         <span className="w-1 h-1 rounded-full bg-slate-300"></span> 
                         <span className="text-slate-600">{pipelineLeadCount} Active Leads</span>
                      </div>
                      <div className="text-xs font-bold text-indigo-500 mt-1.5">
                         {templateCount} Stage Task Templates Mapped
                      </div>
                   </div>
                   
                   <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                      <div className="flex gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/jaldee-leads/pipelines/${p.uid}`);
                          }}
                          disabled={loadingPipelineUid === p.uid}
                          variant="ghost"
                          size="sm"
                          className="text-sm font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          {loadingPipelineUid === p.uid ? 'Loading...' : 'Modify'}
                        </Button>
                      </div>
                      <span className={cn(
                        "text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all",
                        isInactive ? "text-slate-400" : "text-indigo-600"
                      )}>
                        Inspect Matrix
                      </span>
                   </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showCreateDialog && (
        <CreatePipelineDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={(created) => {
            setShowCreateDialog(false);
            setPipelines(prev => [...prev, created]);
            navigate(`/jaldee-leads/pipelines/${created.uid}`);
          }}
        />
      )}

      <PipelineActionDialog
        action={pendingAction}
        error={pipelineActionError}
        loading={!!pendingAction && mutatingPipelineUid === pendingAction.pipeline.uid}
        onClose={() => {
          if (!mutatingPipelineUid) {
            setPendingAction(null);
            setPipelineActionError(null);
          }
        }}
        onConfirm={confirmPipelineAction}
      />
    </div>
  );
}

function PipelineActionDialog({
  action,
  error,
  loading,
  onClose,
  onConfirm,
}: {
  action: { type: PipelineCardAction; pipeline: CrmLeadPipelineDto } | null;
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;

  const isDelete = action.type === 'delete';
  const isActivate = action.type === 'activate';
  const isDeactivate = action.type === 'deactivate';
  const title = isDelete
    ? 'Delete Pipeline'
    : isActivate
      ? 'Activate Pipeline'
      : isDeactivate
        ? 'Deactivate Pipeline'
        : 'Set Default Pipeline';
  const description = isDelete
    ? `Delete "${action.pipeline.name}"? This removes the pipeline from the pipeline list.`
    : isActivate
      ? `Make "${action.pipeline.name}" active again? It will become available for lead workflow usage.`
      : isDeactivate
        ? `Deactivate "${action.pipeline.name}"? Existing leads are retained, but this pipeline will be marked inactive.`
        : `Set "${action.pipeline.name}" as the default pipeline? The current default will be replaced.`;
  const confirmLabel = isDelete
    ? 'Delete Pipeline'
    : isActivate
      ? 'Make Active'
      : isDeactivate
        ? 'Deactivate'
        : 'Set as Default';

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        <p className="m-0 text-sm font-medium leading-6 text-slate-600">
          {description}
        </p>
        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="text-sm font-semibold"
        >
          Cancel
        </Button>
        <Button
          variant={isDelete ? "danger" : "primary"}
          onClick={onConfirm}
          loading={loading}
          className="text-sm font-semibold"
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// PIPELINE BUILDER COMPONENT
export function PipelineBuilder({ pipeline, onClose, onSave }: { pipeline: CrmLeadPipelineDto, onClose: () => void, onSave: (p: CrmLeadPipelineDto) => void }) {
  const [draft, setDraft] = useState<CrmLeadPipelineDto>(pipeline);
  const [configuringTasksStageIdx, setConfiguringTasksStageIdx] = useState<number | null>(null);
  const [editingStageIdx, setEditingStageIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  React.useEffect(() => {
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
    <div className="flex flex-col min-h-full bg-slate-50 relative overflow-y-auto no-scrollbar">
      <PageHeader
        title={`Configure Pipeline: ${draft.name}`}
        subtitle="Design stage transitions, task templates, and movement rules"
        actions={
          <div className="flex flex-col items-end gap-1">
            {saveError && <p className="text-xs font-semibold text-rose-600">{saveError}</p>}
            <div className="flex gap-4">
              <Button onClick={onClose} variant="outline" disabled={isSaving} className="px-6 py-3 text-xs font-semibold active-scale">Cancel</Button>
              <Button onClick={handleSave} variant="primary" loading={isSaving} className="px-8 py-3 text-xs font-semibold active-scale">Save Pipeline</Button>
            </div>
          </div>
        }
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-visible mt-6 pb-24">
        <SectionCard className="w-full lg:w-[340px] p-8 shrink-0 h-fit space-y-6">
          <h3 className="text-sm font-semibold text-slate-400 border-b border-slate-100 pb-4 leading-none animate-fadeIn">Basic Configuration</h3>
          
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

          <div className="space-y-3 pt-6 border-t border-slate-100 animate-fadeIn">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-sm font-semibold text-slate-600 leading-none">Force Sequential</span>
              <Switch
                checked={!!draft.stagesInSequentialOrder}
                onChange={(checked) => setDraft({ ...draft, stagesInSequentialOrder: checked })}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard className="flex-1 p-8 flex flex-col overflow-visible relative">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-5 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 leading-none">Pipeline Ingestion Stages</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">Design structural thresholds, movement rules & compliance task lists.</p>
            </div>
            <Button 
              onClick={() => setShowAddStageDialog(true)} 
              variant="ghost"
              icon={<ICONS.ADD className="w-4 h-4"/>}
              className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-4 py-2.5 rounded-xl hover:bg-indigo-100"
            >
              Add Stage
            </Button>
          </div>
          
          <div className="space-y-4 pr-2 pb-10">
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
                  "border-2 rounded-[28px] p-5 flex flex-col gap-4 bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-white transition-all group relative animate-fadeIn",
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
                        
                        <div className="flex-1 grid grid-cols-12 gap-4 items-end">
                          <div className="col-span-8">
                            <Input 
                              label="Stage Name" 
                              value={stage.stageName} 
                              onChange={e => handleStageChange(i, 'stageName', e.target.value)} 
                            />
                          </div>

                          <div className="col-span-4 flex flex-col justify-end">
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

// ---------------------------------------------------------------------------
// CREATE PIPELINE DIALOG
// ---------------------------------------------------------------------------
function CreatePipelineDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (pipeline: CrmLeadPipelineDto) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sequential, setSequential] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Pipeline name is required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const created = await leadPipelineService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        stagesInSequentialOrder: sequential,
        isDefault,
      });
      const fullPipeline = await leadPipelineService.detail(created.uid);
      onCreate({
        ...fullPipeline,
        name: fullPipeline.name || name.trim(),
        description: fullPipeline.description || description.trim(),
        stagesInSequentialOrder: fullPipeline.stagesInSequentialOrder ?? sequential,
        isDefault: fullPipeline.isDefault ?? isDefault,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create pipeline.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="New Pipeline"
      size="sm"
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <Input
          label="Pipeline Name *"
          value={name}
          onChange={e => { setName(e.target.value); setError(null); }}
          placeholder="e.g. Enterprise Sales"
        />

        <Textarea
          label="Objectives"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe the purpose of this pipeline..."
        />

        <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <span className="text-sm font-semibold text-slate-700 leading-none block">Force Sequential</span>
              <span className="text-xs font-medium text-slate-400 mt-0.5 block">Leads must move through stages in order</span>
            </div>
            <Switch checked={sequential} onChange={setSequential} />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <span className="text-sm font-semibold text-slate-700 leading-none block">Set as Default</span>
              <span className="text-xs font-medium text-slate-400 mt-0.5 block">Use this pipeline for new leads by default</span>
            </div>
            <Switch checked={isDefault} onChange={setIsDefault} />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSaving} className="text-sm font-semibold">Cancel</Button>
        <Button variant="primary" onClick={handleCreate} loading={isSaving} className="text-sm font-semibold">Create & Configure</Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ADD STAGE DIALOG
// ---------------------------------------------------------------------------
function EditStageDialog({
  stage,
  onClose,
  onSave,
}: {
  stage: CrmLeadPipelineStageDto;
  onClose: () => void;
  onSave: (stageData: Partial<CrmLeadPipelineStageDto>) => Promise<void>;
}) {
  const [stageName, setStageName] = useState(stage.stageName || '');
  const [color, setColor] = useState(stage.color || '#6366f1');
  const [probability, setProbability] = useState(stage.probability ?? 50);
  const [slaDays, setSlaDays] = useState(stage.slaDays ?? 3);
  const [isTerminal, setIsTerminal] = useState(Boolean(stage.isTerminal));
  const [terminalType, setTerminalType] = useState<'WON' | 'LOST' | 'JUNK'>((stage.terminalType as any) || 'WON');
  const [movementRule, setMovementRule] = useState(stage.movementRule || 'No Restriction');
  const [conversionSetting, setConversionSetting] = useState(stage.conversionSetting || 'ALLOWED');
  const [isActive, setIsActive] = useState(stage.isActive !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stageName.trim()) {
      setError('Stage name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        stageName: stageName.trim(),
        color,
        probability,
        slaDays,
        isTerminal,
        terminalType: isTerminal ? terminalType : undefined,
        movementRule,
        conversionSetting: conversionSetting as any,
        isActive,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update stage.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="Edit Stage"
      size="md"
    >
      <div data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-edit-dialog`} className="space-y-5">
        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2 flex items-end gap-3">
            <div className="flex-1">
              <Input
                id={`jaldee-leads-pipeline-stage-${stage.uid}-name-input`}
                data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-name-input`}
                label="Stage Name *"
                value={stageName}
                onChange={e => { setStageName(e.target.value); setError(null); }}
                placeholder="e.g. Contacted / Qualified"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-xs font-semibold text-slate-400 mb-1">Color</label>
              <Input
                id={`jaldee-leads-pipeline-stage-${stage.uid}-color-input`}
                data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-color-input`}
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm p-0 cursor-pointer shrink-0"
              />
            </div>
          </div>

          <Input
            id={`jaldee-leads-pipeline-stage-${stage.uid}-probability-input`}
            data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-probability-input`}
            label="Probability (%)"
            type="number"
            value={String(probability)}
            onChange={e => setProbability(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
            placeholder="e.g. 50"
          />

          <Input
            id={`jaldee-leads-pipeline-stage-${stage.uid}-sla-days-input`}
            data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-sla-days-input`}
            label="SLA Days"
            type="number"
            value={String(slaDays)}
            onChange={e => setSlaDays(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="e.g. 3"
          />

          <Select
            id={`jaldee-leads-pipeline-stage-${stage.uid}-movement-rule-select`}
            data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-movement-rule-select`}
            label="Movement Rule"
            value={movementRule}
            onChange={e => setMovementRule(e.target.value)}
            options={[
              { value: 'No Restriction', label: 'No Restriction' },
              { value: 'Strict Block', label: 'Strict Block' },
              { value: 'Warn Only', label: 'Warn Only' },
              { value: 'Manager/Admin Override', label: 'Manager/Admin Override' },
            ]}
          />

          <Select
            id={`jaldee-leads-pipeline-stage-${stage.uid}-conversion-rule-select`}
            data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-conversion-rule-select`}
            label="Convert Rule"
            value={conversionSetting}
            onChange={e => setConversionSetting(e.target.value)}
            options={[
              { value: 'ALLOWED', label: 'Allowed' },
              { value: 'RECOMMENDED', label: 'Recommended' },
              { value: 'BLOCKED', label: 'Blocked' },
            ]}
          />

          <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-sm font-semibold text-slate-700 leading-none block">Active Stage</span>
                <span className="text-xs font-medium text-slate-400 mt-0.5 block">Inactive stages stay hidden from active workflow movement</span>
              </div>
              <Switch checked={isActive} onChange={setIsActive} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-sm font-semibold text-slate-700 leading-none block">Terminal State</span>
                <span className="text-xs font-medium text-slate-400 mt-0.5 block">Mark this stage as a final outcome state</span>
              </div>
              <Switch checked={isTerminal} onChange={setIsTerminal} />
            </div>

            {isTerminal && (
              <Select
                id={`jaldee-leads-pipeline-stage-${stage.uid}-terminal-type-select`}
                data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-terminal-type-select`}
                label="Terminal Type"
                value={terminalType}
                onChange={e => setTerminalType(e.target.value as any)}
                options={[
                  { value: 'WON', label: 'WON' },
                  { value: 'LOST', label: 'LOST' },
                  { value: 'JUNK', label: 'JUNK' },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSaving} className="text-sm font-semibold">Cancel</Button>
        <Button
          id={`jaldee-leads-pipeline-stage-${stage.uid}-save-button`}
          data-testid={`jaldee-leads-pipeline-stage-${stage.uid}-save-button`}
          variant="primary"
          onClick={handleSubmit}
          loading={isSaving}
          className="text-sm font-semibold"
        >
          Save Stage
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function AddStageDialog({
  onClose,
  onAdd,
  stageOrder,
}: {
  onClose: () => void;
  onAdd: (stageData: Partial<CrmLeadPipelineStageDto>) => Promise<void>;
  stageOrder: number;
}) {
  const [stageName, setStageName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [probability, setProbability] = useState(50);
  const [slaDays, setSlaDays] = useState(3);
  const [isTerminal, setIsTerminal] = useState(false);
  const [terminalType, setTerminalType] = useState<'WON' | 'LOST' | 'JUNK'>('WON');
  const [movementRule, setMovementRule] = useState('No Restriction');
  const [conversionSetting, setConversionSetting] = useState('ALLOWED');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stageName.trim()) {
      setError('Stage name is required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onAdd({
        stageName: stageName.trim(),
        stageOrder,
        sequenceOrder: stageOrder,
        color,
        probability,
        slaDays,
        isTerminal,
        terminalType: isTerminal ? terminalType : undefined,
        taskCompletionMode: 'NONE',
        autogenerateTasks: false,
        isActive: true,
        taskList: [],
        movementRule,
        conversionSetting: conversionSetting as any,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add stage.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title="Add New Stage"
      size="md"
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2 flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Stage Name *"
                value={stageName}
                onChange={e => { setStageName(e.target.value); setError(null); }}
                placeholder="e.g. Contacted / Qualified"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-xs font-semibold text-slate-400 mb-1">Color</label>
              <Input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm p-0 cursor-pointer shrink-0"
              />
            </div>
          </div>

          <Input
            label="Probability (%)"
            type="number"
            value={String(probability)}
            onChange={e => setProbability(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
            placeholder="e.g. 50"
          />

          <Input
            label="SLA Days"
            type="number"
            value={String(slaDays)}
            onChange={e => setSlaDays(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="e.g. 3"
          />

          <Select
            label="Movement Rule"
            value={movementRule}
            onChange={e => setMovementRule(e.target.value)}
            options={[
              { value: 'No Restriction', label: 'No Restriction' },
              { value: 'Strict Block', label: 'Strict Block' },
              { value: 'Warn Only', label: 'Warn Only' },
              { value: 'Manager/Admin Override', label: 'Manager/Admin Override' },
            ]}
          />

          <Select
            label="Convert Rule"
            value={conversionSetting}
            onChange={e => setConversionSetting(e.target.value)}
            options={[
              { value: 'ALLOWED', label: 'Allowed' },
              { value: 'RECOMMENDED', label: 'Recommended' },
              { value: 'BLOCKED', label: 'Blocked' },
            ]}
          />

          <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-sm font-semibold text-slate-700 leading-none block">Terminal State</span>
                <span className="text-xs font-medium text-slate-400 mt-0.5 block">Mark this stage as a final outcome state</span>
              </div>
              <Switch checked={isTerminal} onChange={setIsTerminal} />
            </div>

            {isTerminal && (
              <Select
                label="Terminal Type"
                value={terminalType}
                onChange={e => setTerminalType(e.target.value as any)}
                options={[
                  { value: 'WON', label: 'WON' },
                  { value: 'LOST', label: 'LOST' },
                  { value: 'JUNK', label: 'JUNK' },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSaving} className="text-sm font-semibold">Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={isSaving} className="text-sm font-semibold">Add Stage</Button>
      </DialogFooter>
    </Dialog>
  );
}
