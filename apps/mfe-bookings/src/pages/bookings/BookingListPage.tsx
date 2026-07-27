import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  type ColumnDef,
} from "@jaldee/design-system";
import { useBookings } from "../../services/useBookings";
import { useUsers } from "../../services/useUsers";
import { useCalendars } from "../../services/useCalendars";

export default function BookingListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());

  const { bookings, loading } = useBookings(
    format(currentDate, "yyyy-MM-dd"),
    "MONTH" // Fetch a month of bookings at a time for the list view
  );

  const { users } = useUsers();
  const { calendars } = useCalendars([], null, { loadSchema: false });

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return bookings.filter(
      (booking: any) =>
        !normalized ||
        (booking.customerName || "").toLowerCase().includes(normalized) ||
        (booking.serviceName || "").toLowerCase().includes(normalized)
    );
  }, [query, bookings]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        key: "dateTime",
        header: "DATE & TIME",
        sortable: true,
        width: "20%",
        render: (booking: any) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {booking.bookingDate ? format(new Date(booking.bookingDate), "dd MMM yyyy") : "-"}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {booking.startTime || "-"}
            </p>
          </div>
        ),
      },
      {
        key: "customer",
        header: "CUSTOMER NAME",
        sortable: true,
        width: "25%",
        render: (booking: any) => (
          <div className="font-semibold text-slate-900">
            {booking.customerName || "-"}
          </div>
        ),
      },
      {
        key: "staff",
        header: "USER (STAFF)",
        render: (booking: any) => {
          const staff = users.find((u: any) => u.uid === booking.providerId || u.uid === booking.userUid);
          return (
            <div className="text-sm text-slate-700">
              {staff?.name || "-"}
            </div>
          );
        },
      },
      {
        key: "service",
        header: "SERVICE",
        render: (booking: any) => (
          <div className="text-sm text-slate-700">
            {booking.serviceName || "-"}
          </div>
        ),
      },
      {
        key: "calendar",
        header: "CALENDAR",
        render: (booking: any) => {
          const cal = calendars.find((c: any) => (c.uid || c.id) === (booking.calendarUid || booking.calendarId));
          return (
            <div className="text-sm text-slate-700">
              {cal?.name || "-"}
            </div>
          );
        },
      },
      {
        key: "status",
        header: "STATUS",
        render: (booking: any) => {
          const status = booking.status || "Requested";
          return (
            <Badge variant={status === "Cancelled" ? "error" : status === "Confirmed" || status === "Completed" ? "success" : "neutral"}>
              {status}
            </Badge>
          );
        },
      },
    ],
    [users, calendars]
  );

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 md:p-6">
      <PageHeader
        onBack={() => navigate("/")}
        title="Bookings List"
        subtitle="View and manage all your bookings in a detailed list."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              }
            >
              Calendar View
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-row items-center justify-between gap-2 sm:gap-4 mt-6">
        <Input
          type="search"
          placeholder="Search bookings by customer or service"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          containerClassName="flex-1 min-w-0 sm:max-w-sm"
        />
        
        <div className="flex items-center gap-2">
           <Button
             variant="outline"
             size="sm"
             onClick={() => {
               const newDate = new Date(currentDate);
               newDate.setMonth(newDate.getMonth() - 1);
               setCurrentDate(newDate);
             }}
           >
             Prev Month
           </Button>
           <span className="text-sm font-semibold text-slate-700 min-w-[100px] text-center">
             {format(currentDate, "MMM yyyy")}
           </span>
           <Button
             variant="outline"
             size="sm"
             onClick={() => {
               const newDate = new Date(currentDate);
               newDate.setMonth(newDate.getMonth() + 1);
               setCurrentDate(newDate);
             }}
           >
             Next Month
           </Button>
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(booking: any) => booking.id || booking.uid}
        loading={loading}
        pagination={{
          page,
          pageSize: 15,
          total: filtered.length,
          mode: "client",
          onChange: setPage,
        }}
        emptyState={<EmptyState title="No bookings found" description="Try changing the search or month." />}
        tableClassName="min-w-[900px]"
      />
    </section>
  );
}
