import { useState } from "react";
import "./SummaryModal.css";

type BookingSummaryItem = {
  id?: string | number;
  patient?: string;
  time?: string;
  timeRange?: string;
  service?: string;
  status?: string;
};

type SummaryEntry = {
  id?: string | number;
  label?: string;
  color?: string;
  count?: number;
  bookings?: BookingSummaryItem[];
};

export interface SummaryData {
  date?: Date | null;
  dateLabel?: string;
  dayLabel?: string;
  timeLabel?: string;
  totalBookings?: number;
  entries?: SummaryEntry[];
}

export interface SummaryModalProps {
  summary?: SummaryData | null;
  onClose?: () => void;
}

const getInitials = (value = ""): string =>
  value
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatDisplayDate = (date?: Date | null): string =>
  date
    ? date.toLocaleDateString("en-US", {
        day: "2-digit",
      })
    : "";

const formatDisplayMonth = (date?: Date | null): string =>
  date
    ? date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

const padNumber = (value?: number): string => String(value ?? 0).padStart(2, "0");

const formatBookingTime = (booking: BookingSummaryItem): string =>
  booking.time || booking.timeRange || "All day";

const formatBookingStatus = (booking: BookingSummaryItem): string =>
  booking.status || "Confirmed";

export default function SummaryModal({
  summary,
  onClose,
}: SummaryModalProps): JSX.Element | null {
  const [expandedEntry, setExpandedEntry] = useState<string | number | null>(null);

  if (!summary) return null;

  const entries = summary.entries ?? [];
  const doctorCount = entries.length;
  const totalBookings =
    summary.totalBookings ??
    entries.reduce((sum, entry) => sum + (entry.count ?? 0), 0) ??
    0;

  const displayDate = formatDisplayDate(summary.date);
  const displayMonth = formatDisplayMonth(summary.date);
  const dayLabel = summary.dayLabel ?? "";
  const timeLabel = summary.timeLabel ?? "All day";

  const handleToggle = (entryKey: string | number) => {
    setExpandedEntry((prev) => (prev === entryKey ? null : entryKey));
  };

  return (
    <div className="summary-backdrop" onClick={onClose}>
      <div className="summary-modal" onClick={(event) => event.stopPropagation()}>
        <div className="summary-header">
          <div className="summary-date-block">
            <span className="summary-date-number">
              {displayDate || summary.dateLabel || "—"}
            </span>
            <span className="summary-date-month">{displayMonth || summary.dateLabel}</span>
            {dayLabel && <span className="summary-day-label">{dayLabel}</span>}
          </div>

          <div className="summary-header-actions">
            <span className="summary-time-pill">{timeLabel}</span>
            <button
              type="button"
              className="summary-close"
              onClick={onClose}
              aria-label="Close summary"
            >
              ×
            </button>
          </div>
        </div>

        <div className="summary-total">
          <strong>
            {doctorCount} {doctorCount === 1 ? "Doctor" : "Doctors"}
          </strong>
          <span>&bull;</span>
          <strong>{padNumber(totalBookings)} Bookings</strong>
        </div>

        <div className="summary-list">
          {entries.map((entry) => {
            const entryKey = entry.id ?? entry.label ?? "entry";
            const bookingCount = entry.count ?? entry.bookings?.length ?? 0;
            const bookings = entry.bookings ?? [];
            const isExpanded = expandedEntry === entryKey;

            return (
              <div
                key={entryKey}
                className={`summary-row ${isExpanded ? "expanded" : ""}`}
                onClick={() => handleToggle(entryKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleToggle(entryKey);
                  }
                }}
              >
                <div className="summary-row-top">
                  <span
                    className="summary-row-pill"
                    style={{ background: entry.color || "#6c32ff" }}
                  >
                    {getInitials(entry.label)}
                  </span>

                  <div className="summary-row-meta">
                    <strong>{entry.label}</strong>
                    <span>
                      {`${bookingCount} ${bookingCount === 1 ? "Booking" : "Bookings"}`}
                    </span>
                  </div>

                  <span className="summary-row-action" aria-hidden="true">
                    {isExpanded ? "−" : "+"}
                  </span>
                </div>

                {isExpanded && bookings.length > 0 && (
                  <div className="summary-bookings-list">
                    {bookings.map((booking) => (
                      <div
                        key={
                          booking.id ??
                          `${booking.patient}-${booking.time}-${booking.timeRange}`
                        }
                        className="summary-booking-row"
                      >
                        <div className="summary-booking-info">
                          <strong>{booking.patient}</strong>
                          <span className="summary-booking-service">
                            {booking.service}
                          </span>
                        </div>

                        <div className="summary-booking-meta">
                          <span>{formatBookingTime(booking)}</span>
                          <span>{formatBookingStatus(booking)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}