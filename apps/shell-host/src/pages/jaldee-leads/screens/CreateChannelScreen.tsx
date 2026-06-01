import React, { useState } from 'react';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { Channel, ChannelType, Product } from '../types';
import { mockProducts } from '../mockData';
import { Button, Input, MultiCombobox, Select } from '@jaldee/design-system';
import { useShellStore } from '../../../store/shellStore';

interface CreateChannelScreenProps {
  onBack: () => void;
  onSave: (channel: Channel) => void;
  products: Product[];
  initialChannel?: Channel;
}

export default function CreateChannelScreen({ onBack, onSave, products, initialChannel }: CreateChannelScreenProps) {
  const availableLocations = useShellStore((s) => s.availableLocations);
  const [formData, setFormData] = useState({
    name: initialChannel?.name || '',
    type: (initialChannel?.type || '') as ChannelType | '',
    productUids: initialChannel?.productUids || (initialChannel?.productUid ? [initialChannel?.productUid] : []),
    location: initialChannel?.location || '',
  });

  React.useEffect(() => {
    if (availableLocations.length && !formData.location) {
      setFormData(prev => ({ ...prev, location: availableLocations[0].name }));
    }
  }, [availableLocations, formData.location]);

  const handleSubmit = () => {
    if (!formData.name || !formData.type) return;
    
    const firstProductUid = formData.productUids[0] || undefined;
    const firstProduct = products.find(p => p.uid === firstProductUid);
    
    const channel: Partial<Channel> = {
      ...initialChannel,
      name: formData.name,
      type: formData.type as ChannelType,
      location: formData.location || undefined,
      productUid: firstProductUid,
      productName: firstProduct?.name || undefined,
      productUids: formData.productUids,
      status: initialChannel?.status || 'ACTIVE'
    };
    
    onSave(channel as Channel);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden text-slate-900">
      {/* 1. Header Area - Matching Screenshot */}
      <div className="border-b border-slate-100 px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <ICONS.PREV className="w-5 h-5 text-slate-900" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{initialChannel ? "Edit Channel" : "Create Channel"}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-12 no-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-x-12 md:gap-y-10">
            {/* Channel Name */}
            <Input 
              type="text"
              id="channelName"
              label="Channel *"
              placeholder="Enter Channel"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />

            {/* Platform Type */}
            <Select 
              id="platformType"
              label="Platform Type *"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as ChannelType})}
              placeholder="Select Platform Type"
              options={[
                { value: "ONLINE", label: "ONLINE (Web / Social)" },
                { value: "PHONE", label: "PHONE (Voice / IVR)" },
                { value: "CHATBOT", label: "CHATBOT (AI Messaging)" },
                { value: "WALK_IN", label: "WALK-IN (Offline Sync)" },
                { value: "REFERRAL", label: "REFERRAL (External API)" }
              ]}
            />

            {/* Product/Service */}
            <MultiCombobox
              id="productServices"
              label="Products/Services"
              value={formData.productUids}
              onValueChange={value => setFormData({...formData, productUids: value})}
              placeholder="Select Products/Services"
              options={products.map(p => ({ value: p.uid, label: p.name, description: p.productEnum || p.productType }))}
            />

            {/* Location */}
            <Select 
              id="location"
              label="Location"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              placeholder="Select Location"
              options={availableLocations.map(loc => ({ value: loc.name, label: loc.name }))}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 md:pt-12">
            <Button 
              type="button"
              onClick={onBack}
              variant="outline"
              className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-center"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              disabled={!formData.name || !formData.type}
              onClick={handleSubmit}
              variant="primary"
              className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-center"
            >
              {initialChannel ? "Save Changes" : "Create Channel"}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
