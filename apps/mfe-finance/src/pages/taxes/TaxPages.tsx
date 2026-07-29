import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Icon,
  Input,
  PageHeader,
  Popover,
  SectionCard,
  Select,
  Switch,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { DataTableCard, FinanceFeatureLayout, PageShell } from "../../components/FinancePageLayout";

type TaxStatus = "Enabled" | "Disabled";

function extractRecords(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function readTaxName(item: any) {
  return String(item?.name ?? item?.displayName ?? item?.taxName ?? item?.label ?? item?.taxLabel ?? "").trim();
}

function readTaxPercentage(item: any) {
  return Number(item?.percentage ?? item?.taxPercentage ?? item?.taxPercent ?? item?.gstPercentage ?? item?.gstPercent ?? item?.value ?? 0) || 0;
}

function buildTaxPayload(input: {
  uid?: string; tenantUid?: string; countryCode: string; taxCode: string; taxName: string;
  taxRegime: string; status: TaxStatus; taxPercentage: number; cgst: number; sgst: number; igst: number;
}) {
  return sanitizeFinancePayload({
    ...(input.uid ? { uid: input.uid } : {}),
    ...(input.tenantUid ? { tenantUid: input.tenantUid } : {}),
    countryCode: input.countryCode, taxCode: input.taxCode, taxName: input.taxName,
    name: input.taxName, displayName: input.taxName, taxRegime: input.taxRegime,
    status: input.status, enabled: input.status === "Enabled",
    taxPercentage: input.taxPercentage, percentage: input.taxPercentage,
    cgst: input.cgst, sgst: input.sgst, igst: input.igst,
  });
}

function TaxesPage() {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTaxes() {
    setLoading(true);
    try {
      const res = await financeApi.taxes.list<any>({
        page: 0,
        size: 100,
        sort: [{ field: "createdAt", direction: "DESC" }],
      });
      setTaxes(extractRecords(res.data));
    } catch (error) {
      console.error("Failed to fetch taxes", error);
      setTaxes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTaxes();
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "name", header: "Tax Name", render: (row) => readTaxName(row) || "-" },
      { key: "code", header: "Code", render: (row) => String(row.code ?? row.taxCode ?? "-") },
      { key: "percentage", header: "Percentage", align: "right", render: (row) => `${readTaxPercentage(row)}%` },
      {
        key: "status",
        header: "Status",
        render: (row) => {
          const status = String(row.status ?? "Enabled");
          return <Badge variant={status === "Enabled" ? "success" : "neutral"}>{status}</Badge>;
        },
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`edit/${row.uid}`)}>
              Edit
            </Button>
            <Popover
              portal
              placement="bottom"
              align="end"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                  aria-label="Tax actions"
                />
              }
            >
              <div className="grid min-w-[220px] p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start font-normal"
                  onClick={async () => {
                    const nextStatus: TaxStatus = String(row.status ?? "Enabled") === "Enabled" ? "Disabled" : "Enabled";
                    try {
                      await financeApi.taxes.updateStatus(String(row.uid), nextStatus);
                      await loadTaxes();
                    } catch (error) {
                      console.error("Failed to update tax status", error);
                      alert("Failed to update tax status");
                    }
                  }}
                >
                  {String(row.status ?? "Enabled") === "Enabled" ? "Disable" : "Enable"}
                </Button>
              </div>
            </Popover>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <FinanceFeatureLayout
      title="Taxes"
      subtitle="Manage finance tax configurations and availability."
      actions={<Button onClick={() => navigate("create")}>Create Tax</Button>}
      main={
        <DataTableCard
          title={`Tax List (${taxes.length})`}
          subtitle="Available finance taxes."
          data={taxes}
          columns={columns}
          getRowId={(row) => String(row.uid ?? row.id)}
          emptyTitle="No taxes"
          emptyDescription={loading ? "Loading..." : "Tax configurations will appear here."}
        />
      }
    />
  );
}

