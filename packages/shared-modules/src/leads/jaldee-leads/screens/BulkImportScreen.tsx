import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { mockProducts, mockChannels, mockPipelines } from '../mockData';
import { cn } from '../lib/utils';
import { ICONS } from '../constants';
import { cameFromDashboard, navigateBackToDashboard } from '../lib/navigationOrigin';
import { Button, FileUpload, PageHeader, Select } from '@jaldee/design-system';

export default function BulkImportScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const showDashboardBack = cameFromDashboard(location);
  const [step, setStep] = useState(1);
  const [productUid, setProductUid] = useState('');
  const [channelUid, setChannelUid] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const selectedProduct = mockProducts.find(p => p.uid === productUid);
  const selectedChannel = mockChannels.find(c => c.uid === channelUid);
  const derivedPipeline = selectedProduct ? mockPipelines.find(p => p.uid === selectedProduct.defaultPipelineUid) : null;
  const initialStage = derivedPipeline?.stages?.[0];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleNext = () => {
    if (step === 1 && productUid && channelUid) setStep(2);
    if (step === 2 && file) setStep(3);
  };

  const handleImport = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
    }, 2000);
  };

  const steps = [
    { id: 1, label: 'Configs' },
    { id: 2, label: 'Assets' },
    { id: 3, label: 'Forge' }
  ];

  return (
    <div data-testid="jaldee-leads-bulk-import-page" data-state={isUploading ? "loading" : uploadSuccess ? "success" : `step-${step}`} className="h-full flex flex-col bg-slate-50 p-4 md:p-6 no-scrollbar overflow-y-auto pb-20">
      <div className="max-w-3xl mx-auto w-full">
        <PageHeader
          back={showDashboardBack ? { label: 'Back to Dashboard', href: '/jaldee-leads/dashboard' } : undefined}
          onNavigate={() => navigateBackToDashboard(navigate)}
          title="Batch Ingestion Step-by-Step"
          subtitle="Simulate CSV/XLS data synchronization onto sales stages"
          className="mb-8"
        />

        <div className="flex gap-4 mb-8">
          {steps.map((s) => (
            <div key={s.id} data-testid={`jaldee-leads-bulk-import-step-${s.id}`} data-active={step === s.id} className="flex-1">
              <div className={cn(
                "h-1 rounded-full transition-all duration-500",
                step >= s.id ? "bg-indigo-600 shadow-[0_0_8px_#4f46e550]" : "bg-slate-200"
              )} />
              <p className={cn(
                "text-xs font-semibold mt-3 truncate",
                step >= s.id ? "text-slate-900" : "text-slate-400"
              )}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 min-h-[350px] software-shadow relative overflow-hidden">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-6 border-b border-slate-100 pb-4">Deployment Parameter Binding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select
                    id="jaldee-leads-bulk-import-product-select"
                    data-testid="jaldee-leads-bulk-import-product-select"
                    label="Product / Service Offer"
                    value={productUid}
                    onChange={(e) => setProductUid(e.target.value)}
                    placeholder="-- SELECT OFFERING --"
                    options={mockProducts.map(p => ({ value: p.uid, label: p.name.toUpperCase() }))}
                  />
                  <Select
                    id="jaldee-leads-bulk-import-channel-select"
                    data-testid="jaldee-leads-bulk-import-channel-select"
                    label="Source Channel Node"
                    value={channelUid}
                    onChange={(e) => setChannelUid(e.target.value)}
                    placeholder="-- SELECT SOURCE --"
                    options={mockChannels.map(c => ({ value: c.uid, label: c.name.toUpperCase() }))}
                  />
                </div>
              </div>

              {/* Dynamic Derived Metrics Block */}
              {productUid && channelUid && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4 animate-fade-in text-xs font-semibold text-slate-400">
                  <p className="text-sm text-slate-900 font-semibold pb-2 border-b border-slate-200">Derived Inbound Routing Rules</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <span className="text-slate-400 block mb-0.5">Derived Pipeline</span>
                       <span className="text-indigo-600 font-semibold text-xs block truncate">{derivedPipeline?.name || 'MAPPED sales Workflow'}</span>
                    </div>

                    <div>
                       <span className="text-slate-400 block mb-0.5">Initial Landing Stage</span>
                       <span className="text-slate-800 font-semibold text-xs block truncate">{initialStage ? initialStage.stageName : 'PROSPECT_INTAKE'}</span>
                    </div>

                    <div>
                       <span className="text-slate-400 block mb-0.5">Default Flow Owner</span>
                       <span className="text-slate-800 font-semibold text-xs block truncate">System Assigned Agent</span>
                    </div>

                    <div>
                       <span className="text-slate-400 block mb-0.5">Duplicate Policy Filter</span>
                       <span className="text-amber-600 font-semibold text-xs block truncate">Flag & Warn duplicate matches</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="h-full flex flex-col">
              <h3 className="text-xs font-semibold text-slate-400 mb-6 border-b border-slate-100 pb-4">Inbound Spreadsheet Dropzone</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all min-h-[220px]",
                  isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-300 bg-slate-50/20",
                  file && "bg-indigo-50/10 border-indigo-200"
                )}
              >
                {file ? (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20">
                       <ICONS.IMPORT className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{file.name}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    <Button
                      id="jaldee-leads-bulk-import-remove-file-button"
                      data-testid="jaldee-leads-bulk-import-remove-file-button"
                      onClick={() => setFile(null)}
                      variant="ghost"
                      size="sm"
                      className="text-xs font-semibold text-red-500 mt-4"
                    >
                      De-register file
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ICONS.IMPORT className="w-10 h-10 text-slate-350 mx-auto mb-4" />
                    <FileUpload
                      data-testid="jaldee-leads-bulk-import-file-upload"
                      label="Select Matrix File"
                      accept=".csv"
                      onUpload={(files) => setFile(files[0] || null)}
                      className="w-full min-w-[260px]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-6">
              {isUploading ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                     <ICONS.CONVERT className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-none">Mapping parameters</h3>
                  <p className="text-sm font-bold text-slate-400">Compiling contact registries onto sales cells...</p>
                </div>
              ) : uploadSuccess ? (
                <div className="space-y-4 font-sans text-center">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                    <ICONS.USER_CHECK className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-none">Captured Leads Synced</h3>
                  <p className="text-sm font-bold text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                    28 prospective buyers registered under "{derivedPipeline?.name}" in stage "{initialStage?.stageName}".
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto">
                    <ICONS.ALERT className="w-8 h-8 text-white animate-bounce" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-none">Publish Sync Records</h3>
                  <p className="text-sm font-bold text-slate-400">Execute compliance parsing for {file?.name}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            {step > 1 && !uploadSuccess && (
              <Button 
                id="jaldee-leads-bulk-import-back-button"
                data-testid="jaldee-leads-bulk-import-back-button"
                type="button"
                onClick={() => setStep(step - 1)} 
                disabled={isUploading} 
                variant="ghost"
                className="text-sm font-semibold text-slate-400 px-4 py-2 hover:text-slate-900 transition-colors"
              >
                Regress
              </Button>
            )}
          </div>
          
          <div className="flex gap-4">
            {step < 3 ? (
              <Button 
                id="jaldee-leads-bulk-import-next-button"
                data-testid="jaldee-leads-bulk-import-next-button"
                type="button"
                onClick={handleNext} 
                disabled={(step === 1 && (!productUid || !channelUid)) || (step === 2 && !file)} 
                variant="primary"
                className="text-sm font-semibold px-8 py-2.5"
              >
                Proceed Setup
              </Button>
            ) : !isUploading && !uploadSuccess ? (
              <Button 
                id="jaldee-leads-bulk-import-ingest-button"
                data-testid="jaldee-leads-bulk-import-ingest-button"
                type="button"
                onClick={handleImport} 
                variant="primary"
                className="text-sm font-semibold px-10 py-2.5"
              >
                Ingest Dataset
              </Button>
            ) : uploadSuccess ? (
              <Button 
                id="jaldee-leads-bulk-import-restart-button"
                data-testid="jaldee-leads-bulk-import-restart-button"
                type="button"
                onClick={() => { setStep(1); setProductUid(''); setChannelUid(''); setFile(null); setUploadSuccess(false); }}
                variant="secondary"
                className="text-sm font-semibold px-8 py-2.5"
              >
                Restart Stepper
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
