import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button, PageHeader, Select } from '@jaldee/design-system';
import { useCalendars } from '../../services/useCalendars';
import { useBookings } from '../../services/useBookings';
import { useProviders } from '../../services/useProviders';
import { useServices } from '../../services/useServices';
import { useModal } from '../../contexts/ModalContext';
import SavedFiltersModal from './SavedFiltersModal';
import FilterDrawer from './components/FilterDrawer';

import WeekGrid from './WeekGrid';
import MonthGrid from './MonthGrid';
import ListGrid from './ListGrid';
import CreateAppointmentDrawer from '../booking/CreateAppointmentDrawer';
import BlockSlotModal from '../booking/BlockSlotModal';
import DayGrid from './DayGrid';
import './calendar-grid.css';
import './list-view.css';

interface CalendarDashboardProps {
    onBookingSelect: (bookingId: string) => void;
}

export default function CalendarDashboard({ onBookingSelect }: CalendarDashboardProps) {
    const { openModal, openDrawer, closeDrawer } = useModal();
    const navigate = useNavigate();
    const { calendars } = useCalendars();
    const { providers: liveProviders } = useProviders();
    const { services } = useServices();

    const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
    const [viewBy, setViewBy] = useState<'doctors' | 'calendars'>('doctors');
    const [date, setDate] = useState(new Date());
    const [createMenuOpen, setCreateMenuOpen] = useState(false);

    // Live data only — no sample fallback (empty states surface real gaps).
    const { bookings: liveBookings } = useBookings(format(date, 'yyyy-MM-dd'), viewMode);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Filter states
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set());
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

    // Collapsible states for sidebar groups
    const [providersOpen, setProvidersOpen] = useState(true);
    const [servicesOpen, setServicesOpen] = useState(true);
    const [calendarsOpen, setCalendarsOpen] = useState(true);
    // Sync initial selected states when data loads
    React.useEffect(() => {
        if (calendars.length > 0 && selectedCalendarIds.size === 0) {
            setSelectedCalendarIds(new Set(calendars.map(c => c.uid || c.id || '')));
        }
    }, [calendars, selectedCalendarIds.size]);

    React.useEffect(() => {
        if (liveProviders.length > 0 && selectedUserIds.size === 0) {
            setSelectedUserIds(new Set(liveProviders.map(p => p.uid || p.id || '')));
        }
    }, [liveProviders, selectedUserIds.size]);

    React.useEffect(() => {
        if (services.length > 0 && selectedServiceIds.size === 0) {
            setSelectedServiceIds(new Set(services.map(s => s.id || '')));
        }
    }, [services, selectedServiceIds.size]);

    // Apply filters
    const filteredCalendars = selectedCalendarIds.size === 0 ? calendars : calendars.filter(c => selectedCalendarIds.has(c.uid || c.id || ''));
    const filteredProviders = selectedUserIds.size === 0 ? liveProviders : liveProviders.filter(p => selectedUserIds.has(p.uid || p.id || ''));
    
    const filteredBookings = liveBookings.filter((b: any) => {
        const calId = b.calendarId || b.calendarUid;
        const provId = b.providerId || b.userUid;
        // If booking has a calendarId and it's not selected, hide it. (Only if there are selected calendars to avoid hiding all initially)
        if (calId && selectedCalendarIds.size > 0 && !selectedCalendarIds.has(calId)) return false;
        // Same for provider
        if (provId && selectedUserIds.size > 0 && !selectedUserIds.has(provId)) return false;
        // For services, if we have serviceId in booking, filter by it. (Assuming booking has serviceId or serviceUid)
        const srvId = b.serviceId || b.serviceUid;
        if (srvId && selectedServiceIds.size > 0 && !selectedServiceIds.has(srvId)) return false;
        return true;
    });

    const formattedDate = `${format(date, "dd MMM yyyy")}${format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? ", Today" : ""}`;

    return (
        <section
            id="page-dashboard"
            data-testid="bookings-calendar-dashboard"
            className="page-section active h-full flex flex-col relative overflow-hidden"
        >
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 md:px-6">
                <PageHeader
                    title="Calendar"
                    subtitle="View schedules, availability, and bookings across calendars."
                    className="mb-4"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                id="bookings-open-calendars"
                                data-testid="bookings-open-calendars"
                                onClick={() => navigate("/calendars")}
                            >
                                Calendars
                            </Button>
                            <Button
                                size="sm"
                                id="bookings-create-calendar"
                                data-testid="bookings-create-calendar"
                                onClick={() => navigate("/calendars/create", { state: { returnTo: "/" } })}
                            >
                                Create Calendar
                            </Button>
                        </div>
                    }
                />
            </div>
            {/* Toolbar Area */}
            <div className="toolbar shrink-0 px-4 flex justify-between items-center bg-white border-b border-slate-200" style={{ height: '64px' }} data-testid="bookings-calendar-toolbar">
                <div className="toolbar-left flex items-center gap-4">
                    <div className="date-navigator">
                        <Button variant="ghost" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>} aria-label="Previous period" id="bookings-prev-period" data-testid="bookings-prev-period" className="nav-arrow-btn" onClick={() => {
                            const newDate = new Date(date);
                            newDate.setDate(date.getDate() - (viewMode === 'DAY' ? 1 : 7));
                            setDate(newDate);
                        }} />
                        <Button variant="ghost" size="sm" id="bookings-current-date" data-testid="bookings-current-date" className="date-picker-trigger font-bold text-slate-800 bg-white border border-slate-200" onClick={() => setDate(new Date())}>
                            <span>{formattedDate}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="date-icon text-purple-600 ml-1"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        </Button>
                        <Button variant="ghost" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>} aria-label="Next period" id="bookings-next-period" data-testid="bookings-next-period" className="nav-arrow-btn" onClick={() => {
                            const newDate = new Date(date);
                            newDate.setDate(date.getDate() + (viewMode === 'DAY' ? 1 : 7));
                            setDate(newDate);
                        }} />
                    </div>
                </div>
                <div className="toolbar-right">
                    <div className="view-pill-group">
                        <Button variant="ghost" size="sm" id="bookings-view-day" data-testid="bookings-view-day" data-active={viewMode === 'DAY'} className={`view-pill ${viewMode === 'DAY' ? 'active' : ''}`} onClick={() => setViewMode('DAY')}>Day</Button>
                        <Button variant="ghost" size="sm" id="bookings-view-week" data-testid="bookings-view-week" data-active={viewMode === 'WEEK'} className={`view-pill ${viewMode === 'WEEK' ? 'active' : ''}`} onClick={() => setViewMode('WEEK')}>Week</Button>
                        <Button variant="ghost" size="sm" id="bookings-view-month" data-testid="bookings-view-month" data-active={viewMode === 'MONTH'} className={`view-pill ${viewMode === 'MONTH' ? 'active' : ''}`} onClick={() => setViewMode('MONTH')}>Month</Button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <div className="group-select-wrapper">
                        <Select
                            className="custom-select bg-slate-50 border-slate-200 text-sm font-medium"
                            containerClassName="min-w-[160px]"
                            id="group-view-by"
                            testId="bookings-group-view-by"
                            value={viewBy}
                            options={[
                                { value: 'doctors', label: 'View by Users' },
                                { value: 'calendars', label: 'View by Calendar' },
                            ]}
                            onChange={(e) => setViewBy(e.target.value as typeof viewBy)}
                        />
                    </div>
                    <Button variant="secondary" size="sm" className="filter-applied-btn font-bold px-4" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', borderColor: '#F3E8FF' }} id="filter-panel-toggle" data-testid="bookings-filter-panel-toggle"
                        onClick={() => openDrawer(
                            <FilterDrawer
                                initialCalendars={selectedCalendarIds}
                                initialUsers={selectedUserIds}
                                initialServices={selectedServiceIds}
                                onApply={(cals, users, svcs) => {
                                    setSelectedCalendarIds(cals);
                                    setSelectedUserIds(users);
                                    setSelectedServiceIds(svcs);
                                }}
                                onClose={closeDrawer}
                            />,
                            { panelClassName: 'bg-white sm:w-[320px] sm:max-w-[320px]' }
                        )}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" x2="20" y1="6" y2="6"/><line x1="8" x2="16" y1="12" y2="12"/><line x1="10" x2="14" y1="18" y2="18"/></svg>
                        <span id="filter-btn-text">Filter</span>
                    </Button>
                    <div className="relative">
                        <Button id="bookings-create-appointment" data-testid="bookings-create-appointment" onClick={() => setCreateMenuOpen(!createMenuOpen)} size="sm" className="font-bold border-0 px-4" style={{ backgroundColor: '#311090', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>+ Create</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: createMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                        </Button>
                        {createMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setCreateMenuOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden py-1">
                                    <button 
                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        onClick={() => {
                                            setCreateMenuOpen(false);
                                            openDrawer(<CreateAppointmentDrawer initialDate={date} />);
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                                        Booking
                                    </button>
                                    <button 
                                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        onClick={() => {
                                            setCreateMenuOpen(false);
                                            navigate('/calendars/create', { state: { returnTo: '/' } });
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                        Calendar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Dashboard Layout (Sidebar + Main Grid) */}
            <div className="dashboard-body flex-1 overflow-hidden">
                {/* Dashboard Sidebar (Checkboxes) */}
                <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} id="dashboard-sidebar-panel" data-testid="bookings-dashboard-sidebar" data-state={isSidebarCollapsed ? "collapsed" : "open"}>
                    <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>}
                        id="bookings-sidebar-collapse"
                        data-testid="bookings-sidebar-collapse"
                        className="sidebar-collapse-btn" 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                        title="Toggle Sidebar Panel"
                        aria-label="Toggle sidebar panel"
                        data-state={isSidebarCollapsed ? "collapsed" : "open"}
                    />

                    <div className="sidebar-scrollable-content">
                        {/* Calendars Section */}
                        <div className={`sidebar-group ${!calendarsOpen ? 'collapsed' : ''}`} data-testid="bookings-calendars-group" data-state={calendarsOpen ? "open" : "collapsed"}>
                            <div className="sidebar-group-header flex justify-between items-center py-2 px-4 cursor-pointer" onClick={() => setCalendarsOpen(!calendarsOpen)}>
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    <span className="group-title font-semibold text-slate-800">Calendars ({calendars.length}/{calendars.length})</span>
                                </div>
                                <div className="group-actions flex items-center text-indigo-700 font-bold gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                                </div>
                            </div>
                            <div className="sidebar-group-body px-4 pb-2">
                                <div className="user-checkbox-list flex flex-col gap-3 mt-1">
                                    {calendars.map(cal => {
                                        const id = cal.uid || cal.id || '';
                                        return (
                                            <div key={id} className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    id={`cal-${id}`} 
                                                    className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600" 
                                                    checked={selectedCalendarIds.size === 0 || selectedCalendarIds.has(id)}
                                                    onChange={(e) => {
                                                        let newSet = new Set(selectedCalendarIds);
                                                        // If it was empty (meaning "all selected"), we first fill it with all calendars
                                                        if (selectedCalendarIds.size === 0) {
                                                            newSet = new Set(calendars.map(c => c.uid || c.id || ''));
                                                        }
                                                        
                                                        if (e.target.checked) newSet.add(id);
                                                        else newSet.delete(id);
                                                        
                                                        // If we've selected all of them manually, reset to empty (optimization)
                                                        if (newSet.size === calendars.length) {
                                                            newSet.clear();
                                                        }
                                                        
                                                        setSelectedCalendarIds(newSet);
                                                    }}
                                                />
                                                <label htmlFor={`cal-${id}`} className="text-sm text-slate-700 truncate cursor-pointer">{cal.name}</label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Users Section */}
                        <div className={`sidebar-group mt-2 ${!providersOpen ? 'collapsed' : ''}`} data-testid="bookings-providers-group" data-state={providersOpen ? "open" : "collapsed"}>
                            <div className="sidebar-group-header flex justify-between items-center py-2 px-4 cursor-pointer" onClick={() => setProvidersOpen(!providersOpen)}>
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                    <span className="group-title font-semibold text-slate-800">Users ({liveProviders.length}/{liveProviders.length})</span>
                                </div>
                                <div className="group-actions flex items-center text-indigo-700 font-bold gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                                </div>
                            </div>
                            <div className="sidebar-group-body px-4 pb-2">
                                <div className="relative mb-3 mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                                    <input type="text" placeholder="Search User" className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                                </div>
                                <div className="user-checkbox-list flex flex-col gap-3">
                                    {liveProviders.map(user => {
                                        const id = user.uid || user.id || '';
                                        return (
                                            <div key={id} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    id={`user-${id}`} 
                                                    className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600 shrink-0" 
                                                    checked={selectedUserIds.size === 0 || selectedUserIds.has(id)}
                                                    onChange={(e) => {
                                                        let newSet = new Set(selectedUserIds);
                                                        if (selectedUserIds.size === 0) {
                                                            newSet = new Set(liveProviders.map(p => p.uid || p.id || ''));
                                                        }
                                                        
                                                        if (e.target.checked) newSet.add(id);
                                                        else newSet.delete(id);
                                                        
                                                        if (newSet.size === liveProviders.length) {
                                                            newSet.clear();
                                                        }
                                                        setSelectedUserIds(newSet);
                                                    }}
                                                />
                                                <label htmlFor={`user-${id}`} className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: user.color || '#9333EA' }}>
                                                        {user.code || user.name?.substring(0, 2)?.toUpperCase()}
                                                    </div>
                                                    <span className="truncate text-sm text-slate-700">{user.name}</span>
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Services Section */}
                        <div className={`sidebar-group mt-2 ${!servicesOpen ? 'collapsed' : ''}`} data-testid="bookings-services-group" data-state={servicesOpen ? "open" : "collapsed"}>
                            <div className="sidebar-group-header flex justify-between items-center py-2 px-4 cursor-pointer" onClick={() => setServicesOpen(!servicesOpen)}>
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                    <span className="group-title font-semibold text-slate-800">Services ({services.length})</span>
                                </div>
                                <div className="group-actions flex items-center text-indigo-700 font-bold gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                                </div>
                            </div>
                            <div className="sidebar-group-body px-4 pb-2">
                                <div className="user-checkbox-list flex flex-col gap-3 mt-1">
                                    {services.map(svc => {
                                        const id = svc.id || '';
                                        return (
                                            <div key={id} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    id={`svc-${id}`} 
                                                    className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600 shrink-0" 
                                                    checked={selectedServiceIds.size === 0 || selectedServiceIds.has(id)}
                                                    onChange={(e) => {
                                                        let newSet = new Set(selectedServiceIds);
                                                        if (selectedServiceIds.size === 0) {
                                                            newSet = new Set(services.map(s => s.id || ''));
                                                        }
                                                        
                                                        if (e.target.checked) newSet.add(id);
                                                        else newSet.delete(id);
                                                        
                                                        if (newSet.size === services.length) {
                                                            newSet.clear();
                                                        }
                                                        setSelectedServiceIds(newSet);
                                                    }}
                                                />
                                                <label htmlFor={`svc-${id}`} className="truncate text-sm text-slate-700 cursor-pointer">{svc.name}</label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Grid Container */}
                <div className="calendar-grid-container" id="calendar-grid-scroll-area" data-testid="bookings-calendar-grid-area" data-view-mode={viewMode}>
                    {layoutMode === 'list' ? (
                        <ListGrid
                            bookings={filteredBookings as any}
                            calendars={filteredCalendars as any}
                            services={services}
                            users={filteredProviders as any}
                            onBookingSelect={onBookingSelect}
                        />
                    ) : viewMode === 'DAY' ? (
                        <DayGrid
                            date={date}
                            viewBy={viewBy}
                            users={filteredProviders as any}
                            calendars={filteredCalendars as any}
                            bookings={filteredBookings as any}
                            services={services}
                            onBookingSelect={onBookingSelect}
                        />
                    ) : viewMode === 'WEEK' ? (
                        <WeekGrid
                            date={date}
                            viewBy={viewBy}
                            users={filteredProviders as any}
                            calendars={filteredCalendars as any}
                            bookings={filteredBookings as any}
                            services={services}
                            onBookingSelect={onBookingSelect}
                        />
                    ) : (
                        <MonthGrid
                            date={date}
                            viewBy={viewBy}
                            users={filteredProviders as any}
                            calendars={filteredCalendars as any}
                            bookings={filteredBookings as any}
                            services={services}
                            onBookingSelect={onBookingSelect}
                            onDaySelect={(selectedDate) => {
                                setDate(selectedDate);
                                setViewMode('DAY');
                            }}
                        />
                    )}
                </div>
            </div>
        </section>
    );
}
