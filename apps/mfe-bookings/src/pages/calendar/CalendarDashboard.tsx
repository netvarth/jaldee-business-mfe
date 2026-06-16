import React, { useState } from 'react';
import { format } from 'date-fns';
import { useCalendars } from '../../services/useCalendars';
import { useBookings } from '../../services/useBookings';
import { useProviders } from '../../services/useProviders';
import { useServices } from '../../services/useServices';
import { useModal } from '../../contexts/ModalContext';
import CreateAppointmentModal from '../booking/CreateAppointmentModal';
import DayGrid from './DayGrid';

interface CalendarDashboardProps {
    onBookingSelect: (bookingId: string) => void;
}

export default function CalendarDashboard({ onBookingSelect }: CalendarDashboardProps) {
    const { openModal } = useModal();
    const { calendars } = useCalendars();

    const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
    const [viewBy, setViewBy] = useState<'doctors' | 'calendars'>('doctors');
    const [date, setDate] = useState(new Date('2026-05-25T09:00:00'));

    // Live data only — no sample fallback (empty states surface real gaps).
    const { bookings: liveBookings } = useBookings(format(date, 'yyyy-MM-dd'));
    const { providers: liveProviders } = useProviders();
    const { services } = useServices();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Collapsible states for sidebar groups
    const [calendarsOpen, setCalendarsOpen] = useState(true);
    const [usersOpen, setUsersOpen] = useState(true);
    const [servicesOpen, setServicesOpen] = useState(true);



    return (
        <section id="page-dashboard" className="page-section active h-full flex flex-col relative overflow-hidden">
            {/* Toolbar Area */}
            <div className="toolbar shrink-0">
                <div className="toolbar-left">
                    <button className="icon-toggle-btn active" id="btn-grid-view">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                    </button>
                    <div className="view-pill-group">
                        <button className={`view-pill ${viewMode === 'DAY' ? 'active' : ''}`} onClick={() => setViewMode('DAY')}>Day</button>
                        <button className={`view-pill ${viewMode === 'WEEK' ? 'active' : ''}`} onClick={() => setViewMode('WEEK')}>Week</button>
                        <button className={`view-pill ${viewMode === 'MONTH' ? 'active' : ''}`} onClick={() => setViewMode('MONTH')}>Month</button>
                    </div>
                    <div className="date-navigator">
                        <button className="nav-arrow-btn" onClick={() => {
                            const newDate = new Date(date);
                            newDate.setDate(date.getDate() - (viewMode === 'DAY' ? 1 : 7));
                            setDate(newDate);
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <button className="date-picker-trigger" onClick={() => setDate(new Date())}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="date-icon"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                            <span>{format(date, "d MMM yyyy")}{format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") ? ", Today" : ""}</span>
                        </button>
                        <button className="nav-arrow-btn" onClick={() => {
                            const newDate = new Date(date);
                            newDate.setDate(date.getDate() + (viewMode === 'DAY' ? 1 : 7));
                            setDate(newDate);
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                </div>
                <div className="toolbar-right">
                    <div className="group-select-wrapper">
                        <select className="custom-select" id="group-view-by" value={viewBy} onChange={(e) => setViewBy(e.target.value as any)}>
                            <option value="doctors">View by doctors</option>
                            <option value="calendars">View by calendars</option>
                            <option value="departments">View by departments</option>
                        </select>
                    </div>
                    <button className="btn btn-secondary filter-applied-btn" id="filter-panel-toggle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        <span id="filter-btn-text">Filter</span>
                    </button>
                    <button onClick={() => openModal(<CreateAppointmentModal />)} className="btn btn-primary" style={{ fontWeight: 500, fontSize: "13px", padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                        <span>+ Appointment</span>
                    </button>
                </div>
            </div>

            {/* Dashboard Layout (Sidebar + Main Grid) */}
            <div className="dashboard-body flex-1 overflow-hidden">
                {/* Dashboard Sidebar (Checkboxes) */}
                <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} id="dashboard-sidebar-panel">
                    <button 
                        className="sidebar-collapse-btn" 
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                        title="Toggle Sidebar Panel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>

                    <div className="sidebar-scrollable-content">
                        {/* Calendars Section */}
                        <div className={`sidebar-group ${!calendarsOpen ? 'collapsed' : ''}`}>
                            <div className="sidebar-group-header">
                                <span className="group-title">Calendars ({calendars.length}/{calendars.length})</span>
                                <div className="group-actions">
                                    <button className="sidebar-action-btn toggle-group-collapse" onClick={() => setCalendarsOpen(!calendarsOpen)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="sidebar-group-body">
                                {calendars.map(cal => (
                                    <label key={cal.uid || cal.id} className="custom-checkbox-container color-cb-blue">
                                        <input type="checkbox" defaultChecked />
                                        <span className="checkmark"></span>
                                        <span className="truncate">{cal.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Users Section */}
                        <div className={`sidebar-group ${!usersOpen ? 'collapsed' : ''}`}>
                            <div className="sidebar-group-header">
                                <span className="group-title">Users ({liveProviders.length}/{liveProviders.length})</span>
                                <div className="group-actions">
                                    <button className="sidebar-action-btn toggle-group-collapse" onClick={() => setUsersOpen(!usersOpen)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="sidebar-group-body">
                                <div className="sidebar-search-box">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                                    <input type="text" placeholder="Search User" />
                                </div>
                                <div className="user-checkbox-list flex flex-col gap-2">
                                    {liveProviders.map(user => (
                                        <div key={user.id} className="checkbox-item-row">
                                            <label className="custom-checkbox-container">
                                                <input type="checkbox" defaultChecked />
                                                <span className="checkmark"></span>
                                                <div className="user-sidebar-row">
                                                    <div className={`status-dot ${user.status === 'online' ? 'online' : ''}`}></div>
                                                    <div className={`avatar-mini ${user.color.includes('bg-emerald') ? 'avatar-color-3' : user.color.includes('bg-purple') ? 'avatar-color-1' : 'avatar-color-4'}`}>{user.code}</div>
                                                    <span className="truncate" style={{maxWidth: '120px'}}>{user.name}</span>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Services Section */}
                        <div className={`sidebar-group ${!servicesOpen ? 'collapsed' : ''}`}>
                            <div className="sidebar-group-header">
                                <span className="group-title">Services ({services.length})</span>
                                <div className="group-actions">
                                    <button className="sidebar-action-btn toggle-group-collapse" onClick={() => setServicesOpen(!servicesOpen)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="sidebar-group-body">
                                {services.map(svc => (
                                    <label key={svc.id} className="custom-checkbox-container">
                                        <input type="checkbox" defaultChecked />
                                        <span className="checkmark"></span>
                                        <span className="truncate">{svc.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Grid Container */}
                <div className="calendar-grid-container" id="calendar-grid-scroll-area">
                    {viewMode === 'DAY' ? (
                        <DayGrid
                            date={date}
                            viewBy={viewBy}
                            users={liveProviders as any}
                            calendars={calendars as any}
                            bookings={liveBookings as any}
                            services={services}
                            onBookingSelect={onBookingSelect}
                        />
                    ) : (
                        <div style={{flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B'}}>
                            {viewMode} view is under construction in 1:1 translation phase.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
