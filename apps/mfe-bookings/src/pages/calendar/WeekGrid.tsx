import React from 'react';
import { User, Calendar as CalendarType, Booking, Service } from '../../../types';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Button } from '@jaldee/design-system';
import { useModal } from '../../contexts/ModalContext';
import CreateAppointmentModal from '../booking/CreateAppointmentModal';

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
    const { openModal } = useModal();
    const startHour = 9;
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
        <div className="day-view-grid">
            {/* Time Column */}
            <div className="time-column w-16 shrink-0 border-r border-slate-200 bg-white">
                <div className="time-header-cell h-16 border-b border-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-medium text-center">
                    IST<br/>+05:30
                </div>
                {hours.map(h => {
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
                    return (
                        <div key={h} className="time-cell h-[80px] border-b border-slate-100 flex items-start justify-center pt-2">
                            <span className="text-[11px] font-medium text-slate-400">{`${displayHour.toString().padStart(2, '0')}:00 ${ampm}`}</span>
                        </div>
                    );
                })}
            </div>

            {/* Days Columns Wrapper */}
            <div className="doctor-columns-wrapper">
                {days.map((dayDate) => {
                    const isToday = isSameDay(dayDate, now);
                    
                    // Filter bookings for this day
                    const dayBookings = bookings.filter((b: any) => {
                        const bDate = new Date(b.bookingDate || b.date);
                        return isSameDay(bDate, dayDate);
                    });

                    return (
                        <div key={dayDate.toISOString()} className="doctor-column relative">
                            {/* Header Cell */}
                            <div className={`doctor-header-cell h-16 border-b border-slate-200 flex flex-col items-center justify-center ${isToday ? 'bg-blue-50' : ''}`}>
                                <span className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                                    {format(dayDate, 'EEE').toUpperCase()}
                                </span>
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full mt-1 ${isToday ? 'bg-blue-600 text-white' : 'text-slate-800'}`}>
                                    <span className="text-lg font-bold">{format(dayDate, 'd')}</span>
                                </div>
                            </div>

                            {/* Cells Area */}
                            <div className="column-cells-area">
                                {hours.map(h => (
                                    <div 
                                      key={h} 
                                      className="grid-hour-cell" 
                                      data-hour={h}
                                      onClick={() => openModal(
                                        <CreateAppointmentModal 
                                          initialDate={dayDate} 
                                          initialTime={`${h.toString().padStart(2, '0')}:00`} 
                                        />
                                      )}
                                      style={{ cursor: 'pointer' }}
                                    />
                                ))}

                                {/* Render Bookings */}
                                {dayBookings.map((bk: any) => {
                                    const timeStr = bk.time || bk.startTime;
                                    const start = parseTimeValue(bk.startTime || timeStr);
                                    const end = parseTimeValue(bk.endTime);
                                    if (!start) return null;

                                    if (start.hour >= startHour && start.hour <= endHour) {
                                        const startMinutes = ((start.hour - startHour) * 60) + start.minute;
                                        const endMinutes = end
                                            ? ((end.hour - startHour) * 60) + end.minute
                                            : startMinutes + 30;
                                        const topPos = Math.floor((startMinutes / 60) * 80);
                                        const durationMins = Math.max(endMinutes - startMinutes, 30);
                                        const heightPos = Math.floor((durationMins / 60) * 80) - 4;

                                        const calColor = calendars.find(c => c.uid === bk.calendarId || c.uid === bk.calendarUid)?.color || "#9333EA";
                                        const service = services.find(s => s.uid === bk.serviceId || s.uid === bk.serviceUid);

                                        return (
                                            <div 
                                                key={bk.id || bk.uid} 
                                                className="appointment-card absolute left-1 right-1 rounded-md overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col" 
                                                style={{ top: `${topPos}px`, height: `${heightPos}px`, zIndex: 10 }}
                                                onClick={() => onBookingSelect(bk.id || bk.uid)}
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: calColor }}></div>
                                                <div className="flex-1 p-1.5 pl-3 overflow-hidden flex flex-col">
                                                    <div className="flex justify-between items-start">
                                                        <div className="text-xs font-semibold text-slate-800 truncate pr-1">{bk.patientName || bk.customerName}</div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            iconOnly
                                                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>}
                                                            className="appt-menu-btn opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1 h-5 w-5 text-slate-400 hover:text-slate-700"
                                                            aria-label={`Open actions for ${bk.patientName || bk.customerName || 'booking'}`}
                                                            onClick={(event) => event.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                                        {timeStr} {service ? `· ${service.name}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}

                                {/* Current Time Indicator */}
                                {isToday && (
                                    <div className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none" style={{ top: `${Math.floor((minutesFromStart / 60) * 80)}px` }}>
                                        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
