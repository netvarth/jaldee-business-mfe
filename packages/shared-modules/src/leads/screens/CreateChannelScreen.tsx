import React, { useState } from 'react';
import { ICONS } from '../constants';
import { cn } from '../lib/utils';
import { Channel, ChannelType, Product } from '../types';
import { mockProducts } from '../mockData';
import { Button, Input, MultiCombobox, Select, PageHeader } from '@jaldee/design-system';
import { useJaldeeLeadsContext } from '../lib/sharedContext';
import { emitLeadSuccessToast } from '../lib/errorEvents';

interface CreateChannelScreenProps {
  onBack: () => void;
  onSave: (channel: Channel) => void;
  products: Product[];
  initialChannel?: Channel;
}

function getLocationName(location: any): string {
  return String(location?.name ?? location?.place ?? location?.locationName ?? location?.branchName ?? '').trim();
}

export default function CreateChannelScreen({ onBack, onSave, products, initialChannel }: CreateChannelScreenProps) {
  const { availableLocations, eventBus } = useJaldeeLeadsContext();
  const locationOptions = React.useMemo(
    () => availableLocations
      .map((location) => {
        const name = getLocationName(location);
        return name ? { value: name, label: name } : null;
      })
      .filter((option): option is { value: string; label: string } => Boolean(option)),
    [availableLocations],
  );
  const [formData, setFormData] = useState({
    name: initialChannel?.name || '',
    channelType: (initialChannel?.channelType || '') as ChannelType | '',
    productUids: initialChannel?.productUids || (initialChannel?.productUid ? [initialChannel?.productUid] : []),
    location: initialChannel?.location || '',
  });

  React.useEffect(() => {
    if (locationOptions.length && !formData.location) {
      setFormData(prev => ({ ...prev, location: locationOptions[0].value }));
    }
  }, [locationOptions, formData.location]);

  const handleSubmit = () => {
    if (!formData.name || !formData.channelType) return;
    
    const firstProductUid = formData.productUids[0] || undefined;
    const firstProduct = products.find(p => p.uid === firstProductUid);
    
    const channel: Partial<Channel> = {
      ...initialChannel,
      name: formData.name,
      channelType: formData.channelType as ChannelType,
      location: formData.location || undefined,
      productUid: firstProductUid,
      productName: firstProduct?.name || undefined,
      productUids: formData.productUids,
      status: initialChannel?.status || 'ACTIVE'
    };
    
    onSave(channel as Channel);
    emitLeadSuccessToast(eventBus, initialChannel ? "Channel updated successfully." : "Channel created successfully.");
  };

  return (
    <div className="bg-slate-50 min-h-full font-sans text-slate-900 pb-24">
      {/* Page Header — Standardized */}
      <div className="px-4 py-3 md:px-6 md:py-4 shrink-0">
        <PageHeader
          title={initialChannel ? 'Edit Channel' : 'Register Channel'}
          subtitle={initialChannel ? 'Update the ingestion channel configuration' : 'Configure a new inbound capture channel point'}
          back={{ label: "Channels", href: "#" }}
          onNavigate={onBack}
          actions={
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-400">Channel Mode</p>
                <p className="text-sm font-semibold text-indigo-600">{initialChannel ? 'Edit Config' : 'New Ingestion Point'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <ICONS.CHANNELS className="w-5 h-5" />
              </div>
            </div>
          }
        />
      </div>

      <div className="w-full p-4 md:p-6">
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
              value={formData.channelType}
              onChange={e => setFormData({...formData, channelType: e.target.value as ChannelType})}
              placeholder="Select Platform Type"
              options={[
                { value: "DIRECT", label: "Direct" },
                { value: "QRCODE", label: "QR Code" },
                { value: "WHATSAPP", label: "Whatsapp" },
                { value: "TELEGRAM", label: "Telegram" },
                { value: "IVR", label: "Ivr" },
                { value: "BRANDEDAPP", label: "Branded App" },
                { value: "FACEBOOK", label: "Facebook" },
                { value: "INSTAGRAM", label: "Instagram" },
                { value: "SDK", label: "SDK" }
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
              options={locationOptions}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-10">
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
              disabled={!formData.name || !formData.channelType}
              onClick={handleSubmit}
              variant="primary"
              className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-center"
            >
              {initialChannel ? 'Save Changes' : 'Create Channel'}
            </Button>
          </div>

      </div>
    </div>
  );
}
