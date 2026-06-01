import React, { useState } from 'react';
import { Channel, ChannelType, CrmLeadDto, CrmLeadPipelineDto, Product } from '../types';
import { cn } from '../lib/utils';
import { ICONS } from '../constants';
import ChannelDetailScreen from './ChannelDetailScreen';
import CreateChannelScreen from './CreateChannelScreen';
import { Button, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { leadChannelService } from '../services/channelService';

const CHANNEL_TYPE_ICONS: Record<ChannelType, any> = {
  ONLINE: ICONS.IMPORT,
  PHONE: ICONS.PHONE,
  CHATBOT: ICONS.MENU,
  WALK_IN: ICONS.PROFILE,
  REFERRAL: ICONS.CHANNELS,
};

const CHANNEL_TYPE_GRADIENTS: Record<ChannelType, string> = {
  ONLINE: "from-indigo-500 to-indigo-600 text-white",
  PHONE: "from-emerald-500 to-emerald-600 text-white",
  CHATBOT: "from-violet-500 to-violet-600 text-white",
  WALK_IN: "from-sky-500 to-sky-600 text-white",
  REFERRAL: "from-amber-500 to-amber-600 text-white",
};

interface ChannelsScreenProps {
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  products: Product[];
  initialSelectedId?: string;
  onNavigate: (route: string, selection?: any) => void;
  fetchLeads?: () => void;
  fetchPipelines?: () => void;
  fetchProducts?: () => void;
}

export default function ChannelsScreen({
  channels,
  setChannels,
  leads,
  pipelines,
  products,
  initialSelectedId,
  onNavigate,
  fetchLeads,
  fetchPipelines,
  fetchProducts
}: ChannelsScreenProps) {
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
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  React.useEffect(() => {
    if (isAdding) {
      fetchProducts?.();
    }
  }, [isAdding, fetchProducts]);

  React.useEffect(() => {
    if (selectedChannel) {
      fetchLeads?.();
      fetchProducts?.();
      fetchPipelines?.();
    }
  }, [selectedChannel, fetchLeads, fetchProducts, fetchPipelines]);

  const handleDelete = async (uid: string) => {
    if (confirm('Deactivate this ingestion channel point?')) {
      try {
        await leadChannelService.updateStatus(uid, 'INACTIVE');
      } catch (err) {
        console.error("Failed to deactivate channel on server:", err);
      }
      setChannels(channels.map(c => c.uid === uid ? { ...c, status: 'INACTIVE' } : c));
    }
  };

  if (selectedChannel) {
    return (
      <ChannelDetailScreen
        channel={selectedChannel}
        leads={leads}
        pipelines={pipelines}
        products={products}
        onBack={() => setSelectedChannel(null)}
        onNavigate={onNavigate}
      />
    );
  }

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
            products={products}
            onSave={async (channelData) => {
              try {
                const created = await leadChannelService.create(channelData);
                setChannels(prev => [...prev, created]);
              } catch (err) {
                console.error("Failed to create channel on server:", err);
                // Fallback to local save in case API is down/offline
                setChannels(prev => [...prev, {
                  ...channelData,
                  uid: `c${Date.now()}`,
                  productName: products.find(p => p.uid === channelData.productUid)?.name
                } as Channel]);
              }
              setIsAdding(false);
            }} 
          />
        </div>
      ) : editingChannel ? (
        <div className="absolute inset-0 z-50 bg-slate-50">
          <CreateChannelScreen 
            initialChannel={editingChannel}
            onBack={() => setEditingChannel(null)} 
            products={products}
            onSave={async (channelData) => {
              try {
                const updated = await leadChannelService.update(channelData.uid, channelData);
                setChannels(prev => prev.map(c => c.uid === updated.uid ? updated : c));
              } catch (err) {
                console.error("Failed to update channel on server:", err);
                // Fallback to local save in case API is down/offline
                setChannels(prev => prev.map(c => c.uid === channelData.uid ? {
                  ...channelData,
                  productName: products.find(p => p.uid === channelData.productUid)?.name
                } as Channel : c));
              }
              setEditingChannel(null);
            }} 
          />
        </div>
      ) : channels.length === 0 ? (
        <SectionCard className="border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 bg-white">
          <EmptyState 
            title="No ingestion channels found" 
            description="Register channel points to capture leads dynamically." 
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => {
            const Icon = CHANNEL_TYPE_ICONS[channel.type] || ICONS.IMPORT;
            const channelLeadCount = leads.filter(l => l.channelUid === channel.uid).length;
            
            // Core mappings
            const mappedProduct = products.find(p => p.uid === channel.productUid) || products[0];
            const derivedPipeline = pipelines.find(p => p.uid === mappedProduct?.defaultPipelineUid) || pipelines[0];
            const initialStage = derivedPipeline?.stages?.[0];
            const productNames = channel.productName || (products.filter(p => channel.productUids?.includes(p.uid)).map(p => p.name).join(", ")) || 'NONE_MAPPED';

            return (
              <SectionCard 
                key={channel.uid} 
                onClick={() => setSelectedChannel(channel)}
                className="relative group hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-600/10 hover:-translate-y-1.5 duration-300 transition-all cursor-pointer flex flex-col justify-between h-full p-6 rounded-[28px] border border-slate-200 bg-white"
              >
                <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingChannel(channel);
                      fetchProducts?.();
                    }}
                    size="sm"
                    variant="ghost"
                    iconOnly
                    icon={<ICONS.EDIT className="h-4 w-4" />}
                    className="h-8 w-8 px-0 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                    aria-label={`Edit ${channel.name}`}
                    title="Edit channel"
                  />
                  <Button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(channel.uid); }}
                    size="sm"
                    variant="ghost"
                    iconOnly
                    icon={<ICONS.DELETE className="h-4 w-4" />}
                    className="h-8 w-8 px-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    aria-label={`Delete ${channel.name}`}
                    title="Deactivate channel"
                  />
                </div>

                 {/* Card header: icon + badges row, edit/delete sit absolutely top-right */}
                 <div className="flex items-start gap-3 mb-4">
                    <div className={cn(
                       "w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-md transition-all group-hover:scale-110 duration-300",
                       CHANNEL_TYPE_GRADIENTS[channel.type] || "from-slate-500 to-slate-600 text-white"
                    )}>
                       <Icon className="w-5 h-5" />
                    </div>
                    {/* badges — wrap naturally, give room for the absolute buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1 pr-16">
                       <span className="text-xs font-bold text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-xl border border-slate-200/50 leading-none whitespace-nowrap">
                          {channel.type}
                       </span>
                       <span className={cn(
                          "px-2.5 py-1 rounded-xl text-xs font-bold border leading-none shadow-sm whitespace-nowrap",
                          channel.status === 'ACTIVE' || !channel.status 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-rose-50 text-rose-700 border-rose-200"
                       )}>
                          {channel.status || 'ACTIVE'}
                       </span>
                    </div>
                 </div>
   
                 <div className="flex-1 flex flex-col justify-between">
                    <div>
                       <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug mb-1.5 break-words">
                          {channel.name}
                       </h3>
                       <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-4">
                          {channelLeadCount} Leads Captured
                          <span className={cn("inline-block w-2 h-2 rounded-full", channelLeadCount > 0 ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-slate-300 animate-pulse")}></span>
                       </p>
                    </div>
                      <div className="flex flex-col gap-2 mt-4">
                        <div className="bg-slate-50/70 px-3 py-2.5 border border-slate-100 rounded-2xl flex flex-col gap-1 group-hover:bg-slate-50 transition-colors">
                           <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Product</span>
                           <span className="text-slate-800 font-semibold text-sm leading-snug break-words">{productNames}</span>
                        </div>
                        <div className="bg-slate-50/70 px-3 py-2.5 border border-slate-100 rounded-2xl flex flex-col gap-1 group-hover:bg-slate-50 transition-colors">
                           <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Workflow</span>
                           <span className="text-slate-800 font-semibold text-sm break-words leading-snug">{derivedPipeline ? derivedPipeline.name : 'NONE_MAPPED'}</span>
                        </div>
                        <div className="bg-slate-50/70 px-3 py-2.5 border border-slate-100 rounded-2xl flex flex-col gap-1 group-hover:bg-indigo-50/20 transition-colors">
                           <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Stage Node</span>
                           <span className="text-indigo-600 font-semibold text-sm break-words leading-snug">{initialStage ? initialStage.stageName : 'ASSESSING'}</span>
                        </div>
                      </div>
                  </div>
                 
                 <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100/70 text-sm font-semibold">
                     <button
                       type="button"
                       onClick={(e) => { e.stopPropagation(); setSelectedChannel(channel); }}
                       className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 transition-colors"
                     >
                        Inspect Node 
                        <ICONS.PREV className="w-3.5 h-3.5 -rotate-180 transform group-hover:translate-x-0.5 transition-transform" />
                     </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(channel.uid); }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      Deactivate
                    </button>
                 </div>
              </SectionCard>
            );
          })}
        </div>
    </div>
  );
}
