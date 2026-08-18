import { useMemo } from "react";
import { ArrowLeft, CircleCheck, UserCog } from "lucide-react";
import { Button, DataTable, DataTableToolbar, DatePicker, EmptyState, Select, SkeletonTable } from "@jaldee/design-system";
import type { EmployeeComponentValue, PayrollStructure, StructureComponentMapping, ViewMode } from "../payrollTypes";
import { labelize, money } from "../payrollTypes";
import { CardCollection, InfoCard, OverrideInput, Panel, Table, ViewToggle, smallAction, summaryBand, tdStrong, tdStyle } from "../PayrollComponents";

interface EmployeeRecord {
  id: string;
  name?: string;
  employeeId?: string;
  email?: string;
  department?: string;
  designation?: string;
  status?: string;
}

interface Props {
  employees: EmployeeRecord[];
  filteredEmployees: EmployeeRecord[];
  employeesLoading: boolean;
  employeesView: ViewMode;
  setEmployeesView: (v: ViewMode) => void;
  employeeQuery: string;
  setEmployeeQuery: (q: string) => void;
  routeState: {
    isEmployeeAssign: boolean;
    employeeAssignUid: string | null;
  };
  activeEmployeeUid: string;
  activeEmployeeRecord?: EmployeeRecord;
  activeStructure?: PayrollStructure;
  structures: PayrollStructure[];
  assignmentForm: {
    structureUid: string;
    effectiveFrom: string;
    effectiveTo: string;
  };
  setAssignmentForm: React.Dispatch<React.SetStateAction<{ structureUid: string; effectiveFrom: string; effectiveTo: string }>>;
  employeePayroll: {
    loading: boolean;
    assignment: any;
  };
  employeeComponentRows: Array<{ value: EmployeeComponentValue; mapping?: StructureComponentMapping }>;
  overrideDrafts: Record<string, EmployeeComponentValue>;
  updateOverride: (value: EmployeeComponentValue, patch: Partial<EmployeeComponentValue>, mapping?: StructureComponentMapping) => void;
  seedOverride: (value: EmployeeComponentValue, mapping?: StructureComponentMapping) => EmployeeComponentValue;
  componentValueKey: (value: EmployeeComponentValue, mapping?: StructureComponentMapping) => string;
  assignStructure: () => Promise<void>;
  saveOverrides: () => Promise<void>;
  openEmployeeAssignment: (id: string) => void;
  employeeHasAssignedStructure: (emp: EmployeeRecord) => boolean;
  navigate: (path: string) => void;
  busy: boolean;
}

