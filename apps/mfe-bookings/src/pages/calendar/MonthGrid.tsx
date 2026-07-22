import React from 'react';
import { User, Calendar as CalendarType, Booking, Service } from '../../../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { Button } from '@jaldee/design-system';
import { useModal } from '../../contexts/ModalContext';
import CreateAppointmentDrawer from '../booking/CreateAppointmentDrawer';
import { toRgba } from '../../utils/colors';

interface MonthGridProps {
    date: Date;
    viewBy: 'doctors' | 'calendars';
    users: User[];
    calendars: CalendarType[];
    bookings: Booking[];
    services: Service[];
    onBookingSelect: (id: string) => void;
    onDaySelect?: (day: Date, uid?: string) => void;
}

export default function MonthGrid({ date, viewBy, users, calendars, bookings, services, onBookingSelect, onDaySelect }: MonthGridProps) {
    const { openModal, openDrawer } = useModal();
    
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "d";
    const days = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const now = new Date();

    return (
        <div className="calendar-grid month-view-grid w-full h-full">
            <div className="month-view-header">
                {weekDays.map((dayName, idx) => (
                    <div key={idx} className="month-view-header-item">
                        {dayName}
                    </div>
                ))}
            </div>

            <div className="month-view-body">
                {days.map((day, idx) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, now);

                    // Filter bookings for this day
                    const dayBookings = bookings.filter((b: any) => {
                        const bDate = new Date(b.bookingDate || b.date);
                        return isSameDay(bDate, day);
                    });

                    const visibleBookings = dayBookings.slice(0, 3);
                    const overflowCount = dayBookings.length - 3;

                    return (
                        <div 
                            key={day.toString()} 
                            className={`month-day-card ${!isCurrentMonth ? 'muted' : ''} ${isToday ? 'today' : ''} cursor-pointer`}
                            onClick={() => onDaySelect?.(day)}
                        >
                            <div className="month-day-number">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="month-day-select !h-auto !min-h-0 !w-auto !justify-start !rounded-none !border-0 !bg-transparent !p-0 !text-inherit !shadow-none hover:!bg-transparent"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDaySelect?.(day);
                                    }}
                                    aria-pressed={isToday}
                                >
                                    <span>{format(day, dateFormat)}</span>
                                    {!isCurrentMonth && (
                                        <span className="month-day-month-label">
                                            {format(day, 'MMM')}
                                        </span>
                                    )}
                                </Button>
                            </div>

                            <div className="month-day-bookings" style={{ overflowY: 'auto' }}>
                                {viewBy === 'doctors' ? (
                                    (function() {
                                        const userGroups = Object.entries(dayBookings.reduce((acc: any, bk: any) => {
                                            const uid = bk.providerId || bk.userUid || 'unknown';
                                            if (!acc[uid]) acc[uid] = [];
                                            acc[uid].push(bk);
                                            return acc;
                                        }, {}));
                                        const sanitizeColor = (c: string | undefined | null) => {
                                            let clr = (c || '').trim();
                                            if (!clr || clr === 'null' || clr === 'undefined') return '#db2777';
                                            if (clr.startsWith('#')) return clr;
                                            if (/^[0-9A-Fa-f]{3,6}$/.test(clr)) return `#${clr}`;
                                            return '#db2777';
                                        };

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
                                                            onClick={(e) => { e.stopPropagation(); onDaySelect?.(day, uid); }}
                                                        >
                                                            <div className="flex items-center justify-center h-full w-[24px] shrink-0 text-white text-[10px] font-bold rounded-l-[3px]" style={{ backgroundColor: color }}>
                                                                {initials}
                                                            </div>
                                                            
                                                            <div className="flex-1 px-1.5 flex items-center leading-none">
                                                                <span style={{ fontSize: '11px', color: '#333333', fontWeight: 700 }}>{bks.length} Bookings</span>
                                                            </div>
                                                            
                                                            <div className="flex items-center justify-center h-full shrink-0 pr-1.5" style={{ color: color, fontSize: '16px', fontWeight: 400 }} onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={day} />); }}>
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
                                                                    <div key={uid} className="flex items-center gap-1.5 pr-2 cursor-pointer hover:bg-black/10 p-1 rounded" onClick={(e) => { e.stopPropagation(); onDaySelect?.(day, uid); }}>
                                                                        <div className="w-[20px] h-[20px] shrink-0 flex items-center justify-center rounded-[3px] bg-white/20 text-white font-bold text-[9px]">
                                                                            {ini}
                                                                        </div>
                                                                        <span className="text-white text-[10px] font-semibold whitespace-nowrap">{bks.length} Bookings</span>
                                                                    </div>
                                                                );
                                                            })}
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
                                            if (!clr || clr === 'null' || clr === 'undefined') return '#9333EA';
                                            if (clr.startsWith('#')) return clr;
                                            if (/^[0-9A-Fa-f]{3,6}$/.test(clr)) return `#${clr}`;
                                            return '#9333EA';
                                        };

                                        const calGroups = Object.entries(dayBookings.reduce((acc: any, bk: any) => {
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
                                                            className="pointer-events-auto flex items-center justify-between w-full h-[22px] rounded-[3px] border shadow-sm transition-opacity hover:opacity-90 cursor-pointer mb-1 px-1.5"
                                                            style={{ backgroundColor: toRgba(calColor, 0.1), borderColor: calColor }}
                                                            onClick={(e) => { e.stopPropagation(); onDaySelect?.(day, uid); }}
                                                        >
                                                            <span style={{ fontSize: '11px', color: '#1e293b', fontWeight: 600 }}>{bks.length} Bookings</span>
                                                            
                                                            <div className="flex items-center justify-center shrink-0" style={{ color: calColor, fontSize: '15px', fontWeight: 700 }} onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={day} initialCalendarUid={uid} />); }}>
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
                                                                    <div key={uid} className="flex items-center gap-1.5 pr-2 cursor-pointer hover:bg-black/5 p-1 rounded" onClick={(e) => { e.stopPropagation(); onDaySelect?.(day, uid); }}>
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
