import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import "./BookingModal.css";

type BookingRecord = {
  id?: string | number;
  bookingId?: string | number;
  patientId?: string;
  patient?: string;
  phone?: string;
  email?: string;
  date?: string | Date;
  time?: string;
  timeRange?: string;
  service?: string;
  calendar?: string;
  status?: string;
  statusColor?: string;
  doctor?: string;
  userRole?: string;
  notes?: string;
};

type EditableFieldValues = {
  patientName: string;
  phoneNumber: string;
  email: string;
  patientId: string;
  date: string;
  time: string;
  serviceLabel: string;
  calendarLabel: string;
};

export interface BookingModalProps {
  booking?: BookingRecord | null;
  meta?: BookingRecord | null;
  onClose?: () => void;
}

const getInitials = (value = ""): string =>
  value
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const normalizeEmail = (name = ""): string => {
  const normalized =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "") || "patient";
  return `${normalized}@example.com`;
};

const formatPatientId = (booking: Partial<BookingRecord> = {}): string =>
  booking.patientId ?? String(booking.id ?? booking.bookingId ?? "PT-0001");

const formatDate = (value?: string | Date): string =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Tuesday, November 4, 2025";

const formatTime = (booking: Partial<BookingRecord> = {}): string =>
  booking.timeRange || booking.time || "08:30 AM - 09:00 AM";

