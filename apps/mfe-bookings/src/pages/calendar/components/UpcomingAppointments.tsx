import React from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { Booking, User } from '../../../../types';

interface UpcomingAppointmentsProps {
    bookings: Booking[];
    users: User[];
    date: Date;
    viewMode?: 'DAY' | 'WEEK' | 'MONTH';
}

export default function UpcomingAppointments({ bookings, users, date, viewMode = 'DAY' }: UpcomingAppointmentsProps) {
    // Sort all bookings by date and time
    const sortedBookings = [...bookings].sort((a: any, b: any) => {
        const dateA = a.bookingDate || a.date || '';
        const dateB = b.bookingDate || b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        const timeA = a.time || a.startTime || '';
        const timeB = b.time || b.startTime || '';
        return timeA.localeCompare(timeB);
    });

    // Group by date if in WEEK or MONTH mode
    const groupedBookings = sortedBookings.reduce((acc: any, bk: any) => {
        const dateStr = bk.bookingDate || bk.date || format(date, 'yyyy-MM-dd');
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(bk);
        return acc;
    }, {});

    const subtitleText = viewMode === 'DAY' 
        ? format(date, 'EEEE, MMMM d, yyyy')
        : viewMode === 'WEEK'
            ? 'This Week'
            : 'This Month';

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800 text-sm">Upcoming Appointments</h3>
                <p className="text-xs text-slate-500 mt-1">{subtitleText}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sortedBookings.length === 0 ? (
                    <div className="text-center text-sm text-slate-500 py-8">
                        No appointments found.
                    </div>
                ) : (
                    Object.entries(groupedBookings).map(([dateStr, dayBookings]: [string, any]) => (
                        <div key={dateStr} className="space-y-3">
                            {viewMode !== 'DAY' && (
                                <div className="sticky top-0 bg-slate-50 py-1 z-10 border-b border-slate-200">
                                    <span className="text-xs font-semibold text-slate-600">
                                        {format(parseISO(dateStr), 'EEE, MMM d')}
                                    </span>
                                </div>
                            )}
                            {dayBookings.map((bk: any, i: number) => {
                                const provider = users.find(u => u.uid === bk.providerId || u.uid === bk.userUid);
                                const providerColor = provider?.color || '#9333EA';
                                const timeStr = bk.time || bk.startTime;

                                return (
                                    <div key={bk.id || bk.uid || i} className="bg-white border border-slate-200 rounded-md p-3 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: providerColor }}></div>
                                        <div className="ml-2">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-medium text-sm text-slate-800 truncate pr-2">{bk.patientName || bk.customerName || 'Unknown Patient'}</div>
                                                <div className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                    {timeStr}
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-500 mb-2 truncate">
                                                Service: {bk.serviceName || 'Consultation'}
                                            </div>
                                            {provider && (
                                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-slate-300" style={{ backgroundColor: providerColor }}>
                                                        {provider.code || provider.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="text-[11px] font-medium text-slate-600 truncate">{provider.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
