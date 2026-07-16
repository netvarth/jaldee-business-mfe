import React from 'react';
import { Booking, Service, Calendar as CalendarType, User } from '../../../types';
import { format, parseISO } from 'date-fns';

interface ListGridProps {
    bookings: Booking[];
    calendars: CalendarType[];
    services: Service[];
    users: User[];
    onBookingSelect: (id: string) => void;
}

export default function ListGrid({ bookings, calendars, services, users, onBookingSelect }: ListGridProps) {
    // Sort all bookings by date and time
    const sortedBookings = [...bookings].sort((a: any, b: any) => {
        const dateA = a.bookingDate || a.date || '';
        const dateB = b.bookingDate || b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        const timeA = a.time || a.startTime || '';
        const timeB = b.time || b.startTime || '';
        return timeA.localeCompare(timeB);
    });

    // Group by date
    const groupedBookings = sortedBookings.reduce((acc: any, bk: any) => {
        const dateStr = bk.bookingDate || bk.date || format(new Date(), 'yyyy-MM-dd');
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(bk);
        return acc;
    }, {});

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-y-auto w-full">
            <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
                {sortedBookings.length === 0 ? (
                    <div className="text-center text-sm text-slate-500 py-16">
                        No appointments found for the selected period.
                    </div>
                ) : (
                    Object.entries(groupedBookings).map(([dateStr, dayBookings]: [string, any]) => (
                        <div key={dateStr} className="space-y-4">
                            <div className="sticky top-0 bg-slate-50 py-2 z-10 border-b border-slate-200">
                                <span className="text-sm font-semibold text-slate-700">
                                    {format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {dayBookings.map((bk: any, i: number) => {
                                    const provider = users.find(u => u.uid === bk.providerId || u.uid === bk.userUid);
                                    const providerColor = provider?.color || '#9333EA';
                                    const timeStr = bk.time || bk.startTime;
                                    const service = services.find(s => s.uid === bk.serviceId || s.uid === bk.serviceUid) || { name: bk.serviceName || 'Consultation' };

                                    return (
                                        <div 
                                            key={bk.id || bk.uid || i} 
                                            onClick={() => onBookingSelect(bk.id || bk.uid)}
                                            className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: providerColor }}></div>
                                            <div className="ml-2">
                                                <div className="flex justify-between items-start mb-2 gap-2">
                                                    <div className="font-medium text-sm text-slate-800 line-clamp-1 flex-1" title={bk.patientName || bk.customerName}>{bk.patientName || bk.customerName || 'Unknown Patient'}</div>
                                                    <div className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded whitespace-nowrap shrink-0">
                                                        {timeStr}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 mb-3 truncate">
                                                    Service: {service.name}
                                                </div>
                                                {provider && (
                                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-slate-300 shadow-sm" style={{ backgroundColor: providerColor }}>
                                                            {provider.code || provider.name?.substring(0, 2)?.toUpperCase()}
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600 truncate">{provider.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
