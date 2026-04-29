import { useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Icon,
  SectionCard,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import {
  useOrdersAvailableCouriers,
  useOrdersCreateAwb,
} from "../queries/orders";
import { SharedOrdersLayout } from "./shared";

export function OrdersCourierList() {
  const [searchParams] = useSearchParams();
  const orderUid = searchParams.get("id") || "";
  const { basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();

  const { data: couriers, isLoading } = useOrdersAvailableCouriers(orderUid);
  const createAwbMutation = useOrdersCreateAwb();

  const handleSelectCourier = (courierId: number) => {
    createAwbMutation.mutate(
      { orderUid, courierId },
      {
        onSuccess: () => {
          navigate(`${basePath}/orders/logistics`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SharedOrdersLayout title="Select Courier" subtitle="Choose a courier partner for this shipment.">
        <div className="flex h-64 items-center justify-center">Loading couriers...</div>
      </SharedOrdersLayout>
    );
  }

  return (
    <SharedOrdersLayout
      title="Select Courier"
      subtitle="Choose a courier partner for this shipment."
      backHref={`${basePath}/orders/logistics`}
    >
      <div className="space-y-4">
        {couriers?.length === 0 ? (
          <SectionCard>
            <div className="py-12 text-center text-slate-500">
              No couriers available for this order.
            </div>
          </SectionCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {couriers?.map((courier) => (
              <SectionCard key={courier.courier_company_id} className="border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900">{courier.courier_name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100">
                          <Icon name="star" className="mr-1 h-3 w-3 fill-current" />
                          {courier.rating}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Rate:</span>
                      <span className="font-semibold text-slate-900">₹{courier.rate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Delivery:</span>
                      <span className="text-slate-700">{courier.estimated_delivery_days} days</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={createAwbMutation.isPending}
                    onClick={() => handleSelectCourier(courier.courier_company_id)}
                  >
                    {createAwbMutation.isPending ? "Assigning..." : "Assign Courier"}
                  </Button>
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </SharedOrdersLayout>
  );
}
