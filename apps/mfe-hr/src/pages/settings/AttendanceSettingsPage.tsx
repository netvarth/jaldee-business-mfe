import { Fingerprint } from "lucide-react";
import { useAttendanceRules } from "../../services/useSettingsData";
import { CLOCK_TYPE_OPTIONS } from "../../types";
import { ConfigForm } from "./SettingsComponents";

export function AttendanceSettingsPage() {
  const rules = useAttendanceRules();
  return <ConfigForm title="Attendance Rules" subtitle="Work hours, thresholds & verification" icon={<Fingerprint size={20} />} data={rules.data} loading={rules.loading} error={rules.error} onSave={rules.save} automationScope="hr-settings-attendance" fields={[
    { key: "workHoursPerDay", label: "Work Hours / Day", type: "number" }, { key: "fullDayThresholdHours", label: "Full-Day Threshold (hrs)", type: "number" },
    { key: "shiftStartTime", label: "Default Shift Start", type: "time" }, { key: "graceMinutes", label: "Grace Period (min)", type: "number" },
    { key: "lateThresholdMinutes", label: "Late Threshold (min)", type: "number" }, { key: "halfDayThresholdMinutes", label: "Half-Day Threshold (min)", type: "number" },
    { key: "geofenceRadiusMeters", label: "Geofence Radius (m)", type: "number" }, { key: "autoClockOutMinutes", label: "Auto Clock-Out (min)", type: "number" },
    { key: "allowedWorkModes", label: "Allowed Work Modes", type: "multiselect", options: CLOCK_TYPE_OPTIONS },
    { key: "faceRecognitionRequired", label: "Require Face Recognition for Clock-In", type: "checkbox", full: true },
  ]} />;
}
