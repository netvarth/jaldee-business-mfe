import React, { useState } from 'react';
import { CrmLeadDto, CrmLeadPipelineDto, LeadStageTask, StageHistory, GeneralNote, Priority, Product } from '../types';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { format } from '../lib/dateUtils';
import { PageHeader, SectionCard, Button, Input, Select, Textarea, Checkbox, Dialog, DialogFooter } from "@jaldee/design-system";
import { leadService, type TaskLookupOption } from '../services/leadService';
import { useShellStore } from '../../../store/shellStore';

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

export default function LeadDetailScreen({ lead, pipelines, setPipelines, products, leads, onBack, onUpdate }: LeadDetailScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<CrmLeadDto>(lead);
  
  // Custom Role Simulation State (Admin, Manager, Sales Rep)
  const [actingRole, setActingRole] = useState<'ADMIN' | 'MANAGER' | 'SALES_REP'>('ADMIN');

  // Conversion Modals & Success Receipts
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionSuccessData, setConversionSuccessData] = useState<{
    success: boolean;
    reference: string;
    targetType: string;
    serviceModule: string;
    ingestionTime: string;
    notes: string;
  } | null>(null);

  // Conversion Form Fields for dynamic qualification
  const [conversionForm, setConversionForm] = useState({
    consumerPhone: lead.consumerPhone || '',
    consumerEmail: lead.consumerEmail || '',
    company: lead.company || '',
    consumerDob: lead.consumerDob || '',
    consumerAddress: lead.consumerAddress || '',
    notes: '',
    overrideReason: ''
  });

  // Re-sync fields when the core active lead changes
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
  
  // Modal configurations
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetStageUid, setTargetStageUid] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  
  // Add Manual Task Modal State
  const [showAddManualTaskModal, setShowAddManualTaskModal] = useState(false);
  const [manualTaskTitle, setManualTaskTitle] = useState('');
  const [manualTaskRequired, setManualTaskRequired] = useState(false);
  const [manualTaskType, setManualTaskType] = useState('');
  const [manualTaskPriority, setManualTaskPriority] = useState('');
  const [manualTaskDescription, setManualTaskDescription] = useState('');
  const availableLocations = useShellStore((state) => state.availableLocations);
  const shellUser = useShellStore((state) => state.user);
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
  const currentStage = stages.find(s => s.uid === lead.currentPipelineStageUid) || stages[0];
  const orderedStages = [...stages].sort((a, b) => {
    const aOrder = a.sequenceOrder || a.stageOrder || 0;
    const bOrder = b.sequenceOrder || b.stageOrder || 0;
    return aOrder - bOrder;
  });
  const activeStageIndex = orderedStages.findIndex(s => s.uid === lead.currentPipelineStageUid);
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

  // Lazy initialize stageTasks if missing
  const tasks = lead.stageTasks || [];
  React.useEffect(() => {
    if (!lead.stageTasks || lead.stageTasks.length === 0) {
      const initialTasks: LeadStageTask[] = currentStage?.taskTemplates?.map(t => ({
        uid: t.uid,
        title: t.title,
        type: t.type,
        required: t.required,
        completed: false,
        isManual: false,
        createdAt: new Date().toISOString()
      })) || [];
      if (initialTasks.length > 0) {
        onUpdate({
          ...lead,
          stageTasks: initialTasks
        });
      }
    }
  }, [lead, currentStage, onUpdate]);

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
    if (stageUid === lead.currentPipelineStageUid) return;
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
    const currentStageIdx = sortedStages.findIndex(s => s.uid === lead.currentPipelineStageUid);
    const targetStageIdx = sortedStages.findIndex(s => s.uid === targetStageUid);
    const isBackwardMove = targetStageIdx >= 0 && currentStageIdx >= 0 && targetStageIdx < currentStageIdx;

    const requiresOverride = !isRequiredComplete && (movementRule === 'Warn Only' || movementRule === 'Manager/Admin Override');
    if (requiresOverride && !overrideReason.trim()) {
      alert('Override justification remarks are required to bypass stage requirements.');
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
            reason: overrideReason || 'Moved to previous stage from lead detail.',
          });
      } else {
        const stepsToComplete = Math.max(1, targetStageIdx - currentStageIdx);
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
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto font-sans text-slate-900">
      
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

      {/* COMPLIANT ADVANCEMENT MODAL - RULE 12 */}
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
    </div>
  );
}
