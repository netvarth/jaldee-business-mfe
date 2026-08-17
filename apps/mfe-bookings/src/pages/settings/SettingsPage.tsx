import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, Bell, CreditCard, ShieldCheck, Info } from "lucide-react";
import {
  Alert,
  Button,
  Input,
  PageHeader,
  SkeletonCard,
  Switch,
  Textarea,
  cn,
} from "@jaldee/design-system";
import {
  useBookingPreferences,
  type BookingPreference,
} from "../../services/useBookingPreferences";

const toNumber = (value: string): number | null =>
  value.trim() === "" ? null : Number(value);

const SECTIONS = [
  { key: "timing", label: "Timing & Windows", icon: <Clock size={18} /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={18} /> },
  { key: "payments", label: "Payments", icon: <CreditCard size={18} /> },
  { key: "policies", label: "Policies", icon: <ShieldCheck size={18} /> },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const card = {
  background: "#fff",
  borderRadius: "16px",
  border: "1px solid var(--border-color, #e2e8f0)",
};

export default function SettingsPage() {
  const { preference, loading, saving, error, savePreference } =
    useBookingPreferences();
  const navigate = useNavigate();
  const { section: routeSection } = useParams<{ section?: string }>();
  const [form, setForm] = useState<BookingPreference>({});

  const section = SECTIONS.some(({ key }) => key === routeSection)
    ? (routeSection as SectionKey)
    : "timing";

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

  const navigateToSection = (nextSection: SectionKey) => {
    navigate(`/settings/${nextSection}`);
  };

  const ActiveSection = () => {
    switch (section) {
      case "timing":
        return <TimingWindows form={form} setValue={setValue} />;
      case "notifications":
        return <Notifications form={form} setValue={setValue} />;
      case "payments":
        return <Payments form={form} setValue={setValue} />;
      case "policies":
        return <Policies form={form} setValue={setValue} />;
      default:
        return null;
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
          subtitle="Tenant-wide preferences applied across booking calendars"
        />

        {loading ? (
          <SkeletonCard />
        ) : error ? (
          <Alert variant="danger" title="Unable to load booking settings">
            {error}
          </Alert>
        ) : (
          <form
            id="bookings-settings-form"
            data-testid="bookings-settings-form"
            className="mt-6 grid items-start gap-6 md:grid-cols-[240px_1fr]"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <nav
              id="bookings-settings-sections"
              data-testid="bookings-settings-sections"
              style={{ ...card, padding: 8, position: "sticky", top: 24 }}
              className="hidden md:flex flex-col gap-1"
            >
              {SECTIONS.map((item) => {
                const isActive = section === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    id={`bookings-settings-section-${item.key}`}
                    data-testid={`bookings-settings-section-${item.key}`}
                    onClick={() => navigateToSection(item.key)}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left",
                      isActive
                        ? "bg-purple-50 text-purple-700"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <span
                      className={cn(
                        isActive ? "text-purple-600" : "text-slate-400"
                      )}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="min-w-0 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <ActiveSection />
              <div className="mt-8 flex justify-end">
                <Button
                  id="bookings-settings-submit"
                  data-testid="bookings-settings-submit"
                  data-state={saving ? "saving" : "idle"}
                  type="submit"
                  loading={saving}
                >
                  Save
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function TimingWindows({ form, setValue }: any) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
          <Clock size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Timing & Windows</h2>
          <p className="text-sm text-slate-500">
            How far ahead and how soon customers can book. Drives all slot math.
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 mt-4">
        <Input
          id="bookings-settings-timezone"
          data-testid="bookings-settings-timezone"
          label="Timezone"
          value={form.timezone ?? ""}
          onChange={(event) => setValue("timezone", event.target.value || null)}
          placeholder="Asia/Kolkata"
        />
        <NumberField id="booking-window" label="Booking window (days)" value={form.bookingWindowDays} onChange={(value) => setValue("bookingWindowDays", value)} />
        <NumberField id="lead-time" label="Lead time (min)" value={form.leadTimeMinutes} onChange={(value) => setValue("leadTimeMinutes", value)} />
        <NumberField id="default-slot-duration" label="Default slot duration (min)" value={form.defaultSlotDuration} onChange={(value) => setValue("defaultSlotDuration", value)} />
        <NumberField id="buffer-time" label="Buffer between slots (min)" value={form.bufferTimeMinutes} onChange={(value) => setValue("bufferTimeMinutes", value)} />
        <NumberField id="minimum-advance" label="Minimum advance (min)" value={form.minAdvanceMinutes} onChange={(value) => setValue("minAdvanceMinutes", value)} />
        <NumberField id="maximum-advance" label="Maximum advance (days)" value={form.maxAdvanceDays} onChange={(value) => setValue("maxAdvanceDays", value)} />
      </div>
    </div>
  );
}

function Policies({ form, setValue }: any) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Policies</h2>
          <p className="text-sm text-slate-500">
            Set cancellation guidance and deposit requirements.
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 mt-4">
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
      </div>
    </div>
  );
}

function Notifications({ form, setValue }: any) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
          <Bell size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500">
            Communication policy for bookings — who gets notified, and when.
          </p>
        </div>
      </div>
      
      <div className="flex flex-col mt-4">
        <div className="flex items-center justify-between border-b border-slate-100 py-4">
          <div>
            <div className="font-semibold text-slate-900 text-sm">Booking confirmation</div>
            <div className="text-slate-500 text-sm">Send a confirmation when a booking is made.</div>
          </div>
          <Switch checked={Boolean(form.confirmationEnabled)} onChange={(checked) => setValue("confirmationEnabled", checked)} />
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 py-4">
          <div>
            <div className="font-semibold text-slate-900 text-sm">Reminders</div>
            <div className="text-slate-500 text-sm">Send reminder(s) before the appointment.</div>
          </div>
          <Switch checked={Boolean(form.reminderEnabled)} onChange={(checked) => setValue("reminderEnabled", checked)} />
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 py-4">
          <div>
            <div className="font-semibold text-slate-900 text-sm">Cancellation notice</div>
            <div className="text-slate-500 text-sm">Notify when a booking is cancelled.</div>
          </div>
          <Switch checked={Boolean(form.cancellationEnabled)} onChange={(checked) => setValue("cancellationEnabled", checked)} />
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 py-4">
          <div>
            <div className="font-semibold text-slate-900 text-sm">Notify customer</div>
            <div className="text-slate-500 text-sm">Master switch for customer-facing notifications.</div>
          </div>
          <Switch checked={Boolean(form.notifyCustomer)} onChange={(checked) => setValue("notifyCustomer", checked)} />
        </div>
        <div className="flex items-center justify-between py-4">
          <div>
            <div className="font-semibold text-slate-900 text-sm">Notify provider / staff</div>
            <div className="text-slate-500 text-sm">Master switch for provider/staff notifications.</div>
          </div>
          <Switch checked={Boolean(form.notifyProvider)} onChange={(checked) => setValue("notifyProvider", checked)} />
        </div>
      </div>
    </div>
  );
}

function Payments({ form, setValue }: any) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
          <CreditCard size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Payments</h2>
          <p className="text-sm text-slate-500">
            Tenant-wide payment framework and refund policy.
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 mt-4">
        <div>
          <Input
            id="bookings-settings-currency"
            data-testid="bookings-settings-currency"
            label="Currency"
            value={form.currency ?? ""}
            onChange={(event) => setValue("currency", event.target.value || null)}
            placeholder="INR — Indian Rupee"
          />
        </div>
        <div className="flex min-h-[74px] items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <div className="font-semibold text-slate-900 text-sm">Refund on cancel</div>
            <div className="text-slate-500 text-xs mt-0.5">Auto-refund a paid deposit when a booking is cancelled.</div>
          </div>
          <Switch checked={Boolean(form.refundOnCancel)} onChange={(checked) => setValue("refundOnCancel", checked)} />
        </div>
        <div className="md:col-span-2 flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 border border-slate-100">
          <Info size={18} className="text-slate-400" />
          <span>Deposit amount and type are set per service, not here.</span>
        </div>
      </div>
    </div>
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
