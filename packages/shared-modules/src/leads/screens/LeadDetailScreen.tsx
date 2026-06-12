import React, { useState } from 'react';
import { CrmLeadDto, CrmLeadPipelineDto, LeadStageTask, StageHistory, GeneralNote, Priority, Product } from '../types';
import { leadService, type TaskLookupOption } from '../services/leadService';
import { useJaldeeLeadsContext } from '../lib/sharedContext';
import { LeadDetailBody } from './LeadDetailBody';
import { LeadDetailDialogs } from './LeadDetailDialogs';

interface LeadDetailScreenProps {
  lead: CrmLeadDto;
  pipelines: CrmLeadPipelineDto[];
  setPipelines: React.Dispatch<React.SetStateAction<CrmLeadPipelineDto[]>>;
  products: Product[];
  leads: CrmLeadDto[];
  onBack: () => void;
  onUpdate: (lead: CrmLeadDto) => void;
}

function normalizePriorityLabel(value?: string): Priority {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('URGENT') || normalized.includes('CRITICAL')) return 'URGENT';
  if (normalized.includes('HIGH')) return 'HIGH';
  if (normalized.includes('LOW')) return 'LOW';
  return 'NORMAL';
}

function normalizeTaskTypeLabel(value?: string): LeadStageTask['type'] {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('CALL')) return 'CALL';
  if (normalized.includes('EMAIL')) return 'EMAIL';
  if (normalized.includes('MEETING')) return 'MEETING';
  if (normalized.includes('DOCUMENT')) return 'DOCUMENT';
  return 'TASK';
}

