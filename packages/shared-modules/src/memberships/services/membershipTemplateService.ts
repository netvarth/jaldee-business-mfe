import { apiClient } from "@jaldee/api-client";
import { buildBaseServiceUrl } from "../../serviceUrls";
import type { FormField, FormTemplate } from "../types";

type MembershipTemplatePayload = {
  templateName: string;
  templateType: "SERVICE";
  status: string;
  templateSchema: string;
};

type MembershipTemplateUpdatePayload = MembershipTemplatePayload & {
  uid: string;
};

type ApiEnvelope<T> = {
  data?: T | { data?: T; content?: T; records?: T; items?: T };
  content?: T;
  records?: T;
  items?: T;
};

const withoutLocationParam = () => ({ _skipLocationParam: true }) as any;

function unwrap<T>(value: unknown): T {
  const root = value as ApiEnvelope<T>;
  const data = root?.data as ApiEnvelope<T> | T | undefined;

  if (data && typeof data === "object") {
    const nested = data as ApiEnvelope<T>;
    return (nested.data ?? nested.content ?? nested.records ?? nested.items ?? data) as T;
  }

  return (root?.data ?? root?.content ?? root?.records ?? root?.items ?? value) as T;
}

export function normalizeTemplateSchema(rawSchema: unknown) {
  if (typeof rawSchema !== "string") return rawSchema;
  try {
    return JSON.parse(rawSchema);
  } catch {
    return rawSchema;
  }
}

export function schemaToFields(schema: unknown): FormField[] {
  const properties = (schema as any)?.properties;
  if (!properties || typeof properties !== "object") return [];
  const required = Array.isArray((schema as any)?.required) ? (schema as any).required : [];

  return Object.entries(properties)
    .filter(([, value]) => (value as any)?.type !== "object")
    .map(([key, value]: [string, any]) => {
      const options = Array.isArray(value?.options)
        ? value.options.map((option: any) => String(option.displayName ?? option.value ?? "")).filter(Boolean)
        : undefined;
      return {
        id: key,
        label: String(value?.title ?? key),
        type: value?.type === "number" ? "number" : options?.length ? "select" : value?.type === "boolean" ? "checkbox" : "text",
        required: required.includes(key),
        options,
      };
    });
}

export function toFormTemplate(raw: any, fallbackFields: FormField[] = [], fallbackSchema?: unknown): FormTemplate {
  const schema = normalizeTemplateSchema(raw?.templateSchema) ?? fallbackSchema;
  return {
    uid: String(raw?.uid ?? raw?.uuid ?? raw?.id ?? `f${Date.now()}`),
    name: String(raw?.templateName ?? raw?.name ?? "Membership Template"),
    fields: fallbackFields.length ? fallbackFields : schemaToFields(schema),
    templateSchema: schema,
  };
}

export function toFormTemplateList(raw: unknown): FormTemplate[] {
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

  return list.map((item) => toFormTemplate(item));
}

const MEMBERSHIP_BASE = buildBaseServiceUrl("/base-service/v1/api/tenant/membership");

export const membershipTemplateService = {
  endpoints: {
    list: `${MEMBERSHIP_BASE}/template/search`,
    create: `${MEMBERSHIP_BASE}/template`,
    update: (uid: string) => `${MEMBERSHIP_BASE}/template/${encodeURIComponent(uid)}`,
    detail: (uid: string) => `${MEMBERSHIP_BASE}/template/${encodeURIComponent(uid)}`,
  },

  async list(filters: Record<string, unknown> = {}) {
    const response = await apiClient.post(
      this.endpoints.list,
      filters,
      withoutLocationParam(),
    );
    return toFormTemplateList(response);
  },

  async detail(uid: string) {
    const response = await apiClient.get(
      this.endpoints.detail(uid),
      withoutLocationParam(),
    );
    return toFormTemplate(unwrap(response));
  },

  async create(payload: MembershipTemplatePayload, fallbackFields: FormField[], fallbackSchema: unknown) {
    const response = await apiClient.post(
      this.endpoints.create,
      payload,
      withoutLocationParam(),
    );
    return toFormTemplate(unwrap(response), fallbackFields, fallbackSchema);
  },

  async update(uid: string, payload: MembershipTemplateUpdatePayload, fallbackFields: FormField[], fallbackSchema: unknown) {
    const response = await apiClient.put(
      this.endpoints.update(uid),
      payload,
      withoutLocationParam(),
    );
    return toFormTemplate(unwrap(response), fallbackFields, fallbackSchema);
  },
};
