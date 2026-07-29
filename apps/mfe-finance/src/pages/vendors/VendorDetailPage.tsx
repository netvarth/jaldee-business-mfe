import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, SectionCard } from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { formatCurrency } from "../../lib/financeData";
import { PageShell } from "../../components/FinancePageLayout";

export default function VendorDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"expenses" | "payments">("expenses");
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [expenseRows, setExpenseRows] = useState<Array<{ id: string; date: string; amount: number; category: string; paymentMode: string; status: string }>>([]);
  const [paymentRows, setPaymentRows] = useState<Array<{ id: string; date: string; amount: number; category: string; paymentMode: string; status: string }>>([]);

  useEffect(() => {
    let active = true;

    async function loadVendorDetails() {
      setLoading(true);
      try {
        const [detailResponse, expensesResponse, paymentsResponse] = await Promise.allSettled([
          financeApi.vendors.detail<any>(id),
          financeApi.expenses.list<any>({ vendorUid: id, page: 0, size: 10 }),
          financeApi.payables.list<any>({ vendorUid: id, page: 0, size: 10 }),
        ]);

        if (!active) {
          return;
        }

        const detail = detailResponse.status === "fulfilled" ? detailResponse.value.data : null;
        const expenseItems = expensesResponse.status === "fulfilled"
          ? Array.isArray(expensesResponse.value.data)
            ? expensesResponse.value.data
            : Array.isArray((expensesResponse.value.data as any)?.content)
              ? (expensesResponse.value.data as any).content
              : Array.isArray((expensesResponse.value.data as any)?.data)
                ? (expensesResponse.value.data as any).data
                : Array.isArray((expensesResponse.value.data as any)?.data?.content)
                  ? (expensesResponse.value.data as any).data.content
                  : []
          : [];
        const paymentItems = paymentsResponse.status === "fulfilled"
          ? Array.isArray(paymentsResponse.value.data)
            ? paymentsResponse.value.data
            : Array.isArray((paymentsResponse.value.data as any)?.content)
              ? (paymentsResponse.value.data as any).content
              : Array.isArray((paymentsResponse.value.data as any)?.data)
                ? (paymentsResponse.value.data as any).data
                : Array.isArray((paymentsResponse.value.data as any)?.data?.content)
                  ? (paymentsResponse.value.data as any).data.content
                  : []
          : [];

        setVendor(detail);
        setExpenseRows(
          expenseItems.map((item: any, index: number) => ({
            id: String(item.expenseUid ?? item.uid ?? item.id ?? `expense-${index}`),
            date: item.expenseDate || item.paidDate || item.createdDate
              ? new Date(item.expenseDate ?? item.paidDate ?? item.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-",
            amount: Number(item.amount ?? item.totalAmount ?? item.expenseAmount ?? 0) || 0,
            category: String(item.categoryName ?? item.expenseCategoryName ?? item.category ?? "-"),
            paymentMode: String(item.paymentMode ?? item.mode ?? "-"),
            status: String(item.expenseStatusName ?? item.statusName ?? item.status ?? "-"),
          })),
        );
        setPaymentRows(
          paymentItems.map((item: any, index: number) => ({
            id: String(item.paymentsOutUid ?? item.payInOutUid ?? item.uid ?? item.id ?? `payment-${index}`),
            date: item.paymentOn || item.paidDate || item.createdDate
              ? new Date(item.paymentOn ?? item.paidDate ?? item.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-",
            amount: Number(item.amount ?? item.paymentAmount ?? item.totalAmount ?? 0) || 0,
            category: String(item.categoryName ?? item.paymentCategory ?? "-"),
            paymentMode: String(item.paymentMode ?? item.mode ?? "-"),
            status: String(item.statusName ?? item.vendorStatusName ?? item.status ?? "-"),
          })),
        );
      } catch (error) {
        console.error("[mfe-finance] Failed to load vendor detail", error);
        if (active) {
          setVendor(null);
          setExpenseRows([]);
          setPaymentRows([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadVendorDetails();
    return () => {
      active = false;
    };
  }, [id]);

  const detail = vendor ?? {};
  const detailRows = [
    { label: "Owner", value: String(detail.contactName ?? "-") },
    { label: "Status", value: String(detail.vendorStatusName ?? detail.statusName ?? detail.vendorStatus ?? detail.status ?? "-") },
    { label: "Phone", value: String(detail.phoneNumber ?? "-") },
    { label: "Email", value: String(detail.email ?? "-") },
    { label: "State", value: String(detail.state ?? "-") },
    { label: "Pin", value: String(detail.pincode ?? "-") },
    { label: "Address", value: String(detail.address ?? "-") },
  ];
  const bankRows = [
    { label: "Bank Name", value: String(detail.bankName ?? "-") },
    { label: "Account No", value: String(detail.bankaccountNo ?? "-") },
    { label: "Branch", value: String(detail.state ?? "-") },
    { label: "GST No", value: String(detail.gstNumber ?? "-") },
    { label: "IFSC Code", value: String(detail.ifscCode ?? "-") },
    { label: "PAN No", value: String(detail.pancardNo ?? "-") },
  ];
  const rows = activeTab === "expenses" ? expenseRows : paymentRows;

  if (loading) {
    return (
      <PageShell title="Vendor Details" subtitle="Loading vendor details...">
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="py-8 text-center text-slate-500">Loading vendor details...</div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Vendor Details"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("..", { relative: "path" })}>Back</Button>
          <Button disabled>Ledger</Button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-2xl font-semibold text-slate-700">
                  {String(detail.name ?? "?").trim().charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <div className="text-3xl font-semibold text-slate-900">{String(detail.name ?? "-")}</div>
                  <div className="mt-1 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
                    {`Vendor Id : ${String(detail.vendorId ?? detail.id ?? "-")}`}
                  </div>
                </div>
              </div>
              <Button variant="outline" disabled>Edit</Button>
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="mb-4 text-2xl font-semibold text-slate-900">Basic Information</div>
            <div className="space-y-3">
              {detailRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[110px_1fr] gap-4 text-sm">
                  <div className="text-slate-500">{row.label}</div>
                  <div className="text-slate-900">{row.value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-2xl font-semibold text-slate-900">Bank Information</div>
              <Button variant="outline" disabled>Add</Button>
            </div>
            <div className="space-y-3">
              {bankRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[110px_1fr] gap-4 text-sm">
                  <div className="text-slate-500">{row.label}</div>
                  <div className="text-slate-900">{row.value}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard className="border-slate-200 shadow-sm">
          <div className="mb-4 flex items-center gap-6 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("expenses")}
              className={`border-b-2 px-2 py-3 text-sm font-semibold ${activeTab === "expenses" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`border-b-2 px-2 py-3 text-sm font-semibold ${activeTab === "payments" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
            >
              Payments
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Amount</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Payment Mode</th>
                  <th className="px-4 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center font-medium text-slate-500">
                      {activeTab === "expenses" ? "No expenses found" : "No payments found"}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-4">{row.date}</td>
                      <td className="px-4 py-4">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-4">{row.category}</td>
                      <td className="px-4 py-4">{row.paymentMode}</td>
                      <td className="px-4 py-4">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
