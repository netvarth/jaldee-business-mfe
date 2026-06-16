import React, { useState } from "react";
import { cn } from "@jaldee/design-system";
import { useModal } from "../../contexts/ModalContext";
import type { ServiceItem } from "../../types";

interface ServiceFormProps {
  onCreate: (input: Omit<ServiceItem, "id" | "status">) => Promise<void>;
}

const DEPARTMENTS = ["General Medicine", "Emergency", "Cardiology", "Orthopedics", "Pediatrics"];
const TYPES = ["Onsite Consultation", "Teleconsultation"];

export default function ServiceForm({ onCreate }: ServiceFormProps) {
  const { closeModal } = useModal();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [description, setDescription] = useState("");
  const [durationMins, setDurationMins] = useState(30);
  const [price, setPrice] = useState(300);
  const [serviceType, setServiceType] = useState(TYPES[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreate({ name, department, description, duration: durationMins, price, serviceType, labels: [] });
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all";

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-800">New Service</h3>
        <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">&times;</button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            Service Name <span className="text-red-500">*</span>
          </label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. General Consultation" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setServiceType(t)}
                  className={cn(
                    "flex-1 px-2 py-2 text-xs font-semibold rounded-lg border transition-all",
                    serviceType === t
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {t === "Onsite Consultation" ? "Onsite" : "Tele"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Short description" className={cn(inputCls, "resize-none")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Duration (mins)</label>
            <input type="number" min={5} step={5} value={durationMins} onChange={(e) => setDurationMins(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Price (₹)</label>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={inputCls} />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-200 transition-colors disabled:opacity-50 flex items-center gap-2">
            {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Create Service
          </button>
        </div>
      </form>
    </div>
  );
}
