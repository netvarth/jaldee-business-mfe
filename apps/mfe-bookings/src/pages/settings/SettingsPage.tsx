import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FormSection,
  Input,
  PageHeader,
  SkeletonCard,
  Switch,
  Textarea,
} from "@jaldee/design-system";
import {
  useBookingPreferences,
  type BookingPreference,
} from "../../services/useBookingPreferences";

const toNumber = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);

export default function SettingsPage() {
  const { preference, loading, saving, error, savePreference } =
    useBookingPreferences();
  const [form, setForm] = useState<BookingPreference>({});

  useEffect(() => {
    if (preference) setForm(preference);
  }, [preference]);

  const setValue = <K extends keyof BookingPreference>(
    key: K,
    value: BookingPreference[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    try {
      await savePreference(form);
    } catch {
      // The hook maps the API failure to a user-facing toast.
    }
  };

  return (
    <main
      id="bookings-settings-page"
      data-testid="bookings-settings-page"
      className="h-full overflow-y-auto bg-slate-50"
    >
      <div className="w-full p-4 md:p-6">
        <PageHeader
          title="Booking Settings"
          subtitle="Tenant-wide preferences applied across booking calendars."
        />

        {loading ? (
          <SkeletonCard />
        ) : error ? (
          <Alert variant="danger" title="Unable to load booking settings">{error}</Alert>
        ) : (
          <form
            id="bookings-settings-form"
            data-testid="bookings-settings-form"
            className="grid items-start gap-6 lg:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <FormSection
              title="Slots and windows"
              description="Configure default timing, buffers, and how far ahead customers can book."
              className="h-full min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 [&>div:first-child]:min-h-[58px] [&>div:last-child]:items-start [&>div:last-child]:auto-rows-min"
            >
                <NumberField id="default-slot-duration" label="Default slot duration (min)" value={form.defaultSlotDuration} onChange={(value) => setValue("defaultSlotDuration", value)} />
                <NumberField id="buffer-time" label="Buffer between slots (min)" value={form.bufferTimeMinutes} onChange={(value) => setValue("bufferTimeMinutes", value)} />
                <NumberField id="lead-time" label="Lead time (min)" value={form.leadTimeMinutes} onChange={(value) => setValue("leadTimeMinutes", value)} />
                <NumberField id="booking-window" label="Booking window (days)" value={form.bookingWindowDays} onChange={(value) => setValue("bookingWindowDays", value)} />
                <NumberField id="minimum-advance" label="Minimum advance (min)" value={form.minAdvanceMinutes} onChange={(value) => setValue("minAdvanceMinutes", value)} />
                <NumberField id="maximum-advance" label="Maximum advance (days)" value={form.maxAdvanceDays} onChange={(value) => setValue("maxAdvanceDays", value)} />
            </FormSection>

            <FormSection
              title="Policy and branding"
              description="Set tenant presentation, cancellation guidance, and deposit requirements."
              className="h-full min-w-0 w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 [&>div:first-child]:min-h-[58px] [&>div:last-child]:items-start [&>div:last-child]:auto-rows-min"
            >
                  <Input
                    id="bookings-settings-timezone"
                    data-testid="bookings-settings-timezone"
                    label="Timezone"
                    value={form.timezone ?? ""}
                    onChange={(event) => setValue("timezone", event.target.value || null)}
                    placeholder="Asia/Kolkata"
                  />
                <div className="flex flex-col">
                  <label className="ds-form-label" htmlFor="bookings-settings-brand-color">Brand color</label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id="bookings-settings-brand-color-picker"
                      data-testid="bookings-settings-brand-color-picker"
                      type="color"
                      className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                      value={form.brandColor ?? "#0f172a"}
                      onChange={(event) => setValue("brandColor", event.target.value)}
                    />
                    <Input
                      id="bookings-settings-brand-color"
                      data-testid="bookings-settings-brand-color"
                      containerClassName="min-w-0 flex-1"
                      value={form.brandColor ?? ""}
                      onChange={(event) => setValue("brandColor", event.target.value || null)}
                      placeholder="#0f172a"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                    <Textarea
                      id="bookings-settings-cancellation-policy"
                      data-testid="bookings-settings-cancellation-policy"
                      label="Cancellation policy"
                      rows={4}
                      value={form.cancellationPolicy ?? ""}
                      onChange={(event) => setValue("cancellationPolicy", event.target.value || null)}
                    />
                </div>
                <div className="flex min-h-[74px] items-center rounded-lg border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <Switch label="Require a deposit at booking" checked={Boolean(form.depositRequired)} onChange={(checked) => setValue("depositRequired", checked)} />
                </div>
            </FormSection>

            <div className="flex justify-end border-t border-slate-200 pt-4 pb-8 lg:col-span-2">
              <Button
                id="bookings-settings-submit"
                data-testid="bookings-settings-submit"
                data-state={saving ? "saving" : "idle"}
                type="submit"
                loading={saving}
              >
                Save Settings
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value?: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
      <Input
        id={`bookings-settings-${id}`}
        data-testid={`bookings-settings-${id}`}
        type="number"
        min={0}
        label={label}
        value={value ?? ""}
        onChange={(event) => onChange(toNumber(event.target.value))}
      />
  );
}
