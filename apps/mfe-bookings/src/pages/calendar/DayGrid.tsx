import React from 'react';
import { User, Calendar as CalendarType, Booking, Service } from '../../../types';
import { format } from 'date-fns';
import { Button } from '@jaldee/design-system';

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
    const startHour = 9;
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
        <div className="day-view-grid">
            {/* Time Column */}
            <div className="time-column">
                <div className="time-header-cell">
                    IST<br/>+05:30
                </div>
                {hours.map(h => {
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
                    return (
                        <div key={h} className="time-cell">
                            {`${displayHour.toString().padStart(2, '0')}:00 ${ampm}`}
                        </div>
                    );
                })}
            </div>

            {/* Doctor/Calendar Columns Wrapper */}
            <div className="doctor-columns-wrapper">
                {columnsList.map((col: any) => {
                    const id = col.uid || col.id;
                    const name = col.name;
                    const subText = col.role || col.location || '';
                    const color = col.color || '#9333EA';
                    const code = col.code || '';
                    const status = col.status || 'active';

                    // Filter bookings for this column
                    const colBookings = bookings.filter((b: any) => 
                        (viewBy === 'doctors' ? (b.providerId === id || b.userUid === id) : (b.calendarId === id || b.calendarUid === id))
                    );

                    return (
                        <div key={id} className="doctor-column">
                            {/* Header Cell */}
                            <div className="doctor-header-cell">
                                {viewBy === 'doctors' ? (
                                    <>
                                        <div className="doc-hdr-meta">
                                            <div className={`avatar avatar-sm ${color.includes('emerald') ? 'avatar-color-3' : color.includes('purple') ? 'avatar-color-1' : 'avatar-color-4'}`}>
                                                {code}
                                            </div>
                                            <div>
                                                <span className="doc-hdr-title">{name}</span>
                                                <div className="doc-hdr-sub">{subText}</div>
                                            </div>
                                        </div>
                                        {status === 'leave' && <span className="badge-column-status badge-on-leave">On Leave</span>}
                                        {colBookings.length > 0 && (
                                            <span className="badge" style={{backgroundColor: '#0D9488', color: 'white', padding: '2px 8px', fontSize: '11px', marginLeft: 'auto', borderRadius: '9999px'}}>
                                                {colBookings.length} Bookings
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="doc-hdr-meta">
                                            <div style={{width: '14px', height: '14px', borderRadius: '4px', backgroundColor: color}}></div>
                                            <div>
                                                <span className="doc-hdr-title">{name}</span>
                                                <div className="doc-hdr-sub">{subText}</div>
                                            </div>
                                        </div>
                                        {colBookings.length > 0 && (
                                            <span className="badge" style={{backgroundColor: '#0D9488', color: 'white', padding: '2px 8px', fontSize: '11px', marginLeft: 'auto', borderRadius: '9999px'}}>
                                                {colBookings.length} Bookings
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Cells Area */}
                            <div className="column-cells-area">
                                {hours.map(h => (
                                    <div key={h} className="grid-hour-cell" data-hour={h} />
                                ))}

                                {/* Render Bookings */}
                                {colBookings.map((bk: any) => {
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
                                                className="appointment-card" 
                                                style={{ borderLeftColor: calColor, top: `${topPos}px`, height: `${heightPos}px` }}
                                                onClick={() => onBookingSelect(bk.id || bk.uid)}
                                            >
                                                <div className="appt-title">{bk.patientName || bk.customerName}</div>
                                                <div className="appt-time-row">
                                                    <span>{timeStr} {service ? `(${service.name})` : ''}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        iconOnly
                                                        icon={<span aria-hidden="true">⋮</span>}
                                                        className="appt-menu-btn"
                                                        aria-label={`Open actions for ${bk.patientName || bk.customerName || 'booking'}`}
                                                        onClick={(event) => event.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}

                                {/* Leave Blocker */}
                                {status === 'leave' && (
                                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(241, 245, 249, 0.7)', zIndex: 2 }}></div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Current Time Indicator */}
            {isToday && (
                <div className="current-time-indicator" style={{ top: `${redLineTop}px` }} />
            )}
        </div>
    );
}
