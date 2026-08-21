import { useState, useEffect } from "react";
import { useBookingApi } from "../../services/useBookingApi";
import { formatIsoTime } from "../../utils/dateTime";
import { CheckCircle, Clock } from "../../components/icons";

interface Props {
  bookingUid: string;
}

interface StateTransition {
  state: string;
  timestamp: string;
  userNotes?: string;
  cancelledBy?: string;
  cancelReason?: string;
}

export default function BookingHistoryTimeline({ bookingUid }: Props) {
  const api = useBookingApi();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<StateTransition[]>([]);

  useEffect(() => {
    if (bookingUid) {
      setLoading(true);
      api.get<StateTransition[]>(`/bookings/${bookingUid}/state`)
        .then((data) => setHistory(data || []))
        .catch(() => {
           // Fallback to empty if fails
           setHistory([]);
        })
        .finally(() => setLoading(false));
    }
  }, [bookingUid, api]);

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white p-4">
      <h4 className="mb-4 text-[12px] font-bold tracking-[0.05em] text-[#1e293b] uppercase">Booking History</h4>
      {loading ? (
        <div className="text-sm text-slate-500 py-4">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="text-sm text-slate-500 py-4">No history available for this booking.</div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
          {history.map((event, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[33px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 ring-4 ring-white">
                 <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-slate-800">{event.state}</h4>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
                {event.userNotes && (
                  <p className="text-[12px] text-slate-600 mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {event.userNotes}
                  </p>
                )}
                {event.cancelReason && (
                  <p className="text-[12px] text-red-600 mt-1.5 bg-red-50 p-2 rounded-lg border border-red-100">
                    <span className="font-semibold">Reason:</span> {event.cancelReason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
