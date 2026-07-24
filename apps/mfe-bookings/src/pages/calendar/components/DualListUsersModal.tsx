import React, { useState, useEffect } from 'react';
import { Button, Checkbox, Dialog, DialogFooter, EmptyState, Input } from '@jaldee/design-system';

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
  loading?: boolean;
  error?: string | null;
}

export default function DualListUsersModal({
  isOpen,
  onClose,
  serviceName,
  allUsers,
  initialSelectedUsers,
  onSave,
  loading = false,
  error = null,
}: DualListUsersModalProps) {
  // Unified Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Desktop specific state
  const [leftChecked, setLeftChecked] = useState<Set<string>>(new Set());
  const [rightChecked, setRightChecked] = useState<Set<string>>(new Set());
  const [searchLeft, setSearchLeft] = useState('');
  const [searchRight, setSearchRight] = useState('');

  // Mobile specific state
  const [searchMobile, setSearchMobile] = useState('');
  const [isMobileSelectedExpanded, setIsMobileSelectedExpanded] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(initialSelectedUsers.map(u => u.id)));
      setLeftChecked(new Set());
      setRightChecked(new Set());
      setSearchLeft('');
      setSearchRight('');
      setSearchMobile('');
      setIsMobileSelectedExpanded(true);
    }
  }, [isOpen, initialSelectedUsers]);

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
    onSave(allUsers.filter(u => selectedIds.has(u.id)));
    onClose();
  };

  // Derived lists for Desktop
  const availableUsers = allUsers.filter(u => !selectedIds.has(u.id));
  const addedUsers = allUsers.filter(u => selectedIds.has(u.id));
  const desktopFilteredAvailable = availableUsers.filter(u => u.name.toLowerCase().includes(searchLeft.toLowerCase()));
  const desktopFilteredAdded = addedUsers.filter(u => u.name.toLowerCase().includes(searchRight.toLowerCase()));

  // Derived lists for Mobile
  const mobileFilteredAvailable = allUsers.filter(u => u.name.toLowerCase().includes(searchMobile.toLowerCase()));
  const mobileSelectedUsers = addedUsers;

  const renderDesktopUserLabel = (user: User, checked: boolean, onChange: (checked: boolean) => void) => (
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
      description={<span className="hidden md:block">Move users to the right to configure them on the calendar.</span>}
      size="lg"
      contentClassName="modal-dual-list md:max-w-4xl max-w-2xl md:!p-6 !p-0"
      headerClassName="p-4 pb-0 md:p-0"
      bodyClassName="flex flex-col p-0 md:p-1 h-[80vh] md:h-auto overflow-hidden md:overflow-y-auto md:max-h-[75vh]"
    >
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block">
        <div className="dual-list-container">
            {/* Left Panel: Available */}
            <div className="dual-list-panel">
                <div className="panel-header">
                    <span>Available (<span id="avail-users-count">{availableUsers.length}</span>)</span>
                    <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setLeftChecked(new Set())}>Clear</Button>
                </div>
                <div className="panel-search">
                    <Input type="search" placeholder="Search Users..." value={searchLeft} onChange={(e) => setSearchLeft(e.target.value)} />
                </div>
                <div className="panel-list user-panel-list">
                    {loading ? (
                      <div className="p-4 text-sm text-slate-500">Loading users...</div>
                    ) : error ? (
                      <div className="p-4 text-sm text-rose-600">{error}</div>
                    ) : desktopFilteredAvailable.length ? (
                      desktopFilteredAvailable.map(user => renderDesktopUserLabel(user, leftChecked.has(user.id), (c) => {
                      const next = new Set(leftChecked);
                      if (c) next.add(user.id); else next.delete(user.id);
                      setLeftChecked(next);
                    }))
                    ) : (
                      <EmptyState
                        title="No users available"
                        description="No active tenant users were found for assignment."
                      />
                    )}
                </div>
                <div className="panel-footer">
                    <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setLeftChecked(new Set(desktopFilteredAvailable.map(u => u.id)))}>Select All</Button>
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
                    <span>Added (<span id="added-users-count">{addedUsers.length}</span>)</span>
                    <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setRightChecked(new Set())}>Clear</Button>
                </div>
                <div className="panel-search">
                    <Input type="search" placeholder="Search Added..." value={searchRight} onChange={(e) => setSearchRight(e.target.value)} />
                </div>
                <div className="panel-list user-panel-list">
                    {desktopFilteredAdded.map(user => renderDesktopUserLabel(user, rightChecked.has(user.id), (c) => {
                      const next = new Set(rightChecked);
                      if (c) next.add(user.id); else next.delete(user.id);
                      setRightChecked(next);
                    }))}
                </div>
                <div className="panel-footer">
                    <Button variant="link" size="inline" className="panel-link-btn" onClick={() => setRightChecked(new Set(desktopFilteredAdded.map(u => u.id)))}>Select All</Button>
                </div>
            </div>
        </div>
        <DialogFooter className="!pt-4 !border-t-0 !px-0 !pb-0">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleDone}>Done</Button>
        </DialogFooter>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="flex md:hidden flex-col h-full">
        <div className="flex flex-col w-full px-4 pt-4 shrink-0">
          <div className="relative mb-4">
            <Input
              type="search"
              placeholder="Search users by name or role..."
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
                  {mobileSelectedUsers.map(user => (
                    <div key={`sel-${user.id}`} className="bg-white rounded border border-[#e8dcf7] p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-[#5a32a3] rounded-full w-5 h-5 flex items-center justify-center text-white shrink-0">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} alt={user.name} className="w-6 h-6 rounded-full" />
                          <span className="text-sm text-slate-700 font-medium">{user.name}</span>
                        </div>
                        <button type="button" aria-label="Remove" onClick={() => {
                          const next = new Set(selectedIds);
                          next.delete(user.id);
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
                {loading ? (
                    <div className="p-6 text-center text-sm text-slate-500">Loading users...</div>
                ) : error ? (
                    <div className="p-6 text-center text-sm text-rose-600">{error}</div>
                ) : mobileFilteredAvailable.length > 0 ? (
                    mobileFilteredAvailable.map((user, index) => {
                      const checked = selectedIds.has(user.id);
                      return (
                        <label key={`avail-${user.id}`} className={`flex items-center p-4 border-slate-100 cursor-pointer transition-colors ${checked ? 'bg-[#f8f5ff]' : 'hover:bg-slate-50'} ${index !== mobileFilteredAvailable.length - 1 ? 'border-b' : ''}`}>
                          <div className="mr-3">
                            <Checkbox
                                checked={checked}
                                onChange={(e) => {
                                  const next = new Set(selectedIds);
                                  if (e.target.checked) next.add(user.id);
                                  else next.delete(user.id);
                                  setSelectedIds(next);
                                }}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                              <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} alt={user.name} className="w-8 h-8 rounded-full" />
                              <div className="flex flex-col">
                                <span className={`text-sm font-medium leading-tight ${checked ? 'text-slate-900' : 'text-slate-700'}`}>{user.name}</span>
                                <span className="text-xs text-slate-500 mt-1 leading-none">{user.role}</span>
                              </div>
                          </div>
                        </label>
                      );
                  })
                ) : (
                  <div className="p-6">
                    <EmptyState
                      title="No users found"
                      description={searchMobile ? `No users matching "${searchMobile}"` : "No active tenant users were found for assignment."}
                    />
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
