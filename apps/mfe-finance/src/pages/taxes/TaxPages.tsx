import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Icon,
  Input,
  Popover,
  SectionCard,
  Select,
  Switch,
  Textarea,
} from "@jaldee/design-system";
import type { ColumnDef } from "@jaldee/design-system";
import { useMFEProps } from "@jaldee/auth-context";
import { financeApi, sanitizeFinancePayload } from "../../lib/financeApi";
import { DataTableCard, FinanceFeatureLayout, PageShell } from "../../components/FinancePageLayout";

type TaxStatus = "Enabled" | "Disabled";
type TaxOption = { value: string; label: string };

const fallbackPercentageOptions: TaxOption[] = [
  { value: "0", label: "GST 0%" },
  { value: "5", label: "GST 5%" },
  { value: "12", label: "GST 12%" },
  { value: "18", label: "GST 18%" },
  { value: "28", label: "GST 28%" },
];

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

function readTaxCode(item: any) {
  return String(item?.taxCode ?? item?.code ?? item?.gstNumber ?? "").trim();
}

function readTaxAddress(item: any) {
  return String(item?.address ?? item?.gstAddress ?? "").trim();
}

function readTaxPercentage(item: any) {
  return Number(item?.percentage ?? item?.taxPercentage ?? item?.taxPercent ?? item?.gstPercentage ?? item?.gstPercent ?? item?.value ?? 0) || 0;
}

function isTaxEnabledValue(value: any) {
  return value === "Enabled" || value === true;
}

function readTaxEnabled(settings: any) {
  return (
    isTaxEnabledValue(settings?.enableTaxStatus) ||
    isTaxEnabledValue(settings?.taxStatus) ||
    isTaxEnabledValue(settings?.enableTax) ||
    isTaxEnabledValue(settings?.tax) ||
    isTaxEnabledValue(settings?.taxEnabled)
  );
}

function buildTaxPayload(input: {
  uid?: string; tenantUid?: string; countryCode: string; taxCode: string; taxName: string;
  taxRegime: string; status: TaxStatus; taxPercentage: number; cgst: number; sgst: number; igst: number; address?: string;
}) {
  const hasStateGst = input.cgst > 0 || input.sgst > 0;
  const hasIntegratedGst = input.igst > 0;
  return sanitizeFinancePayload({
    ...(input.uid ? { uid: input.uid } : {}),
    ...(input.tenantUid ? { tenantUid: input.tenantUid } : {}),
    countryCode: input.countryCode,
    taxCode: input.taxCode,
    taxName: input.taxName,
    name: input.taxName,
    displayName: input.taxName,
    taxRegime: input.taxRegime,
    status: input.status,
    enabled: input.status === "Enabled",
    taxPercentage: input.taxPercentage,
    percentage: input.taxPercentage,
    ...(hasStateGst
      ? { cgst: input.cgst, sgst: input.sgst }
      : hasIntegratedGst
        ? { igst: input.igst }
        : {}),
    address: input.address,
  });
}

function splitGstPercentage(taxPercentage: number) {
  if (taxPercentage <= 0) {
    return { cgst: 0, sgst: 0, igst: 0 };
  }
  return {
    cgst: taxPercentage / 2,
    sgst: taxPercentage / 2,
    igst: 0,
  };
}

