import React, { useMemo, useState, useEffect } from 'react';
import { Channel, CrmLeadDto, Product, CrmLeadPipelineDto } from '../types';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { format } from '../lib/dateUtils';
import { mockForms } from '../mockData';
import { PageHeader, SectionCard, Button, Input, Select, Checkbox, DataTable, EmptyState, Badge, Dialog } from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";

interface ChannelDetailScreenProps {
  channel: Channel;
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  products: Product[];
  forms: FormTemplate[];
  onBack: () => void;
  onNavigate: (route: string, selection?: any) => void;
}

export default function ChannelDetailScreen({ 
  channel, 
  leads, 
  pipelines, 
  products, 
  forms,
  onBack, 
  onNavigate 
}: ChannelDetailScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [localLeads, setLocalLeads] = useState<CrmLeadDto[]>([]);
  
  // Modal state
  const [previewProductUid, setPreviewProductUid] = useState<string | null>(null);

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

  // Resolve Linked Products
  const linkedProducts = useMemo(() => {
    let p = products.filter(prod => channel.productUids?.includes(prod.uid));
    if (p.length === 0 && channel.productUid) {
      p = products.filter(prod => prod.uid === channel.productUid);
    }
    if (p.length === 0 && products.length > 0) {
      p = [products[0]];
    }
    return p;
  }, [products, channel]);

  // Currently Previewed Product
  const previewProduct = linkedProducts.find(p => p.uid === previewProductUid) || linkedProducts[0];
  const derivedPipeline = pipelines.find(p => p.uid === previewProduct?.defaultPipelineUid) || pipelines[0];
  const workflowName = previewProduct?.defaultPipelineName || derivedPipeline?.name || 'NONE';
  const initialStage = derivedPipeline?.stages?.[0];
  const currentTemplate = forms.find(f => f.uid === previewProduct?.leadTemplateUid) || forms.find(f => f.uid === derivedPipeline?.leadTemplateUid) || forms[0];

  const leadColumns = useMemo<ColumnDef<CrmLeadDto>[]>(
    () => [
      {
        key: "referenceNo",
        header: "Reference ID",
        width: 180,
        render: (lead) => (
          <div 
            className="flex flex-col cursor-pointer group"
            onClick={() => onNavigate(`leads/${lead.uid}`)}
          >
            <span className="text-[var(--color-primary)] font-[var(--font-weight-medium)] leading-none mb-1 group-hover:underline">
              {lead.referenceNo}
            </span>
            <span className="text-[var(--color-text-secondary)] tracking-wider">
              Created: {format(new Date(lead.createdAt), 'dd MMM yyyy HH:mm')}
            </span>
          </div>
        ),
      },
      {
        key: "productName",
        header: "Product",
        width: 200,
        render: (lead) => (
          <Badge variant="info">
            {lead.productName || 'GENERAL INQUIRY'}
          </Badge>
        ),
      },
      {
        key: "consumerFirstName",
        header: "Lead Contact Detail",
        render: (lead) => (
          <div className="flex flex-col">
            <span className="text-[var(--color-text-primary)] leading-none mb-1">
              {lead.consumerFirstName} {lead.consumerLastName}
            </span>
            <span className="text-[var(--color-text-secondary)] tracking-wider">
              {lead.consumerEmail} • {lead.consumerPhone}
            </span>
          </div>
        ),
      },
      {
        key: "currentPipelineStageName",
        header: "Pipeline Stage",
        width: 180,
        render: (lead) => (
          <Badge variant={lead.isConverted ? "success" : "info"} className="bg-[var(--color-surface)]">
            {lead.isConverted ? 'Deal Closed' : (lead.currentPipelineStageName || 'New Inquiry')}
          </Badge>
        ),
      },
    ],
    [onNavigate],
  );

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
        referenceNo: "REF-" + Math.floor(1000 + Math.random() * 9000),
        consumerFirstName: firstName,
        consumerLastName: lastName,
        consumerEmail: email,
        consumerPhone: phone || "1-800-DEFAULT",
        leadDate: new Date().toISOString(),
        pipelineUid: derivedPipeline?.uid || "p-standard",
        pipelineName: workflowName !== 'NONE' ? workflowName : "Standard Sales",
        currentPipelineStageUid: initialStage?.uid || "stg-intake",
        currentPipelineStageName: initialStage?.stageName || "New Inquiry",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        generalNotes: [],
        isConverted: false,
        isRejected: false,
        isDuplicate: false,
        createdByName: "Public Web Form API",
        channelType: channel.channelType,
        productEnum: previewProduct?.productEnum || "PREMIUM_PLAN",
        ownerId: "agent-default",
        ownerName: "System Default Agent",
        assignees: [],
        tags: ["api-web", "preview-test"],
        internalStatus: "ACTIVE",
        stageHistory: [],
        attachments: [],
        channelUid: channel.uid,
        channelName: channel.name,
        productUid: previewProduct?.uid || "",
        productName: previewProduct?.name || "",
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
        setPreviewProductUid(null); // Close modal
      }, 2000);
    }, 1500);
  };

  return (
    <div data-testid={`jaldee-leads-channel-${channel.uid}-detail-page`} className="h-full flex flex-col bg-[var(--color-surface-secondary)] p-4 sm:p-6 md:p-8 no-scrollbar overflow-y-auto pb-24 relative space-y-6">

      {/* Page Header */}
      <PageHeader
        title={`${channel.name} (${channel.channelType})`}
        back={{ label: "Channel Details", href: "#" }}
        onNavigate={onBack}
        actions={
          <Button
            id={`jaldee-leads-channel-${channel.uid}-deactivate-button`}
            data-testid={`jaldee-leads-channel-${channel.uid}-deactivate-button`}
            onClick={() => alert('Deactivate feature coming soon')}
            variant="outline"
            className="border-rose-500 text-rose-600 hover:bg-rose-50 rounded-lg px-4"
          >
            Deactivate Channel
          </Button>
        }
      />

      <div className="w-full space-y-[var(--space-8)] mt-[var(--space-6)] mb-[var(--space-8)]">
          
        {/* Section 1: Channel Source Details */}
        <SectionCard title="Channel Hub" className="mb-[var(--space-6)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-6)]">
            <div className="max-w-xl">
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] leading-[var(--line-height-base)]">
                This channel is linked with <strong className="text-[var(--color-text-primary)]">{linkedProducts.length} of your products</strong>. New leads registered through these links will automatically appear in your pipelines.
              </p>
            </div>
            
            <div className="flex gap-[var(--space-4)] shrink-0">
              <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-3)] text-center bg-[var(--color-surface-alt)]">
                <span className="block text-[length:var(--text-xs)] text-[var(--color-text-secondary)] mb-[var(--space-1)]">
                  Channel Code
                </span>
                <span className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
                  {channel.uid.slice(-4)}
                </span>
              </div>
              <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-[var(--space-4)] py-[var(--space-3)] text-center bg-[var(--color-surface-alt)]">
                <span className="block text-[length:var(--text-xs)] text-[var(--color-text-secondary)] mb-[var(--space-1)]">
                  Location
                </span>
                <span className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
                  {channel.location || 'Digital Storefront'}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Product Specific Registration Links */}
        <SectionCard title="Product Specific Registration Links" className="mb-[var(--space-6)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] mb-[var(--space-6)] leading-[var(--line-height-base)]">
            Each linked product has its own registration link. You can copy the link, scan the QR code, or view its custom form preview.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--space-6)]">
            {linkedProducts.map((prod, index) => {
              const link = `https://capture.leados.com/optin?ch=${channel.uid}&p=${prod.uid}`;
              const prodPipeline = pipelines.find(pl => pl.uid === prod.defaultPipelineUid) || pipelines[0];
              const pipelineTarget = prodPipeline?.name || 'Standard Sales';
              const targetStage = prodPipeline?.stages?.[0]?.stageName || 'New Inquiry';

              return (
                <div key={prod.uid} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-[var(--space-6)] flex flex-col justify-between hover:shadow-[var(--shadow-md)] transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-[var(--space-4)]">
                      <div className="flex items-center gap-[var(--space-2)]">
                        <Badge variant="info">
                          PRODUCT #{index + 1}
                        </Badge>
                        <span className="text-[length:var(--text-xs)] font-[var(--font-weight-medium)] text-[var(--color-text-secondary)]">
                          {prod.category || 'Category Not Set'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] mb-[var(--space-1)]">
                          Pipeline Target
                        </div>
                        <div className="text-[length:var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
                          {pipelineTarget}
                        </div>
                        <div className="text-[length:var(--text-xs)] font-[var(--font-weight-medium)] text-[var(--color-primary)] mt-[var(--space-1)]">
                          → {targetStage}
                        </div>
                      </div>
                    </div>

                    <h4 className="text-[length:var(--text-lg)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)] tracking-tight mb-[var(--space-2)]">
                      {prod.name}
                    </h4>
                    <div className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] mb-[var(--space-6)]">
                      Category: {prod.category || 'General'} • Price: ${prod.price || '0'}
                    </div>

                    <div className="text-[length:var(--text-xs)] font-[var(--font-weight-medium)] text-[var(--color-text-secondary)] mb-[var(--space-2)]">
                      Unique Registration Link URL
                    </div>
                    
                    <div className="flex gap-[var(--space-4)] items-stretch mb-[var(--space-4)]">
                      <div className="flex-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-[var(--radius-md)] flex items-center px-[var(--space-4)] overflow-hidden">
                        <code className="text-[length:var(--text-xs)] text-[var(--color-primary)] truncate font-[var(--font-family-mono)]">
                          {link}
                        </code>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(link);
                            alert("Link copied!");
                          }}
                          className="ml-auto flex-shrink-0 text-[var(--color-text-secondary)] px-2 h-auto py-1"
                        >
                          Copy
                        </Button>
                      </div>
                      <div className="w-[84px] h-[84px] shrink-0 border border-[var(--color-border)] rounded-[var(--radius-md)] p-[var(--space-1)] flex flex-col items-center justify-center bg-[var(--color-surface)]">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(link)}`}
                          alt="QR Code"
                          className="w-[48px] h-[48px] mix-blend-multiply opacity-90"
                        />
                        <span className="text-[10px] text-[var(--color-text-secondary)] mt-[var(--space-1)]">Scan</span>
                      </div>
                    </div>

                    <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] leading-[var(--line-height-base)] mb-[var(--space-6)]">
                      Share this link with customers on your website, email campaigns, or social media to capture leads.
                    </p>
                  </div>
                  
                  <div>
                    <Button
                      variant="outline"
                      onClick={() => setPreviewProductUid(prod.uid)}
                      className="w-auto text-[length:var(--text-sm)]"
                    >
                      Show Form Preview
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Section 3: Leads From This Channel */}
        <SectionCard title="Leads From This Channel" padding={false}>
          <div className="px-[var(--space-6)] py-[var(--space-5)] border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--space-4)]">
            <div>
              <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] mt-[var(--space-1)]">
                All leads captured through this channel ({localLeads.length} total)
              </p>
            </div>
            <div className="w-full sm:w-[256px]">
              <Input 
                id={`jaldee-leads-channel-${channel.uid}-captured-leads-search-input`}
                data-testid={`jaldee-leads-channel-${channel.uid}-captured-leads-search-input`}
                type="text" 
                placeholder="Filter by name, SKU or UID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<ICONS.SEARCH className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                fullWidth={true}
              />
            </div>
          </div>

          <DataTable
            data={filteredLeads}
            columns={leadColumns}
            getRowId={(lead) => lead.uid}
            emptyState={
              <EmptyState
                data-testid={`jaldee-leads-channel-${channel.uid}-captured-leads-empty-state`}
                title="No leads captured yet"
                description="Share your registration links to start capturing leads."
              />
            }
          />

          {localLeads.length > 0 && (
            <div className="bg-[var(--color-surface-alt)] border-t border-[var(--color-border)] px-[var(--space-6)] py-[var(--space-4)] flex items-center justify-between">
              <span className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
                Lead Connection: Online
              </span>
              <span className="text-[length:var(--text-xs)] font-[var(--font-weight-medium)] text-[var(--color-success)]">
                + Live Tracking
              </span>
            </div>
          )}
        </SectionCard>

      </div>

      {/* Form Preview Modal */}
      <Dialog 
        open={previewProductUid !== null} 
        onClose={() => setPreviewProductUid(null)}
        title="Form Preview Simulator"
        description={`Previewing live capture form for ${previewProduct?.name}`}
        size="md"
      >
        <div className="p-2 sm:p-4">
          {submissionSuccess ? (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 shadow-md">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-slate-900">Capture Complete</h4>
                <p className="text-slate-500 mt-1.5 leading-relaxed">
                  Simulated lead was successfully ingested and has landed in your pipeline's starting stage.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSimulatedSubmit} className="space-y-4 mt-2">
              <div className="border-b border-[var(--color-border)] pb-4 mb-4 text-center">
                <h4 className="text-[length:var(--text-lg)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
                  {previewProduct?.name} Inquiry
                </h4>
                <p className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)] mt-[var(--space-1)]">
                  {currentTemplate ? currentTemplate.name : 'Form Simulator'}
                </p>
              </div>

              {/* Only rendering fields from the assigned template */}
              {currentTemplate && currentTemplate.fields && currentTemplate.fields.length > 0 ? (
                currentTemplate.fields.map((field) => (
                <div key={field.id}>
                  {field.type === 'select' ? (
                   <Select 
                      label={`${field.label} ${field.required ? '*' : ''}`}
                      value={customFieldValues[field.id] || ''}
                      onChange={e => setCustomFieldValues({...customFieldValues, [field.id]: e.target.value})}
                      options={[
                        { value: '', label: 'Select Option' },
                        ...(field.options?.map(opt => ({ value: opt, label: opt })) || [])
                      ]}
                    />
                  ) : field.type === 'checkbox' ? (
                    <Checkbox 
                      label={`${field.label} - Yes, confirm`}
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
              ))) : (
                <div className="text-center py-8">
                  <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">No template attached or template has no fields.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[var(--color-border)]">
                <Button variant="secondary" onClick={() => setPreviewProductUid(null)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} variant="primary">
                  {isSubmitting ? 'Submitting...' : 'Submit Lead'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>
    </div>
  );
}
