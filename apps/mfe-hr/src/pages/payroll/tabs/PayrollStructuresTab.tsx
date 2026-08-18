import { useMemo } from "react";
import { ArrowLeft, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { Button, DataTable, EmptyState } from "@jaldee/design-system";
import type { PayrollComponent, PayrollStructure, StructureComponentMapping, ViewMode } from "../payrollTypes";
import { labelize } from "../payrollTypes";
import { CardCollection, FlagList, InfoCard, Panel, ViewToggle, smallAction } from "../PayrollComponents";

interface Props {
  structures: {
    data: PayrollStructure[];
    loading: boolean;
    delete: (uid: string) => Promise<void>;
    removeComponent: (structureUid: string, mappingUid: string) => Promise<void>;
  };
  components: PayrollComponent[];
  structuresView: ViewMode;
  setStructuresView: (v: ViewMode) => void;
  builderComponentsView: ViewMode;
  setBuilderComponentsView: (v: ViewMode) => void;
  routeState: {
    isStructureBuilder: boolean;
    builderStructureUid: string | null;
  };
  selectedStructure: PayrollStructure | null;
  openStructure: (s?: PayrollStructure) => void;
  openStructureBuilder: (uid: string) => void;
  openAddComponentDialog: () => void;
  navigate: (path: string) => void;
  setMessage: (msg: string | null) => void;
  setBusy: (busy: boolean) => void;
}

export function PayrollStructuresTab({
  structures,
  components,
  structuresView,
  setStructuresView,
  builderComponentsView,
  setBuilderComponentsView,
  routeState,
  selectedStructure,
  openStructure,
  openStructureBuilder,
  openAddComponentDialog,
  navigate,
  setMessage,
  setBusy,
}: Props) {
  const uidOf = (item?: { uid?: string; id?: string }) => item?.uid || item?.id || "";

  const componentName = (mapping: StructureComponentMapping) => {
    const componentUid = mapping.componentUid || mapping.payrollComponentUid || uidOf(mapping.component);
    const component = components.find((item) => uidOf(item) === componentUid);
    return mapping.componentName || mapping.component?.componentName || component?.componentName || mapping.componentCode || component?.componentCode || componentUid || "-";
  };

  const structureColumns = useMemo(
    () => [
      {
        key: "structureCode",
        header: "Code",
        cell: (s: PayrollStructure) => <span style={{ fontWeight: 800 }} className="text-slate-900">{s.structureCode || "-"}</span>,
      },
      {
        key: "structureName",
        header: "Name",
        cell: (s: PayrollStructure) => s.structureName || "-",
      },
      {
        key: "payrollFrequency",
        header: "Frequency",
        cell: (s: PayrollStructure) => labelize(s.payrollFrequency || "MONTHLY"),
      },
      {
        key: "currencyCode",
        header: "Currency",
        cell: (s: PayrollStructure) => s.currencyCode || "INR",
      },
      {
        key: "components",
        header: "Components",
        align: "center" as const,
        cell: (s: PayrollStructure) => String(s.components?.length ?? 0),
      },
      {
        key: "actions",
        header: "Action",
        className: "text-right",
        cell: (s: PayrollStructure) => {
          const uid = uidOf(s);
          return (
            <div className="flex justify-end gap-2">
              <button
                id={`hr-payroll-structure-build-${s.id}`}
                data-testid={`hr-payroll-structure-build-${s.id}`}
                className="btn-grid-action"
                onClick={() => openStructureBuilder(uid)}
                style={smallAction}
              >
                Build
              </button>
              <button
                id={`hr-payroll-structure-edit-${s.id}`}
                data-testid={`hr-payroll-structure-edit-${s.id}`}
                className="btn-grid-action"
                onClick={() => openStructure(s)}
                style={smallAction}
              >
                <Pencil size={14} /> Edit
              </button>
            </div>
          );
        },
      },
    ],
    [openStructure, openStructureBuilder]
  );

  const structureComponentColumns = useMemo(
    () => [
      {
        key: "component",
        header: "Component",
        cell: (m: StructureComponentMapping) => <span className="font-semibold text-slate-900">{componentName(m)}</span>,
      },
      {
        key: "calculation",
        header: "Calculation",
        cell: (m: StructureComponentMapping) => labelize(m.calculationType),
      },
      {
        key: "default_value",
        header: "Default Value",
        cell: (m: StructureComponentMapping) =>
          m.defaultAmount != null
            ? `₹${m.defaultAmount}`
            : m.defaultPercentage != null
            ? `${m.defaultPercentage}%`
            : "-",
      },
      {
        key: "rules",
        header: "Rules",
        cell: (m: StructureComponentMapping) => (
          <FlagList
            flags={[
              m.isMandatory && "Mandatory",
              m.allowEmployeeOverride && "Override Allowed",
              m.isPfEligible && "PF Base",
              m.isEsiEligible && "ESI Base",
            ]}
          />
        ),
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        cell: (m: StructureComponentMapping) => {
          const mappingUid = uidOf(m) || m.componentUid || m.payrollComponentUid;
          const structureUid = uidOf(selectedStructure);
          return (
            <div className="flex justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="!h-7 text-xs !px-2 text-rose-600 hover:text-rose-700"
                icon={<Trash2 size={13} />}
                onClick={async () => {
                  if (!structureUid || !mappingUid) return;
                  setBusy(true);
                  try {
                    await structures.removeComponent(structureUid, mappingUid);
                    setMessage("Component removed from structure.");
                  } catch (err) {
                    setMessage(err instanceof Error ? err.message : "Failed to remove component.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          );
        },
      },
    ],
    [components, selectedStructure, setBusy, setMessage, structures]
  );

  if (routeState.isStructureBuilder) {
    if (!selectedStructure) {
      return (
        <Panel title="Structure Builder" padding={true}>
          <EmptyState
            title="Structure not found"
            description="Return to the structures list and open a valid payroll structure builder."
          />
        </Panel>
      );
    }
    return (
      <Panel
        title={`Mapped Components - ${selectedStructure.structureName}`}
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ViewToggle value={builderComponentsView} onChange={setBuilderComponentsView} scope="hr-payroll-builder-components-view" />
            <Button
              id="hr-payroll-structure-builder-back"
              data-testid="hr-payroll-structure-builder-back"
              variant="outline"
              size="sm"
              className="!h-8 text-xs"
              icon={<ArrowLeft size={14} />}
              onClick={() => navigate("/payroll/structures")}
            >
              Back
            </Button>
            <Button
              id="hr-payroll-structure-builder-open-add"
              data-testid="hr-payroll-structure-builder-open-add"
              variant="primary"
              size="sm"
              className="!h-8 text-xs"
              icon={<Plus size={14} />}
              onClick={openAddComponentDialog}
              disabled={components.length === 0}
            >
              Add Component
            </Button>
          </div>
        }
      >
        {builderComponentsView === "table" ? (
          <DataTable
            data-testid="hr-payroll-structure-components-table"
            data={selectedStructure.components || []}
            columns={structureComponentColumns}
            getRowId={(mapping) => uidOf(mapping) || mapping.componentUid || mapping.payrollComponentUid || componentName(mapping)}
            loading={structures.loading}
            className="rounded-none border-0 shadow-none"
            tableClassName="min-w-[980px] [&_thead_th]:h-11 [&_thead_th]:px-4 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:px-4 [&_tbody_td]:py-3"
            emptyState={
              <EmptyState
                title="No components mapped"
                description="Add components to this payroll structure to calculate gross and net pay."
              />
            }
          />
        ) : (
          <div className="p-4 sm:p-5">
            <CardCollection
              emptyTitle="No components mapped"
              emptyDescription="Add components to this payroll structure to calculate gross and net pay."
              items={(selectedStructure.components || []).map((mapping) => (
                <InfoCard
                  key={uidOf(mapping) || mapping.componentUid}
                  title={componentName(mapping)}
                  subtitle={labelize(mapping.calculationType)}
                  rows={[
                    {
                      label: "Default Value",
                      value:
                        mapping.defaultAmount != null
                          ? `₹${mapping.defaultAmount}`
                          : mapping.defaultPercentage != null
                          ? `${mapping.defaultPercentage}%`
                          : "-",
                    },
                    {
                      label: "Rules",
                      value: (
                        <FlagList
                          flags={[
                            mapping.isMandatory && "Mandatory",
                            mapping.allowEmployeeOverride && "Override Allowed",
                          ]}
                        />
                      ),
                    },
                  ]}
                  actions={
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600"
                      onClick={async () => {
                        const structureUid = uidOf(selectedStructure);
                        const mappingUid = uidOf(mapping) || mapping.componentUid;
                        if (!structureUid || !mappingUid) return;
                        setBusy(true);
                        try {
                          await structures.removeComponent(structureUid, mappingUid);
                          setMessage("Component removed.");
                        } catch (err) {
                          setMessage(err instanceof Error ? err.message : "Failed to remove.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Remove
                    </Button>
                  }
                />
              ))}
            />
          </div>
        )}
      </Panel>
    );
  }

  return (
    <Panel
      title="Payroll Structures"
      action={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            id="hr-payroll-structure-new"
            data-testid="hr-payroll-structure-new"
            variant="primary"
            size="sm"
            className="!h-8 text-xs"
            icon={<Plus size={15} />}
            onClick={() => openStructure()}
          >
            New Structure
          </Button>
          <ViewToggle value={structuresView} onChange={setStructuresView} scope="hr-payroll-structures-view" />
        </div>
      }
    >
      {structuresView === "table" ? (
        <DataTable
          data-testid="hr-payroll-structures-table"
          data={structures.data}
          columns={structureColumns}
          getRowId={(s) => s.id || s.uid || ""}
          loading={structures.loading}
          className="rounded-none border-0 shadow-none"
          tableClassName="min-w-[980px] [&_thead_th]:h-11 [&_thead_th]:px-4 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:px-4 [&_tbody_td]:py-3"
          emptyState={
            <EmptyState
              title="No payroll structures"
              description="Create a salary structure, then open its builder to map payroll components."
            />
          }
        />
      ) : (
        <div className="p-4 sm:p-5">
          <CardCollection
            emptyTitle="No payroll structures"
            emptyDescription="Create a salary structure, then open its builder to map payroll components."
            items={structures.data.map((s) => (
              <InfoCard
                key={s.id || s.uid}
                title={s.structureName}
                subtitle={s.structureCode}
                rows={[
                  { label: "Frequency", value: labelize(s.payrollFrequency) },
                  { label: "Components", value: s.components?.length || 0 },
                ]}
                actions={
                  <>
                    <Button variant="outline" size="sm" onClick={() => openStructureBuilder(uidOf(s))}>
                      Builder
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openStructure(s)}>
                      Edit
                    </Button>
                  </>
                }
              />
            ))}
          />
        </div>
      )}
    </Panel>
  );
}
