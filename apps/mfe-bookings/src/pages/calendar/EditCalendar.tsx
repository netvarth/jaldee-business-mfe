import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, FormSection, Input, PageHeader, Textarea } from "@jaldee/design-system";
import { useCalendars } from "../../services/useCalendars";
import type { Calendar } from "../../types";

function normalizeList(values: unknown[] | undefined, fallbackKeys: string[] = ["name", "displayName", "label", "title", "uid", "id"]) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (typeof value === "string") return value;
      if (value && typeof value === "object") {
        for (const key of fallbackKeys) {
          const candidate = (value as Record<string, unknown>)[key];
          if (typeof candidate === "string" && candidate.trim()) return candidate;
        }
      }
      return "";
    })
    .filter(Boolean);
}

export default function EditCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateCalendar } = useCalendars();
  const [submitting, setSubmitting] = useState(false);
  
  const calendar = (location.state as { calendar?: Calendar } | null)?.calendar;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!calendar || !calendar.uid) return;

    setSubmitting(true);
    try {
      const form = event.currentTarget;
      const name = (form.elements.namedItem("edit-calendar-name") as HTMLInputElement).value;
      const description = (form.elements.namedItem("edit-calendar-desc") as HTMLTextAreaElement).value;

      const updated = await updateCalendar(calendar.uid, {
        uid: calendar.uid,
        name: name.trim(),
        description: description.trim(),
        locationId: calendar.locationId ?? 0,
        locationName: calendar.locationName ?? "",
        services: normalizeList(calendar.services as unknown[], ["uid", "id", "name"]),
        users: normalizeList(calendar.users as unknown[], ["userUid", "uid", "id", "displayName", "name"]),
        channel: calendar.channel ?? "ONLINE",
        label: normalizeList(calendar.label as unknown[]),
        qrLinkRequired: calendar.qrLinkRequired ?? false,
        feature: calendar.feature ?? "BASE_CRM",
        status: calendar.status ?? "INACTIVE",
        color: calendar.color ?? "",
        bookingChannels: calendar.bookingChannels ?? [],
        capacityOverride: calendar.capacityOverride ?? 0,
        tags: calendar.tags ?? [],
      });

      // Navigate back with updated state if needed, or to details page
      navigate(`/calendars/${calendar.uid}/details`, { state: { calendar: updated }, replace: true });
    } catch (e) {
      console.error("Failed to update calendar", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main data-testid="bookings-edit-calendar-page" className="h-full overflow-y-auto bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Edit Calendar" subtitle="Update the calendar name and description." />
        <form
          data-testid="bookings-edit-calendar-form"
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 md:p-6"
          onSubmit={handleSubmit}
        >
          <FormSection title="Calendar details">
            <Input id="edit-calendar-name" name="edit-calendar-name" data-testid="bookings-edit-calendar-name" label="Calendar name" required defaultValue={calendar?.name ?? ""} />
            <Textarea id="edit-calendar-desc" name="edit-calendar-desc" data-testid="bookings-edit-calendar-description" label="Calendar description" defaultValue={calendar?.description ?? ""} className="md:col-span-2" />
          </FormSection>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>Discard</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
