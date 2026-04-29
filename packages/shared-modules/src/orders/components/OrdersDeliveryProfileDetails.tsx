import { useParams } from "react-router-dom";
import {
  Badge,
  Icon,
  PageHeader,
  SectionCard,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useOrdersDeliveryProfileDetails } from "../queries/orders";
import {
  buildOrdersDeliveryProfileEditHref,
  buildOrdersDeliveryProfileHref,
} from "../services/orders";
import { SharedOrdersLayout } from "./shared";

export function OrdersDeliveryProfileDetails() {
  const { id } = useParams<{ id: string }>();
  const { basePath, product } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  const { data: details, isLoading } = useOrdersDeliveryProfileDetails(id);

  if (isLoading) {
    return (
      <SharedOrdersLayout>
        <div className="flex h-64 items-center justify-center">Loading...</div>
      </SharedOrdersLayout>
    );
  }

  if (!details) {
    return (
      <SharedOrdersLayout>
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-slate-500">Profile not found.</p>
          <button
            className="text-indigo-600 hover:underline"
            onClick={() => navigate(buildOrdersDeliveryProfileHref(basePath))}
          >
            Back to list
          </button>
        </div>
      </SharedOrdersLayout>
    );
  }

  return (
    <SharedOrdersLayout
      title={details.name}
      subtitle="View delivery profile configuration."
      backHref={buildOrdersDeliveryProfileHref(basePath)}
      actions={
        <button
          className="flex items-center gap-2 rounded-md bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
          onClick={() => navigate(buildOrdersDeliveryProfileEditHref(basePath, details.encId, product))}
        >
          <Icon name="edit" className="h-4 w-4" />
          Edit Profile
        </button>
      }
    >
      <div className="space-y-6">
        <SectionCard className="border-slate-200 shadow-sm" title="General Status">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">Current Status:</span>
            <Badge variant={details.status === "Active" ? "success" : "secondary"}>
              {details.status}
            </Badge>
          </div>
        </SectionCard>

        <SectionCard title="Pricing Rules">
          <div className="overflow-hidden rounded-lg border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Min Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Max Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Delivery Fee
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {details.priceRange.map((range, index) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                      {range.min}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                      {range.max}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">
                      {range.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </SharedOrdersLayout>
  );
}
