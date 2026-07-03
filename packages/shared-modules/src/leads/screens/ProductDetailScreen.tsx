import React from "react";
import { Product, CrmLeadDto, CrmLeadPipelineDto, Channel, ConversionTargetType, ConversionMapping } from "../types";
import { ICONS } from "../constants";
import { cn } from "../lib/utils";
import { format } from '../lib/dateUtils';
import { Button, Input, Select, Checkbox, DataTable, EmptyState, PageHeader, Badge, Dialog } from '@jaldee/design-system';
import type { ColumnDef } from '@jaldee/design-system';
import { useJaldeeLeadsContext } from '../lib/sharedContext';
import { emitLeadSuccessToast } from '../lib/errorEvents';

type ProductAttachment = {
  caption?: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  fileType?: string;
  fileUid?: string;
  jaldeeDriveId?: string | null;
};

interface ProductDetailScreenProps {
  product: Product;
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  channels: Channel[];
  onBack: () => void;
  onNavigate: (route: string, selection?: any) => void;
  onUpdateProduct?: (product: Product) => void | Promise<void>;
}

export default function ProductDetailScreen({
  product,
  leads,
  pipelines,
  channels,
  onBack,
  onNavigate,
  onUpdateProduct,
}: ProductDetailScreenProps) {
  const { eventBus } = useJaldeeLeadsContext();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState('ALL');
  const [isSavingMapping, setIsSavingMapping] = React.useState(false);
  const [mappingError, setMappingError] = React.useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = React.useState<ProductAttachment | null>(null);

  const linkedPipelines = pipelines.filter((p) =>
    p.productUids?.includes(product.uid),
  );
  const linkedPipeline =
    pipelines.find((p) => p.uid === product.defaultPipelineUid) ||
    linkedPipelines[0] ||
    pipelines[0];
  const linkedStages = [...(linkedPipeline?.stages ?? [])].sort(
    (a, b) => (a.sequenceOrder ?? a.stageOrder ?? 0) - (b.sequenceOrder ?? b.stageOrder ?? 0),
  );

  const [isEditingMapping, setIsEditingMapping] = React.useState(false);
  
  // Initialize mapping form state
  const [mappingForm, setMappingForm] = React.useState({
    targetType: (product.conversionMapping?.targetType || 'Appointment') as ConversionTargetType,
    targetModule: product.conversionMapping?.targetModule || '',
    requiredFields: product.conversionMapping?.requiredFields || [] as string[],
    allowedStageUid: product.conversionMapping?.allowedStageUid || linkedPipeline?.stages?.[0]?.uid || '',
    buttonLabel: product.conversionMapping?.buttonLabel || 'Convert Lead',
    postConversionStatus: product.conversionMapping?.postConversionStatus || 'COMPLETED',
    duplicateRule: product.conversionMapping?.duplicateRule || 'Ignore',
    autoCloseLead: product.conversionMapping?.autoCloseLead !== false,
  });

  React.useEffect(() => {
    setMappingForm({
      targetType: (product.conversionMapping?.targetType || 'Appointment') as ConversionTargetType,
      targetModule: product.conversionMapping?.targetModule || '',
      requiredFields: product.conversionMapping?.requiredFields || [],
      allowedStageUid: product.conversionMapping?.allowedStageUid || linkedPipeline?.stages?.[0]?.uid || '',
      buttonLabel: product.conversionMapping?.buttonLabel || 'Convert Lead',
      postConversionStatus: product.conversionMapping?.postConversionStatus || 'COMPLETED',
      duplicateRule: product.conversionMapping?.duplicateRule || 'Ignore',
      autoCloseLead: product.conversionMapping?.autoCloseLead !== false,
    });
  }, [product, linkedPipeline]);

  const handleSaveMapping = async () => {
    if (!mappingForm.targetModule.trim()) {
      setMappingError("Target operational module identifier is mandatory.");
      return;
    }
    setIsSavingMapping(true);
    setMappingError(null);

    const updatedMapping: ConversionMapping = {
      targetType: mappingForm.targetType,
      targetModule: mappingForm.targetModule.trim(),
      requiredFields: mappingForm.requiredFields,
      allowedStageUid: mappingForm.allowedStageUid,
      buttonLabel: mappingForm.buttonLabel.trim() || `Convert to ${mappingForm.targetType}`,
      postConversionStatus: mappingForm.postConversionStatus,
      duplicateRule: mappingForm.duplicateRule as 'Ignore' | 'Block' | 'Warn',
      autoCloseLead: mappingForm.autoCloseLead,
    };
    
    if (onUpdateProduct) {
      try {
        await onUpdateProduct({
          ...product,
          conversionMapping: updatedMapping
        });
        setIsEditingMapping(false);
        emitLeadSuccessToast(eventBus, "Product conversion mapping updated.");
      } catch (error) {
        setMappingError(error instanceof Error ? error.message : 'Unable to update product mapping.');
      } finally {
        setIsSavingMapping(false);
      }
    } else {
      setIsSavingMapping(false);
    }
  };

  const productLeads = leads.filter((l) => l.productUid === product.uid);
  const associatedChannels = channels.filter(
    (c) => c.productUid === product.uid,
  );

  const filteredLeads = productLeads.filter((l) => {
    const matchesSearch =
      (l.referenceNo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (l.consumerFirstName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (l.consumerLastName?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesStage =
      stageFilter === "ALL" || l.currentPipelineStageName === stageFilter;

    return matchesSearch && matchesStage;
  });

  const uniqueStages = Array.from(
    new Set(productLeads.map((l) => l.currentPipelineStageName).filter(Boolean))
  );
  const productAttachments = Array.isArray(product.attachments)
    ? (product.attachments as ProductAttachment[])
    : [];

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "Size unavailable";
    const units = ["Bytes", "KB", "MB", "GB"];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** unitIndex;
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const isImageAttachment = (attachment: ProductAttachment) => {
    const type = attachment.fileType?.toLowerCase() ?? "";
    const path = attachment.filePath?.toLowerCase() ?? "";
    return type.includes("image") || /\.(png|jpe?g|webp|gif|bmp|jfif|svg)(\?|$)/.test(path);
  };

  const openAttachment = (attachment: ProductAttachment) => {
    if (!attachment.filePath || typeof window === "undefined") return;
    if (isImageAttachment(attachment)) {
      setPreviewAttachment(attachment);
      return;
    }
    window.open(attachment.filePath, "_blank", "noopener,noreferrer");
  };

  const leadColumns = React.useMemo<ColumnDef<CrmLeadDto>[]>(
    () => [
      {
        key: "referenceNo",
        header: "Ref / ID",
        width: 170,
        render: (lead) => (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-semibold text-slate-800">
              {lead.referenceNo}
            </span>
            <span className="text-xs font-semibold text-slate-400 mt-0.5 leading-none">
              {lead.uid.toUpperCase()}
            </span>
          </div>
        ),
      },
      {
        key: "consumerFirstName",
        header: "Lead Name",
        width: 220,
        render: (lead) => (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-900">
              {lead.consumerFirstName} {lead.consumerLastName}
            </span>
            {lead.consumerEmail && (
              <span className="text-xs font-mono text-slate-400">
                {lead.consumerEmail}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "currentPipelineStageName",
        header: "Pipeline Stage",
        width: 180,
        render: (lead) => (
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-sm font-bold text-slate-600">
              {lead.currentPipelineStageName}
            </span>
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Ingested At",
        align: "right",
        width: 140,
        render: (lead) => (
          <span className="text-sm font-semibold text-slate-400 font-mono">
            {format(new Date(lead.createdAt), "dd MMM yy")}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div data-testid={`jaldee-leads-product-${product.uid}-detail-page`} className="h-full flex flex-col bg-slate-50 overflow-y-auto no-scrollbar pb-20 font-sans text-slate-900">
      {/* 1. Sticky Header */}
      <div className="bg-white border-b border-slate-200 px-3 md:px-8 py-3 md:py-4 sticky top-0 z-40 shadow-sm">
        <PageHeader
          title={product.name}
          subtitle={`Inventory SKU - ${product.uid.toUpperCase()}`}
          back={{ label: "Back", href: "#" }}
          onNavigate={onBack}
          actions={
            <div className="flex items-center gap-3">
              <Badge data-testid={`jaldee-leads-product-${product.uid}-status-badge`} variant="info">ACTIVE</Badge>
              <Button id={`jaldee-leads-product-${product.uid}-close-detail-button`} data-testid={`jaldee-leads-product-${product.uid}-close-detail-button`} onClick={onBack} variant="primary" className="text-sm font-semibold active-scale">
                Close Detail
              </Button>
            </div>
          }
        />
      </div>
      <div className="w-full p-4 md:p-8 space-y-6 md:space-y-8">
        {/* 2. Hero Statistics Section */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-4">
          <div className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 border border-slate-200 software-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4 xl:col-span-2">
            <div className="space-y-1.5 min-w-0">
              <span className="text-sm font-semibold text-indigo-600">
                Product Portfolio Asset
              </span>
              <h3 className="text-xl md:text-2xl font-semibold leading-tight text-slate-900 truncate">
                {product.name}
              </h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                {product.description ||
                  "Enterprise-grade sales asset configured for high-velocity ingestion."}
              </p>
            </div>
            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 self-start sm:self-center">
              <ICONS.PRODUCTS className="w-6 h-6 md:w-10 md:h-10" />
            </div>
          </div>

          <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] p-5 md:p-6 text-white flex flex-col justify-between shadow-xl min-h-[120px] md:min-h-0">
            <span className="text-xs font-semibold text-indigo-400 font-bold">
              Total Enrolments
            </span>
            <div>
              <p className="text-2xl md:text-3xl font-semibold leading-none mb-1 font-mono">
                {productLeads.length}
              </p>
              <p className="text-sm font-semibold text-slate-500">
                Captured Leads
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-colors min-h-[120px] md:min-h-0">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-slate-400">
                Conversion Ratio
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-semibold leading-none mb-1 text-emerald-500 font-mono">
                {Math.round(
                  (productLeads.filter((l) => l.isConverted).length /
                    (productLeads.length || 1)) *
                    100,
                )}
                %
              </p>
              <p className="text-sm font-semibold text-slate-500 font-bold">
                Won Rate
              </p>
            </div>
          </div>
        </div>

        {/* 3. Main Content: Pipeline & Leads */}
        <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12">
          {/* Section: Linked Pipeline Visualization */}
          <div className="space-y-6 xl:col-span-12">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="space-y-0.5">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900">
                    Pipeline Structure
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 italic truncate max-w-[200px] sm:max-w-none">
                    Connected workflow: {product.defaultPipelineName || linkedPipeline?.name || "MAPPED_FLOW"}
                  </p>
                </div>
                <span className="text-xs md:text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border border-indigo-100">
                  ACTIVE FLOW
                </span>
              </div>

              <div className="bg-white rounded-[20px] md:rounded-[28px] border border-slate-200 p-4 md:p-6 shadow-sm">
                {linkedPipeline ? (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-3 text-center md:gap-4">
                    <div className="p-2.5 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 min-w-0">
                      <p className="text-xs md:text-xs font-semibold text-slate-400">
                        Active Pipeline
                      </p>
                      <p className="text-sm md:text-xs font-semibold text-slate-900 mt-1 truncate">
                        {product.defaultPipelineName || linkedPipeline.name}
                      </p>
                    </div>
                    <div className="p-2.5 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 min-w-0">
                      <p className="text-xs md:text-xs font-semibold text-slate-400">
                        Stage Count
                      </p>
                      <p className="text-sm md:text-xs font-semibold text-indigo-600 mt-1 font-mono">
                        {linkedPipeline.stages?.length || 0} Stages
                      </p>
                    </div>
                    <div className="p-2.5 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 min-w-0">
                      <p className="text-xs md:text-xs font-semibold text-slate-400">
                        Initial Stage
                      </p>
                      <p className="text-sm md:text-xs font-semibold text-slate-900 mt-1 truncate">
                        {linkedPipeline.stages?.[0]?.stageName ||
                          "PROSPECT_INTAKE"}
                      </p>
                    </div>
                    <div className="p-2.5 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 min-w-0">
                      <p className="text-xs md:text-xs font-semibold text-slate-400">
                        Terminal Stage
                      </p>
                      <p className="text-sm md:text-xs font-semibold text-indigo-600 mt-1 truncate">
                        {linkedPipeline.stages?.find((s) => s.isTerminal)
                          ?.stageName || "CLOSED_WON"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-slate-400 text-center italic">
                    No Pipeline Structure Registered.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 p-5 md:p-8 software-shadow relative overflow-hidden">
                {!linkedPipeline ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic">
                    <ICONS.SETTINGS className="w-10 h-10 mb-4 opacity-20 animate-spin" />
                    <p className="text-xs font-semibold">
                      No Pipeline Mapped
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start w-full">
                    {linkedStages.map((stage, idx) => (
                      <React.Fragment key={stage.uid}>
                        {/* Connector line between stages */}
                        {idx > 0 && (
                          <div className="flex-1 flex items-center mt-5 min-w-[12px]">
                            <div className={cn(
                              "h-px w-full",
                              idx <= linkedStages.findIndex(s => s.isTerminal && s.terminalType === 'WON')
                                ? "bg-indigo-200"
                                : "bg-slate-200 border-dashed"
                            )} />
                          </div>
                        )}
                        {/* Stage Node */}
                        <div className="flex flex-col items-center gap-2 group cursor-default min-w-[72px] max-w-[120px]">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold font-mono transition-all duration-200 group-hover:scale-110 border-2 shadow-sm",
                              stage.isTerminal && stage.terminalType === 'WON'
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-100"
                                : stage.isTerminal
                                  ? "bg-rose-50 text-rose-500 border-rose-200 group-hover:bg-rose-100"
                                  : "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-100",
                            )}
                          >
                            {idx + 1}
                          </div>
                          <div className="text-center w-full px-1">
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight">
                              {stage.stageName}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lead Conversion Mapping Configuration Panel */}
            <div className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-200 p-5 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900">
                    Lead Operational Conversion Mapping
                  </h3>
                  <p className="text-xs font-bold text-slate-400 leading-none">
                    Downstream operational target workflow configuration
                  </p>
                </div>
                {!isEditingMapping && (
                  <Button
                    id={`jaldee-leads-product-${product.uid}-edit-mapping-button`}
                    data-testid={`jaldee-leads-product-${product.uid}-edit-mapping-button`}
                    type="button"
                    onClick={() => setIsEditingMapping(true)}
                    variant="outline"
                    className="text-sm font-semibold"
                  >
                    {product.conversionMapping ? "Edit Mapping Rules" : "Configure Mapping"}
                  </Button>
                )}
              </div>
              {mappingError && (
                <p data-testid={`jaldee-leads-product-${product.uid}-mapping-error`} data-state="error" role="alert" className="m-0 text-sm font-semibold text-rose-600">
                  {mappingError}
                </p>
              )}

              {isEditingMapping ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn text-xs text-slate-850">
                  <div className="space-y-4">
                    <Select
                      id={`jaldee-leads-product-${product.uid}-target-type-select`}
                      data-testid={`jaldee-leads-product-${product.uid}-target-type-select`}
                      label="Conversion Target Product/Object *"
                      value={mappingForm.targetType}
                      onChange={(e) => setMappingForm({ ...mappingForm, targetType: e.target.value as ConversionTargetType })}
                      options={[
                        { value: "Appointment", label: "Appointment / Booking" },
                        { value: "Order", label: "Order / Sales Lead" },
                        { value: "Membership", label: "Membership Plan" },
                        { value: "Admission Application", label: "Admission / Application" },
                        { value: "Customer / Consumer", label: "Patient / Consumer Profile" },
                        { value: "Enquiry", label: "Enquiry / Client" },
                        { value: "Custom", label: "Custom Target Segment" }
                      ]}
                    />

                    <Input
                      type="text"
                      id={`jaldee-leads-product-${product.uid}-target-module-input`}
                      data-testid={`jaldee-leads-product-${product.uid}-target-module-input`}
                      label="Target Operational Service/Module Name *"
                      value={mappingForm.targetModule}
                      onChange={(e) => setMappingForm({ ...mappingForm, targetModule: e.target.value })}
                      placeholder="e.g. Clinical Appointments, School ERP admissions"
                    />

                    <Input
                      type="text"
                      id={`jaldee-leads-product-${product.uid}-button-label-input`}
                      data-testid={`jaldee-leads-product-${product.uid}-button-label-input`}
                      label="Interactive Button Action Label"
                      value={mappingForm.buttonLabel}
                      onChange={(e) => setMappingForm({ ...mappingForm, buttonLabel: e.target.value })}
                      placeholder="e.g. Convert to Registration"
                    />

                    {linkedPipeline ? (
                      <Select
                        id={`jaldee-leads-product-${product.uid}-allowed-stage-select`}
                        data-testid={`jaldee-leads-product-${product.uid}-allowed-stage-select`}
                        label="Primary Eligibility Pipeline Stage (Threshold)"
                        value={mappingForm.allowedStageUid}
                        onChange={(e) => setMappingForm({ ...mappingForm, allowedStageUid: e.target.value })}
                        options={linkedPipeline.stages.map((stage) => ({
                          value: stage.uid,
                          label: stage.stageName
                        }))}
                      />
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-400 leading-none block">
                          Primary Eligibility Pipeline Stage (Threshold)
                        </label>
                        <p className="text-sm font-mono text-amber-500 italic">
                          No pipeline linked to select stages.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-400 font-bold">
                        Required Qualification Lead Fields Checklist
                      </label>
                      <div className="space-y-2.5 bg-slate-50 border border-slate-150 p-3.5 rounded-2xl">
                        {[
                          { id: "consumerPhone", label: "Consumer Phone Number" },
                          { id: "consumerEmail", label: "Consumer Email Address" },
                          { id: "company", label: "Business Company Name" },
                          { id: "consumerDob", label: "Birth Date (DOB)" },
                          { id: "consumerAddress", label: "Physical Address Details" },
                        ].map((field) => {
                          const isChecked = mappingForm.requiredFields.includes(field.id);
                          return (
                            <Checkbox
                              key={field.id}
                              id={`jaldee-leads-product-${product.uid}-required-field-${field.id}-checkbox`}
                              data-testid={`jaldee-leads-product-${product.uid}-required-field-${field.id}-checkbox`}
                              data-active={isChecked}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMappingForm({
                                    ...mappingForm,
                                    requiredFields: [...mappingForm.requiredFields, field.id],
                                  });
                                } else {
                                  setMappingForm({
                                    ...mappingForm,
                                    requiredFields: mappingForm.requiredFields.filter((f) => f !== field.id),
                                  });
                                }
                              }}
                              label={field.label}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        id={`jaldee-leads-product-${product.uid}-duplicate-rule-select`}
                        data-testid={`jaldee-leads-product-${product.uid}-duplicate-rule-select`}
                        label="Client Duplicate Policy"
                        value={mappingForm.duplicateRule}
                        onChange={(e) => setMappingForm({ ...mappingForm, duplicateRule: e.target.value as any })}
                        options={[
                          { value: "Ignore", label: "Allow Duplicates" },
                          { value: "Warn", label: "Warn Only" },
                          { value: "Block", label: "Strict Block" }
                        ]}
                      />

                      <Select
                        id={`jaldee-leads-product-${product.uid}-post-conversion-status-select`}
                        data-testid={`jaldee-leads-product-${product.uid}-post-conversion-status-select`}
                        label="Post-Conversion Status"
                        value={mappingForm.postConversionStatus}
                        onChange={(e) => setMappingForm({ ...mappingForm, postConversionStatus: e.target.value })}
                        options={[
                          { value: "COMPLETED", label: "Completed" },
                          { value: "Won", label: "Terminal Won" },
                          { value: "ACTIVE", label: "Remains Active" }
                        ]}
                      />
                    </div>

                    <div className="pt-2">
                      <Checkbox
                        id={`jaldee-leads-product-${product.uid}-auto-close-lead-checkbox`}
                        data-testid={`jaldee-leads-product-${product.uid}-auto-close-lead-checkbox`}
                        data-active={mappingForm.autoCloseLead}
                        checked={mappingForm.autoCloseLead}
                        onChange={(e) => setMappingForm({ ...mappingForm, autoCloseLead: e.target.checked })}
                        label="Auto-close CRM Lead Upon Successful Ingestion"
                      />
                    </div>
                  </div>

                  <div className="col-span-full pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                    <Button
                      id={`jaldee-leads-product-${product.uid}-mapping-cancel-button`}
                      data-testid={`jaldee-leads-product-${product.uid}-mapping-cancel-button`}
                      type="button"
                      onClick={() => setIsEditingMapping(false)}
                      variant="outline"
                      disabled={isSavingMapping}
                      className="text-sm font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      id={`jaldee-leads-product-${product.uid}-mapping-save-button`}
                      data-testid={`jaldee-leads-product-${product.uid}-mapping-save-button`}
                      type="button"
                      onClick={handleSaveMapping}
                      variant="primary"
                      loading={isSavingMapping}
                      className="text-sm font-semibold"
                    >
                      Save Settings
                    </Button>
                  </div>
                </div>
              ) : product.conversionMapping ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-4 animate-fadeIn text-sm font-semibold text-slate-400">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="block text-xs text-slate-400 mb-1">Downstream Target</span>
                    <span className="text-slate-900 text-xs font-semibold truncate block">
                      {product.conversionMapping.targetType}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="block text-xs text-slate-400 mb-1">Service Core Module</span>
                    <span className="text-slate-700 text-xs font-mono font-semibold truncate block">
                      {product.conversionMapping.targetModule || "N/A"}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="block text-xs text-slate-400 mb-1">Qualification Checklist</span>
                    <span className="text-indigo-600 block leading-tight pt-0.5">
                      {product.conversionMapping.requiredFields.length > 0
                        ? `${product.conversionMapping.requiredFields.length} Mandatory Fields`
                        : "Bypass Validation"}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="block text-xs text-slate-400 mb-1">Triggering Button Label</span>
                    <span className="text-slate-800 block italic leading-tight truncate">
                      "{product.conversionMapping.buttonLabel}"
                    </span>
                  </div>

                  <div className="col-span-full pt-1.5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-400 border-t border-slate-50">
                    <span>
                      DUPLICATE CONTROL:{" "}
                      <strong className="text-indigo-600">{product.conversionMapping.duplicateRule || "Ignore"}</strong>
                    </span>
                    <span>
                      AUTO-CLOSE ON SUCCESS:{" "}
                      <strong className="text-indigo-600">{product.conversionMapping.autoCloseLead ? "ENABLED" : "DISABLED"}</strong>
                    </span>
                    {product.conversionMapping.allowedStageUid && linkedPipeline && (
                      <span>
                        REQUIRED STAGE TRACE:{" "}
                        <strong className="text-emerald-600 bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded">
                          {linkedPipeline.stages.find((s) => s.uid === product.conversionMapping?.allowedStageUid)?.stageName || "ANY"}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-10 border border-dashed border-slate-200 rounded-3xl text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-700">No Operation Conversion Blueprint Defined</p>
                    <p className="text-sm text-slate-450 font-medium max-w-sm mx-auto leading-relaxed">
                      Lead conversions will use default unmapped rules. Specify operational object blueprints to integrate with hospital bookings, retail orders, admission queues, or custom operations.
                    </p>
                  </div>
                  <Button
                    id={`jaldee-leads-product-${product.uid}-setup-conversion-button`}
                    data-testid={`jaldee-leads-product-${product.uid}-setup-conversion-button`}
                    type="button"
                    onClick={() => setIsEditingMapping(true)}
                    variant="primary"
                    className="text-sm font-semibold mt-1.5"
                  >
                    Set Up Conversion Blueprint
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-900">
                    Associated Media / SLA Documents
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Uploaded files linked to this product ({productAttachments.length})
                  </p>
                </div>
                <span className="text-xs font-semibold text-indigo-600">
                  Product Files
                </span>
              </div>

              {productAttachments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productAttachments.map((attachment, index) => {
                    const fileName = attachment.fileName || attachment.caption || `Attachment ${index + 1}`;
                    return (
                      <button
                        type="button"
                        key={`${attachment.fileUid || attachment.jaldeeDriveId || fileName}-${index}`}
                        className="bg-white rounded-[20px] md:rounded-[24px] border border-slate-200 p-4 md:p-5 shadow-sm text-left transition hover:border-indigo-200 hover:shadow-md"
                        onClick={() => openAttachment(attachment)}
                        disabled={!attachment.filePath}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 overflow-hidden">
                            {attachment.filePath && isImageAttachment(attachment) ? (
                              <img
                                src={attachment.filePath}
                                alt={fileName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ICONS.DOCUMENT className="w-6 h-6" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 truncate" title={fileName}>
                                {fileName}
                              </p>
                              <p className="text-xs font-semibold text-slate-400">
                                {attachment.fileType || "Unknown type"} · {formatFileSize(attachment.fileSize)}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                              {attachment.jaldeeDriveId ? (
                                <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 border border-slate-200">
                                  Drive ID: {attachment.jaldeeDriveId}
                                </span>
                              ) : null}
                              {!attachment.filePath ? (
                                <span className="rounded-full bg-amber-50 text-amber-600 px-2.5 py-1 border border-amber-100">
                                  Preview unavailable
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-[24px] md:rounded-[32px] border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm font-semibold text-slate-500">
                    No files uploaded for this product yet.
                  </p>
                </div>
              )}
            </div>

            {/* Associated Leads Table */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-900">
                    Product Associated Leads
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Total recorded portfolio leads ({productLeads.length})
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id={`jaldee-leads-product-${product.uid}-leads-search-input`}
                    data-testid={`jaldee-leads-product-${product.uid}-leads-search-input`}
                    type="text"
                    placeholder="Filter product leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<ICONS.SEARCH className="w-3.5 h-3.5 text-slate-400" />}
                    fullWidth={false}
                    className="w-48"
                  />

                  {uniqueStages.length > 0 && (
                    <Select
                      id={`jaldee-leads-product-${product.uid}-stage-filter-select`}
                      data-testid={`jaldee-leads-product-${product.uid}-stage-filter-select`}
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      options={[
                        { value: "ALL", label: "All Stages" },
                        ...uniqueStages.map((stg) => ({ value: String(stg), label: String(stg) })),
                      ]}
                      fullWidth={false}
                      className="w-44"
                    />
                  )}
                </div>
              </div>
              
              <div data-testid={`jaldee-leads-product-${product.uid}-leads-table`}>
              <DataTable
                data={filteredLeads}
                columns={leadColumns}
                getRowId={(lead) => lead.uid}
                emptyState={
                  <EmptyState
                    data-testid={`jaldee-leads-product-${product.uid}-leads-empty-state`}
                    title="No matching leads found"
                    description="Adjust the product lead filters."
                  />
                }
              />
              </div>
            </div>

            {/* Associated Channels */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-base md:text-lg font-semibold text-slate-900">
                  Ingestion Points
                </h3>
                <span className="text-xs font-semibold text-indigo-600">
                  Capture Network
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {associatedChannels.map((channel) => (
                  <div
                    key={channel.uid}
                    data-testid={`jaldee-leads-product-${product.uid}-channel-${channel.uid}-row`}
                    className="bg-white p-4 md:p-5 rounded-[20px] md:rounded-[24px] border border-slate-200 flex items-center justify-between group gap-4"
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <ICONS.CHANNELS className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {channel.name}
                        </p>
                        <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md leading-none max-w-fit block mt-1">
                          STATUS: ACTIVE
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900 font-mono">
                        {
                          leads.filter((l) => l.channelUid === channel.uid)
                            .length
                        }
                      </p>
                      <p className="text-xs font-semibold text-slate-400">
                        Leads
                      </p>
                    </div>
                  </div>
                ))}
                {associatedChannels.length === 0 && (
                  <div className="col-span-full py-8 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-400">
                      No associated channels for this product SKU
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={Boolean(previewAttachment)}
        onClose={() => setPreviewAttachment(null)}
        size="lg"
        title={previewAttachment?.fileName || previewAttachment?.caption || "Attachment Preview"}
        contentClassName="max-w-4xl rounded-2xl"
      >
        {previewAttachment && (
          <div className="space-y-4">
            <div className="flex max-h-[72vh] items-center justify-center overflow-auto rounded-2xl bg-slate-950 p-4">
              {previewAttachment.filePath && isImageAttachment(previewAttachment) ? (
                <img
                  src={previewAttachment.filePath}
                  alt={previewAttachment.fileName || previewAttachment.caption || "Attachment preview"}
                  className="max-h-[66vh] max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-300">
                  <ICONS.DOCUMENT className="w-12 h-12" />
                  <p className="text-sm font-semibold">Preview is available only for image files.</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setPreviewAttachment(null)}>
                Close
              </Button>
              {previewAttachment.filePath ? (
                <Button onClick={() => window.open(previewAttachment.filePath, "_blank", "noopener,noreferrer")}>
                  Open File
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

