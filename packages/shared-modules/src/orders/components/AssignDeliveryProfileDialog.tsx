import { useState } from "react";
import {
  Button,
  Dialog,
  DialogFooter,
  Select,
} from "@jaldee/design-system";
import { useOrdersDeliveryProfileStores, useAssignOrdersDeliveryProfile } from "../queries/orders";

interface AssignDeliveryProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileEncId: string | null;
  profileName: string | null;
}

const DELIVERY_TYPES = [
  { value: "STORE_PICKUP", label: "Store Pickup" },
  { value: "HOME_DELIVERY", label: "Home Delivery" },
];

export function AssignDeliveryProfileDialog({
  open,
  onOpenChange,
  profileEncId,
  profileName,
}: AssignDeliveryProfileDialogProps) {
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const { data: stores, isLoading: storesLoading } = useOrdersDeliveryProfileStores({ enabled: open });
  const assignMutation = useAssignOrdersDeliveryProfile();

  const handleAssign = () => {
    if (!profileEncId || !selectedStore || !selectedType) return;

    assignMutation.mutate(
      {
        storeEncId: selectedStore,
        deliveryType: selectedType,
        deliveryProfileConfigDto: { encId: profileEncId },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedStore("");
          setSelectedType("");
        },
      }
    );
  };

  const storeOptions = (stores ?? []).map((s) => ({
    value: s.encId,
    label: s.name,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assign Delivery Profile"
      description={`Assign "${profileName}" to a store and delivery type.`}
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Select Store</label>
          <Select
            placeholder="Choose a store..."
            options={storeOptions}
            value={selectedStore}
            onValueChange={setSelectedStore}
            disabled={storesLoading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Delivery Type</label>
          <Select
            placeholder="Choose type..."
            options={DELIVERY_TYPES}
            value={selectedType}
            onValueChange={setSelectedType}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAssign}
          disabled={!selectedStore || !selectedType || assignMutation.isPending}
        >
          {assignMutation.isPending ? "Assigning..." : "Assign"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
