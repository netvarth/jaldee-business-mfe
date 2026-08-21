import React, { useState } from 'react';
import {
  Boxes, Plus, Search, Filter, CheckCircle2, Clock,
  Sparkles, Layers, AlertCircle, X, Check, RefreshCw,
  FileCheck2, ChevronRight, Leaf, ShieldAlert
} from 'lucide-react';
import {
  useProductionOrders,
  useCreateProductionOrder,
  useCompleteProductionOrder,
  useCancelProductionOrder,
  ProductionOrderDto
} from '../../services/useProductionOrders';
import { useStores } from '../../services/useStores';
import { useItems } from '../../services/useItems';

export function ProductionOrdersPage() {
  const { data: stores } = useStores();
  const pharmacyStores = (stores || []).filter((s: any) => s.verticalType === 'PHARMACY' || s.verticalType === 'AYURVEDA' || s.verticalType === 'KITCHEN' || s.type === 'PHARMACY');
  const [selectedStoreUid, setSelectedStoreUid] = useState<string>('');

  const activeStoreUid = selectedStoreUid || (pharmacyStores[0]?.id || pharmacyStores[0]?.uid || '');

  const { data: orders, isLoading, refetch } = useProductionOrders(activeStoreUid || undefined);
  const completeMutation = useCompleteProductionOrder();
  const cancelMutation = useCancelProductionOrder();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrderDto | null>(null);

  const filteredOrders = (orders || []).filter(o => {
    const matchesSearch =
      o.productionNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.outputItemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.targetBatchNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const plannedCount = (orders || []).filter(o => o.status === 'PLANNED').length;
  const inProgressCount = (orders || []).filter(o => o.status === 'IN_PROGRESS').length;
  const completedCount = (orders || []).filter(o => o.status === 'COMPLETED').length;

  const handleComplete = async (order: ProductionOrderDto) => {
    const actual = prompt(`Enter actual quantity produced for batch ${order.targetBatchNumber}:`, String(order.plannedQty));
    if (!actual || isNaN(Number(actual))) return;
    try {
      await completeMutation.mutateAsync({ uid: order.uid, actualQtyProduced: Number(actual) });
      alert(`Production order ${order.productionNo} completed! Inventory stock has been credited to batch ${order.targetBatchNumber}.`);
      refetch();
    } catch (err: any) {
      alert('Failed to complete production order: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleCancel = async (order: ProductionOrderDto) => {
    if (!window.confirm(`Are you sure you want to cancel production order ${order.productionNo}?`)) return;
    try {
      await cancelMutation.mutateAsync(order.uid);
      refetch();
    } catch (err: any) {
      alert('Failed to cancel order: ' + (err?.message || 'Unknown error'));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Leaf size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">
              Ayurvedic Compounding & Production Orders
            </h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              In-house medicine preparation, raw herb decoctions, BOM recipes, and finished stock batching.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pharmacyStores.length > 1 && (
            <select
              value={activeStoreUid}
              onChange={(e) => setSelectedStoreUid(e.target.value)}
              className="px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-700 outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {pharmacyStores.map((s: any) => (
                <option key={s.id || s.uid} value={s.id || s.uid}>{s.name}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            New Compounding Batch
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Planned Batches</span>
            <Clock size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">{plannedCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Scheduled for decoction & preparation</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>In Compounding</span>
            <Boxes size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{inProgressCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Ingredients being boiled & processed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-surface-500 text-xs font-bold uppercase tracking-wider">
            <span>Completed & Batched</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{completedCount}</div>
          <p className="text-[11px] text-surface-400 font-medium">Stock batches credited to pharmacy</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search by batch #, medicine name, or production order #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 text-surface-500 hover:text-surface-900 hover:bg-surface-100 rounded-xl transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Production Orders Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50/80 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Order No / Date</th>
                <th className="py-3.5 px-4">Finished Ayurvedic Medicine</th>
                <th className="py-3.5 px-4">Target Batch & Expiry</th>
                <th className="py-3.5 px-4 text-center">Planned Qty</th>
                <th className="py-3.5 px-4 text-center">Actual Produced</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-surface-400">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading compounding production orders...</span>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-surface-400">
                    <Boxes size={32} className="mx-auto text-surface-300 mb-2" />
                    <p className="text-sm font-bold text-surface-700">No production orders found</p>
                    <p className="text-xs text-surface-400 mt-0.5">Create a compounding batch to track in-house Ayurvedic preparation.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.uid} className="hover:bg-surface-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-surface-900">
                      <div>{order.productionNo}</div>
                      <div className="text-[10.5px] text-surface-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-surface-900">{order.outputItemName}</div>
                      <div className="text-[11px] text-surface-400">
                        {order.components?.length || 0} raw ingredients in recipe
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-surface-900">{order.targetBatchNumber}</div>
                      <div className="text-[10.5px] text-surface-400">
                        {order.isMaturedNoExpiry ? (
                          <span className="text-amber-700 font-bold">Matured (No Expiry)</span>
                        ) : (
                          `Exp: ${order.expiryDate || 'N/A'}`
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-surface-900">
                      {order.plannedQty} {order.outputUnitSymbol || 'Units'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {order.actualQtyProduced !== undefined && order.actualQtyProduced !== null ? `${order.actualQtyProduced} ${order.outputUnitSymbol || ''}` : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                        order.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : order.status === 'IN_PROGRESS'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : order.status === 'PLANNED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleComplete(order)}
                              disabled={completeMutation.isPending}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 text-[11px] transition-colors cursor-pointer"
                              title="Complete and add stock"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancel(order)}
                              className="p-1 text-rose-400 hover:text-rose-600 rounded-lg"
                              title="Cancel order"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <CreateProductionOrderModal
          storeUid={activeStoreUid}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function CreateProductionOrderModal({ storeUid, onClose, onSuccess }: { storeUid: string; onClose: () => void; onSuccess: () => void }) {
  const { data: items } = useItems();
  const createMutation = useCreateProductionOrder();

  const [outputItemUid, setOutputItemUid] = useState('');
  const [targetBatchNumber, setTargetBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [isMaturedNoExpiry, setIsMaturedNoExpiry] = useState(false);
  const [plannedQty, setPlannedQty] = useState<number>(100);
  const [notes, setNotes] = useState('');

  const [components, setComponents] = useState<{ itemUid: string; requiredQty: number }[]>([
    { itemUid: '', requiredQty: 10 }
  ]);

  const handleAddComponent = () => {
    setComponents([...components, { itemUid: '', requiredQty: 5 }]);
  };

  const handleRemoveComponent = (index: number) => {
    setComponents(components.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outputItemUid || !targetBatchNumber) {
      alert('Output Medicine and Target Batch Number are required.');
      return;
    }

    const payload = {
      storeUid,
      outputItemUid,
      targetBatchNumber,
      mfgDate,
      expiryDate: isMaturedNoExpiry ? undefined : expiryDate,
      isMaturedNoExpiry,
      plannedQty,
      notes,
      components: components.filter(c => !!c.itemUid)
    };

    try {
      await createMutation.mutateAsync(payload);
      onSuccess();
    } catch (err: any) {
      alert('Failed to create production order: ' + (err?.message || 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-surface-200 text-left max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Leaf size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">New Compounding & Production Batch</h2>
              <p className="text-xs text-surface-500">In-house formulation and finished batch preparation</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Finished Ayurvedic Medicine *</label>
              <select
                required
                value={outputItemUid}
                onChange={(e) => setOutputItemUid(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Select medicine to produce...</option>
                {(items || []).map((item: any) => (
                  <option key={item.id || item.uid} value={item.id || item.uid}>
                    {item.name} {item.ayushType ? `[${item.ayushType}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Target Batch Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. ARISHTA-2026-B1"
                value={targetBatchNumber}
                onChange={(e) => setTargetBatchNumber(e.target.value)}
                className="w-full px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Planned Output Qty *</label>
              <input
                type="number"
                required
                min={1}
                value={plannedQty}
                onChange={(e) => setPlannedQty(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Manufacturing Date *</label>
              <input
                type="date"
                required
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-surface-600 mb-1">Expiry Date</label>
              <input
                type="date"
                disabled={isMaturedNoExpiry}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none disabled:bg-surface-100 disabled:text-surface-400"
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="checkbox"
                  id="noExpiryToggle"
                  checked={isMaturedNoExpiry}
                  onChange={(e) => setIsMaturedNoExpiry(e.target.checked)}
                  className="rounded text-amber-600"
                />
                <label htmlFor="noExpiryToggle" className="text-[10.5px] font-bold text-surface-600 cursor-pointer">
                  Matured (No Expiry - e.g. Asavas/Arishtas)
                </label>
              </div>
            </div>
          </div>

          {/* Raw Herbs BOM Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-surface-700 uppercase tracking-wider">Raw Herbs & Ingredients (BOM)</label>
              <button
                type="button"
                onClick={handleAddComponent}
                className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200"
              >
                + Add Herb
              </button>
            </div>

            <div className="space-y-2">
              {components.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={comp.itemUid}
                    onChange={(e) => {
                      const updated = [...components];
                      updated[idx].itemUid = e.target.value;
                      setComponents(updated);
                    }}
                    className="flex-1 px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none"
                  >
                    <option value="">Select raw ingredient...</option>
                    {(items || []).map((i: any) => (
                      <option key={i.id || i.uid} value={i.id || i.uid}>{i.name}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Qty"
                    value={comp.requiredQty}
                    onChange={(e) => {
                      const updated = [...components];
                      updated[idx].requiredQty = Number(e.target.value);
                      setComponents(updated);
                    }}
                    className="w-24 px-2.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-center outline-none"
                  />

                  {components.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
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
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {createMutation.isPending ? 'Creating Batch...' : 'Create Batch Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
