import React, { useState, useEffect } from 'react';
import { Button, Checkbox, Dialog, DialogFooter, Input } from '@jaldee/design-system';

export interface Service {
  id: string;
  uid?: string;
  name: string;
  code?: string;
}

interface DualListServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  allServices: Service[];
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
  const [available, setAvailable] = useState<Service[]>([]);
  const [added, setAdded] = useState<Service[]>([]);
  const [leftChecked, setLeftChecked] = useState<Set<string>>(new Set());
  const [rightChecked, setRightChecked] = useState<Set<string>>(new Set());
  const [searchLeft, setSearchLeft] = useState('');
  const [searchRight, setSearchRight] = useState('');

  useEffect(() => {
    if (isOpen) {
      const addedIds = new Set(initialSelectedServices.map(s => s.id));
      setAdded(initialSelectedServices);
      setAvailable(allServices.filter(s => !addedIds.has(s.id)));
      setLeftChecked(new Set());
      setRightChecked(new Set());
      setSearchLeft('');
      setSearchRight('');
    }
  }, [isOpen, allServices, initialSelectedServices]);

  const handleTransferRight = () => {
    const toMove = available.filter(s => leftChecked.has(s.id));
    setAdded([...added, ...toMove]);
    setAvailable(available.filter(s => !leftChecked.has(s.id)));
    setLeftChecked(new Set());
  };

  const handleTransferLeft = () => {
    const toMove = added.filter(s => rightChecked.has(s.id));
    setAvailable([...available, ...toMove]);
    setAdded(added.filter(s => !rightChecked.has(s.id)));
    setRightChecked(new Set());
  };

  const handleDone = () => {
    onSave(added);
    onClose();
  };

  const filteredAvailable = available.filter(s => s.name.toLowerCase().includes(searchLeft.toLowerCase()));
  const filteredAdded = added.filter(s => s.name.toLowerCase().includes(searchRight.toLowerCase()));

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      testId="bookings-select-services-dialog"
      title="Select Services"
      description="Move services to the right to configure them on the calendar."
      size="lg"
      contentClassName="modal-dual-list max-w-4xl"
      bodyClassName="overflow-hidden"
    >
            <div className="dual-list-container">
                {/* Left Panel: Available */}
                <div className="dual-list-panel">
                    <div className="panel-header">
                        <span>Available (<span id="avail-services-count">{available.length}</span>)</span>
                        <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setLeftChecked(new Set())}>Clear</Button>
                    </div>
                    <div className="panel-search flex gap-2">
                        <Input type="search" placeholder="Search Services..." value={searchLeft} onChange={(e) => setSearchLeft(e.target.value)} className="flex-1" />
                        <Button variant="outline" size="sm" onClick={() => window.open("/services/create", "_blank")} title="Create new service in a new tab" className="shrink-0 text-indigo-600 hover:text-indigo-700">
                           + New
                        </Button>
                    </div>
                    <div className="panel-list">
                        {filteredAvailable.map(service => (
                          <Checkbox
                              key={service.id}
                              containerClassName="border-b border-[var(--color-border)] p-2"
                              checked={leftChecked.has(service.id)} 
                              onChange={(e) => {
                                const next = new Set(leftChecked);
                                if (e.target.checked) next.add(service.id);
                                else next.delete(service.id);
                                setLeftChecked(next);
                              }}
                              label={service.name}
                          />
                        ))}
                    </div>
                    <div className="panel-footer">
                        <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setLeftChecked(new Set(filteredAvailable.map(s => s.id)))}>Select All</Button>
                    </div>
                </div>

                {/* Transfer Buttons */}
                <div className="dual-list-actions">
                    <Button variant="outline" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>} className="btn-transfer-arrow" onClick={handleTransferRight} title="Add Selected" aria-label="Add selected services" disabled={leftChecked.size === 0} />
                    <Button variant="outline" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>} className="btn-transfer-arrow" onClick={handleTransferLeft} title="Remove Selected" aria-label="Remove selected services" disabled={rightChecked.size === 0} />
                </div>

                {/* Right Panel: Added */}
                <div className="dual-list-panel">
                    <div className="panel-header">
                        <span>Added (<span id="added-services-count">{added.length}</span>)</span>
                        <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setRightChecked(new Set())}>Clear</Button>
                    </div>
                    <div className="panel-search">
                        <Input type="search" placeholder="Search Added..." value={searchRight} onChange={(e) => setSearchRight(e.target.value)} />
                    </div>
                    <div className="panel-list">
                        {filteredAdded.map(service => (
                          <Checkbox
                              key={service.id}
                              containerClassName="border-b border-[var(--color-border)] p-2"
                              checked={rightChecked.has(service.id)} 
                              onChange={(e) => {
                                const next = new Set(rightChecked);
                                if (e.target.checked) next.add(service.id);
                                else next.delete(service.id);
                                setRightChecked(next);
                              }}
                              label={service.name}
                          />
                        ))}
                    </div>
                    <div className="panel-footer">
                        <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setRightChecked(new Set(filteredAdded.map(s => s.id)))}>Select All</Button>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
    </Dialog>
  );
}
