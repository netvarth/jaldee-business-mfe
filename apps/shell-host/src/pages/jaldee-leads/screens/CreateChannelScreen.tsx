import React, { useState } from 'react';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { Channel, ChannelType } from '../types';
import { mockProducts } from '../mockData';
import { Button, Input, Select } from '@jaldee/design-system';

interface CreateChannelScreenProps {
  onBack: () => void;
  onSave: (channel: Channel) => void;
}

export default function CreateChannelScreen({ onBack, onSave }: CreateChannelScreenProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: '' as ChannelType | '',
    productName: '',
    location: '',
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.type) return;
    
    const channel: Channel = {
      uid: `c${Date.now()}`,
      name: formData.name,
      type: formData.type as ChannelType,
      location: formData.location,
      productName: formData.productName,
    };
    
    onSave(channel);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden font-sans text-slate-900">
      {/* 1. Header Area - Matching Screenshot */}
      <div className="border-b border-slate-100 px-4 sm:px-8 py-4 sm:py-6 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <ICONS.PREV className="w-5 h-5 text-slate-900" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Create Channel</h1>
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
            <Select 
              id="productService"
              label="Product/Service"
              value={formData.productName}
              onChange={e => setFormData({...formData, productName: e.target.value})}
              placeholder="Select Product/Service"
              options={mockProducts.map(p => ({ value: p.name, label: p.name }))}
            />

            {/* Location */}
            <Select 
              id="location"
              label="Location"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              placeholder="Select Location"
              options={[
                { value: "Main Reception", label: "Main Reception" },
                { value: "Digital Storefront", label: "Digital Storefront" },
                { value: "Mobile API", label: "Mobile API" },
                { value: "Call Center", label: "Call Center" },
                { value: "Affiliate Network", label: "Affiliate Network" }
              ]}
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
              Create Channel
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
