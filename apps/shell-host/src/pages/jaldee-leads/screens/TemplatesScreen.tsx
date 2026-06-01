import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { Pencil } from "lucide-react";
import type { FormTemplate } from "../types";
import { ICONS } from "../constants";
import { leadTemplateService } from "../services/templateService";

interface TemplatesScreenProps {
  forms: FormTemplate[];
  setForms: React.Dispatch<React.SetStateAction<FormTemplate[]>>;
}

function countSchemaItems(schema: unknown) {
  const properties = (schema as any)?.properties;
  if (!properties || typeof properties !== "object") return 0;
  return Object.keys(properties).length;
}

function schemaRequired(schema: unknown) {
  const required = (schema as any)?.required;
  return Array.isArray(required) ? required.length : 0;
}

export default function TemplatesScreen({ forms, setForms }: TemplatesScreenProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTemplates() {
      setIsLoading(true);
      setError(null);
      try {
        const remoteTemplates = await leadTemplateService.list();
        if (!active) return;
        if (remoteTemplates.length) {
          setForms(remoteTemplates);
        }
      } catch (templateError) {
        if (!active) return;
        setError(templateError instanceof Error ? templateError.message : "Unable to load templates.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadTemplates();

    return () => {
      active = false;
    };
  }, [setForms]);

  const sortedForms = useMemo(() => [...forms].sort((a, b) => a.name.localeCompare(b.name)), [forms]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8 pb-24">
      <PageHeader
        title="Lead Templates"
        subtitle="Create and manage intake templates for Jaldee Leads."
        actions={
          <Button
            onClick={() => navigate("/jaldee-leads/templates/create")}
            variant="primary"
            icon={<ICONS.ADD className="h-4 w-4" />}
            className="px-6 py-3 text-xs font-semibold active-scale"
          >
            New Template
          </Button>
        }
      />

      {error ? (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
          Loading templates...
        </div>
      ) : null}

      {sortedForms.length === 0 ? (
        <SectionCard className="border-slate-200 bg-white p-8 shadow-sm">
          <EmptyState
            title="No templates found"
            description="Create a lead intake template to use it while configuring products."
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {sortedForms.map((template) => {
            const fieldCount = template.fields.length || countSchemaItems(template.templateSchema);
            const requiredCount = schemaRequired(template.templateSchema) || template.fields.filter((field) => field.required).length;

            return (
              <SectionCard key={template.uid} className="border-slate-200 bg-white shadow-sm">
                <div className="flex min-h-40 flex-col justify-between gap-4">
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="m-0 truncate text-base font-semibold text-slate-900">{template.name}</h3>
                        <p className="mt-1 text-xs font-mono text-slate-400">{template.uid}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info">Template</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Pencil size={14} />}
                          onClick={() => navigate(`/jaldee-leads/templates/${template.uid}/edit`)}
                          aria-label={`Edit ${template.name}`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="neutral" count={fieldCount}>Items</Badge>
                      <Badge variant="warning" count={requiredCount}>Required</Badge>
                    </div>
                  </div>

                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="m-0 line-clamp-3 text-xs leading-5 text-slate-500">
                      {template.fields.length
                        ? template.fields.map((field) => field.label).join(", ")
                        : "Schema template"}
                    </p>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
