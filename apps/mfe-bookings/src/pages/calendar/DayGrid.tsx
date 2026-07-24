import React from 'react';
import { User, Calendar as CalendarType, Booking, Service } from '../../../types';
import { format, isSameDay } from 'date-fns';
import { Button } from '@jaldee/design-system';
import { useModal } from '../../contexts/ModalContext';
import CreateAppointmentDrawer from '../booking/CreateAppointmentDrawer';
import { toRgba } from '../../utils/colors';

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
                    <div className="calendar-grid-inner min-w-max">
                        {/* Header */}
                        <div className="calendar-header" style={{ gridTemplateColumns: `var(--hour-col-width, 120px) repeat(${columnsList.length}, minmax(var(--day-col-width, 300px), 1fr))` }}>
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
                        <div className="calendar-body" style={{ gridTemplateColumns: `var(--hour-col-width, 120px) repeat(${columnsList.length}, minmax(var(--day-col-width, 300px), 1fr))` }}>
                            {hours.map((hour) => {
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                const timeLabel = `${displayHour.toString().padStart(2, '0')}:00 ${ampm}`;

                                return (
                                    <div key={hour} className="calendar-row" style={{ gridTemplateColumns: `var(--hour-col-width, 120px) repeat(${columnsList.length}, minmax(var(--day-col-width, 300px), 1fr))` }}>
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
                                                                    
                                                                    const showCompact = slotBookings.length > 3;

                                                                    if (showCompact) {
                                                                        return (
                                                                            <div className="flex flex-wrap gap-1.5 pointer-events-auto mt-auto justify-end px-2">
                                                                                {userGroups.map(([uid, bks]: [string, any[]]) => {
                                                                                    const user = users.find(u => u.uid === uid);
                                                                                    const initials = user ? (user.code || user.name?.substring(0, 2)?.toUpperCase()) : '?';
                                                                                    const bgTheme = '#db2777';
                                                                                    return (
                                                                                        <div key={uid} className="flex flex-col items-center rounded-full py-0.5 px-0.5 shadow-sm" style={{ backgroundColor: bgTheme, border: `1px solid ${bgTheme}` }}>
                                                                                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: bgTheme }}>
                                                                                                {initials}
                                                                                            </div>
                                                                                            <span className="text-[11px] font-bold text-white my-0.5">{bks.length}</span>
                                                                                            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer text-white" style={{ backgroundColor: bgTheme }} onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={date} initialTime={`${hour.toString().padStart(2, '0')}:00`} initialCalendarUid={id} />); }}>
                                                                                                +
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <div className="flex flex-row flex-wrap gap-1.5 w-full pt-2.5 px-2 h-full items-start justify-start pointer-events-auto">
                                                                            {userGroups.map(([uid, bks]: [string, any[]]) => {
                                                                                const user = users.find(u => u.uid === uid);
                                                                                const initials = user ? (user.code || user.name?.substring(0, 2)?.toUpperCase()) : '?';
                                                                                const bgTheme = '#db2777'; // Dark pink background/border
                                                                                
                                                                                return (
                                                                                    <div key={uid} className="relative flex flex-col w-[52px] shrink rounded-[6px] shadow-sm h-[64px] cursor-pointer hover:opacity-90 bg-white" style={{ border: `1px solid ${bgTheme}` }}>
                                                                                        {/* Top Half */}
                                                                                        <div className="w-full h-[30px] rounded-t-[5px] flex items-center justify-center" style={{ backgroundColor: bgTheme }}>
                                                                                            <span className="text-[14px] font-bold text-white">{initials}</span>
                                                                                        </div>
                                                                                        
                                                                                        {/* Bottom Half */}
                                                                                        <div className="w-full flex-1 flex flex-col items-center justify-center pb-0.5">
                                                                                            <span className="text-[18px] font-extrabold text-slate-800 leading-none">{bks.length}</span>
                                                                                            <span className="text-[7.5px] text-slate-400 font-medium tracking-wide mt-1">Bookings</span>
                                                                                        </div>

                                                                                        {/* + Circle */}
                                                                                        <div className="absolute -top-1.5 -right-1.5 w-[14px] h-[14px] box-content border-[2px] border-white rounded-full flex items-center justify-center text-[12px] leading-none shadow-sm cursor-pointer hover:scale-110 transition-transform text-white" style={{ backgroundColor: bgTheme }} onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={date} initialTime={`${hour.toString().padStart(2, '0')}:00`} initialCalendarUid={id} />); }}>
                                                                                            +
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                })()
                                                            ) : (
                                                                // VIEW BY DOCTORS (Columns are Doctors)
                                                                (function() {
                                                                    const totalBookings = slotBookings.length;
                                                                    
                                                                    if (totalBookings > 7) {
                                                                        const calGroups = Object.entries(slotBookings.reduce((acc: any, bk: any) => {
                                                                            const calId = bk.calendarId || bk.calendarUid || 'unknown';
                                                                            if (!acc[calId]) acc[calId] = [];
                                                                            acc[calId].push(bk);
                                                                            return acc;
                                                                        }, {}));
                                                                        
                                                                        return (
                                                                            <div className="flex flex-wrap gap-1.5 pointer-events-auto mt-auto justify-end w-full">
                                                                                {calGroups.map(([calId, bks]: [string, any[]]) => {
                                                                                    const cal = calendars.find(c => (c.uid || c.id) === calId);
                                                                                    const calColor = cal?.color || '#9333EA';
                                                                                    return (
                                                                                        <div key={calId} className="w-2.5 h-10 rounded-sm shadow-sm" style={{ backgroundColor: toRgba(calColor, 0.7) }} title={`${bks.length} Bookings`} />
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    
                                                                    if (totalBookings > 2) {
                                                                        const calGroups = Object.entries(slotBookings.reduce((acc: any, bk: any) => {
                                                                            const calId = bk.calendarId || bk.calendarUid || 'unknown';
                                                                            if (!acc[calId]) acc[calId] = [];
                                                                            acc[calId].push(bk);
                                                                            return acc;
                                                                        }, {}));
                                                                        return (
                                                                            <div className="flex flex-row flex-wrap gap-1.5 w-full">
                                                                                {calGroups.map(([calId, bks]: [string, any[]]) => {
                                                                                    const cal = calendars.find(c => (c.uid || c.id) === calId);
                                                                                    const calColor = cal?.color || '#9333EA';
                                                                                    return (
                                                                                        <div
                                                                                            key={calId}
                                                                                            className="pointer-events-auto flex flex-col flex-1 min-w-[50px] max-w-full rounded-md transition-all hover:opacity-90 cursor-pointer overflow-hidden shadow-sm"
                                                                                            style={{ border: `1px solid ${toRgba(calColor, 0.3)}` }}
                                                                                            onClick={(e) => { e.stopPropagation(); }}
                                                                                        >
                                                                                            <div className="flex flex-col items-center justify-center w-full py-1.5" style={{ backgroundColor: toRgba(calColor, 0.1) }}>
                                                                                                <span className="text-[17px] font-bold text-slate-900 leading-none">{bks.length}</span>
                                                                                                <span className="text-[9px] text-slate-600 mt-1 font-medium tracking-wide">Bookings</span>
                                                                                            </div>
                                                                                            <div className="flex items-center justify-center w-full py-1 bg-white border-t" style={{ borderTopColor: toRgba(calColor, 0.15) }}>
                                                                                                <div className="w-3.5 h-3.5 rounded-[3px] flex items-center justify-center cursor-pointer hover:opacity-80" style={{ backgroundColor: toRgba(calColor, 0.2) }} onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={date} initialTime={`${hour.toString().padStart(2, '0')}:00`} initialProviderUid={id} />); }}>
                                                                                                    <span className="text-[10px] leading-none font-bold" style={{ color: calColor }}>+</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    
                                                                    return (
                                                                        <div className="grid grid-cols-2 gap-2 w-full">
                                                                            {slotBookings.map((bk: any) => {
                                                                                const cal = calendars.find(c => (c.uid || c.id) === (bk.calendarId || bk.calendarUid));
                                                                                const calColor = cal?.color || '#9333EA';
                                                                                const customerName = bk.customer?.name || bk.patientName || 'Customer';
                                                                                const timeLabel = bk.time || bk.startTime || `${hour.toString().padStart(2, '0')}:00`;
                                                                                return (
                                                                                    <div
                                                                                        key={bk.id || bk.uid}
                                                                                        className="pointer-events-auto flex flex-col items-start w-full p-1.5 rounded-md transition-all hover:opacity-90 cursor-pointer relative shadow-sm"
                                                                                        style={{ backgroundColor: toRgba(calColor, 0.1), border: `1px solid ${toRgba(calColor, 0.3)}` }}
                                                                                        onClick={(e) => { e.stopPropagation(); onBookingSelect(bk.id || bk.uid); }}
                                                                                    >
                                                                                        <div className="flex items-start justify-between w-full">
                                                                                            <div className="flex flex-col min-w-0 flex-1 pr-3">
                                                                                                <span className="truncate w-full text-left" style={{ fontSize: '11px', color: '#1e293b', fontWeight: 700 }}>{customerName}</span>
                                                                                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>{timeLabel}</span>
                                                                                            </div>
                                                                                            <div className="absolute top-2 right-1.5 flex flex-col gap-0.5 items-center justify-center w-4 h-4 text-slate-400">
                                                                                                <div className="w-[3px] h-[3px] rounded-full bg-slate-500"></div>
                                                                                                <div className="w-[3px] h-[3px] rounded-full bg-slate-500"></div>
                                                                                                <div className="w-[3px] h-[3px] rounded-full bg-slate-500"></div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
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
