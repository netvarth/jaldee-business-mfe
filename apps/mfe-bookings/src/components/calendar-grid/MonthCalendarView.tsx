import { Button } from "@jaldee/design-system";
import type { MonthCell } from "./model";
import { isSameDate, WEEKDAY_ORDER } from "./model";

interface MonthCalendarViewProps {
  cells: MonthCell[];
  focusDateValue: Date | null;
  onDateSelect?: (payload: { view: "day"; date?: Date }) => void;
  onEventClick?: (payload: unknown) => void;
}

export function MonthCalendarView({
  cells,
  focusDateValue,
  onDateSelect,
  onEventClick,
}: MonthCalendarViewProps) {
  return (
    <div className="calendar-grid month-view-grid">
      <div className="month-view-header">
        {WEEKDAY_ORDER.map((day) => (
          <div key={day} className="month-view-header-item">
            {day}
          </div>
        ))}
      </div>

      <div className="month-view-body">
        {cells.map((day) => {
          if (day.placeholder) {
            return <div key={day.id} className="month-day-card month-day-placeholder" />;
          }

          const isFocused = focusDateValue && day.date ? isSameDate(day.date, focusDateValue) : false;

          return (
            <div
              key={day.id}
              className={`month-day-card ${day.isCurrentMonth === false ? "muted" : ""} ${isFocused ? "today" : ""}`}
            >
              <div className="month-day-number">
                <Button
                  type="button"
                  variant="ghost"
                  className="month-day-select !h-auto !min-h-0 !w-auto !justify-start !rounded-none !border-0 !bg-transparent !p-0 !text-inherit !shadow-none hover:!bg-transparent"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDateSelect?.({ view: "day", date: day.date });
                  }}
                  aria-pressed={isFocused}
                >
                  <span>{day.date?.getDate()}</span>
                  {day.isCurrentMonth === false && day.date && (
                    <span className="month-day-month-label">
                      {day.date.toLocaleString("en-US", { month: "short" })}
                    </span>
                  )}
                </Button>
              </div>

              <div className="month-day-bookings">
                {day.bookings?.map((booking, index) => (
                  <Button
                    key={`${booking.label}-${index}`}
                    type="button"
                    variant="ghost"
                    className="month-day-booking !flex !h-auto !min-h-[28px] !w-full !items-center !justify-between !rounded-[10px] !border !bg-white !px-[10px] !py-[6px] !text-left !shadow-none"
                    style={{
                      border: `1px solid ${booking.color}`,
                      background: "#fff",
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (day.summary) onEventClick?.(day.summary);
                    }}
                  >
                    <span className="month-day-booking-count">
                      {booking.count} {booking.count === 1 ? "Booking" : "Bookings"}
                    </span>
                    <span className="month-day-booking-action" aria-hidden="true">
                      +
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
