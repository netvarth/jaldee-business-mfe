import React, { useState } from 'react';
import { Pill, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

interface DosageCalculatorProps {
  item: any;
  currentQty: number;
  packageSize?: number;
  onApplyQuantity: (qty: number, dosageSummary?: string) => void;
}

const FREQUENCY_OPTIONS = [
  { code: '1-0-1', label: '1-0-1 (BD - Twice a day)', timesPerDay: 2 },
  { code: '1-1-1', label: '1-1-1 (TDS - Three times a day)', timesPerDay: 3 },
  { code: '1-0-0', label: '1-0-0 (OD - Morning)', timesPerDay: 1 },
  { code: '0-0-1', label: '0-0-1 (HS - Night / Bedtime)', timesPerDay: 1 },
  { code: '1-1-1-1', label: '1-1-1-1 (QID - 4 times a day)', timesPerDay: 4 },
  { code: 'SOS', label: 'SOS / PRN (As needed)', timesPerDay: 1 },
];

export const DosageCalculator: React.FC<DosageCalculatorProps> = ({
  item,
  currentQty,
  packageSize = 10,
  onApplyQuantity,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dosePerIntake, setDosePerIntake] = useState<number>(1);
  const [selectedFreq, setSelectedFreq] = useState<string>('1-0-1');
  const [durationDays, setDurationDays] = useState<number>(5);
  const [instructions, setInstructions] = useState<string>('After food');

  const freqObj = FREQUENCY_OPTIONS.find(f => f.code === selectedFreq) || FREQUENCY_OPTIONS[0];
  const totalUnitsCalculated = Math.max(1, Math.round(dosePerIntake * freqObj.timesPerDay * durationDays));

  const packSize = packageSize || 1;
  const packsNeeded = Math.ceil(totalUnitsCalculated / packSize);
  const totalWithPackRounding = packSize > 1 ? packsNeeded * packSize : totalUnitsCalculated;

  function handleApply() {
    const dosageSummary = `${dosePerIntake} tab × ${selectedFreq} for ${durationDays} days (${instructions})`;
    onApplyQuantity(totalUnitsCalculated, dosageSummary);
    setIsOpen(false);
  }

  return (
    <div className="text-[11px] font-sans">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl font-bold border border-teal-200/60 transition-colors cursor-pointer"
        title="Calculate quantity from dosage & duration"
      >
        <Calculator size={13} />
        <span>Dosage Calculator</span>
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {isOpen && (
        <div className="mt-2 p-3.5 bg-white border border-teal-200 rounded-2xl shadow-lg space-y-3 z-20 relative text-slate-800 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <Pill size={14} className="text-teal-600" />
              Clinical Dosage Schedule
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold">
              Pack size: {packSize} units
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Dose</label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={dosePerIntake}
                onChange={(e) => setDosePerIntake(Math.max(0.25, parseFloat(e.target.value) || 1))}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Frequency</label>
              <select
                value={selectedFreq}
                onChange={(e) => setSelectedFreq(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-teal-600"
              >
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.code} value={f.code}>{f.code}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Duration</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-teal-600"
                />
                <span className="text-[10px] text-slate-400 font-bold">days</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Timing & Instructions</label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. After meals / Morning before breakfast"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-600"
            />
          </div>

          {/* Computed Summary */}
          <div className="p-2.5 bg-teal-50/70 rounded-xl border border-teal-100 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold text-teal-900">
                Prescribed: <span className="font-extrabold text-teal-700">{totalUnitsCalculated} units</span>
              </div>
              {packSize > 1 && (
                <div className="text-[9px] text-teal-600">
                  Dispense: {packsNeeded} strip{packsNeeded > 1 ? 's' : ''} ({totalWithPackRounding} units)
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer shadow-xs"
            >
              Apply Qty ({totalUnitsCalculated})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
