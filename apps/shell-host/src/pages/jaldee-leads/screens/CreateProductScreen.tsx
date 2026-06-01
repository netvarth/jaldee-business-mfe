import React, { useState } from 'react';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { mockPipelines, mockForms } from '../mockData';
import { Product, Channel, FormTemplate } from '../types';
import { Button, Input, Select, Textarea } from '@jaldee/design-system';

interface CreateProductScreenProps {
  onBack: () => void;
  onSave: (product: Product, selectedChannelUids: string[]) => void | Promise<void>;
  channels: Channel[];
  forms: FormTemplate[];
  initialProduct?: Product | null;
}

export default function CreateProductScreen({ onBack, onSave, channels, forms, initialProduct }: CreateProductScreenProps) {
  const [formData, setFormData] = useState({
    name: initialProduct?.name || '',
    displayName: initialProduct?.displayName || '',
    productType: initialProduct?.productTypeEnum || initialProduct?.productType || '',
    leadTemplateUid: initialProduct?.leadTemplateUid || forms[0]?.uid || mockForms[0]?.uid || '',
    templateTitle: initialProduct?.templateTitle || '',
    description: initialProduct?.description || '',
  });

  const [selectedChannelUids, setSelectedChannelUids] = useState<string[]>(
    initialProduct ? channels.filter((channel) => channel.productUid === initialProduct.uid).map((channel) => channel.uid) : [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      defaultPipelineUid: mockPipelines[0]?.uid || 'p-standard',
      leadTemplateUid: formData.leadTemplateUid,
      leadTemplateName: selectedTemplate?.name,
      templateTitle: formData.templateTitle.trim() || undefined,
      description: formData.description,
      productType: formData.productType || 'PREMIUM SERVICE OFFERING',
      productTypeEnum: formData.productType || undefined,
      status: initialProduct?.status || 'ACTIVE',
    };

    try {
      await onSave(product, selectedChannelUids);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save product right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden font-sans text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-100 px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <ICONS.PREV className="w-5 h-5 text-slate-900" />
        </button>
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
              type="text"
              id="productName"
              label="Product Name *"
              placeholder="e.g. Enterprise Security Audit"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />

            {/* Display Accent Name */}
            <Input
              type="text"
              id="displayName"
              label="Display Accent Name"
              placeholder="e.g. Cyber Security Auditing Suite"
              value={formData.displayName}
              onChange={e => setFormData({ ...formData, displayName: e.target.value })}
            />

            {/* Product Category Type */}
            <Select
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
              id="leadTemplateUid"
              label="Core Intake Lead Template"
              value={formData.leadTemplateUid}
              onChange={e => setFormData({ ...formData, leadTemplateUid: e.target.value })}
              options={forms.map(form => ({ value: form.uid, label: form.name }))}
            />

            {/* Intake Heading Subtitle */}
            <div className="col-span-1 md:col-span-2">
              <Input
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
                    <button
                      key={chan.uid}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedChannelUids(selectedChannelUids.filter(id => id !== chan.uid));
                        } else {
                          setSelectedChannelUids([...selectedChannelUids, chan.uid]);
                        }
                      }}
                      className={cn(
                        'px-4 py-2 rounded-full border text-xs font-semibold transition-all flex items-center gap-2 select-none cursor-pointer',
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-slate-400')} />
                      {chan.name}
                      <span className="text-xs font-mono opacity-60">({chan.type})</span>
                    </button>
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
              <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all shadow-sm">
                  <ICONS.DOWNLOAD className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Upload Media or Documentation</p>
                  <p className="text-xs text-slate-400 mt-0.5">Drag and drop assets or click to browse local storage</p>
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 md:pt-12">
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-center"
            >
              Cancel
            </Button>
            <Button
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
