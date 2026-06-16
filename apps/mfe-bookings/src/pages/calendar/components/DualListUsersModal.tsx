import React, { useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

interface DualListUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  allUsers: User[];
  initialSelectedUsers: User[];
  onSave: (selected: User[]) => void;
}

export default function DualListUsersModal({
  isOpen,
  onClose,
  serviceName,
  allUsers,
  initialSelectedUsers,
  onSave
}: DualListUsersModalProps) {
  const [available, setAvailable] = useState<User[]>([]);
  const [added, setAdded] = useState<User[]>([]);
  const [leftChecked, setLeftChecked] = useState<Set<string>>(new Set());
  const [rightChecked, setRightChecked] = useState<Set<string>>(new Set());
  const [searchLeft, setSearchLeft] = useState('');
  const [searchRight, setSearchRight] = useState('');

  useEffect(() => {
    if (isOpen) {
      const addedIds = new Set(initialSelectedUsers.map(u => u.id));
      setAdded(initialSelectedUsers);
      setAvailable(allUsers.filter(u => !addedIds.has(u.id)));
      setLeftChecked(new Set());
      setRightChecked(new Set());
      setSearchLeft('');
      setSearchRight('');
    }
  }, [isOpen, allUsers, initialSelectedUsers]);

  if (!isOpen) return null;

  const handleTransferRight = () => {
    const toMove = available.filter(u => leftChecked.has(u.id));
    setAdded([...added, ...toMove]);
    setAvailable(available.filter(u => !leftChecked.has(u.id)));
    setLeftChecked(new Set());
  };

  const handleTransferLeft = () => {
    const toMove = added.filter(u => rightChecked.has(u.id));
    setAvailable([...available, ...toMove]);
    setAdded(added.filter(u => !rightChecked.has(u.id)));
    setRightChecked(new Set());
  };

  const handleDone = () => {
    onSave(added);
    onClose();
  };

  const filteredAvailable = available.filter(u => u.name.toLowerCase().includes(searchLeft.toLowerCase()));
  const filteredAdded = added.filter(u => u.name.toLowerCase().includes(searchRight.toLowerCase()));

  const renderUserLabel = (user: User, checked: boolean, onChange: (checked: boolean) => void) => (
    <div key={user.id} className="panel-checkbox-item">
        <label className="custom-checkbox-container">
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="checkmark"></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} alt={user.name} className="user-avatar" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            <div>
              <span className="chk-label" style={{ display: 'block', lineHeight: 1.2 }}>{user.name}</span>
              <span className="chk-subtext" style={{ fontSize: '10px' }}>{user.role}</span>
            </div>
          </div>
        </label>
    </div>
  );

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
        <div className="modal-card modal-dual-list">
            <div className="modal-header">
                <div>
                    <h3 className="modal-title">Select Users from {serviceName}</h3>
                    <p className="modal-subtitle">Move Users to the right to configure them on calendar</p>
                </div>
                <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body dual-list-container">
                {/* Left Panel: Available */}
                <div className="dual-list-panel">
                    <div className="panel-header">
                        <span>Available (<span id="avail-users-count">{available.length}</span>)</span>
                        <button type="button" className="panel-link-btn" onClick={() => setLeftChecked(new Set())}>Clear</button>
                    </div>
                    <div className="panel-search">
                        <input type="text" placeholder="Search Users..." value={searchLeft} onChange={(e) => setSearchLeft(e.target.value)} />
                    </div>
                    <div className="panel-list user-panel-list">
                        {filteredAvailable.map(user => renderUserLabel(user, leftChecked.has(user.id), (c) => {
                          const next = new Set(leftChecked);
                          if (c) next.add(user.id); else next.delete(user.id);
                          setLeftChecked(next);
                        }))}
                    </div>
                    <div className="panel-footer">
                        <button type="button" className="panel-link-btn" onClick={() => setLeftChecked(new Set(filteredAvailable.map(u => u.id)))}>Select All</button>
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
                        <span>Added (<span id="added-users-count">{added.length}</span>)</span>
                        <button type="button" className="panel-link-btn" onClick={() => setRightChecked(new Set())}>Clear</button>
                    </div>
                    <div className="panel-search">
                        <input type="text" placeholder="Search Added..." value={searchRight} onChange={(e) => setSearchRight(e.target.value)} />
                    </div>
                    <div className="panel-list user-panel-list">
                        {filteredAdded.map(user => renderUserLabel(user, rightChecked.has(user.id), (c) => {
                          const next = new Set(rightChecked);
                          if (c) next.add(user.id); else next.delete(user.id);
                          setRightChecked(next);
                        }))}
                    </div>
                    <div className="panel-footer">
                        <button type="button" className="panel-link-btn" onClick={() => setRightChecked(new Set(filteredAdded.map(u => u.id)))}>Select All</button>
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
