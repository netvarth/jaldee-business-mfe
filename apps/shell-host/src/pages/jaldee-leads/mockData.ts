import { CrmLeadDto, CrmLeadPipelineDto, User, Channel, Product, Priority, InternalStatus, FormTemplate } from './types';
import { addDays, subDays, subHours } from './lib/dateUtils';

const now = new Date();

export const mockForms: FormTemplate[] = [
  {
    uid: 'f1',
    name: 'Standard Lead Form',
    fields: [
      { id: 'company_size', label: 'Company Size', type: 'select', required: true, options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
      { id: 'budget', label: 'Expected Budget', type: 'number', required: false },
      { id: 'preferred_contact', label: 'Preferred Contact Method', type: 'select', required: true, options: ['Phone', 'Email', 'WhatsApp'] },
    ]
  },
  {
    uid: 'f2',
    name: 'Insurance Detailed Form',
    fields: [
      { id: 'insurance_type', label: 'Type of Insurance', type: 'select', required: true, options: ['Life', 'Health', 'Property', 'Auto'] },
      { id: 'current_provider', label: 'Current Provider', type: 'text', required: false },
      { id: 'smoker', label: 'Smoker?', type: 'checkbox', required: true },
    ]
  },
  {
    uid: 'f3',
    name: 'Education/Demo Form',
    fields: [
      { id: 'school_name', label: 'School/Institution Name', type: 'text', required: true },
      { id: 'student_count', label: 'Estimated Student Count', type: 'number', required: true },
      { id: 'demo_date', label: 'Preferred Demo Date', type: 'text', required: true }, // Simple text for now
    ]
  }
];

export const mockUsers: User[] = [
  { uid: 'u1', name: 'Alice Admin', email: 'alice@jaldee.com', avatarInitials: 'AA' },
  { uid: 'u2', name: 'Bob Sales', email: 'bob@jaldee.com', avatarInitials: 'BS' },
  { uid: 'u3', name: 'Charlie Closer', email: 'charlie@jaldee.com', avatarInitials: 'CC' },
  { uid: 'u4', name: 'Diana Desk', email: 'diana@jaldee.com', avatarInitials: 'DD' },
];

export const mockChannels: Channel[] = [
  { uid: 'c1', name: 'Walk-in Desk', type: 'WALK_IN', location: 'Main Reception', productName: 'General Consultation', productType: 'Service', qrUrl: 'https://www.jaldee.com/qr/c1', productUids: ['pr1'] },
  { uid: 'c2', name: 'Website Form', type: 'ONLINE', location: 'Digital Storefront', productName: 'Health Checkup', productType: 'Product', qrUrl: 'https://www.jaldee.com/qr/c2', productUids: ['pr1', 'pr2'] },
  { uid: 'c3', name: 'WhatsApp Bot', type: 'CHATBOT', location: 'Mobile API', productName: 'Inquiry Bot', productType: 'Automation', qrUrl: 'https://www.jaldee.com/qr/c3', productUids: ['pr3'] },
  { uid: 'c4', name: 'Partner Referral', type: 'REFERRAL', location: 'Affiliate Network', productName: 'B2B Leads', productType: 'Lead Gen', qrUrl: 'https://www.jaldee.com/qr/c4', productUids: ['pr2', 'pr3'] },
  { uid: 'c5', name: 'Cold Call list', type: 'PHONE', location: 'Call Center', productName: 'Outbound Sales', productType: 'Direct Sales', qrUrl: 'https://www.jaldee.com/qr/c5', productUids: ['pr1', 'pr3'] },
];

export const mockProducts: Product[] = [
  { 
    uid: 'pr1', 
    name: 'Health Checkup Package', 
    productEnum: 'HEALTH_CHK', 
    defaultPipelineUid: 'p1', 
    leadTemplateUid: 'f1',
    category: 'Healthcare',
    description: 'Comprehensive diagnostic checkup panel including clinical pathology and radiology consultations.',
    price: 350,
    status: 'ACTIVE',
    productType: 'PREMIUM SERVICE OFFERING',
    conversionMapping: {
      targetType: 'Appointment',
      targetModule: 'Clinical Appointments',
      requiredFields: ['consumerPhone', 'consumerEmail', 'consumerDob'],
      allowedStageUid: 's1-4',
      buttonLabel: 'Convert to Appointment',
      postConversionStatus: 'COMPLETED',
      duplicateRule: 'Block',
      autoCloseLead: true
    }
  },
  { 
    uid: 'pr2', 
    name: 'Business Insurance', 
    productEnum: 'BIZ_INS', 
    defaultPipelineUid: 'p1', 
    leadTemplateUid: 'f2',
    category: 'Commercial Insurance',
    description: 'Custom risk management coverages spanning general liability and professional indemnity profiles.',
    price: 2500,
    status: 'ACTIVE',
    productType: 'ENTERPRISE PLAN',
    conversionMapping: {
      targetType: 'Membership',
      targetModule: 'Insurance Underwritings',
      requiredFields: ['consumerPhone', 'company', 'consumerAddress'],
      allowedStageUid: 's1-4',
      buttonLabel: 'Convert to Membership',
      postConversionStatus: 'COMPLETED',
      duplicateRule: 'Warn',
      autoCloseLead: true
    }
  },
  { 
    uid: 'pr3', 
    name: 'School ERP Demo', 
    productEnum: 'EDU_ERP', 
    defaultPipelineUid: 'p2', 
    leadTemplateUid: 'f3',
    category: 'SaaS Software',
    description: 'Fully integrated student information system, online admissions, and campus analytics portal.',
    price: 4500,
    status: 'ACTIVE',
    productType: 'SAAS LICENSE',
    conversionMapping: {
      targetType: 'Admission Application',
      targetModule: 'Admissions Processing',
      requiredFields: ['consumerPhone', 'consumerEmail', 'company'],
      allowedStageUid: 's2-2',
      buttonLabel: 'Convert to Application',
      postConversionStatus: 'COMPLETED',
      duplicateRule: 'Ignore',
      autoCloseLead: false
    }
  },
];

export const mockPipelines: CrmLeadPipelineDto[] = [
  {
    uid: 'p1',
    name: 'Standard Sales',
    description: 'Default 5-stage sales process',
    productUids: ['pr1', 'pr2'],
    isDefault: true,
    isActive: true,
    stagesInSequentialOrder: true,
    createdByName: 'Alice Admin',
    createdAt: subDays(now, 30).toISOString(),
    stages: [
      { 
        uid: 's1-1', 
        pipelineUid: 'p1', 
        pipelineName: 'Standard Sales', 
        stageName: 'New Inquiry', 
        stageOrder: 1, 
        sequenceOrder: 1, 
        color: '#9CA3AF', 
        probability: 10, 
        slaDays: 1, 
        isTerminal: false, 
        taskCompletionMode: 'NONE', 
        autogenerateTasks: true, 
        taskList: [{title: 'Initial Welcome Email', description: 'Send standard welcome deck'}, {title: 'Profile Enrichment', description: 'Check LinkedIn for details'}], 
        isActive: true, 
        activeLeadCount: 0,
        movementRule: 'Strict Block',
        conversionSetting: 'BLOCKED',
        taskTemplates: [
          { uid: 't1_1_1', title: 'Initial Welcome Email', type: 'EMAIL', required: true, autoCreate: true, dueOffsetHours: 24, assigneeRule: 'Owner', priority: 'NORMAL', outcomeRequired: true, active: true, description: 'Send standard welcome deck' },
          { uid: 't1_1_2', title: 'Profile Enrichment', type: 'TASK', required: false, autoCreate: true, dueOffsetHours: 48, assigneeRule: 'Owner', priority: 'LOW', outcomeRequired: false, active: true, description: 'Check LinkedIn for details' }
        ]
      },
      { 
        uid: 's1-2', 
        pipelineUid: 'p1', 
        pipelineName: 'Standard Sales', 
        stageName: 'Contacted', 
        stageOrder: 2, 
        sequenceOrder: 2, 
        color: '#60A5FA', 
        probability: 30, 
        slaDays: 2, 
        isTerminal: false, 
        taskCompletionMode: 'NONE', 
        autogenerateTasks: true, 
        taskList: [{title: 'Discovery Call', description: 'Schedule 15m intro call'}, {title: 'Identify Pain Points', description: 'Note down top 3 issues'}], 
        isActive: true, 
        activeLeadCount: 0,
        movementRule: 'Warn Only',
        conversionSetting: 'BLOCKED',
        taskTemplates: [
          { uid: 't1_2_1', title: 'Discovery Call', type: 'CALL', required: true, autoCreate: true, dueOffsetHours: 12, assigneeRule: 'Owner', priority: 'HIGH', outcomeRequired: true, active: true, description: 'Schedule 15m intro call' },
          { uid: 't1_2_2', title: 'Identify Pain Points', type: 'TASK', required: true, autoCreate: true, dueOffsetHours: 24, assigneeRule: 'Owner', priority: 'NORMAL', outcomeRequired: true, active: true, description: 'Note down top 3 issues' }
        ]
      },
      { 
        uid: 's1-3', 
        pipelineUid: 'p1', 
        pipelineName: 'Standard Sales', 
        stageName: 'Demo Scheduled', 
        stageOrder: 3, 
        sequenceOrder: 3, 
        color: '#C084FC', 
        probability: 60, 
        slaDays: 5, 
        isTerminal: false, 
        taskCompletionMode: 'NONE', 
        autogenerateTasks: true, 
        taskList: [{title: 'Prepare Demo Instance', description: 'Set up dummy data'}, {title: 'Finalize Presentation', description: 'Tailor to client sector'}], 
        isActive: true, 
        activeLeadCount: 0,
        movementRule: 'Manager/Admin Override',
        conversionSetting: 'ALLOWED',
        taskTemplates: [
          { uid: 't1_3_1', title: 'Prepare Demo Instance', type: 'TASK', required: true, autoCreate: true, dueOffsetHours: 48, assigneeRule: 'System', priority: 'HIGH', outcomeRequired: true, active: true, description: 'Set up dummy data' },
          { uid: 't1_3_2', title: 'Finalize Presentation', type: 'MEETING', required: true, autoCreate: true, dueOffsetHours: 72, assigneeRule: 'Owner', priority: 'URGENT', outcomeRequired: true, active: true, description: 'Tailor to client sector' }
        ]
      },
      { 
        uid: 's1-4', 
        pipelineUid: 'p1', 
        pipelineName: 'Standard Sales', 
        stageName: 'Proposal Sent', 
        stageOrder: 4, 
        sequenceOrder: 4, 
        color: '#FCD34D', 
        probability: 80, 
        slaDays: 7, 
        isTerminal: false, 
        taskCompletionMode: 'NONE', 
        autogenerateTasks: true, 
        taskList: [{title: 'Send Quote', description: 'Standard pricing sheet'}, {title: 'Follow-up Call', description: '2 days after proposal'}], 
        isActive: true, 
        activeLeadCount: 0,
        movementRule: 'Strict Block',
        conversionSetting: 'RECOMMENDED',
        taskTemplates: [
          { uid: 't1_4_1', title: 'Send Quote', type: 'DOCUMENT', required: true, autoCreate: true, dueOffsetHours: 48, assigneeRule: 'Owner', priority: 'HIGH', outcomeRequired: true, active: true, description: 'Standard pricing sheet' },
          { uid: 't1_4_2', title: 'Follow-up Call', type: 'CALL', required: false, autoCreate: true, dueOffsetHours: 96, assigneeRule: 'Owner', priority: 'NORMAL', outcomeRequired: false, active: true, description: '2 days after proposal' }
        ]
      },
      { uid: 's1-5', pipelineUid: 'p1', pipelineName: 'Standard Sales', stageName: 'Won', stageOrder: 5, sequenceOrder: 5, color: '#22C55E', probability: 100, slaDays: 0, isTerminal: true, terminalType: 'WON', taskCompletionMode: 'NONE', autogenerateTasks: false, taskList: [], isActive: true, activeLeadCount: 0, movementRule: 'No Restriction', taskTemplates: [], conversionSetting: 'ALLOWED' },
      { uid: 's1-6', pipelineUid: 'p1', pipelineName: 'Standard Sales', stageName: 'Lost', stageOrder: 6, sequenceOrder: 6, color: '#EF4444', probability: 0, slaDays: 0, isTerminal: true, terminalType: 'LOST', taskCompletionMode: 'NONE', autogenerateTasks: false, taskList: [], isActive: true, activeLeadCount: 0, movementRule: 'No Restriction', taskTemplates: [], conversionSetting: 'BLOCKED' },
    ]
  },
  {
    uid: 'p2',
    name: 'Fast Track',
    description: 'Quick 3-stage process for high intent',
    productUids: ['pr3'],
    isDefault: false,
    isActive: true,
    stagesInSequentialOrder: false,
    createdByName: 'Alice Admin',
    createdAt: subDays(now, 20).toISOString(),
    stages: [
      { 
        uid: 's2-1', 
        pipelineUid: 'p2', 
        pipelineName: 'Fast Track', 
        stageName: 'New Lead', 
        stageOrder: 1, 
        sequenceOrder: 1, 
        color: '#60A5FA', 
        probability: 20, 
        slaDays: 1, 
        isTerminal: false, 
        taskCompletionMode: 'NONE', 
        autogenerateTasks: true, 
        taskList: [], 
        isActive: true, 
        activeLeadCount: 0,
        movementRule: 'No Restriction',
        conversionSetting: 'BLOCKED',
        taskTemplates: [
          { uid: 't2_1_1', title: 'Fast Lead Review', type: 'TASK', required: true, autoCreate: true, dueOffsetHours: 6, assigneeRule: 'Owner', priority: 'HIGH', outcomeRequired: true, active: true }
        ]
      },
      { 
        uid: 's2-2', 
        pipelineUid: 'p2', 
        pipelineName: 'Fast Track', 
        stageName: 'Negotiation', 
        stageOrder: 2, 
        sequenceOrder: 2, 
        color: '#F59E0B', 
        probability: 70, 
        slaDays: 3, 
        isTerminal: false, 
        taskCompletionMode: 'NONE', 
        autogenerateTasks: true, 
        taskList: [], 
        isActive: true, 
        activeLeadCount: 0,
        movementRule: 'Strict Block',
        conversionSetting: 'RECOMMENDED',
        taskTemplates: [
          { uid: 't2_2_1', title: 'Negotiate Terms', type: 'MEETING', required: true, autoCreate: true, dueOffsetHours: 24, assigneeRule: 'Owner', priority: 'URGENT', outcomeRequired: true, active: true }
        ]
      },
      { uid: 's2-3', pipelineUid: 'p2', pipelineName: 'Fast Track', stageName: 'Closed', stageOrder: 3, sequenceOrder: 3, color: '#22C55E', probability: 100, slaDays: 0, isTerminal: true, terminalType: 'WON', taskCompletionMode: 'NONE', autogenerateTasks: false, taskList: [], isActive: true, activeLeadCount: 0, movementRule: 'No Restriction', taskTemplates: [], conversionSetting: 'ALLOWED' },
    ]
  },
  {
    uid: 'p3',
    name: 'Re-engagement',
    description: 'For older stale leads',
    productUids: [],
    isDefault: false,
    isActive: true,
    stagesInSequentialOrder: true,
    createdByName: 'Alice Admin',
    createdAt: subDays(now, 40).toISOString(),
    stages: [
      { 
        uid: 's3-1', 
        pipelineUid: 'p3', 
        pipelineName: 'Re-engagement', 
        stageName: 'Cold', 
        stageOrder: 1, 
        sequenceOrder: 1, 
        color: '#9CA3AF', 
        probability: 5, 
        slaDays: 7, 
        isTerminal: false, 
        taskCompletionMode: 'NONE', 
        autogenerateTasks: true, 
        taskList: [], 
        isActive: true, 
        activeLeadCount: 0,
        movementRule: 'Warn Only',
        taskTemplates: [
          { uid: 't3_1_1', title: 'Check Re-engagement Status', type: 'CALL', required: true, autoCreate: true, dueOffsetHours: 48, assigneeRule: 'Owner', priority: 'NORMAL', outcomeRequired: true, active: true }
        ]
      },
      { 
        uid: 's3-2', 
        pipelineUid: 'p3', 
        pipelineName: 'Re-engagement', 
        stageName: 'Warming Up', 
        stageOrder: 2, 
        sequenceOrder: 2, 
        color: '#FBBF24', 
        probability: 30, 
        slaDays: 7, 
        isTerminal: false, 
        taskCompletionMode: 'NONE', 
        autogenerateTasks: true, 
        taskList: [], 
        isActive: true, 
        activeLeadCount: 0,
        movementRule: 'No Restriction',
        taskTemplates: []
      },
      { uid: 's3-3', pipelineUid: 'p3', pipelineName: 'Re-engagement', stageName: 'Re-activated', stageOrder: 3, sequenceOrder: 3, color: '#34D399', probability: 80, slaDays: 5, isTerminal: false, taskCompletionMode: 'NONE', autogenerateTasks: false, taskList: [], isActive: true, activeLeadCount: 0, movementRule: 'No Restriction', taskTemplates: [] },
    ]
  }
];

export const mockLeads: CrmLeadDto[] = [
  {
    uid: 'L-001',
    referenceNo: 'REF-001',
    leadDate: subDays(now, 2).toISOString(),
    channelUid: 'c2', channelName: 'Website Form', channelType: 'ONLINE',
    productUid: 'pr1', productName: 'Health Checkup Package', productEnum: 'HEALTH_CHK',
    pipelineUid: 'p1', pipelineName: 'Standard Sales', currentPipelineStageUid: 's1-1', currentPipelineStageName: 'New Inquiry',
    consumerFirstName: 'John', consumerLastName: 'Doe', consumerPhone: '+1234567890', consumerEmail: 'john@example.com',
    ownerId: 'u2', ownerName: 'Bob Sales', assignees: [], priority: 'HIGH', tags: ['vip'],
    internalStatus: 'ACTIVE', isRejected: false, isConverted: false, isDuplicate: false,
    lastActivityAt: subHours(now, 2).toISOString(), nextFollowupAt: addDays(now, 1).toISOString(),
    generalNotes: [], stageHistory: [], attachments: [],
    createdAt: subDays(now, 2).toISOString(), updatedAt: subHours(now, 2).toISOString(), createdByName: 'System'
  },
  {
    uid: 'L-002',
    referenceNo: 'REF-002',
    leadDate: subDays(now, 5).toISOString(),
    channelUid: 'c1', channelName: 'Walk-in Desk', channelType: 'WALK_IN',
    productUid: 'pr2', productName: 'Business Insurance', productEnum: 'BIZ_INS',
    pipelineUid: 'p1', pipelineName: 'Standard Sales', currentPipelineStageUid: 's1-2', currentPipelineStageName: 'Contacted',
    consumerFirstName: 'Sarah', consumerLastName: 'Smith', consumerPhone: '+1987654321',
    ownerId: 'u3', ownerName: 'Charlie Closer', assignees: [], priority: 'NORMAL', tags: [],
    internalStatus: 'ACTIVE', isRejected: false, isConverted: false, isDuplicate: true,
    lastActivityAt: subDays(now, 1).toISOString(),
    generalNotes: [], stageHistory: [], attachments: [],
    createdAt: subDays(now, 5).toISOString(), updatedAt: subDays(now, 1).toISOString(), createdByName: 'Alice Admin'
  },
  {
    uid: 'L-003',
    referenceNo: 'REF-003',
    leadDate: subDays(now, 1).toISOString(),
    channelUid: 'c4', channelName: 'Partner Referral', channelType: 'REFERRAL',
    productUid: 'pr3', productName: 'School ERP Demo', productEnum: 'EDU_ERP',
    pipelineUid: 'p2', pipelineName: 'Fast Track', currentPipelineStageUid: 's2-2', currentPipelineStageName: 'Negotiation',
    consumerFirstName: 'Acme', consumerLastName: 'Corp', consumerPhone: '+1122334455',
    ownerId: 'u2', ownerName: 'Bob Sales', assignees: [], priority: 'URGENT', tags: ['enterprise', 'hot'],
    internalStatus: 'ACTIVE', isRejected: false, isConverted: false, isDuplicate: false,
    lastActivityAt: subHours(now, 1).toISOString(), nextFollowupAt: now.toISOString(),
    generalNotes: [], stageHistory: [], attachments: [],
    createdAt: subDays(now, 1).toISOString(), updatedAt: subHours(now, 1).toISOString(), createdByName: 'System'
  },
  {
    uid: 'L-004',
    referenceNo: 'REF-004',
    leadDate: subDays(now, 10).toISOString(),
    channelUid: 'c3', channelName: 'WhatsApp Bot', channelType: 'CHATBOT',
    productUid: 'pr1', productName: 'Health Checkup Package', productEnum: 'HEALTH_CHK',
    pipelineUid: 'p1', pipelineName: 'Standard Sales', currentPipelineStageUid: 's1-5', currentPipelineStageName: 'Won',
    consumerFirstName: 'Mike', consumerLastName: 'Johnson', consumerPhone: '+1555666777',
    ownerId: 'u4', ownerName: 'Diana Desk', assignees: [], priority: 'LOW', tags: [],
    internalStatus: 'COMPLETED', isRejected: false, isConverted: true, isDuplicate: false,
    lastActivityAt: subDays(now, 3).toISOString(),
    generalNotes: [], stageHistory: [], attachments: [],
    createdAt: subDays(now, 10).toISOString(), updatedAt: subDays(now, 3).toISOString(), createdByName: 'System'
  },
  {
    uid: 'L-005',
    referenceNo: 'REF-005',
    leadDate: subDays(now, 8).toISOString(),
    channelUid: 'c5', channelName: 'Cold Call list', channelType: 'PHONE',
    productUid: 'pr2', productName: 'Business Insurance', productEnum: 'BIZ_INS',
    pipelineUid: 'p3', pipelineName: 'Re-engagement', currentPipelineStageUid: 's3-1', currentPipelineStageName: 'Cold',
    consumerFirstName: 'Emily', consumerLastName: 'Brown', consumerPhone: '+1444333222',
    ownerId: 'u2', ownerName: 'Bob Sales', assignees: [], priority: 'NORMAL', tags: ['re-engage'],
    internalStatus: 'ACTIVE', isRejected: false, isConverted: false, isDuplicate: true,
    lastActivityAt: subDays(now, 8).toISOString(),
    generalNotes: [], stageHistory: [], attachments: [],
    createdAt: subDays(now, 8).toISOString(), updatedAt: subDays(now, 8).toISOString(), createdByName: 'Alice Admin'
  },
  // Adding 10 more to have a good spread
  ...Array.from({ length: 10 }).map((_, i) => ({
    uid: `L-00${i+6}`,
    referenceNo: `REF-00${i+6}`,
    leadDate: subDays(now, i+2).toISOString(),
    channelUid: mockChannels[i % 5].uid, channelName: mockChannels[i % 5].name, channelType: mockChannels[i % 5].type,
    productUid: mockProducts[i % 3].uid, productName: mockProducts[i % 3].name, productEnum: mockProducts[i % 3].productEnum,
    pipelineUid: mockPipelines[i % 3].uid, pipelineName: mockPipelines[i % 3].name, currentPipelineStageUid: mockPipelines[i % 3].stages[0].uid, currentPipelineStageName: mockPipelines[i % 3].stages[0].stageName,
    consumerFirstName: `LeadFirst${i}`, consumerLastName: `LeadLast${i}`, consumerPhone: `+1${Math.floor(Math.random()*1000000000)}`,
    ownerId: mockUsers[i % 4].uid, ownerName: mockUsers[i % 4].name, assignees: [], priority: ['URGENT', 'HIGH', 'NORMAL', 'LOW'][i % 4] as Priority, tags: [],
    internalStatus: 'ACTIVE' as InternalStatus, isRejected: false, isConverted: false, isDuplicate: false,
    lastActivityAt: subDays(now, i % 3).toISOString(),
    generalNotes: [], stageHistory: [], attachments: [],
    createdAt: subDays(now, i+2).toISOString(), updatedAt: subDays(now, i % 3).toISOString(), createdByName: 'System'
  }))
];
