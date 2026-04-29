import {
  Button,
  Dialog,
  Icon,
} from "@jaldee/design-system";
import { useState } from "react";

type OrdersLogisticsPickupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (date: string) => void;
  isPending?: boolean;
};

export function OrdersLogisticsPickupDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: OrdersLogisticsPickupDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Confirm Pickup Date">
      <div className="space-y-6 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Pickup Date</label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            Select the date you want the courier to pick up the shipment.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isPending}
            onClick={() => onConfirm(date)}
          >
            Confirm Date
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