const fieldIcons: Record<string, ReactNode> = {
  patientName: (
    <svg viewBox="0 0 24 24" role="presentation">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path
        d="M6.5 20c1-3.5 3.5-5 5.5-5s4.5 1.5 5.5 5"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  ),
  phoneNumber: (
    <svg viewBox="0 0 24 24" role="presentation">
      <path
        d="M7 4h2l1.5 3-2 2 3 3 2-2 1.5 3h2l2 2v3.5A2.5 2.5 0 0116 21H8a2.5 2.5 0 01-2.5-2.5V6.5A2.5 2.5 0 018 4z"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" role="presentation">
      <rect
        x="3.5"
        y="6.5"
        width="17"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <path
        d="M3.5 6.5l8.5 6L20.5 6.5"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  ),
  patientId: (
    <svg viewBox="0 0 24 24" role="presentation">
      <rect
        x="4.25"
        y="5"
        width="15.5"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <path d="M8.5 8.5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8.5 12.5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8.5 16h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  date: (
    <svg viewBox="0 0 24 24" role="presentation">
      <rect
        x="4"
        y="5.5"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <path d="M6 8.5h12M6 12h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 4v3M15 4v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  time: (
    <svg viewBox="0 0 24 24" role="presentation">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path
        d="M12 9v4l3 2"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  service: (
    <svg viewBox="0 0 24 24" role="presentation">
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <path d="M8 9h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 13h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 17h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" role="presentation">
      <rect
        x="4"
        y="6"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <path d="M7 4.5v3M17 4.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
};

const actionIcons: Record<string, ReactNode> = {
  edit: (
    <svg viewBox="0 0 24 24" role="presentation">
      <path
        d="M5.5 16.5l8.94-8.94 3.06 3.06-8.94 8.94H5.5V16.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15.5 5.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  reschedule: (
    <svg viewBox="0 0 24 24" role="presentation">
      <rect
        x="4.5"
        y="6"
        width="15"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
      <path d="M6 8.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M15 3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M8 15l2.5 2.5L16 11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  cancel: (
    <svg viewBox="0 0 24 24" role="presentation">
      <path
        d="M7 8l1 11h8l1-11z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 8.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.5 6h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8.5 4.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
};

export default function BookingModal({
  booking,
  meta,
  onClose,
}: BookingModalProps): JSX.Element | null {
  const record = booking || meta;

  const defaults = useMemo<EditableFieldValues>(
    () => ({
      patientName: record?.patient ?? "Rohan Nair",
      phoneNumber: record?.phone ?? "+1 (555) 123-4567",
      email: record?.email ?? normalizeEmail(record?.patient ?? "Patient"),
      patientId: record ? formatPatientId(record) : "PT-0001",
      date: formatDate(record?.date),
      time: formatTime(record),
      serviceLabel: record?.service ?? "Quick Consultation",
      calendarLabel: record?.calendar ?? "Calendar 1",
    }),
    [record]
  );

  const statusLabel = record?.status ?? "Confirmed";
  const statusColor = record?.statusColor ?? "#13ab55";
  const userLabel = record?.doctor ?? "Dr. Sarah Johnson";
  const userRole = record?.userRole ?? "Doctor";
  const notes =
    record?.notes ??
    "Patient requested consultation regarding ongoing treatment plan. Please review previous medical history before appointment.";
  const avatarInitials = getInitials(userLabel);

  const [isEditing, setIsEditing] = useState(false);
  const [fieldValues, setFieldValues] = useState<EditableFieldValues>(defaults);

  useEffect(() => {
    if (!isEditing) {
      setFieldValues(defaults);
    }
  }, [isEditing, defaults]);

  if (!record) return null;

  const handleFieldChange =
    (name: keyof EditableFieldValues) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFieldValues((prev) => ({ ...prev, [name]: value }));
    };

  const handleEditClick = () => {
    setIsEditing((prev) => !prev);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="booking-modal" onClick={(event) => event.stopPropagation()}>
        <header className="booking-modal-header">
          <div>
            <p className="booking-modal-title">Booking Details</p>
            <p className="booking-modal-subtitle">View and manage booking details.</p>
          </div>
          <button
            className="close-button"
            type="button"
            onClick={onClose}
            aria-label="Close booking details"
          >
            ×
          </button>
        </header>

        <div className="status-row">
          <span className="status-pill" style={{ borderColor: statusColor, color: statusColor }}>
            {statusLabel}
          </span>
          <span className="booking-id">Booking ID: {record.id ?? record.bookingId ?? "#1"}</span>
        </div>

        <section className="card patient-info-card">
          <div className="card-label">Patient Information</div>
          <div className="patient-grid">
            <div className="patient-field">
              <span className="field-icon">{fieldIcons.patientName}</span>
              <div>
                <p>Patient Name</p>
                {isEditing ? (
                  <input
                    className="editable-input"
                    value={fieldValues.patientName}
                    onChange={handleFieldChange("patientName")}
                  />
                ) : (
                  <strong>{fieldValues.patientName}</strong>
                )}
              </div>
            </div>

            <div className="patient-field">
              <span className="field-icon">{fieldIcons.phoneNumber}</span>
              <div>
                <p>Phone Number</p>
                {isEditing ? (
                  <input
                    className="editable-input"
                    value={fieldValues.phoneNumber}
                    onChange={handleFieldChange("phoneNumber")}
                  />
                ) : (
                  <strong>{fieldValues.phoneNumber}</strong>
                )}
              </div>
            </div>

            <div className="patient-field">
              <span className="field-icon">{fieldIcons.email}</span>
              <div>
                <p>Email</p>
                {isEditing ? (
                  <input
                    className="editable-input"
                    value={fieldValues.email}
                    onChange={handleFieldChange("email")}
                  />
                ) : (
                  <strong>{fieldValues.email}</strong>
                )}
              </div>
            </div>

            <div className="patient-field">
              <span className="field-icon">{fieldIcons.patientId}</span>
              <div>
                <p>Patient ID</p>
                {isEditing ? (
                  <input
                    className="editable-input"
                    value={fieldValues.patientId}
                    onChange={handleFieldChange("patientId")}
                  />
                ) : (
                  <strong>{fieldValues.patientId}</strong>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="card meta-grid">
          <div className="meta-field">
            <span className="field-icon">{fieldIcons.date}</span>
            <div>
              <p>Date</p>
              {isEditing ? (
                <input
                  className="editable-input"
                  value={fieldValues.date}
                  onChange={handleFieldChange("date")}
                />
              ) : (
                <strong>{fieldValues.date}</strong>
              )}
            </div>
          </div>

          <div className="meta-field">
            <span className="field-icon">{fieldIcons.time}</span>
            <div>
              <p>Time</p>
              {isEditing ? (
                <input
                  className="editable-input"
                  value={fieldValues.time}
                  onChange={handleFieldChange("time")}
                />
              ) : (
                <strong>{fieldValues.time}</strong>
              )}
            </div>
          </div>

          <div className="meta-field">
            <span className="field-icon">{fieldIcons.service}</span>
            <div>
              <p>Service Type</p>
              {isEditing ? (
                <input
                  className="editable-input"
                  value={fieldValues.serviceLabel}
                  onChange={handleFieldChange("serviceLabel")}
                />
              ) : (
                <strong>{fieldValues.serviceLabel}</strong>
              )}
            </div>
          </div>

          <div className="meta-field">
            <span className="field-icon">{fieldIcons.calendar}</span>
            <div>
              <p>Calendar</p>
              {isEditing ? (
                <input
                  className="editable-input"
                  value={fieldValues.calendarLabel}
                  onChange={handleFieldChange("calendarLabel")}
                />
              ) : (
                <strong>{fieldValues.calendarLabel}</strong>
              )}
            </div>
          </div>
        </section>

        <section className="card user-card">
          <div className="card-label">User</div>
          <div className="user-row">
            <div className="user-icon">
              <span>{avatarInitials}</span>
            </div>
            <div>
              <strong>{userLabel}</strong>
              <span>{userRole}</span>
            </div>
          </div>
        </section>

        <section className="card notes-card">
          <div className="card-label">Notes</div>
          <p>{notes}</p>
        </section>

        <footer className="booking-modal-actions">
          <button type="button" className="ghost" onClick={handleEditClick}>
            <span className="action-icon">{actionIcons.edit}</span>
            {isEditing ? "Save" : "Edit Booking"}
          </button>
          <button type="button" className="ghost">
            <span className="action-icon">{actionIcons.reschedule}</span>
            Reschedule
          </button>
          <button type="button" className="solid">
            <span className="action-icon">{actionIcons.cancel}</span>
            Cancel Booking
          </button>
        </footer>
      </div>
    </div>
  );
}