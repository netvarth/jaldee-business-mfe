import React, { useState, useEffect } from 'react';
import { Button, Checkbox, Dialog, DialogFooter, Input } from '@jaldee/design-system';

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
          <Checkbox
            checked={checked} 
            onChange={(e) => onChange(e.target.checked)}
            label={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} alt={user.name} className="user-avatar" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            <div>
              <span className="chk-label" style={{ display: 'block', lineHeight: 1.2 }}>{user.name}</span>
              <span className="chk-subtext" style={{ fontSize: '10px' }}>{user.role}</span>
            </div>
          </div>}
          />
    </div>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      testId="bookings-select-users-dialog"
      title={`Select Users from ${serviceName}`}
      description="Move users to the right to configure them on the calendar."
      size="lg"
      contentClassName="modal-dual-list max-w-4xl"
      bodyClassName="overflow-hidden"
    >
            <div className="dual-list-container">
                {/* Left Panel: Available */}
                <div className="dual-list-panel">
                    <div className="panel-header">
                        <span>Available (<span id="avail-users-count">{available.length}</span>)</span>
                        <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setLeftChecked(new Set())}>Clear</Button>
                    </div>
                    <div className="panel-search">
                        <Input type="search" placeholder="Search Users..." value={searchLeft} onChange={(e) => setSearchLeft(e.target.value)} />
                    </div>
                    <div className="panel-list user-panel-list">
                        {filteredAvailable.map(user => renderUserLabel(user, leftChecked.has(user.id), (c) => {
                          const next = new Set(leftChecked);
                          if (c) next.add(user.id); else next.delete(user.id);
                          setLeftChecked(next);
                        }))}
                    </div>
                    <div className="panel-footer">
                        <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setLeftChecked(new Set(filteredAvailable.map(u => u.id)))}>Select All</Button>
                    </div>
                </div>

                {/* Transfer Buttons */}
                <div className="dual-list-actions">
                    <Button variant="outline" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>} className="btn-transfer-arrow" onClick={handleTransferRight} title="Add Selected" aria-label="Add selected users" disabled={leftChecked.size === 0} />
                    <Button variant="outline" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>} className="btn-transfer-arrow" onClick={handleTransferLeft} title="Remove Selected" aria-label="Remove selected users" disabled={rightChecked.size === 0} />
                </div>

                {/* Right Panel: Added */}
                <div className="dual-list-panel">
                    <div className="panel-header">
                        <span>Added (<span id="added-users-count">{added.length}</span>)</span>
                        <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setRightChecked(new Set())}>Clear</Button>
                    </div>
                    <div className="panel-search">
                        <Input type="search" placeholder="Search Added..." value={searchRight} onChange={(e) => setSearchRight(e.target.value)} />
                    </div>
                    <div className="panel-list user-panel-list">
                        {filteredAdded.map(user => renderUserLabel(user, rightChecked.has(user.id), (c) => {
                          const next = new Set(rightChecked);
                          if (c) next.add(user.id); else next.delete(user.id);
                          setRightChecked(next);
                        }))}
                    </div>
                    <div className="panel-footer">
                        <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setRightChecked(new Set(filteredAdded.map(u => u.id)))}>Select All</Button>
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
