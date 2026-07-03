import React, { useState, useRef } from 'react';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { mockForms } from '../mockData';
import { Product, Channel, FormTemplate } from '../types';
import { Button, Input, Select, Textarea } from '@jaldee/design-system';
import { useJaldeeLeadsContext } from '../lib/sharedContext';
import { emitLeadSuccessToast } from '../lib/errorEvents';
import { useSharedModulesContext } from '../../context';
import { buildBaseServiceUrl } from '../../serviceUrls';
import { buildCrmLeadAttachmentMetadata, DRIVE_CONTEXT_TYPES } from '../utils/attachmentMetadata';

interface UploadedFileItem {
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  attachmentData?: any;
}

interface CreateProductScreenProps {
  onBack: () => void;
  onSave: (product: Product, selectedChannelUids: string[]) => void | Promise<void>;
  channels: Channel[];
  forms: FormTemplate[];
  pipelines: import('../types').CrmLeadPipelineDto[];
  initialProduct?: Product | null;
}

export default function CreateProductScreen({ onBack, onSave, channels, forms, pipelines, initialProduct }: CreateProductScreenProps) {
  const { eventBus } = useJaldeeLeadsContext();
  const initialPipelineUid = initialProduct?.defaultPipelineUid === 'p-standard' ? '' : initialProduct?.defaultPipelineUid || '';
  const [formData, setFormData] = useState({
    name: initialProduct?.name || '',
    displayName: initialProduct?.displayName || '',
    productType: initialProduct?.productTypeEnum || initialProduct?.productType || '',
    defaultPipelineUid: initialPipelineUid,
    leadTemplateUid: initialProduct?.leadTemplateUid || forms[0]?.uid || mockForms[0]?.uid || '',
    templateTitle: initialProduct?.templateTitle || '',
    description: initialProduct?.description || '',
  });

  const [selectedChannelUids, setSelectedChannelUids] = useState<string[]>(
    initialProduct ? channels.filter((channel) => channel.productUid === initialProduct.uid).map((channel) => channel.uid) : [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { api } = useSharedModulesContext();
  const { user, account } = useJaldeeLeadsContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [filesList, setFilesList] = useState<UploadedFileItem[]>(() => {
    if (initialProduct?.attachments && Array.isArray(initialProduct.attachments)) {
      return initialProduct.attachments.map(att => ({
        name: att.fileName || 'Attachment',
        size: att.fileSize || 0,
        status: 'success',
        attachmentData: att
      }));
    }
    return [];
  });

  const resolveFileType = (file: File) => {
    if (file.type.includes("/")) {
      return file.type.split("/")[1];
    }
    const segments = file.name.split(".");
    return segments.length > 1 ? segments.pop() ?? "file" : "file";
  };

  const resolvedUserName = user.name || user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";

  const uploadFileWorkflow = async (file: File, indexInState: number) => {
    try {
      const fileType = file.type || resolveFileType(file);
      const initiatePayload = buildCrmLeadAttachmentMetadata({
        caption: file.name,
        contextType: DRIVE_CONTEXT_TYPES.CRM_LEAD_PRODUCT,
        fileName: file.name,
        fileSize: file.size,
        fileType,
        tenantUid: account.id || "",
        userId: user.id || "",
        userName: resolvedUserName,
      });

      const initiateRes = await api.post<any>(
        buildBaseServiceUrl("/platform-service/v1/api/drive/initiate-upload"),
        initiatePayload,
        { _skipLocationParam: true } as any
      );
      const initiateData = initiateRes.data;
      const { fileUid, uploadUrl, filePath, jaldeeDriveId } = initiateData;

      if (!uploadUrl) {
        throw new Error("No upload URL returned");
      }

      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      });

      if (!s3Res.ok) {
        throw new Error("AWS S3 upload failed");
      }

      await api.patch(
        buildBaseServiceUrl(`/platform-service/v1/api/drive/${fileUid}/status?status=COMPLETE`),
        null,
        { _skipLocationParam: true } as any
      );

      const attachmentObj = buildCrmLeadAttachmentMetadata({
        caption: file.name,
        contextType: DRIVE_CONTEXT_TYPES.CRM_LEAD_PRODUCT,
        fileName: file.name,
        filePath,
        fileSize: file.size,
        fileType,
        fileUid,
        jaldeeDriveId,
        tenantUid: account.id || "",
        userId: user.id || "",
        userName: resolvedUserName,
      });

      setFilesList(prev => prev.map((item, idx) =>
        idx === indexInState
          ? { ...item, status: 'success', attachmentData: attachmentObj }
          : item
      ));
    } catch (err) {
      console.error("Upload workflow error for file:", file.name, err);
      setFilesList(prev => prev.map((item, idx) =>
        idx === indexInState
          ? { ...item, status: 'error', error: err instanceof Error ? err.message : "Upload failed" }
          : item
      ));
    }
  };

  const handleFileSelection = (selectedFiles: File[]) => {
    const newItems: UploadedFileItem[] = selectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      status: 'uploading'
    }));

    setFilesList(prev => {
      const startIdx = prev.length;
      selectedFiles.forEach((file, idx) => {
        uploadFileWorkflow(file, startIdx + idx);
      });
      return [...prev, ...newItems];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelection(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileSelection(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFilesList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setSaveError('Product Name is required.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    const selectedTemplate = forms.find((form) => form.uid === formData.leadTemplateUid);

    const product: Product = {
      uid: initialProduct?.uid || `pr${Date.now()}`,
      name: formData.name.trim(),
      displayName: formData.displayName.trim() || undefined,
      productEnum: formData.productType || formData.name.trim().toUpperCase().replace(/\s+/g, '_'),
      defaultPipelineUid: formData.defaultPipelineUid,
      defaultPipelineName: pipelines.find(p => p.uid === formData.defaultPipelineUid)?.name || (formData.defaultPipelineUid === initialProduct?.defaultPipelineUid ? initialProduct?.defaultPipelineName : undefined),
      leadTemplateUid: formData.leadTemplateUid,
      leadTemplateName: selectedTemplate?.name,
      templateTitle: formData.templateTitle.trim() || undefined,
      description: formData.description,
      productType: formData.productType || 'PREMIUM SERVICE OFFERING',
      productTypeEnum: formData.productType || undefined,
      status: initialProduct?.status || 'ACTIVE',
      attachments: filesList
        .filter(f => f.status === 'success' && f.attachmentData)
        .map(f => f.attachmentData)
    };

    try {
      await onSave(product, selectedChannelUids);
      emitLeadSuccessToast(eventBus, initialProduct ? "Product updated successfully." : "Product created successfully.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save product right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div data-testid={initialProduct ? `jaldee-leads-product-${initialProduct.uid}-edit-page` : "jaldee-leads-create-product-page"} className="h-full flex flex-col bg-white overflow-hidden font-sans text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-100 px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4">
        <Button
          id="jaldee-leads-product-form-back-button"
          data-testid="jaldee-leads-product-form-back-button"
          onClick={onBack}
          variant="ghost"
          iconOnly
          icon={<ICONS.PREV className="w-5 h-5 text-slate-900" />}
          className="h-9 w-9 p-0"
          aria-label="Back"
        />
        <h1 className="text-xl font-bold text-slate-900">{initialProduct ? 'Edit Product' : 'Create Product'}</h1>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 no-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-12">

          {saveError && (
            <p role="alert" className="text-sm font-semibold text-rose-600">
              {saveError}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-x-12 md:gap-y-10">

            {/* Product Name */}
            <Input
              data-testid="jaldee-leads-product-form-name-input"
              type="text"
              id="productName"
              label="Product Name *"
              placeholder="e.g. Enterprise Security Audit"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />

            {/* Display Accent Name */}
            <Input
              data-testid="jaldee-leads-product-form-display-name-input"
              type="text"
              id="displayName"
              label="Display Accent Name"
              placeholder="e.g. Cyber Security Auditing Suite"
              value={formData.displayName}
              onChange={e => setFormData({ ...formData, displayName: e.target.value })}
            />

            {/* Product Category Type */}
            <Select
              data-testid="jaldee-leads-product-form-type-select"
              id="productType"
              label="Product Category Type"
              value={formData.productType}
              onChange={e => setFormData({ ...formData, productType: e.target.value })}
              placeholder="Select Category"
              options={[
                { value: 'HEALTHCARE', label: 'Healthcare' },
                { value: 'KARTI', label: 'Karti' },
                { value: 'MEMBERSHIP', label: 'Membership' },
                { value: 'IVR', label: 'IVR' },
                { value: 'UNKNOWN', label: 'Other' },
              ]}
            />

            {/* Core Intake Lead Template */}
            <Select
              data-testid="jaldee-leads-product-form-template-select"
              id="leadTemplateUid"
              label="Core Intake Lead Template"
              value={formData.leadTemplateUid}
              onChange={e => setFormData({ ...formData, leadTemplateUid: e.target.value })}
              options={forms.map(form => ({ value: form.uid, label: form.name }))}
            />

            {/* Default Pipeline */}
            <Select
              data-testid="jaldee-leads-product-form-pipeline-select"
              id="defaultPipelineUid"
              label="Associated Pipeline / Workflow"
              value={formData.defaultPipelineUid}
              onChange={e => setFormData({ ...formData, defaultPipelineUid: e.target.value })}
              options={[
                { value: '', label: 'Select Pipeline' },
                ...pipelines.map(pipeline => ({ value: pipeline.uid, label: pipeline.name })),
                ...(initialPipelineUid && !pipelines.some(p => p.uid === initialPipelineUid) ? [{ value: initialPipelineUid, label: initialProduct?.defaultPipelineName || initialPipelineUid }] : [])
              ]}
            />

            {/* Intake Heading Subtitle */}
            <div className="col-span-1 md:col-span-2">
              <Input
                data-testid="jaldee-leads-product-form-template-title-input"
                type="text"
                id="templateTitle"
                label="Intake Heading Subtitle"
                placeholder="e.g. Please fill in our compliance verification checklist and submit"
                value={formData.templateTitle}
                onChange={e => setFormData({ ...formData, templateTitle: e.target.value })}
              />
            </div>

            {/* Link Active Channel Ingestions */}
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Link Active Channel Ingestions</label>
              <p className="text-sm font-semibold text-indigo-600">Tap existing channels to link them with this product</p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {channels.map(chan => {
                  const isSelected = selectedChannelUids.includes(chan.uid);
                  return (
                    <Button
                      id={`jaldee-leads-product-form-channel-${chan.uid}-button`}
                      data-testid={`jaldee-leads-product-form-channel-${chan.uid}-button`}
                      data-active={isSelected}
                      key={chan.uid}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedChannelUids(selectedChannelUids.filter(id => id !== chan.uid));
                        } else {
                          setSelectedChannelUids([...selectedChannelUids, chan.uid]);
                        }
                      }}
                      variant={isSelected ? "primary" : "outline"}
                      className="px-4 py-2 rounded-full text-xs font-semibold"
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-slate-400')} />
                      {chan.name}
                      <span className="text-xs font-mono opacity-60">({chan.channelType})</span>
                    </Button>
                  );
                })}
                {channels.length === 0 && (
                  <p className="text-sm text-slate-400">No channels available to link.</p>
                )}
              </div>
            </div>

            {/* Technical Spec/Description */}
            <div className="col-span-1 md:col-span-2">
              <Textarea
                data-testid="jaldee-leads-product-form-description-textarea"
                id="description"
                label="Technical Spec/Description"
                rows={6}
                placeholder="Provide technical specifications, service details or SLA terms..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Associated Media / SLA Documents */}
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Associated Media / SLA Documents</label>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group transition-all cursor-pointer",
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/50 shadow-inner"
                    : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl bg-white border flex items-center justify-center transition-all shadow-sm",
                  isDragging
                    ? "text-indigo-600 border-indigo-200 scale-110"
                    : "text-slate-400 border-slate-200 group-hover:text-indigo-600 group-hover:border-indigo-200"
                )}>
                  <ICONS.DOWNLOAD className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Upload Media or Documentation</p>
                  <p className="text-xs text-slate-400 mt-0.5">Drag and drop assets or click to browse local storage</p>
                </div>
              </div>

              {/* Uploaded Files List */}
              {filesList.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {filesList.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="group/file flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          {file.status === 'uploading' ? (
                            <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                          ) : (
                            <ICONS.DOCUMENT className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </p>
                          {file.status === 'error' ? (
                            <p className="text-[10px] text-rose-500 font-semibold mt-0.5 truncate" title={file.error}>
                              {file.error || 'Upload failed'}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {formatFileSize(file.size)}
                              {file.status === 'uploading' && ' • Uploading...'}
                              {file.status === 'success' && ' • Uploaded'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {file.status === 'success' && (
                          <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-xs" title="Uploaded successfully">
                            ✓
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove file"
                        >
                          <ICONS.CLOSE className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 md:pt-12">
            <Button
              id="jaldee-leads-product-form-cancel-button"
              data-testid="jaldee-leads-product-form-cancel-button"
              type="button"
              onClick={onBack}
              variant="outline"
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-center"
            >
              Cancel
            </Button>
            <Button
              id="jaldee-leads-product-form-save-button"
              data-testid="jaldee-leads-product-form-save-button"
              type="button"
              onClick={handleSubmit}
              variant="primary"
              loading={isSaving}
              disabled={!formData.name.trim()}
              className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-center"
            >
              {initialProduct ? 'Update Product' : 'Save Product'}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
