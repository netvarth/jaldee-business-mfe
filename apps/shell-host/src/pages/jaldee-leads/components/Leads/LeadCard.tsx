import React from 'react';
import { CrmLeadDto, CrmLeadPipelineStageDto } from '../../types';
import { cn } from '../../lib/utils';
import { mockUsers } from '../../mockData';
import { ICONS } from '../../constants';

export function PriorityBadge({ priority, compact = false }: { priority: CrmLeadDto['priority'], compact?: boolean }) {
  const styles = {
    URGENT: 'bg-red-500 text-white border-red-500 shadow-[0_0_8px_#ef444440]',
    HIGH: 'bg-amber-500 text-white border-amber-500 shadow-[0_0_8px_#f59e0b40]',
    NORMAL: 'border-indigo-400 text-indigo-600 bg-indigo-50/50',
    LOW: 'border-slate-300 text-slate-500 bg-slate-50',
  };
  
  if (compact) {
    return (
      <div className={cn("w-2 h-2 rounded-full", styles[priority].includes('bg-red') ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : styles[priority].includes('bg-amber') ? 'bg-amber-500 shadow-[0_0_6px_#f59e0b]' : styles[priority].includes('indigo') ? 'bg-indigo-400' : 'bg-slate-300')}></div>
    )
  }

  return (
    <span className={cn("px-2 py-0.5 rounded-lg text-xs font-semibold border leading-none", styles[priority])}>
      {priority}
    </span>
  )
}

export const LeadCard: React.FC<{ lead: CrmLeadDto, stage: CrmLeadPipelineStageDto, onClick: () => void }> = ({ lead, stage, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-600/10 cursor-pointer transition-all active-scale group relative overflow-hidden",
      )}
    >
      <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: stage.color }} />
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
            {lead.consumerFirstName} {lead.consumerLastName}
          </h4>
          <p className="font-mono text-xs font-bold text-slate-400 mt-0.5">#{lead.referenceNo}</p>
        </div>
        <PriorityBadge priority={lead.priority} compact />
      </div>
      
      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100/50 mb-3">
        <p className="text-sm text-slate-500 font-bold truncate leading-tight">{lead.productName}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-xs font-semibold text-slate-400">{lead.channelName}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-semibold border border-indigo-100 text-indigo-700" title={lead.ownerName}>
            {mockUsers.find(u=>u.uid === lead.ownerId)?.avatarInitials || 'O'}
          </div>
          <span className="text-xs font-bold text-slate-400 truncate max-w-[80px]">{lead.ownerName}</span>
        </div>
        
        <div className="flex items-center gap-1 text-slate-300">
           <ICONS.DATE className="w-2.5 h-2.5" />
           <span className="text-xs font-bold">2d</span>
        </div>
      </div>
      
      {lead.isDuplicate && (
        <div className="absolute top-0 right-0 p-1.5">
          <ICONS.ALERT className="w-3 h-3 text-red-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}
