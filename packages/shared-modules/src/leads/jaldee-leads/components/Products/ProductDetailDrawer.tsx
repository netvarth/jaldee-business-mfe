import React from 'react';
import { Button } from '@jaldee/design-system';
import { Product, CrmLeadPipelineDto } from '../../types';
import { cn } from '../../lib/utils';
import { ICONS } from '../../constants';
import { mockPipelines } from '../../mockData';

interface ProductDetailDrawerProps {
  product: Product;
  onClose: () => void;
  onUpdate: (product: Product) => void;
}

export function ProductDetailDrawer({ product, onClose, onUpdate }: ProductDetailDrawerProps) {
  const currentPipeline = mockPipelines.find(p => p.uid === product.defaultPipelineUid);

  return (
    <div data-testid={`jaldee-leads-product-${product.uid}-detail-drawer`} data-state="open" className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      <div 
        className="relative w-full max-w-xl bg-slate-50 h-full shadow-[0_0_100px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border-l border-slate-200 rounded-l-[40px]"
      >
        {/* Header */}
        <div className="px-10 py-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl shrink-0 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-3">
              <div className="bg-slate-900 p-2.5 rounded-2xl">
                <ICONS.PRODUCTS className="w-6 h-6 text-white" />
              </div>
              <div>
                 <h2 className="text-sm font-semibold text-slate-400 leading-none mb-2">Inventory Node</h2>
                 <h3 className="text-3xl font-semibold text-slate-900 leading-none truncate">
                   {product.name}
                 </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm font-semibold font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                SKU: {product.productEnum}
              </span>
            </div>
          </div>
          <Button
            id={`jaldee-leads-product-${product.uid}-drawer-close-button`}
            data-testid={`jaldee-leads-product-${product.uid}-drawer-close-button`}
            onClick={onClose}
            variant="ghost"
            icon={<ICONS.CLOSE className="w-6 h-6" />}
            iconOnly
            aria-label="Close product details"
            className="p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-2xl"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
          {/* Economic Matrix */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm software-shadow">
              <span className="text-xs font-semibold text-slate-400 block mb-2">Active Pipeline Value</span>
              <span className="text-2xl font-semibold text-slate-900 font-mono">$42,900</span>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm software-shadow">
              <span className="text-xs font-semibold text-slate-400 block mb-2">Lead Density</span>
              <span className="text-2xl font-semibold text-indigo-600 font-mono">84</span>
            </div>
          </div>

          {/* Workflow Linking */}
          <section className="bg-white p-8 rounded-[38px] border border-slate-200 shadow-sm software-shadow">
            <h3 className="text-sm font-semibold text-slate-400 mb-8 flex items-center gap-3">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
              Workflow Architecture
            </h3>
            <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 border-dashed">
               <p className="text-sm font-semibold text-slate-400 mb-2">Primary Sales Pipeline</p>
               <div className="flex items-center justify-between">
                 <p className="font-semibold text-slate-900 text-lg">
                   {currentPipeline?.name || 'GENERIC_PIPELINE'}
                 </p>
                 <Button id={`jaldee-leads-product-${product.uid}-remap-button`} data-testid={`jaldee-leads-product-${product.uid}-remap-button`} variant="ghost" size="sm" className="text-indigo-600 font-semibold text-sm">
                   Re-Map
                 </Button>
               </div>
            </div>
          </section>

          {/* Performance Analytics */}
          <section className="bg-white p-8 rounded-[38px] border border-slate-200 shadow-sm software-shadow">
             <h3 className="text-sm font-semibold text-slate-400 mb-8 leading-none">System Analytics</h3>
             <div className="space-y-4">
               {[
                 { label: 'Avg. Cycle Time', value: '14.2 Days' },
                 { label: 'Top Channel', value: 'FACEBOOK_ADS' },
                 { label: 'Owner Satisfaction', value: '4.9/5' }
               ].map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                   <span className="text-sm font-semibold text-slate-400">{item.label}</span>
                   <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                 </div>
               ))}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
