import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMFEProps } from "@jaldee/auth-context";
import {
  Button,
  Icon,
  SectionCard,
  Badge,
} from "@jaldee/design-system";
import { financeApi } from "../../lib/financeApi";
import { formatCurrency } from "../../lib/financeData";
import { PageShell } from "../../components/FinancePageLayout";

export default function ExpenseDetailPage() {
  const mfeProps = useMFEProps();
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ?? "";
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [categoryName, setCategoryName] = useState("");
  const [statusName, setStatusName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    let active = true;

    function extractRecords(payload: any) {
      return Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.content)
          ? payload.content
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.data?.content)
              ? payload.data.content
              : [];
    }

    async function loadDetailData() {
      setLoading(true);
      try {
        const [categoriesResult, statusesResult, vendorsResult, locationsResult, detailResult] = await Promise.allSettled([
          financeApi.categories.search<any>({
            page: 0,
            size: 100,
            sort: [{ field: "createdAt", direction: "DESC" }],
            filters: { field: "categoryType", operator: "IN", values: ["Expense"] },
            view: "SUMMARY",
          }),
          financeApi.statuses.search<any>({
            page: 0,
            size: 100,
            sort: [{ field: "createdAt", direction: "DESC" }],
            filters: { field: "categoryType", operator: "IN", values: ["Expense"] },
            view: "SUMMARY",
          }),
          financeApi.vendors.search<any>({
            page: 0,
            size: 100,
            sort: [{ field: "createdAt", direction: "DESC" }],
            view: "SUMMARY",
          }),
          financeApi.locations.tenant<any>({
            page: 0,
            size: 100,
          }),
          financeApi.expenses.detail<any>(id),
        ]);

        if (!active) return;

        const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
        const statusesResponse = statusesResult.status === "fulfilled" ? statusesResult.value : null;
        const vendorsResponse = vendorsResult.status === "fulfilled" ? vendorsResult.value : null;
        const locationsResponse = locationsResult.status === "fulfilled" ? locationsResult.value : null;
        const detailResponse = detailResult.status === "fulfilled" ? detailResult.value : null;

        const categories = extractRecords(categoriesResponse?.data);
        const statuses = extractRecords(statusesResponse?.data);
        const vendors = extractRecords(vendorsResponse?.data);
        const locations = extractRecords(locationsResponse?.data);
        const expenseDetail = detailResponse?.data ?? {};

        setDetail(expenseDetail);

        // Find Category Name
        const catUid = String(expenseDetail.categoryUid ?? expenseDetail.categoryId ?? "");
        const matchedCat = categories.find((item: any) =>
          String(item.uid ?? item.categoryId ?? item.configCategoryId ?? item.id ?? item.encId ?? "") === catUid
        );
        setCategoryName(matchedCat ? String(matchedCat.name ?? matchedCat.categoryName ?? "") : String(expenseDetail.categoryName || "-"));

        // Find Status Name
        const statUid = String(expenseDetail.statusUid ?? expenseDetail.statusId ?? "");
        const matchedStat = statuses.find((item: any) =>
          String(item.uid ?? item.id ?? item.encId ?? "") === statUid
        );
        const defaultStatus = expenseDetail.payoutCreated ? "Converted" : "New";
        setStatusName(matchedStat ? String(matchedStat.name ?? matchedStat.statusName ?? "") : String(expenseDetail.expenseStatusName || expenseDetail.statusName || defaultStatus));

        // Find Vendor Name
        const vendUid = String(expenseDetail.vendorUid ?? expenseDetail.consumerUid ?? "");
        const matchedVend = vendors.find((item: any) =>
          String(item.encId ?? item.uid ?? item.id ?? "") === vendUid
        );
        const providerConsumer = expenseDetail?.providerConsumerDto;
        const customerName = providerConsumer?.firstName
          ? `${providerConsumer.firstName} ${providerConsumer.lastName ?? ""}`.trim()
          : String(expenseDetail?.customerName || expenseDetail?.consumerName || expenseDetail?.payerName || "");
        setVendorName(matchedVend ? String(matchedVend.name ?? matchedVend.vendorName ?? "") : String(expenseDetail.vendorName || customerName || "-"));

        // Find Location Name
        const locUid = String(expenseDetail.locationUid ?? expenseDetail.locationId ?? "");
        const matchedLoc = locations.find((item: any) =>
          String(item.locationUid ?? item.uid ?? item.id ?? item.locationId ?? "") === locUid
        );
        setLocationName(matchedLoc ? String(matchedLoc.place ?? matchedLoc.name ?? matchedLoc.locationName ?? "") : String(expenseDetail.locationName || "-"));

      } catch (error) {
        console.error("[mfe-finance] Failed to load expense details", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDetailData();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <PageShell title="Expense Details" subtitle="Loading expense record..." back={{ label: "Back to Expenses", href: "/expense" }}>
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading expense details...</span>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  if (!detail) {
    return (
      <PageShell title="Expense Details" subtitle="Record not found" back={{ label: "Back to Expenses", href: "/expense" }}>
        <SectionCard className="border-slate-200 shadow-sm">
          <div className="py-12 text-center text-slate-500">
            <Icon name="alert" className="mx-auto h-12 w-12 text-amber-500 mb-3" />
            <p className="text-base font-semibold">Could not find this expense record.</p>
            <Button className="mt-4" onClick={() => navigate("/expense")}>
              Back to list
            </Button>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  const amountValue = Number(detail.amount || detail.expenseAmount || 0);
  const amountPaidValue = Number(detail.amountPaid || detail.paidAmount || 0);
  const amountDueValue = Number(detail.amountDue || detail.balanceAmount || (amountValue - amountPaidValue));
  const bookedDate = detail.expenseDate || detail.paidDate || detail.createdDate;
  const formattedDate = bookedDate
    ? new Date(bookedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "-";

  // Map status color variant
  let statusVariant: "success" | "warning" | "danger" | "neutral" = "neutral";
  const normalizedStatus = statusName.toLowerCase();
  if (detail.payoutCreated || normalizedStatus.includes("converted") || normalizedStatus.includes("paid") || normalizedStatus.includes("success") || normalizedStatus.includes("complete")) {
    statusVariant = "success";
  } else if (normalizedStatus.includes("pending") || normalizedStatus.includes("new") || normalizedStatus.includes("draft")) {
    statusVariant = "warning";
  } else if (normalizedStatus.includes("cancel") || normalizedStatus.includes("failed") || normalizedStatus.includes("reject")) {
    statusVariant = "danger";
  }

  return (
    <PageShell
      title="Expense Details"
      subtitle="Operational and compliance expense tracking details."
      back={{ label: "Back to Expenses", href: "/expense" }}
      actions={
        <div className="flex gap-2">
          {!detail.payoutCreated && (
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 text-sm font-semibold border-slate-200 hover:bg-slate-50"
              onClick={() => navigate(`/finance/expense/edit/${id}`)}
            >
              Edit
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main Details Section */}
        <div className="space-y-6">
          {/* Hero Amount Card */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-primary-muted)] bg-[var(--color-surface)] p-6 shadow-sm">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-40 w-40 rounded-full bg-[var(--color-primary-subtle)] opacity-40 blur-2xl pointer-events-none" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Total Expense Amount
                </span>
                <div className="mt-1 text-3xl font-extrabold text-[var(--color-text-primary)]">
                  {formatCurrency(amountValue)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-500">Status:</span>
                <Badge variant={statusVariant} className="text-xs font-bold uppercase tracking-wider px-3 py-1">
                  {statusName}
                </Badge>
              </div>
            </div>
            {(detail.referenceNo || detail.expenseNum) && (
              <div className="mt-4 border-t border-slate-100 pt-4 flex flex-wrap items-center gap-6 text-sm text-[var(--color-text-secondary)]">
                {detail.expenseNum && (
                  <div>
                    <span className="font-semibold text-slate-700">Expense ID:</span>{" "}
                    <code className="bg-slate-50 px-2 py-0.5 rounded font-mono text-xs">#{detail.expenseNum}</code>
                  </div>
                )}
                {detail.referenceNo && (
                  <div>
                    <span className="font-semibold text-slate-700">Reference No:</span>{" "}
                    <code className="bg-slate-50 px-2 py-0.5 rounded font-mono text-xs">{detail.referenceNo}</code>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details Info Grid */}
          <SectionCard title="Expense Information" className="border-slate-200 shadow-sm">
            <dl className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Expense Title / Label
                </dt>
                <dd className="mt-1.5 text-base font-semibold text-[var(--color-text-primary)]">
                  {detail.expenseFor || detail.title || "-"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Booked Date
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
                  {formattedDate}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Expense Category
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  {categoryName}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Amount Paid
                </dt>
                <dd className="mt-1.5 text-sm font-bold text-emerald-600">
                  {formatCurrency(amountPaidValue)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Amount Due
                </dt>
                <dd className="mt-1.5 text-sm font-bold text-rose-600">
                  {formatCurrency(amountDueValue)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Payment Mode
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
                  {detail.mode || detail.paymentMode || "Cash"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Created By / Owner
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
                  {detail.createdByName || detail.userName || "Finance"}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>

        {/* Sidebar Sections */}
        <div className="space-y-6">
          {/* Associated Entities Card */}
          <SectionCard title="Associated Entities" className="border-slate-200 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon name="globe" className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--color-text-secondary)]">Location</div>
                  <div className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">
                    {locationName}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Icon name="list" className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--color-text-secondary)]">Vendor</div>
                  <div className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">
                    {vendorName}
                  </div>
                </div>
              </div>

              {detail.payoutCreated && (
                <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Icon name="layers" className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[var(--color-text-secondary)]">Payout Status</div>
                    <div className="mt-0.5 text-sm font-semibold text-violet-700">
                      Converted to Payout
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Notes Card */}
          {detail.description && (
            <SectionCard title="Notes / Description" className="border-slate-200 shadow-sm">
              <div className="rounded-xl border-l-4 border-[var(--color-primary)] bg-slate-50/50 p-3 text-sm text-[var(--color-text-secondary)] italic leading-relaxed">
                "{detail.description}"
              </div>
            </SectionCard>
          )}

          {/* Uploaded Documents Card */}
          {Array.isArray(detail.uploadedDocuments) && detail.uploadedDocuments.length > 0 ? (
            <SectionCard title="Uploaded Documents / Attachments" className="border-slate-200 shadow-sm">
              <div className="grid gap-2">
                {detail.uploadedDocuments.map((attachment: any, index: number) => {
                  const title = String(attachment?.fileName || attachment?.caption || `Attachment ${index + 1}`);
                  const fileUrl = String(attachment?.shortUrl || attachment?.filePath || attachment?.url || "").trim();
                  return (
                    <div key={attachment?.fileUid || `${title}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold uppercase text-xs">
                          {title.split(".").pop()?.slice(0, 4) || "FILE"}
                        </div>
                        <div className="truncate font-medium text-slate-800">{title}</div>
                      </div>
                      {fileUrl && (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-indigo-600 hover:text-indigo-800 text-xs">
                          View / Download
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
