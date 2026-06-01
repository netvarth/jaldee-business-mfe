import React from "react";
import { Product, CrmLeadDto, CrmLeadPipelineDto, Channel, ConversionTargetType, ConversionMapping } from "../types";
import { ICONS } from "../constants";
import { cn } from "../lib/utils";
import { format } from '../lib/dateUtils';
import { Button, Input, Select, Checkbox } from '@jaldee/design-system';

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
  const [searchTerm, setSearchTerm] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState('ALL');
  const [isSavingMapping, setIsSavingMapping] = React.useState(false);
  const [mappingError, setMappingError] = React.useState<string | null>(null);

  const linkedPipelines = pipelines.filter((p) =>
    p.productUids?.includes(product.uid),
  );
  const linkedPipeline =
    pipelines.find((p) => p.uid === product.defaultPipelineUid) ||
    linkedPipelines[0] ||
    pipelines[0];

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

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto no-scrollbar pb-20 font-sans text-slate-900">
      {/* 1. Sticky Header */}
      <div className="bg-white border-b border-slate-200 px-3 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-1.5 md:p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900/80 shrink-0"
          >
            <ICONS.PREV className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <h1 className="text-xs sm:text-sm md:text-xl font-semibold text-slate-900 truncate max-w-[120px] sm:max-w-none">
                {product.name}
              </h1>
              <span className="bg-indigo-50 text-indigo-600 text-xs md:text-xs px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-xl font-semibold border border-indigo-100 leading-none shrink-0">
                ACTIVE
              </span>
            </div>
            <p className="text-xs md:text-sm font-semibold text-slate-400 mt-0.5 truncate">
              Inventory SKU • {product.uid.toUpperCase()}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-2.5 py-1.5 md:px-6 md:py-2 bg-slate-900 text-white rounded-xl text-xs md:text-sm font-semibold shadow-lg hover:bg-slate-800 transition-all active-scale shrink-0"
        >
          Close Detail
        </button>
      </div>

      <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6 md:space-y-8">
        {/* 2. Hero Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          <div className="md:col-span-2 bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 border border-slate-200 software-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* Section: Linked Pipeline Visualization */}
          <div className="lg:col-span-12 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="space-y-0.5">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900">
                    Pipeline Structure
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 italic truncate max-w-[200px] sm:max-w-none">
                    Connected workflow: {linkedPipeline?.name || "MAPPED_FLOW"}
                  </p>
                </div>
                <span className="text-xs md:text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border border-indigo-100">
                  ACTIVE FLOW
                </span>
              </div>

              <div className="bg-white rounded-[20px] md:rounded-[28px] border border-slate-200 p-4 md:p-6 shadow-sm">
                {linkedPipeline ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center">
                    <div className="p-2.5 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 min-w-0">
                      <p className="text-xs md:text-xs font-semibold text-slate-400">
                        Active Pipeline
                      </p>
                      <p className="text-sm md:text-xs font-semibold text-slate-900 mt-1 truncate">
                        {linkedPipeline.name}
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
                  <div className="flex flex-col gap-6 relative">
                    {/* Desktop horizontal connection line */}
                    <div className="absolute top-11 left-0 right-0 h-px bg-slate-100 hidden md:block" />

                    {/* Mobile vertical connection line */}
                    <div className="absolute left-7 top-6 bottom-6 w-px bg-slate-100 md:hidden" />

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4 relative">
                      {linkedPipeline.stages.slice(0, 5).map((stage, idx) => (
                        <div
                          key={stage.uid}
                          className="relative z-10 flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-3 group w-full"
                        >
                          <div
                            className={cn(
                              "w-10 h-10 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-xs md:text-xs font-semibold font-mono transition-all group-hover:scale-110 border shrink-0",
                              stage.isTerminal
                                ? "bg-emerald-50 text-emerald-600 border-emerald-150"
                                : "bg-indigo-50 text-indigo-600 border-indigo-150",
                            )}
                          >
                            {idx + 1}
                          </div>
                          <div className="text-left md:text-center min-w-0">
                            <p className="text-sm md:text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                              {stage.stageName}
                            </p>
                            <p className="text-xs font-semibold text-slate-400 truncate">
                              Rule: {stage.movementRule || "Strict"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
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
                <p role="alert" className="m-0 text-sm font-semibold text-rose-600">
                  {mappingError}
                </p>
              )}

              {isEditingMapping ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn text-xs text-slate-850">
                  <div className="space-y-4">
                    <Select
                      id="targetType"
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
                      id="targetModule"
                      label="Target Operational Service/Module Name *"
                      value={mappingForm.targetModule}
                      onChange={(e) => setMappingForm({ ...mappingForm, targetModule: e.target.value })}
                      placeholder="e.g. Clinical Appointments, School ERP admissions"
                    />

                    <Input
                      type="text"
                      id="buttonLabel"
                      label="Interactive Button Action Label"
                      value={mappingForm.buttonLabel}
                      onChange={(e) => setMappingForm({ ...mappingForm, buttonLabel: e.target.value })}
                      placeholder="e.g. Convert to Registration"
                    />

                    {linkedPipeline ? (
                      <Select
                        id="allowedStageUid"
                        label="Primary Eligibility Pipeline Stage (Threshold)"
                        value={mappingForm.allowedStageUid}
                        onChange={(e) => setMappingForm({ ...mappingForm, allowedStageUid: e.target.value })}
                        options={linkedPipeline.stages.map((stage) => ({
                          value: stage.uid,
                          label: `${stage.stageName} (Rule: ${stage.conversionSetting || "ALLOWED"})`
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
                              id={field.id}
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
                        id="duplicateRule"
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
                        id="postConversionStatus"
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
                        id="autoCloseLead"
                        checked={mappingForm.autoCloseLead}
                        onChange={(e) => setMappingForm({ ...mappingForm, autoCloseLead: e.target.checked })}
                        label="Auto-close CRM Lead Upon Successful Ingestion"
                      />
                    </div>
                  </div>

                  <div className="col-span-full pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                    <Button
                      type="button"
                      onClick={() => setIsEditingMapping(false)}
                      variant="outline"
                      disabled={isSavingMapping}
                      className="text-sm font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn text-sm font-semibold text-slate-400">
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
                  {/* Search box */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Filter product leads..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-0 rounded-xl text-sm font-semibold text-slate-850 outline-none w-48 transition-all shadow-sm"
                    />
                  </div>

                  {/* Stage filter dropdown */}
                  {uniqueStages.length > 0 && (
                    <select
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none cursor-pointer focus:border-indigo-600 shadow-sm"
                    >
                      <option value="ALL">All Stages</option>
                      {uniqueStages.map((stg) => (
                        <option key={stg} value={stg}>
                          {stg}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden software-shadow">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-400">
                        <th className="px-4 md:px-6 py-4">Ref / ID</th>
                        <th className="px-4 md:px-6 py-4">Lead Name</th>
                        <th className="px-4 md:px-6 py-4">Pipeline Stage</th>
                        <th className="px-4 md:px-6 py-4 text-right animate-pulse">
                          Ingested At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.uid}
                          className="hover:bg-indigo-50/10 transition-colors group cursor-pointer"
                        >
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                {lead.referenceNo}
                              </span>
                              <span className="text-xs font-semibold text-slate-400 mt-0.5 leading-none">
                                {lead.uid.toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
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
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <span className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span className="text-sm font-bold text-slate-600">
                                {lead.currentPipelineStageName}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-right text-sm font-semibold text-slate-400 font-mono">
                            {format(new Date(lead.createdAt), "dd MMM yy")}
                          </td>
                        </tr>
                      ))}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-12 text-center text-slate-400 text-xs font-bold italic"
                          >
                            No matching leads found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
    </div>
  );
}
