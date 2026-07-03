import React, { useMemo, useState, useEffect } from "react";
import { Badge, Button, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { Pencil, Plus } from "lucide-react";
import type { FormTemplate } from "../types";
import { membershipTemplateService } from "../services/membershipTemplateService";
import { useSharedNavigate } from "../../useSharedNavigate";
import { useSharedModulesContext } from "../../context";

function countSchemaItems(schema: unknown) {
  const properties = (schema as any)?.properties;
  if (!properties || typeof properties !== "object") return 0;
  return Object.keys(properties).length;
}

function schemaRequired(schema: unknown) {
  const required = (schema as any)?.required;
  return Array.isArray(required) ? required.length : 0;
}

export function TemplatesScreen() {
  const navigate = useSharedNavigate();
  const { basePath } = useSharedModulesContext();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    membershipTemplateService.list()
      .then((data) => {
        setForms(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const sortedForms = useMemo(() => [...forms].sort((a, b) => a.name.localeCompare(b.name)), [forms]);

  if (loading) {
    return (
      <div className="h-full bg-slate-50 p-4 sm:p-6 md:p-8 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse text-sm">Loading templates...</div>
      </div>
    );
  }

  return (
    <div data-testid="jaldee-membership-templates-page" className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8 pb-24">
      <PageHeader
        title="Membership Templates"
        subtitle="Create and manage intake templates for Memberships."
        actions={
          <Button
            id="jaldee-membership-templates-create-button"
            data-testid="jaldee-membership-templates-create-button"
            onClick={() => navigate(`${basePath}/templates/create`)}
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            className="px-6 py-3 text-xs font-semibold active-scale"
          >
            New Template
          </Button>
        }
      />

      {sortedForms.length === 0 ? (
        <SectionCard className="border-slate-200 bg-white p-8 shadow-sm">
          <EmptyState
            title="No templates found"
            description="Create a membership intake template to use it while configuring services."
          />
        </SectionCard>
      ) : (
        <div data-testid="jaldee-membership-templates-grid" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sortedForms.map((template) => {
            const fieldCount = template.fields.length || countSchemaItems(template.templateSchema);
            const requiredCount = schemaRequired(template.templateSchema) || template.fields.filter((field) => field.required).length;

            return (
              <SectionCard key={template.uid} className="border-slate-200 bg-white shadow-sm">
                <div data-testid={`jaldee-membership-template-card-${template.uid}`} className="flex min-h-48 flex-col justify-between gap-4">
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="m-0 line-clamp-2 text-base font-semibold leading-6 text-slate-900">{template.name}</h3>
                        <p className="mt-1 truncate text-xs font-mono text-slate-400">{template.uid}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="info">Template</Badge>
                        <Button
                          id={`jaldee-membership-template-card-${template.uid}-edit-button`}
                          data-testid={`jaldee-membership-template-card-${template.uid}-edit-button`}
                          size="sm"
                          variant="ghost"
                          icon={<Pencil size={14} />}
                          onClick={() => navigate(`${basePath}/templates/${template.uid}/edit`)}
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
                    <p className="m-0 line-clamp-4 text-xs leading-5 text-slate-500">
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