function sortPercentages(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

async function loadTaxPercentageOptions(): Promise<TaxOption[]> {
  try {
    const response = await financeApi.taxes.byFilter<any>({ page: 0, size: 100 });
    const records = extractRecords(response.data);
    const percentages = sortPercentages(
      Array.from(
        new Set(
          records
            .map((item: any) => readTaxPercentage(item))
            .filter((value: number) => Number.isFinite(value))
        )
      )
    );
    if (!percentages.length) {
      return fallbackPercentageOptions;
    }
    return percentages.map((value) => ({ value: String(value), label: `GST ${value}%` }));
  } catch (error) {
    console.error("Failed to load tax percentages", error);
    return fallbackPercentageOptions;
  }
}

function TaxDetailsView({
  tax,
  taxEnabled,
  onEdit,
  onToggle,
  updating,
}: {
  tax: any;
  taxEnabled: boolean;
  onEdit: () => void;
  onToggle: (checked: boolean) => void;
  updating: boolean;
}) {
  return (
    <PageShell
      title="Tax"
      subtitle='Set up your tax requirements here. Enable the "Tax Settings" toggle switch to apply taxes for your services.'
      actions={<Button variant="outline" onClick={onEdit}>Edit</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="grid gap-6">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="space-y-5">
              <div>
                <div className="text-lg font-semibold text-slate-900">Tax details</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">15 digit GST number</div>
                <div className="mt-1 text-base font-medium text-slate-900">{readTaxCode(tax) || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Enter Name as in GST</div>
                <div className="mt-1 text-base font-medium text-slate-900">{readTaxName(tax) || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Tax Percentage</div>
                <div className="mt-1 text-base font-medium text-slate-900">{`GST ${readTaxPercentage(tax)}%`}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Enter Address as in GST</div>
                <div className="mt-1 whitespace-pre-wrap text-base font-medium text-slate-900">{readTaxAddress(tax) || "-"}</div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-10 rounded-full p-0"
              icon={<Icon name="edit2" className="h-4 w-4" />}
              aria-label="Edit tax"
              onClick={onEdit}
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-5">
            <div className="text-sm font-semibold text-slate-900">Tax Settings</div>
            <div className="flex items-center gap-3">
              <Switch checked={taxEnabled} disabled={updating} onChange={onToggle} />
              <span className={`text-sm font-semibold ${taxEnabled ? "text-emerald-600" : "text-slate-500"}`}>
                {taxEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}

function TaxesPage() {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [updatingTaxStatus, setUpdatingTaxStatus] = useState(false);

  async function loadTaxes() {
    setLoading(true);
    try {
      const [taxResponse, settingsResponse] = await Promise.all([
        financeApi.taxes.list<any>({
          page: 0,
          size: 100,
          sort: [{ field: "createdAt", direction: "DESC" }],
        }),
        financeApi.settings.provider<any>(),
      ]);
      setTaxes(extractRecords(taxResponse.data));
      setTaxEnabled(readTaxEnabled(settingsResponse.data));
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

  async function handleTaxFeatureToggle(checked: boolean) {
    setUpdatingTaxStatus(true);
    const nextStatus: TaxStatus = checked ? "Enabled" : "Disabled";
    try {
      await financeApi.settings.taxFeature(nextStatus);
      setTaxEnabled(checked);
    } catch (error) {
      console.error("Failed to update tax status", error);
      alert("Failed to update tax status");
    } finally {
      setUpdatingTaxStatus(false);
    }
  }

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      { key: "name", header: "Tax Name", render: (row) => readTaxName(row) || "-" },
      { key: "code", header: "Code", render: (row) => readTaxCode(row) || "-" },
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
              trigger={(
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  icon={<Icon name="moreVertical" className="h-4 w-4" />}
                  aria-label="Tax actions"
                />
              )}
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

  if (!loading && taxes.length > 0) {
    return (
      <TaxDetailsView
        tax={taxes[0]}
        taxEnabled={taxEnabled}
        updating={updatingTaxStatus}
        onEdit={() => navigate(`edit/${taxes[0].uid}`)}
        onToggle={handleTaxFeatureToggle}
      />
    );
  }

  return (
    <FinanceFeatureLayout
      title="Taxes"
      subtitle="Manage finance tax configurations and availability."
      actions={<Button onClick={() => navigate("create")}>Create Tax</Button>}
      main={
        taxes.length === 0 && !loading ? (
          <SectionCard className="border-slate-200 shadow-sm">
            <EmptyState
              title="No tax configuration"
              description="Enable tax settings and create your GST details to start applying taxes."
              action={<Button onClick={() => navigate("create")}>Create Tax</Button>}
            />
          </SectionCard>
        ) : (
          <DataTableCard
            title={`Tax List (${taxes.length})`}
            subtitle="Available finance taxes."
            data={taxes}
            columns={columns}
            getRowId={(row) => String(row.uid ?? row.id)}
            emptyTitle="No taxes"
            emptyDescription={loading ? "Loading..." : "Tax configurations will appear here."}
          />
        )
      }
    />
  );
}

function TaxCreatePage() {
  const navigate = useNavigate();
  const mfeProps = useMFEProps();
  const accountRecord = (mfeProps.account ?? {}) as Record<string, unknown>;
  const tenantUid = String(accountRecord.tenantUid ?? accountRecord.uid ?? accountRecord.id ?? "");
  const [gstNumber, setGstNumber] = useState("");
  const [gstName, setGstName] = useState("");
  const [taxPercentage, setTaxPercentage] = useState("18");
  const [gstAddress, setGstAddress] = useState("");
  const [percentageOptions, setPercentageOptions] = useState<TaxOption[]>(fallbackPercentageOptions);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void loadTaxPercentageOptions().then((options) => {
      if (!active) return;
      setPercentageOptions(options);
      if (!options.some((option) => option.value === taxPercentage) && options[0]) {
        setTaxPercentage(options[0].value);
      }
    });
    return () => {
      active = false;
    };
  }, [taxPercentage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!gstNumber.trim()) {
      setFormError("GST number is required.");
      return;
    }
    if (!gstName.trim()) {
      setFormError("Name as in GST is required.");
      return;
    }

    setSubmitting(true);
    try {
      const percentage = Number(taxPercentage) || 0;
      const components = splitGstPercentage(percentage);
      await financeApi.taxes.create(
        buildTaxPayload({
          tenantUid: tenantUid || undefined,
          countryCode: gstNumber.trim().slice(0, 2),
          taxCode: gstNumber.trim(),
          taxName: gstName.trim(),
          taxRegime: "GST",
          status: "Enabled",
          taxPercentage: percentage,
          cgst: components.cgst,
          sgst: components.sgst,
          igst: components.igst,
          address: gstAddress.trim() || undefined,
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
      subtitle="Set up your GST tax details."
      actions={<Button variant="outline" onClick={() => navigate("../..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <Input
              label="Enter 15 digit GST number *"
              value={gstNumber}
              maxLength={15}
              onChange={(event) => setGstNumber(event.target.value.toUpperCase())}
              required
            />
            <Input
              label="Enter Name as in GST"
              value={gstName}
              onChange={(event) => setGstName(event.target.value)}
              required
            />
            <Select
              label="Tax Percentage"
              value={taxPercentage}
              onChange={(event) => setTaxPercentage(event.target.value)}
              options={percentageOptions}
            />
            <Textarea
              label="Enter Address as in GST"
              value={gstAddress}
              onChange={(event) => setGstAddress(event.target.value)}
              rows={4}
            />
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
  const [gstNumber, setGstNumber] = useState("");
  const [gstName, setGstName] = useState("");
  const [taxPercentage, setTaxPercentage] = useState("18");
  const [gstAddress, setGstAddress] = useState("");
  const [percentageOptions, setPercentageOptions] = useState<TaxOption[]>(fallbackPercentageOptions);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadTax() {
      if (!id) return;
      try {
        const [taxResponse, options] = await Promise.all([
          financeApi.taxes.detail<any>(id),
          loadTaxPercentageOptions(),
        ]);
        if (!active) return;
        setPercentageOptions(options);
        const data = taxResponse.data;
        setGstNumber(readTaxCode(data));
        setGstName(readTaxName(data));
        const percentageValue = String(readTaxPercentage(data) || 0);
        setTaxPercentage(percentageValue);
        setGstAddress(readTaxAddress(data));
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
    if (!gstNumber.trim()) {
      setFormError("GST number is required.");
      return;
    }
    if (!gstName.trim()) {
      setFormError("Name as in GST is required.");
      return;
    }

    setSubmitting(true);
    try {
      const percentage = Number(taxPercentage) || 0;
      const components = splitGstPercentage(percentage);
      await financeApi.taxes.update(
        id,
        buildTaxPayload({
          uid: id,
          tenantUid: tenantUid || undefined,
          countryCode: gstNumber.trim().slice(0, 2),
          taxCode: gstNumber.trim(),
          taxName: gstName.trim(),
          taxRegime: "GST",
          status: "Enabled",
          taxPercentage: percentage,
          cgst: components.cgst,
          sgst: components.sgst,
          igst: components.igst,
          address: gstAddress.trim() || undefined,
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
      subtitle="Update GST tax details."
      actions={<Button variant="outline" onClick={() => navigate("..", { relative: "path" })}>Back</Button>}
    >
      <SectionCard className="border-slate-200 shadow-sm">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <Input
              label="Enter 15 digit GST number *"
              value={gstNumber}
              maxLength={15}
              onChange={(event) => setGstNumber(event.target.value.toUpperCase())}
              required
            />
            <Input
              label="Enter Name as in GST"
              value={gstName}
              onChange={(event) => setGstName(event.target.value)}
              required
            />
            <Select
              label="Tax Percentage"
              value={taxPercentage}
              onChange={(event) => setTaxPercentage(event.target.value)}
              options={percentageOptions}
            />
            <Textarea
              label="Enter Address as in GST"
              value={gstAddress}
              onChange={(event) => setGstAddress(event.target.value)}
              rows={4}
            />
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
