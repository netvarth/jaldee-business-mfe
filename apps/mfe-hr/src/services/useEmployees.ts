import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";
import type { Employee, SalaryStructure } from "../types";
import type { SearchFilterClause, SearchSchema } from "@jaldee/shared-modules";
import { buildEmployeeSearchBody } from "./employeeSearch";
import { unwrapHrSearchPage } from "./hrSearch";

const EMPTY_FILTERS: SearchFilterClause[] = [];
const employeeSearchRequests = new Map<string, { promise: Promise<unknown>; timestamp: number }>();
const EMPLOYEE_SEARCH_DEDUPE_MS = 1000;
type UseEmployeesOptions = {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  sort?: Array<{ field: string; direction: string }>;
};

function isUseEmployeesOptions(value: unknown): value is UseEmployeesOptions {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function unwrapEmployees(response: unknown): Record<string, unknown>[] {
  if (Array.isArray(response)) return response as Record<string, unknown>[];
  if (!response || typeof response !== "object") return [];
  const value = response as Record<string, unknown>;
  for (const key of ["content", "items", "results", "data"]) {
    if (Array.isArray(value[key])) return value[key] as Record<string, unknown>[];
  }
  return [];
}

function asIdentifier(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") {
    const identifier = String(value).trim();
    return identifier || null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return asIdentifier(record.uid ?? record.id ?? record.employeeUid ?? record.employeeId);
}

/** Backend returns `uid`; the UI keys on `id`. Normalize once here. */
function normalize(e: Record<string, unknown>): Employee {
  const uid = (e.uid ?? e.id) as string | undefined;
  const hrDepartment = (e.hrDepartment ?? e.department) as string | undefined;
  const reportingManagerUid = asIdentifier(
    e.reportingManagerUid
      ?? e.reportingManagerId
      ?? e.managerUid
      ?? e.reportingManager
      ?? e.manager
  );
  return {
    ...(e as object),
    id: String(uid ?? ""),
    uid,
    department: hrDepartment,
    hrDepartment,
    hrDepartmentUid: (e.hrDepartmentUid ?? null) as string | null,
    designationUid: (e.designationUid ?? null) as string | null,
    locationUid: (e.locationUid ?? null) as string | null,
    locationName: (e.locationName ?? null) as string | null,
    reportingManagerUid,
  } as Employee;
}

/**
 * Loads employees from /hr-service/employees (real data, no mocks). Exposes
 * loading + error so the screen can show real states instead of silently
 * falling back. `reload` re-fetches after mutations.
 */
export function useEmployees(
  filterClausesOrOptions: SearchFilterClause[] | UseEmployeesOptions = EMPTY_FILTERS,
  schema: SearchSchema | null | undefined = null,
  options: UseEmployeesOptions = {}
) {
  const legacyOptions = isUseEmployeesOptions(filterClausesOrOptions) ? filterClausesOrOptions : null;
  const filterClauses = legacyOptions ? EMPTY_FILTERS : filterClausesOrOptions;
  const enabled = (legacyOptions ?? options).enabled ?? true;
  const page = (legacyOptions ?? options).page ?? 0;
  const pageSize = (legacyOptions ?? options).pageSize ?? 100;
  const sort = (legacyOptions ?? options).sort;
  const api = useHrApi();
  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const requestBody = buildEmployeeSearchBody(filterClauses, schema, page, pageSize, sort);
      const requestKey = JSON.stringify(requestBody);
      const existingRequest = employeeSearchRequests.get(requestKey);
      const now = Date.now();
      const request = existingRequest && now - existingRequest.timestamp < EMPLOYEE_SEARCH_DEDUPE_MS
        ? existingRequest.promise
        : api.post<unknown>("/employees/search", requestBody);
      if (request !== existingRequest?.promise) {
        employeeSearchRequests.set(requestKey, { promise: request, timestamp: now });
      }
      const res = await request;
      const pageResult = unwrapHrSearchPage(res);
      setData(pageResult.content.map(normalize));
      setTotalElements(pageResult.totalElements);
      setTotalPages(pageResult.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employees");
      setData([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [api, enabled, filterClauses, page, pageSize, schema, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = useCallback(
    async (emp: Employee, status: "Active" | "Inactive") => {
      await api.patch(`/employees/${emp.id}/status`, { status });
      await load();
    },
    [api, load]
  );

  /**
   * Assigns/updates an employee's salary structure. Sends the full employee
   * payload (same shape EmployeeDetails saves) with only salaryStructure
   * replaced, so the partial-update mapper doesn't wipe other fields.
   */
  const assignStructure = useCallback(
    async (emp: Employee, structure: SalaryStructure) => {
      const extra = emp as unknown as Record<string, unknown>;
      const payload: Record<string, unknown> = {
        employeeId: emp.employeeId,
        salutation: emp.salutation || "Mr",
        name: emp.name,
        email: emp.email,
        contactNumber: emp.contactNumber || null,
        gender: emp.gender || null,
        dob: emp.dob || null,
        doj: emp.doj || null,
        hrDepartmentUid: emp.hrDepartmentUid || null,
        designationUid: emp.designationUid || null,
        employmentType: emp.employmentType || null,
        role: emp.role || "employee",
        status: emp.status || "Active",
        pan: extra.pan ?? null,
        uan: extra.uan ?? null,
        bankDetails: emp.bankDetails ?? null,
        salaryStructure: structure,
      };
      if (emp.reportingManagerUid) payload.reportingManagerUid = emp.reportingManagerUid;
      await api.put(`/employees/${emp.id}`, payload);
      await load();
    },
    [api, load]
  );

  return { data, loading, error, reload: load, setStatus, assignStructure, totalElements, totalPages };
}
