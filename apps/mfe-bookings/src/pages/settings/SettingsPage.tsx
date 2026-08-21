import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, Bell, CreditCard, ShieldCheck, Info, User, Building2, Lightbulb, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
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

function Accordion({
  title,
  icon,
  subtitle,
  children,
  defaultExpanded = false,
}: {
  title: string;
  icon: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-4">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 bg-white transition-colors hover:bg-slate-50 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </div>
          <div>
            <div className="font-bold text-slate-900">{title}</div>
            {subtitle && <div className="text-sm text-slate-500 mt-0.5">{subtitle}</div>}
          </div>
        </div>
        <div className="text-slate-400">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 border-t border-slate-100 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function Notifications({ form, setValue }: any) {
  const navigate = useNavigate();
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
      
      <div className="flex flex-col mt-4 gap-6">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-900">Send Notifications</span>
          <Switch checked={Boolean(form.sendNotifications)} onChange={(checked) => setValue("sendNotifications", checked)} />
        </div>

        <div>
          <h3 className="font-bold text-slate-900 mb-4">Channel Toggles</h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Enable SMS Notifications</span>
              <Switch checked={Boolean(form.enableSmsNotifications)} onChange={(checked) => setValue("enableSmsNotifications", checked)} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Enable Walkin Notifications</span>
              <Switch checked={Boolean(form.enableWalkinNotifications)} onChange={(checked) => setValue("enableWalkinNotifications", checked)} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Enable Online Notifications</span>
              <Switch checked={Boolean(form.enableOnlineNotifications)} onChange={(checked) => setValue("enableOnlineNotifications", checked)} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Enable Whatsapp Notifications</span>
              <Switch checked={Boolean(form.enableWhatsappNotifications)} onChange={(checked) => setValue("enableWhatsappNotifications", checked)} />
            </div>
          </div>
        </div>

        <div className="mt-2">
          <Accordion 
            title="Gateway Details (Plivo)" 
            icon={<CreditCard size={20} />}
            defaultExpanded={true}
          >
            <div className="flex flex-col gap-3">
              <div className="font-bold text-slate-900">Plivo</div>
              <div>
                <Button type="button" onClick={() => {}} className="bg-[#2E72A5] hover:bg-[#205b87] border-0">Add Details</Button>
              </div>
              <div className="text-sm text-slate-700 mt-2">
                <div>Remaining SMS Credits: <span className="font-bold text-[#1e3a8a]">435</span></div>
                <div>Remaining Whatsapp Credits: <span className="font-bold text-[#1e3a8a]">34</span></div>
              </div>
              <div className="flex gap-2 text-sm text-slate-700 mt-2 items-start">
                <Lightbulb size={16} className="shrink-0 mt-0.5 text-yellow-500" />
                <span>In order to send and receive notifications, kindly get in touch with our support team at the following contact information: +91 8714766671. They will be happy to assist you</span>
              </div>
            </div>
          </Accordion>

          <button
            type="button"
            className="w-full flex items-center justify-between p-4 bg-white transition-colors hover:bg-slate-50 text-left rounded-xl border border-slate-200 mb-4"
            onClick={() => navigate('/settings/customer-notifications')}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <User size={20} />
              </div>
              <div>
                <div className="font-bold text-slate-900">Customer</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Send notifications to your customers!
                </div>
              </div>
            </div>
            <div className="text-slate-400">
              <ChevronRight size={20} />
            </div>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-between p-4 bg-white transition-colors hover:bg-slate-50 text-left rounded-xl border border-slate-200 mb-4"
            onClick={() => { /* Navigate to Staffs Notifications */ }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Building2 size={20} />
              </div>
              <div>
                <div className="font-bold text-slate-900">Staffs</div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Get notifications from staffs!
                </div>
              </div>
            </div>
            <div className="text-slate-400">
              <ChevronRight size={20} />
            </div>
          </button>
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
