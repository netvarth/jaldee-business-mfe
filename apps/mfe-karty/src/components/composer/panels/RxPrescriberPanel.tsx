import React, { useEffect } from 'react';
import { Stethoscope, ShieldAlert, ChevronDown, ChevronUp, User, Building2, FileText, Calendar, CheckCircle2 } from 'lucide-react';

export interface RxPrescriberData {
  prescriberName: string;
  prescriberRegNo: string;
  hospitalName: string;
  prescriptionRef: string;
  prescriptionDate: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientAddress: string;
}

interface RxPrescriberPanelProps {
  data: RxPrescriberData;
  onChange: (field: keyof RxPrescriberData, value: string) => void;
  hasScheduledDrugs: boolean;
  isPrescriptionMode?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const RxPrescriberPanel: React.FC<RxPrescriberPanelProps> = ({
  data,
  onChange,
  hasScheduledDrugs,
  isPrescriptionMode = false,
  isExpanded,
  onToggleExpand,
}) => {
  useEffect(() => {
    if (hasScheduledDrugs && !isExpanded) {
      onToggleExpand();
    }
  }, [hasScheduledDrugs, isExpanded, onToggleExpand]);

  const isValid = Boolean(
    data.prescriberName?.trim() &&
    data.prescriberRegNo?.trim() &&
    (data.patientName?.trim())
  );

  return (
    <div className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
      hasScheduledDrugs
        ? 'border-amber-300 bg-amber-50/40 shadow-xs'
        : isValid
        ? 'border-teal-200 bg-teal-50/20 shadow-2xs'
        : 'border-slate-200 bg-white shadow-xs'
    }`}>
      {/* Accordion Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-6 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
            hasScheduledDrugs
              ? 'bg-amber-100 text-amber-800'
              : isValid
              ? 'bg-teal-100 text-teal-800'
              : 'bg-teal-50 text-teal-700'
          }`}>
            <Stethoscope size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-900 tracking-tight">
                Doctor Prescription & Patient Details
              </span>
              {hasScheduledDrugs && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                  <ShieldAlert size={12} /> Schedule H1 / Controlled
                </span>
              )}
              {isValid && !hasScheduledDrugs && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-bold">
                  <CheckCircle2 size={12} /> Verified Details
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {data.prescriberName ? `${/^dr\.?\s/i.test(data.prescriberName) ? '' : 'Dr. '}${data.prescriberName} (Reg: ${data.prescriberRegNo || 'Pending'})` : 'Prescriber details & Medical Council registration'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[11px] font-bold">
            {isExpanded ? 'Collapse' : 'Expand'}
          </span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Accordion Body */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-sans">

          {/* Column 1: Doctor / Prescriber */}
          <div className="space-y-3.5 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold border-b border-slate-200/80 pb-2.5 uppercase tracking-wider text-[11px]">
              <Stethoscope size={15} className="text-teal-700" />
              <span>Prescribing Doctor</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Doctor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Rajesh Kumar MD"
                value={data.prescriberName}
                onChange={(e) => onChange('prescriberName', e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-500 outline-none transition-all shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Medical Council Reg No <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. KMC-48291"
                  value={data.prescriberRegNo}
                  onChange={(e) => onChange('prescriberRegNo', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium font-mono text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-500 outline-none transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Hospital / Clinic
                </label>
                <input
                  type="text"
                  placeholder="e.g. City Care Hospital"
                  value={data.hospitalName}
                  onChange={(e) => onChange('hospitalName', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-500 outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Prescription Ref / No
                </label>
                <input
                  type="text"
                  placeholder="e.g. RX-2026-0891"
                  value={data.prescriptionRef}
                  onChange={(e) => onChange('prescriptionRef', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium font-mono text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-500 outline-none transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Prescription Date
                </label>
                <input
                  type="date"
                  value={data.prescriptionDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => onChange('prescriptionDate', e.target.value)}
                  className="w-full px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Patient Demographics */}
          <div className="space-y-3.5 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold border-b border-slate-200/80 pb-2.5 uppercase tracking-wider text-[11px]">
              <User size={15} className="text-teal-700" />
              <span>Patient Information</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Patient Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Divya Dasan"
                value={data.patientName}
                onChange={(e) => onChange('patientName', e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-500 outline-none transition-all shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 34"
                  value={data.patientAge}
                  onChange={(e) => onChange('patientAge', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Gender
                </label>
                <select
                  value={data.patientGender || 'MALE'}
                  onChange={(e) => onChange('patientGender', e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-teal-600"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Patient Address / Residence
              </label>
              <input
                type="text"
                placeholder="e.g. Flat 4B, Green Meadows, Calicut"
                value={data.patientAddress}
                onChange={(e) => onChange('patientAddress', e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-600"
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
