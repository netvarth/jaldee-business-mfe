import React from 'react';
import { Calendar, User, Service, Booking } from './mockCalendarData';

interface DayViewGridProps {
  viewBy: 'doctors' | 'calendars' | 'departments';
  activeCalendars: string[];
  activeUsers: string[];
  calendars: Calendar[];
  users: User[];
  bookings: Booking[];
}

export default function DayViewGrid({
  viewBy, activeCalendars, activeUsers, calendars, users, bookings
}: DayViewGridProps) {
  
  // 9 AM to 11 PM
  const startHour = 9;
  const endHour = 23;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // Determine columns
  let columnsList: any[] = [];
  if (viewBy === "doctors") {
    columnsList = users.filter(u => activeUsers.includes(u.id));
  } else {
    // View by Calendars
    columnsList = calendars.filter(c => activeCalendars.includes(c.id));
  }

  // Simulated Current Time for the red line (e.g. 1:55 PM)
  const mockNow = { hours: 13, minutes: 55 };
  const minutesFromStart = ((mockNow.hours - startHour) * 60) + mockNow.minutes;
  const redLineTop = 60 + Math.floor((minutesFromStart / 60) * 80); // 60px header, 80px per hour

  if (columnsList.length === 0) {
    return (
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', padding: '40px' }}>
        No columns to display. Please check calendars or users checkboxes in the sidebar.
      </div>
    );
  }

  return (
    <div className="day-view-grid">
      
      {/* 1. Time Column */}
      <div className="time-column">
        <div className="time-header-cell">IST<br />+05:30</div>
        {hours.map(h => {
          const ampm = h >= 12 ? "PM" : "AM";
          const displayHour = h > 12 ? h - 12 : h;
          return (
            <div key={h} className="time-cell">
              {`${displayHour.toString().padStart(2, '0')}:00 ${ampm}`}
            </div>
          );
        })}
      </div>

      {/* 2. Doctor/Calendar Columns Wrapper */}
      <div className="doctor-columns-wrapper">
        {/* Current Time Indicator Line */}
        {minutesFromStart >= 0 && minutesFromStart <= ((endHour - startHour + 1) * 60) && (
          <div 
            className="current-time-line absolute left-0 right-0 h-px bg-red-500 z-10 pointer-events-none" 
            style={{ top: `${redLineTop}px` }}
          >
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
          </div>
        )}

        {columnsList.map(col => {
          // Filter bookings for this column
          const colBookings = bookings.filter(b => {
            const matchCol = viewBy === "doctors" ? b.userId === col.id : b.calendarId === col.id;
            return matchCol;
          });

          return (
            <div key={col.id} className="doctor-column">
              {/* Header */}
              <div className="doctor-header-cell">
                <div className="doc-hdr-meta">
                  {viewBy === 'doctors' ? (
                    <>
                      <div className={`avatar-mini w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-purple-600`}>
                        {col.code}
                      </div>
                      <div>
                        <span className="doc-hdr-title block leading-tight">{col.name}</span>
                        <div className="doc-hdr-sub">{col.role}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-3.5 h-3.5 rounded bg-blue-600"></div>
                      <div>
                        <span className="doc-hdr-title block leading-tight">{col.name}</span>
                        <div className="doc-hdr-sub">{col.location}</div>
                      </div>
                    </>
                  )}
                </div>
                {viewBy === 'doctors' && col.status === 'leave' && (
                  <span className="badge-column-status badge-on-leave">On Leave</span>
                )}
                {colBookings.length > 0 && (
                  <span className="badge bg-teal-600 text-white px-2 py-0.5 text-[11px] ml-auto rounded-full">
                    {colBookings.length} Bookings
                  </span>
                )}
              </div>

              {/* Grid Area */}
              <div className="column-cells-area">
                {hours.map(h => (
                  <div key={h} className="grid-hour-cell border-r border-gray-100 border-dashed"></div>
                ))}

                {/* Appointment Cards */}
                {colBookings.map(booking => {
                  const [startH, startM] = booking.startTime.split(':').map(Number);
                  const [endH, endM] = booking.endTime.split(':').map(Number);
                  
                  const startMins = ((startH - startHour) * 60) + startM;
                  const durationMins = ((endH * 60) + endM) - ((startH * 60) + startM);
                  
                  const topPos = Math.floor((startMins / 60) * 80);
                  const heightPos = Math.floor((durationMins / 60) * 80);

                  return (
                    <div 
                      key={booking.id} 
                      className="appointment-card flex flex-col justify-between"
                      style={{ top: `${topPos}px`, height: `${heightPos}px` }}
                    >
                      <div className="text-[11px] font-bold text-gray-900 truncate leading-tight">
                        {booking.patientName}
                      </div>
                      <div className="text-[10px] text-gray-600 flex justify-between items-center mt-1">
                        <span>{booking.startTime} - {booking.endTime}</span>
                        <span className="px-1.5 py-0.5 bg-white bg-opacity-50 rounded text-[9px] font-bold text-blue-700">
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
