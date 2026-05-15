import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Input, SectionCard, Select, Textarea } from "@jaldee/design-system";
import { useSharedModulesContext } from "../../context";
import {
  useCreateFinanceExpense,
  useCreateFinancePayout,
  useCreateFinanceRevenue,
  useFinanceCategories,
  useFinancePaginatedVendors,
  useFinanceStatuses,
} from "../queries/finance";
import { SharedFinanceLayout } from "./shared";

type MoneyCreateKind = "expense" | "revenue" | "payout";

const config = {
  expense: {
    title: "Create Expense",
    listPath: "/finance/expense",
    categoryType: "Expense" as const,
    statusType: "Expense" as const,
    dateField: "expenseDate",
    labelField: "expenseFor",
    categoryField: "expenseCategoryId",
    statusField: "expenseStatus",
    dateLabel: "Expense Date",
    labelLabel: "Expense For",
    successPath: "/finance/expense",
  },
  revenue: {
    title: "Create Revenue",
    listPath: "/finance/receivables",
    categoryType: "PaymentsInOut" as const,
    statusType: "PaymentsInOut" as const,
    dateField: "receivedDate",
    labelField: "paymentsInLabel",
    categoryField: "paymentsInCategoryId",
    statusField: "paymentsInStatus",
    dateLabel: "Received Date",
    labelLabel: "Revenue From",
    successPath: "/finance/receivables",
  },
  payout: {
    title: "Create Payout",
    listPath: "/finance/payments",
    categoryType: "PaymentsInOut" as const,
    statusType: "PaymentsInOut" as const,
    dateField: "paidDate",
    labelField: "paymentsOutLabel",
    categoryField: "paymentsOutCategoryId",
    statusField: "paymentsOutStatus",
    dateLabel: "Paid Date",
    labelLabel: "Payout For",
    successPath: "/finance/payments",
  },
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(error: unknown) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Could not create record.";
}

export function FinanceMoneyCreate({ kind }: { kind: MoneyCreateKind }) {
  const cfg = config[kind];
  const { location, navigate } = useSharedModulesContext();
  const categoriesQuery = useFinanceCategories(cfg.categoryType);
  const statusesQuery = useFinanceStatuses(cfg.statusType);
  const vendorsQuery = useFinancePaginatedVendors({ from: 0, count: 100 });
  const createExpense = useCreateFinanceExpense();
  const createRevenue = useCreateFinanceRevenue();
  const createPayout = useCreateFinancePayout();
  const mutation = kind === "expense" ? createExpense : kind === "revenue" ? createRevenue : createPayout;

  const categories = categoriesQuery.data ?? [];
  const statuses = statusesQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const [categoryId, setCategoryId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [vendorUid, setVendorUid] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [label, setLabel] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!categoryId && categories.length) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  useEffect(() => {
    if (!statusId && statuses.length) setStatusId(statuses[0].id);
  }, [statuses, statusId]);

  const vendorOptions = useMemo(
    () => vendors.map((vendor) => ({ value: vendor.encId, label: vendor.name })),
    [vendors]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const parsedAmount = Number(amount);

    if (!label.trim()) {
      setFormError(`${cfg.labelLabel} is required.`);
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    const payload: Record<string, unknown> = {
      [cfg.categoryField]: categoryId || undefined,
      [cfg.dateField]: date,
      [cfg.labelField]: label.trim(),
      referenceNo: referenceNo.trim() || undefined,
      amount: parsedAmount,
      vendorUid: vendorUid || undefined,
      [cfg.statusField]: statusId || undefined,
      locationId: location?.id ?? undefined,
      description: description.trim() || undefined,
      paymentInfo: {
        paymentMode,
      },
    };

    if (kind === "expense") {
      payload.paymentInfo = paymentMode ? [{ paymentMode }] : undefined;
    }

    await mutation.mutateAsync(payload);
    navigate?.(cfg.successPath);
  };

  return (
    <SharedFinanceLayout
      title={cfg.title}
      subtitle="Create a finance record for the active location."
      actions={<Button variant="outline" onClick={() => navigate?.(cfg.listPath)}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              options={[
                { value: "", label: categoriesQuery.isLoading ? "Loading categories..." : "Select category" },
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ]}
            />
            <Select
              label="Status"
              value={statusId}
              onChange={(event) => setStatusId(event.target.value)}
              options={[
                { value: "", label: statusesQuery.isLoading ? "Loading statuses..." : "Select status" },
                ...statuses.map((status) => ({ value: status.id, label: status.name })),
              ]}
            />
            <Input label={cfg.dateLabel} type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            <Input label={cfg.labelLabel} value={label} onChange={(event) => setLabel(event.target.value)} required />
            <Input label="Reference No." value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} />
            <Input label="Amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            <Select
              label="Vendor"
              value={vendorUid}
              onChange={(event) => setVendorUid(event.target.value)}
              options={[{ value: "", label: vendorsQuery.isLoading ? "Loading vendors..." : "Select vendor" }, ...vendorOptions]}
            />
            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value)}
              options={[
                { value: "Cash", label: "Cash" },
                { value: "CC", label: "Credit Card" },
                { value: "DC", label: "Debit Card" },
                { value: "NB", label: "Net banking" },
                { value: "UPI", label: "UPI" },
              ]}
            />
          </div>

          <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />

          {(formError || mutation.isError) && (
            <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-[length:var(--text-sm)] font-medium text-red-700">
              {formError || errorMessage(mutation.error)}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate?.(cfg.listPath)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : cfg.title}
            </Button>
          </div>
        </form>
      </SectionCard>
    </SharedFinanceLayout>
  );
}
