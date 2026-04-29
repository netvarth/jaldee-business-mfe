import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  Icon,
  SectionCard,
} from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import { useSharedNavigate } from "../../useSharedNavigate";
import {
  useOrdersLogistics,
  useOrdersLogisticsCount,
  useOrdersTrackOrder,
  useOrdersRequestShipmentPickup,
  useOrdersGenerateManifest,
} from "../queries/orders";
import { SharedOrdersLayout } from "./shared";
import { OrdersTrackOrderDialog } from "./OrdersTrackOrderDialog";
import { OrdersLogisticsPickupDialog } from "./OrdersLogisticsPickupDialog";
import type { LogisticsRow, ShipmentDetails } from "../types";

export function OrdersLogisticsList() {
  const { product, basePath } = useSharedModulesContext();
  const navigate = useSharedNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchName, setSearchName] = useState("");
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<{ row: LogisticsRow; details?: ShipmentDetails } | null>(null);

  const filters = useMemo(() => {
    const f: Record<string, any> = {};
    if (searchName) {
      f["providerConsumerName-like"] = searchName;
    }
    return f;
  }, [searchName]);

  const { data: logistics, isLoading } = useOrdersLogistics(page, pageSize, filters);
  const { data: totalCount } = useOrdersLogisticsCount(filters);
  const trackOrderMutation = useOrdersTrackOrder();
  const pickupMutation = useOrdersRequestShipmentPickup();
  const manifestMutation = useOrdersGenerateManifest();

  const handleTrackOrder = (row: LogisticsRow) => {
    trackOrderMutation.mutate(row.orderEncId, {
      onSuccess: (details) => {
        setSelectedShipment({ row, details });
        setTrackDialogOpen(true);
      },
    });
  };

  const handleRequestPickup = (date: string) => {
    if (!selectedShipment) return;
    pickupMutation.mutate(
      { orderUid: selectedShipment.row.orderEncId, data: { pickupDate: date } },
      {
        onSuccess: () => {
          setPickupDialogOpen(false);
        },
      }
    );
  };

  const handleGenerateManifest = (row: LogisticsRow) => {
    manifestMutation.mutate(row.orderEncId);
  };

  const columns = useMemo(
    () => [
      {
        key: "orderNum",
        header: "Order Uid",
        render: (row: LogisticsRow) => (
          <div className="text-sm font-medium text-slate-900">{row.orderNum}</div>
        ),
      },
      {
        key: "customer",
        header: "Customer Details",
        render: (row: LogisticsRow) => (
          <div className="text-sm text-slate-700">{row.providerConsumerName}</div>
        ),
      },
      {
        key: "products",
        header: "Product Details",
        render: (row: LogisticsRow) => (
          <div className="max-w-xs space-y-1">
            {row.itemList?.map((item, idx) => (
              <div key={idx} className="text-sm font-medium text-slate-700">
                {item.name}
              </div>
            ))}
          </div>
        ),
      },
      {
        key: "package",
        header: "Package Details",
        render: (row: LogisticsRow) => (
          <div className="text-sm space-y-1">
            {row.packageDetails && (
              <>
                <div className="font-bold">Dead Wt : {row.packageDetails.weight} Kg</div>
                <div className="text-slate-500">
                  {row.packageDetails.length} x {row.packageDetails.breadth} x {row.packageDetails.height} (CM)
                </div>
              </>
            )}
          </div>
        ),
      },
      {
        key: "payment",
        header: "Payment",
        render: (row: LogisticsRow) => (
          <div className="text-sm text-slate-700">{row.paymentMethod}</div>
        ),
      },
      {
        key: "location",
        header: "Pick Up Location & Pincode",
        render: (row: LogisticsRow) => (
          <div className="text-sm">
            <div className="text-slate-700">{row.pickupLocation}</div>
            <div className="text-xs text-slate-500">{row.pickupPincode}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: LogisticsRow) => (
          <Badge
            variant={
              row.shipmentStatus === "DELIVERED"
                ? "success"
                : row.shipmentStatus === "CANCELLED"
                ? "danger"
                : "secondary"
            }
          >
            {row.orderStatus}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row: LogisticsRow) => {
          const isTracking = trackOrderMutation.isPending && selectedShipment?.row.orderNum === row.orderNum;
          const isManifesting = manifestMutation.isPending && selectedShipment?.row.orderNum === row.orderNum;

          return (
            <div className="flex flex-wrap items-center gap-2">
              {row.shipmentStatus === "ORDER_CREATED" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`${basePath}/orders/logistics/courier?id=${row.orderEncId}&shipmentUid=${row.shipmentId}`)}
                >
                  Select Courier
                </Button>
              )}

              {row.shipmentStatus === "AWB_ASSIGNED" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedShipment({ row });
                    setPickupDialogOpen(true);
                  }}
                >
                  Request Pickup
                </Button>
              )}

              {!row.confirmPickup && (row.shipmentStatus === "PICKUP_QUEUED" || row.shipmentStatus === "PICKUP_SCHEDULED_GENERATED") && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isManifesting}
                  onClick={() => {
                    setSelectedShipment({ row });
                    handleGenerateManifest(row);
                  }}
                >
                  Confirm Pickup
                </Button>
              )}

              {row.confirmPickup && (row.shipmentStatus !== "DELIVERED" && row.shipmentStatus !== "CANCELLED") && (
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isTracking}
                  onClick={() => handleTrackOrder(row)}
                  title="Track Shipment"
                >
                  <Icon name="refresh" className="h-4 w-4" />
                  <span className="ml-2">Track Order</span>
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [basePath, navigate, trackOrderMutation.isPending, manifestMutation.isPending, selectedShipment]
  );

  return (
    <SharedOrdersLayout
      title={`My logistics ${totalCount ? `(${totalCount})` : ""}`}
      subtitle="Courier and shipment configuration."
    >
      <div className="space-y-6">
        <SectionCard>
          <div className="mb-4">
             <input
                type="text"
                placeholder="Search with customer name..."
                className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={searchName}
                onChange={(e) => {
                    setSearchName(e.target.value);
                    setPage(1);
                }}
             />
          </div>

          <DataTable
            columns={columns}
            data={logistics ?? []}
            isLoading={isLoading}
            pagination={{
              page,
              pageSize,
              total: totalCount ?? 0,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
          />
        </SectionCard>

        <OrdersTrackOrderDialog
          open={trackDialogOpen}
          onOpenChange={setTrackDialogOpen}
          shipmentDetails={selectedShipment?.details}
          orderNum={selectedShipment?.row.orderNum}
          price={selectedShipment?.row.totalAmount}
          date={selectedShipment?.row.createdDate}
        />

        <OrdersLogisticsPickupDialog
          open={pickupDialogOpen}
          onOpenChange={setPickupDialogOpen}
          isPending={pickupMutation.isPending}
          onConfirm={handleRequestPickup}
        />
      </div>
    </SharedOrdersLayout>
  );
}
