import { useLeaveTypes } from "../../services/useSettingsData";
import { LeavePolicyAssignmentDashboard } from "./LeavePolicyAssignmentDashboard";

export function LeavePolicySettingsPage() {
  return <LeavePolicyAssignmentDashboard leaveTypes={useLeaveTypes()} />;
}
