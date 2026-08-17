import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Avatar, Badge, Button, Calendar, Container, Icon, Input, SectionCard, StatCard, Switch, Textarea, buttonVariants } from "@jaldee/design-system";
import { useAuth } from "../auth/AuthProvider";
import { useAppStore } from "../store/appStore";
import { accountPath } from "../utils/accountRoutes";

export type ConsumerSection = "book" | "bookings" | "profile" | "orders" | "payments" | "wallet" | "addresses" | "saved" | "notifications" | "support" | "settings";

const pageCopy: Record<ConsumerSection, { eyebrow: string; title: string; description: string; action: string }> = {
  book: { eyebrow: "NEW APPOINTMENT", title: "Book an Appointment", description: "Choose a service, clinician, and convenient appointment time.", action: "" },
  bookings: { eyebrow: "APPOINTMENTS", title: "My Bookings", description: "Manage upcoming visits and review your appointment history.", action: "Book appointment" },
  profile: { eyebrow: "MY ACCOUNT", title: "Profile", description: "Keep your personal, contact, and care information up to date.", action: "Save changes" },
  orders: { eyebrow: "SHOPPING", title: "My Orders", description: "Track purchases, deliveries, and order history.", action: "Start shopping" },
  payments: { eyebrow: "BILLING", title: "Payments", description: "Review invoices, receipts, refunds, and payment methods.", action: "Add payment method" },
  wallet: { eyebrow: "JALDEE WALLET", title: "Wallet", description: "Manage your wallet balance, credits, and transactions.", action: "Add money" },
  addresses: { eyebrow: "ACCOUNT", title: "Addresses", description: "Manage addresses used for visits, billing, and delivery.", action: "Add address" },
  saved: { eyebrow: "FAVOURITES", title: "Saved Items", description: "Keep services and products you want to revisit.", action: "Browse services" },
  notifications: { eyebrow: "INBOX", title: "Notifications", description: "Stay updated on appointments, orders, and account activity.", action: "Mark all as read" },
  support: { eyebrow: "HELP CENTRE", title: "Support", description: "Get answers or contact the Jaldee support team.", action: "Contact support" },
  settings: { eyebrow: "PREFERENCES", title: "Settings", description: "Control communication, privacy, and account preferences.", action: "Save changes" },
};

