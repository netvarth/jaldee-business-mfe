import {
  Button,
  Dialog,
  Icon,
} from "@jaldee/design-system";
import { useState } from "react";
import type { ShipmentDetails } from "../types";

type OrdersTrackOrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentDetails?: ShipmentDetails;
  orderNum?: string;
  price?: string | number;
  date?: string;
};

export function OrdersTrackOrderDialog({
  open,
  onOpenChange,
  shipmentDetails,
  orderNum,
  price,
  date,
}: OrdersTrackOrderDialogProps) {
  const [showActivities, setShowActivities] = useState(false);
  
  const shipmentTrack = shipmentDetails?.tracking_data?.shipment_track?.[0];
  const activities = shipmentTrack?.activities || [];
  const currentStatus = shipmentTrack?.current_status || "N/A";
  const eta = shipmentTrack?.delivered_date || "29 Apr 2026 at 11.43 AM";

  // Determine stepper completion based on current status or activities
  const isDelivered = currentStatus.toUpperCase() === "DELIVERED";
  const isTransit = isDelivered || currentStatus.toUpperCase().includes("TRANSIT") || currentStatus.toUpperCase().includes("PICKED UP");
  const isPackaging = isTransit || currentStatus.toUpperCase().includes("MANIFEST") || currentStatus.toUpperCase().includes("AWB");

  const steps = [
    { label: "Order Placed", icon: "clipboardList" as const, completed: true },
    { label: "Packaging", icon: "package" as const, completed: isPackaging },
    { label: "On The Road", icon: "truck" as const, completed: isTransit },
    { label: "Delivered", icon: "clipboardCheck" as const, completed: isDelivered },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Order Status">
      <div className="space-y-6 py-2">
        {/* Summary Card */}
        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-800">{orderNum}</h3>
              <p className="text-sm text-slate-500">
                Order Placed In, {date || "N/A"}
              </p>
            </div>
            <div className="text-lg font-bold text-slate-500">
              ₹{price || "0"}
            </div>
          </div>
        </div>

        {/* Arrival Info */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-600">
            Order expected arrival : <span className="font-bold text-slate-800">{eta}</span>
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Current Status : <span className="font-bold text-slate-800">{currentStatus}</span>
            </p>
            <Icon name="refresh" className="h-4 w-4 cursor-pointer text-slate-900" />
          </div>
        </div>

        {/* Stepper */}
        <div className="relative flex justify-between py-8 px-2">
           {/* Progress Line */}
          <div className="absolute left-8 top-11 h-0.5 w-[calc(100%-64px)] bg-slate-200" />
          <div 
            className="absolute left-8 top-11 h-0.5 bg-emerald-600 transition-all duration-500" 
            style={{ width: `calc((100% - 64px) * ${isDelivered ? 1 : isTransit ? 0.66 : isPackaging ? 0.33 : 0})` }}
          />
          
          {steps.map((step, index) => (
            <div key={index} className="relative z-10 flex flex-col items-center gap-3">
              <div 
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white transition-colors duration-500 ${
                  step.completed ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-transparent"
                }`}
              >
                {step.completed && <Icon name="check" className="h-3 w-3" />}
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border bg-white ${step.completed ? "border-emerald-500 text-emerald-600" : "border-amber-200 text-amber-600"}`}>
                <Icon name={step.icon} className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-slate-700">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Activity Details (Toggled by Show More) */}
        {showActivities && (
          <div className="max-h-[300px] overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/30 p-4">
            <h4 className="mb-4 text-sm font-bold text-slate-900">Tracking History</h4>
            {activities.length === 0 ? (
               <p className="text-center text-sm text-slate-500">No activity logs found.</p>
            ) : (
              <div className="relative space-y-6 before:absolute before:left-[7px] before:top-1.5 before:h-[calc(100%-8px)] before:w-0.5 before:bg-slate-200">
                {activities.map((activity, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-slate-400 shadow-sm" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-800">{activity.status}</p>
                      <p className="text-xs text-slate-600">{activity.activity}</p>
                      <p className="text-[10px] text-slate-400">{activity.date} {activity.location && `• ${activity.location}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button 
            variant="primary" 
            className="flex-[2] bg-indigo-800 hover:bg-indigo-900"
            onClick={() => setShowActivities(!showActivities)}
          >
            {showActivities ? "Hide Details" : "Show More"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
