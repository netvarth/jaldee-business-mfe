import { useState } from 'react';
import { Button, Dialog, DialogFooter, Input, Select, Switch, Textarea } from '@jaldee/design-system';
import type { CrmLeadPipelineDto, CrmLeadPipelineStageDto } from '../types';
import { leadPipelineService } from '../services/pipelineService';
import { getErrorMessage } from './pipelineUtils';

export type PipelineCardAction = 'set-default' | 'activate' | 'deactivate' | 'delete';

export function PipelineActionDialog({
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

// ---------------------------------------------------------------------------
// CREATE PIPELINE DIALOG
// ---------------------------------------------------------------------------
export function CreatePipelineDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (pipeline: CrmLeadPipelineDto) => void }) {
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
export function EditStageDialog({
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

export function AddStageDialog({
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
