import React, { useState } from 'react';
import {
  FlaskConical, Plus, Search, Filter, Pill, Check,
  ArrowRightLeft, Sparkles, AlertCircle, Layers, CheckCircle2,
  X, Tag, Store
} from 'lucide-react';
import {
  useCompositions,
  useCreateComposition,
  useSubstitutes,
  CompositionDto
} from '../../services/useCompositions';
import { useItems } from '../../services/useItems';
import { useStores } from '../../services/useStores';

export function CompositionPage() {
  const { data: compositions, isLoading: loadingCompositions } = useCompositions();
  const { data: items } = useItems();
  const { data: stores } = useStores();

  const [activeTab, setActiveTab] = useState<'substitutes' | 'dictionary'>('substitutes');
  const [selectedItemUid, setSelectedItemUid] = useState<string>('');
  const [selectedStoreUid, setSelectedStoreUid] = useState<string>('');
  const [isAddSaltModalOpen, setIsAddSaltModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Substitute finder query
  const { data: substitutes, isLoading: loadingSubstitutes } = useSubstitutes(
    selectedItemUid || undefined,
    selectedStoreUid || undefined
  );

  const selectedItem = (items || []).find((i: any) => (i.id || i.uid) === selectedItemUid);

  const filteredCompositions = (compositions || []).filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.therapeuticClass?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <FlaskConical size={26} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">
              Drug Compositions & Generic Substitutes
            </h1>
            <p className="text-xs text-surface-500 font-medium mt-0.5">
              Active pharmaceutical ingredient (API) mapping and bio-equivalent in-stock generic substitution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-surface-100 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('substitutes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'substitutes'
                  ? 'bg-white text-surface-900 shadow-xs'
                  : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              Substitution Finder
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dictionary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dictionary'
                  ? 'bg-white text-surface-900 shadow-xs'
                  : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              Salt Dictionary
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddSaltModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            Add Active Salt
          </button>
        </div>
      </div>

      {activeTab === 'substitutes' ? (
        /* Tab 1: Generic Substitute Finder */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
              <ArrowRightLeft size={18} className="text-blue-600" />
              <h3>Bio-Equivalent Substitute Lookup</h3>
            </div>
            <p className="text-xs text-surface-500">
              Select any prescribed brand or item to immediately view identical generic alternatives in stock with matching salt composition and dosage strength.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-surface-600 mb-1">Select Prescribed Drug / Brand *</label>
                <select
                  value={selectedItemUid}
                  onChange={(e) => setSelectedItemUid(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select branded or prescribed medicine...</option>
                  {(items || []).map((item: any) => (
                    <option key={item.id || item.uid} value={item.id || item.uid}>
                      {item.name} {item.brandName ? `(${item.brandName})` : ''} - ₹{item.price || item.sellingPrice || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-surface-600 mb-1">Pharmacy Store Filter (Optional)</label>
                <select
                  value={selectedStoreUid}
                  onChange={(e) => setSelectedStoreUid(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-xs font-bold text-surface-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">All Pharmacy Stores</option>
                  {(stores || []).map((s: any) => (
                    <option key={s.id || s.uid} value={s.id || s.uid}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Area */}
          {selectedItemUid && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider">
                  Matching Generic Substitutes for <span className="text-blue-600 font-extrabold">{selectedItem?.name}</span>
                </h3>
                <span className="text-xs text-surface-500 font-medium">
                  {substitutes?.length || 0} alternatives found
                </span>
              </div>

              {loadingSubstitutes ? (
                <div className="bg-white p-12 rounded-2xl border border-surface-200 text-center text-surface-400">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Matching active salts and calculating cost savings...</span>
                </div>
              ) : !substitutes || substitutes.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-surface-200 text-center text-surface-400 space-y-2">
                  <Pill size={32} className="mx-auto text-surface-300" />
                  <p className="text-sm font-bold text-surface-700">No generic substitutes currently configured</p>
                  <p className="text-xs text-surface-400">Link active salts in the Salt Dictionary to enable bio-equivalent suggestions.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {substitutes.map((sub, idx) => (
                    <div key={sub.itemUid || idx} className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs hover:border-blue-300 transition-all space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-surface-900">{sub.itemName}</h4>
                          <p className="text-[11px] text-surface-500 mt-0.5">{sub.manufacturer || sub.brandName || 'Generic Formulation'}</p>
                        </div>
                        {sub.savingsPercentage > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold shrink-0">
                            Save {sub.savingsPercentage}%
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-surface-50 rounded-xl text-xs space-y-1 font-medium">
                        <div className="flex justify-between text-surface-500">
                          <span>Active Salt:</span>
                          <span className="font-bold text-surface-900">{sub.compositionSummary || 'Identical composition'}</span>
                        </div>
                        <div className="flex justify-between text-surface-500">
                          <span>Stock Availability:</span>
                          <span className={`font-bold ${sub.inStock ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {sub.inStock ? `${sub.availableStockQty} in stock` : 'Out of stock'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-surface-100">
                        <div>
                          <div className="text-lg font-black text-surface-900">₹{sub.sellingPrice}</div>
                          {sub.mrp > sub.sellingPrice && (
                            <div className="text-[10.5px] text-surface-400 line-through">MRP: ₹{sub.mrp}</div>
                          )}
                        </div>

                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                          Bio-Equivalent
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Salt Dictionary */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search active pharmaceutical salts or therapeutic classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50/80 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Active Salt / Chemical Name</th>
                  <th className="py-3.5 px-4">Therapeutic Category</th>
                  <th className="py-3.5 px-4">Description / Pharmacology</th>
                  <th className="py-3.5 px-4 text-center">Linked Medicines</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
                {loadingCompositions ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-surface-400">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading active salt dictionary...</span>
                    </td>
                  </tr>
                ) : filteredCompositions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-surface-400">
                      <FlaskConical size={32} className="mx-auto text-surface-300 mb-2" />
                      <p className="text-sm font-bold text-surface-700">No active salts found</p>
                      <p className="text-xs text-surface-400">Add your active drug salts to enable automatic generic drug substitution.</p>
                    </td>
                  </tr>
                ) : (
                  filteredCompositions.map((comp) => (
                    <tr key={comp.uid} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-surface-900">
                        {comp.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10.5px] font-bold">
                          {comp.therapeuticClass || 'General Drug'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-surface-500 max-w-md">
                        {comp.description || 'Standard therapeutic active formulation.'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-surface-900">
                        {comp.linkedItemsCount ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check size={12} /> Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Salt Modal */}
      {isAddSaltModalOpen && (
        <AddSaltModal
          onClose={() => setIsAddSaltModalOpen(false)}
          onSuccess={() => setIsAddSaltModalOpen(false)}
        />
      )}
    </div>
  );
}

function AddSaltModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const createMutation = useCreateComposition();
  const [name, setName] = useState('');
  const [therapeuticClass, setTherapeuticClass] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await createMutation.mutateAsync({ name, therapeuticClass, description });
      onSuccess();
    } catch (err: any) {
      alert('Failed to create salt: ' + (err?.message || 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-surface-200 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <FlaskConical size={20} />
            </div>
            <h2 className="text-base font-bold text-surface-900">Add Active Pharmaceutical Salt</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Salt / Chemical Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Paracetamol or Amoxicillin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Therapeutic Class</label>
            <input
              type="text"
              placeholder="e.g. Analgesic, Antibiotic, Antihistamine"
              value={therapeuticClass}
              onChange={(e) => setTherapeuticClass(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1">Description / Notes</label>
            <textarea
              rows={3}
              placeholder="Mechanism of action or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Salt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
