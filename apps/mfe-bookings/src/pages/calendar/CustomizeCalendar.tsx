import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  FormSection,
  Input,
  PageHeader,
} from "@jaldee/design-system";
import { useCalendars } from "../../services/useCalendars";
import type { Calendar } from "../../types";

const channels = ["Online", "Walk-in", "Phone-in"];

export default function CustomizeCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const calendar = (location.state as { calendar?: Calendar } | null)?.calendar;
  const { updateCalendarSettings } = useCalendars();
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    calendar?.bookingChannels ?? ["Online"],
  );
  const [capacity, setCapacity] = useState(
    calendar?.capacityOverride == null ? "" : String(calendar.capacityOverride),
  );
  const [tags, setTags] = useState<string[]>(calendar?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const value = tagDraft.trim();
    if (value && !tags.includes(value)) setTags((current) => [...current, value]);
    setTagDraft("");
  };

  const save = async () => {
    if (!calendar?.uid) return;
    setSaving(true);
    try {
      await updateCalendarSettings(calendar.uid, {
        color: calendar.color ?? null,
        users: calendar.users ?? [],
        bookingChannels: selectedChannels,
        capacityOverride: capacity.trim() ? Number(capacity) : null,
        tags,
      });
      navigate(-1);
    } catch {
      // The calendar hook maps the API failure to a user-facing toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      id="bookings-customize-calendar-page"
      data-testid="bookings-customize-calendar-page"
      data-state={calendar?.uid ? "ready" : "empty"}
      className="h-full overflow-y-auto bg-slate-50"
    >
      <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <PageHeader
          title="Customize Calendar"
          subtitle="Configure booking channels, capacity, and labels."
          back={{ label: "Back to calendar details", href: ".." }}
          onNavigate={() => navigate(-1)}
          actions={<Badge variant="success">{calendar?.name ?? "Calendar"}</Badge>}
        />

        {!calendar?.uid && (
          <Alert variant="danger">Open this screen from a calendar’s details to save settings.</Alert>
        )}

        <div className="space-y-6">
          <FormSection title="Booking channels" description="Select the channels available for this calendar.">
              {channels.map((channel) => {
                const selected = selectedChannels.includes(channel);
                const token = channel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <Checkbox
                    key={channel}
                    id={`bookings-customize-channel-${token}`}
                    data-testid={`bookings-customize-channel-${token}`}
                    label={channel}
                    checked={selected}
                    onChange={() =>
                        setSelectedChannels((current) =>
                          selected
                            ? current.filter((value) => value !== channel)
                            : [...current, channel],
                        )
                      }
                  />
                );
              })}
          </FormSection>

          <FormSection title="Capacity" description="Override the default slot capacity for this calendar.">
            <Input
              id="bookings-customize-capacity"
              data-testid="bookings-customize-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              label="Capacity override"
              placeholder="For example, 5"
            />
          </FormSection>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Tags and labels</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add labels used to segment this calendar.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  data-testid={`bookings-customize-tag-${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {tag}
                  <Button
                    id={`bookings-customize-tag-${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-remove`}
                    data-testid={`bookings-customize-tag-${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-remove`}
                    type="button"
                    aria-label={`Remove ${tag}`}
                    onClick={() => setTags((current) => current.filter((value) => value !== tag))}
                    variant="ghost"
                    size="inline"
                  >×</Button>
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                id="bookings-customize-tag-input"
                data-testid="bookings-customize-tag-input"
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                containerClassName="min-w-0 flex-1"
                placeholder="Add a label"
              />
              <Button
                id="bookings-customize-tag-add"
                data-testid="bookings-customize-tag-add"
                type="button"
                onClick={addTag}
                variant="secondary"
              >Add label</Button>
            </div>
          </section>

          <div className="flex justify-end gap-3 pb-8">
            <Button
              id="bookings-customize-calendar-cancel"
              data-testid="bookings-customize-calendar-cancel"
              type="button"
              onClick={() => navigate(-1)}
              variant="secondary"
            >Cancel</Button>
            <Button
              id="bookings-customize-calendar-submit"
              data-testid="bookings-customize-calendar-submit"
              data-state={saving ? "saving" : "idle"}
              type="button"
              disabled={!calendar?.uid}
              loading={saving}
              onClick={() => void save()}
            >Update Settings</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
