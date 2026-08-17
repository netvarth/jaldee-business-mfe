import React, { useState, useEffect, useMemo } from "react";
import { Coffee, Clock, Play, Square, AlertCircle, CheckCircle2, History, Timer } from "lucide-react";
import { Dialog, DialogFooter, Button, Badge } from "@jaldee/design-system";
import type { AttendanceBreak } from "../types";
import { useHrApi } from "../services/useHrApi";

export const BREAK_TYPE_OPTIONS = [
  { value: "LUNCH", label: "Lunch Break", icon: "🍱", description: "Mid-day meal break" },
  { value: "TEA", label: "Tea / Coffee Break", icon: "☕", description: "Short refreshment break" },
  { value: "PERSONAL", label: "Personal Break", icon: "👤", description: "Personal errand / rest" },
  { value: "OFFICIAL", label: "Official Work Break", icon: "💼", description: "Official meeting / external duty" },
  { value: "OTHER", label: "Other Break", icon: "⏱️", description: "Uncategorized break time" },
];

export interface AttendanceBreakManagerProps {
  attendanceUid?: string;
  employeeUid?: string;
  breaks?: AttendanceBreak[];
  isPunchedIn: boolean;
  isPunchedOut: boolean;
  onStartBreak: (breakType: string, options?: { attendanceUid?: string; employeeUid?: string; breakIn?: string }) => Promise<unknown>;
  onEndBreak: (breakUid: string, breakOutIso?: string, options?: { attendanceUid?: string; employeeUid?: string; breakType?: string }) => Promise<unknown>;
  onBreakStateChange?: (isOnBreak: boolean) => void;
  compact?: boolean;
}

function formatTimeTo12Hour(isoStr?: string): string {
  if (!isoStr) return "—";
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatSecondsToHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function calculateDurationMinutes(startIso?: string, endIso?: string): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 60000);
}

