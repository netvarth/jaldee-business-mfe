import { useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button, DataTable, EmptyState, SkeletonTable } from "@jaldee/design-system";
import type { PayrollComponent, ViewMode } from "../payrollTypes";
import { labelize } from "../payrollTypes";
import { CardCollection, FlagList, InfoCard, Panel, ViewToggle, smallAction } from "../PayrollComponents";

interface Props {
  components: {
    data: PayrollComponent[];
    loading: boolean;
    delete: (uid: string) => Promise<void>;
  };
  componentsView: ViewMode;
  setComponentsView: (v: ViewMode) => void;
  openComponent: (component?: PayrollComponent) => void;
  setMessage: (msg: string | null) => void;
  setBusy: (busy: boolean) => void;
}

export function PayrollComponentsTab({
  components,
  componentsView,
  setComponentsView,
  openComponent,
  setMessage,
  setBusy,
}: Props) {
  const componentColumns = useMemo(
    () => [
      {
        key: "componentCode",
        header: "Code",
        cell: (c: PayrollComponent) => (
          <span style={{ fontWeight: 800 }} className="text-slate-900">{c.componentCode || "-"}</span>
        ),
      },
      {
        key: "componentName",
        header: "Name",
        cell: (c: PayrollComponent) => c.componentName || "-",
      },
      {
        key: "componentType",
        header: "Type",
        cell: (c: PayrollComponent) => labelize(c.componentType),
      },
      {
        key: "componentCategory",
        header: "Category",
        cell: (c: PayrollComponent) => labelize(c.componentCategory),
      },
      {
        key: "calculationType",
        header: "Calculation",
        cell: (c: PayrollComponent) => labelize(c.calculationType),
      },
      {
        key: "flags",
        header: "Flags",
        cell: (c: PayrollComponent) => (
          <FlagList
            flags={[
              c.isStatutory && "Statutory",
              c.isTaxable && "Taxable",
              c.affectsGrossPay && "Gross",
              c.affectsNetPay && "Net",
              c.affectsCtc && "CTC",
            ]}
          />
        ),
      },
      {
        key: "actions",
        header: "Action",
        className: "text-right",
        cell: (c: PayrollComponent) => (
          <div className="flex justify-end gap-1.5">
            <button
              id={`hr-payroll-component-edit-${c.id}`}
              data-testid={`hr-payroll-component-edit-${c.id}`}
              className="btn-grid-action"
              onClick={() => openComponent(c)}
              style={smallAction}
            >
              <Pencil size={14} /> Edit
            </button>
          </div>
        ),
      },
    ],
    [openComponent]
  );

  const componentCards = useMemo(
    () =>
      components.data.map((c) => (
        <InfoCard
          key={c.id || c.uid}
          title={c.componentName}
          subtitle={c.componentCode}
          rows={[
            { label: "Type", value: labelize(c.componentType) },
            { label: "Category", value: labelize(c.componentCategory) },
            { label: "Calculation", value: labelize(c.calculationType) },
            {
              label: "Flags",
              value: (
                <FlagList
                  flags={[
                    c.isStatutory && "Statutory",
                    c.isTaxable && "Taxable",
                    c.affectsGrossPay && "Gross",
                    c.affectsNetPay && "Net",
                  ]}
                />
              ),
            },
          ]}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => openComponent(c)}>
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600"
                onClick={async () => {
                  const uid = c.uid || c.id;
                  if (!uid) return;
                  setBusy(true);
                  try {
                    await components.delete(uid);
                    setMessage("Component deleted.");
                  } catch (err) {
                    setMessage(err instanceof Error ? err.message : "Failed to delete.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete
              </Button>
            </>
          }
        />
      )),
    [components, openComponent, setBusy, setMessage]
  );

  return (
    <Panel
      title="Payroll Component Master"
      action={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            id="hr-payroll-component-new"
            data-testid="hr-payroll-component-new"
            variant="primary"
            size="sm"
            className="!h-8 text-xs"
            icon={<Plus size={15} />}
            onClick={() => openComponent()}
          >
            New Component
          </Button>
          <ViewToggle value={componentsView} onChange={setComponentsView} scope="hr-payroll-components-view" />
        </div>
      }
    >
      {components.loading ? (
        <div className="p-4"><SkeletonTable rows={5} columns={6} /></div>
      ) : componentsView === "table" ? (
        <DataTable
          data-testid="hr-payroll-components-table"
          data={components.data}
          columns={componentColumns}
          getRowId={(c) => c.id || c.uid || ""}
          loading={components.loading}
          className="rounded-none border-0 shadow-none"
          tableClassName="min-w-[980px] [&_thead_th]:h-11 [&_thead_th]:px-4 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:px-4 [&_tbody_td]:py-3"
          emptyState={
            <EmptyState
              title="No payroll components"
              description="Create payroll components to define earnings, deductions, and employer contribution lines."
            />
          }
        />
      ) : (
        <div className="p-4 sm:p-5">
          <CardCollection
            emptyTitle="No payroll components"
            emptyDescription="Create payroll components to define earnings, deductions, and employer contribution lines."
            items={componentCards}
          />
        </div>
      )}
    </Panel>
  );
}
