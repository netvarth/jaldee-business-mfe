import React from 'react';
import { User, Calendar as CalendarType, Booking, Service } from '../../../types';
import { format, isSameDay } from 'date-fns';
import { Button } from '@jaldee/design-system';
import { useModal } from '../../contexts/ModalContext';
import CreateAppointmentDrawer from '../booking/CreateAppointmentDrawer';

interface DayGridProps {
    date: Date;
    viewBy: 'doctors' | 'calendars';
    users: User[];
    calendars: CalendarType[];
    bookings: Booking[];
    services: Service[];
    onBookingSelect: (id: string) => void;
}

function parseTimeValue(value?: string): { hour: number; minute: number } | null {
    if (!value) return null;

    if (value.includes(' ')) {
        const [timePart, modifier] = value.split(' ');
        const [rawHour, rawMinute] = timePart.split(':').map(Number);
        if (Number.isNaN(rawHour) || Number.isNaN(rawMinute)) return null;

        let hour = rawHour;
        if (modifier === 'PM' && hour < 12) hour += 12;
        if (modifier === 'AM' && hour === 12) hour = 0;
        return { hour, minute: rawMinute };
    }

    const [hour, minute] = value.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return { hour, minute };
}

export default function DayGrid({ date, viewBy, users, calendars, bookings, services, onBookingSelect }: DayGridProps) {
    const { openModal, openDrawer } = useModal();
    const startHour = 0;
    const endHour = 23;
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    // Filter columns (mocking active selection for now to all)
    const columnsList = viewBy === 'doctors' ? users : calendars;

    if (columnsList.length === 0) {
        return (
            <div className="day-view-grid">
                <div className="doctor-columns-wrapper">
                    <div style={{flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', padding: '40px'}}>
                        No columns to display. Please check calendars or users checkboxes in the sidebar.
                    </div>
                </div>
            </div>
        );
    }

    // Calculate current time marker position
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const minutesFromStart = ((now.getHours() - startHour) * 60) + now.getMinutes();
    const redLineTop = 60 + Math.floor((minutesFromStart / 60) * 80);

    return (
        <div className="calendar-grid day-view w-full h-full">
            <div className="calendar-grid-content h-full flex flex-col">
                <div className="calendar-scroll flex-1 custom-scrollbar">
                    <div className="calendar-grid-inner min-w-[800px]">
                        {/* Header */}
                        <div className="calendar-header" style={{ gridTemplateColumns: `120px repeat(${columnsList.length}, minmax(300px, 1fr))` }}>
                            <div className="calendar-timezone flex flex-col justify-center items-center">
                                <div className="timezone-label text-[11px] font-bold text-slate-500 tracking-wide text-center uppercase" style={{ color: '#6B7280' }}>UTC<br/>+05:30</div>
                            </div>
                            {columnsList.map((col: any) => {
                                const id = col.uid || col.id;
                                const name = col.name;
                                const subText = col.role || col.location || '';
                                const color = col.color || '#9333EA';
                                const code = col.code || '';
                                const status = col.status || 'active';

                                const colBookings = bookings.filter((b: any) => 
                                    (viewBy === 'doctors' ? (b.providerId === id || b.userUid === id) : (b.calendarId === id || b.calendarUid === id))
                                );

                                return (
                                    <div key={id} className={`doctor-card ${status === 'leave' ? 'on-leave' : ''}`} style={{ borderColor: color }}>
                                        <div className="doctor-card-top w-full">
                                            <div className="flex items-center gap-3 w-full">
                                                <div className="doctor-avatar w-10 h-10 rounded-xl" style={{ backgroundColor: color }}>
                                                    {code || name?.substring(0, 2)?.toUpperCase()}
                                                </div>
                                                <div className="doctor-info flex-1">
                                                    <strong className="text-slate-900 text-[15px]">{name}</strong>
                                                    <span className="text-slate-500 font-medium">{colBookings.length > 0 ? `${colBookings.length} Bookings` : 'No Bookings'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="doctor-card-meta absolute top-3 right-3">
                                            {status === 'leave' ? (
                                                <span className="doctor-badge bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full text-xs font-bold">On Leave</span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Body */}
                        <div className="calendar-body" style={{ gridTemplateColumns: `120px repeat(${columnsList.length}, minmax(300px, 1fr))` }}>
                            {hours.map((hour) => {
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                const timeLabel = `${displayHour.toString().padStart(2, '0')}:00 ${ampm}`;

                                return (
                                    <div key={hour} className="calendar-row" style={{ gridTemplateColumns: `120px repeat(${columnsList.length}, minmax(300px, 1fr))` }}>
                                        <div className="hour-column text-slate-400 font-medium">{displayHour}.00 {ampm}</div>
                                        {columnsList.map((col: any) => {
                                            const id = col.uid || col.id;
                                            const status = col.status || 'active';
                                            
                                            // Filter bookings for this slot and column
                                            const slotBookings = bookings.filter((b: any) => {
                                                const matchesCol = (viewBy === 'doctors' ? (b.providerId === id || b.userUid === id) : (b.calendarId === id || b.calendarUid === id));
                                                if (!matchesCol) return false;
                                                
                                                const bDate = new Date(b.bookingDate || b.date);
                                                if (!isSameDay(bDate, date)) return false;
                                                
                                                const timeStr = b.time || b.startTime;
                                                const start = parseTimeValue(timeStr);
                                                return start && start.hour === hour;
                                            });

                                            return (
                                                <div 
                                                    key={`${id}-${hour}`} 
                                                    className={`calendar-cell ${status === 'leave' ? 'on-leave' : ''}`}
                                                    onClick={() => openDrawer(
                                                        <CreateAppointmentDrawer 
                                                          initialDate={date} 
                                                          initialTime={`${hour.toString().padStart(2, '0')}:00`} 
                                                          initialProviderUid={viewBy === 'doctors' ? id : undefined}
                                                          initialCalendarUid={viewBy === 'calendars' ? id : undefined}
                                                        />
                                                    )}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {slotBookings.length > 0 && (
                                                        <div className="detail-stack w-full pointer-events-none flex flex-col gap-1">
                                                            {viewBy === 'calendars' ? (
                                                                // VIEW BY CALENDAR (Columns are Calendars)
                                                                // Group bookings by User (Doctor)
                                                                (function() {
                                                                    const userGroups = Object.entries(slotBookings.reduce((acc: any, bk: any) => {
                                                                        const uid = bk.providerId || bk.userUid || 'unknown';
                                                                        if (!acc[uid]) acc[uid] = [];
                                                                        acc[uid].push(bk);
                                                                        return acc;
                                                                    }, {}));
                                                                    
                                                                    // If total bookings in this slot > 3, we show the compact horizontal summary
                                                                    const showCompact = slotBookings.length > 3;

                                                                    if (showCompact) {
                                                                        return (
                                                                            <div className="flex flex-wrap gap-1 pointer-events-auto mt-auto">
                                                                                {userGroups.map(([uid, bks]: [string, any[]]) => {
                                                                                    const user = users.find(u => u.uid === uid);
                                                                                    const initials = user ? (user.code || user.name?.substring(0, 2)?.toUpperCase()) : '?';
                                                                                    const color = user?.color || '#9333EA';
                                                                                    return (
                                                                                        <div key={uid} className="flex flex-col items-center">
                                                                                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-sm" style={{ backgroundColor: color }}>
                                                                                                {initials}
                                                                                            </div>
                                                                                            <span className="text-[9px] font-bold text-slate-600 mt-0.5">{bks.length}</span>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                                <div className="flex flex-col items-center">
                                                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 text-[12px] font-bold bg-slate-100 shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={date} initialTime={`${hour.toString().padStart(2, '0')}:00`} initialCalendarUid={id} />); }}>
                                                                                        +
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return userGroups.map(([uid, bks]: [string, any[]]) => {
                                                                        const user = users.find(u => u.uid === uid);
                                                                        const initials = user ? (user.code || user.name?.substring(0, 2)?.toUpperCase()) : '?';
                                                                        const color = user?.color || '#9333EA';
                                                                        
                                                                        return (
                                                                            <Button
                                                                                key={uid}
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="pointer-events-auto flex items-center justify-between w-full p-1.5 rounded-lg border shadow-sm transition-all hover:opacity-90"
                                                                                style={{ borderColor: color, backgroundColor: '#fff' }}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <div className="flex items-center gap-2 flex-1">
                                                                                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: color }}>
                                                                                        {initials}
                                                                                    </div>
                                                                                    <div className="flex flex-col items-start leading-tight">
                                                                                        <span style={{ fontSize: '12px', color: '#333', fontWeight: 600 }}>{bks.length} {bks.length === 1 ? 'Booking' : 'Bookings'}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center justify-center w-5 h-5 rounded-full text-white" style={{ backgroundColor: color, fontSize: '14px', lineHeight: 1 }}>
                                                                                    +
                                                                                </div>
                                                                            </Button>
                                                                        );
                                                                    });
                                                                })()
                                                            ) : (
                                                                // VIEW BY DOCTORS (Columns are Doctors)
                                                                (function() {
                                                                    const totalBookings = slotBookings.length;
                                                                    
                                                                    // If 8+ bookings, just show color bars grouped by calendar
                                                                    if (totalBookings >= 8) {
                                                                        const calGroups = Object.entries(slotBookings.reduce((acc: any, bk: any) => {
                                                                            const calId = bk.calendarId || bk.calendarUid || 'unknown';
                                                                            if (!acc[calId]) acc[calId] = [];
                                                                            acc[calId].push(bk);
                                                                            return acc;
                                                                        }, {}));
                                                                        
                                                                        return (
                                                                            <div className="flex flex-wrap gap-1 pointer-events-auto mt-auto">
                                                                                {calGroups.map(([calId, bks]: [string, any[]]) => {
                                                                                    const cal = calendars.find(c => (c.uid || c.id) === calId);
                                                                                    const calColor = cal?.color || '#9333EA';
                                                                                    return (
                                                                                        <div key={calId} className="w-2 h-4 rounded-sm" style={{ backgroundColor: calColor }} title={`${bks.length} Bookings`} />
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    
                                                                    // If 3-7 bookings, show N Bookings summary cards grouped by Calendar
                                                                    if (totalBookings >= 3) {
                                                                        const calGroups = Object.entries(slotBookings.reduce((acc: any, bk: any) => {
                                                                            const calId = bk.calendarId || bk.calendarUid || 'unknown';
                                                                            if (!acc[calId]) acc[calId] = [];
                                                                            acc[calId].push(bk);
                                                                            return acc;
                                                                        }, {}));
                                                                        return calGroups.map(([calId, bks]: [string, any[]]) => {
                                                                            const cal = calendars.find(c => (c.uid || c.id) === calId);
                                                                            const calColor = cal?.color || '#9333EA';
                                                                            return (
                                                                                <Button
                                                                                    key={calId}
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="pointer-events-auto flex items-center justify-between w-full p-1.5 rounded border transition-all hover:opacity-90"
                                                                                    style={{ backgroundColor: toRgba(calColor, 0.2), borderColor: calColor }}
                                                                                    onClick={(e) => { e.stopPropagation(); }}
                                                                                >
                                                                                    <span style={{ fontSize: '11px', color: '#1e293b', fontWeight: 600 }}>{bks.length} Bookings</span>
                                                                                    <span style={{ color: calColor, fontSize: '14px', lineHeight: 1, fontWeight: 700 }}>+</span>
                                                                                </Button>
                                                                            );
                                                                        });
                                                                    }
                                                                    
                                                                    // If 1-2 bookings, show individual cards with Customer Name and Time
                                                                    return slotBookings.map((bk: any) => {
                                                                        const cal = calendars.find(c => (c.uid || c.id) === (bk.calendarId || bk.calendarUid));
                                                                        const calColor = cal?.color || '#9333EA';
                                                                        const customerName = bk.customer?.name || bk.patientName || 'Customer';
                                                                        const timeLabel = bk.time || bk.startTime || `${hour.toString().padStart(2, '0')}:00`;
                                                                        return (
                                                                            <div
                                                                                key={bk.id || bk.uid}
                                                                                className="pointer-events-auto flex flex-col items-start w-full p-1.5 rounded border transition-all hover:opacity-90 shadow-sm cursor-pointer"
                                                                                style={{ backgroundColor: toRgba(calColor, 0.15), borderLeft: `3px solid ${calColor}` }}
                                                                                onClick={(e) => { e.stopPropagation(); onBookingSelect(bk.id || bk.uid); }}
                                                                            >
                                                                                <span className="truncate w-full text-left" style={{ fontSize: '11px', color: '#1e293b', fontWeight: 700 }}>{customerName}</span>
                                                                                <span style={{ fontSize: '10px', color: '#475569', fontWeight: 500 }}>{timeLabel}</span>
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                            
                            {/* Current Time Indicator Line */}
                            {isToday && minutesFromStart >= 0 && minutesFromStart <= (endHour - startHour + 1) * 60 && (
                                <div className="absolute left-0 right-0 pointer-events-none z-10 flex items-center" style={{ top: `${redLineTop}px` }}>
                                    <div className="w-[120px] flex justify-end pr-2">
                                        <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-2">
                                            {format(now, 'hh:mm')}
                                        </div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 relative -right-[5px] z-20"></div>
                                    </div>
                                    <div className="flex-1 h-[2px] bg-red-500 relative z-10"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
