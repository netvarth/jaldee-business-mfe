import React, { useState } from 'react';
import { useTaxes, useCreateTax, useUpdateTax, useUpdateTaxStatus, TaxDto } from '../../../services/useTaxes';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export const TaxSettingsTab = () => {
  const { data: taxes, isLoading } = useTaxes();
  const createTax = useCreateTax();
  const updateTax = useUpdateTax();
  const updateStatus = useUpdateTaxStatus();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxDto | null>(null);

  // Form states
  const [taxCode, setTaxCode] = useState('');
  const [taxName, setTaxName] = useState('');
  const [taxRegime, setTaxRegime] = useState<'GST' | 'VAT' | 'NONE'>('GST');
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [igst, setIgst] = useState(0);

  const openCreateForm = () => {
    setEditingTax(null);
    setTaxCode('');
    setTaxName('');
    setTaxRegime('GST');
    setTaxPercentage(0);
    setCgst(0);
    setSgst(0);
    setIgst(0);
    setIsFormOpen(true);
  };

  const openEditForm = (tax: TaxDto) => {
    setEditingTax(tax);
    setTaxCode(tax.taxCode);
    setTaxName(tax.taxName);
    setTaxRegime(tax.taxRegime);
    setTaxPercentage(tax.taxPercentage || 0);
    setCgst(tax.cgst || 0);
    setSgst(tax.sgst || 0);
    setIgst(tax.igst || 0);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    const payload: TaxDto = {
      taxCode,
      taxName,
      taxRegime,
      taxPercentage,
      cgst,
      sgst,
      igst,
      status: editingTax?.status || 'ACTIVE'
    };

    if (editingTax?.uid) {
      updateTax.mutate({ uid: editingTax.uid, data: payload }, {
        onSuccess: () => setIsFormOpen(false)
      });
    } else {
      createTax.mutate(payload, {
        onSuccess: () => setIsFormOpen(false)
      });
    }
  };

  const toggleStatus = (tax: TaxDto) => {
    const newStatus = tax.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (tax.uid) {
      updateStatus.mutate({ uid: tax.uid, status: newStatus });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading taxes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tax Configurations</h2>
          <p className="text-sm text-slate-500">Manage tax rules, GST configurations, and auto-calculation zones.</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#55349A] hover:bg-[#43297a] text-white text-sm font-semibold rounded-xl transition-all shadow-md"
        >
          <Plus className="h-4 w-4" />
          Add Tax Rule
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-4">Tax Code / Name</th>
              <th className="px-6 py-4">Regime</th>
              <th className="px-6 py-4">Total %</th>
              <th className="px-6 py-4">Breakdown (C/S/I)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {taxes?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No tax configurations found.</td>
              </tr>
            )}
            {taxes?.map(tax => (
              <tr key={tax.uid} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{tax.taxCode}</div>
                  <div className="text-xs text-slate-500">{tax.taxName}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 font-medium rounded text-xs">{tax.taxRegime}</span>
                </td>
                <td className="px-6 py-4 font-semibold text-slate-900">{tax.taxPercentage}%</td>
                <td className="px-6 py-4 text-slate-600 text-xs">
                  <div>CGST: {tax.cgst}%</div>
                  <div>SGST: {tax.sgst}%</div>
                  <div>IGST: {tax.igst}%</div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleStatus(tax)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
                      tax.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {tax.status === 'ACTIVE' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {tax.status}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openEditForm(tax)}
                    className="p-2 text-slate-400 hover:text-[#55349A] hover:bg-[#55349A]/5 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tax Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingTax ? 'Edit Tax Rule' : 'New Tax Rule'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tax Code</label>
                  <input
                    type="text"
                    value={taxCode}
                    onChange={e => setTaxCode(e.target.value)}
                    placeholder="e.g. GST-18"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Regime</label>
                  <select
                    value={taxRegime}
                    onChange={e => setTaxRegime(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  >
                    <option value="GST">GST</option>
                    <option value="VAT">VAT</option>
                    <option value="NONE">NONE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tax Name</label>
                <input
                  type="text"
                  value={taxName}
                  onChange={e => setTaxName(e.target.value)}
                  placeholder="e.g. Standard 18% GST"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Total Tax Percentage (%)</label>
                  <input
                    type="number"
                    value={taxPercentage}
                    onChange={e => setTaxPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">CGST (%)</label>
                  <input
                    type="number"
                    value={cgst}
                    onChange={e => setCgst(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">SGST (%)</label>
                  <input
                    type="number"
                    value={sgst}
                    onChange={e => setSgst(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">IGST (%)</label>
                  <input
                    type="number"
                    value={igst}
                    onChange={e => setIgst(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={createTax.isPending || updateTax.isPending || !taxCode || !taxName}
                className="px-5 py-2 bg-[#55349A] hover:bg-[#43297a] text-white font-semibold rounded-xl text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {createTax.isPending || updateTax.isPending ? 'Saving...' : 'Save Tax Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
