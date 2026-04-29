import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Button,
  Icon,
  PageHeader,
  SectionCard,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import {
  useCreateOrdersDeliveryProfile,
  useOrdersDeliveryProfileDetails,
  useUpdateOrdersDeliveryProfile,
} from "../queries/orders";
import { buildOrdersDeliveryProfileHref } from "../services/orders";
import { SharedOrdersLayout } from "./shared";

interface PriceRangeRow {
  min: number;
  max: number;
  amount: string;
}

export function OrdersDeliveryProfileCreate() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { basePath, product } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  const [name, setName] = useState("");
  const [priceRanges, setPriceRanges] = useState<PriceRangeRow[]>([{ min: 0, max: 0, amount: "" }]);

  const { data: details, isLoading: detailsLoading } = useOrdersDeliveryProfileDetails(id);
  const createMutation = useCreateOrdersDeliveryProfile();
  const updateMutation = useUpdateOrdersDeliveryProfile(id ?? "");

  useEffect(() => {
    if (details) {
      setName(details.name);
      setPriceRanges(details.priceRange.length > 0 ? details.priceRange : [{ min: 0, max: 0, amount: "" }]);
    }
  }, [details]);

  const addRow = () => {
    setPriceRanges([...priceRanges, { min: 0, max: 0, amount: "" }]);
  };

  const removeRow = (index: number) => {
    setPriceRanges(priceRanges.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof PriceRangeRow, value: string | number) => {
    const newRanges = [...priceRanges];
    newRanges[index] = { ...newRanges[index], [field]: value };
    setPriceRanges(newRanges);
  };

  const handleSubmit = () => {
    const payload = {
      name,
      deliveryPolicyEnum: "priceRange",
      priceRange: priceRanges.map((r) => ({
        min: Number(r.min),
        max: Number(r.max),
        amount: String(r.amount),
      })),
    };

    if (isEdit) {
      updateMutation.mutate(payload, {
        onSuccess: () => navigate(buildOrdersDeliveryProfileHref(basePath)),
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => navigate(buildOrdersDeliveryProfileHref(basePath)),
      });
    }
  };

  if (isEdit && detailsLoading) {
    return (
      <SharedOrdersLayout>
        <div className="flex h-64 items-center justify-center">Loading...</div>
      </SharedOrdersLayout>
    );
  }

  return (
    <SharedOrdersLayout
      title={isEdit ? "Edit Delivery Profile" : "Create New Delivery Profile"}
      subtitle="Manage Your Delivery profiles here.."
      backHref={buildOrdersDeliveryProfileHref(basePath)}
    >
      <div className="space-y-6">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[15px] font-semibold text-slate-700">Name</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Delivery Profile 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[15px] font-semibold text-slate-700">Price Range</label>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="divide-x divide-slate-200">
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-900">
                        Minimum Amount (₹)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-900">
                        Maximum Amount (₹)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-slate-900">
                        Delivery Charge (₹)
                      </th>
                      <th className="w-12 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {priceRanges.map((range, index) => (
                      <tr key={index} className="divide-x divide-slate-200">
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-full rounded border-none bg-transparent px-2 py-1 text-sm focus:ring-0 focus:outline-none"
                            value={range.min}
                            onChange={(e) => updateRow(index, "min", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-full rounded border-none bg-transparent px-2 py-1 text-sm focus:ring-0 focus:outline-none"
                            value={range.max}
                            onChange={(e) => updateRow(index, "max", Number(e.target.value))}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className="w-full rounded border-none bg-transparent px-2 py-1 text-sm focus:ring-0 focus:outline-none"
                            placeholder="0"
                            value={range.amount}
                            onChange={(e) => updateRow(index, "amount", e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-center">
                          {priceRanges.length > 1 && (
                            <button
                              className="text-indigo-600 hover:text-indigo-800"
                              onClick={() => removeRow(index)}
                            >
                              <Icon name="x" className="h-5 w-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="bg-white p-3 text-center">
                        <button
                          type="button"
                          onClick={addRow}
                          className="inline-flex items-center rounded-lg border border-[#5B49D6] px-4 py-1.5 text-sm font-semibold text-[#5B49D6] transition-colors hover:bg-indigo-50"
                        >
                          + Add Price Range
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(buildOrdersDeliveryProfileHref(basePath))}
                className="rounded-lg bg-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!name || createMutation.isPending || updateMutation.isPending}
                className="rounded-lg bg-[#1E0E69] px-8 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : isEdit
                  ? "Update"
                  : "Create"}
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </SharedOrdersLayout>
  );
}
