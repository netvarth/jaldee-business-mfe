import React from 'react';
import { format } from 'date-fns';
import { X } from '../../../components/icons';
import { User, Calendar as CalendarType, Booking } from '../../../../types';
import { useModal } from '../../../contexts/ModalContext';
import CreateAppointmentDrawer from '../../booking/CreateAppointmentDrawer';
import { toRgba } from '../../../utils/colors';

interface SlotBookingsPopoverProps {
    date: Date;
    hour: number;
    viewBy: 'doctors' | 'calendars';
    bookings: Booking[];
    users: User[];
    calendars: CalendarType[];
    onBookingSelect: (id: string) => void;
}

function fmtHour(h: number): string {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${String(dh).padStart(2, '0')}.00 ${ampm}`;
}

export default function SlotBookingsPopover({
    date,
    hour,
    viewBy,
    bookings,
    users,
    calendars,
    onBookingSelect,
}: SlotBookingsPopoverProps) {
    const { openModal, closeModal, openDrawer } = useModal();

    // Group the slot's bookings by column (doctor or calendar), preserving Figma's per-provider rows.
    const groups = Object.entries(
        bookings.reduce((acc: Record<string, Booking[]>, bk: any) => {
            const key =
                viewBy === 'doctors'
                    ? bk.providerId || bk.userUid || 'unknown'
                    : bk.calendarId || bk.calendarUid || 'unknown';
            if (!acc[key]) acc[key] = [];
            acc[key].push(bk);
            return acc;
        }, {})
    );

    const doctorCount = groups.length;
    const bookingCount = bookings.length;
    const timeRange = `${fmtHour(hour)} - ${fmtHour(hour + 1)}`;

    const resolve = (key: string) => {
        if (viewBy === 'doctors') {
            const user = users.find((u) => u.uid === key);
            return {
                initials: user ? user.code || user.name.substring(0, 2).toUpperCase() : '?',
                color: user?.color || '#9333EA',
            };
        }
        const cal = calendars.find((c) => c.uid === key);
        return {
            initials: cal ? cal.name.substring(0, 2).toUpperCase() : '?',
            color: cal?.color || '#9333EA',
        };
    };

    const addForColumn = (key: string) => {
        closeModal();
        setTimeout(() => {
            openDrawer(
                <CreateAppointmentDrawer
                    initialDate={date}
                    initialTime={`${hour.toString().padStart(2, '0')}:00`}
                    initialProviderUid={viewBy === 'doctors' ? key : undefined}
                    initialCalendarUid={viewBy === 'calendars' ? key : undefined}
                />
            );
        }, 0);
    };

    return (
        <div className="slot-popover" data-testid="bookings-slot-details-popover">
            {/* Header: day number + month/weekday, time-range pill, close */}
            <div className="slot-popover-header">
                <div className="slot-popover-date">
                    <span className="slot-popover-day">{format(date, 'd')}</span>
                    <div className="slot-popover-date-labels">
                        <span className="slot-popover-month">{format(date, 'MMMM yyyy')}</span>
                        <span className="slot-popover-weekday">{format(date, 'EEEE')}</span>
                    </div>
                </div>
                <div className="slot-popover-header-right">
                    <span className="slot-popover-time-pill">{timeRange}</span>
                    <button
                        type="button"
                        className="slot-popover-close"
                        aria-label="Close"
                        data-testid="bookings-slot-details-close"
                        onClick={closeModal}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="slot-popover-summary">
                {doctorCount} {viewBy === 'doctors' ? (doctorCount === 1 ? 'Doctor' : 'Doctors') : doctorCount === 1 ? 'Calendar' : 'Calendars'} &amp;{' '}
                {String(bookingCount).padStart(2, '0')} {bookingCount === 1 ? 'Booking' : 'Bookings'}
            </div>

            <div className="slot-popover-rows">
                {groups.map(([key, bks]) => {
                    const { initials, color } = resolve(key);
                    return (
                        <div
                            key={key}
                            className="slot-popover-row"
                            style={{ background: toRgba(color, 0.14), borderColor: color }}
                            onClick={() => {
                                const first: any = bks[0];
                                if (bks.length === 1 && first) onBookingSelect(first.id || first.uid);
                            }}
                        >
                            <span className="slot-popover-avatar" style={{ background: color }}>
                                {initials}
                            </span>
                            <span className="slot-popover-count">
                                {String(bks.length).padStart(2, '0')} {bks.length === 1 ? 'Booking' : 'Bookings'}
                            </span>
                            <button
                                type="button"
                                className="slot-popover-add"
                                aria-label="Add booking"
                                style={{ color }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    addForColumn(key);
                                }}
                            >
                                +
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
