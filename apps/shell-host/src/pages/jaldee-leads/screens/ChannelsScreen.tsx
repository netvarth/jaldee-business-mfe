import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Channel, ChannelType, CrmLeadDto, CrmLeadPipelineDto, Product } from '../types';
import { cn } from '../lib/utils';
import { ICONS } from '../constants';
import { cameFromDashboard, navigateBackToDashboard } from '../lib/navigationOrigin';
import { Button, EmptyState, PageHeader, DataTable, ColumnDef, Badge, Popover, PopoverSection } from "@jaldee/design-system";
import { leadChannelService } from '../services/channelService';

const CHANNEL_TYPE_ICONS: Record<ChannelType, any> = {
  DIRECT: ICONS.PROFILE,
  QRCODE: ICONS.IMPORT,
  WHATSAPP: ICONS.MENU,
  TELEGRAM: ICONS.MENU,
  IVR: ICONS.PHONE,
  BRANDEDAPP: ICONS.PROFILE,
  FACEBOOK: ICONS.CHANNELS,
  INSTAGRAM: ICONS.CHANNELS,
  SDK: ICONS.MENU,
};

interface ChannelsScreenProps {
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  leads: CrmLeadDto[];
  pipelines: CrmLeadPipelineDto[];
  products: Product[];
}

export default function ChannelsScreen({
  channels,
  setChannels,
  leads,
  pipelines,
  products,
}: ChannelsScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const showDashboardBack = cameFromDashboard(location);
  const [openMenuUid, setOpenMenuUid] = useState<string | null>(null);

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

  const columns: ColumnDef<Channel>[] = [
    {
      key: 'channelName',
      header: 'Channel Name',
      render: (row) => {
        const Icon = CHANNEL_TYPE_ICONS[row.channelType] || ICONS.IMPORT;
        return (
          <div className="flex items-center gap-3 py-1">
             <div className="w-10 h-10 shrink-0 rounded-xl bg-[color:color-mix(in_srgb,var(--color-surface-secondary)_30%,white)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] shadow-sm">
                <Icon className="w-5 h-5" />
             </div>
             <div>
                <div className="font-semibold text-sm text-[var(--color-text-primary)] leading-none mb-1">{row.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)] font-mono font-medium tracking-wide">ID: {row.uid.slice(-4).toUpperCase()}</div>
             </div>
          </div>
        );
      }
    },
    {
      key: 'platformType',
      header: 'Platform Type',
      render: (row) => (
        <Badge variant="info">
          {row.channelType}
        </Badge>
      )
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => (
         <span className="text-sm font-medium text-[var(--color-text-primary)]">{row.location || 'Digital Storefront'}</span>
      )
    },
    {
      key: 'createdDate',
      header: 'Created Date',
      render: (row) => (
        <span className="text-sm text-[var(--color-text-secondary)]">23 May 2026</span>
      )
    },
    {
      key: 'leadsCaptured',
      header: 'Leads Captured',
      render: (row) => {
        const count = leads.filter(l => l.channelUid === row.uid).length;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{count}</span>
            {count > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span>}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'INACTIVE' ? 'danger' : 'success'}>
          {row.status || 'ACTIVE'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: '',
      sticky: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            id={`jaldee-leads-channel-${row.uid}-view-button`}
            data-testid={`jaldee-leads-channel-${row.uid}-view-button`}
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/jaldee-leads/channels/${row.uid}`)}
          >
            View
          </Button>
          <Popover
            open={openMenuUid === row.uid}
            onOpenChange={(open) => setOpenMenuUid(open ? row.uid : null)}
            align="end"
            portal
            contentClassName="min-w-[150px] p-2"
            trigger={
              <Button
                id={`jaldee-leads-channel-${row.uid}-menu-button`}
                data-testid={`jaldee-leads-channel-${row.uid}-menu-button`}
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                icon={<span className="block text-xl leading-none text-slate-400 pb-1">...</span>}
                className="h-8 w-8 rounded-lg px-0 hover:bg-slate-100"
                aria-label="Actions"
              />
            }
          >
            <PopoverSection className="space-y-1">
              <button
                type="button"
                data-testid={`jaldee-leads-channel-${row.uid}-edit-menu-item`}
                onClick={() => {
                  setOpenMenuUid(null);
                  navigate(`/jaldee-leads/channels/${row.uid}/edit`);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ICONS.EDIT className="h-4 w-4 text-slate-400" />
                Edit Channel
              </button>
              {row.status !== 'INACTIVE' && (
                <button
                  type="button"
                  data-testid={`jaldee-leads-channel-${row.uid}-delete-menu-item`}
                  onClick={() => {
                    setOpenMenuUid(null);
                    handleDelete(row.uid);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <ICONS.DELETE className="h-4 w-4" />
                  Deactivate
                </button>
              )}
            </PopoverSection>
          </Popover>
        </div>
      )
    }
  ];

  return (
    <div data-testid="jaldee-leads-channels-page" className="h-full flex flex-col bg-[var(--color-surface-secondary)] p-4 sm:p-6 md:p-8 no-scrollbar overflow-y-auto pb-24 relative space-y-6">
      <PageHeader
        back={showDashboardBack ? { label: 'Back to Dashboard', href: '/jaldee-leads/dashboard' } : undefined}
        onNavigate={() => navigateBackToDashboard(navigate)}
        title="Channels"
        subtitle="Manage and monitor lead capture channels"
        actions={
          <Button
            id="jaldee-leads-register-channel-button"
            data-testid="jaldee-leads-register-channel-button"
            onClick={() => navigate('/jaldee-leads/channels/create')}
            variant="primary"
          >
            + Channel
          </Button>
        }
      />

      <DataTable
        data={channels}
        columns={columns}
        loading={false}
        emptyState={
          <EmptyState
            title="No ingestion channels found"
            description="Register channel points to capture leads dynamically."
          />
        }
      />
    </div>
  );
}