function normalizedStageName(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function isLeadCurrentStage(stage: CrmLeadPipelineDto['stages'][number], lead: CrmLeadDto) {
  return stage.uid === lead.currentPipelineStageUid ||
    (Boolean(lead.currentPipelineStageName) && normalizedStageName(stage.stageName) === normalizedStageName(lead.currentPipelineStageName));
}

export default function LeadDetailScreen({ lead, pipelines, setPipelines, products, leads, onBack, onUpdate }: LeadDetailScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<CrmLeadDto>(lead);
  
  const [actingRole, setActingRole] = useState<'ADMIN' | 'MANAGER' | 'SALES_REP'>('ADMIN');

  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionSuccessData, setConversionSuccessData] = useState<{
    success: boolean;
    reference: string;
    targetType: string;
    serviceModule: string;
    ingestionTime: string;
    notes: string;
  } | null>(null);

  const [conversionForm, setConversionForm] = useState({
    consumerPhone: lead.consumerPhone || '',
    consumerEmail: lead.consumerEmail || '',
    company: lead.company || '',
    consumerDob: lead.consumerDob || '',
    consumerAddress: lead.consumerAddress || '',
    notes: '',
    overrideReason: ''
  });

  React.useEffect(() => {
    setConversionForm(prev => ({
      ...prev,
      consumerPhone: lead.consumerPhone || '',
      consumerEmail: lead.consumerEmail || '',
      company: lead.company || '',
      consumerDob: lead.consumerDob || '',
      consumerAddress: lead.consumerAddress || '',
    }));
  }, [lead]);
  
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetStageUid, setTargetStageUid] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  
  const [showAddManualTaskModal, setShowAddManualTaskModal] = useState(false);
  const [manualTaskTitle, setManualTaskTitle] = useState('');
  const [manualTaskRequired, setManualTaskRequired] = useState(false);
  const [manualTaskType, setManualTaskType] = useState('');
  const [manualTaskPriority, setManualTaskPriority] = useState('');
  const [manualTaskDescription, setManualTaskDescription] = useState('');
  const { availableLocations, user: shellUser } = useJaldeeLeadsContext();
  const [manualTaskLocation, setManualTaskLocation] = useState('');
  const [manualTaskAssignee, setManualTaskAssignee] = useState('');
  const [manualTaskDate, setManualTaskDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualTaskCategory, setManualTaskCategory] = useState('');
  const [manualTaskStatus, setManualTaskStatus] = useState('');
  const [taskPriorities, setTaskPriorities] = useState<TaskLookupOption[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskLookupOption[]>([]);
  const [taskCategories, setTaskCategories] = useState<TaskLookupOption[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskLookupOption[]>([]);
  const [taskLookupsLoading, setTaskLookupsLoading] = useState(false);
  const [taskCreateLoading, setTaskCreateLoading] = useState(false);

  // Add Pipeline Stage Modal state
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageSla, setNewStageSla] = useState(3);
  const [newStageProbability, setNewStageProbability] = useState(50);
  const [newStageRule, setNewStageRule] = useState<'Strict Block' | 'Warn Only' | 'Manager/Admin Override' | 'No Restriction'>('Strict Block');

  const currentPipeline = pipelines.find(p => p.uid === lead.pipelineUid);
  const stages = currentPipeline?.stages || [];
  const currentStage = stages.find(s => isLeadCurrentStage(s, lead)) || stages[0];
  const orderedStages = [...stages].sort((a, b) => {
    const aOrder = a.sequenceOrder || a.stageOrder || 0;
    const bOrder = b.sequenceOrder || b.stageOrder || 0;
    return aOrder - bOrder;
  });
  const activeStageIndex = orderedStages.findIndex(s => isLeadCurrentStage(s, lead));
  const completedStageCount = activeStageIndex >= 0 ? activeStageIndex + 1 : 0;
  const totalStageCount = orderedStages.length;

  const activeProduct = products.find(p => p.uid === lead.productUid);
  const conversionMapping = activeProduct?.conversionMapping;

  // Track field compliance
  const missingFields: string[] = [];
  const missingIds: string[] = [];
  if (conversionMapping) {
    if (conversionMapping.requiredFields?.includes('consumerPhone') && !lead.consumerPhone?.trim()) {
      missingFields.push('Phone Number');
      missingIds.push('consumerPhone');
    }
    if (conversionMapping.requiredFields?.includes('consumerEmail') && !lead.consumerEmail?.trim()) {
      missingFields.push('Email Address');
      missingIds.push('consumerEmail');
    }
    if (conversionMapping.requiredFields?.includes('company') && !lead.company?.trim()) {
      missingFields.push('Business Company Name');
      missingIds.push('company');
    }
    if (conversionMapping.requiredFields?.includes('consumerDob') && !lead.consumerDob?.trim()) {
      missingFields.push('Birth Date (DOB)');
      missingIds.push('consumerDob');
    }
    if (conversionMapping.requiredFields?.includes('consumerAddress') && !lead.consumerAddress?.trim()) {
      missingFields.push('Physical Address');
      missingIds.push('consumerAddress');
    }
  }

  // Stage block calculation based on our new pipeline configuration
  const isStageBlocked = currentStage?.conversionSetting === 'BLOCKED';
  const canOverrideBlock = actingRole === 'ADMIN' || actingRole === 'MANAGER';
  const isConversionRestricted = isStageBlocked && !canOverrideBlock;
  const effectiveTaskLocations = availableLocations.map((location: any) => ({
    id: location.locationId ?? location.id ?? location.name,
    name: location.name ?? location.place ?? String(location.id ?? location.uid ?? ''),
  })).filter((location) => location.id && location.name);
  const taskUsers = React.useMemo(() => {
    const rows = [
      shellUser ? { id: shellUser.id, name: shellUser.name || shellUser.email || String(shellUser.id) } : null,
      lead.ownerId ? { id: lead.ownerId, name: lead.ownerName || lead.ownerId } : null,
      ...(lead.assignees || []).map((assignee) => ({
        id: assignee.userId,
        name: assignee.userName || assignee.userId,
      })),
    ].filter((item): item is { id: string; name: string } => Boolean(item?.id && item?.name));

    return Array.from(new Map(rows.map((item) => [String(item.id), item])).values());
  }, [lead.assignees, lead.ownerId, lead.ownerName, shellUser]);

  // Check if role allows assigned conversions only (Sales Rep can only convert assigned leads)
  const productDisplayName = activeProduct
    ? Array.from(new Set([activeProduct.name, activeProduct.displayName].filter(Boolean))).join(' - ')
    : (lead.productName || 'Not assigned');
  const isOwnerRestricted = actingRole === 'SALES_REP' && lead.ownerName && lead.ownerName !== 'Unassigned custodian' && lead.ownerName !== 'Global Coordinator' && lead.ownerName !== 'Representative Node';

  // Ingest qualification and duplicate validations
  const duplicateLead = leads?.find(l => l.uid !== lead.uid && (
    (l.consumerEmail && conversionForm.consumerEmail && l.consumerEmail.trim().toLowerCase() === conversionForm.consumerEmail.trim().toLowerCase()) ||
    (l.consumerPhone && conversionForm.consumerPhone && l.consumerPhone.trim() === conversionForm.consumerPhone.trim())
  ));
  const hasPhoneReq = !!(conversionMapping?.requiredFields?.includes('consumerPhone') && !conversionForm.consumerPhone.trim());
  const hasEmailReq = !!(conversionMapping?.requiredFields?.includes('consumerEmail') && !conversionForm.consumerEmail.trim());
  const hasCompanyReq = !!(conversionMapping?.requiredFields?.includes('company') && !conversionForm.company.trim());
  const hasDobReq = !!(conversionMapping?.requiredFields?.includes('consumerDob') && !conversionForm.consumerDob.trim());
  const hasAddressReq = !!(conversionMapping?.requiredFields?.includes('consumerAddress') && !conversionForm.consumerAddress.trim());
  const isBlockedByDuplicate = !!(duplicateLead && conversionMapping?.duplicateRule === 'Block' && actingRole === 'SALES_REP');
  const isFormIncomplete = hasPhoneReq || hasEmailReq || hasCompanyReq || hasDobReq || hasAddressReq;
  const isConversionDisabled = isBlockedByDuplicate || isFormIncomplete;

  React.useEffect(() => {
    if (!showAddManualTaskModal) return;

    let ignore = false;

    async function loadTaskLookups() {
      setTaskLookupsLoading(true);
      try {
        const [priorities, types, categories, statuses] = await Promise.all([
          leadService.getTaskPriorities(),
          leadService.getTaskTypes(),
          leadService.getTaskCategories(),
          leadService.getTaskStatuses(),
        ]);

        if (ignore) return;

        setTaskPriorities(priorities);
        setTaskTypes(types);
        setTaskCategories(categories);
        setTaskStatuses(statuses);
        setManualTaskPriority((value) => value || String(priorities[0]?.id ?? ''));
        setManualTaskType((value) => value || String(types[0]?.id ?? ''));
        setManualTaskCategory((value) => value || String(categories[0]?.id ?? ''));
        setManualTaskStatus((value) => value || String(statuses[0]?.id ?? ''));
        setManualTaskAssignee((value) => value || String(taskUsers[0]?.id ?? ''));
        setManualTaskLocation((value) => value || String(effectiveTaskLocations[0]?.id ?? ''));
      } catch (err) {
        console.error("Failed to load task form lookups:", err);
      } finally {
        if (!ignore) setTaskLookupsLoading(false);
      }
    }

    loadTaskLookups();

    return () => {
      ignore = true;
    };
  }, [showAddManualTaskModal]);

  const tasks = lead.stageTasks || [];

  // Compute tasks metrics
  const predefinedTasks = tasks.filter(t => !t.isManual);
  const manualTasks = tasks.filter(t => t.isManual);

  const requiredTasksTotal = predefinedTasks.filter(t => t.required);
  const requiredTasksCompleted = requiredTasksTotal.filter(t => t.completed);
  const optionalTasksTotal = predefinedTasks.filter(t => !t.required);
  const optionalTasksCompleted = optionalTasksTotal.filter(t => t.completed);
  const optionalAndManualTasksTotal = [...optionalTasksTotal, ...manualTasks];
  const optionalAndManualTasksCompleted = optionalAndManualTasksTotal.filter(t => t.completed);

  const isRequiredComplete = requiredTasksTotal.length === requiredTasksCompleted.length;

  // Derive Move status and Rule
  const movementRule = currentStage?.movementRule || 'No Restriction';
  let moveStatus: 'ALLOWED' | 'WARN' | 'BLOCKED' = 'ALLOWED';
  if (!isRequiredComplete) {
    if (movementRule === 'Strict Block') {
      moveStatus = 'BLOCKED';
    } else if (movementRule === 'Warn Only' || movementRule === 'Manager/Admin Override') {
      moveStatus = 'WARN';
    }
  }

  // Handle task checkbox toggles
  const handleToggleTask = async (taskUid: string) => {
    const updatedTasks = tasks.map(t => t.uid === taskUid ? { ...t, completed: !t.completed } : t);
    
    // Add audit log for completed task
    const toggled = tasks.find(t => t.uid === taskUid);
    const newNotes = [...(lead.generalNotes || [])];
    if (toggled) {
      newNotes.push({
        id: Math.random().toString(),
        notes: `Task "${toggled.title}" marked as ${!toggled.completed ? 'COMPLETED' : 'PENDING'}.`,
        createdDate: new Date().toISOString()
      });
    }

    const updatedLead = {
      ...lead,
      stageTasks: updatedTasks,
      generalNotes: newNotes,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await leadService.update(lead.uid, updatedLead);
      onUpdate({
        ...updatedLead,
        ...response
      });
    } catch (err) {
      console.error("Failed to update task toggle on backend:", err);
      onUpdate(updatedLead);
    }
  };

  // Open Add Manual Task Modal instead of prompt
  const handleAddManualTask = () => {
    setShowAddManualTaskModal(true);
  };

  // Save manual task from custom modal input
  const handleSaveManualTask = async () => {
    if (!manualTaskTitle.trim()) {
      alert('Task title is required.');
      return;
    }
    if (!manualTaskDate) {
      alert('Task date is required.');
      return;
    }
    const taskDefaultLookupId = "1";
    const taskPriorityId = manualTaskPriority || taskDefaultLookupId;
    const taskTypeId = manualTaskType || taskDefaultLookupId;
    const taskCategoryId = manualTaskCategory || taskDefaultLookupId;
    const taskStatusId = manualTaskStatus || taskDefaultLookupId;
    const taskLocationId = manualTaskLocation || taskDefaultLookupId;
    const taskLocationPayloadId = Number.isNaN(Number(taskLocationId)) ? taskLocationId : Number(taskLocationId);

    const selectedPriority = taskPriorities.find((item) => String(item.id) === String(taskPriorityId));
    const selectedType = taskTypes.find((item) => String(item.id) === String(taskTypeId));
    const selectedCategory = taskCategories.find((item) => String(item.id) === String(taskCategoryId));
    const selectedStatus = taskStatuses.find((item) => String(item.id) === String(taskStatusId));
    const selectedLocation = effectiveTaskLocations.find((item) => String(item.id) === String(taskLocationId));
    const selectedAssignee = taskUsers.find((item) => String(item.id) === String(manualTaskAssignee));

    setTaskCreateLoading(true);

    try {
      await leadService.createTenantTask({
        title: manualTaskTitle.trim(),
        description: manualTaskDescription.trim(),
        dueDate: manualTaskDate,
        priorityId: taskPriorityId,
        typeId: taskTypeId,
        categoryId: taskCategoryId,
        statusId: taskStatusId,
        locationId: taskLocationPayloadId,
        assigneeUid: manualTaskAssignee || undefined,
        originFrom: "LEAD",
        originUid: lead.uid,
        crmLeadStageUid: lead.currentPipelineStageUid,
      });
    } catch (err) {
      console.error("Failed to create task from lead details:", err);
      alert('Unable to create task. Please try again.');
      setTaskCreateLoading(false);
      return;
    }

    const newTask: LeadStageTask = {
      uid: 'man_' + Math.random().toString(),
      title: manualTaskTitle.trim(),
      type: normalizeTaskTypeLabel(selectedType?.name),
      required: manualTaskRequired,
      completed: /complete/i.test(selectedStatus?.name || ''),
      isManual: true,
      createdAt: new Date().toISOString(),
      priority: normalizePriorityLabel(selectedPriority?.name),
      description: manualTaskDescription,
      location: selectedLocation?.name,
      assigneeId: manualTaskAssignee || undefined,
      assigneeName: selectedAssignee?.name,
      dueDate: manualTaskDate || undefined,
      category: selectedCategory?.name,
      status: selectedStatus?.name
    };

    const newNotes = [...(lead.generalNotes || [])];
    newNotes.push({
      id: Math.random().toString(),
      notes: `Manual task "${manualTaskTitle.trim()}" created. Priority: ${selectedPriority?.name || '-'}, Location: ${selectedLocation?.name || '-'}, Date: ${manualTaskDate}, Status: ${selectedStatus?.name || '-'}`,
      createdDate: new Date().toISOString()
    });

    const updatedLead = {
      ...lead,
      stageTasks: [...tasks, newTask],
      generalNotes: newNotes,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onUpdate(updatedLead);

    // Reset states
    setManualTaskTitle('');
    setManualTaskRequired(false);
    setManualTaskType('');
    setManualTaskPriority('');
    setManualTaskDescription('');
    setManualTaskLocation('');
    setManualTaskAssignee('');
    setManualTaskDate(new Date().toISOString().slice(0, 10));
    setManualTaskCategory('');
    setManualTaskStatus('');
    setTaskCreateLoading(false);
    setShowAddManualTaskModal(false);
  };

  // Click handler for Timeline Stages Nodes
  const handleTimelineStageClick = (stageUid: string) => {
    const stage = stages.find(s => s.uid === stageUid);
    if (stage && isLeadCurrentStage(stage, lead)) return;
    setTargetStageUid(stageUid);
    setShowMoveModal(true);
  };

  // Core Lead Conversion Operational Handler
  const handleConfirmConversion = async () => {
    const targetType = conversionMapping?.targetType || 'Appointment';
    const targetModule = conversionMapping?.targetModule || 'General Intake';
    const postStatus = conversionMapping?.postConversionStatus || 'COMPLETED';

    // Verify duplicate rules
    const duplicate = leads?.find(l => l.uid !== lead.uid && (
      (l.consumerEmail && l.consumerEmail.trim().toLowerCase() === conversionForm.consumerEmail.trim().toLowerCase()) ||
      (l.consumerPhone && l.consumerPhone.trim() === conversionForm.consumerPhone.trim())
    ));

    if (duplicate && conversionMapping?.duplicateRule === 'Block' && actingRole === 'SALES_REP') {
      alert(`Strict Duplicate Prevention: Customer record "${duplicate.consumerFirstName} ${duplicate.consumerLastName}" already exists with matching parameters.`);
      return;
    }

    // Generate unique downstream doc key
    const prefix = 
      targetType.toUpperCase().includes('APPOINTMENT') ? 'APP' :
      targetType.toUpperCase().includes('ORDER') ? 'ORD' :
      targetType.toUpperCase().includes('MEMBERSHIP') ? 'MEM' :
      targetType.toUpperCase().includes('ADMISSION') ? 'ADM' :
      targetType.toUpperCase().includes('ENQUIRY') ? 'ENQ' :
      targetType.toUpperCase().includes('PATIENT') ? 'PAT' : 'OPR';
    
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const referenceCode = `${prefix}-${randomNum}-2026`;

    // Package updated values
    const updatedLead: CrmLeadDto = {
      ...lead,
      consumerPhone: conversionForm.consumerPhone,
      consumerEmail: conversionForm.consumerEmail,
      company: conversionForm.company,
      consumerDob: conversionForm.consumerDob,
      consumerAddress: conversionForm.consumerAddress,
      isConverted: true,
      convertedTargetType: targetType,
      convertedObjectRef: referenceCode,
      convertedOn: new Date().toISOString(),
      convertedBy: `User (${actingRole})`,
      convertedNotes: conversionForm.notes || 'No manual remarks appended.',
      status: postStatus as any
    };

    // System Log
    const auditRecord: GeneralNote = {
      id: 'audit_conversion_' + Date.now(),
      notes: `⚡ [Conversion Operations] Mapped Client Profile as live downstream "${targetType}" under target module "${targetModule}". Allocated Identifier: ${referenceCode}. Pipeline post-conversion status resolved: ${postStatus}.`,
      createdDate: new Date().toISOString()
    };

    updatedLead.generalNotes = [auditRecord, ...(lead.generalNotes || [])];

    try {
      const response = await leadService.update(lead.uid, updatedLead);
      try {
        await leadService.updateStatus(lead.uid, postStatus);
      } catch (statusErr) {
        console.error("Failed to update status on backend, continuing anyway:", statusErr);
      }
      onUpdate({
        ...updatedLead,
        ...response
      });
    } catch (err) {
      console.error("Failed to perform lead conversion updates on backend:", err);
      onUpdate(updatedLead);
    }

    // Save successful outcome data
    setConversionSuccessData({
      success: true,
      reference: referenceCode,
      targetType: targetType,
      serviceModule: targetModule,
      ingestionTime: new Date().toISOString(),
      notes: conversionForm.notes || 'No notes added'
    });
  };

  // Add Dynamic Pipeline Stage
  const handleAddNewStage = () => {
    if (!currentPipeline) {
      alert('Pipeline details are still loading. Please try again.');
      return;
    }

    if (!newStageName.trim()) {
      alert('Stage name is required.');
      return;
    }
    
    // Create new stage object
    const newStageUid = 'stg_' + Math.random().toString(36).substr(2, 5);
    const newStageObj = {
      uid: newStageUid,
      pipelineUid: currentPipeline.uid,
      pipelineName: currentPipeline.name,
      stageName: newStageName.trim(),
      stageOrder: stages.length + 1,
      sequenceOrder: stages.length + 1,
      color: '#4f46e5', // Brand Indigo
      probability: Number(newStageProbability) || 50,
      slaDays: Number(newStageSla) || 3,
      isTerminal: false,
      taskCompletionMode: 'NONE' as const,
      autogenerateTasks: true,
      taskList: [],
      isActive: true,
      activeLeadCount: 0,
      movementRule: newStageRule,
      taskTemplates: []
    };

    // Update parent pipelines list
    const updatedPipelines = pipelines.map(p => {
      if (p.uid === currentPipeline.uid) {
        return {
          ...p,
          stages: [...p.stages, newStageObj]
        };
      }
      return p;
    });
    setPipelines(updatedPipelines);

    // Append a log entry to Lead detailing the change
    const newNotes = [...(lead.generalNotes || [])];
    newNotes.push({
      id: Math.random().toString(),
      notes: `Registered new customized pipeline stage structural threshold: "${newStageName.trim()}".`,
      createdDate: new Date().toISOString()
    });

    onUpdate({
      ...lead,
      generalNotes: newNotes,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Reset fields & close
    setNewStageName('');
    setNewStageSla(3);
    setNewStageProbability(50);
    setNewStageRule('Strict Block');
    setShowAddStageModal(false);
  };

  // Move stage action logic
  const handleProcessMoveStage = async () => {
    const targetStage = stages.find(s => s.uid === targetStageUid);
    if (!targetStage) return;
    const sortedStages = [...stages].sort((a, b) => {
      const aOrder = a.sequenceOrder || a.stageOrder || 0;
      const bOrder = b.sequenceOrder || b.stageOrder || 0;
      return aOrder - bOrder;
    });
    const currentStageIdx = sortedStages.findIndex(s => isLeadCurrentStage(s, lead));
    const targetStageIdx = sortedStages.findIndex(s => s.uid === targetStageUid);
    if (currentStageIdx < 0 || targetStageIdx < 0) {
      alert('Unable to resolve current pipeline stage. Please refresh the lead details and try again.');
      return;
    }
    if (currentStageIdx === targetStageIdx) {
      alert('Selected stage is already the current stage.');
      return;
    }
    const isBackwardMove = targetStageIdx >= 0 && currentStageIdx >= 0 && targetStageIdx < currentStageIdx;

    const requiresOverride = !isRequiredComplete && (movementRule === 'Warn Only' || movementRule === 'Manager/Admin Override');
    if (requiresOverride && !overrideReason.trim()) {
      alert('Override justification remarks are required to bypass stage requirements.');
      return;
    }
    const backwardReason = overrideReason.trim();
    if (isBackwardMove && !backwardReason) {
      alert('Reason is required for moving to the previous stage.');
      return;
    }

    // Prepare target tasks
    const newStagePredefinedTasks: LeadStageTask[] = targetStage.taskTemplates?.map(t => ({
      uid: t.uid,
      title: t.title,
      type: t.type,
      required: t.required,
      completed: false,
      isManual: false,
      createdAt: new Date().toISOString()
    })) || [];

    // Retain past manual tasks, but prepend the new state's predefined templates
    const consolidatedTasks = [
      ...newStagePredefinedTasks,
      ...manualTasks.map(t => ({ ...t, completed: false })) // Reset manual tasks for the new stage or keep them
    ];

    // Build stage history item
    const newHistory: StageHistory = {
      fromStageName: lead.currentPipelineStageName,
      toStageName: targetStage.stageName,
      movedByName: 'Global Coordinator',
      movedAt: new Date().toISOString(),
      durationMinutes: 120,
      isBackward: isBackwardMove,
      isSkip: Math.abs(targetStageIdx - currentStageIdx) > 1,
      isTerminal: targetStage.isTerminal,
      reasonCode: requiresOverride ? 'OVERRIDE_AUTH' : 'COMPLIANCE_PASS',
      reasonNote: overrideReason || 'Task compliance rules satisfied.'
    };

    // Append to general logs
    const newNotes = [...(lead.generalNotes || [])];
    newNotes.push({
      id: Math.random().toString(),
      notes: `Transitioned Stage mapping from "${lead.currentPipelineStageName}" to "${targetStage.stageName}".${requiresOverride ? ' Reason: ' + overrideReason : ''}`,
      createdDate: new Date().toISOString()
    });

    const updatedLead = {
      ...lead,
      currentPipelineStageUid: targetStage.uid,
      currentPipelineStageName: targetStage.stageName,
      stageTasks: consolidatedTasks,
      stageHistory: [newHistory, ...(lead.stageHistory || [])],
      generalNotes: newNotes,
      lastActivityAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      let response: CrmLeadDto | undefined;
      if (isBackwardMove) {
        response = await leadService.previousStage(lead.uid, {
            targetStageUid: targetStage.uid,
            targetStageName: targetStage.stageName,
            reason: backwardReason,
            reasonNote: backwardReason,
            reasonText: backwardReason,
            notes: backwardReason,
          });
      } else {
        const stepsToComplete = targetStageIdx - currentStageIdx;
        for (let step = 0; step < stepsToComplete; step += 1) {
          response = await leadService.completeStage(lead.uid);
        }
      }
      onUpdate({
        ...updatedLead,
        ...response
      });
    } catch (err) {
      console.error("Failed to move lead stage on backend:", err);
      onUpdate(updatedLead);
    }

    // Reset modals
    setShowMoveModal(false);
    setTargetStageUid('');
    setOverrideReason('');
  };

  const handleSaveContactDetails = async () => {
    try {
      const response = await leadService.update(lead.uid, editedLead);
      onUpdate({
        ...editedLead,
        ...response,
        lastActivityAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to update contact details on backend:", err);
      onUpdate({
        ...editedLead,
        lastActivityAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    setIsEditing(false);
  };

  return (
    <div data-testid={`jaldee-leads-lead-${lead.uid}-detail-page`} className="h-full flex flex-col bg-slate-50 overflow-y-auto font-sans text-slate-900">
      
      <LeadDetailBody
        lead={lead}
        editedLead={editedLead}
        currentPipeline={currentPipeline}
        stages={stages}
        totalStageCount={totalStageCount}
        completedStageCount={completedStageCount}
        movementRule={movementRule}
        requiredTasksCompleted={requiredTasksCompleted}
        requiredTasksTotal={requiredTasksTotal}
        optionalTasksTotal={optionalTasksTotal}
        manualTasks={manualTasks}
        optionalAndManualTasksCompleted={optionalAndManualTasksCompleted}
        optionalAndManualTasksTotal={optionalAndManualTasksTotal}
        isEditing={isEditing}
        actingRole={actingRole}
        missingFields={missingFields}
        productDisplayName={productDisplayName}
        isOwnerRestricted={isOwnerRestricted}
        isStageBlocked={isStageBlocked}
        canOverrideBlock={canOverrideBlock}
        isConversionRestricted={isConversionRestricted}
        setTargetStageUid={setTargetStageUid}
        setShowMoveModal={setShowMoveModal}
        setShowAddStageModal={setShowAddStageModal}
        setIsEditing={setIsEditing}
        setEditedLead={setEditedLead}
        setActingRole={setActingRole}
        setShowConversionModal={setShowConversionModal}
        onBack={onBack}
        handleSaveContactDetails={handleSaveContactDetails}
        handleTimelineStageClick={handleTimelineStageClick}
        handleAddManualTask={handleAddManualTask}
        handleToggleTask={handleToggleTask}
        currentStage={currentStage}
        conversionMapping={conversionMapping}
      />

      <LeadDetailDialogs
        lead={lead}
        isRequiredComplete={isRequiredComplete}
        showMoveModal={showMoveModal}
        setShowMoveModal={setShowMoveModal}
        currentStage={currentStage}
        targetStageUid={targetStageUid}
        setTargetStageUid={setTargetStageUid}
        stages={stages}
        moveStatus={moveStatus}
        requiredTasksCompleted={requiredTasksCompleted}
        requiredTasksTotal={requiredTasksTotal}
        optionalAndManualTasksCompleted={optionalAndManualTasksCompleted}
        optionalAndManualTasksTotal={optionalAndManualTasksTotal}
        movementRule={movementRule}
        overrideReason={overrideReason}
        setOverrideReason={setOverrideReason}
        canOverrideBlock={canOverrideBlock}
        handleProcessMoveStage={handleProcessMoveStage}
        showAddManualTaskModal={showAddManualTaskModal}
        setShowAddManualTaskModal={setShowAddManualTaskModal}
        manualTaskTitle={manualTaskTitle}
        setManualTaskTitle={setManualTaskTitle}
        manualTaskRequired={manualTaskRequired}
        setManualTaskRequired={setManualTaskRequired}
        manualTaskType={manualTaskType}
        setManualTaskType={setManualTaskType}
        manualTaskPriority={manualTaskPriority}
        setManualTaskPriority={setManualTaskPriority}
        manualTaskDescription={manualTaskDescription}
        setManualTaskDescription={setManualTaskDescription}
        manualTaskLocation={manualTaskLocation}
        setManualTaskLocation={setManualTaskLocation}
        manualTaskAssignee={manualTaskAssignee}
        setManualTaskAssignee={setManualTaskAssignee}
        manualTaskDate={manualTaskDate}
        setManualTaskDate={setManualTaskDate}
        manualTaskCategory={manualTaskCategory}
        setManualTaskCategory={setManualTaskCategory}
        manualTaskStatus={manualTaskStatus}
        setManualTaskStatus={setManualTaskStatus}
        taskPriorities={taskPriorities}
        taskTypes={taskTypes}
        taskCategories={taskCategories}
        taskStatuses={taskStatuses}
        taskLookupsLoading={taskLookupsLoading}
        taskCreateLoading={taskCreateLoading}
        effectiveTaskLocations={effectiveTaskLocations}
        taskUsers={taskUsers}
        handleSaveManualTask={handleSaveManualTask}
        showAddStageModal={showAddStageModal}
        setShowAddStageModal={setShowAddStageModal}
        currentPipeline={currentPipeline}
        newStageName={newStageName}
        setNewStageName={setNewStageName}
        newStageRule={newStageRule}
        setNewStageRule={setNewStageRule}
        handleAddNewStage={handleAddNewStage}
        showConversionModal={showConversionModal}
        setShowConversionModal={setShowConversionModal}
        conversionSuccessData={conversionSuccessData}
        setConversionSuccessData={setConversionSuccessData}
        onBack={onBack}
        actingRole={actingRole}
        duplicateLead={duplicateLead}
        isBlockedByDuplicate={isBlockedByDuplicate}
        conversionMapping={conversionMapping}
        conversionForm={conversionForm}
        setConversionForm={setConversionForm}
        isConversionDisabled={isConversionDisabled}
        handleConfirmConversion={handleConfirmConversion}
      />
    </div>
  );
}
