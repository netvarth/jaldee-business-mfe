import { apiClient } from "@jaldee/api-client";
import {
  BASE_SERVICE_ENDPOINTS,
  buildBaseServiceUrl,
} from "../../serviceUrls";
import type { ConversionMapping, Product } from "../types";

type ProductSearchParams = {
  page?: number;
  size?: number;
  sort?: string;
};

const withoutLocationParam = (params?: ProductSearchParams) => ({
  _skipLocationParam: true,
  ...(params ? { params } : {}),
}) as any;

type ApiEnvelope<T> = {
  data?: T | { data?: T; content?: T; records?: T; items?: T };
  content?: T;
  records?: T;
  items?: T;
};

function unwrap<T>(value: unknown): T {
  const root = value as ApiEnvelope<T>;
  const data = root?.data as ApiEnvelope<T> | T | undefined;

  if (data && typeof data === "object") {
    const nested = data as ApiEnvelope<T>;
    return (nested.data ?? nested.content ?? nested.records ?? nested.items ?? data) as T;
  }

  return (root?.data ?? root?.content ?? root?.records ?? root?.items ?? value) as T;
}

function toProduct(raw: any): Product {
  const uid = String(raw?.uid ?? raw?.uuid ?? raw?.id ?? raw?.productUid ?? raw?.productId ?? raw?.crmProductUid ?? raw?.crmProductId ?? "");
  const name = String(raw?.name ?? raw?.productName ?? raw?.displayName ?? "Untitled Product");
  const productEnum = String(raw?.productEnum ?? raw?.code ?? raw?.productCode ?? name.toUpperCase().replace(/\s+/g, "_"));
  const defaultPipelineUid = String(raw?.defaultPipelineUid ?? raw?.pipelineUid ?? raw?.defaultPipeline?.uid ?? "");
  const defaultPipelineName = raw?.defaultPipelineName ?? raw?.pipelineName ?? raw?.defaultPipeline?.name;
  const leadTemplateUid =
    raw?.leadTemplateUid ??
    raw?.crmLeadTemplateUid ??
    raw?.templateUid ??
    (typeof raw?.leadTemplate === "string" ? raw.leadTemplate : raw?.leadTemplate?.uid) ??
    (typeof raw?.template === "string" ? raw.template : raw?.template?.uid) ??
    raw?.crmLeadTemplate?.uid;
  const leadTemplateName =
    raw?.leadTemplateName ??
    raw?.leadTemplateDisplayName ??
    raw?.crmLeadTemplateName ??
    raw?.templateName ??
    raw?.leadTemplate?.displayName ??
    raw?.leadTemplate?.templateName ??
    raw?.leadTemplate?.name ??
    raw?.template?.displayName ??
    raw?.template?.templateName ??
    raw?.template?.name ??
    raw?.crmLeadTemplate?.displayName ??
    raw?.crmLeadTemplate?.templateName ??
    raw?.crmLeadTemplate?.name;

  return {
    uid,
    name,
    displayName: raw?.displayName,
    productEnum,
    defaultPipelineUid,
    defaultPipelineName: defaultPipelineName ? String(defaultPipelineName) : undefined,
    leadTemplateUid: leadTemplateUid ? String(leadTemplateUid) : undefined,
    leadTemplateName: leadTemplateName ? String(leadTemplateName) : undefined,
    templateTitle: raw?.templateTitle,
    category: raw?.category,
    description: raw?.description,
    price: raw?.price != null ? Number(raw.price) : undefined,
    status: String(raw?.status ?? raw?.internalStatus ?? "ACTIVE"),
    productType: raw?.productType ?? raw?.type,
    productTypeEnum: raw?.productTypeEnum,
    conversionMapping: raw?.conversionMapping as ConversionMapping | undefined,
  };
}

function toProductList(raw: unknown): Product[] {
  const unwrapped = unwrap<unknown>(raw);
  const list = Array.isArray(unwrapped)
    ? unwrapped
    : Array.isArray((unwrapped as any)?.content)
      ? (unwrapped as any).content
      : Array.isArray((unwrapped as any)?.records)
        ? (unwrapped as any).records
        : Array.isArray((unwrapped as any)?.items)
          ? (unwrapped as any).items
          : Array.isArray((unwrapped as any)?.data)
            ? (unwrapped as any).data
            : [];

  return list.map(toProduct).filter((product) => product.uid);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function toProductPayload(product: Partial<Product>, options: { includeUid?: boolean } = {}) {
  const productName = product.name?.trim();
  const leadTemplateUid = isUuid(product.leadTemplateUid) ? product.leadTemplateUid : undefined;
  const defaultPipelineUid = product.defaultPipelineUid === "p-standard" ? undefined : product.defaultPipelineUid || undefined;
  const acceptedProductTypeEnums = new Set(["KARTI", "UNKNOWN", "HEALTHCARE", "MEMBERSHIP", "IVR"]);
  const candidateProductTypeEnum = product.productTypeEnum || product.productType;
  const productTypeEnum = candidateProductTypeEnum && acceptedProductTypeEnums.has(candidateProductTypeEnum)
    ? candidateProductTypeEnum
    : "UNKNOWN";
  const status = product.status === "Disabled" || product.status === "INACTIVE" || product.status === "DISABLED"
    ? "Disabled"
    : "Enabled";

  return {
    ...(options.includeUid && product.uid ? { uid: product.uid } : {}),
    name: productName,
    productName,
    displayName: product.displayName?.trim() || productName,
    productEnum: product.productEnum?.trim(),
    productTypeEnum,
    leadTemplateUid,
    templateTitle: product.templateTitle?.trim() || undefined,
    description: product.description?.trim() || undefined,
    productType: product.productType || undefined,
    status,
    defaultPipelineUid,
    defaultPipelineName: product.defaultPipelineName || undefined,
  };
}

export const leadProductService = {
  endpoints: BASE_SERVICE_ENDPOINTS.crmLeadProducts,

  async search(filters: Record<string, unknown> = {}, params: ProductSearchParams = { page: 0, size: 20 }) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.search),
      filters,
      withoutLocationParam(params)
    );
    return toProductList(response);
  },

  async create(product: Partial<Product>) {
    const response = await apiClient.post(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.create),
      toProductPayload(product, { includeUid: false }),
      withoutLocationParam()
    );
    return toProduct(unwrap(response));
  },

  async detail(uid: string) {
    const response = await apiClient.get(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.detail(uid))
    );
    return toProduct(unwrap(response));
  },

  async update(uid: string, product: Partial<Product>) {
    const response = await apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.update(uid)),
      toProductPayload(product, { includeUid: true }),
      withoutLocationParam()
    );
    return toProduct(unwrap(response));
  },

  async updateStatus(uid: string, status: string) {
    await apiClient.put(
      buildBaseServiceUrl(BASE_SERVICE_ENDPOINTS.crmLeadProducts.status(uid, status)),
      undefined,
      withoutLocationParam()
    );
  },

  urlForDebug(path: string) {
    return buildBaseServiceUrl(path);
  },
};
