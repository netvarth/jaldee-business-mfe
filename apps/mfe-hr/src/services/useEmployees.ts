import { useCallback, useEffect, useState } from "react";
import { useHrApi } from "./useHrApi";
import type { Employee, SalaryStructure } from "../types";

/** Backend returns `uid`; the UI keys on `id`. Normalize once here. */
function normalize(e: Record<string, unknown>): Employee {
  const uid = (e.uid ?? e.id) as string | undefined;
  const hrDepartment = (e.hrDepartment ?? e.department) as string | undefined;
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
  } as Employee;
}

/**
 * Loads employees from /hr-service/employees (real data, no mocks). Exposes
 * loading + error so the screen can show real states instead of silently
 * falling back. `reload` re-fetches after mutations.
 */
export function useEmployees(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const api = useHrApi();
  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Record<string, unknown>[]>("/employees");
      setData(Array.isArray(res) ? res.map(normalize) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employees");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = useCallback(
    async (id: string) => {
      await api.del(`/employees/${id}`);
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

  return { data, loading, error, reload: load, remove, assignStructure };
}
