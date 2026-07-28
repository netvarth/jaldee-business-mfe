import { useState } from "react";
import { Wallet, Layers, Plus, Pencil, Trash2, Save, Loader2, LayoutGrid, Table as TableIcon, ToggleLeft, ToggleRight } from "lucide-react";
import { Button, Input, Select, Dialog } from "@jaldee/design-system";
import { usePayrollSettings } from "../../services/useSettingsData";
import {
  usePayrollStructures,
  usePayrollComponents,
  type PayrollStructure,
  type StructureComponentMapping,
  type CalculationType,
} from "../../services/usePayrollData";
import { ConfigForm, PanelHeader } from "./SettingsComponents";

export function PayrollSettingsPage() {
  const [tab, setTab] = useState<"general" | "structures">("general");
  const payroll = usePayrollSettings();

  return (
    <div className="space-y-6">
      {/* Sub-nav Tabs */}
      <div className="flex gap-6 border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          type="button"
          onClick={() => setTab("general")}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            tab === "general"
              ? "border-teal-700 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          General &amp; Statutory Rules
        </button>
        <button
          type="button"
          onClick={() => setTab("structures")}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            tab === "structures"
              ? "border-teal-700 text-teal-700"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Salary Structures &amp; Mapped Components
        </button>
      </div>

      {tab === "general" ? (
        <ConfigForm
          title="Payroll Settings"
          subtitle="Pay cycle, statutory rates &amp; deductions"
          icon={<Wallet size={20} />}
          data={payroll.data}
          loading={payroll.loading}
          error={payroll.error}
          onSave={payroll.save}
          automationScope="hr-settings-payroll"
          fields={[
            { key: "payCycle", label: "Pay Cycle", type: "select", options: ["Monthly", "Bi-Weekly", "Weekly"] },
            { key: "payDay", label: "Pay Day (day of month)", type: "number" },
            { key: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR", "GBP", "AED"] },
            { key: "professionalTax", label: "Professional Tax (₹)", type: "number" },
            { key: "pfRate", label: "PF Rate (%)", type: "number" },
            { key: "esiRate", label: "ESI Rate (%)", type: "number" },
            { key: "pfEnabled", label: "Provident Fund (PF) Enabled", type: "checkbox" },
            { key: "esiEnabled", label: "ESI Enabled", type: "checkbox" },
            { key: "tdsEnabled", label: "TDS Deduction Enabled", type: "checkbox" },
          ]}
        />
      ) : (
        <SalaryStructuresManager />
      )}
    </div>
  );
}

function SalaryStructuresManager() {
  const structuresHook = usePayrollStructures();
  const componentsHook = usePayrollComponents();

  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<PayrollStructure | null>(null);
  const [structureName, setStructureName] = useState("");
  const [structureCode, setStructureCode] = useState("");
  const [description, setDescription] = useState("");
  const [savingStructure, setSavingStructure] = useState(false);

  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [targetStructure, setTargetStructure] = useState<PayrollStructure | null>(null);
  const [editingMapping, setEditingMapping] = useState<StructureComponentMapping | null>(null);
  const [selectedCompUid, setSelectedCompUid] = useState("");
  const [calcType, setCalcType] = useState<CalculationType>("FIXED_AMOUNT");
  const [defaultAmount, setDefaultAmount] = useState(0);
  const [defaultPercentage, setDefaultPercentage] = useState(0);
  const [savingMapping, setSavingMapping] = useState(false);

  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const openCreateStructure = () => {
    setEditingStructure(null);
    setStructureName("");
    setStructureCode("");
    setDescription("");
    setStructureModalOpen(true);
  };

  const openEditStructure = (s: PayrollStructure) => {
    setEditingStructure(s);
    setStructureName(s.structureName || "");
    setStructureCode(s.structureCode || "");
    setDescription(s.description || "");
    setStructureModalOpen(true);
  };

  const saveStructure = async () => {
    if (!structureName.trim()) return;
    setSavingStructure(true);
    try {
      await structuresHook.save(
        {
          structureName: structureName.trim(),
          structureCode: structureCode.trim() || structureName.trim().toUpperCase().replace(/\s+/g, "_"),
          description: description.trim(),
        },
        editingStructure?.uid || editingStructure?.id
      );
      setStructureModalOpen(false);
    } catch (e) {
      console.error("Failed to save structure", e);
    } finally {
      setSavingStructure(false);
    }
  };

  const deleteStructure = async (s: PayrollStructure) => {
    const sUid = s.uid || s.id;
    if (!sUid) return;
    if (confirm(`Are you sure you want to delete structure "${s.structureName}"?`)) {
      try {
        await structuresHook.remove(sUid);
      } catch (e) {
        console.error("Failed to delete structure", e);
      }
    }
  };

  const openMapComponent = (s: PayrollStructure, m?: StructureComponentMapping) => {
    setTargetStructure(s);
    setEditingMapping(m || null);
    setSelectedCompUid(m?.componentUid || m?.payrollComponentUid || (componentsHook.data[0]?.uid || componentsHook.data[0]?.id || ""));
    setCalcType(m?.calculationType || "FIXED_AMOUNT");
    setDefaultAmount(m?.defaultAmount ?? 0);
    setDefaultPercentage(m?.defaultPercentage ?? 0);
    setMapModalOpen(true);
  };

  const saveMappedComponent = async () => {
    if (!targetStructure) return;
    const sUid = targetStructure.uid || targetStructure.id;
    if (!sUid) return;
    setSavingMapping(true);
    try {
      await structuresHook.addComponent(sUid, {
        uid: editingMapping?.uid || editingMapping?.id,
        componentUid: selectedCompUid,
        payrollComponentUid: selectedCompUid,
        calculationType: calcType,
        defaultAmount,
        defaultPercentage,
      });
      setMapModalOpen(false);
    } catch (e) {
      console.error("Failed to map component", e);
    } finally {
      setSavingMapping(false);
    }
  };

  const removeMappedComponent = async (s: PayrollStructure, m: StructureComponentMapping) => {
    const sUid = s.uid || s.id;
    const mUid = m.uid || m.id;
    if (!sUid || !mUid) return;
    if (confirm(`Remove mapped component "${m.componentName || m.componentCode || "component"}" from ${s.structureName}?`)) {
      try {
        await structuresHook.removeComponent(sUid, mUid);
      } catch (e) {
        console.error("Failed to remove mapped component", e);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PanelHeader
        title="Salary Structures"
        subtitle="Define salary packages and map default earning &amp; deduction components"
        icon={<Layers size={20} />}
        action={
          <div className="flex items-center justify-end gap-2 shrink-0 ml-auto">
            <Button variant="primary" icon={<Plus size={16} />} onClick={openCreateStructure}>
              + Add Structure
            </Button>
            <div className="flex items-center rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-[rgba(17,94,89,0.12)] text-[#115e59]" : "text-slate-500 hover:text-slate-700"}`}
                title="Table View"
                aria-label="Table View"
              >
                <TableIcon size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "card" ? "bg-[rgba(17,94,89,0.12)] text-[#115e59]" : "text-slate-500 hover:text-slate-700"}`}
                title="Card View"
                aria-label="Card View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        }
      />

      {structuresHook.loading ? (
        <div className="p-8 text-center text-sm text-gray-500">Loading structures…</div>
      ) : structuresHook.data.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl">
          No salary structures defined yet. Click "+ Add Structure" to create one.
        </div>
      ) : (
        <div className="space-y-6">
          {structuresHook.data.map((structure) => {
            const mappedList = structure.components || [];
            return (
              <div key={structure.id} className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-gray-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-base">{structure.structureName}</h3>
                      <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">{structure.structureCode}</span>
                    </div>
                    {structure.description && <p className="text-xs text-gray-500 mt-0.5">{structure.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openMapComponent(structure)}>
                      + Map Component
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditStructure(structure)} title="Edit Structure">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteStructure(structure)} title="Delete Structure" className="text-rose-600 hover:text-rose-700">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Mapped Components inside Structure */}
                <div className="p-4 sm:p-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Mapped Structure Components ({mappedList.length})
                  </div>
                  {mappedList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      No components mapped to this structure. Click "+ Map Component" to attach earnings or deductions.
                    </div>
                  ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[350px] w-full border border-gray-100 rounded-lg">
                      <table className="w-full text-xs min-w-[500px]">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100 bg-gray-50/80">
                            <th className="text-left px-4 py-2.5 font-semibold">Component</th>
                            <th className="text-left px-3 py-2.5 font-semibold">Calc Type</th>
                            <th className="text-right px-3 py-2.5 font-semibold">Default Amount</th>
                            <th className="text-right px-3 py-2.5 font-semibold">Default %</th>
                            <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mappedList.map((m) => (
                            <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-gray-900">
                                {m.componentName || m.componentCode || "Component"}
                              </td>
                              <td className="px-3 py-2.5 text-gray-600">{m.calculationType || "FIXED_AMOUNT"}</td>
                              <td className="px-3 py-2.5 text-right text-gray-900 font-medium">
                                {m.defaultAmount != null ? `₹${m.defaultAmount.toLocaleString()}` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right text-gray-700">
                                {m.defaultPercentage != null ? `${m.defaultPercentage}%` : "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openMapComponent(structure, m)}
                                  className="p-1 text-gray-500 hover:text-teal-700 transition-colors mr-1"
                                  title="Edit Mapped Component"
                                >
                                  <Pencil size={14} />
                                </button>
                                {(() => {
                                  const isEnabled = String(m.status || "Enabled").toLowerCase() !== "disabled";
                                  const nextStatus = isEnabled ? "Disabled" : "Enabled";
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const sUid = structure.uid || structure.id;
                                        const mUid = m.uid || m.id;
                                        if (sUid && mUid) {
                                          structuresHook.toggleComponentStatus(sUid, mUid, nextStatus);
                                        }
                                      }}
                                      className={`p-1 transition-colors ${isEnabled ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-slate-600"}`}
                                      title={isEnabled ? "Disable Component" : "Enable Component"}
                                      aria-label={isEnabled ? "Disable Component" : "Enable Component"}
                                    >
                                      {isEnabled ? <ToggleRight size={20} strokeWidth={2.2} /> : <ToggleLeft size={20} strokeWidth={2.2} />}
                                    </button>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Structure Modal */}
      <Dialog open={structureModalOpen} onClose={() => setStructureModalOpen(false)} title={editingStructure ? "Edit Salary Structure" : "New Salary Structure"}>
        <div className="space-y-4 pt-2">
          <Input label="Structure Name" required value={structureName} onChange={(e) => setStructureName(e.target.value)} placeholder="e.g. Executive Gross Package" />
          <Input label="Structure Code" value={structureCode} onChange={(e) => setStructureCode(e.target.value)} placeholder="e.g. EXEC_GROSS" />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary of salary band" />
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setStructureModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveStructure} disabled={savingStructure}>
              {savingStructure ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Structure
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Component Mapping Modal */}
      <Dialog open={mapModalOpen} onClose={() => setMapModalOpen(false)} title={editingMapping ? `Edit Component in ${targetStructure?.structureName}` : `Map Component to ${targetStructure?.structureName}`}>
        <div className="space-y-4 pt-2">
          <Select
            label="Select Payroll Component"
            value={selectedCompUid}
            onChange={(e) => setSelectedCompUid(e.target.value)}
            options={componentsHook.data.map((c) => ({
              value: c.uid || c.id,
              label: `${c.componentName} (${c.componentType})`,
            }))}
          />
          <Select
            label="Calculation Type"
            value={calcType}
            onChange={(e) => setCalcType(e.target.value as CalculationType)}
            options={[
              { value: "FIXED_AMOUNT", label: "Fixed Amount (₹)" },
              { value: "PERCENTAGE", label: "Percentage (%)" },
              { value: "FORMULA", label: "Formula Expression" },
            ]}
          />
          {calcType === "FIXED_AMOUNT" ? (
            <Input label="Default Amount (₹)" type="number" value={String(defaultAmount)} onChange={(e) => setDefaultAmount(Number(e.target.value))} />
          ) : (
            <Input label="Default Percentage (%)" type="number" value={String(defaultPercentage)} onChange={(e) => setDefaultPercentage(Number(e.target.value))} />
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setMapModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveMappedComponent} disabled={savingMapping}>
              {savingMapping ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Mapping
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
