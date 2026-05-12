import { useMemo, useState } from "react";
import { Button, EmptyState, Input, MultiCombobox, Select, SkeletonCard } from "@jaldee/design-system";
import { useGenerateReport, useReportCreateConfig } from "../queries/reports";
import type { ReportCreateConfig, ReportFieldConfig, ReportGeneratePayload } from "../types";
import { ReportsPageShell } from "./shared";

type FormState = Record<string, string | string[]>;

export function ReportCreate({
  reportType,
  reportName,
  backHref,
}: {
  reportType: string;
  reportName?: string;
  backHref: string;
}) {
  const config = useReportCreateConfig(reportType, reportName);
  const generate = useGenerateReport();
  const [form, setForm] = useState<FormState>({});
  const [toast, setToast] = useState<string | null>(null);

  const values = useMemo(() => applyDefaults(config.data, form), [config.data, form]);

  const updateField = (field: ReportFieldConfig, value: string | string[]) => {
    setForm((current) => ({ ...current, [fieldKey(field)]: value }));
  };

  const handleGenerate = async () => {
    if (!config.data) return;
    const payload = buildGeneratePayload(config.data, values);
    await generate.mutateAsync(payload);
    setToast(`${config.data.reportName} generation started.`);
    window.setTimeout(() => setToast(null), 3500);
  };

  return (
    <ReportsPageShell
      title={`${config.data?.reportName ?? reportName ?? "Report"} Report`}
      subtitle="Choose filters and generate the report."
      back={{ label: "Back", href: backHref }}
    >
      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
          {toast}
        </div>
      )}

      {config.isLoading && <SkeletonCard />}
      {!config.isLoading && !config.data && (
        <EmptyState title="Report is not available" description="Choose another report from the reports list." />
      )}

      {config.data && (
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {config.data.fields.map((field) => (
              <ReportField key={`${field.field}-${field.filterType}`} field={field} value={values[fieldKey(field)]} onChange={(value) => updateField(field, value)} />
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <Button loading={generate.isPending} onClick={handleGenerate}>
              Generate Report
            </Button>
          </div>
        </div>
      )}
    </ReportsPageShell>
  );
}

function ReportField({
  field,
  value,
  onChange,
}: {
  field: ReportFieldConfig;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  if (field.type === "dropdown" || field.type === "timePeriod") {
    return (
      <Select
        label={field.title}
        placeholder={`Select ${field.title}`}
        value={String(value ?? "")}
        options={(field.options ?? []).map((option) => ({ value: option.value, label: option.label }))}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <MultiCombobox
        label={field.title}
        value={selected}
        placeholder={`Select ${field.title}`}
        searchPlaceholder={`Search ${field.title}`}
        options={(field.options ?? []).map((option) => ({ value: option.value, label: option.label }))}
        onValueChange={onChange}
      />
    );
  }

  if (field.type === "page") {
    return (
      <div className="flex items-end">
        <Input
          label={field.title}
          value={String(value || field.defaultValue || "All")}
          readOnly
          className="rounded-r-none"
          containerClassName="min-w-0 flex-1"
        />
        <Button className="h-[38px] rounded-l-none" type="button" onClick={() => undefined}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <Input
      label={field.title}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      placeholder={`Enter ${field.title}`}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function fieldKey(field: ReportFieldConfig) {
  return `${field.field}-${field.filterType}`;
}

function applyDefaults(config: ReportCreateConfig | null | undefined, form: FormState): FormState {
  if (!config) return form;
  const next = { ...form };
  config.fields.forEach((field) => {
    const key = fieldKey(field);
    if (next[key] === undefined) {
      next[key] = field.type === "multiselect" ? [] : field.defaultValue ?? "";
    }
  });
  return next;
}

function buildGeneratePayload(config: ReportCreateConfig, values: FormState): ReportGeneratePayload {
  const filter: ReportGeneratePayload["filter"] = {};
  let reportDateCategory = "NONE";

  config.fields.forEach((field) => {
    const key = fieldKey(field);
    const value = values[key];
    if (!value || value === "All" || value === "all" || (Array.isArray(value) && value.length === 0)) return;

    if (field.type === "timePeriod") {
      reportDateCategory = String(value);
      return;
    }

    const normalized = Array.isArray(value) ? value.join(",") : String(value);
    filter[key] = field.prefix ? `${field.prefix}${normalized}` : normalized;
  });

  return {
    reportType: config.reportType,
    responseType: config.responseType ?? "INLINE",
    reportDateCategory,
    filter,
  };
}
