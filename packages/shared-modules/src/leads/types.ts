export type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
export type InternalStatus = 'ACTIVE' | 'REJECTED' | 'COMPLETED' | 'NO_RESPONSE';
export type ChannelType = 'DIRECT' | 'QRCODE' | 'WHATSAPP' | 'TELEGRAM' | 'IVR' | 'BRANDEDAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'SDK';
export type TerminalType = 'WON' | 'LOST' | 'JUNK';

export interface Assignee {
  userId: string;
  userName: string;
  assignedDate: string;
  assignedByUserName: string;
  isDefault: boolean;
}

export interface GeneralNote {
  id: string;
  notes: string;
  createdDate: string;
}

export interface StageHistory {
  fromStageName: string;
  toStageName: string;
  movedByName: string;
  movedAt: string;
  durationMinutes: number;
  reasonCode?: string;
  reasonNote?: string;
  isBackward: boolean;
  isSkip: boolean;
  isTerminal: boolean;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface FormTemplate {
  uid: string;
  name: string;
  fields: FormField[];
  templateSchema?: unknown;
}

export interface StageTaskTemplate {
  uid: string;
  title: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'DOCUMENT' | 'TASK';
  required: boolean;
  autoCreate: boolean;
  dueOffsetHours: number;
  assigneeRule: string;
  priority: Priority;
  outcomeRequired: boolean;
  active: boolean;
  description?: string;
}

export interface LeadStageTask {
  uid: string;
  title: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'DOCUMENT' | 'TASK';
  required: boolean;
  completed: boolean;
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  outcome?: string;
  isManual: boolean;
  createdAt: string;
  priority?: Priority;
  description?: string;
  location?: string;
  category?: string;
  status?: string;
}

export interface CrmLeadDto {
  uid: string;
  referenceNo: string;
  leadDate: string;
  channelUid: string;
  channelName: string;
  channelType: ChannelType;
  productUid: string;
  productName: string;
  productEnum: string;
  pipelineUid: string;
  pipelineName: string;
  currentPipelineStageUid: string;
  currentPipelineStageName: string;
  consumerFirstName: string;
  consumerLastName: string;
  consumerPhone: string;
  consumerEmail?: string;
  consumerGender?: string;
  consumerDob?: string;
  consumerAddress?: string;
  consumerCity?: string;
  consumerState?: string;
  consumerCountry?: string;
  consumerPin?: string;
  company?: string;
  expectedValue?: string;
  winProbability?: number;
  ownerId: string;
  ownerName: string;
  assignees: Assignee[];
  priority: Priority;
  tags: string[];
  internalStatus: InternalStatus;
  isRejected: boolean;
  isConverted: boolean;
  isDuplicate: boolean;
  nextFollowupAt?: string;
  lastActivityAt: string;
  generalNotes: GeneralNote[];
  stageHistory: StageHistory[];
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  customFormData?: Record<string, any>;
  stageTasks?: LeadStageTask[];
  convertedTargetType?: ConversionTargetType;
  convertedObjectRef?: string;
  convertedOn?: string;
  convertedNotes?: string;
  convertedBy?: string;
}

export interface CrmLeadPipelineStageDto {
  uid: string;
  pipelineUid: string;
  pipelineName: string;
  stageName: string;
  stageOrder: number;
  color: string;
  probability?: number;
  slaDays?: number;
  isTerminal: boolean;
  terminalType?: TerminalType;
  taskCompletionMode: 'ALL' | 'ANY' | 'NONE';
  autogenerateTasks: boolean;
  taskList: { title: string; description: string }[];
  isActive: boolean;
  sequenceOrder: number;
  proceedStageUid?: string;
  redirectStageUid?: string;
  activeLeadCount: number;
  movementRule?: 'Strict Block' | 'Warn Only' | 'Manager/Admin Override' | 'No Restriction';
  taskTemplates?: StageTaskTemplate[];
  conversionSetting?: 'ALLOWED' | 'RECOMMENDED' | 'BLOCKED';
}

export interface CrmLeadPipelineDto {
  uid: string;
  name: string;
  description: string;
  productUids: string[];
  isDefault: boolean;
  isActive: boolean;
  stagesInSequentialOrder: boolean;
  stages: CrmLeadPipelineStageDto[];
  createdByName: string;
  createdAt: string;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  avatarInitials: string;
}

export interface Channel {
  uid: string;
  name: string;
  channelType: ChannelType;
  location?: string;
  productUid?: string;
  productUids?: string[];
  productName?: string;
  productType?: string;
  qrUrl?: string;
  status?: string;
}

export type ConversionTargetType = 
  | 'Appointment' 
  | 'Order' 
  | 'Membership' 
  | 'Admission Application' 
  | 'Customer / Consumer' 
  | 'Enquiry' 
  | 'Custom';

export interface ConversionMapping {
  targetType: ConversionTargetType;
  targetModule: string;
  requiredFields: string[]; 
  allowedStageUid?: string; 
  buttonLabel: string;
  postConversionStatus: string;
  duplicateRule: 'Ignore' | 'Block' | 'Warn';
  autoCloseLead: boolean;
}

export interface Product {
  uid: string;
  name: string;
  displayName?: string;
  productEnum: string;
  defaultPipelineUid: string;
  defaultPipelineName?: string;
  leadTemplateUid?: string;
  leadTemplateName?: string;
  templateTitle?: string;
  category?: string;
  description?: string;
  price?: number;
  status?: string;
  productType?: string;
  productTypeEnum?: string;
  conversionMapping?: ConversionMapping;
}
