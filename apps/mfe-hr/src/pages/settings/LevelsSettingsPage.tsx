import { Layers } from "lucide-react";
import { useHierarchyLevels } from "../../services/useOrg";
import { CrudPanel } from "./SettingsComponents";

export function LevelsSettingsPage() {
  const levels = useHierarchyLevels();
  return (
    <CrudPanel
      title="Seniority Bands (Levels)"
      subtitle="Bands and levels for hierarchy and approvals"
      icon={<Layers size={20} />}
      addLabel="Add Level"
      hook={levels}
      automationScope="hr-settings-levels"
      fields={[
        { key: "levelNo", label: "Level Number", type: "number" },
        { key: "label", label: "Label" },
      ]}
      columns={[
        { label: "Level", render: (row) => <b>L{row.levelNo as string}</b> },
        { label: "Label", render: (row) => (row.label as string) || "—" },
      ]}
    />
  );
}
