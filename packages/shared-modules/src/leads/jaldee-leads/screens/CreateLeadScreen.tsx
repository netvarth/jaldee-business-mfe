import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { CrmLeadDto, Product, Channel, FormTemplate, User, CrmLeadPipelineDto } from '../types';
import { mockUsers } from '../mockData';
import { Button, Input, Select, Checkbox, PageHeader, PhoneInput } from '@jaldee/design-system';
import { leadService } from '../services/leadService';
import { leadPipelineService } from '../services/pipelineService';

interface CreateLeadScreenProps {
  onBack: () => void;
  onSave: (lead: CrmLeadDto) => void;
  pipelines: CrmLeadPipelineDto[];
  products: Product[];
  channels: Channel[];
  leads: CrmLeadDto[];
  forms: FormTemplate[];
}

const hasStages = (pipeline?: CrmLeadPipelineDto | null) => Boolean(pipeline?.stages?.length);

const findPipelineForProduct = (product: Product | undefined, pipelines: CrmLeadPipelineDto[]) => {
  if (!product) return pipelines.find(p => p.isDefault) || pipelines[0] || null;

  return (
    pipelines.find(p => p.uid === product.defaultPipelineUid) ||
    pipelines.find(p => product.defaultPipelineName && p.name === product.defaultPipelineName) ||
    pipelines.find(p => p.isDefault) ||
    pipelines[0] ||
    null
  );
};