export default function ConsumerSectionPage({ section }: { section: ConsumerSection }) {
  const { logout } = useAuth();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const user = useAppStore((state) => state.user);
  const { accountSlug } = useParams();
  const location = useLocation();
  const route = (path: string) => accountPath(accountSlug, path);
  const copy = pageCopy[section];
  const nav = [
    ["Dashboard", "/account"], ["My Bookings", "/bookings"], ["My Orders", "/orders"], ["Payments", "/payments"],
    ["Addresses", "/addresses"], ["Saved Items", "/saved"],
    ["Profile", "/profile"], ["Support", "/support"],
  ];

  return (
    <div className="consumer-dashboard text-[var(--color-text-primary)]">
      {isAuthenticated && (
        <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-30 hidden border-r border-[var(--color-border)] bg-white md:flex md:flex-col">
          <Link to={route("/account")} className="flex items-center gap-3 px-1 text-2xl font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-primary)] text-white">J</span>Jaldee</Link>
          <nav className="mt-9 space-y-1" aria-label="Account navigation">
            {nav.map(([label, path]) => { const active = location.pathname.endsWith(path); return <Link key={path} to={route(path)} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium transition ${active ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]" : "text-slate-700 hover:bg-[var(--color-surface-alt)]"}`}><span className="h-2 w-2 rounded-full border border-current" />{label}</Link>; })}
          </nav>
        </aside>
      )}

      <div className={`dashboard-shell ${isAuthenticated ? "md:pl-[250px]" : ""}`}>
        <header className="dashboard-header sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
          {isAuthenticated ? (
            <>
              <Link to={route("/account")} className="text-xl font-bold md:hidden">Jaldee</Link><span className="hidden md:block" />
            </>
          ) : (
            <Link to={route("/")} className="flex items-center gap-2.5 text-xl font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-primary)] text-white text-base font-bold">J</span>Jaldee</Link>
          )}
          {isAuthenticated ? (
            <div className="flex items-center gap-3"><Link to={route("/profile")} className="flex items-center gap-3"><Avatar name={user?.name || "Consumer"} size="sm" /><span className="hidden text-sm font-semibold sm:block">{user?.name || "Consumer"}</span></Link><Button variant="ghost" size="sm" onClick={() => void logout()}>Sign out</Button></div>
          ) : (
            <div className="flex items-center gap-3"><Link to={route("/login")} state={{ from: `${location.pathname}${location.search}` }} className={buttonVariants({ variant: "outline", size: "sm" })}>Sign in</Link></div>
          )}
        </header>

        <main className="py-8">
          <Container size="2xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold tracking-[0.14em] text-[var(--color-primary)]">{copy.eyebrow}</p><h1 className="mt-2 text-3xl font-bold">{copy.title}</h1><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{copy.description}</p></div>{section === "bookings" ? <Link to={route("/booking")} className={buttonVariants({ size: "lg" })}>Book appointment</Link> : section !== "book" && section !== "profile" && <Button size="lg">{copy.action}</Button>}</div>
            <div className="mt-7">{renderSection(section)}</div>
          </Container>
        </main>
      </div>
    </div>
  );
}

function renderSection(section: ConsumerSection): ReactNode {
  if (section === "book") return <BookingExperience />;
  if (section === "profile") return <ProfileExperience />;
  if (section === "bookings") return <><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Upcoming" value="2" accent="indigo" icon={<Icon name="calendar" />} /><StatCard label="Completed" value="18" accent="emerald" icon={<Icon name="calendar" />} /><StatCard label="Cancelled" value="1" accent="slate" icon={<Icon name="history" />} /></div><SectionCard className="mt-5" title="Upcoming bookings" padding={false}><BookingListItem doctor="Dr. Anitha Kumar" specialty="General Medicine" date="14 Aug 2026" time="10:30 AM" type="Video visit" primary /><BookingListItem doctor="Dr. Rahul Menon" specialty="Dental Care" date="22 Aug 2026" time="4:00 PM" type="Clinic visit" /></SectionCard><SectionCard className="mt-5" title="Past bookings" padding={false}><Rows rows={[["Dr. Neha Thomas", "Dermatology · 28 Jul 2026", "Completed"], ["Dr. Anitha Kumar", "General Medicine · 12 Jun 2026", "Completed"], ["Jaldee Diagnostics", "Health check · 04 May 2026", "Completed"]]} /></SectionCard></>;
  if (section === "orders") return <><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Active orders" value="1" accent="amber" icon={<Icon name="box" />} /><StatCard label="Delivered" value="12" accent="emerald" icon={<Icon name="box" />} /><StatCard label="Total orders" value="13" accent="indigo" icon={<Icon name="cart" />} /></div><SectionCard className="mt-5" title="Order history" padding={false}><Rows rows={[["#ORD10882", "Processing · Expected 16 Aug", "₹1,899"], ["#ORD10821", "Delivered · 10 Aug 2026", "₹950"], ["#ORD10765", "Delivered · 04 Aug 2026", "₹1,299"]]} /></SectionCard></>;
  if (section === "payments") return <><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Total paid" value="₹8,450" accent="indigo" /><StatCard label="Pending" value="₹0" accent="emerald" /><StatCard label="Refunds" value="₹450" accent="amber" /></div><SectionCard className="mt-5" title="Recent transactions" padding={false}><Rows rows={[["Consultation payment", "14 Aug 2026 · UPI", "₹450"], ["Order #ORD10882", "10 Aug 2026 · Visa •••• 4242", "₹1,899"], ["Wallet top-up", "02 Aug 2026 · UPI", "₹1,000"]]} /></SectionCard></>;
  if (section === "wallet") return <><section className="rounded-xl bg-[var(--color-primary)] p-7 text-white"><p className="text-sm opacity-80">Available balance</p><p className="mt-2 text-3xl font-bold">₹1,250</p><p className="mt-6 text-xs opacity-75">Jaldee Wallet · Updated just now</p></section><SectionCard className="mt-5" title="Wallet activity" padding={false}><Rows rows={[["Referral reward", "12 Aug 2026", "+ ₹250"], ["Wallet top-up", "02 Aug 2026", "+ ₹1,000"], ["Order payment", "28 Jul 2026", "− ₹425"]]} /></SectionCard></>;
  if (section === "addresses") return <div className="grid gap-4 md:grid-cols-2"><AddressCard title="Home" address="12 Lake View Road, Kochi, Kerala 682001" primary /><AddressCard title="Office" address="Jaldee Tower, Infopark Road, Kakkanad 682030" /></div>;
  if (section === "saved") return <div className="grid gap-4 md:grid-cols-3"><SavedCard title="Annual health check" type="Healthcare service" /><SavedCard title="Vitamin wellness pack" type="Health product" /><SavedCard title="Dr. Anitha Kumar" type="General Medicine" /></div>;
  if (section === "notifications") return <SectionCard title="Latest updates" padding={false}><Rows rows={[["Appointment confirmed", "Dr. Anitha Kumar · 2 hours ago", "New"], ["Payment receipt available", "Invoice #JL-2048 · Yesterday", "New"], ["Order delivered", "Order #ORD10821 · 2 days ago", "Read"], ["Test reports available", "Jaldee Health Centre · 3 days ago", "Read"]]} /></SectionCard>;
  if (section === "support") return <><div className="grid gap-4 md:grid-cols-3"><SupportCard title="Chat with us" detail="Typically replies in a few minutes" /><SupportCard title="Call support" detail="Available daily, 8 AM–8 PM" /><SupportCard title="Email support" detail="We reply within one business day" /></div><SectionCard className="mt-5" title="Frequently asked questions"><Rows rows={[["How do I reschedule a booking?", "Bookings and appointments", "›"], ["Where can I download receipts?", "Payments and invoices", "›"], ["How do refunds work?", "Orders and wallet", "›"]]} /></SectionCard></>;
  return <div className="grid gap-5 lg:grid-cols-2"><SectionCard title="Notifications"><Setting label="Appointment reminders" /><Setting label="Order and delivery updates" /><Setting label="Offers and recommendations" /></SectionCard><SectionCard title="Privacy & security"><Setting label="Profile visibility" /><Setting label="Personalised experiences" /><Setting label="Two-step verification" /></SectionCard></div>;
}

function Rows({ rows }: { rows: string[][] }) { return <div className="divide-y divide-[var(--color-border)]">{rows.map((row) => <div key={row[0]} className="flex items-center gap-4 px-4 py-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon name="box" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{row[0]}</p><p className="text-xs text-[var(--color-text-secondary)]">{row[1]}</p></div><span className="text-sm font-semibold">{row[2]}</span></div>)}</div>; }
function AddressCard({ title, address, primary }: { title: string; address: string; primary?: boolean }) { return <SectionCard title={title} actions={primary ? <Badge variant="success">Primary</Badge> : null}><p className="text-sm leading-6 text-[var(--color-text-secondary)]">{address}</p><div className="mt-5 flex gap-2"><Button variant="outline" size="sm">Edit</Button><Button variant="ghost" size="sm">Remove</Button></div></SectionCard>; }
function SavedCard({ title, type }: { title: string; type: string }) { return <SectionCard><div className="grid h-24 place-items-center rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon name="calendar" className="h-8 w-8" /></div><h3 className="mt-4 text-base font-semibold">{title}</h3><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{type}</p><Button className="mt-4" variant="outline" fullWidth>View details</Button></SectionCard>; }
function SupportCard({ title, detail }: { title: string; detail: string }) { return <SectionCard><h3 className="text-base font-semibold">{title}</h3><p className="mt-2 min-h-10 text-sm text-[var(--color-text-secondary)]">{detail}</p><Button className="mt-4" variant="outline">Get help</Button></SectionCard>; }
function Setting({ label }: { label: string }) { return <label className="flex items-center justify-between border-b border-[var(--color-border)] py-4 text-sm font-medium last:border-0"><span>{label}</span><input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--color-primary)]" /></label>; }
function BookingListItem({ doctor, specialty, date, time, type, primary }: { doctor: string; specialty: string; date: string; time: string; type: string; primary?: boolean }) { return <article className="flex flex-col gap-4 border-b border-[var(--color-border)] p-4 last:border-0 sm:flex-row sm:items-center"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon name="calendar" className="h-6 w-6" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{doctor}</h3>{primary && <Badge variant="info">Next booking</Badge>}</div><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{specialty}</p><p className="mt-2 text-xs text-[var(--color-text-secondary)]">{date} · {time} · {type}</p></div><div className="flex gap-2"><Button variant="outline" size="sm">Reschedule</Button><Button size="sm">View details</Button></div></article>; }

function ProfileExperience() {
  const user = useAppStore((state) => state.user);
  const [preferences, setPreferences] = useState({ appointments: true, orders: true, offers: false });
  return <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
    <div className="space-y-5">
      <SectionCard><div className="flex flex-col items-center py-3 text-center"><Avatar name={user?.name || "Consumer"} size="lg" /><h2 className="mt-4 text-xl font-bold">{user?.name || "Consumer"}</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{user?.email || "consumer@jaldee.com"}</p><Badge variant="success" className="mt-3" dot>Verified account</Badge><Button variant="outline" size="sm" className="mt-5">Change photo</Button></div></SectionCard>
      <SectionCard title="Profile completion"><div className="flex items-end justify-between"><span className="text-3xl font-bold">88%</span><span className="text-xs text-[var(--color-text-secondary)]">Almost there</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-alt)]"><div className="h-full w-[88%] rounded-full bg-[var(--color-primary)]" /></div><p className="mt-3 text-xs leading-5 text-[var(--color-text-secondary)]">Add an emergency contact and identity document to complete your profile.</p></SectionCard>
      <SectionCard title="Account security"><div className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Mobile number</p><p className="text-xs text-[var(--color-text-secondary)]">Verified</p></div><Badge variant="success">Secure</Badge></div><Button variant="outline" fullWidth>Manage sign-in</Button></div></SectionCard>
    </div>
    <div className="space-y-5">
      <SectionCard title="Personal information"><div className="grid gap-4 sm:grid-cols-2"><Input label="Full name" defaultValue={user?.name || "Manikandan Velayudhan"} /><Input label="Email address" type="email" defaultValue={user?.email || "manikandan@example.com"} /><Input label="Mobile number" defaultValue="+91 98765 43210" /><Input label="Date of birth" type="date" defaultValue="1990-06-15" /><label className="flex flex-col gap-1.5 text-sm font-semibold">Gender<select defaultValue="male" className="h-[38px] rounded-md border border-[var(--color-border)] bg-white px-3 font-normal"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="private">Prefer not to say</option></select></label><Input label="Preferred language" defaultValue="English" /></div><div className="mt-5 flex justify-end"><Button>Save personal information</Button></div></SectionCard>
      <SectionCard title="Emergency contact"><div className="grid gap-4 sm:grid-cols-3"><Input label="Contact name" placeholder="Add a trusted contact" /><Input label="Relationship" placeholder="e.g. Spouse" /><Input label="Phone number" placeholder="+91" /></div><div className="mt-5 flex justify-end"><Button variant="outline">Save contact</Button></div></SectionCard>
      <SectionCard title="Documents" actions={<Button variant="outline" size="sm">Upload document</Button>}><div className="divide-y divide-[var(--color-border)]"><ProfileDocument title="Government ID" detail="Aadhaar · ending 4821" status="Verified" /><ProfileDocument title="Health insurance" detail="No document uploaded" status="Add document" /></div></SectionCard>
      <SectionCard title="Communication preferences"><div className="divide-y divide-[var(--color-border)]"><Preference label="Appointment reminders" detail="Booking confirmations and visit reminders" checked={preferences.appointments} onChange={(checked) => setPreferences({ ...preferences, appointments: checked })} /><Preference label="Order updates" detail="Delivery and payment status notifications" checked={preferences.orders} onChange={(checked) => setPreferences({ ...preferences, orders: checked })} /><Preference label="Offers and recommendations" detail="Relevant services and wellness updates" checked={preferences.offers} onChange={(checked) => setPreferences({ ...preferences, offers: checked })} /></div></SectionCard>
    </div>
  </div>;
}

function ProfileDocument({ title, detail, status }: { title: string; detail: string; status: string }) { return <div className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon name="box" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-[var(--color-text-secondary)]">{detail}</p></div><Button variant="ghost" size="sm">{status}</Button></div>; }
function Preference({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) { return <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{detail}</p></div><Switch checked={checked} onChange={onChange} /></div>; }

type BookingService = { id: string; name: string; description: string; duration: string; fee: string; doctors: string[] };
const bookingServices: BookingService[] = [
  { id: "general", name: "General Consultation", description: "Assessment, diagnosis, and preventive health advice.", duration: "30 min", fee: "₹450", doctors: ["Dr. Anitha Kumar", "Dr. Rahul Menon"] },
  { id: "dermatology", name: "Dermatology", description: "Skin, hair, allergy, and personalised treatment consultation.", duration: "45 min", fee: "₹700", doctors: ["Dr. Neha Thomas", "Dr. Meera Nair"] },
  { id: "pediatrics", name: "Pediatric Care", description: "Child wellness, development, and routine clinical care.", duration: "30 min", fee: "₹550", doctors: ["Dr. David Joseph", "Dr. Priya Shah"] },
  { id: "cardiology", name: "Cardiology", description: "Heart health evaluation, monitoring, and specialist advice.", duration: "45 min", fee: "₹900", doctors: ["Dr. Marcus Varghese"] },
];
const bookingSlots = ["09:00 AM", "09:30 AM", "10:30 AM", "11:00 AM", "01:30 PM", "02:00 PM", "03:30 PM", "04:00 PM", "05:30 PM"];

function BookingExperience() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const user = useAppStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const { accountSlug } = useParams();
  const route = (path: string) => accountPath(accountSlug, path);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialService = bookingServices.find((item) => item.id === searchParams.get("service")) || null;
  const initialDoctor = initialService?.doctors.includes(searchParams.get("doctor") || "") ? searchParams.get("doctor") || "" : "";
  const initialDate = searchParams.get("date") || "";
  const initialTime = searchParams.get("time") || "";
  const initialStep = initialService && initialDoctor ? initialDate && initialTime ? 2 : 1 : 0;
  const [step, setStep] = useState(initialStep);
  const [query, setQuery] = useState("");
  const [locationName, setLocationName] = useState(searchParams.get("location") || "Jaldee Health Centre, Kochi");
  const [service, setService] = useState<BookingService | null>(initialService);
  const [doctor, setDoctor] = useState(initialDoctor);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [calendarMonth, setCalendarMonth] = useState(() => /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? new Date(`${initialDate}T12:00:00`) : new Date());
  const [details, setDetails] = useState({ name: user?.name || "", phone: "", email: user?.email || "", notes: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const filtered = bookingServices.filter((item) => `${item.name} ${item.description} ${item.doctors.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const progress = confirmed ? 100 : [20, 45, 70, 90][step];

  useEffect(() => {
    if (user) {
      setDetails((prev) => ({
        name: prev.name || user.name || "",
        phone: prev.phone || "",
        email: prev.email || user.email || "",
        notes: prev.notes || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    const pendingStr = sessionStorage.getItem("pending_booking_details");
    if (pendingStr) {
      try {
        const parsed = JSON.parse(pendingStr);
        if (parsed && typeof parsed === "object") {
          setDetails((prev) => ({ ...prev, ...parsed }));
          setStep(3);
          if (isAuthenticated) {
            sessionStorage.removeItem("pending_booking_details");
          }
        }
      } catch {
        sessionStorage.removeItem("pending_booking_details");
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (service) next.set("service", service.id);
    if (doctor) next.set("doctor", doctor);
    if (locationName !== "Jaldee Health Centre, Kochi") next.set("location", locationName);
    if (date) next.set("date", date);
    if (time) next.set("time", time);
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [date, doctor, locationName, searchParams, service, setSearchParams, time]);

  const chooseService = (item: BookingService, selectedDoctor: string) => { setService(item); setDoctor(selectedDoctor); setDate(""); setTime(""); setStep(1); };
  const validateDetails = () => {
    const next: Record<string, string> = {};
    if (details.name.trim().length < 3) next.name = "Enter the patient's full name.";
    if (!/^[+\d][\d\s-]{8,}$/.test(details.phone.trim())) next.phone = "Enter a valid phone number.";
    if (details.email && !/^\S+@\S+\.\S+$/.test(details.email)) next.email = "Enter a valid email address.";
    setErrors(next);
    if (!Object.keys(next).length) setStep(3);
  };

  const handleConfirmAppointment = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("pending_booking_details", JSON.stringify(details));
      const currentPath = `${location.pathname}${location.search}`;
      navigate(route("/login"), { state: { from: currentPath } });
      return;
    }
    setConfirmed(true);
    sessionStorage.removeItem("pending_booking_details");
  };

  const reset = () => { setStep(0); setService(null); setDoctor(""); setDate(""); setTime(""); setDetails({ name: user?.name || "", phone: "", email: user?.email || "", notes: "" }); setConfirmed(false); };

  if (confirmed) return <SectionCard className="mx-auto max-w-2xl"><div className="py-5 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><span className="text-3xl">✓</span></span><Badge variant="success" className="mt-5">Booking confirmed</Badge><h2 className="mt-3 text-2xl font-bold">Your appointment is secured</h2><p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">We’ve notified {doctor}. Appointment details have been sent to {details.phone}.</p><div className="mx-auto mt-5 max-w-sm rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">BOOKING REFERENCE</p><p className="mt-1 font-mono text-xl font-bold text-emerald-800">APT-2026-48321</p></div></div><BookingSummary service={service} doctor={doctor} location={locationName} date={date} time={time} /><div className="mt-5 grid gap-2 sm:grid-cols-3"><Button variant="outline">Download receipt</Button><Button variant="outline">Add to calendar</Button><Button onClick={reset}>Book another</Button></div></SectionCard>;

  return <div>
    <div className="mb-6 overflow-hidden rounded-full bg-[var(--color-surface-alt)]"><div className="h-1.5 bg-[var(--color-primary)] transition-all" style={{ width: `${progress}%` }} /></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,.72fr)]">
      <div>
        <div className="mb-5 grid grid-cols-4 gap-2">{["Service", "Date & time", "Your details", "Review"].map((label, index) => <button key={label} type="button" disabled={index > step} onClick={() => index <= step && setStep(index)} className={`rounded-lg border px-2 py-3 text-xs font-semibold ${index === step ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--color-border)] bg-white text-[var(--color-text-disabled)]"}`}><span className="mr-1">{index < step ? "✓" : index + 1}.</span>{label}</button>)}</div>

        {step === 0 && <SectionCard title="Choose a service and doctor">
          <div className="grid gap-3 sm:grid-cols-[1fr_280px]"><Input label="Search services or doctors" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="General consultation, dermatologist…" /><label className="flex flex-col gap-1.5 text-sm font-semibold">Location<select value={locationName} onChange={(e) => setLocationName(e.target.value)} className="h-[38px] rounded-md border border-[var(--color-border)] bg-white px-3 font-normal"><option>Jaldee Health Centre, Kochi</option><option>Jaldee Medical Centre, Trivandrum</option><option>Jaldee Clinic, Bengaluru</option></select></label></div>
          <div className="mt-5 space-y-3">{filtered.map((item) => <article key={item.id} className="rounded-lg border border-[var(--color-border)] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h3 className="text-base font-semibold">{item.name}</h3><p className="mt-1 text-sm text-[var(--color-text-secondary)]">{item.description}</p><div className="mt-2 flex gap-2"><Badge>{item.duration}</Badge><Badge variant="info">{item.fee}</Badge></div></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{item.doctors.map((name) => <button key={name} type="button" onClick={() => chooseService(item, name)} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 text-left transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"><Avatar name={name} size="sm" /><span className="flex-1"><span className="block text-sm font-semibold">{name}</span><span className="text-xs text-[var(--color-text-secondary)]">Available {name.includes("Anitha") ? "today" : "tomorrow"} · ★ 4.9</span></span><span>→</span></button>)}</div></article>)}</div>
        </SectionCard>}

        {step === 1 && <SectionCard title="Select date and time">
          <div className="rounded-lg bg-[var(--color-surface-alt)] p-4"><div className="flex items-center gap-3"><Avatar name={doctor} size="sm" /><div><p className="text-sm font-semibold">{service?.name} with {doctor}</p><p className="text-xs text-[var(--color-text-secondary)]">{service?.duration} · {locationName}</p></div></div></div>
          <div className="mt-5 grid overflow-hidden rounded-lg border border-[var(--color-border)] lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,.75fr)]">
            <div className="border-b border-[var(--color-border)] p-3 lg:border-b-0 lg:border-r"><Calendar className="booking-calendar" events={date ? [{ id: "selected-date", title: "Selected", date: `${date}T12:00:00`, color: "var(--color-primary)" }] : []} view="month" currentDate={calendarMonth} onCurrentDateChange={setCalendarMonth} onDateClick={(selected) => { const today = new Date(); today.setHours(0, 0, 0, 0); if (selected <= today) return; const value = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`; setCalendarMonth(selected); setDate(value); setTime(""); }} /></div>
            <div className="bg-[var(--color-surface-alt)] p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">Available times</p>
              <h3 className="mt-1 text-base font-semibold">{date ? formatBookingDate(date) : "Select a future date"}</h3>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">India Standard Time</p>
              {date ? <div className="mt-5 space-y-5"><SlotGroup title="Morning" slots={bookingSlots.slice(0, 4)} selected={time} onSelect={setTime} disabled={["09:30 AM"]} /><SlotGroup title="Afternoon" slots={bookingSlots.slice(4, 8)} selected={time} onSelect={setTime} disabled={["02:00 PM"]} /><SlotGroup title="Evening" slots={bookingSlots.slice(8)} selected={time} onSelect={setTime} /></div> : <div className="mt-5 rounded-lg border border-dashed border-[var(--color-border)] bg-white p-5 text-center text-sm text-[var(--color-text-secondary)]">Choose a day from the calendar to view times.</div>}
            </div>
          </div>
          <div className="mt-6 flex justify-between"><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button disabled={!date || !time} onClick={() => setStep(2)}>Continue</Button></div>
        </SectionCard>}

        {step === 2 && <SectionCard title="Patient details"><div className="grid gap-4 sm:grid-cols-2"><Input label="Full name" value={details.name} error={errors.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} /><Input label="Phone number" value={details.phone} error={errors.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} /><Input label="Email address (optional)" type="email" value={details.email} error={errors.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} /><div className="sm:col-span-2"><Textarea label="Symptoms or notes (optional)" rows={4} value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} /></div></div><div className="mt-6 flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}>Back</Button><Button onClick={validateDetails}>Review booking</Button></div></SectionCard>}

        {step === 3 && <SectionCard title="Review your booking"><BookingSummary service={service} doctor={doctor} location={locationName} date={date} time={time} /><div className="mt-5 rounded-lg bg-[var(--color-surface-alt)] p-4"><p className="text-xs font-bold text-[var(--color-text-secondary)]">PATIENT</p><p className="mt-1 text-sm font-semibold">{details.name}</p><p className="text-xs text-[var(--color-text-secondary)]">{details.phone}{details.email ? ` · ${details.email}` : ""}</p>{details.notes && <p className="mt-2 text-xs italic text-[var(--color-text-secondary)]">“{details.notes}”</p>}</div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Button variant="ghost" onClick={() => setStep(2)}>Back</Button><div className="flex flex-col gap-1 items-end"><Button onClick={handleConfirmAppointment}>{isAuthenticated ? "Confirm appointment" : "Sign in & Confirm appointment"}</Button>{!isAuthenticated && <span className="text-xs text-[var(--color-text-secondary)]">Sign in required to complete booking</span>}</div></div></SectionCard>}
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start"><SectionCard title="Booking summary"><BookingSummary service={service} doctor={doctor} location={locationName} date={date} time={time} compact />{!service && <p className="text-sm text-[var(--color-text-secondary)]">Your selections will appear here as you book.</p>}<div className="mt-4 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-secondary)]">🔒 Secure booking · Verified appointment slots</div></SectionCard></aside>
    </div>
  </div>;
}

function BookingSummary({ service, doctor, location, date, time, compact }: { service: BookingService | null; doctor: string; location: string; date: string; time: string; compact?: boolean }) {
  if (!service) return null;
  return <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}><SummaryItem label="Service" value={`${service.name} · ${service.duration}`} /><SummaryItem label="Doctor" value={doctor} /><SummaryItem label="Location" value={location} /><SummaryItem label="Schedule" value={date && time ? `${formatBookingDate(date)} · ${time}` : "Not selected"} /><div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 sm:col-span-2"><span className="text-sm font-semibold">Consultation fee</span><span className="text-xl font-bold text-[var(--color-primary)]">{service.fee}</span></div></div>;
}
function SummaryItem({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-[var(--color-surface-alt)] p-3"><p className="text-xs font-bold text-[var(--color-text-secondary)]">{label.toUpperCase()}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }
function formatBookingDate(value: string) { const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : null; return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : value; }
function SlotGroup({ title, slots, selected, onSelect, disabled = [] }: { title: string; slots: string[]; selected: string; onSelect: (slot: string) => void; disabled?: string[] }) { return <div><p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">{title}</p><div className="grid grid-cols-2 gap-2">{slots.map((slot) => <Button key={slot} variant={selected === slot ? "primary" : "outline"} size="md" disabled={disabled.includes(slot)} onClick={() => onSelect(slot)}>{slot}</Button>)}</div></div>; }
