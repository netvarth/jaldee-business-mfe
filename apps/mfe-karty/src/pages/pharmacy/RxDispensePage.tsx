import React, { useState, useMemo } from 'react';
import {
  FileText, Plus, Search, Filter, Stethoscope, AlertTriangle,
  CheckCircle2, Clock, Calendar, User, Pill, ArrowRight,
  Download, Eye, ShieldAlert, Sparkles, RefreshCw, X, Check, Printer, Repeat
} from 'lucide-react';
import { useStores } from '../../services/useStores';
import { useCapabilities } from '../../services/useCapabilities';
import { useOrders } from '../../services/useOrders';
import { OrderComposer } from '../../components/composer/OrderComposer';

export function RxDispensePage() {
  const { isEnabled } = useCapabilities();
  const { data: stores } = useStores();
  const pharmacyStores = (stores || []).filter((s: any) => s.verticalType === 'PHARMACY' || s.verticalType === 'AYURVEDA' || s.type === 'PHARMACY');
  const [selectedStoreUid, setSelectedStoreUid] = useState<string>('');

  const activeStoreUid = selectedStoreUid || (pharmacyStores[0]?.id || pharmacyStores[0]?.uid || '');

  // Query unified orders for this pharmacy store
  const { data: ordersData, isLoading, refetch } = useOrders({
    storeUid: activeStoreUid || undefined,
    size: 100,
  });

  const rawOrders: any[] = useMemo(() => {
    if (!ordersData) return [];
    if (Array.isArray(ordersData)) return ordersData;
    if (Array.isArray(ordersData.content)) return ordersData.content;
    return [];
  }, [ordersData]);

  // Filter to prescription dispenses or orders with clinical metadata
  const dispenses = useMemo(() => {
    return rawOrders.filter(o => {
      // If store is pharmacy vertical, all orders are clinical sales
      const isPharmaStore = pharmacyStores.some((s: any) => (s.id || s.uid) === o.storeUid);
      return Boolean(o.prescriberName || o.prescriptionRef || isPharmaStore);
    });
  }, [rawOrders, pharmacyStores]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [refillPayload, setRefillPayload] = useState<any>(null);
  const [viewingDispense, setViewingDispense] = useState<any>(null);

  const filteredDispenses = useMemo(() => {
    return dispenses.filter((d) => {
      const matchesSearch =
        (d.orderNo || d.id || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.patientName || d.consumerName || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.prescriberName || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.prescriptionRef || '')?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dispenses, searchTerm, statusFilter]);

  const totalDispenses = dispenses.length;
  const controlledDispenses = dispenses.filter(d =>
    d.items?.some((i: any) => i.drugSchedule && i.drugSchedule !== 'NONE' && i.drugSchedule !== 'SCHEDULE_NONE')
  ).length;
  const totalValue = dispenses.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);

  function handleRefill(order: any) {
    setRefillPayload({
      customer: {
        id: order.consumerUid,
        name: order.patientName || order.consumerName,
        phone: order.consumerPhone,
      },
      prescriber: {
        prescriberName: order.prescriberName || '',
        prescriberRegNo: order.prescriberRegNo || '',
        hospitalName: order.hospitalName || '',
        prescriptionRef: order.prescriptionRef || '',
        prescriptionDate: new Date().toISOString().split('T')[0],
        patientName: order.patientName || order.consumerName || '',
        patientAddress: order.patientAddress || order.shippingAddress || '',
      },
      items: (order.items || []).map((i: any) => ({
        id: i.itemUid || i.id,
        itemUid: i.itemUid,
        name: i.name || i.itemName || 'Medicine',
        price: Number(i.unitPrice || 0),
        qty: Number(i.qty || 1),
        unitPrice: Number(i.unitPrice || 0),
      })),
    });
    setIsComposerOpen(true);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Stethoscope size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">
                Rx Prescription Dispensing & Audit Ledger
              </h1>
              <p className="text-xs text-surface-500 font-medium mt-0.5">
                Statutory prescription register, Doctor Medical Council validation & fast refill dispensing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pharmacyStores.length > 1 && (
            <select
              value={activeStoreUid}
              onChange={(e) => setSelectedStoreUid(e.target.value)}
              className="px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {pharmacyStores.map((s: any) => (
                <option key={s.id || s.uid} value={s.id || s.uid}>{s.name}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              setRefillPayload(null);
              setIsComposerOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            New Rx Dispense
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Prescriptions</span>
            <FileText size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">{totalDispenses}</div>
          <p className="text-[11px] text-surface-400 font-medium">Completed & logged dispenses</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Controlled Drug Sales (H/H1/X)</span>
            <ShieldAlert size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{controlledDispenses}</div>
          <p className="text-[11px] text-surface-400 font-medium">Stamped in statutory drug register</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Prescription Revenue</span>
            <Sparkles size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">₹{totalValue.toFixed(2)}</div>
          <p className="text-[11px] text-surface-400 font-medium">Unified order revenue</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-surface-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search by Rx ref, patient, doctor, or order no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium text-surface-900 placeholder:text-surface-400 focus:bg-white focus:border-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Dispenses Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50/80 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Order / Dispense No</th>
                <th className="py-3.5 px-4">Patient Details</th>
                <th className="py-3.5 px-4">Prescribing Doctor</th>
                <th className="py-3.5 px-4">Items / Schedules</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-surface-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading prescription records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDispenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-surface-400">
                    <Pill size={32} className="mx-auto text-surface-300 mb-2" />
                    <p className="text-sm font-bold text-surface-700">No prescription records found</p>
                    <p className="text-xs text-surface-400 mt-0.5">Click "New Rx Dispense" to ring up your first prescription sale.</p>
                  </td>
                </tr>
              ) : (
                filteredDispenses.map((d: any) => {
                  const hasControlled = d.items?.some((i: any) => i.drugSchedule && i.drugSchedule !== 'NONE');
                  return (
                    <tr key={d.uid || d.id} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">{d.orderNo || d.id?.slice(0, 8) || 'ORD-DISPENSE'}</div>
                        <div className="text-[11px] text-surface-400">
                          {d.orderDate || d.createdAt ? new Date(d.orderDate || d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">{d.patientName || d.consumerName || 'Walk-in Patient'}</div>
                        <div className="text-[11px] text-surface-400">
                          {d.consumerPhone ? `Ph: ${d.consumerPhone}` : 'Direct counter'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-surface-900">
                          {d.prescriberName ? (/^dr\.?\s/i.test(d.prescriberName) ? d.prescriberName : `Dr. ${d.prescriberName}`) : 'Self / Counter'}
                        </div>
                        <div className="text-[11px] text-surface-400 font-mono">
                          {d.prescriberRegNo ? `Reg: ${d.prescriberRegNo}` : (d.prescriptionRef ? `Rx: ${d.prescriptionRef}` : 'N/A')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-surface-900">{d.items?.length || d.itemsCount || 1} items</span>
                          {hasControlled && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
                              Schedule H1
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-surface-900">₹{Number(d.totalAmount || 0).toFixed(2)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          d.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {d.status || 'COMPLETED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRefill(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-emerald-200/60"
                            title="Refill this prescription"
                          >
                            <Repeat size={12} />
                            <span>Refill</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Unified OrderComposer for Dispenses & Refills */}
      <OrderComposer
        isOpen={isComposerOpen}
        onClose={() => {
          setIsComposerOpen(false);
          setRefillPayload(null);
        }}
        mode="prescription"
        initialStoreUid={activeStoreUid}
        initialCustomer={refillPayload?.customer}
        initialPrescriber={refillPayload?.prescriber}
        initialItems={refillPayload?.items}
        onSuccess={() => {
          setIsComposerOpen(false);
          setRefillPayload(null);
          refetch();
        }}
      />
    </div>
  );
}
