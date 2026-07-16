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
                    <div className="calendar-grid-inner min-w-[800px]">
                        {/* Header */}
                        <div className="calendar-header" style={{ gridTemplateColumns: `120px repeat(7, minmax(0, 1fr))` }}>
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
                        <div className="calendar-body" style={{ gridTemplateColumns: `120px repeat(7, minmax(0, 1fr))` }}>
                            {hours.map((hour) => {
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                                const timeLabel = `${displayHour.toString().padStart(2, '0')}:00 ${ampm}`;

                                return (
                                    <div key={hour} className="calendar-row" style={{ gridTemplateColumns: `120px repeat(7, minmax(0, 1fr))` }}>
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
                                                                    const userGroups = Object.entries(slotBookings.reduce((acc: any, bk: any) => {
                                                                        const uid = bk.providerId || bk.userUid || 'unknown';
                                                                        if (!acc[uid]) acc[uid] = [];
                                                                        acc[uid].push(bk);
                                                                        return acc;
                                                                    }, {}));
                                                                    
                                                                    if (slotBookings.length > 3) {
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
                                                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 text-[12px] font-bold bg-slate-100 shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={dayDate} initialTime={`${hour.toString().padStart(2, '0')}:00`} />); }}>
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
                                                                (function() {
                                                                    const calGroups = Object.entries(slotBookings.reduce((acc: any, bk: any) => {
                                                                        const uid = bk.calendarId || bk.calendarUid || 'unknown';
                                                                        if (!acc[uid]) acc[uid] = [];
                                                                        acc[uid].push(bk);
                                                                        return acc;
                                                                    }, {}));

                                                                    if (slotBookings.length > 3) {
                                                                        return (
                                                                            <div className="flex flex-wrap gap-1 pointer-events-auto mt-auto">
                                                                                {calGroups.map(([uid, bks]: [string, any[]]) => {
                                                                                    const cal = calendars.find(c => c.uid === uid);
                                                                                    const calColor = cal?.color || '#9333EA';
                                                                                    return (
                                                                                        <div key={uid} className="w-2 h-4 rounded-sm" style={{ backgroundColor: calColor }} title={`${bks.length} Bookings`} />
                                                                                    );
                                                                                })}
                                                                                <div className="flex flex-col items-center ml-1">
                                                                                    <div className="w-4 h-4 rounded flex items-center justify-center text-slate-400 text-[12px] font-bold bg-slate-100 shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-200" onClick={(e) => { e.stopPropagation(); openDrawer(<CreateAppointmentDrawer initialDate={dayDate} initialTime={`${hour.toString().padStart(2, '0')}:00`} />); }}>
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
                                                                            <Button
                                                                                key={uid}
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
