import React, { useState } from 'react';
import { Button } from '@jaldee/design-system';
import { useCalendars } from '../../../services/useCalendars';
import { useProviders } from '../../../services/useProviders';
import { useServices } from '../../../services/useServices';
import { useModal } from '../../../contexts/ModalContext';
import CreateFilterModal from './CreateFilterModal';

interface FilterDrawerProps {
    initialCalendars: Set<string>;
    initialUsers: Set<string>;
    initialServices: Set<string>;
    onApply: (calendars: Set<string>, users: Set<string>, services: Set<string>) => void;
    onClose: () => void;
}

export default function FilterDrawer({ initialCalendars, initialUsers, initialServices, onApply, onClose }: FilterDrawerProps) {
    const { calendars } = useCalendars();
    const { providers: liveProviders } = useProviders();
    const { services } = useServices();
    const { openModal } = useModal();

    const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set(initialCalendars));
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set(initialUsers));
    const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set(initialServices));

    // Accordion states
    const [calendarsOpen, setCalendarsOpen] = useState(true);
    const [usersOpen, setUsersOpen] = useState(true);
    const [servicesOpen, setServicesOpen] = useState(true);

    const handleClearFilters = () => {
        setSelectedCalendars(new Set());
        setSelectedUsers(new Set());
        setSelectedServices(new Set());
    };

    const handleApply = () => {
        onApply(selectedCalendars, selectedUsers, selectedServices);
        onClose();
    };

    const handleSave = () => {
        openModal(
            <CreateFilterModal 
                onSave={() => {
                    // Just show concept, close modal
                }}
                onSaveAndApply={() => {
                    handleApply();
                }}
            />
        );
    };

    const toggleSet = (set: Set<string>, id: string, setFn: (newSet: Set<string>) => void) => {
        const newSet = new Set(set);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setFn(newSet);
    };

    return (
        <div className="flex flex-col h-full bg-white w-full shadow-2xl relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-bold text-slate-800">Create Filter</h2>
                <button 
                    onClick={handleClearFilters}
                    className="text-sm font-semibold text-purple-700 hover:text-purple-800"
                >
                    Clear filters
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* My Calendars */}
                <div>
                    <div 
                        className="flex items-center justify-between cursor-pointer mb-2"
                        onClick={() => setCalendarsOpen(!calendarsOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <span className="font-semibold text-slate-800">My Calendars</span>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{calendars.length}</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-slate-400 transition-transform ${calendarsOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    {calendarsOpen && (
                        <div className="flex flex-col gap-2.5 mt-3 pl-1">
                            {calendars.map(cal => {
                                const id = cal.uid || cal.id || '';
                                return (
                                    <label key={id} className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600 shrink-0"
                                            checked={selectedCalendars.size === 0 || selectedCalendars.has(id)}
                                            onChange={() => {
                                                let newSet = new Set(selectedCalendars);
                                                if (selectedCalendars.size === 0) newSet = new Set(calendars.map(c => c.uid || c.id || ''));
                                                if (newSet.has(id)) newSet.delete(id);
                                                else newSet.add(id);
                                                if (newSet.size === calendars.length) newSet.clear();
                                                setSelectedCalendars(newSet);
                                            }}
                                        />
                                        <span className="text-sm text-slate-700 truncate">{cal.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                <hr className="border-slate-100" />

                {/* Users */}
                <div>
                    <div 
                        className="flex items-center justify-between cursor-pointer mb-2"
                        onClick={() => setUsersOpen(!usersOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span className="font-semibold text-slate-800">Users</span>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{liveProviders.length}</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-slate-400 transition-transform ${usersOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    {usersOpen && (
                        <div className="mt-3">
                            <div className="relative mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                                <input type="text" placeholder="Search here" className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                            </div>
                            <div className="flex flex-col gap-2.5 pl-1 max-h-48 overflow-y-auto">
                                {liveProviders.map(user => {
                                    const id = user.uid || user.id || '';
                                    return (
                                        <label key={id} className="flex items-center gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600 shrink-0"
                                                checked={selectedUsers.size === 0 || selectedUsers.has(id)}
                                                onChange={() => {
                                                    let newSet = new Set(selectedUsers);
                                                    if (selectedUsers.size === 0) newSet = new Set(liveProviders.map(p => p.uid || p.id || ''));
                                                    if (newSet.has(id)) newSet.delete(id);
                                                    else newSet.add(id);
                                                    if (newSet.size === liveProviders.length) newSet.clear();
                                                    setSelectedUsers(newSet);
                                                }}
                                            />
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: user.color || '#9333EA' }}>
                                                {user.code || user.name?.substring(0, 2)?.toUpperCase()}
                                            </div>
                                            <span className="text-sm text-slate-700 truncate">{user.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <hr className="border-slate-100" />

                {/* Services */}
                <div>
                    <div 
                        className="flex items-center justify-between cursor-pointer mb-2"
                        onClick={() => setServicesOpen(!servicesOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            <span className="font-semibold text-slate-800">Services</span>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{services.length}</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-slate-400 transition-transform ${servicesOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    {servicesOpen && (
                        <div className="mt-3">
                            <div className="relative mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                                <input type="text" placeholder="Search here" className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                            </div>
                            <div className="flex flex-col gap-2.5 pl-1 max-h-48 overflow-y-auto">
                                {services.map(svc => {
                                    const id = svc.id || '';
                                    return (
                                        <label key={id} className="flex items-center gap-3 cursor-pointer">
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600 shrink-0"
                                                checked={selectedServices.size === 0 || selectedServices.has(id)}
                                                onChange={() => {
                                                    let newSet = new Set(selectedServices);
                                                    if (selectedServices.size === 0) newSet = new Set(services.map(s => s.id || ''));
                                                    if (newSet.has(id)) newSet.delete(id);
                                                    else newSet.add(id);
                                                    if (newSet.size === services.length) newSet.clear();
                                                    setSelectedServices(newSet);
                                                }}
                                            />
                                            <span className="text-sm text-slate-700 truncate">{svc.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <hr className="border-slate-100" />

                {/* Other Filters (Static for now) */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Other Filters</h3>
                    <div className="flex flex-col gap-2">
                        {['Label', 'Status', 'Booking Type', 'Date Range'].map((f) => (
                            <div key={f} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50">
                                <span className="text-sm text-slate-600">{f}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0">
                <Button 
                    className="flex-1 font-semibold border-0" 
                    style={{ backgroundColor: '#4C1D95', color: 'white', borderRadius: '8px' }}
                    onClick={handleSave}
                >
                    Save Filter
                </Button>
                <Button 
                    variant="secondary"
                    className="flex-1 font-semibold"
                    style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#1E293B', borderRadius: '8px' }}
                    onClick={handleApply}
                >
                    Apply Filter
                </Button>
            </div>
        </div>
    );
}