export function AttendanceBreakManager({
  attendanceUid,
  employeeUid,
  breaks = [],
  isPunchedIn,
  isPunchedOut,
  onStartBreak,
  onEndBreak,
  onBreakStateChange,
  compact = true,
}: AttendanceBreakManagerProps) {
  const api = useHrApi();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<string>("LUNCH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local active break state for immediate UI feedback
  const [localActiveBreak, setLocalActiveBreak] = useState<AttendanceBreak | null>(null);
  const [fetchedBreaks, setFetchedBreaks] = useState<AttendanceBreak[]>([]);

  // Fetch attendance record directly from server API URL when attendanceUid is available
  useEffect(() => {
    if (!attendanceUid) return;
    let isMounted = true;

    const fetchServerBreaks = async () => {
      try {
        let rec: Record<string, unknown> | null = null;
        try {
          rec = await api.get<Record<string, unknown>>(`/attendance/${attendanceUid}`);
        } catch {
          try {
            const list = await api.get<Record<string, unknown>[]>("/me/attendance");
            if (Array.isArray(list)) {
              rec = list.find((item) => item.id === attendanceUid || item.uid === attendanceUid) || null;
            }
          } catch {
            const list = await api.get<Record<string, unknown>[]>("/attendance");
            if (Array.isArray(list)) {
              rec = list.find((item) => item.id === attendanceUid || item.uid === attendanceUid) || null;
            }
          }
        }

        if (!isMounted || !rec) return;

        const rawBreaks = rec.breaks ?? rec.attendanceBreaks ?? rec.breakList ?? rec.breakRecords ?? rec.activeBreak;
        let list: unknown[] = [];
        if (Array.isArray(rawBreaks)) {
          list = rawBreaks;
        } else if (rawBreaks && typeof rawBreaks === "object") {
          list = [rawBreaks];
        }

        if (list.length > 0) {
          const normalized = list.map((item) => {
            const b = item as Record<string, unknown>;
            return {
              ...b,
              id: String(b.id || b.uid || b.breakUid || ""),
              uid: (b.uid || b.id || b.breakUid) as string,
              breakIn: (b.breakIn || b.breakInTime || b.startTime || b.startedAt) as string,
              breakOut: (b.breakOut || b.breakOutTime || b.endTime || b.endedAt) as string,
              breakType: (b.breakType || b.type || "LUNCH") as string,
            };
          });
          setFetchedBreaks(normalized);
        }
      } catch {
        // ignore fetch error if endpoint not available
      }
    };

    void fetchServerBreaks();

    return () => {
      isMounted = false;
    };
  }, [api, attendanceUid]);

  // Combine breaks from props and breaks fetched directly from server API URL
  const safeBreaks = useMemo(() => {
    const rawList = Array.isArray(breaks) && breaks.length > 0 ? breaks : fetchedBreaks;
    return rawList.map((b) => {
      if (!b || typeof b !== "object") return b;
      const rec = b as Record<string, unknown>;
      return {
        ...b,
        id: String(b.id || b.uid || rec.breakUid || ""),
        uid: (b.uid || b.id || rec.breakUid) as string | undefined,
        breakIn: b.breakIn || (rec.breakInTime as string) || (rec.startTime as string) || (rec.startedAt as string),
        breakOut: b.breakOut || (rec.breakOutTime as string) || (rec.endTime as string) || (rec.endedAt as string),
        breakType: b.breakType || (rec.type as string) || "LUNCH",
      };
    });
  }, [breaks, fetchedBreaks]);

  // Find active break from props or local state (breakIn present, breakOut missing)
  const activeBreakFromProps = useMemo(() => {
    return safeBreaks.find((b) => b && b.breakIn && !b.breakOut) || null;
  }, [safeBreaks]);

  // Sync local active break when active break from props arrives
  useEffect(() => {
    if (activeBreakFromProps) {
      setLocalActiveBreak(null);
    }
  }, [activeBreakFromProps]);

  const activeBreak = localActiveBreak || activeBreakFromProps;
  const isOnBreak = !!activeBreak;

  // Notify parent of break state changes
  useEffect(() => {
    onBreakStateChange?.(isOnBreak);
  }, [isOnBreak, onBreakStateChange]);

  // Live timer tick for active break
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeBreak?.breakIn) {
      setElapsedSeconds(0);
      return;
    }

    const breakInMs = new Date(activeBreak.breakIn).getTime();

    const updateTimer = () => {
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - breakInMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeBreak?.breakIn]);

  // Handle Start Break Submit
  const handleConfirmStartBreak = async () => {
    if (!attendanceUid) {
      setError("Active attendance record not found.");
      return;
    }

    setBusy(true);
    setError(null);
    const nowIso = new Date().toISOString();

    try {
      const res = (await onStartBreak(selectedBreakType, { attendanceUid, employeeUid, breakIn: nowIso })) as Record<string, unknown> | undefined;
      const rawData = (res && typeof res === "object" && "data" in res && res.data ? res.data : res) as Record<string, unknown> | undefined;
      const realUid = String(rawData?.uid || rawData?.id || rawData?.breakUid || rawData?.uuid || "");

      const newBreakObj: AttendanceBreak = {
        uid: realUid || undefined,
        id: realUid || undefined,
        breakIn: (rawData?.breakIn || rawData?.breakInTime || rawData?.startTime || nowIso) as string,
        breakType: (rawData?.breakType || rawData?.type || selectedBreakType) as string,
      };

      setLocalActiveBreak(newBreakObj);
      setFetchedBreaks((prev) => [...prev, newBreakObj]);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start break.");
    } finally {
      setBusy(false);
    }
  };

  // Handle End Break Submit
  const handleConfirmEndBreak = async () => {
    if (!activeBreak) return;

    const targetBreakUid = String(activeBreak.uid || activeBreak.id || (activeBreak as Record<string, unknown>).breakUid || "active");
    const breakType = (activeBreak.breakType || "LUNCH") as string;
    const nowIso = new Date().toISOString();
    setBusy(true);
    setError(null);

    try {
      await onEndBreak(targetBreakUid, nowIso, { attendanceUid, employeeUid, breakType });
      setLocalActiveBreak(null);
      setFetchedBreaks((prev) =>
        prev.map((b) => {
          const bIn = b.breakIn || (b as Record<string, unknown>).breakInTime;
          const bOut = b.breakOut || (b as Record<string, unknown>).breakOutTime;
          if (!bOut || (activeBreak && bIn === activeBreak.breakIn)) {
            return { ...b, breakOut: nowIso };
          }
          return b;
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end break.");
    } finally {
      setBusy(false);
    }
  };

  const activeOption = BREAK_TYPE_OPTIONS.find((b) => b.value === (activeBreak?.breakType || "LUNCH")) || BREAK_TYPE_OPTIONS[0];

  // List of completed breaks for history
  const completedBreaks = useMemo(() => {
    return safeBreaks.filter((b) => b && b.breakIn && b.breakOut);
  }, [safeBreaks]);

  if (!isPunchedIn || isPunchedOut) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Active Break Controls */}
      {isOnBreak ? (
        <div
          id="ess-active-break-banner"
          data-testid="ess-active-break-banner"
          className="rounded-2xl border border-amber-300 bg-amber-50/95 p-3.5 shadow-xs backdrop-blur-xs sm:p-4"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-800">
                <span className="text-xl">{activeOption.icon}</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="warning" className="border border-amber-300 bg-amber-200/80 font-bold text-amber-950 whitespace-nowrap text-[11px] px-2 py-0.5">
                    On {activeOption.label}
                  </Badge>
                  <span className="text-xs text-amber-700 whitespace-nowrap">Since {formatTimeTo12Hour(activeBreak.breakIn)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-xl font-black tracking-tight text-amber-950">
                  <Timer className="h-4.5 w-4.5 text-amber-600 animate-pulse shrink-0" />
                  <span>{formatSecondsToHHMMSS(elapsedSeconds)}</span>
                </div>
              </div>
            </div>

            <Button
              id="ess-attendance-end-break"
              data-testid="ess-attendance-end-break"
              onClick={handleConfirmEndBreak}
              loading={busy}
              className="h-10 w-full border-amber-600 bg-amber-600 text-white shadow-sm hover:bg-amber-700 active:bg-amber-800 font-semibold"
            >
              <Square className="mr-1.5 h-4 w-4 fill-current" />
              End Break
            </Button>
          </div>

          {error ? (
            <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            id="ess-attendance-start-break"
            data-testid="ess-attendance-start-break"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            variant="outline"
            className="h-11 w-full border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
          >
            <Coffee className="mr-2 h-4 w-4 text-amber-600" />
            Start Break
          </Button>
        </div>
      )}

      {/* Start Break Dialog */}
      <Dialog
        testId="ess-start-break-modal"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Start Attendance Break"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Select the type of break you are starting:</p>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="grid gap-2.5">
            {BREAK_TYPE_OPTIONS.map((opt) => {
              const selected = selectedBreakType === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  id={`ess-break-type-option-${opt.value}`}
                  data-testid={`ess-break-type-option-${opt.value}`}
                  onClick={() => setSelectedBreakType(opt.value)}
                  className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                    selected
                      ? "border-amber-500 bg-amber-50/80 text-amber-950 shadow-xs ring-1 ring-amber-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.description}</div>
                    </div>
                  </div>
                  {selected ? <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0" /> : null}
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              id="ess-start-break-confirm"
              data-testid="ess-start-break-confirm"
              type="button"
              onClick={handleConfirmStartBreak}
              loading={busy}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <Play className="mr-1.5 h-4 w-4 fill-current" />
              Confirm &amp; Start Break
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Break History Summary */}
      {completedBreaks.length > 0 && !compact ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <History className="h-4 w-4 text-slate-400" />
              Today&apos;s Break History ({completedBreaks.length})
            </div>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {completedBreaks.map((b, idx) => {
              const opt = BREAK_TYPE_OPTIONS.find((o) => o.value === b.breakType) || BREAK_TYPE_OPTIONS[0];
              const durMins = b.durationMinutes ?? calculateDurationMinutes(b.breakIn, b.breakOut);
              return (
                <div key={b.uid || b.id || idx} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span className="font-semibold text-slate-800">{opt.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span>
                      {formatTimeTo12Hour(b.breakIn)} – {formatTimeTo12Hour(b.breakOut)}
                    </span>
                    <Badge variant="info" className="font-mono text-[11px]">
                      {durMins} min{durMins === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AttendanceBreakManager;
