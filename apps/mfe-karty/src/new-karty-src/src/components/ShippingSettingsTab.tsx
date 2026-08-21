import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeliveryPartners, useCreateDeliveryPartner, useUpdateDeliveryPartner, DeliveryPartnerDto } from '../../../services/useDeliveryProfiles';
import { Plus, Edit2, CheckCircle, XCircle, Truck, Link, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export const ShippingSettingsTab = () => {
  const navigate = useNavigate();

  // Delivery Partners Hook
  const { data: partners, isLoading: isLoadingPartners } = useDeliveryPartners();
  const createPartner = useCreateDeliveryPartner();
  const updatePartner = useUpdateDeliveryPartner();

  const [isPartnerFormOpen, setIsPartnerFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartnerDto | null>(null);

  // Form states for Partners
  const [partnerName, setPartnerName] = useState('');
  const [partnerType, setPartnerType] = useState('ShipRocket');
  const [partnerPickupLocation, setPartnerPickupLocation] = useState('');
  const [partnerPickupPincode, setPartnerPickupPincode] = useState('');
  const [partnerActive, setPartnerActive] = useState(true);

  const openCreatePartnerForm = () => {
    setEditingPartner(null);
    setPartnerName('ShipRocket Default');
    setPartnerType('ShipRocket');
    setPartnerPickupLocation('Primary');
    setPartnerPickupPincode('');
    setPartnerActive(true);
    setIsPartnerFormOpen(true);
  };

  const openEditPartnerForm = (partner: DeliveryPartnerDto) => {
    setEditingPartner(partner);
    setPartnerName(partner.name);
    setPartnerType(partner.type);
    setPartnerPickupLocation(partner.apiConfig?.pickupLocation || '');
    setPartnerPickupPincode(partner.apiConfig?.pickupPincode || '');
    setPartnerActive(partner.active !== false);
    setIsPartnerFormOpen(true);
  };

  const handleSavePartner = () => {
    const payload: DeliveryPartnerDto = {
      name: partnerName,
      type: partnerType,
      active: partnerActive,
      apiConfig: { pickupLocation: partnerPickupLocation, pickupPincode: partnerPickupPincode }
    };

    if (editingPartner?.uid) {
      updatePartner.mutate({ uid: editingPartner.uid, data: payload }, {
        onSuccess: () => setIsPartnerFormOpen(false)
      });
    } else {
      createPartner.mutate(payload, {
        onSuccess: () => setIsPartnerFormOpen(false)
      });
    }
  };

  const togglePartnerStatus = (partner: DeliveryPartnerDto) => {
    if (partner.uid) {
      updatePartner.mutate({ uid: partner.uid, data: { active: !partner.active } });
    }
  };

  if (isLoadingPartners) return <div className="p-8 text-center text-slate-500">Loading carrier integrations...</div>;

  return (
    <div className="space-y-6">
      {/* Delivery profiles are edited on their own page, not here.

          This section used to own a profile editor that stored a single `{ flatRate }` and wrote
          `zones: []` on every save. Once the Delivery Profiles page gained banded rate tables
          (price / state / weight combinations), keeping both was a data-loss path: saving a
          banded profile through this form would have silently emptied its `zones` and replaced
          the whole rate table with one flat fee. One editor per concept, so this one is a link. */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#55349A]" />
            Delivery Profiles
          </h2>
          <p className="text-sm text-slate-500">
            Delivery zones and rate bands now live on their own page, where they can be set by
            price, state or weight.
          </p>
        </div>
        <button
          onClick={() => navigate('/orders/delivery-profiles')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#55349A] hover:bg-[#43297a] text-white text-sm font-semibold rounded-xl transition-all shadow-md shrink-0"
        >
          Open Delivery Profiles
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Carrier Integrations (ShipRocket) */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mt-8">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Link className="h-5 w-5 text-[#55349A]" />
            Carrier Integrations
          </h2>
          <p className="text-sm text-slate-500">Connect ShipRocket or other delivery partners.</p>
        </div>
        <button
          onClick={openCreatePartnerForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-md"
        >
          <Plus className="h-4 w-4" />
          Add Integration
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-4">Integration Name</th>
              <th className="px-6 py-4">Platform</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {partners?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No carrier integrations connected.</td>
              </tr>
            )}
            {partners?.map(partner => (
              <tr key={partner.uid} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{partner.name}</td>
                <td className="px-6 py-4 font-semibold text-[#55349A]">
                  {partner.type}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => togglePartnerStatus(partner)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
                      partner.active ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {partner.active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {partner.active ? 'CONNECTED' : 'DISABLED'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openEditPartnerForm(partner)}
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

      {/* Partner Form Modal */}
      {isPartnerFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingPartner ? 'Edit Integration' : 'New Carrier Integration'}</h3>
              <button onClick={() => setIsPartnerFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Integration Name</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={e => setPartnerName(e.target.value)}
                  placeholder="e.g. My ShipRocket Acc"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Platform Type</label>
                <select
                  value={partnerType}
                  onChange={e => setPartnerType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                >
                  <option value="ShipRocket">ShipRocket</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="Custom">Custom API</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Pickup Location (ShipRocket nickname)</label>
                  <input
                    type="text"
                    value={partnerPickupLocation}
                    onChange={e => setPartnerPickupLocation(e.target.value)}
                    placeholder="e.g. Primary"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Pickup Pincode</label>
                  <input
                    type="text"
                    value={partnerPickupPincode}
                    onChange={e => setPartnerPickupPincode(e.target.value)}
                    placeholder="e.g. 682001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#55349A]/20 focus:border-[#55349A] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsPartnerFormOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePartner}
                disabled={createPartner.isPending || updatePartner.isPending || !partnerName}
                className="px-5 py-2 bg-[#55349A] hover:bg-[#43297a] text-white font-semibold rounded-xl text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {createPartner.isPending || updatePartner.isPending ? 'Saving...' : 'Connect Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
