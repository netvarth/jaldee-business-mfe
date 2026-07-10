import React from 'react';
import { User, Calendar as CalendarType, Booking, Service } from '../../../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { Button } from '@jaldee/design-system';
import { useModal } from '../../contexts/ModalContext';
import CreateAppointmentModal from '../booking/CreateAppointmentModal';
import { toRgba } from '../../utils/colors';

interface MonthGridProps {
    date: Date;
    viewBy: 'doctors' | 'calendars';
    users: User[];
    calendars: CalendarType[];
    bookings: Booking[];
    services: Service[];
    onBookingSelect: (id: string) => void;
}

export default function MonthGrid({ date, viewBy, users, calendars, bookings, services, onBookingSelect }: MonthGridProps) {
    const { openModal } = useModal();
    
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
                            className={`month-day-card ${!isCurrentMonth ? 'muted' : ''} ${isToday ? 'today' : ''}`}
                        >
                            <div className="month-day-number">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="month-day-select !h-auto !min-h-0 !w-auto !justify-start !rounded-none !border-0 !bg-transparent !p-0 !text-inherit !shadow-none hover:!bg-transparent"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openModal(<CreateAppointmentModal initialDate={day} />);
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
                                    Object.entries(dayBookings.reduce((acc: any, bk: any) => {
                                        const uid = bk.providerId || bk.userUid || 'unknown';
                                        if (!acc[uid]) acc[uid] = [];
                                        acc[uid].push(bk);
                                        return acc;
                                    }, {})).map(([uid, bks]: [string, any[]]) => {
                                        const user = users.find(u => u.uid === uid);
                                        const initials = user ? (user.code || user.name.substring(0, 2).toUpperCase()) : '?';
                                        const rawColor = user?.color || '#9333EA';
                                        const isTw = rawColor.includes('bg-');
                                        return (
                                            <div key={uid} className="month-day-booking flex items-center gap-1.5 p-1 px-1.5 rounded-md bg-white border pointer-events-auto" style={isTw ? { background: '#fff' } : { borderColor: rawColor, background: '#fff' }} onClick={(e) => {
                                                e.stopPropagation();
                                            }}>
                                                <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[9px] font-bold shadow-sm ${isTw ? rawColor : 'text-white'}`} style={isTw ? {} : { backgroundColor: rawColor }}>
                                                    {initials}
                                                </div>
                                                <span className="flex-1 truncate" style={{ fontSize: '11px', color: '#333', fontWeight: 600 }}>{bks.length} {bks.length === 1 ? 'Booking' : 'Bookings'}</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    Object.entries(dayBookings.reduce((acc: any, bk: any) => {
                                        const uid = bk.calendarId || bk.calendarUid || 'unknown';
                                        if (!acc[uid]) acc[uid] = [];
                                        acc[uid].push(bk);
                                        return acc;
                                    }, {})).map(([uid, bks]: [string, any[]]) => {
                                        const cal = calendars.find(c => c.uid === uid);
                                        const rawColor = cal?.color || '#9333EA';
                                        const isTw = rawColor.includes('bg-');
                                        return (
                                            <div key={uid} className={`month-day-booking flex items-center gap-1.5 p-1 px-2 rounded-md pointer-events-auto transition-opacity hover:opacity-90 ${isTw ? rawColor : ''} ${isTw ? 'bg-opacity-20' : ''}`} style={isTw ? {} : { backgroundColor: toRgba(rawColor, 0.2), border: 'none' }} onClick={(e) => {
                                                e.stopPropagation();
                                            }}>
                                                <span className="flex-1 truncate" style={isTw ? { fontSize: '11px', fontWeight: 600 } : { fontSize: '11px', color: '#1e293b', fontWeight: 600 }}>{bks.length} {bks.length === 1 ? 'Booking' : 'Bookings'}</span>
                                                <span style={isTw ? { fontSize: '14px', lineHeight: 1, fontWeight: 400 } : { color: '#1e293b', fontSize: '14px', lineHeight: 1, fontWeight: 400 }}>+</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
