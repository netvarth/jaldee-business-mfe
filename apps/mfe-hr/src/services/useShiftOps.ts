import { useCallback } from "react";
import { useHrApi } from "./useHrApi";

/**
 * Assignment + roster operations for shifts and rotations. These sit alongside
 * the plain CRUD hooks (useShifts / useShiftRotations) and hit the dedicated
 * backend endpoints:
 *   POST/GET  /shifts/{uid}/assign            — employees on a shift
 *   POST/GET  /shift-rotations/{uid}/assign   — employees on a rotation
 *   GET       /shift-rotations/roster?month=  — generated month roster
 */
export type Roster = Record<string, Record<string, string>>; // employeeUid -> (date -> shiftUid)

export function useShiftOps() {
  const api = useHrApi();

  const getShiftAssigned = useCallback(
    (shiftUid: string) => api.get<string[]>(`/shifts/${shiftUid}/assign`), [api]);
  const assignShift = useCallback(
    (shiftUid: string, employeeUids: string[]) => api.post(`/shifts/${shiftUid}/assign`, employeeUids), [api]);

  const getRotationAssigned = useCallback(
    (rotationUid: string) => api.get<string[]>(`/shift-rotations/${rotationUid}/assign`), [api]);
  const assignRotation = useCallback(
    (rotationUid: string, employeeUids: string[]) => api.post(`/shift-rotations/${rotationUid}/assign`, employeeUids), [api]);

  const roster = useCallback(
    (month: string) => api.get<Roster>(`/shift-rotations/roster?month=${encodeURIComponent(month)}`), [api]);

  return { getShiftAssigned, assignShift, getRotationAssigned, assignRotation, roster };
}
