import { Clock } from "lucide-react";
import { useShifts } from "../../services/useSettingsData";
import { CrudPanel } from "./SettingsComponents";

export function ShiftsSettingsPage() {
  const shifts = useShifts();
  return <CrudPanel title="Shifts" subtitle="Working hours & weekly off" icon={<Clock size={20} />} addLabel="Add Shift" hook={shifts} automationScope="hr-settings-shifts" statusToggle={{ isEnabled: (row) => String(row.status || "Enabled").toLowerCase() !== "disabled", onChange: shifts.setStatus }} fields={[
    { key: "name", label: "Shift Name" },
    { key: "startTime", label: "Start Time", type: "time", serialize: "time12", is12Hour: true },
    { key: "endTime", label: "End Time", type: "time", serialize: "time12", is12Hour: true },
    { key: "graceMinutes", label: "Grace (min)", type: "number" }, { key: "halfDayThresholdMinutes", label: "Half-Day Threshold (min)", type: "number" },
    { key: "breakMinutes", sourceKey: "break_minutes", label: "Break Minutes", type: "number", defaultValue: 0 },
    { key: "weeklyOffDays", label: "Weekly Off", type: "multiselect", options: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"], full: true },
  ]} columns={[
    { label: "Name", render: (row) => <b>{row.name as string}</b> },
    { label: "Timing", render: (row) => `${(row.startTime as string) || "—"} – ${(row.endTime as string) || "—"}` },
    { label: "Grace", render: (row) => row.graceMinutes != null ? `${row.graceMinutes}m` : "—" },
    { label: "Break", render: (row) => row.break_minutes != null || row.breakMinutes != null ? `${row.break_minutes ?? row.breakMinutes}m` : "—" },
    { label: "Weekly Off", render: (row) => Array.isArray(row.weeklyOffDays) ? row.weeklyOffDays.join(", ") : (row.weeklyOffDays as string) || "—" },
  ]} />;
}
