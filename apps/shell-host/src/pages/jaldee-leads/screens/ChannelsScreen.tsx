import React, { useState } from 'react';
import { Channel, ChannelType, CrmLeadDto, CrmLeadPipelineDto, Product } from '../types';
import { cn } from '../lib/utils';
import { ICONS } from '../constants';
import ChannelDetailScreen from './ChannelDetailScreen';
import CreateChannelScreen from './CreateChannelScreen';
import { Button, PageHeader, SectionCard } from "@jaldee/design-system";

const CHANNEL_TYPE_ICONS: Record<ChannelType, any> = {
  ONLINE: ICONS.IMPORT,
  PHONE: ICONS.PHONE,
  CHATBOT: ICONS.MENU,
  WALK_IN: ICONS.PROFILE,
  REFERRAL: ICONS.CHANNELS,
};

interface ChannelsScreenProps {
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  products: Product[];
  initialSelectedId?: string;
  onNavigate: (route: string, selection?: any) => void;
}

export default function ChannelsScreen({ channels, setChannels, leads, pipelines, products, initialSelectedId, onNavigate }: ChannelsScreenProps) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(() => {
    if (initialSelectedId) {
      return channels.find(c => c.uid === initialSelectedId) || null;
    }
    return null;
  });

  // Effect to update selected channel if initialSelectedId changes
  React.useEffect(() => {
    if (initialSelectedId) {
      const found = channels.find(c => c.uid === initialSelectedId);
      if (found) setSelectedChannel(found);
    }
  }, [initialSelectedId, channels]);

  const [isAdding, setIsAdding] = useState(false);

  const handleDelete = (uid: string) => {
    if (confirm('Deactivate this ingestion channel point?')) {
      setChannels(channels.map(c => c.uid === uid ? { ...c, status: 'INACTIVE' } : c));
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-4 sm:p-6 md:p-8 no-scrollbar overflow-y-auto pb-24 relative space-y-6">
      <PageHeader
        title="Ingestion Network"
        subtitle="Interface & Channel Inbound Sources"
        actions={
          <Button 
            onClick={() => setIsAdding(true)}
            variant="primary"
            icon={<ICONS.ADD className="w-4 h-4" />}
            className="px-6 py-3 text-xs font-semibold active-scale"
          >
            Register Point
          </Button>
        }
      />

      {isAdding ? (
        <div className="absolute inset-0 z-50 bg-slate-50">
          <CreateChannelScreen 
            onBack={() => setIsAdding(false)} 
            onSave={(channel) => {
              setChannels([...channels, { ...channel, status: 'ACTIVE' }]);
              setIsAdding(false);
            }} 
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => {
            const Icon = CHANNEL_TYPE_ICONS[channel.type] || ICONS.IMPORT;
            const channelLeadCount = leads.filter(l => l.channelUid === channel.uid).length;
            
            // Core mappings
            const mappedProduct = products.find(p => p.uid === channel.productUid) || products[0];
            const derivedPipeline = pipelines.find(p => p.uid === mappedProduct?.defaultPipelineUid) || pipelines[0];
            const initialStage = derivedPipeline?.stages?.[0];

            return (
              <SectionCard 
                key={channel.uid} 
                onClick={() => setSelectedChannel(channel)}
                className="relative group hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-600/5 transition-all cursor-pointer flex flex-col justify-between h-96"
              >
                 <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                       <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex gap-2">
                       <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 leading-none">
                         {channel.type}
                       </span>
                       <span className={cn(
                          "px-2.5 py-1 rounded-xl text-xs font-semibold border leading-none",
                          channel.status === 'ACTIVE' || !channel.status 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-150" 
                            : "bg-slate-50 text-slate-400 border-slate-150"
                       )}>
                          {channel.status || 'ACTIVE'}
                       </span>
                    </div>
                 </div>
  
                 <div>
                    <h3 className="text-lg font-semibold text-slate-900 truncate leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                      {channel.name}
                    </h3>
                    <p className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-4">
                       {channelLeadCount} Leads Captured
                       <span className={cn("inline-block w-1.5 h-1.5 rounded-full", channelLeadCount > 0 ? "bg-emerald-500" : "bg-slate-300 animate-pulse")}></span>
                    </p>

                    {/* Highly descriptive grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-400">
                       <div className="bg-slate-50 p-2.5 border border-slate-100/50 rounded-xl">
                          <span className="block text-slate-400 text-xs mb-0.5">Product</span>
                          <span className="text-slate-800 font-semibold truncate block leading-tight">{mappedProduct ? mappedProduct.name : 'NONE_MAPPED'}</span>
                       </div>
                       <div className="bg-slate-50 p-2.5 border border-slate-100/50 rounded-xl">
                          <span className="block text-slate-400 text-xs mb-0.5">Workflow</span>
                          <span className="text-slate-800 font-semibold truncate block leading-tight">{derivedPipeline ? derivedPipeline.name : 'NONE_MAPPED'}</span>
                       </div>
                       <div className="bg-slate-50 p-2.5 border border-slate-100/50 rounded-xl col-span-2">
                          <span className="block text-slate-400 text-xs mb-0.5">Landing State Node</span>
                          <span className="text-indigo-600 font-semibold truncate block leading-tight">{initialStage ? initialStage.stageName : 'ASSESSING'}</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 text-sm font-semibold text-indigo-600">
                    <span className="opacity-0 group-hover:opacity-100 transition-all">Inspect Node</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(channel.uid); }}
                      className="p-1.5 text-slate-200 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      Deactivate
                    </button>
                 </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      {selectedChannel && (
        <div className="absolute inset-0 z-50 bg-slate-50">
          <ChannelDetailScreen 
            channel={selectedChannel} 
            leads={leads}
            pipelines={pipelines}
            products={products}
            onBack={() => setSelectedChannel(null)} 
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  );
}
