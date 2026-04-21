import { Button, EmptyState, PageHeader, SectionCard } from "@jaldee/design-system";
import { useMemo } from "react";
import { useSharedModulesContext } from "../../context";
import { useProductTypeByUid } from "../queries/leads";
import { PRODUCT_TYPE_OPTIONS, unwrapPayload } from "../utils";
import { ModulePlaceholder, StatusBadge } from "./shared";

function getProductTypeLabel(value: unknown) {
  return PRODUCT_TYPE_OPTIONS.find((item) => item.value === String(value ?? ""))?.label ?? String(value ?? "-");
}

function RichTextContent({ value }: { value: unknown }) {
  const content = String(value ?? "").trim();

  if (!content) {
    return <span>No description available.</span>;
  }

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  if (!looksLikeHtml) {
    return <span>{content}</span>;
  }

  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

export function ProductTypeDetails({ productTypeUid }: { productTypeUid: string }) {
  const { basePath } = useSharedModulesContext();
  const detailQuery = useProductTypeByUid(productTypeUid);
  const detail = useMemo(() => unwrapPayload(detailQuery.data), [detailQuery.data]);

  if (!productTypeUid) {
    return (
      <ModulePlaceholder
        title="Product / Service not selected"
        description="Open a product / service record from the list to view its details."
        backHref={`${basePath}/product-type`}
      />
    );
  }

  if (detailQuery.isLoading) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <div className="text-sm text-slate-500">Loading product / service details...</div>
      </SectionCard>
    );
  }

  if (!detail) {
    return (
      <SectionCard className="border-slate-200 shadow-sm">
        <EmptyState title="Product / service unavailable" description="The selected product / service could not be loaded." />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product / Service Details"
        back={{ label: "Back", href: `${basePath}/product-type` }}
        onNavigate={(href) => window.location.assign(href)}
      />

      <SectionCard className="border-slate-200 shadow-sm">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-2xl font-semibold leading-tight text-slate-950">{String(detail.typeName ?? detail.name ?? "-")}</div>
              <div className="mt-2">
                <StatusBadge status={detail.crmStatus ?? detail.status ?? "INACTIVE"} />
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.assign(`${basePath}/product-type/update/${productTypeUid}`)}>
              Edit Product / Service
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <InfoBlock label="Product Type" value={getProductTypeLabel(detail.productEnum)} />
            <InfoBlock label="Lead Template" value={String(detail.leadTemplateDto?.templateName ?? "-")} />
            <InfoBlock label="Display Name" value={String(detail.displayName ?? "-")} />
            <InfoBlock label="Template Title" value={String(detail.templateTitle ?? "-")} />
          </div>

          <div className="border-t border-slate-200 pt-8">
            <div className="text-base font-semibold text-slate-900">Description</div>
            <div className="mt-2 text-sm leading-6 text-slate-700">
              <RichTextContent value={detail.description} />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="text-base font-semibold text-slate-900">{label}</div>
      <div className="text-sm leading-6 text-slate-700">{value}</div>
    </div>
  );
}
