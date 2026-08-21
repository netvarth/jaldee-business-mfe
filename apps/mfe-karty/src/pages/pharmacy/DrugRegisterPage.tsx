import React, { useState } from 'react';
import {
  FileText, ShieldAlert, Download, Filter, Search,
  Calendar, Stethoscope, User, AlertCircle, RefreshCw,
  Clock, CheckCircle2, ChevronRight, Hash
} from 'lucide-react';
import {
  useDrugRegister,
  useDrugRegisterSummary,
  exportDrugRegisterCsv,
  DrugRegisterEntryDto
} from '../../services/useDrugRegister';
import { useStores } from '../../services/useStores';

export function DrugRegisterPage() {
  const { data: stores } = useStores();
  const pharmacyStores = (stores || []).filter((s: any) => s.verticalType === 'PHARMACY' || s.verticalType === 'AYURVEDA' || s.type === 'PHARMACY');
  const [selectedStoreUid, setSelectedStoreUid] = useState<string>('');

  const activeStoreUid = selectedStoreUid || (pharmacyStores[0]?.id || pharmacyStores[0]?.uid || '');

  const [selectedSchedule, setSelectedSchedule] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: rawEntries, isLoading, refetch } = useDrugRegister({
    schedule: selectedSchedule,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const allEntries: any[] = Array.isArray(rawEntries)
    ? rawEntries
    : (rawEntries as any)?.content || [];

  // Client-side quick filter
  const entries = allEntries.filter((e) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const patient = (e.patientName || '').toLowerCase();
    const doc = (e.prescriberName || e.prescribingDoctor || '').toLowerCase();
    const reg = (e.prescriberRegNo || e.doctorRegNo || '').toLowerCase();
    const drug = (e.itemName || '').toLowerCase();
    const ref = (e.prescriptionRef || '').toLowerCase();
    return patient.includes(term) || doc.includes(term) || reg.includes(term) || drug.includes(term) || ref.includes(term);
  });

  const { data: summary } = useDrugRegisterSummary(activeStoreUid || undefined);

  const handleExport = () => {
    if (!entries || entries.length === 0) {
      alert('No records to export in the current selection.');
      return;
    }
    exportDrugRegisterCsv(entries, `Statutory_Drug_Register_${selectedSchedule}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const getScheduleBadge = (schedule: string) => {
    const norm = (schedule || '').toUpperCase();
    if (norm === 'SCHEDULE_H1' || norm === 'H1') {
      return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10.5px] font-bold">Schedule H1</span>;
    }
    if (norm === 'SCHEDULE_NARCOTIC' || norm === 'NARCOTIC') {
      return <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded text-[10.5px] font-bold">Narcotic</span>;
    }
    if (norm === 'SCHEDULE_X' || norm === 'X') {
      return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10.5px] font-bold">Schedule X</span>;
    }
    if (norm === 'SCHEDULE_AYUSH_E1' || norm === 'AYUSH_E1') {
      return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10.5px] font-bold">AYUSH E1</span>;
    }
    return <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded text-[10.5px] font-bold">Schedule H</span>;
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-rose-600 font-bold uppercase tracking-wider">
            <FileText size={14} />
            <span>Statutory Compliance & CDSCO Standards</span>
          </div>
          <h1 className="text-xl font-bold text-surface-900 mt-1">
            Statutory Drug Register (Form 35 / Schedule H1 / X / Narcotic)
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            Audit-ready legal register tracking all scheduled, restricted, and prescription drug dispensations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pharmacyStores.length > 1 && (
            <select
              value={activeStoreUid}
              onChange={(e) => setSelectedStoreUid(e.target.value)}
              className="px-3 py-2 bg-white border border-surface-200 rounded-xl text-xs font-bold text-surface-700 shadow-xs outline-none"
            >
              {pharmacyStores.map((st: any) => (
                <option key={st.id || st.uid} value={st.id || st.uid}>
                  {st.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-900 hover:bg-surface-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Export Statutory Register</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs">
          <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Total Scheduled Dispenses</span>
          <div className="text-2xl font-extrabold text-surface-900 mt-1">
            {allEntries.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 bg-rose-50/30 shadow-xs">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Schedule H1 Records</span>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">
            {allEntries.filter(e => (e.drugSchedule || '').toUpperCase().includes('H1') || (e.registerType || '').toUpperCase().includes('H1')).length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-100 bg-red-50/30 shadow-xs">
          <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Narcotic / NDPS</span>
          <div className="text-2xl font-extrabold text-red-700 mt-1">
            {allEntries.filter(e => (e.drugSchedule || '').toUpperCase().includes('NARCOTIC')).length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-100 bg-purple-50/30 shadow-xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Schedule X</span>
          <div className="text-2xl font-extrabold text-purple-700 mt-1">
            {allEntries.filter(e => (e.drugSchedule || '').toUpperCase().includes('X')).length}
          </div>
        </div>
      </div>

      {/* Filter and Query Controls */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Filter by patient, doctor, reg no, or drug name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-700 outline-none"
            >
              <option value="ALL">All Drug Schedules</option>
              <option value="H1">Schedule H1 (Form 35)</option>
              <option value="NARCOTIC">Narcotics / NDPS</option>
              <option value="X">Schedule X</option>
              <option value="AYUSH_E1">AYUSH Schedule E1</option>
              <option value="H">Schedule H</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <input
              type="date"
              placeholder="From Date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none text-surface-700"
            />
          </div>

          <div className="sm:col-span-2">
            <input
              type="date"
              placeholder="To Date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none text-surface-700"
            />
          </div>

          <div className="sm:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors cursor-pointer"
              title="Refresh Register"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Statutory Register Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50/80 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-3 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Patient Name & Address</th>
                <th className="py-3.5 px-4">Prescriber Doctor & Reg No</th>
                <th className="py-3.5 px-4">Drug Name & Schedule</th>
                <th className="py-3.5 px-4">Batch & Expiry</th>
                <th className="py-3.5 px-4 text-center">Qty</th>
                <th className="py-3.5 px-4">Dispensed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-surface-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading statutory register entries...</span>
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-surface-400">
                    <ShieldAlert size={32} className="mx-auto text-surface-300 mb-2" />
                    <p className="text-sm font-bold text-surface-700">No statutory register entries found</p>
                    <p className="text-xs text-surface-400 mt-0.5">Scheduled drug dispenses (H1/X/Narcotic) will automatically appear here.</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry, idx) => {
                  const dateVal = entry.dispensedAt || entry.dispenseDate;
                  const docName = entry.prescriberName || entry.prescribingDoctor || 'Prescriber';
                  const docReg = entry.prescriberRegNo || entry.doctorRegNo || 'N/A';
                  const itemTitle = entry.itemName || entry.name || 'Medicine';
                  const batch = entry.batchNo || entry.batchNumber || '-';
                  const exp = entry.expiryDate || '-';
                  const quantity = entry.qty || entry.quantityDispensed || 1;
                  const dispPerson = entry.dispensedByName || entry.dispensedBy || 'Registered Pharmacist';

                  return (
                    <tr key={entry.uid || idx} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-3 text-center font-mono text-surface-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-surface-900">
                          {dateVal ? new Date(dateVal).toLocaleDateString('en-IN') : '-'}
                        </div>
                        <div className="text-[10.5px] text-surface-400">
                          {dateVal ? new Date(dateVal).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-surface-900">{entry.patientName || 'Patient'}</div>
                        <div className="text-[11px] text-surface-400 truncate">
                          {entry.patientAddress || 'Address on Rx file'} {entry.patientPhone ? `• ${entry.patientPhone}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">
                          {docName.startsWith('Dr.') ? docName : `Dr. ${docName}`}
                        </div>
                        <div className="text-[11px] text-rose-700 font-mono font-bold">
                          Reg No: {docReg}
                        </div>
                        {entry.hospitalClinic && (
                          <div className="text-[10.5px] text-surface-400 truncate max-w-xs">{entry.hospitalClinic}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">{itemTitle}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {getScheduleBadge(entry.drugSchedule)}
                          {entry.composition && (
                            <span className="text-[10.5px] text-surface-400 truncate max-w-[150px]">({entry.composition})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        <div className="font-bold text-surface-800">{batch}</div>
                        <div className="text-[10.5px] text-surface-400">Exp: {exp}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-surface-900">
                        {quantity} {entry.unitName || ''}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-surface-900">{dispPerson}</div>
                        <div className="text-[10.5px] text-emerald-600 font-mono font-bold">Signed & Verified</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
