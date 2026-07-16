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
    onDaySelect?: (day: Date) => void;
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
                                        openDrawer(<CreateAppointmentDrawer initialDate={day} />);
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
                                        
                                        if (dayBookings.length > 3) {
                                            return (
                                                <div className="flex flex-wrap gap-1 pointer-events-auto mt-1">
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
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 text-[12px] font-bold bg-slate-100 shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={day} />); }}>
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
                                                <div
                                                    key={uid}
                                                    className="month-day-booking flex items-center justify-between p-1 px-1.5 rounded-lg border shadow-sm pointer-events-auto mb-1 transition-all hover:opacity-90 cursor-pointer w-full bg-white"
                                                    style={{ borderColor: color }}
                                                    onClick={(e) => { e.stopPropagation(); }}
                                                >
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                                                            {initials}
                                                        </div>
                                                        <span className="truncate" style={{ fontSize: '11px', color: '#333', fontWeight: 600 }}>
                                                            {bks.length} {bks.length === 1 ? 'Booking' : 'Bookings'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-center w-4 h-4 rounded-full text-white shrink-0" style={{ backgroundColor: color, fontSize: '12px', lineHeight: 1 }}>
                                                        +
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()
                                ) : (
                                    (function() {
                                        const calGroups = Object.entries(dayBookings.reduce((acc: any, bk: any) => {
                                            const uid = bk.calendarId || bk.calendarUid || 'unknown';
                                            if (!acc[uid]) acc[uid] = [];
                                            acc[uid].push(bk);
                                            return acc;
                                        }, {}));

                                        if (dayBookings.length > 3) {
                                            return (
                                                <div className="flex flex-wrap gap-1 pointer-events-auto mt-1">
                                                    {calGroups.map(([uid, bks]: [string, any[]]) => {
                                                        const cal = calendars.find(c => c.uid === uid);
                                                        const calColor = cal?.color || '#9333EA';
                                                        return (
                                                            <div key={uid} className="w-2 h-4 rounded-sm" style={{ backgroundColor: calColor }} title={`${bks.length} Bookings`} />
                                                        );
                                                    })}
                                                    <div className="flex flex-col items-center ml-1">
                                                        <div className="w-4 h-4 rounded flex items-center justify-center text-slate-400 text-[12px] font-bold bg-slate-100 shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={day} />); }}>
                                                            +
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return calGroups.map(([uid, bks]: [string, any[]]) => {
                                            const cal = calendars.find(c => c.uid === uid);
                                            const calColor = cal?.color || '#9333EA';
                                            return (
                                                <div
                                                    key={uid}
                                                    className="month-day-booking flex items-center justify-between p-1 px-2 rounded-md pointer-events-auto mb-1 transition-opacity hover:opacity-90 cursor-pointer"
                                                    style={{ backgroundColor: toRgba(calColor, 0.2), border: 'none' }}
                                                    onClick={(e) => { e.stopPropagation(); }}
                                                >
                                                    <span className="truncate" style={{ fontSize: '11px', color: '#1e293b', fontWeight: 600 }}>
                                                        {bks.length} Bookings
                                                    </span>
                                                    <span style={{ color: calColor, fontSize: '14px', lineHeight: 1, fontWeight: 700 }}>+</span>
                                                </div>
                                            );
                                        });
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
