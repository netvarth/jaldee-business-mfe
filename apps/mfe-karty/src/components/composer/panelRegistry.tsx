import React, { lazy, Suspense } from 'react';
import { RxPrescriberPanel, RxPrescriberData } from './panels/RxPrescriberPanel';

export interface CapabilityPanelProps {
  capabilities: Record<string, boolean>;
  storeUid?: string;
  cartItems?: any[];
  prescriberData?: RxPrescriberData;
  onPrescriberChange?: (field: keyof RxPrescriberData, value: string) => void;
  hasScheduledDrugs?: boolean;
  isPrescriptionMode?: boolean;
  isPrescriberExpanded?: boolean;
  onTogglePrescriberExpand?: () => void;
}

export const CapabilityPanelSlots: React.FC<CapabilityPanelProps> = ({
  capabilities,
  prescriberData,
  onPrescriberChange,
  hasScheduledDrugs = false,
  isPrescriptionMode = false,
  isPrescriberExpanded = false,
  onTogglePrescriberExpand,
}) => {
  const isPharma = Boolean(capabilities?.pharmaModeEnabled);

  return (
    <>
      {/* 1. Clinical Doctor & Prescription Header Slot (pharmaModeEnabled) */}
      {(isPharma || isPrescriptionMode || hasScheduledDrugs) && prescriberData && onPrescriberChange && onTogglePrescriberExpand && (
        <RxPrescriberPanel
          data={prescriberData}
          onChange={onPrescriberChange}
          hasScheduledDrugs={hasScheduledDrugs}
          isPrescriptionMode={isPrescriptionMode}
          isExpanded={isPrescriberExpanded}
          onToggleExpand={onTogglePrescriberExpand}
        />
      )}

      {/* 2. Future vertical slots (KOT, seat tickets, etc.) mount here cleanly */}
      {capabilities?.kotEnabled && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs font-medium text-orange-800">
          🍳 <strong>KOT Active:</strong> Items will be dispatched to the kitchen display immediately upon confirmation.
        </div>
      )}
    </>
  );
};
