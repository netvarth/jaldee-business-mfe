import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, FormSection, Input, PageHeader } from "@jaldee/design-system";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCalendars } from "../../services/useCalendars";
import { useUsers } from "../../services/useUsers";
import type { Calendar } from "../../types";

const PRESET_COLORS = [
  "#0F766E", "#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#16A34A", "#475569", "#111827",
  "#0891B2", "#E11D48"
];
function normalizeColor(value?: string | null) {
  if (!value) return "#2563EB";
  return value.startsWith("#") ? value : `#${value}`;
}

function sanitizeHex(value: string) {
  const next = value.trim().replace(/[^#a-fA-F0-9]/g, "");
  if (!next) return "";
  return next.startsWith("#") ? next.slice(0, 7) : `#${next.slice(0, 6)}`;
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export default function CalendarSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ uid: string }>();
  const initialCalendar = (location.state as { calendar?: Calendar } | null)?.calendar ?? null;
  const calendarUid = params.uid ?? initialCalendar?.uid ?? "";
  const { getCalendar, updateCalendarExtendedSettings } = useCalendars();
  const { users, loading: loadingUsers } = useUsers();
  const [calendar, setCalendar] = useState<Calendar | null>(initialCalendar);
  const [loading, setLoading] = useState(Boolean(calendarUid));
  const [saving, setSaving] = useState(false);
  const [color, setColor] = useState(normalizeColor(initialCalendar?.color));
  const [selectedUsers, setSelectedUsers] = useState<string[]>(initialCalendar?.users ?? []);
  const [tags, setTags] = useState<string[]>(initialCalendar?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    if (!calendarUid) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function loadCalendar() {
      setLoading(true);
      try {
        const data = await getCalendar(calendarUid);
        if (cancelled) return;
        setCalendar(data);
        setColor(normalizeColor(data.color));
        setSelectedUsers(data.users ?? []);
        setTags(data.tags ?? []);
      } catch {
        if (!cancelled) setCalendar(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCalendar();
    return () => {
      cancelled = true;
    };
  }, [calendarUid, getCalendar]);

  const selectedUserRecords = useMemo(
    () => users.filter((user) => selectedUsers.includes(user.userUid)),
    [selectedUsers, users],
  );

  const availableUsers = useMemo(
    () => users.filter((user) => !selectedUsers.includes(user.userUid)),
    [selectedUsers, users],
  );

  const save = async () => {
    if (!calendarUid) return;
    setSaving(true);
    try {
      const updated = await updateCalendarExtendedSettings(calendarUid, {
        color: isHexColor(color) ? color : normalizeColor(calendar?.color),
        users: selectedUsers,
        bookingChannels: calendar?.bookingChannels ?? [],
        capacityOverride: calendar?.capacityOverride ?? 0,
        tags: calendar?.tags ?? tags,
        status: calendar?.status ?? "ACTIVE",
      });
      navigate(`/calendars/${calendarUid}/details`, { replace: true, state: { calendar: updated } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="h-full flex flex-col bg-slate-50 calendar-details-page" data-testid="bookings-calendar-settings-page">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 md:px-6">
        <PageHeader
          title="Calendar Settings"
          subtitle="Manage color and assigned users."
          back={{ label: "Back to calendar details", href: calendarUid ? `/calendars/${calendarUid}/details` : "/calendars" }}
          onNavigate={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}
          actions={calendar ? <Badge variant="success">{calendar.name}</Badge> : undefined}
          className="mb-4"
        />
      </header>

      <div className="calendar-details-layout" style={{ overflowY: "auto" }}>
        <div className="max-w-5xl">
          {!calendarUid && <Alert variant="danger" className="mb-4">Open this screen from a calendar to update settings.</Alert>}

        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading calendar...</div>
        ) : (
          <div className="wizard-step-panel active" style={{ display: 'block', margin: 0, maxWidth: 'none' }}>
            <div className="wizard-form">
              <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] mb-8">
                <div>
                  <div className="section-header-row mb-4">
                    <h2 className="section-title m-0">Calendar Color</h2>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Choose a preset color or enter a custom hex value.</p>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`h-10 w-10 shrink-0 rounded-full border-2 ${color.toLowerCase() === preset.toLowerCase() ? "border-slate-900" : "border-white ring-1 ring-slate-200"}`}
                        style={{ backgroundColor: preset }}
                        onClick={() => setColor(preset)}
                        aria-label={`Select ${preset}`}
                      />
                    ))}
                    
                    <label
                      className={`relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 ${!PRESET_COLORS.map(c => c.toLowerCase()).includes(color.toLowerCase()) ? "border-slate-900" : "border-white ring-1 ring-slate-200"}`}
                      title="Custom Color"
                      style={{ background: "linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet)" }}
                    >
                      <input
                        type="color"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        value={isHexColor(color) ? color : "#ffffff"}
                        onChange={(event) => setColor(sanitizeHex(event.target.value))}
                        aria-label="Custom Color Picker"
                      />
                    </label>
                  </div>
                  <div className="form-group w-1/2">
                    <Input
                      id="bookings-calendar-settings-color"
                      data-testid="bookings-calendar-settings-color"
                      label="Hex color"
                      className="wiz-sch-input"
                      value={color}
                      onChange={(event) => setColor(sanitizeHex(event.target.value))}
                      placeholder="#2563EB"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                  <p className="text-sm font-bold text-slate-900">Live Preview</p>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="h-12 w-12 rounded-2xl" style={{ backgroundColor: isHexColor(color) ? color : "#2563EB" }} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{calendar?.name ?? "Calendar"}</p>
                        <p className="text-xs text-slate-500">{calendar?.status ?? "ACTIVE"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <hr className="border-slate-200 my-8" />

              <section>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="section-header-row">
                    <h2 className="section-title m-0">Assigned Users</h2>
                  </div>
                  <Badge variant="success">{selectedUsers.length} selected</Badge>
                </div>
                <p className="text-sm text-slate-500 mb-6">Assign practitioners or staff members to this calendar.</p>
                
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Available users</p>
                    <div className="mt-4 space-y-3">
                      {loadingUsers ? (
                        <p className="text-sm text-slate-500">Loading users...</p>
                      ) : availableUsers.length ? (
                        availableUsers.map((user) => (
                          <div key={user.userUid} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
                              <p className="text-xs text-slate-500">{user.title || "User"}</p>
                            </div>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedUsers((current) => [...current, user.userUid])}>Add User</Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400 italic">No more active users available.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigned users</p>
                    <div className="mt-4 space-y-3">
                      {selectedUserRecords.length ? (
                        selectedUserRecords.map((user) => (
                          <div key={user.userUid} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
                              <p className="text-xs text-slate-500">{user.title || "User"}</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setSelectedUsers((current) => current.filter((value) => value !== user.userUid))}>Remove</Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400 italic">No users assigned.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <div className="wizard-footer-actions mt-12">
                <Button type="button" variant="secondary" className="btn-wizard-discard" onClick={() => navigate(calendarUid ? `/calendars/${calendarUid}/details` : "/calendars")}>Cancel</Button>
                <Button type="button" loading={saving} disabled={!calendarUid || !isHexColor(color)} onClick={() => void save()}>
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
