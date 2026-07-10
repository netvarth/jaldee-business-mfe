import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button, Checkbox, Input, PageHeader, Select } from '@jaldee/design-system';
import { useCalendars } from '../../services/useCalendars';
import { useBookings } from '../../services/useBookings';
import { useProviders } from '../../services/useProviders';
import { useServices } from '../../services/useServices';
import { useModal } from '../../contexts/ModalContext';
import { CalendarSettings } from './CalendarSettings';
import { CustomizeCalendar } from './CustomizeCalendar';
import { CalendarDetails } from './CalendarDetails';

import WeekGrid from './WeekGrid';
import MonthGrid from './MonthGrid';
import ListGrid from './ListGrid';
import CreateAppointmentModal from '../booking/CreateAppointmentModal';
import DayGrid from './DayGrid';
import './calendar-grid.css';
import './list-view.css';

interface CalendarDashboardProps {
    onBookingSelect: (bookingId: string) => void;
}

export default function CalendarDashboard({ onBookingSelect }: CalendarDashboardProps) {
    const { openModal } = useModal();
    const { calendars } = useCalendars();

    const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
    const [viewBy, setViewBy] = useState<'doctors' | 'calendars' | 'departments'>('doctors');
    const [date, setDate] = useState(new Date());

    // Live data only — no sample fallback (empty states surface real gaps).
    const { bookings: liveBookings } = useBookings(format(date, 'yyyy-MM-dd'), viewMode);
    const { providers: liveProviders } = useProviders();
    const { services } = useServices();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Collapsible states for sidebar groups
    const [providersOpen, setProvidersOpen] = useState(true);
    const [locationsOpen, setLocationsOpen] = useState(true);
    const [servicesOpen, setServicesOpen] = useState(true);
    const [calendarsOpen, setCalendarsOpen] = useState(true);
    
    // Extract unique locations from calendars for the filter
    const uniqueLocations = Array.from(new Set(calendars.map(c => c.locationName).filter(Boolean)));



    return (
        <section
            id="page-dashboard"
            data-testid="bookings-calendar-dashboard"
            className="page-section active h-full flex flex-col relative overflow-hidden"
        >
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 md:px-6">
                <PageHeader
                    title="Appointments"
                    subtitle="View schedules, availability, and bookings across calendars."
                    className="mb-4"
                />
            </div>
            {/* Toolbar Area */}
            <div className="toolbar shrink-0" data-testid="bookings-calendar-toolbar">
                <div className="toolbar-left">
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 mr-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>}
                            className={`rounded shadow-none ${layoutMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setLayoutMode('grid')}
                            aria-label="Grid view"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>}
                            className={`rounded shadow-none ${layoutMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setLayoutMode('list')}
                            aria-label="List view"
                        />
                    </div>
                    <div className="date-navigator">
                        <Button variant="ghost" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>} aria-label="Previous period" id="bookings-prev-period" data-testid="bookings-prev-period" className="nav-arrow-btn" onClick={() => {
                            const newDate = new Date(date);
                            newDate.setDate(date.getDate() - (viewMode === 'DAY' ? 1 : 7));
                            setDate(newDate);
                        }} />
                        <Button variant="ghost" size="sm" id="bookings-current-date" data-testid="bookings-current-date" className="date-picker-trigger font-medium" onClick={() => setDate(new Date())}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="date-icon"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                            <span>{format(date, "MMMM d, yyyy")}{format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? " (Today)" : ""}</span>
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
                                { value: 'doctors', label: 'View by Doctors' },
                                { value: 'calendars', label: 'View by Calendars' },
                                { value: 'departments', label: 'View by Departments' },
                            ]}
                            onChange={(e) => setViewBy(e.target.value as typeof viewBy)}
                        />
                    </div>
                    <Button variant="secondary" size="sm" className="filter-applied-btn bg-white border-slate-200 font-medium" id="filter-panel-toggle" data-testid="bookings-filter-panel-toggle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        <span id="filter-btn-text">Filter</span>
                    </Button>
                    <Button id="bookings-create-appointment" data-testid="bookings-create-appointment" onClick={() => openModal(<CreateAppointmentModal initialDate={date} />)} size="sm" className="bg-primary text-white font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                        <span>New Appointment</span>
                    </Button>
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
                        {/* Providers Section */}
                        <div className={`sidebar-group ${!providersOpen ? 'collapsed' : ''}`} data-testid="bookings-providers-group" data-state={providersOpen ? "open" : "collapsed"}>
                            <div className="sidebar-group-header">
                                <span className="group-title font-medium text-slate-700">Providers ({liveProviders.length}/{liveProviders.length})</span>
                                <div className="group-actions">
                                    <Button variant="ghost" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>} id="bookings-providers-toggle" data-testid="bookings-providers-toggle" className="sidebar-action-btn toggle-group-collapse" onClick={() => setProvidersOpen(!providersOpen)} data-state={providersOpen ? "open" : "collapsed"} aria-label="Toggle providers" />
                                </div>
                            </div>
                            <div className="sidebar-group-body">
                                <Input
                                    id="bookings-provider-search"
                                    data-testid="bookings-provider-search"
                                    type="search"
                                    placeholder="Search Provider"
                                    containerClassName="sidebar-search-box mb-2"
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>}
                                />
                                <div className="user-checkbox-list flex flex-col gap-2">
                                    {liveProviders.map(user => (
                                        <div key={user.id} className="checkbox-item-row flex items-center hover:bg-slate-50 p-1 -ml-1 rounded">
                                            <Checkbox
                                                id={`bookings-provider-filter-${user.id}`}
                                                data-testid={`bookings-provider-filter-${user.id}-checkbox`}
                                                defaultChecked
                                                label={
                                                <div className="user-sidebar-row flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${user.color.includes('emerald') ? 'bg-emerald-500' : user.color.includes('purple') ? 'bg-purple-500' : 'bg-blue-500'}`}>{user.code || user.name.substring(0, 2).toUpperCase()}</div>
                                                    <span className="truncate text-sm text-slate-700" style={{maxWidth: '120px'}}>{user.name}</span>
                                                </div>
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Locations Section */}
                        {uniqueLocations.length > 0 && (
                            <div className={`sidebar-group ${!locationsOpen ? 'collapsed' : ''}`} data-testid="bookings-locations-group" data-state={locationsOpen ? "open" : "collapsed"}>
                                <div className="sidebar-group-header">
                                    <span className="group-title font-medium text-slate-700">Locations ({uniqueLocations.length})</span>
                                    <div className="group-actions">
                                        <Button variant="ghost" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>} id="bookings-locations-toggle" data-testid="bookings-locations-toggle" className="sidebar-action-btn toggle-group-collapse" onClick={() => setLocationsOpen(!locationsOpen)} data-state={locationsOpen ? "open" : "collapsed"} aria-label="Toggle locations" />
                                    </div>
                                </div>
                                <div className="sidebar-group-body">
                                    <div className="user-checkbox-list flex flex-col gap-2">
                                        {uniqueLocations.map((loc, idx) => (
                                            <Checkbox
                                                key={idx}
                                                id={`bookings-location-filter-${idx}`}
                                                data-testid={`bookings-location-filter-${idx}-checkbox`}
                                                labelClassName="truncate text-sm text-slate-700"
                                                label={loc}
                                                defaultChecked
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Services Section */}
                        <div className={`sidebar-group ${!servicesOpen ? 'collapsed' : ''}`} data-testid="bookings-services-group" data-state={servicesOpen ? "open" : "collapsed"}>
                            <div className="sidebar-group-header">
                                <span className="group-title font-medium text-slate-700">Services ({services.length})</span>
                                <div className="group-actions">
                                    <Button variant="ghost" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>} id="bookings-services-toggle" data-testid="bookings-services-toggle" className="sidebar-action-btn toggle-group-collapse" onClick={() => setServicesOpen(!servicesOpen)} data-state={servicesOpen ? "open" : "collapsed"} aria-label="Toggle services" />
                                </div>
                            </div>
                            <div className="sidebar-group-body">
                                <div className="user-checkbox-list flex flex-col gap-2">
                                    {services.map(svc => (
                                        <Checkbox
                                            key={svc.id}
                                            id={`bookings-service-filter-${svc.id}`}
                                            data-testid={`bookings-service-filter-${svc.id}-checkbox`}
                                            labelClassName="truncate text-sm text-slate-700"
                                            label={svc.name}
                                            defaultChecked
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Calendars Section */}
                        <div className={`sidebar-group ${!calendarsOpen ? 'collapsed' : ''}`} data-testid="bookings-calendars-group" data-state={calendarsOpen ? "open" : "collapsed"}>
                            <div className="sidebar-group-header">
                                <span className="group-title font-medium text-slate-700">Calendars ({calendars.length}/{calendars.length})</span>
                                <div className="group-actions">
                                    <Button variant="ghost" size="sm" iconOnly icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>} id="bookings-calendars-toggle" data-testid="bookings-calendars-toggle" className="sidebar-action-btn toggle-group-collapse" onClick={() => setCalendarsOpen(!calendarsOpen)} data-state={calendarsOpen ? "open" : "collapsed"} aria-label="Toggle calendars" />
                                </div>
                            </div>
                            <div className="sidebar-group-body">
                                <div className="user-checkbox-list flex flex-col gap-2">
                                    {calendars.map(cal => (
                                        <Checkbox
                                            key={cal.uid || cal.id}
                                            id={`bookings-calendar-filter-${cal.uid || cal.id}`}
                                            data-testid={`bookings-calendar-filter-${cal.uid || cal.id}-checkbox`}
                                            containerClassName="color-cb-blue"
                                            labelClassName="truncate text-sm text-slate-700"
                                            label={cal.name}
                                            defaultChecked
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Grid Container */}
                <div className="calendar-grid-container" id="calendar-grid-scroll-area" data-testid="bookings-calendar-grid-area" data-view-mode={viewMode}>
                    {layoutMode === 'list' ? (
                        <ListGrid
                            bookings={liveBookings as any}
                            calendars={calendars as any}
                            services={services}
                            users={liveProviders as any}
                            onBookingSelect={onBookingSelect}
                        />
                    ) : viewMode === 'DAY' ? (
                        <DayGrid
                            date={date}
                            viewBy={viewBy}
                            users={liveProviders as any}
                            calendars={calendars as any}
                            bookings={liveBookings as any}
                            services={services}
                            onBookingSelect={onBookingSelect}
                        />
                    ) : viewMode === 'WEEK' ? (
                        <WeekGrid
                            date={date}
                            viewBy={viewBy}
                            users={liveProviders as any}
                            calendars={calendars as any}
                            bookings={liveBookings as any}
                            services={services}
                            onBookingSelect={onBookingSelect}
                        />
                    ) : (
                        <MonthGrid
                            date={date}
                            viewBy={viewBy}
                            users={liveProviders as any}
                            calendars={calendars as any}
                            bookings={liveBookings as any}
                            services={services}
                            onBookingSelect={onBookingSelect}
                        />
                    )}
                </div>
            </div>
        </section>
    );
}
