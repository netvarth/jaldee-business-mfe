import React from 'react';
import { User, Calendar as CalendarType, Booking, Service } from '../../../types';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Button } from '@jaldee/design-system';
import { useModal } from '../../contexts/ModalContext';
import CreateAppointmentDrawer from '../booking/CreateAppointmentDrawer';
import SlotBookingsPopover from './components/SlotBookingsPopover';
import { toRgba } from '../../utils/colors';

interface WeekGridProps {
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

export default function WeekGrid({ date, viewBy, users, calendars, bookings, services, onBookingSelect }: WeekGridProps) {
    const { openModal, openDrawer } = useModal();
    const startHour = 0;
    const endHour = 23;
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    // Generate 7 days of the week starting from Sunday or Monday (let's use standard startOfWeek)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Calculate current time marker position
    const now = new Date();
    const minutesFromStart = ((now.getHours() - startHour) * 60) + now.getMinutes();
    const redLineTop = 60 + Math.floor((minutesFromStart / 60) * 80);

    return (
        <div className="calendar-grid week-view w-full h-full">
            <div className="calendar-grid-content h-full flex flex-col">
                <div className="calendar-scroll flex-1 custom-scrollbar">
                    <div className="calendar-grid-inner min-w-max">
                        {/* Header */}
                        <div className="calendar-header" style={{ gridTemplateColumns: `var(--hour-col-width, 120px) repeat(7, minmax(0, 1fr))` }}>
                            <div className="calendar-timezone">
                                <div className="timezone-label">IST<br/>+05:30</div>
                            </div>
                            {days.map((dayDate, dayIndex) => {
                                const isToday = isSameDay(dayDate, now);
                                return (
                                    <div key={dayDate.toISOString()} className={`weekday-header${isToday ? ' is-today' : ''}${dayIndex % 2 === 1 ? ' alt-col' : ''}`}>
                                        <div className="weekday-header-top">
                                            <span className="weekday-label">{format(dayDate, 'EEE')}</span>
                                            <strong className="weekday-date">{format(dayDate, 'd')}</strong>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Body */}
                        <div className="calendar-body" style={{ gridTemplateColumns: `var(--hour-col-width, 120px) repeat(7, minmax(0, 1fr))` }}>
                            {hours.map((hour) => {
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                const timeLabel = `${displayHour.toString().padStart(2, '0')}:00 ${ampm}`;

                                return (
                                    <div key={hour} className="calendar-row" style={{ gridTemplateColumns: `var(--hour-col-width, 120px) repeat(7, minmax(0, 1fr))` }}>
                                        <div className="hour-column">{timeLabel}</div>
                                        {days.map((dayDate, dayIndex) => {
                                            // Filter bookings for this slot
                                            const slotBookings = bookings.filter((b: any) => {
                                                const bDate = new Date(b.bookingDate || b.date);
                                                if (!isSameDay(bDate, dayDate)) return false;
                                                
                                                const timeStr = b.time || b.startTime;
                                                const start = parseTimeValue(timeStr);
                                                return start && start.hour === hour;
                                            });

                                            return (
                                                <div
                                                    key={`${dayDate.toISOString()}-${hour}`}
                                                    className={`calendar-cell${dayIndex % 2 === 1 ? ' alt-col' : ''}`}
                                                    onClick={() => openDrawer(
                                                        slotBookings.length > 0 ? (
                                                            <SlotBookingsPopover
                                                              date={dayDate}
                                                              hour={hour}
                                                              viewBy={viewBy}
                                                              bookings={slotBookings}
                                                              users={users}
                                                              calendars={calendars}
                                                              onBookingSelect={onBookingSelect}
                                                            />
                                                        ) : (
                                                            <CreateAppointmentDrawer
                                                              initialDate={dayDate}
                                                              initialTime={`${hour.toString().padStart(2, '0')}:00`}
                                                            />
                                                        )
                                                    )}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {slotBookings.length > 0 && (
                                                        <div className="detail-stack w-full pointer-events-none flex flex-col gap-1">
                                                            {viewBy === 'doctors' ? (
                                                                (function() {
                                                                    const sanitizeColor = (c: string | undefined | null) => {
                                                                        let clr = (c || '').trim();
                                                                        if (!clr || clr === 'null' || clr === 'undefined') return '#db2777';
                                                                        if (clr.startsWith('#')) return clr;
                                                                        if (/^[0-9A-Fa-f]{3,6}$/.test(clr)) return `#${clr}`;
                                                                        return '#db2777';
                                                                    };

                                                                    const userGroups = Object.entries(slotBookings.reduce((acc: any, bk: any) => {
                                                                        const uid = bk.providerId || bk.userUid || 'unknown';
                                                                        if (!acc[uid]) acc[uid] = [];
                                                                        acc[uid].push(bk);
                                                                        return acc;
                                                                    }, {}));
                                                                    
                                                                    const visibleGroups = userGroups.slice(0, 3);
                                                                    const hasMore = userGroups.length > 3;

                                                                    return (
                                                                        <>
                                                                            {visibleGroups.map(([uid, bks]: [string, any[]]) => {
                                                                                const user = users.find(u => u.uid === uid);
                                                                                const initials = user ? (user.code || user.name?.substring(0, 2)?.toUpperCase()) : '?';
                                                                                const color = sanitizeColor(user?.color);
                                                                                
                                                                                return (
                                                                                    <div
                                                                                        key={uid}
                                                                                        className="pointer-events-auto flex items-center justify-between w-full h-[22px] rounded-[3px] border shadow-sm transition-opacity hover:opacity-90 cursor-pointer mb-1"
                                                                                        style={{ borderColor: color, backgroundColor: '#ffffff' }}
                                                                                        onClick={(e) => { e.stopPropagation(); }}
                                                                                    >
                                                                                        <div className="flex items-center justify-center h-full w-[24px] shrink-0 text-white text-[10px] font-bold rounded-l-[3px]" style={{ backgroundColor: color }}>
                                                                                            {initials}
                                                                                        </div>
                                                                                        
                                                                                        <div className="flex-1 px-1.5 flex items-center leading-none">
                                                                                            <span style={{ fontSize: '11px', color: '#333333', fontWeight: 700 }}>{bks.length} Bookings</span>
                                                                                        </div>
                                                                                        
                                                                                        <div className="flex items-center justify-center h-full shrink-0 pr-1.5" style={{ color: color, fontSize: '16px', fontWeight: 400 }} onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={dayDate} initialTime={`${hour.toString().padStart(2, '0')}:00`} />); }}>
                                                                                            +
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                            {hasMore && (
                                                                                <div className="group relative pointer-events-auto text-[10px] text-slate-500 font-bold text-center mt-0.5">
                                                                                    <span className="cursor-pointer hover:text-slate-700 hover:underline">+ {userGroups.length - 3} more</span>
                                                                                    <div className="hidden group-hover:flex absolute z-50 flex-col gap-1 bottom-full left-1/2 -translate-x-1/2 mb-1.5 p-1.5 rounded-[4px] shadow-lg w-max" style={{ backgroundColor: '#db2777' }}>
                                                                                        {userGroups.slice(3).map(([uid, bks]) => {
                                                                                            const u = users.find(u => u.uid === uid);
                                                                                            const ini = u ? (u.code || u.name?.substring(0, 2)?.toUpperCase()) : '?';
                                                                                            return (
                                                                                                <div key={uid} className="flex items-center gap-1.5 pr-2">
                                                                                                    <div className="w-[20px] h-[20px] shrink-0 flex items-center justify-center rounded-[3px] bg-white/20 text-white font-bold text-[9px]">
                                                                                                        {ini}
                                                                                                    </div>
                                                                                                    <span className="text-white text-[10px] font-semibold whitespace-nowrap">{bks.length} Bookings</span>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                        {/* Arrow pointing down */}
                                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent" style={{ borderTopColor: '#db2777' }}></div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()
                                                            ) : (
                                                                (function() {
                                                                    const sanitizeColor = (c: string | undefined | null) => {
                                                                        let clr = (c || '').trim();
                                                                        if (!clr) return '#9333EA';
                                                                        if (/^[0-9A-Fa-f]{3,6}$/.test(clr)) return `#${clr}`;
                                                                        return clr;
                                                                    };

                                                                    const calGroups = Object.entries(slotBookings.reduce((acc: any, bk: any) => {
                                                                        const uid = bk.calendarId || bk.calendarUid || 'unknown';
                                                                        if (!acc[uid]) acc[uid] = [];
                                                                        acc[uid].push(bk);
                                                                        return acc;
                                                                    }, {}));

                                                                    const visibleGroups = calGroups.slice(0, 3);
                                                                    const hasMore = calGroups.length > 3;

                                                                    return (
                                                                        <>
                                                                            {visibleGroups.map(([uid, bks]: [string, any[]]) => {
                                                                                const cal = calendars.find(c => c.uid === uid);
                                                                                const calColor = sanitizeColor(cal?.color);
                                                                                
                                                                                return (
                                                                                    <div
                                                                                        key={uid}
                                                                                        className="pointer-events-auto flex items-center justify-between w-full h-[22px] rounded-[4px] border shadow-sm transition-opacity hover:opacity-90 cursor-pointer mb-1 px-1.5"
                                                                                        style={{ backgroundColor: toRgba(calColor, 0.1), borderColor: calColor }}
                                                                                        onClick={(e) => { e.stopPropagation(); }}
                                                                                    >
                                                                                        <span style={{ fontSize: '11px', color: '#1e293b', fontWeight: 600 }}>{bks.length} Bookings</span>
                                                                                        
                                                                                        <div className="flex items-center justify-center shrink-0" style={{ color: calColor, fontSize: '15px', fontWeight: 700 }} onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={dayDate} initialTime={`${hour.toString().padStart(2, '0')}:00`} initialCalendarUid={uid} />); }}>
                                                                                            +
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                            {hasMore && (
                                                                                <div className="group relative pointer-events-auto text-[10px] text-slate-500 font-bold text-center mt-0.5">
                                                                                    <span className="cursor-pointer hover:text-slate-700 hover:underline">+ {calGroups.length - 3} more</span>
                                                                                    <div className="hidden group-hover:flex absolute z-50 flex-col gap-1 bottom-full left-1/2 -translate-x-1/2 mb-1.5 p-1.5 rounded-[4px] shadow-lg w-max bg-white border border-slate-200">
                                                                                        {calGroups.slice(3).map(([uid, bks]) => {
                                                                                            const cal = calendars.find(c => c.uid === uid);
                                                                                            const ini = cal ? (cal.name?.substring(0, 2)?.toUpperCase()) : '?';
                                                                                            const calColor = sanitizeColor(cal?.color);
                                                                                            return (
                                                                                                <div key={uid} className="flex items-center gap-1.5 pr-2">
                                                                                                    <div className="w-[20px] h-[20px] shrink-0 flex items-center justify-center rounded-[3px] text-white font-bold text-[9px]" style={{ backgroundColor: calColor }}>
                                                                                                        {ini}
                                                                                                    </div>
                                                                                                    <span className="text-slate-700 text-[10px] font-semibold whitespace-nowrap">{bks.length} Bookings</span>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent" style={{ borderTopColor: '#ffffff' }}></div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </>
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