export function PayrollEmployeesTab({
  employees,
  filteredEmployees,
  employeesLoading,
  employeesView,
  setEmployeesView,
  employeeQuery,
  setEmployeeQuery,
  routeState,
  activeEmployeeUid,
  activeEmployeeRecord,
  activeStructure,
  structures,
  assignmentForm,
  setAssignmentForm,
  employeePayroll,
  employeeComponentRows,
  overrideDrafts,
  updateOverride,
  seedOverride,
  componentValueKey,
  assignStructure,
  saveOverrides,
  openEmployeeAssignment,
  employeeHasAssignedStructure,
  navigate,
  busy,
}: Props) {
  const uidOf = (item?: { uid?: string; id?: string }) => item?.uid || item?.id || "";

  const employeeColumns = useMemo(
    () => [
      {
        key: "employeeId",
        header: "Employee ID",
        width: "18%",
        cell: (emp: EmployeeRecord) => (
          <div className="grid gap-1">
            {employeeHasAssignedStructure(emp) ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                <CircleCheck size={14} /> Assigned
              </span>
            ) : null}
            <span style={{ fontWeight: 800 }}>{emp.employeeId || "-"}</span>
          </div>
        ),
      },
      {
        key: "name",
        header: "Employee",
        width: "28%",
        cell: (emp: EmployeeRecord) => (
          <div>
            <div style={{ fontWeight: 800 }}>{emp.name || "-"}</div>
            <div className="text-xs text-slate-500">{emp.email || "-"}</div>
          </div>
        ),
      },
      {
        key: "department",
        header: "Department",
        width: "18%",
        cell: (emp: EmployeeRecord) => emp.department || "-",
      },
      {
        key: "designation",
        header: "Designation",
        width: "24%",
        cell: (emp: EmployeeRecord) => emp.designation || "-",
      },
      {
        key: "actions",
        header: "Action",
        width: "12%",
        className: "text-right",
        cell: (emp: EmployeeRecord) => (
          <button
            id={`hr-payroll-employee-assign-${emp.id}`}
            data-testid={`hr-payroll-employee-assign-${emp.id}`}
            className="btn-grid-action"
            onClick={() => openEmployeeAssignment(emp.id)}
            style={smallAction}
          >
            {employeeHasAssignedStructure(emp) ? "Edit Structure" : "Assign Structure"}
          </button>
        ),
      },
    ],
    [employeeHasAssignedStructure, openEmployeeAssignment]
  );

  if (routeState.isEmployeeAssign) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">
        <Panel
          title="Employee Salary Configuration"
          padding={true}
          action={
            <Button
              id="hr-payroll-employee-assign-back"
              data-testid="hr-payroll-employee-assign-back"
              variant="outline"
              size="sm"
              className="!h-8 text-xs"
              icon={<ArrowLeft size={14} />}
              onClick={() => navigate("/payroll/employees")}
            >
              Back
            </Button>
          }
        >
          <div className="grid gap-3.5">
            <div className="rounded-lg border border-slate-200/80 p-3.5 bg-slate-50/80">
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Employee</div>
              <div className="font-bold text-base text-slate-900">{activeEmployeeRecord?.name || "-"}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {employees.find((e) => e.id === activeEmployeeUid)?.employeeId || "-"} ·{" "}
                {employees.find((e) => e.id === activeEmployeeUid)?.department || "No department"}
              </div>
            </div>
            <Select
              id="hr-payroll-employee-structure"
              testId="hr-payroll-employee-structure"
              label="Assign Structure"
              value={assignmentForm.structureUid}
              onChange={(e) => setAssignmentForm((f) => ({ ...f, structureUid: e.target.value }))}
              options={structures.map((s) => ({ value: uidOf(s), label: `${s.structureName} (${s.structureCode})` }))}
              placeholder="Select structure"
            />
            <DatePicker
              label="Effective From"
              value={assignmentForm.effectiveFrom}
              onChange={(e) => setAssignmentForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
            />
            <DatePicker
              label="Effective To"
              value={assignmentForm.effectiveTo}
              onChange={(e) => setAssignmentForm((f) => ({ ...f, effectiveTo: e.target.value }))}
            />
            <Button
              id="hr-payroll-employee-assign"
              data-testid="hr-payroll-employee-assign"
              variant="primary"
              onClick={assignStructure}
              disabled={busy || !activeEmployeeUid}
            >
              Assign Structure
            </Button>
          </div>
        </Panel>

        <Panel title="Active Assignment & Overrides" padding={true}>
          {employeePayroll.loading ? (
            <SkeletonTable rows={4} columns={5} />
          ) : !activeEmployeeUid ? (
            <div className="text-xs text-slate-500 py-3">Select an employee to view payroll configuration.</div>
          ) : (
            <>
              <div style={summaryBand}>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500">Active Structure</div>
                  <div className="font-bold text-base text-slate-900">{activeStructure?.structureName || "-"}</div>
                  <div className="text-xs text-slate-500">
                    {employeePayroll.assignment?.effectiveFrom || "-"} to{" "}
                    {employeePayroll.assignment?.effectiveTo || "Open ended"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Status</div>
                  <div className="font-bold text-slate-900">{employeePayroll.assignment?.status || "Enabled"}</div>
                </div>
              </div>

              <Table
                headers={["Component", "Type", "Actual Value", "Override", "Applicable"]}
                empty={employeeComponentRows.length === 0 ? "No employee component values found for the active structure." : null}
              >
                {employeeComponentRows.map(({ value, mapping }) => {
                  const key = componentValueKey(value, mapping);
                  const draft = overrideDrafts[key] || seedOverride(value, mapping);
                  const canOverride = mapping ? !!mapping.allowEmployeeOverride : true;
                  return (
                    <tr key={key || value.componentUid}>
                      <td style={tdStrong}>
                        {value.componentName ||
                          value.componentCode ||
                          mapping?.componentName ||
                          mapping?.component?.componentName ||
                          mapping?.componentCode ||
                          value.componentUid ||
                          "-"}
                      </td>
                      <td style={tdStyle}>{labelize(value.calculationType || mapping?.calculationType)}</td>
                      <td style={tdStyle}>
                        {draft.previousAmount != null
                          ? money(draft.previousAmount)
                          : draft.previousPercentage != null
                          ? `${draft.previousPercentage}%`
                          : "-"}
                      </td>
                      <td style={tdStyle}>
                        {canOverride ? (
                          <OverrideInput mapping={mapping} value={draft} onChange={(patch) => updateOverride(value, patch, mapping)} />
                        ) : (
                          <span className="text-slate-400">Locked</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {mapping?.isMandatory ? (
                          <span className="font-semibold text-slate-700">Mandatory</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={draft.isApplicable !== false}
                            onChange={(e) => updateOverride(value, { isApplicable: e.target.checked }, mapping)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Table>
              <div className="flex justify-end mt-4">
                <Button
                  id="hr-payroll-employee-overrides-save"
                  data-testid="hr-payroll-employee-overrides-save"
                  variant="primary"
                  onClick={saveOverrides}
                  disabled={busy || Object.keys(overrideDrafts).length === 0}
                >
                  Save Overrides
                </Button>
              </div>
            </>
          )}
        </Panel>
      </div>
    );
  }

  return (
    <Panel
      title={`Employee Payroll List (${filteredEmployees.length})`}
      action={<ViewToggle value={employeesView} onChange={setEmployeesView} scope="hr-payroll-employees-view" />}
    >
      <div>
        <div className="border-b border-[var(--color-border)] p-4">
          <DataTableToolbar
            query={employeeQuery}
            onQueryChange={setEmployeeQuery}
            searchPlaceholder="Search employee, email, ID, department"
          />
        </div>
        {employeesView === "table" ? (
          <DataTable
            data-testid="hr-payroll-employees-table"
            data={filteredEmployees}
            columns={employeeColumns}
            getRowId={(employee) => employee.id}
            loading={employeesLoading}
            className="rounded-none border-0 shadow-none"
            tableClassName="min-w-[980px] [&_thead_th]:h-11 [&_thead_th]:px-4 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.02em] [&_tbody_td]:px-4 [&_tbody_td]:py-3"
            emptyState={
              <EmptyState
                title="No employees found"
                description="Adjust the search or filters, or add employees for payroll assignment."
              />
            }
          />
        ) : (
          <div className="p-4 sm:p-5">
            <CardCollection
              emptyTitle="No employees found"
              emptyDescription="Adjust the search or filters, or add employees for payroll assignment."
              items={filteredEmployees.map((employee) => (
                <InfoCard
                  key={employee.id}
                  title={employee.name || "-"}
                  subtitle={employee.employeeId || employee.email || "-"}
                  rows={[
                    { label: "Department", value: employee.department || "-" },
                    { label: "Designation", value: employee.designation || "-" },
                    {
                      label: "Structure",
                      value: employeeHasAssignedStructure(employee) ? "Assigned" : "Not assigned",
                    },
                  ]}
                  actions={
                    <Button
                      variant={employeeHasAssignedStructure(employee) ? "outline" : "primary"}
                      size="sm"
                      onClick={() => openEmployeeAssignment(employee.id)}
                    >
                      {employeeHasAssignedStructure(employee) ? "Edit Structure" : "Assign Structure"}
                    </Button>
                  }
                />
              ))}
            />
          </div>
        )}
      </div>
    </Panel>
  );
}
