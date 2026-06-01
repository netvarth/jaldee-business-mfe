import React, { useState, useEffect } from 'react';
import { Channel, CrmLeadDto, Product, CrmLeadPipelineDto } from '../types';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { format } from '../lib/dateUtils';
import { mockForms } from '../mockData';
import { PageHeader, SectionCard, Button, Input, Select, Checkbox } from "@jaldee/design-system";

interface ChannelDetailScreenProps {
  channel: Channel;
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  products: Product[];
  onBack: () => void;
  onNavigate: (route: string, selection?: any) => void;
}

export default function ChannelDetailScreen({ 
  channel, 
  leads, 
  pipelines, 
  products, 
  onBack, 
  onNavigate 
}: ChannelDetailScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [localLeads, setLocalLeads] = useState<CrmLeadDto[]>([]);

  // Sync leads initially
  useEffect(() => {
    setLocalLeads(leads.filter(l => l.channelUid === channel.uid));
  }, [leads, channel.uid]);

  // Lead preview interactive form simulator states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Filter local simulated leads
  const filteredLeads = localLeads.filter(l => 
    (l.referenceNo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (l.consumerFirstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (l.consumerLastName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Derive workflow mapping configurations
  const mappedProduct = products.find(p => p.uid === channel.productUid) || products[0];
  const derivedPipeline = pipelines.find(p => p.uid === mappedProduct?.defaultPipelineUid) || pipelines[0];
  const initialStage = derivedPipeline?.stages?.[0];
  const currentTemplate = mockForms.find(f => f.uid === mappedProduct?.leadTemplateUid) || mockForms[0];
  const productNames = channel.productName || (products.filter(p => channel.productUids?.includes(p.uid)).map(p => p.name).join(", ")) || 'NONE';

  const handleSimulatedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      alert("Please fill in First Name, Last Name, and Email to test ingestion.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newLead: CrmLeadDto = {
        uid: "L-" + Math.random().toString(36).substr(2, 7).toUpperCase(),
        referenceNo: "INGEST-" + Math.floor(1000 + Math.random() * 9000),
        consumerFirstName: firstName,
        consumerLastName: lastName,
        consumerEmail: email,
        consumerPhone: phone || "1-800-DEFAULT",
        leadDate: new Date().toISOString(),
        pipelineUid: derivedPipeline?.uid || "p-standard",
        pipelineName: derivedPipeline?.name || "Standard Sales",
        currentPipelineStageUid: initialStage?.uid || "stg-intake",
        currentPipelineStageName: initialStage?.stageName || "Prospect Intake",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        generalNotes: [
          {
            id: `note-${Date.now()}`,
            notes: "Captured instantly via Live Web Link Preview Simulator.",
            createdDate: new Date().toISOString()
          }
        ],
        isConverted: false,
        isRejected: false,
        isDuplicate: false,
        createdByName: "Public Web Form API",
        channelType: channel.type,
        productEnum: mappedProduct?.productEnum || "PREMIUM_PLAN",
        ownerId: "agent-default",
        ownerName: "System Default Agent",
        assignees: [],
        tags: ["api-web", "preview-test"],
        internalStatus: "ACTIVE",
        stageHistory: [
          {
            fromStageName: 'PRE_INTAKE',
            toStageName: initialStage?.stageName || "Prospect Intake",
            movedByName: 'Web Form Optin API',
            movedAt: new Date().toISOString(),
            durationMinutes: 0,
            isBackward: false,
            isSkip: false,
            isTerminal: false,
            reasonNote: 'Instant ingestion trigger activated from simulated landing preview.'
          }
        ],
        attachments: [],
        channelUid: channel.uid,
        channelName: channel.name,
        productUid: mappedProduct?.uid || "",
        productName: mappedProduct?.name || "",
        priority: "NORMAL",
        customFormData: customFieldValues
      };

      setLocalLeads(prev => [newLead, ...prev]);
      setIsSubmitting(false);
      setSubmissionSuccess(true);

      // Reset test simulator fields
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCustomFieldValues({});

      setTimeout(() => {
        setSubmissionSuccess(false);
      }, 4000);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900">

      {/* Page Header — matches LeadDetailScreen standard */}
      <div className="px-4 py-3 md:px-6 md:py-4 shrink-0">
        <PageHeader
          title={`Node: ${channel.name}`}
          subtitle={`Ingestion Gateway Controller • ${channel.type || 'ONLINE'} • ${leads.filter(l => l.channelUid === channel.uid).length} Leads Captured`}
          back={{ label: "Channels", href: "#" }}
          onNavigate={onBack}
          actions={
            <Button
              onClick={onBack}
              variant="primary"
              className="text-sm font-semibold active-scale"
            >
              Exit Gateway
            </Button>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
          
          {/* 2. Top Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Bento 1: Connection & Link Generator */}
            <div className="md:col-span-8 bg-slate-900 rounded-[32px] p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-xl shadow-slate-900/10 min-h-[220px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.15),transparent)] pointer-events-none" />
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-semibold text-indigo-400">
                    Ingestion Mapping Schema
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2.5 py-1 rounded-lg leading-none font-mono">
                    SECURE CAPTURE LINK: LIVE
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-white/5 pb-6 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Assigned Offer Sku
                    </label>
                    <p className="text-xs font-semibold text-white break-words">
                      {productNames}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Auto Routing Flow
                    </label>
                    <p className="text-xs font-semibold text-white truncate">
                      {derivedPipeline ? derivedPipeline.name : 'NONE'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Landing Target
                    </label>
                    <p className="text-xs font-semibold text-indigo-400 truncate">
                      {initialStage ? initialStage.stageName : 'ASSESSING'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-bold font-mono">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 mb-1">
                      Cryptographic ID
                    </span>
                    <span className="text-indigo-200 font-semibold text-sm">
                      CH-{channel.uid.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-500 mb-1">
                      Ingestion Modality
                    </span>
                    <span className="text-white font-semibold text-sm">
                      {channel.type} Gateway
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3 shadow-inner">
                <code className="text-xs font-bold text-indigo-300 truncate mr-4">
                  https://capture.leados.com/optin?ch={channel.uid}
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://capture.leados.com/optin?ch=${channel.uid}`);
                    alert("Shareable ingestion link copied to clipboard!");
                  }}
                  className="p-2.5 bg-indigo-600 hover:bg-white text-white hover:text-slate-900 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/25 active-scale"
                  title="Copy Shareable Ingestion URL"
                >
                  <ICONS.CLONE className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bento 2: Static QR Generator */}
            <SectionCard className="md:col-span-4 p-8 flex flex-col items-center justify-center relative group text-slate-800 font-bold text-xs leading-relaxed hover:border-indigo-250 transition-all min-h-[220px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 md:w-36 md:h-36 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-3 shadow-inner group-hover:scale-[1.03] transition-transform">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://capture.leados.com/optin?ch=${channel.uid}`} 
                    alt="Ingestion Route QR Screen"
                    className="w-full h-full mix-blend-multiply opacity-90 rounded-lg pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center">
                  <p className="text-slate-800 font-semibold text-sm">Scan to Enrol</p>
                  <p className="text-slate-400 font-bold text-xs mt-1">Direct Mobile Capture Route</p>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* 3. Main Operational Sections Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Col: Web Link Interactive Preview Simulator (Col-span 5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="px-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Direct Ingest Web Form Preview
                </h3>
                <p className="text-sm font-bold text-slate-400">
                  Real-time viewport preview of the live consumer submission site
                </p>
              </div>

              {/* Arc Browser Mockup */}
              <div className="bg-slate-200/80 rounded-[32px] border-2 border-slate-300/60 overflow-hidden shadow-2xl relative">
                
                {/* Browser Tab Chrome */}
                <div className="bg-slate-100/90 border-b border-slate-250/70 px-4 py-3 flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  </div>
                  
                  <div className="flex-1 bg-white/80 border border-slate-200/80 rounded-lg py-1 px-3 flex items-center gap-1.5 justify-center text-xs font-mono select-none">
                    <ICONS.SETTINGS className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-emerald-600 font-bold truncate">
                      https://capture.leados.com/optin?ch={channel.uid.substr(0, 6)}
                    </span>
                  </div>
                </div>

                {/* Simulated Opt-in Form Viewport */}
                <div className="bg-white p-6 min-h-[420px] max-h-[580px] overflow-y-auto no-scrollbar flex flex-col justify-between relative">
                  
                  {submissionSuccess ? (
                    <div 
                      className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 shadow-md">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path 
                            strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" 
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">Capture Complete</h4>
                        <p className="text-sm text-slate-500 font-bold mt-1.5 leading-relaxed">
                          Simulated lead was successfully ingested and has landed in your pipeline's starting stage.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl">
                        Active State Update Triggered
                      </span>
                    </div>
                  ) : (
                    <form 
                      onSubmit={handleSimulatedSubmit}
                      className="space-y-4"
                    >
                      {/* Dynamic Landing Header */}
                      <div className="border-b border-slate-100 pb-4 text-center">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900">
                          {productNames !== 'NONE' ? productNames : 'Inquiry Portal'}
                        </h4>
                        <p className="text-xs font-bold text-slate-400 mt-1">
                          {channel.name} Official Opt-in Form
                        </p>
                      </div>

                      {/* Traditional consumer fields */}
                      <div className="grid grid-cols-2 gap-3">
                        <Input 
                          label="First Name *"
                          type="text"
                          required
                          placeholder="John"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                        />
                        <Input 
                          label="Last Name *"
                          type="text"
                          required
                          placeholder="Doe"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                        />
                      </div>

                      <Input 
                        label="Email Address *"
                        type="email"
                        required
                        placeholder="john.doe@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />

                      <Input 
                        label="Contact Phone Number"
                        type="tel"
                        placeholder="+1 (555) 019-2834"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />

                      {/* Rendering mapped form template custom fields */}
                      {currentTemplate && currentTemplate.fields && currentTemplate.fields.map((field) => (
                        <div key={field.id}>
                          {field.type === 'select' ? (
                            <Select 
                              label={`${field.label} ${field.required ? '*' : ''}`}
                              value={customFieldValues[field.id] || ''}
                              onChange={e => setCustomFieldValues({...customFieldValues, [field.id]: e.target.value})}
                              options={[
                                { value: '', label: 'Select Ingest Option' },
                                ...(field.options?.map(opt => ({ value: opt, label: opt })) || [])
                              ]}
                            />
                          ) : field.type === 'checkbox' ? (
                            <Checkbox 
                              label={`${field.label} - Yes, confirm option selection`}
                              checked={!!customFieldValues[field.id]}
                              onChange={e => setCustomFieldValues({...customFieldValues, [field.id]: e.target.checked})}
                            />
                          ) : (
                            <Input 
                              label={`${field.label} ${field.required ? '*' : ''}`}
                              type={field.type === 'number' ? 'number' : 'text'}
                              required={field.required}
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              value={customFieldValues[field.id] || ''}
                              onChange={e => setCustomFieldValues({...customFieldValues, [field.id]: e.target.value})}
                            />
                          )}
                        </div>
                      ))}

                      <Button 
                        type="submit"
                        disabled={isSubmitting}
                        variant="primary"
                        className="w-full py-4 text-sm font-semibold mt-6"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Validating Ingestion...
                          </>
                        ) : 'Submit Target Test Lead'}
                      </Button>
                    </form>
                  )}

                  <div className="text-center pt-4 text-xs font-mono text-slate-400 leading-loose">
                    Powered by LeadOS secure form rendering protocol.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Captured Leads Log (Col-span 7) */}
            <div className="lg:col-span-7 space-y-4">
              <SectionCard className="overflow-hidden flex flex-col justify-between p-0">
                
                {/* Search / Filter Section */}
                <div className="px-6 py-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 text-slate-800">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 leading-none">
                      Ingestion Stream Nodes
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-1.5 leading-relaxed">
                      Active captured leads ({localLeads.length})
                    </p>
                  </div>
                  
                  <Input 
                    type="text" 
                    placeholder="Filter captured leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<ICONS.SEARCH className="w-4 h-4 text-slate-400" />}
                    fullWidth={false}
                    className="w-52"
                  />
                </div>

                {/* Table list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-slate-800">
                    <thead className="bg-slate-50/50 text-xs font-semibold text-slate-400 border-b border-slate-200 select-none">
                      <tr>
                        <th className="px-6 py-4.5 text-left font-semibold">UID / Registry Date</th>
                        <th className="px-6 py-4.5 text-left font-semibold">Contract Consumer</th>
                        <th className="px-6 py-4.5 text-left font-semibold">Lifecycle State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.uid} className="hover:bg-indigo-50/20 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-mono font-semibold text-slate-900 text-xs">
                                {lead.referenceNo}
                              </span>
                              <span className="text-xs font-semibold text-slate-400 leading-none mt-1">
                                Registered: {format(new Date(lead.createdAt), 'dd MMMM yyyy')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-955 text-xs">
                                {lead.consumerFirstName} {lead.consumerLastName}
                              </span>
                              <span className="text-xs font-mono text-slate-400 mt-0.5">
                                {lead.consumerEmail}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-xs font-semibold border leading-none font-bold",
                                lead.isConverted 
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-150" 
                                  : "bg-indigo-50 text-indigo-700 border-indigo-150"
                              )}>
                                {lead.isConverted ? 'Deal Closed / WON' : lead.currentPipelineStageName || 'Assessing'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-24 text-center text-slate-400 text-xs font-bold italic leading-loose">
                            No captured leads registered under this ingress point.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Inline Status Footer */}
                <div className="bg-slate-50 border-t border-slate-100 p-5 flex items-center justify-between text-xs font-bold text-slate-400 leading-none select-none">
                  <span>Stream Controller Active</span>
                  <span className="text-emerald-500 font-semibold">● SSL INTAKE SECURED</span>
                </div>
              </SectionCard>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
