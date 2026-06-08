import React from 'react';
import { Button } from '@jaldee/design-system';
import { Channel, ChannelType } from '../../types';
import { cn } from '../../lib/utils';
import { ICONS } from '../../constants';

interface ChannelDetailDrawerProps {
  channel: Channel;
  onClose: () => void;
  onUpdate: (channel: Channel) => void;
}

const CHANNEL_TYPE_ICONS: Record<ChannelType, any> = {
  DIRECT: ICONS.IMPORT,
  QRCODE: ICONS.IMPORT,
  WHATSAPP: ICONS.MENU,
  TELEGRAM: ICONS.MENU,
  IVR: ICONS.PHONE,
  BRANDEDAPP: ICONS.PROFILE,
  FACEBOOK: ICONS.CHANNELS,
  INSTAGRAM: ICONS.CHANNELS,
  SDK: ICONS.MENU,
};

export function ChannelDetailDrawer({ channel, onClose, onUpdate }: ChannelDetailDrawerProps) {
  const Icon = CHANNEL_TYPE_ICONS[channel.channelType] || ICONS.IMPORT;

  return (
    <div data-testid={`jaldee-leads-channel-${channel.uid}-detail-drawer`} data-state="open" className="fixed inset-0 z-50 flex justify-end">
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
              <div className="bg-indigo-50 p-2.5 rounded-2xl border border-indigo-100/50">
                <Icon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                 <h2 className="text-sm font-semibold text-slate-400 leading-none mb-2">Channel Protocol</h2>
                 <h3 className="text-3xl font-semibold text-slate-900 leading-none">
                   {channel.name}
                 </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                {channel.channelType}
              </span>
              <span className="text-sm font-semibold font-mono text-slate-400">
                UID: {channel.uid}
              </span>
            </div>
          </div>
          <Button
            id={`jaldee-leads-channel-${channel.uid}-drawer-close-button`}
            data-testid={`jaldee-leads-channel-${channel.uid}-drawer-close-button`}
            onClick={onClose}
            variant="ghost"
            icon={<ICONS.CLOSE className="w-6 h-6" />}
            iconOnly
            aria-label="Close channel details"
            className="p-3 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-2xl"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
          {/* Stats Matrix */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm software-shadow">
              <span className="text-xs font-semibold text-slate-400 block mb-2">Lifetime Ingestion</span>
              <span className="text-2xl font-semibold text-slate-900 font-mono">1,429</span>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm software-shadow">
              <span className="text-xs font-semibold text-slate-400 block mb-2">Conversion Rate</span>
              <span className="text-2xl font-semibold text-indigo-600 font-mono">18.4%</span>
            </div>
          </div>

          {/* Infrastructure Config */}
          <section className="bg-white p-8 rounded-[38px] border border-slate-200 shadow-sm software-shadow">
            <h3 className="text-sm font-semibold text-slate-400 mb-8 flex items-center gap-3">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
              Ingestion Configuration
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-2 leading-none">Webhook Vector</label>
                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono text-sm text-slate-400 break-all">
                  https://api.jaldee.crm/v1/ingest/{channel.uid}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-2 leading-none">Mapping Logic</label>
                <p className="text-xs font-bold text-slate-800">Automatic Priority Routing Enabled</p>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="p-8 rounded-[38px] border-2 border-red-100 bg-red-50/30">
             <h3 className="text-sm font-semibold text-red-400 mb-4 leading-none">Administrative Core</h3>
             <p className="text-xs text-red-800/60 font-medium mb-6">Deactivating this channel will immediately terminate all incoming lead streams from this source.</p>
             <Button id={`jaldee-leads-channel-${channel.uid}-decommission-button`} data-testid={`jaldee-leads-channel-${channel.uid}-decommission-button`} variant="danger" className="w-full py-4 rounded-2xl font-semibold text-sm shadow-xl shadow-red-500/20">
               Decommission Channel
             </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