function TaxCreatePage() {
  const navigate = useNavigate();
  const mfeProps = useMFEProps();
  const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
  const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
  const [countryCode, setCountryCode] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [taxName, setTaxName] = useState("");
  const [taxRegime, setTaxRegime] = useState("GST");
  const [status, setStatus] = useState<TaxStatus>("Enabled");
  const [taxPercentage, setTaxPercentage] = useState("");
  const [cgst, setCgst] = useState("");
  const [sgst, setSgst] = useState("");
  const [igst, setIgst] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!taxName.trim()) {
      setFormError("Tax name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.taxes.create(
        buildTaxPayload({
          tenantUid: tenantUid || undefined,
          countryCode,
          taxCode,
          taxName,
          taxRegime,
          status,
          taxPercentage: Number(taxPercentage) || 0,
          cgst: Number(cgst) || 0,
          sgst: Number(sgst) || 0,
          igst: Number(igst) || 0,
        })
      );
      navigate("..", { relative: "path", replace: true });
    } catch (error) {
      console.error("[mfe-finance] Failed to create tax", error);
      setFormError(error instanceof Error ? error.message : "Could not create tax.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Create Tax"
      subtitle="Add a finance tax configuration."
      actions={<Button variant="outline" onClick={() => navigate("../..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Country Code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} />
            <Input label="Tax Code" value={taxCode} onChange={(event) => setTaxCode(event.target.value)} />
            <Input label="Tax Name *" value={taxName} onChange={(event) => setTaxName(event.target.value)} required />
            <Select
              label="Tax Regime"
              value={taxRegime}
              onChange={(event) => setTaxRegime(event.target.value)}
              options={[{ value: "GST", label: "GST" }]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaxStatus)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
            <Input label="Tax Percentage" type="number" min="0" step="0.01" value={taxPercentage} onChange={(event) => setTaxPercentage(event.target.value)} />
            <Input label="CGST" type="number" min="0" step="0.01" value={cgst} onChange={(event) => setCgst(event.target.value)} />
            <Input label="SGST" type="number" min="0" step="0.01" value={sgst} onChange={(event) => setSgst(event.target.value)} />
            <Input label="IGST" type="number" min="0" step="0.01" value={igst} onChange={(event) => setIgst(event.target.value)} />
          </div>
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create Tax"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

function TaxEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const mfeProps = useMFEProps();
  const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
  const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
  const [countryCode, setCountryCode] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [taxName, setTaxName] = useState("");
  const [taxRegime, setTaxRegime] = useState("GST");
  const [status, setStatus] = useState<TaxStatus>("Enabled");
  const [taxPercentage, setTaxPercentage] = useState("");
  const [cgst, setCgst] = useState("");
  const [sgst, setSgst] = useState("");
  const [igst, setIgst] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadTax() {
      if (!id) return;
      try {
        const res = await financeApi.taxes.detail<any>(id);
        const data = res.data;
        if (!active || !data) return;
        setCountryCode(String(data.countryCode ?? ""));
        setTaxCode(String(data.taxCode ?? data.code ?? ""));
        setTaxName(String(data.taxName ?? data.name ?? ""));
        setTaxRegime(String(data.taxRegime ?? "GST"));
        setStatus((data.status ?? "Enabled") as TaxStatus);
        setTaxPercentage(String(data.taxPercentage ?? data.percentage ?? data.taxPercent ?? 0));
        setCgst(String(data.cgst ?? 0));
        setSgst(String(data.sgst ?? 0));
        setIgst(String(data.igst ?? 0));
      } catch (error) {
        console.error("Failed to load tax", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadTax();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!id) return;
    if (!taxName.trim()) {
      setFormError("Tax name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.taxes.update(
        id,
        buildTaxPayload({
          uid: id,
          tenantUid: tenantUid || undefined,
          countryCode,
          taxCode,
          taxName,
          taxRegime,
          status,
          taxPercentage: Number(taxPercentage) || 0,
          cgst: Number(cgst) || 0,
          sgst: Number(sgst) || 0,
          igst: Number(igst) || 0,
        })
      );
      navigate("../..", { relative: "path", replace: true });
    } catch (error) {
      console.error("[mfe-finance] Failed to update tax", error);
      setFormError(error instanceof Error ? error.message : "Could not update tax.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading tax...</div>;
  }

  return (
    <PageShell
      title="Edit Tax"
      subtitle="Update finance tax configuration."
      actions={<Button variant="outline" onClick={() => navigate("..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Country Code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} />
            <Input label="Tax Code" value={taxCode} onChange={(event) => setTaxCode(event.target.value)} />
            <Input label="Tax Name *" value={taxName} onChange={(event) => setTaxName(event.target.value)} required />
            <Select
              label="Tax Regime"
              value={taxRegime}
              onChange={(event) => setTaxRegime(event.target.value)}
              options={[{ value: "GST", label: "GST" }]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaxStatus)}
              options={[
                { value: "Enabled", label: "Enabled" },
                { value: "Disabled", label: "Disabled" },
              ]}
            />
            <Input label="Tax Percentage" type="number" min="0" step="0.01" value={taxPercentage} onChange={(event) => setTaxPercentage(event.target.value)} />
            <Input label="CGST" type="number" min="0" step="0.01" value={cgst} onChange={(event) => setCgst(event.target.value)} />
            <Input label="SGST" type="number" min="0" step="0.01" value={sgst} onChange={(event) => setSgst(event.target.value)} />
            <Input label="IGST" type="number" min="0" step="0.01" value={igst} onChange={(event) => setIgst(event.target.value)} />
          </div>
          {formError ? <div className="rounded-[var(--radius-control)] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("../..", { relative: "path" })}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Update Tax"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageShell>
  );
}

export { TaxesPage, TaxCreatePage, TaxEditPage };
