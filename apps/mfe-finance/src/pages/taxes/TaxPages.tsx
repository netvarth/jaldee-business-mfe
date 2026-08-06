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

function buildTaxDetailsSource(settings: any, taxes: any[]) {
  const primaryTax = Array.isArray(taxes) && taxes.length > 0 ? taxes[0] : {};
  return {
    ...primaryTax,
    taxCode: String(settings?.gstNumber ?? "").trim() || primaryTax?.taxCode,
    gstNumber: String(settings?.gstNumber ?? "").trim() || primaryTax?.gstNumber,
    taxName: String(settings?.nameAsInGst ?? "").trim() || primaryTax?.taxName,
    name: String(settings?.nameAsInGst ?? "").trim() || primaryTax?.name,
    displayName: String(settings?.nameAsInGst ?? "").trim() || primaryTax?.displayName,
    gstAddress: String(settings?.gstAddress ?? "").trim() || primaryTax?.gstAddress,
    address: String(settings?.gstAddress ?? "").trim() || primaryTax?.address,
    taxPercentage: Number(settings?.taxPercentage) || primaryTax?.taxPercentage || 0,
    percentage: Number(settings?.taxPercentage) || primaryTax?.percentage || 0,
  };
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

function buildTaxPercentageOptions(records: any[]): TaxOption[] {
  const fallbackValues = fallbackPercentageOptions.map((option) => Number(option.value));
  const percentages = sortPercentages(
    Array.from(
      new Set(
        [...records.map((item: any) => readTaxPercentage(item)), ...fallbackValues]
          .filter((value: number) => Number.isFinite(value))
      )
    )
  );

  return percentages.map((value) => ({ value: String(value), label: `GST ${value}%` }));
}

async function loadTaxPercentageOptions(): Promise<TaxOption[]> {
  try {
    const response = await financeApi.taxes.byFilter<any>({ taxType: "GST" });
    const records = extractRecords(response.data);
    const options = buildTaxPercentageOptions(records);
    if (!options.length) {
      return fallbackPercentageOptions;
    }
    return options;
  } catch (error) {
    console.error("Failed to load tax percentages", error);
    return fallbackPercentageOptions;
  }
}

async function loadTaxCreationContext() {
  const [taxResponse, settingsResponse] = await Promise.all([
    financeApi.taxes.byFilter<any>({ taxType: "GST" }),
    financeApi.settings.provider<any>(),
  ]);

  return {
    taxes: extractRecords(taxResponse.data),
    settings: settingsResponse.data || {},
  };
}

function buildTaxSettingsPayload(input: {
  currentSettings: any;
  tenantUid?: string;
  gstNumber: string;
  gstName: string;
  gstAddress: string;
  taxPercentage: number;
  taxDtos: any[];
}) {
  const updatedTaxes = input.taxDtos.map((tax: any) => tax.uid).filter(Boolean);

  return sanitizeFinancePayload({
    ...input.currentSettings,
    tenantUid: input.tenantUid || input.currentSettings?.tenantUid,
    enableTax: true,
    taxPercentage: input.taxPercentage,
    gstNumber: input.gstNumber,
    nameAsInGst: input.gstName,
    gstAddress: input.gstAddress,
    taxes: updatedTaxes,
    taxDtos: input.taxDtos,
    taxPreference: input.currentSettings?.taxPreference ?? "NON_TAXABLE",
  });
}

async function saveTaxRecord(input: {
  uid?: string;
  tenantUid?: string;
  gstNumber: string;
  gstName: string;
  gstAddress: string;
  taxPercentage: number;
}) {
  const components = splitGstPercentage(input.taxPercentage);
  const taxPayload = buildTaxPayload({
    ...(input.uid ? { uid: input.uid } : {}),
    tenantUid: input.tenantUid,
    countryCode: "IN",
    taxCode: input.gstNumber.trim(),
    taxName: input.gstName.trim(),
    taxRegime: "GST",
    status: "Enabled",
    taxPercentage: input.taxPercentage,
    cgst: components.cgst,
    sgst: components.sgst,
    igst: components.igst,
    address: input.gstAddress.trim(),
  });

  if (input.uid) {
    const response = await financeApi.taxes.update<any>(input.uid, taxPayload);
    return response.data;
  }

  const response = await financeApi.taxes.create<any>(taxPayload);
  return response.data;
}

function resolveTaxUid(payload: any, fallbackUid = "") {
  return String(payload?.uid ?? payload?.id ?? fallbackUid).trim();
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
  const taxCode = readTaxCode(tax) || "-";
  const taxName = readTaxName(tax) || "-";
  const taxAddress = readTaxAddress(tax) || "-";
  const taxPercentage = readTaxPercentage(tax);
  const taxStatus = String(tax?.status ?? (taxEnabled ? "Enabled" : "Disabled"));

  return (
    <PageShell
      title="Tax"
      subtitle='Set up your tax requirements here. Enable the "Tax Settings" toggle switch to apply taxes for your services.'
      back={{ label: "Back to Finance Settings", href: "/settings" }}
      actions={<Button variant="outline" onClick={onEdit}>Edit</Button>}
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <SectionCard className="hidden overflow-hidden border-slate-200 shadow-sm xl:block">
          <div className="h-24 bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-hover)_100%)]" />
          <div className="-mt-9 px-6 pb-6">
            <div className="flex h-18 w-18 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-lg font-extrabold text-[var(--color-primary)]">
                GST
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xl font-extrabold tracking-tight text-slate-950">{taxName}</div>
                <div className="mt-1 text-sm font-medium text-slate-500">{taxCode}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={taxStatus === "Enabled" ? "success" : "neutral"}>{taxStatus}</Badge>
                <Badge variant="neutral">{`GST ${taxPercentage}%`}</Badge>
              </div>
              <Button
                variant="outline"
                className="mt-1 w-full rounded-xl border-[var(--color-primary-muted)] text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
                icon={<Icon name="edit2" className="h-4 w-4" />}
                onClick={onEdit}
              >
                Edit Tax
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Tax Percentage</div>
                <div className="mt-1 text-lg font-bold text-slate-950">{`GST ${taxPercentage}%`}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Tax Code</div>
                <div className="mt-1 break-all text-sm font-semibold text-slate-900">{taxCode}</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard className="border-slate-200 shadow-sm">
            <div className="grid gap-6">
              <div className="border-b border-slate-200 pb-4">
                <div className="text-xl font-extrabold tracking-tight text-slate-950">Tax Details</div>
                <div className="mt-1 text-sm text-slate-500">Registered GST identity and rate information for finance transactions.</div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">GST Number</div>
                  <div className="mt-2 break-all text-base font-bold text-slate-950">{taxCode}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Name As In GST</div>
                  <div className="mt-2 text-base font-bold text-slate-950">{taxName}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Tax Percentage</div>
                  <div className="mt-2 text-base font-bold text-slate-950">{`GST ${taxPercentage}%`}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Current Status</div>
                  <div className="mt-2">
                    <Badge variant={taxStatus === "Enabled" ? "success" : "neutral"}>{taxStatus}</Badge>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:col-span-2">
                  <div className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Address As In GST</div>
                  <div className="mt-2 whitespace-pre-wrap text-base font-medium text-slate-900">{taxAddress}</div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="border-slate-200 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-extrabold tracking-tight text-slate-950">Tax Settings</div>
                <div className="mt-1 text-sm text-slate-500">Control whether this GST configuration is available across finance flows.</div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Switch checked={taxEnabled} disabled={updating} onChange={onToggle} />
                <span className={`text-sm font-bold ${taxEnabled ? "text-emerald-600" : "text-slate-500"}`}>
                  {taxEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}

function TaxesPage() {
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [taxSettings, setTaxSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [updatingTaxStatus, setUpdatingTaxStatus] = useState(false);

  async function loadTaxes() {
    setLoading(true);
    try {
      const [taxResponse, settingsResponse] = await Promise.all([
        financeApi.taxes.byFilter<any>({}),
        financeApi.settings.provider<any>(),
      ]);
      setTaxes(extractRecords(taxResponse.data));
      setTaxSettings(settingsResponse.data || {});
      setTaxEnabled(readTaxEnabled(settingsResponse.data));
    } catch (error) {
      console.error("Failed to fetch taxes", error);
      setTaxes([]);
      setTaxSettings({});
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
                      if (row.uid) {
                        await financeApi.taxes.updateStatus(String(row.uid), nextStatus);
                      }
                      const settingsResponse = await financeApi.settings.provider<any>();
                      const currentSettings = settingsResponse.data || {};
                      const existingTaxDtos = Array.isArray(currentSettings.taxDtos) ? currentSettings.taxDtos : [];
                      const updatedTaxDtos = existingTaxDtos.map((t: any) => {
                        if (t.uid === row.uid) {
                          return { ...t, status: nextStatus };
                        }
                        return t;
                      });
                      const updatedTaxes = updatedTaxDtos.map((t: any) => t.uid).filter(Boolean);
                      
                      const taxSettingsPayload = {
                        ...currentSettings,
                        taxes: updatedTaxes,
                        taxDtos: updatedTaxDtos,
                      };
                      await financeApi.settings.taxSettings(taxSettingsPayload);
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

  const detailTax = useMemo(() => buildTaxDetailsSource(taxSettings, taxes), [taxSettings, taxes]);
  const primaryTaxUid = useMemo(
    () => String(taxSettings?.taxes?.[0] ?? taxes[0]?.uid ?? ""),
    [taxSettings, taxes]
  );

  if (!loading && taxes.length > 0) {
    return (
      <TaxDetailsView
        tax={detailTax}
        taxEnabled={taxEnabled}
        updating={updatingTaxStatus}
        onEdit={() => navigate(primaryTaxUid ? `edit/${primaryTaxUid}` : "create")}
        onToggle={handleTaxFeatureToggle}
      />
    );
  }

  return (
    <FinanceFeatureLayout
      title="Manage Tax"
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
  const navigateToManageTax = () => navigate("..", { relative: "path", replace: true });
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
    void loadTaxCreationContext()
      .then(({ taxes, settings }) => {
        if (!active) return;
        const options = buildTaxPercentageOptions(taxes);

        setPercentageOptions(options);

        const settingsPercentage = Number(settings?.taxPercentage);
        if (Number.isFinite(settingsPercentage) && settingsPercentage > 0) {
          setTaxPercentage(String(settingsPercentage));
        } else if (!options.some((option) => option.value === taxPercentage) && options[0]) {
          setTaxPercentage(options[0].value);
        }
      })
      .catch((error) => {
        console.error("Failed to load tax creation data", error);
      });
    return () => {
      active = false;
    };
  }, []);

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

      let currentSettings: any = {};
      let existingTaxes: any[] = [];
      try {
        const context = await loadTaxCreationContext();
        currentSettings = context.settings;
        existingTaxes = context.taxes;
      } catch (err) {
        console.warn("[mfe-finance] Failed to fetch tax context, using empty defaults", err);
      }

      const savedTax = await saveTaxRecord({
        tenantUid: tenantUid || currentSettings.tenantUid || undefined,
        gstNumber,
        gstName,
        gstAddress,
        taxPercentage: percentage,
      });
      const savedTaxUid = resolveTaxUid(savedTax, crypto.randomUUID());
      const components = splitGstPercentage(percentage);
      const newTaxDto = {
        uid: savedTaxUid,
        tenantUid: tenantUid || currentSettings.tenantUid || undefined,
        countryCode: gstNumber.trim().slice(0, 2) || "IN",
        taxCode: gstNumber.trim(),
        taxName: gstName.trim(),
        taxRegime: "GST",
        status: "Enabled",
        taxPercentage: percentage,
        cgst: components.cgst,
        sgst: components.sgst,
        igst: components.igst,
      };

      const existingTaxDtos = Array.isArray(currentSettings.taxDtos) && currentSettings.taxDtos.length
        ? currentSettings.taxDtos
        : existingTaxes;
      const updatedTaxDtos = [...existingTaxDtos];
      const matchIndex = updatedTaxDtos.findIndex((t: any) => t.taxCode === gstNumber.trim());

      if (matchIndex !== -1) {
        updatedTaxDtos[matchIndex] = { ...updatedTaxDtos[matchIndex], ...newTaxDto };
      } else {
        updatedTaxDtos.push(newTaxDto);
      }

      const taxSettingsPayload = buildTaxSettingsPayload({
        currentSettings,
        tenantUid: tenantUid || currentSettings.tenantUid,
        gstNumber: gstNumber.trim(),
        gstName: gstName.trim(),
        gstAddress: gstAddress.trim(),
        taxPercentage: percentage,
        taxDtos: updatedTaxDtos,
      });

      await financeApi.settings.taxSettings(taxSettingsPayload);

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
      subtitle="Manage Tax"
      back={{ label: "Back to Manage Tax", href: "/taxes" }}
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
            <Button type="button" variant="outline" onClick={navigateToManageTax}>
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
  const navigateToManageTax = () => navigate("../..", { relative: "path", replace: true });
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
        const [taxResponse, settingsResponse, options] = await Promise.all([
          financeApi.taxes.byFilter<any>({}),
          financeApi.settings.provider<any>(),
          loadTaxPercentageOptions(),
        ]);
        if (!active) return;
        setPercentageOptions(options);
        const records = extractRecords(taxResponse.data);
        const settings = settingsResponse.data || {};
        const data = records.find((t: any) => t.uid === id);
        const selectedTax = data ? buildTaxDetailsSource(settings, [data]) : buildTaxDetailsSource(settings, records);
        if (selectedTax && (readTaxCode(selectedTax) || readTaxName(selectedTax) || readTaxPercentage(selectedTax))) {
          setGstNumber(readTaxCode(selectedTax));
          setGstName(readTaxName(selectedTax));
          const percentageValue = String(readTaxPercentage(selectedTax) || 0);
          setTaxPercentage(percentageValue);
          setGstAddress(readTaxAddress(selectedTax));
        } else {
          console.error("Tax not found with id:", id);
        }
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

      let currentSettings: any = {};
      try {
        const settingsRes = await financeApi.settings.provider<any>();
        currentSettings = settingsRes.data || {};
      } catch (err) {
        console.warn("[mfe-finance] Failed to fetch current settings, using empty defaults", err);
      }

      const savedTax = await saveTaxRecord({
        uid: id,
        tenantUid: tenantUid || currentSettings.tenantUid || undefined,
        gstNumber,
        gstName,
        gstAddress,
        taxPercentage: percentage,
      });
      const savedTaxUid = resolveTaxUid(savedTax, id);
      const components = splitGstPercentage(percentage);
      const newTaxDto = {
        uid: savedTaxUid,
        tenantUid: tenantUid || currentSettings.tenantUid || undefined,
        countryCode: gstNumber.trim().slice(0, 2) || "IN",
        taxCode: gstNumber.trim(),
        taxName: gstName.trim(),
        taxRegime: "GST",
        status: "Enabled",
        taxPercentage: percentage,
        cgst: components.cgst,
        sgst: components.sgst,
        igst: components.igst,
      };

      const existingTaxDtos = Array.isArray(currentSettings.taxDtos) ? currentSettings.taxDtos : [];
      const updatedTaxDtos = [...existingTaxDtos];
      const matchIndex = updatedTaxDtos.findIndex((t: any) => t.uid === id || t.uid === savedTaxUid);

      if (matchIndex !== -1) {
        updatedTaxDtos[matchIndex] = { ...updatedTaxDtos[matchIndex], ...newTaxDto };
      } else {
        updatedTaxDtos.push(newTaxDto);
      }

      const taxSettingsPayload = buildTaxSettingsPayload({
        currentSettings,
        tenantUid: tenantUid || currentSettings.tenantUid,
        gstNumber: gstNumber.trim(),
        gstName: gstName.trim(),
        gstAddress: gstAddress.trim(),
        taxPercentage: percentage,
        taxDtos: updatedTaxDtos,
      });

      await financeApi.settings.taxSettings(taxSettingsPayload);

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

  const taxPercentageLabel = `GST ${taxPercentage || "0"}%`;
  const gstDisplayName = gstName.trim() || "Tax record";
  const gstDisplayCode = gstNumber.trim() || "-";
  const gstDisplayAddress = gstAddress.trim() || "-";

  return (
    <PageShell
      title="Edit Tax"
      subtitle="Manage Tax"
      back={{ label: "Back to Manage Tax", href: "/taxes" }}
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <SectionCard className="overflow-hidden border-slate-200 shadow-sm">
          <div className="h-24 bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-hover)_100%)]" />
          <div className="-mt-9 px-6 pb-6">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-4 border-white bg-white shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-lg font-extrabold text-[var(--color-primary)]">
                GST
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xl font-extrabold tracking-tight text-slate-950">{gstDisplayName}</div>
              <div className="mt-1 break-all text-sm font-medium text-slate-500">{gstDisplayCode}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="success">Enabled</Badge>
              <Badge variant="neutral">{taxPercentageLabel}</Badge>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-[var(--color-primary-muted)] bg-[var(--color-primary-subtle)] px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-primary)]">Current Percentage</div>
                <div className="mt-1 text-lg font-bold text-slate-950">{taxPercentageLabel}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">GST Number</div>
                <div className="mt-1 break-all text-sm font-semibold text-slate-900">{gstDisplayCode}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Address Preview</div>
                <div className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">{gstDisplayAddress}</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="border-slate-200 shadow-sm">
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="border-b border-slate-200 pb-4">
              <div className="text-xl font-extrabold tracking-tight text-slate-950">Edit Tax Details</div>
              <div className="mt-1 text-sm text-slate-500">Update GST identity, percentage, and registered address using the Jaldee finance configuration flow.</div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:col-span-2">
                <Input
                  label="Enter 15 digit GST number *"
                  value={gstNumber}
                  maxLength={15}
                  onChange={(event) => setGstNumber(event.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <Input
                  label="Enter Name as in GST"
                  value={gstName}
                  onChange={(event) => setGstName(event.target.value)}
                  required
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <Select
                  label="Tax Percentage"
                  value={taxPercentage}
                  onChange={(event) => setTaxPercentage(event.target.value)}
                  options={percentageOptions}
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:col-span-2">
                <Textarea
                  label="Enter Address as in GST"
                  value={gstAddress}
                  onChange={(event) => setGstAddress(event.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {formError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-slate-500">
                Changes update both the tax record and tenant tax settings.
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={navigateToManageTax}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:bg-[var(--color-primary-hover)]"
                >
                  {submitting ? "Saving..." : "Update Tax"}
                </Button>
              </div>
            </div>
          </form>
        </SectionCard>
      </div>
    </PageShell>
  );
}

export { TaxesPage, TaxCreatePage, TaxEditPage };
