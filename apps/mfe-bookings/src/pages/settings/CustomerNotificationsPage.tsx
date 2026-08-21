import { useState } from "react";
import { Bell, Clock, Plus } from "lucide-react";
import { Button, Switch, Select } from "@jaldee/design-system";
import { useNavigate } from "react-router-dom";

type ChannelToggles = {
  sms: boolean;
  email: boolean;
  app: boolean;
  whatsapp: boolean;
};

type ReminderState = {
  hour: string;
  minute: string;
  channels: ChannelToggles;
};

export default function CustomerNotificationsPage() {
  const navigate = useNavigate();

  // Mock State for Event Notifications
  const [confirmation, setConfirmation] = useState<ChannelToggles>({
    sms: true,
    email: true,
    app: true,
    whatsapp: true,
  });

  const [reschedule, setReschedule] = useState<ChannelToggles>({
    sms: true,
    email: true,
    app: false,
    whatsapp: true,
  });

  const [cancellation, setCancellation] = useState<ChannelToggles>({
    sms: true,
    email: true,
    app: true,
    whatsapp: true,
  });

  // Mock State for Reminders
  const [reminders, setReminders] = useState<ReminderState[]>([
    {
      hour: "24",
      minute: "0",
      channels: { sms: true, email: true, app: true, whatsapp: true },
    },
    {
      hour: "8",
      minute: "0",
      channels: { sms: true, email: true, app: true, whatsapp: true },
    },
    {
      hour: "4",
      minute: "0",
      channels: { sms: true, email: true, app: true, whatsapp: true },
    },
    {
      hour: "",
      minute: "",
      channels: { sms: false, email: false, app: false, whatsapp: false },
    },
  ]);

  const updateEventToggle = (
    event: "confirmation" | "reschedule" | "cancellation",
    channel: keyof ChannelToggles,
    value: boolean
  ) => {
    if (event === "confirmation") {
      setConfirmation((prev) => ({ ...prev, [channel]: value }));
    } else if (event === "reschedule") {
      setReschedule((prev) => ({ ...prev, [channel]: value }));
    } else if (event === "cancellation") {
      setCancellation((prev) => ({ ...prev, [channel]: value }));
    }
  };

  const updateReminder = (
    index: number,
    field: "hour" | "minute" | keyof ChannelToggles,
    value: string | boolean
  ) => {
    setReminders((prev) => {
      const next = [...prev];
      if (field === "hour" || field === "minute") {
        next[index] = { ...next[index], [field]: value as string };
      } else {
        next[index] = {
          ...next[index],
          channels: { ...next[index].channels, [field]: value as boolean },
        };
      }
      return next;
    });
  };

  const hourOptions = Array.from({ length: 48 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const minuteOptions = [
    { value: "0", label: "0" },
    { value: "15", label: "15" },
    { value: "30", label: "30" },
    { value: "45", label: "45" },
  ];

  const renderChannelToggles = (
    channels: ChannelToggles,
    onChange: (channel: keyof ChannelToggles, val: boolean) => void
  ) => {
    return (
      <div className="flex flex-wrap items-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={channels.sms}
            onChange={(checked) => onChange("sms", checked)}
          />
          <span className="text-sm font-medium text-slate-700">Via SMS</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={channels.email}
            onChange={(checked) => onChange("email", checked)}
          />
          <span className="text-sm font-medium text-slate-700">Via Email</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={channels.app}
            onChange={(checked) => onChange("app", checked)}
          />
          <span className="text-sm font-medium text-slate-700">Via App</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={channels.whatsapp}
            onChange={(checked) => onChange("whatsapp", checked)}
          />
          <span className="text-sm font-medium text-slate-700">Via WhatsApp</span>
        </div>
      </div>
    );
  };

  return (
    <main className="h-full overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mb-6">
        <div className="text-sm text-slate-500 mb-2 flex gap-1">
          <button onClick={() => navigate("/settings")} className="hover:underline text-slate-600">
            Settings
          </button>
          <span>&gt;</span>
          <span className="text-slate-900 font-medium">Customer Notifications</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Notification Settings</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4 bg-purple-50 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-purple-100 text-purple-700 rounded-lg">
              <Bell size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Appointment Notifications (Only)</h2>
          </div>
          <Button onClick={() => {}} className="bg-purple-700 hover:bg-purple-800 border-none text-white font-medium">
            Save All Settings
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 p-6 items-start">
          <div className="flex flex-col gap-6">
            <div className="p-5 rounded-xl border border-slate-200 bg-white">
              <h3 className="font-bold text-slate-900 text-[17px] mb-1">Confirmation Notifications</h3>
              <p className="text-[13px] text-slate-600 mb-2">Notify patient when they should be notified of their appointment</p>
              <div className="text-[13px] font-medium text-slate-500 mb-1">Channel</div>
              {renderChannelToggles(confirmation, (channel, val) => updateEventToggle("confirmation", channel, val))}
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-white">
              <h3 className="font-bold text-slate-900 text-[17px] mb-1">Reschedule Notifications</h3>
              <p className="text-[13px] text-slate-600">Notify patient when appointment is scheduled</p>
              {renderChannelToggles(reschedule, (channel, val) => updateEventToggle("reschedule", channel, val))}
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-white">
              <h3 className="font-bold text-slate-900 text-[17px] mb-1">Cancellation Notifications</h3>
              <p className="text-[13px] text-slate-600">Notify patient when appointment is cancelled by you</p>
              {renderChannelToggles(cancellation, (channel, val) => updateEventToggle("cancellation", channel, val))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-100">
              <div className="shrink-0 p-2 bg-white rounded-full mt-0.5 shadow-sm border border-slate-200">
                <Clock size={20} className="text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-[17px]">Reminder Notification Functionality</h3>
                <p className="text-[13px] text-slate-600 mt-1">
                  Jaldee allows you to send 4 reminders to your patients before their appointment.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8 ml-2">
              {[
                { title: "First Reminder", subtitle: "Specify when the 1st reminder should be sent to your patient" },
                { title: "Second Reminder", subtitle: "Specify when the 2nd reminder should be sent to your patient" },
                { title: "Third Reminder", subtitle: "Specify when the 3rd reminder should be sent to your patient" },
                { title: "Fourth Reminder", subtitle: "Specify when the 4th reminder should be sent to your patient" },
              ].map((reminder, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <h4 className="font-bold text-slate-900 text-[15px]">{reminder.title}</h4>
                  <p className="text-[13px] text-slate-600">{reminder.subtitle}</p>
                  
                  {idx < 3 ? (
                    <div className="flex flex-wrap items-end gap-x-12 mt-1">
                      <div className="flex gap-4">
                        <Select
                          label="Hour"
                          value={reminders[idx].hour}
                          onChange={(e) => updateReminder(idx, "hour", e.target.value)}
                          options={hourOptions}
                          className="w-20"
                          fullWidth={false}
                        />
                        <Select
                          label="Minute"
                          value={reminders[idx].minute}
                          onChange={(e) => updateReminder(idx, "minute", e.target.value)}
                          options={minuteOptions}
                          className="w-20"
                          fullWidth={false}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mb-2">
                        {renderChannelToggles(reminders[idx].channels, (channel, val) => updateReminder(idx, channel, val))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[13px] font-medium text-slate-700">Time picker</span>
                      <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                        <Plus size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