export default function CreateLeadScreen({ onBack, onSave, pipelines, products, channels, leads, forms }: CreateLeadScreenProps) {
  const defaultOwner = mockUsers[0];
  const [formData, setFormData] = useState<Partial<CrmLeadDto>>({
    consumerFirstName: '',
    consumerLastName: '',
    consumerEmail: '',
    consumerPhone: '',
    company: '',
    internalStatus: 'ACTIVE',
    ownerId: defaultOwner?.uid || '',
    ownerName: defaultOwner?.name || '',
    channelUid: channels[0]?.uid || '',
    channelName: channels[0]?.name || '',
    productUid: '',
    productName: '',
    priority: 'NORMAL',
    expectedValue: '',
    customFormData: {},
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate | null>(null);
  const [derivedPipeline, setDerivedPipeline] = useState<CrmLeadPipelineDto | null>(null);
  
  // Duplicate check state
  const [duplicateLead, setDuplicateLead] = useState<CrmLeadDto | null>(null);

  // Optional first follow-up state
  const [hasFirstFollowup, setHasFirstFollowup] = useState(false);
  const [firstFollowupDate, setFirstFollowupDate] = useState('');
  const [selectedStageUid, setSelectedStageUid] = useState<string>('');

  // Auto-derive pipeline & form template when solution interest changes
  useEffect(() => {
    let active = true;

    const applyPipeline = async (pipeline: CrmLeadPipelineDto | null) => {
      if (!pipeline) {
        if (active) {
          setDerivedPipeline(null);
          setSelectedStageUid('');
        }
        return;
      }

      let resolvedPipeline = pipeline;
      if (!hasStages(resolvedPipeline)) {
        try {
          resolvedPipeline = await leadPipelineService.detail(pipeline.uid);
        } catch {
          resolvedPipeline = pipeline;
        }
      }

      if (!active) return;
      setDerivedPipeline(resolvedPipeline);
      setSelectedStageUid(resolvedPipeline.stages?.[0]?.uid || '');
    };

    if (formData.productUid) {
      const product = products.find(p => p.uid === formData.productUid);
      setSelectedProduct(product || null);
      applyPipeline(findPipelineForProduct(product, pipelines));

      if (product?.leadTemplateUid) {
        const template = forms.find(f => f.uid === product.leadTemplateUid);
        setCurrentTemplate(template || null);
      } else {
        setCurrentTemplate(null);
      }
    } else {
      setSelectedProduct(null);
      applyPipeline(findPipelineForProduct(undefined, pipelines));
      setCurrentTemplate(null);
    }

    return () => {
      active = false;
    };
  }, [formData.productUid, products, pipelines, forms]);

  // Real-time duplicate check based on email or phone
  useEffect(() => {
    const emailStr = formData.consumerEmail?.trim().toLowerCase();
    const phoneStr = formData.consumerPhone?.trim();

    if (!emailStr && !phoneStr) {
      setDuplicateLead(null);
      return;
    }

    const found = leads.find(l => {
      const emailMatch = emailStr && l.consumerEmail?.trim().toLowerCase() === emailStr;
      const phoneMatch = phoneStr && l.consumerPhone?.trim() === phoneStr;
      return emailMatch || phoneMatch;
    });

    setDuplicateLead(found || null);
  }, [formData.consumerEmail, formData.consumerPhone, leads]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'channelUid') {
      const channel = channels.find(c => c.uid === value);
      setFormData(prev => ({ ...prev, channelUid: value, channelName: channel?.name || '' }));
    } else if (name === 'productUid') {
      const product = products.find(p => p.uid === value);
      setFormData(prev => ({ ...prev, productUid: value, productName: product?.name || '' }));
    } else if (name === 'ownerId') {
      const user = mockUsers.find(u => u.uid === value);
      setFormData(prev => ({ ...prev, ownerId: value, ownerName: user?.name || '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFormData: {
        ...(prev.customFormData || {}),
        [fieldId]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!formData.consumerFirstName || !formData.consumerLastName) {
      alert('Please enter at least First and Last name.');
      return;
    }

    // Determine derived pipeline or fall back to default
    const pipeline = derivedPipeline || pipelines.find(p => p.isDefault) || pipelines[0];
    const initialStage = pipeline?.stages?.find(s => s.uid === selectedStageUid) || pipeline?.stages?.[0];

    if (!pipeline || !initialStage) {
      alert('Could not resolve a pipeline or initial stage for lead ingestion.');
      return;
    }

    // Auto-populate some predefined tasks based on the initial stage's task templates
    const initialStageTasks = initialStage.taskTemplates?.map(tt => ({
      uid: tt.uid + '_' + Math.random().toString(36).substr(2, 4),
      title: tt.title,
      type: tt.type,
      required: tt.required,
      completed: false,
      isManual: false,
      createdAt: new Date().toISOString()
    })) || [];

    try {
      const savedLead = await leadService.create({
        ...formData,
        pipelineUid: pipeline.uid,
        currentPipelineStageUid: initialStage.uid,
      });

      onSave({
        ...formData as CrmLeadDto,
        ...savedLead,
        uid: savedLead.uid || `L-${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
        referenceNo: savedLead.referenceNo || `REF-${Math.floor(1000 + Math.random() * 90000)}`,
        leadDate: savedLead.leadDate || new Date().toISOString(),
        productUid: savedLead.productUid || formData.productUid || '',
        productName: savedLead.productName || formData.productName || selectedProduct?.name || '',
        productEnum: savedLead.productEnum || selectedProduct?.productEnum || '',
        pipelineUid: savedLead.pipelineUid || pipeline.uid,
        pipelineName: savedLead.pipelineName || pipeline.name,
        currentPipelineStageUid: savedLead.currentPipelineStageUid || initialStage.uid,
        currentPipelineStageName: savedLead.currentPipelineStageName || initialStage.stageName,
        createdAt: savedLead.createdAt || new Date().toISOString(),
        updatedAt: savedLead.updatedAt || new Date().toISOString(),
        lastActivityAt: savedLead.lastActivityAt || new Date().toISOString(),
        nextFollowupAt: savedLead.nextFollowupAt || (hasFirstFollowup && firstFollowupDate ? new Date(firstFollowupDate).toISOString() : undefined),
        generalNotes: savedLead.generalNotes?.length ? savedLead.generalNotes : [],
        stageHistory: savedLead.stageHistory?.length ? savedLead.stageHistory : [
          {
            fromStageName: 'PRE_INTAKE',
            toStageName: savedLead.currentPipelineStageName || initialStage.stageName,
            movedByName: 'Global Ingest Port',
            movedAt: new Date().toISOString(),
            durationMinutes: 0,
            isBackward: false,
            isSkip: false,
            isTerminal: !!initialStage.isTerminal,
            reasonNote: 'Lead created, initiated pipeline.'
          }
        ],
        attachments: savedLead.attachments || [],
        assignees: savedLead.assignees || [],
        tags: savedLead.tags || [],
        isRejected: savedLead.isRejected || false,
        isConverted: savedLead.isConverted || false,
        isDuplicate: savedLead.isDuplicate || !!duplicateLead,
        createdByName: savedLead.createdByName || 'Current Owner',
        stageTasks: savedLead.stageTasks?.length ? savedLead.stageTasks : initialStageTasks
      });
    } catch (err) {
      console.error("Failed to save lead to backend:", err);
      // Fallback: save locally
      onSave({
        ...formData as CrmLeadDto,
        uid: `L-${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
        referenceNo: `REF-${Math.floor(1000 + Math.random() * 90000)}`,
        leadDate: new Date().toISOString(),
        pipelineUid: pipeline.uid,
        pipelineName: pipeline.name,
        currentPipelineStageUid: initialStage.uid,
        currentPipelineStageName: initialStage.stageName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        nextFollowupAt: hasFirstFollowup && firstFollowupDate ? new Date(firstFollowupDate).toISOString() : undefined,
        generalNotes: [],
        stageHistory: [
          {
            fromStageName: 'PRE_INTAKE',
            toStageName: initialStage.stageName,
            movedByName: 'Global Ingest Port',
            movedAt: new Date().toISOString(),
            durationMinutes: 0,
            isBackward: false,
            isSkip: false,
            isTerminal: !!initialStage.isTerminal,
            reasonNote: 'Lead created, initiated pipeline.'
          }
        ],
        attachments: [],
        assignees: [],
        tags: [],
        isRejected: false,
        isConverted: false,
        isDuplicate: !!duplicateLead,
        createdByName: 'Current Owner',
        stageTasks: initialStageTasks
      });
    }
  };

  return (
    <div data-testid="jaldee-leads-create-lead-page" className="h-full flex flex-col bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar overflow-y-auto pb-24 relative space-y-6">
      <PageHeader
        back={{ label: 'Back to List', href: '/jaldee-leads/leads' }}
        onNavigate={onBack}
        title="New Business Opportunity"
        subtitle="Initialize a new lead record into the sales matrix"
        actions={
          <div className="hidden md:flex items-center gap-3 rounded-xl border border-indigo-100 bg-white px-4 py-2">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 leading-none">Form Mode</p>
              <p className="text-xs font-semibold text-indigo-600 mt-1">Interactive Ingestion</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ICONS.AI className="w-4 h-4 animate-pulse" />
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          
          <div className="space-y-8 xl:col-span-2">
            {/* Live Duplicate Warning */}
            {duplicateLead && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-rose-800 flex items-start gap-4 shadow-sm animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                  <ICONS.SAVE className="w-5 h-5 text-rose-700" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Potential Duplicate Detected</h4>
                  <p className="text-xs font-medium text-rose-600 mt-1">
                    A record with matching contact details already exists: <b>{duplicateLead.consumerFirstName} {duplicateLead.consumerLastName}</b> (Ref: {duplicateLead.referenceNo}).
                  </p>
                  <Button 
                    id={`jaldee-leads-duplicate-${duplicateLead.uid}-view-button`}
                    data-testid={`jaldee-leads-duplicate-${duplicateLead.uid}-view-button`}
                    onClick={() => onBack()}
                    variant="danger"
                    size="sm"
                    className="mt-3 text-sm font-semibold rounded-lg shadow-md"
                  >
                     View Existing Lead
                  </Button>
                </div>
              </div>
            )}

            {/* Section 1: Identity */}
            <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <ICONS.USER className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Core Identity</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  data-testid="jaldee-leads-create-lead-first-name-input"
                  type="text"
                  id="firstName"
                  name="consumerFirstName"
                  label="Given Name *"
                  value={formData.consumerFirstName}
                  onChange={handleChange}
                  placeholder="e.g. Robert"
                />

                <Input 
                  data-testid="jaldee-leads-create-lead-last-name-input"
                  type="text"
                  id="lastName"
                  name="consumerLastName"
                  label="Family Name *"
                  value={formData.consumerLastName}
                  onChange={handleChange}
                  placeholder="e.g. Oppenheimer"
                />

                <Input 
                  data-testid="jaldee-leads-create-lead-email-input"
                  type="email"
                  id="email"
                  name="consumerEmail"
                  label="Email Coordination"
                  value={formData.consumerEmail}
                  onChange={handleChange}
                  placeholder="robert@example.com"
                />

                <PhoneInput 
                  data-testid="jaldee-leads-create-lead-phone-input"
                  id="phone"
                  label="Mobile Bridge"
                  value={{
                    countryCode: '+1',
                    number: '',
                    e164Number: formData.consumerPhone || '',
                  }}
                  onChange={(val) => {
                    setFormData(prev => ({
                      ...prev,
                      consumerPhone: val.e164Number || (val.countryCode + val.number)
                    }));
                  }}
                  numberPlaceholder="+1 (555) 000-0000"
                />

                <Input 
                  data-testid="jaldee-leads-create-lead-company-input"
                  type="text"
                  id="company"
                  name="company"
                  label="Corporate Association"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Entity Name or Individual"
                  containerClassName="md:col-span-2"
                />
              </div>
            </section>

            {/* Section 2: Engagement Metadata */}
            <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <ICONS.CHANNELS className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Workflow Engagement</h3>
              </div>

              <div className="space-y-6">
                 {/* Product Selection First */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Select 
                     data-testid="jaldee-leads-create-lead-product-select"
                     id="productSelect"
                     name="productUid"
                     label="Solution Interest (Product)"
                     value={formData.productUid}
                     onChange={handleChange}
                     options={[
                       { value: "", label: "No Product Selected" },
                       ...products.map(p => ({ value: p.uid, label: p.name }))
                     ]}
                   />
                 </div>

                 {/* Dynamic Derivation Card (Workflow derived from Product) */}
                 {derivedPipeline && (
                   <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                      <div>
                         <p className="text-xs font-semibold text-indigo-500 leading-none">Derived sales workflow (Pipeline)</p>
                         <h4 className="text-base font-semibold text-slate-900 mt-1.5">{derivedPipeline.name}</h4>
                         <p className="text-sm text-slate-500 font-medium mt-1">First Stage: <span className="font-bold text-indigo-600">{derivedPipeline.stages?.[0]?.stageName}</span></p>
                      </div>
                      <span className="text-sm font-semibold bg-white border border-indigo-100 px-3 py-1.5 rounded-xl text-indigo-600">
                        {derivedPipeline.stages?.length} stages
                      </span>
                   </div>
                 )}

                 {/* Channel Selection (Filtered by Product) */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Select 
                     data-testid="jaldee-leads-create-lead-channel-select"
                     id="channelSelect"
                     name="channelUid"
                     label="Source Ingestion Channel"
                     value={formData.channelUid}
                     onChange={handleChange}
                     disabled={!formData.productUid}
                     options={[
                       { value: "", label: "Select Channel" },
                       ...channels
                         .filter(c => c.productUids?.includes(formData.productUid) || c.productUid === formData.productUid)
                         .map(c => ({ value: c.uid, label: c.name }))
                     ]}
                   />
                 </div>
              </div>

              {/* Dynamic Template Fields */}
              {currentTemplate && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                   <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className="text-sm font-semibold text-indigo-600">Template Fields: {currentTemplate.name}</h4>
                        <p className="text-sm font-bold text-slate-400 mt-1">Extended metadata mapping for this category</p>
                      </div>
                      <ICONS.DOCUMENT className="w-5 h-5 text-indigo-400" />
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {currentTemplate.fields.map(field => {
                        const fieldLabel = `${field.label}${field.required ? ' *' : ''}`;
                        if (field.type === 'select') {
                          return (
                            <Select
                              data-testid={`jaldee-leads-create-lead-template-field-${field.id}`}
                              key={field.id}
                              id={`field-${field.id}`}
                              label={fieldLabel}
                              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                              options={[
                                { value: "", label: "Select Option" },
                                ...(field.options || []).map(opt => ({ value: opt, label: opt }))
                              ]}
                            />
                          );
                        }
                        if (field.type === 'checkbox') {
                          return (
                            <div key={field.id} className="flex flex-col gap-1.5 justify-end h-full">
                              <span className="ds-form-label">{fieldLabel}</span>
                              <div className="flex items-center gap-3 h-[38px] px-3 bg-slate-50 border border-slate-200 rounded-[var(--radius-control)]">
                                <Checkbox
                                  data-testid={`jaldee-leads-create-lead-template-field-${field.id}`}
                                  id={`field-${field.id}`}
                                  onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                                  label="Confirm / Yes"
                                />
                              </div>
                            </div>
                          );
                        }
                        return (
                          <Input
                            data-testid={`jaldee-leads-create-lead-template-field-${field.id}`}
                            key={field.id}
                            type={field.type}
                            id={`field-${field.id}`}
                            label={fieldLabel}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          />
                        );
                      })}
                   </div>
                </div>
              )}
            </section>

            {/* Initial Pipeline Stage Selection */}
            <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ICONS.PIPELINES className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Initial Pipeline Stage</h3>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 leading-normal">
                  Select the onboarding stage for this new lead registration:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(derivedPipeline || pipelines.find(p => p.isDefault) || pipelines[0])?.stages?.map((stage) => {
                    const isSelected = selectedStageUid === stage.uid;
                    return (
                      <Button
                        id={`jaldee-leads-create-lead-stage-${stage.uid}-button`}
                        data-testid={`jaldee-leads-create-lead-stage-${stage.uid}-button`}
                        data-active={isSelected}
                        key={stage.uid}
                        type="button"
                        onClick={() => setSelectedStageUid(stage.uid)}
                        variant="outline"
                        className={cn(
                          "p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between min-h-28 relative overflow-hidden group",
                          isSelected 
                            ? "bg-indigo-50/40 border-indigo-600 shadow-md shadow-indigo-500/5 col-span-1" 
                            : "bg-slate-50 border-slate-100 hover:border-slate-300 hover:bg-white"
                        )}
                      >
                        <div className="flex justify-between items-start w-full relative z-10">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            isSelected ? "bg-indigo-600" : "bg-slate-300"
                          )} style={{ backgroundColor: isSelected ? undefined : stage.color }} />
                          {isSelected && (
                            <span className="text-xs font-semibold text-indigo-600 bg-white border border-indigo-100 px-1 py-0.5 rounded">START</span>
                          )}
                        </div>
                        <div className="relative z-10 mt-3 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900 leading-snug break-words">{stage.stageName}</h4>
                          <p className="text-xs font-bold text-slate-400 mt-1 leading-snug">Rule: {stage.movementRule || 'None'}</p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar / Meta Column */}
          <div className="space-y-8">
             <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <h4 className="text-sm font-semibold text-slate-900">Assignment</h4>
                  <ICONS.USER_CHECK className="w-5 h-5 text-indigo-600" />
                </div>

                <div className="space-y-4">
                   <Select 
                      data-testid="jaldee-leads-create-lead-owner-select"
                      id="ownerSelect"
                      name="ownerId"
                      label="Internal Lead Owner"
                      value={formData.ownerId}
                      onChange={handleChange}
                      options={mockUsers.map(u => ({ value: u.uid, label: u.name }))}
                   />

                   <div className="space-y-1.5 text-xs font-bold text-slate-500">
                      <label className="ds-form-label">Initial Priority</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                         {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => (
                           <Button 
                              id={`jaldee-leads-create-lead-priority-${p.toLowerCase()}-button`}
                              data-testid={`jaldee-leads-create-lead-priority-${p.toLowerCase()}-button`}
                              data-active={formData.priority === p}
                              key={p}
                              type="button"
                              onClick={() => setFormData(f => ({ ...f, priority: p as any }))}
                              variant={formData.priority === p ? "primary" : "outline"}
                              className="py-2.5 h-10 text-sm font-semibold transition-all rounded-xl"
                           >
                              {p}
                           </Button>
                         ))}
                      </div>
                   </div>
                </div>
             </section>

             <section className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-indigo-500 opacity-20 blur-3xl rounded-full"></div>
                <div className="relative z-10 space-y-6">
                   <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-indigo-400">Estimate</h4>
                      <ICONS.MONEY className="w-5 h-5 text-indigo-400" />
                   </div>
                   
                   <div className="space-y-4">
                      <Input 
                         data-testid="jaldee-leads-create-lead-expected-value-input"
                         type="number"
                         id="expectedValue"
                         name="expectedValue"
                         label={<span className="text-sm font-semibold text-slate-400">Deal Value ($)</span>}
                         value={formData.expectedValue}
                         onChange={handleChange}
                         placeholder="0.00"
                         className="bg-white/10 border border-white/10 text-white focus:bg-white/20 font-mono placeholder:text-white/20 h-12 text-xl"
                      />
                      
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                         <p className="text-xs font-bold text-slate-400 mb-2">Sync Probability</p>
                         <p className="text-xs text-slate-300 leading-relaxed font-medium">Auto-calibrated to <b>10%</b> upon record creation.</p>
                      </div>
                   </div>
                </div>
             </section>

             <div className="bg-white border border-slate-200 rounded-3xl p-8 text-slate-900 shadow-sm">
                <h4 className="text-xs font-semibold text-indigo-600 mb-4">Automation Note</h4>
                <p className="text-sm font-bold leading-relaxed text-slate-500">Saving this record will initiate the sales pipeline and alert the assigned owner immediately.</p>
             </div>
          </div>
      </div>

      <div className="sticky bottom-0 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
         <Button 
            id="jaldee-leads-create-lead-cancel-button"
            data-testid="jaldee-leads-create-lead-cancel-button" 
            onClick={onBack} 
            variant="outline"
            className="px-6 h-11 rounded-2xl text-xs font-semibold active-scale"
         >
            Cancel
         </Button>
         <Button 
            id="jaldee-leads-create-lead-save-button"
            data-testid="jaldee-leads-create-lead-save-button"
            onClick={handleSave} 
            variant="primary"
            className="px-10 h-11 rounded-2xl text-xs font-semibold active-scale"
          >
            Create Lead & Start Pipeline
         </Button>
      </div>
    </div>
  );
}
