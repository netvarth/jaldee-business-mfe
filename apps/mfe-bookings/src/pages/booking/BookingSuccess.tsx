import { CheckCircle, Calendar, Clock, User } from "../../components/icons";
import { useModal } from "../../contexts/ModalContext";

export interface BookingSummary {
  patientName: string;
  serviceName: string;
  providerName: string;
  dateLabel: string;
  timeLabel: string;
}

export default function BookingSuccess({ summary }: { summary: BookingSummary }) {
  const { closeModal } = useModal();

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden text-center">
      <div className="bg-emerald-50 px-6 pt-8 pb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
          <CheckCircle size={36} />
        </div>
        <h3 className="text-xl font-black text-emerald-800">Booking Confirmed</h3>
        <p className="text-sm text-emerald-700/70 mt-1">An appointment has been scheduled.</p>
      </div>

      <div className="p-6 space-y-3 text-left">
        <div className="flex items-center gap-3 text-slate-700">
          <User size={18} className="text-slate-400" />
          <span className="font-semibold">{summary.patientName}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-700">
          <Calendar size={18} className="text-slate-400" />
          <span className="font-medium">{summary.dateLabel}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-700">
          <Clock size={18} className="text-slate-400" />
          <span className="font-medium">{summary.timeLabel}</span>
        </div>
        <div className="pt-2 border-t border-slate-100 text-sm text-slate-500">
          {summary.serviceName} · {summary.providerName}
        </div>
      </div>

      <div className="px-6 pb-6">
        <button
          onClick={closeModal}
          className="w-full py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-200 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
