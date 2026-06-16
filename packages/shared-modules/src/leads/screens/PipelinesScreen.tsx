import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { CrmLeadPipelineDto, CrmLeadDto } from '../types';
import { cn } from '../lib/utils';
import { ICONS } from '../constants';

import { PageHeader, Button, Popover, PopoverSection, EmptyState, SectionCard } from "@jaldee/design-system";
import { leadPipelineService } from '../services/pipelineService';
import { cameFromDashboard, navigateBackToDashboard } from '../lib/navigationOrigin';
import { PipelineBuilder } from './PipelineBuilder';
import { CreatePipelineDialog, PipelineActionDialog, type PipelineCardAction } from './PipelineDialogs';
import { getErrorMessage } from './pipelineUtils';
import { useJaldeeLeadsContext } from '../lib/sharedContext';
import { emitLeadSuccessToast } from '../lib/errorEvents';

interface PipelinesScreenProps {
  pipelines: CrmLeadPipelineDto[];
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
  leads: CrmLeadDto[];
  initialSelectedId?: string;
  onNavigate: (route: string, selection?: any) => void;
}



export default function PipelinesScreen({ pipelines, setPipelines, leads, initialSelectedId, onNavigate }: PipelinesScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventBus } = useJaldeeLeadsContext();
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
      emitLeadSuccessToast(eventBus, getPipelineActionSuccessMessage(type));
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
    <div data-testid="jaldee-leads-pipelines-page" data-state={visiblePipelines.length === 0 ? "empty" : "ready"} className="h-full flex flex-col bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar overflow-y-auto pb-24 relative space-y-6">
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
            back={showDashboardBack ? { label: 'Back to Dashboard', href: '/leads/dashboard' } : undefined}
            onNavigate={() => navigateBackToDashboard(navigate)}
            title="Sales Pipelines"
            subtitle="Workflow Architecture & Stage Execution Templates"
            actions={
              <Button 
                id="jaldee-leads-pipelines-create-button"
                data-testid="jaldee-leads-pipelines-create-button"
                onClick={() => setShowCreateDialog(true)}
                variant="primary"
                icon={<ICONS.ADD className="w-4 h-4" />}
                className="px-6 py-3 text-xs font-semibold active-scale"
              >
                Create Pipeline
              </Button>
            }
          />

          {visiblePipelines.length === 0 ? (
            <SectionCard className="border-slate-200 bg-white p-8 shadow-sm">
              <div data-testid="jaldee-leads-pipelines-empty-state" data-state="empty">
                <EmptyState
                  title="No pipelines found"
                  description="Create a pipeline to define stages, movement rules, and task templates for leads."
                  action={
                    <Button
                      id="jaldee-leads-pipelines-empty-create-button"
                      data-testid="jaldee-leads-pipelines-empty-create-button"
                      variant="primary"
                      icon={<ICONS.ADD className="h-4 w-4" />}
                      onClick={() => setShowCreateDialog(true)}
                    >
                      Create Pipeline
                    </Button>
                  }
                />
              </div>
            </SectionCard>
          ) : (
          <div data-testid="jaldee-leads-pipelines-grid" className="grid grid-cols-[repeat(auto-fit,minmax(17.5rem,22rem))] justify-start gap-6">
            {visiblePipelines.map(p => {
              const pipelineLeadCount = leads.filter(l => l.pipelineUid === p.uid).length;
              const templateCount = p.stages.reduce((sum, s) => sum + (s.taskTemplates?.length || 0), 0);
              const linkedProducts = p.productUids.length;
              const isMutating = mutatingPipelineUid === p.uid;
              const isInactive = p.isActive === false;

              return (
                <div 
                  key={p.uid} 
                  data-testid={`jaldee-leads-pipeline-card-${p.uid}`}
                  onClick={() => {
                    if (loadingPipelineUid !== p.uid) {
                      handleSelectPipeline(p);
                    }
                  }}
                  className={cn(
                    "w-full bg-white rounded-2xl border border-slate-200 p-6 relative group transition-all cursor-pointer min-h-[240px] flex flex-col justify-between",
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
                              data-testid={`jaldee-leads-pipeline-${p.uid}-set-default-menu-item`}
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
                                data-testid={`jaldee-leads-pipeline-${p.uid}-activate-menu-item`}
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
                                data-testid={`jaldee-leads-pipeline-${p.uid}-deactivate-menu-item`}
                                onClick={() => requestPipelineAction('deactivate', p)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-50"
                              >
                                <ICONS.CLOSE className="h-4 w-4" />
                                Deactivate
                              </button>
                            )}
                            <button
                              type="button"
                              data-testid={`jaldee-leads-pipeline-${p.uid}-delete-menu-item`}
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
                      <div className="mt-1.5 text-xs font-semibold text-indigo-600">
                         {templateCount} Stage Task Templates Mapped
                      </div>
                   </div>
                   
                   <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                      <div className="flex gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/leads/pipelines/${p.uid}`);
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
          )}
        </>
      )}

      {showCreateDialog && (
        <CreatePipelineDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={(created) => {
            setShowCreateDialog(false);
            setPipelines(prev => [...prev, created]);
            navigate(`/leads/pipelines/${created.uid}`);
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

function getPipelineActionSuccessMessage(type: PipelineCardAction) {
  if (type === 'set-default') return "Default pipeline updated.";
  if (type === 'activate') return "Pipeline activated successfully.";
  if (type === 'deactivate') return "Pipeline deactivated successfully.";
  return "Pipeline deleted successfully.";
}
