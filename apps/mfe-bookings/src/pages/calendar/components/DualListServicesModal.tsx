import React, { useState, useEffect } from 'react';

export interface Service {
  id: string;
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

  if (!isOpen) return null;

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
    <div className="modal-overlay" style={{ display: 'flex' }}>
        <div className="modal-card modal-dual-list">
            <div className="modal-header">
                <div>
                    <h3 className="modal-title">Select Services</h3>
                    <p className="modal-subtitle">Move Services to the right to configure them on calendar</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body dual-list-container">
                {/* Left Panel: Available */}
                <div className="dual-list-panel">
                    <div className="panel-header">
                        <span>Available (<span id="avail-services-count">{available.length}</span>)</span>
                        <button type="button" className="panel-link-btn" onClick={() => setLeftChecked(new Set())}>Clear</button>
                    </div>
                    <div className="panel-search">
                        <input type="text" placeholder="Search Services..." value={searchLeft} onChange={(e) => setSearchLeft(e.target.value)} />
                    </div>
                    <div className="panel-list">
                        {filteredAvailable.map(service => (
                          <label key={service.id} className="custom-checkbox-container" style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={leftChecked.has(service.id)} 
                              onChange={(e) => {
                                const next = new Set(leftChecked);
                                if (e.target.checked) next.add(service.id);
                                else next.delete(service.id);
                                setLeftChecked(next);
                              }}
                            />
                            <span className="checkmark" style={{ top: '8px' }}></span>
                            <div className="checkbox-desc" style={{ marginLeft: '24px' }}>
                              <span className="chk-label">{service.name}</span>
                            </div>
                          </label>
                        ))}
                    </div>
                    <div className="panel-footer">
                        <button type="button" className="panel-link-btn" onClick={() => setLeftChecked(new Set(filteredAvailable.map(s => s.id)))}>Select All</button>
                    </div>
                </div>

                {/* Transfer Buttons */}
                <div className="dual-list-actions">
                    <button type="button" className="btn-transfer-arrow" onClick={handleTransferRight} title="Add Selected">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                    <button type="button" className="btn-transfer-arrow" onClick={handleTransferLeft} title="Remove Selected">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                </div>

                {/* Right Panel: Added */}
                <div className="dual-list-panel">
                    <div className="panel-header">
                        <span>Added (<span id="added-services-count">{added.length}</span>)</span>
                        <button type="button" className="panel-link-btn" onClick={() => setRightChecked(new Set())}>Clear</button>
                    </div>
                    <div className="panel-search">
                        <input type="text" placeholder="Search Added..." value={searchRight} onChange={(e) => setSearchRight(e.target.value)} />
                    </div>
                    <div className="panel-list">
                        {filteredAdded.map(service => (
                          <label key={service.id} className="custom-checkbox-container" style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={rightChecked.has(service.id)} 
                              onChange={(e) => {
                                const next = new Set(rightChecked);
                                if (e.target.checked) next.add(service.id);
                                else next.delete(service.id);
                                setRightChecked(next);
                              }}
                            />
                            <span className="checkmark" style={{ top: '8px' }}></span>
                            <div className="checkbox-desc" style={{ marginLeft: '24px' }}>
                              <span className="chk-label">{service.name}</span>
                            </div>
                          </label>
                        ))}
                    </div>
                    <div className="panel-footer">
                        <button type="button" className="panel-link-btn" onClick={() => setRightChecked(new Set(filteredAdded.map(s => s.id)))}>Select All</button>
                    </div>
                </div>
            </div>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleDone}>Done</button>
            </div>
        </div>
    </div>
  );
}
