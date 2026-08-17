import React, { useState, useEffect } from 'react';
import { Button, Checkbox, Dialog, DialogFooter, Input } from '@jaldee/design-system';

export interface Service {
  id: string;
  uid?: string;
  name: string;
  code?: string;
  assignedProviders?: string[];
  assignedUserNames?: string;
}

interface DualListServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  allServices: Service[];
  initialSelectedServices: Service[];
  initialSelectedServices: Service[];
  onSave: (selected: Service[]) => void;
}

export default function DualListServicesModal({
  isOpen,
  onClose,
  allServices,
  initialSelectedServices,
  onSave
}: DualListServicesModalProps) {
  // Unified Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Desktop specific state
  const [leftChecked, setLeftChecked] = useState<Set<string>>(new Set());
  const [rightChecked, setRightChecked] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile specific state
  const [searchMobile, setSearchMobile] = useState('');
  const [isMobileSelectedExpanded, setIsMobileSelectedExpanded] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(initialSelectedServices.map(s => s.id)));
      setLeftChecked(new Set());
      setRightChecked(new Set());
      setSearchQuery('');
      setSearchMobile('');
      setIsMobileSelectedExpanded(true);
    }
  }, [isOpen, initialSelectedServices]);

  // Desktop Transfer Handlers
  const handleTransferRight = () => {
    const next = new Set(selectedIds);
    leftChecked.forEach(id => next.add(id));
    setSelectedIds(next);
    setLeftChecked(new Set());
  };

  const handleTransferLeft = () => {
    const next = new Set(selectedIds);
    rightChecked.forEach(id => next.delete(id));
    setSelectedIds(next);
    setRightChecked(new Set());
  };

  const handleDone = () => {
    onSave(allServices.filter(s => selectedIds.has(s.id)));
    onClose();
  };

  // Derived lists for Desktop
  const availableServices = allServices.filter(s => !selectedIds.has(s.id));
  const addedServices = allServices.filter(s => selectedIds.has(s.id));
  const desktopFilteredAvailable = availableServices.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const desktopFilteredAdded = addedServices.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Derived lists for Mobile
  const mobileFilteredAvailable = availableServices.filter(s => s.name.toLowerCase().includes(searchMobile.toLowerCase()));
  const mobileSelectedServices = addedServices;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      testId="bookings-select-services-dialog"
      title="Select Services"
      description={<><span className="hidden md:block">Move services to the right to configure them on calendar</span><span className="block md:hidden">Select services from available to configure them on calendar</span></>}
      size="lg"
      contentClassName="modal-dual-list md:max-w-4xl max-w-2xl md:!p-6 !p-0"
      headerClassName="p-4 pb-0 md:p-0"
      bodyClassName="flex flex-col p-0 md:p-1 h-[80vh] md:h-auto overflow-hidden md:overflow-y-auto md:max-h-[75vh]"
    >
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block">
        <div className="mb-4 px-1 md:w-1/2">
            <Input type="search" placeholder="Search Services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="dual-list-container">
            {/* Left Panel: Available */}
            <div className="dual-list-panel">
                <div className="panel-header">
                    <span>Available ({availableServices.length})</span>
                    <div className="flex items-center gap-3">
                        {leftChecked.size > 0 && (
                            <>
                                <span className="text-[10px] text-slate-400 font-medium">{leftChecked.size} selected</span>
                                <button type="button" className="panel-link-btn !text-red-500" onClick={() => setLeftChecked(new Set())}>Clear</button>
                            </>
                        )}
                    </div>
                </div>
                <div className="panel-list">
                    {desktopFilteredAvailable.map(service => (
                      <Checkbox
                          key={service.id}
                          containerClassName={`border rounded-md p-3 transition-colors ${leftChecked.has(service.id) ? 'border-[#e8dcf7] bg-[#f8f5ff]' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                          checked={leftChecked.has(service.id)} 
                          onChange={(e) => {
                            const next = new Set(leftChecked);
                            if (e.target.checked) next.add(service.id);
                            else next.delete(service.id);
                            setLeftChecked(next);
                          }}
                          label={
                            <div className="flex flex-col">
                              <span className="block text-sm text-slate-700 font-medium">{service.name}</span>
                              {service.assignedUserNames && <span className="block text-xs text-slate-500 mt-0.5">Assigned to: {service.assignedUserNames}</span>}
                            </div>
                          }
                      />
                    ))}
                </div>
                <div className="panel-footer">
                    <button type="button" className={`panel-link-btn ${desktopFilteredAvailable.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={desktopFilteredAvailable.length === 0} onClick={() => setLeftChecked(new Set(desktopFilteredAvailable.map(s => s.id)))}>Select All</button>
                </div>
            </div>

            {/* Transfer Buttons */}
            <div className="dual-list-actions">
                <button type="button" className="btn-transfer-arrow" onClick={handleTransferRight} title="Add Selected" aria-label="Add selected services" disabled={leftChecked.size === 0}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button type="button" className="btn-transfer-arrow" onClick={handleTransferLeft} title="Remove Selected" aria-label="Remove selected services" disabled={rightChecked.size === 0}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
            </div>

            {/* Right Panel: Added */}
            <div className="dual-list-panel">
                <div className="panel-header">
                    <span>Added ({addedServices.length})</span>
                    <div className="flex items-center gap-3">
                        {rightChecked.size > 0 && (
                            <>
                                <span className="text-[10px] text-slate-400 font-medium">{rightChecked.size} selected</span>
                                <button type="button" className="panel-link-btn !text-red-500" onClick={() => setRightChecked(new Set())}>Clear</button>
                            </>
                        )}
                    </div>
                </div>
                <div className="panel-list">
                    {desktopFilteredAdded.map(service => (
                      <Checkbox
                          key={service.id}
                          containerClassName={`border rounded-md p-3 transition-colors ${rightChecked.has(service.id) ? 'border-[#5B2D8E] bg-[#F3E8FF]' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                          checked={rightChecked.has(service.id)} 
                          onChange={(e) => {
                            const next = new Set(rightChecked);
                            if (e.target.checked) next.add(service.id);
                            else next.delete(service.id);
                            setRightChecked(next);
                          }}
                          label={
                            <div className="flex flex-col">
                              <span className="block text-sm text-slate-700 font-medium">{service.name}</span>
                              {service.assignedUserNames && <span className="block text-xs text-slate-500 mt-0.5">Assigned to: {service.assignedUserNames}</span>}
                            </div>
                          }
                      />
                    ))}
                </div>
                <div className="panel-footer">
                    <button type="button" className={`panel-link-btn ${desktopFilteredAdded.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={desktopFilteredAdded.length === 0} onClick={() => setRightChecked(new Set(desktopFilteredAdded.map(s => s.id)))}>Select All</button>
                </div>
            </div>
        </div>
        <DialogFooter className="!pt-4 !border-t-0 !px-0 !pb-0">
            <Button variant="secondary" onClick={onClose} className="!border-slate-300 !text-slate-700">Cancel</Button>
            <Button onClick={handleDone} className="!bg-[#3b0764] !text-white hover:!bg-[#28044a]">Done</Button>
        </DialogFooter>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="flex md:hidden flex-col h-full">
        <div className="flex flex-col w-full px-4 pt-4 shrink-0">
          <div className="relative mb-4">
            <Input
              type="search"
              placeholder="Search services by name"
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20">
          {/* Selected Section */}
          <div className="bg-[#f8f5ff] rounded-lg border border-[#e8dcf7] mb-6 overflow-hidden">
              <div className="flex items-center justify-between p-3 cursor-pointer select-none" onClick={() => setIsMobileSelectedExpanded(!isMobileSelectedExpanded)}>
                <span className="text-[#5a32a3] font-semibold text-sm">Selected ({selectedIds.size})</span>
                <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                      <button type="button" className="text-red-600 hover:text-red-700 text-xs font-bold underline mr-2" onClick={(e) => { e.stopPropagation(); setSelectedIds(new Set()); }}>Clear</button>
                    )}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a32a3" strokeWidth="2" className={`transform transition-transform ${isMobileSelectedExpanded ? 'rotate-180' : ''}`}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </div>
              </div>
              {isMobileSelectedExpanded && selectedIds.size > 0 && (
                <div className="bg-[#f8f5ff] px-2 pb-2 flex flex-col gap-2">
                  {mobileSelectedServices.map(service => (
                    <div key={`sel-${service.id}`} className="bg-white rounded border border-[#e8dcf7] p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-[#5a32a3] rounded-full w-5 h-5 flex items-center justify-center text-white shrink-0">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-700 font-medium">{service.name}</span>
                            {service.assignedUserNames && <span className="text-xs text-slate-500 mt-0.5">Assigned to: {service.assignedUserNames}</span>}
                          </div>
                        </div>
                        <button type="button" aria-label="Remove" onClick={() => {
                          const next = new Set(selectedIds);
                          next.delete(service.id);
                          setSelectedIds(next);
                        }} className="text-slate-400 hover:text-slate-600 p-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Available Section */}
          <div>
              <h3 className="text-xs font-bold text-slate-800 mb-2">Available</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                {mobileFilteredAvailable.length > 0 ? mobileFilteredAvailable.map((service, index) => {
                    const checked = selectedIds.has(service.id);
                    return (
                      <label key={`avail-${service.id}`} className={`flex items-start p-4 border-slate-100 cursor-pointer transition-colors ${checked ? 'bg-[#f8f5ff]' : 'hover:bg-slate-50'} ${index !== mobileFilteredAvailable.length - 1 ? 'border-b' : ''}`}>
                        <div className="pt-0.5 mr-3">
                          <Checkbox
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(selectedIds);
                                if (e.target.checked) next.add(service.id);
                                else next.delete(service.id);
                                setSelectedIds(next);
                              }}
                          />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-sm font-medium ${checked ? 'text-slate-900' : 'text-slate-700'}`}>{service.name}</span>
                            {service.code && <span className="text-xs text-slate-400 mt-0.5">{service.code}</span>}
                            {service.assignedUserNames && <span className="text-xs text-slate-500 mt-0.5">Assigned to: {service.assignedUserNames}</span>}
                        </div>
                      </label>
                    );
                }) : (
                  <div className="p-6 text-center text-sm text-slate-500">
                      No services found matching "{searchMobile}"
                  </div>
                )}
              </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 flex items-center justify-between z-10 shrink-0">
          <span className="text-sm font-semibold text-[#5a32a3]">{selectedIds.size} selected</span>
          <Button onClick={handleDone} className="!bg-[#5a32a3] !text-white hover:!bg-[#462780] rounded-lg px-8 py-2 font-semibold min-w-[120px]">Done ({selectedIds.size})</Button>
        </div>
      </div>
    </Dialog>
  );
}
