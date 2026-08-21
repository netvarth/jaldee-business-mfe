import React, { useState } from 'react';
import { Stethoscope, ShieldAlert, X, Check, FileText } from 'lucide-react';

export interface PrescriptionCaptureData {
  doctorName: string;
  doctorRegNo: string;
  hospitalName?: string;
  prescriptionRef?: string;
  prescriptionDate?: string;
  notes?: string;
}

interface PrescriptionCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PrescriptionCaptureData) => void;
  controlledItems?: string[];
  initialData?: Partial<PrescriptionCaptureData>;
}

export function PrescriptionCaptureModal({
  isOpen,
  onClose,
  onSave,
  controlledItems = [],
  initialData
}: PrescriptionCaptureModalProps) {
  const [doctorName, setDoctorName] = useState(initialData?.doctorName || '');
  const [doctorRegNo, setDoctorRegNo] = useState(initialData?.doctorRegNo || '');
  const [hospitalName, setHospitalName] = useState(initialData?.hospitalName || '');
  const [prescriptionRef, setPrescriptionRef] = useState(initialData?.prescriptionRef || '');
  const [prescriptionDate, setPrescriptionDate] = useState(initialData?.prescriptionDate || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(initialData?.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName || !doctorRegNo) {
      alert('Prescribing Doctor Name and Registration Number are mandatory for controlled medicines.');
      return;
    }
    onSave({
      doctorName,
      doctorRegNo,
      hospitalName,
      prescriptionRef,
      prescriptionDate,
      notes
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-surface-200 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Stethoscope size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">Prescription (Rx) Mandatory Capture</h2>
              <p className="text-xs text-surface-500">Statutory requirement for Schedule H/H1/Narcotics</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {controlledItems.length > 0 && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert size={15} /> Controlled Items in Cart:
            </div>
            <p className="text-[11px] text-rose-600">
              {controlledItems.join(', ')}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Prescribing Doctor Name *</label>
            <input
              type="text"
              required
              placeholder="Dr. Full Name"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Medical Reg. Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. KMC-12345"
                value={doctorRegNo}
                onChange={(e) => setDoctorRegNo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Prescription Date</label>
              <input
                type="date"
                value={prescriptionDate}
                onChange={(e) => setPrescriptionDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Hospital / Clinic Name</label>
            <input
              type="text"
              placeholder="e.g. Apollo Hospital or City Care Clinic"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Prescription Scan / Rx Reference #</label>
            <input
              type="text"
              placeholder="e.g. RX-2026-9481"
              value={prescriptionRef}
              onChange={(e) => setPrescriptionRef(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-mono outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Check size={16} /> Save Prescription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
