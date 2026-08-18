import { useMemo } from "react";
import { Download, Play } from "lucide-react";
import { Button, MonthPicker } from "@jaldee/design-system";
import type { Payslip, ViewMode } from "../payrollTypes";
import { money } from "../payrollTypes";
import { CardCollection, InfoCard, Panel, Table, ViewToggle, smallAction, tdStrong, tdStyle } from "../PayrollComponents";
import { PayslipStatementPage } from "../../../components/PayslipStatementDialog";

interface Props {
  payslips: {
    data: Payslip[];
    loading: boolean;
  };
  runs: {
    data: any[];
    loading: boolean;
  };
  payslipsView: ViewMode;
  setPayslipsView: (v: ViewMode) => void;
  runMonth: string;
  setRunMonth: (m: string) => void;
  processRun: () => Promise<void>;
  finalizeRun: () => Promise<void>;
  downloadPayrollSummaryCSV: () => void;
  employeeName: (uid?: string) => string;
  setViewSlip: (slip: Payslip | null) => void;
  navigate: (path: string) => void;
  routeState: {
    isPayslipView: boolean;
    payslipUid: string | null;
  };
  activePayslipRecord: Payslip | null;
  activeEmployeeRecord?: any;
  payslipFields: any[];
  busy: boolean;
}

export function PayrollPayslipsTab({
  payslips,
  runs,
  payslipsView,
  setPayslipsView,
  runMonth,
  setRunMonth,
  processRun,
  finalizeRun,
  downloadPayrollSummaryCSV,
  employeeName,
  setViewSlip,
  navigate,
  routeState,
  activePayslipRecord,
  activeEmployeeRecord,
  payslipFields,
  busy,
}: Props) {
  if (routeState.isPayslipView && activePayslipRecord) {
    return (
      <PayslipStatementPage
        payslip={activePayslipRecord}
        employee={activeEmployeeRecord || null}
        fields={payslipFields}
        employeeName={employeeName(activePayslipRecord.employeeUid)}
        onBack={() => navigate("/payroll/payslips")}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 items-start">
      <Panel title="Payroll Run Dashboard" padding={true}>
        <div className="grid gap-3.5">
          <MonthPicker
            id="run-month"
            label="Payroll Month"
            value={typeof runMonth === "string" ? runMonth : (runMonth as unknown as { target?: { value?: string } })?.target?.value || ""}
            onChange={(e) => setRunMonth(typeof e === "string" ? e : e?.target?.value || "")}
          />
          <Button
            id="hr-payroll-process-run"
            data-testid="hr-payroll-process"
            variant="primary"
            icon={<Play size={15} />}
            onClick={processRun}
            disabled={busy}
          >
            Process Payroll Run
          </Button>
          <Button
            id="hr-payroll-finalize-run"
            data-testid="hr-payroll-finalize-run"
            variant="outline"
            onClick={finalizeRun}
            disabled={busy || payslips.data.length === 0}
          >
            Finalize Run & Generate Slips
          </Button>
          <Button
            id="hr-payroll-export-csv"
            data-testid="hr-payroll-export-csv"
            variant="outline"
            icon={<Download size={15} />}
            onClick={downloadPayrollSummaryCSV}
            disabled={payslips.data.length === 0}
          >
            Export Payroll Register (CSV)
          </Button>
        </div>
      </Panel>

      <Panel
        title={`Payslips Register (${payslips.data.length})`}
        action={<ViewToggle value={payslipsView} onChange={setPayslipsView} scope="hr-payroll-payslips-view" />}
      >
        {payslipsView === "table" ? (
          <Table
            headers={["Employee", "Month", "Gross", "Deductions", "Net", "Status", "Action"]}
            empty={payslips.data.length === 0 ? "No generated payslips found." : null}
          >
            {payslips.data.map((payslip) => (
              <tr key={payslip.id}>
                <td style={tdStrong}>{payslip.employeeName || employeeName(payslip.employeeUid)}</td>
                <td style={tdStyle}>{payslip.monthStr || payslip.month || "-"}</td>
                <td style={tdStyle}>{money(payslip.grossPay)}</td>
                <td style={tdStyle}>{money(payslip.totalDeductions)}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{money(payslip.netPay)}</td>
                <td style={tdStyle}>{payslip.status || "-"}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <Button
                    id={`hr-payroll-payslip-view-${payslip.id}`}
                    data-testid={`hr-payroll-payslip-view-${payslip.id}`}
                    variant="outline"
                    size="sm"
                    className="!h-7 text-xs !px-2.5"
                    onClick={() => {
                      setViewSlip(payslip);
                      navigate(`/payroll/payslips/${payslip.uid || payslip.id}`);
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <div className="p-4 sm:p-5">
            <CardCollection
              emptyTitle="No generated payslips found"
              emptyDescription="Process payroll to generate employee payslips."
              items={payslips.data.map((payslip) => (
                <InfoCard
                  key={payslip.id}
                  title={payslip.employeeName || employeeName(payslip.employeeUid)}
                  subtitle={payslip.monthStr || payslip.month || "-"}
                  rows={[
                    { label: "Gross", value: money(payslip.grossPay) },
                    { label: "Deductions", value: money(payslip.totalDeductions) },
                    { label: "Net Pay", value: money(payslip.netPay) },
                    { label: "Status", value: payslip.status || "-" },
                  ]}
                  actions={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewSlip(payslip);
                        navigate(`/payroll/payslips/${payslip.uid || payslip.id}`);
                      }}
                    >
                      View
                    </Button>
                  }
                />
              ))}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
