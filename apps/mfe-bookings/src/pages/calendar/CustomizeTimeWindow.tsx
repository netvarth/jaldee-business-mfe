import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { PageHeader, Button, Input, Switch, FormSection, Alert } from "@jaldee/design-system";
import { useCalendars } from "../../services/useCalendars";
import { useToast } from "../../contexts/ToastContext";

export default function CustomizeTimeWindow() {
  const { calendarUid, scheduleUid, timeWindowUid } = useParams<{ calendarUid: string, scheduleUid: string, timeWindowUid: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { calendars } = useCalendars();

  const calendar = location.state?.calendar || calendars.find(c => c.uid === calendarUid);
  const schedule = location.state?.schedule || calendar?.schedules?.find((s: any) => s.uid === scheduleUid);
  const timeWindow = location.state?.timeWindow || schedule?.timeWindows?.find((tw: any) => tw.uid === timeWindowUid);

  const [saving, setSaving] = useState(false);
  
  // Customization state
  const [capacityOverride, setCapacityOverride] = useState<number | "">(timeWindow?.slotCapacity || "");
  const [durationOverride, setDurationOverride] = useState<number | "">(timeWindow?.slotDuration || "");
  
  // Pricing state
  const [enablePricing, setEnablePricing] = useState(false);
  const [price, setPrice] = useState<number | "">("");
  const [prepaymentRequired, setPrepaymentRequired] = useState(false);
  const [prepaymentAmount, setPrepaymentAmount] = useState<number | "">("");

  if (!timeWindow) {
    return (
      <div className="p-6">
        <PageHeader title="Time Window Not Found" back={{ label: "Back to Calendar", href: `/calendars/${calendarUid}/details` }} onNavigate={() => navigate(`/calendars/${calendarUid}/details`)} />
        <p className="text-slate-500 mt-4">The requested time window could not be found.</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call to save customizations
    setTimeout(() => {
      setSaving(false);
      showToast("Time window customizations saved successfully", "success");
      navigate(`/calendars/${calendarUid}/details`);
    }, 600);
  };

  return (
    <div className="p-4 md:p-6 h-full max-w-4xl mx-auto flex flex-col gap-6">
      <PageHeader
        title={`Customize: ${timeWindow.startTime} - ${timeWindow.endTime}`}
        subtitle={`Schedule: ${schedule?.name} • Calendar: ${calendar?.name}`}
        back={{ label: "Back to Calendar", href: `/calendars/${calendarUid}/details` }}
        onNavigate={() => navigate(`/calendars/${calendarUid}/details`)}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => navigate(`/calendars/${calendarUid}/details`)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Customization"}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <FormSection title="Overrides">
            <Alert variant="info" title="What are Overrides?">
              These settings will override the defaults defined at the calendar and schedule level, but only for this specific time window.
            </Alert>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Input 
                label="Slot Capacity Override" 
                type="number" 
                min={1} 
                value={capacityOverride} 
                onChange={(e) => setCapacityOverride(Number(e.target.value) || "")} 
                placeholder="e.g. 5"
              />
              <Input 
                label="Slot Duration Override (mins)" 
                type="number" 
                min={5} 
                value={durationOverride} 
                onChange={(e) => setDurationOverride(Number(e.target.value) || "")} 
                placeholder="e.g. 15"
              />
            </div>
          </FormSection>

          <FormSection title="Special Pricing & Payments">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div>
                <h4 className="font-medium text-slate-800 text-sm">Enable Custom Pricing</h4>
                <p className="text-xs text-slate-500">Override the service pricing for bookings made in this time window.</p>
              </div>
              <Switch checked={enablePricing} onChange={setEnablePricing} />
            </div>

            {enablePricing && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <Input 
                  label="Override Price Amount" 
                  type="number" 
                  min={0} 
                  value={price} 
                  onChange={(e) => setPrice(Number(e.target.value))} 
                  prefix="₹"
                  placeholder="0.00"
                />
                
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-800 text-sm">Require Advance Payment</h4>
                      <p className="text-xs text-slate-500">Force customers to pay an advance to confirm.</p>
                    </div>
                    <Switch checked={prepaymentRequired} onChange={setPrepaymentRequired} />
                  </div>
                  
                  {prepaymentRequired && (
                    <Input 
                      label="Advance Amount" 
                      type="number" 
                      min={1} 
                      value={prepaymentAmount} 
                      onChange={(e) => setPrepaymentAmount(Number(e.target.value))} 
                      prefix="₹"
                      placeholder="Amount"
                    />
                  )}
                </div>
              </div>
            )}
          </FormSection>
        </div>

        <div className="md:col-span-1">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 pb-2 border-b border-slate-200">Time Window Info</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Days</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {timeWindow.weekDays.map((d: number) => (
                    <span key={d} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Time</p>
                <p className="text-sm font-medium text-slate-800">{timeWindow.startTime} - {timeWindow.endTime}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Channel</p>
                <p className="text-sm font-medium text-slate-800 capitalize">{timeWindow.channel.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Default Duration</p>
                <p className="text-sm font-medium text-slate-800">{timeWindow.slotDuration} mins</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
