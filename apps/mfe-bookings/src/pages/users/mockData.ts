/**
 * Staff view model used by the Staff/Employee screens.
 *
 * Populated from real base-service tenant users via `useStaff()`. Fields the
 * booking/base-CRM domain does not own (designation, role, dob, doj, type) come
 * back empty and are rendered as "not available" — never fabricated.
 *
 * (This module previously exported a hard-coded mock array; it is now types-only
 * so the Staff screens render real data.)
 */
export interface Employee {
  uid: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  status: string;
  role: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  doj: string;
  type: string;
}
