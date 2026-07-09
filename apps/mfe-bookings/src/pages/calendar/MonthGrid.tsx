import React from 'react';
import { User, Calendar as CalendarType, Booking, Service } from '../../../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { Button } from '@jaldee/design-system';
import { useModal } from '../../contexts/ModalContext';
import CreateAppointmentModal from '../booking/CreateAppointmentModal';

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
        <div className="flex flex-col h-full bg-slate-50 p-4 overflow-hidden">
            <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
                    {weekDays.map((dayName, idx) => (
                        <div key={idx} className="h-10 flex items-center justify-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
                            {dayName}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6 auto-rows-fr bg-slate-200 gap-px">
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
                                className={`bg-white p-1.5 flex flex-col hover:bg-slate-50 transition-colors cursor-pointer ${!isCurrentMonth ? 'opacity-50' : ''}`}
                                onClick={() => openModal(<CreateAppointmentModal initialDate={day} />)}
                            >
                                <div className="flex justify-end mb-1">
                                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                                        {format(day, dateFormat)}
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                                    {visibleBookings.map((bk: any) => {
                                        const calColor = calendars.find(c => c.uid === bk.calendarId || c.uid === bk.calendarUid)?.color || "#9333EA";
                                        const timeStr = bk.time || bk.startTime || '';
                                        // Just extract the hour part roughly if it's like "09:00 AM" -> "9a"
                                        const shortTime = timeStr.replace(':00', '').replace(' AM', 'a').replace(' PM', 'p').toLowerCase();
                                        
                                        return (
                                            <div 
                                                key={bk.id || bk.uid} 
                                                className="px-1.5 py-0.5 rounded text-[10px] truncate border-l-2 shadow-sm font-medium hover:brightness-95 transition-all"
                                                style={{ backgroundColor: `${calColor}15`, borderLeftColor: calColor, color: calColor }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onBookingSelect(bk.id || bk.uid);
                                                }}
                                            >
                                                <span className="opacity-75 mr-1">{shortTime}</span>
                                                {bk.patientName || bk.customerName}
                                            </div>
                                        );
                                    })}
                                    {overflowCount > 0 && (
                                        <div className="text-[10px] text-slate-500 font-medium pl-1 mt-auto">
                                            + {overflowCount} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
