import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar, Badge, Button, Container, SectionCard, StatCard, Timeline, buttonVariants } from "@jaldee/design-system";
import { useAuth } from "../auth/AuthProvider";
import { useAppStore } from "../store/appStore";
import { accountPath } from "../utils/accountRoutes";

type IconName = "home" | "calendar" | "bag" | "card" | "wallet" | "pin" | "heart" | "bell" | "user" | "support" | "settings" | "message" | "arrow" | "clock" | "video" | "check" | "box" | "receipt";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const icons: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10M9 21v-7h6v7" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></>,
    wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" /><path d="M15 11h7v5h-7a2.5 2.5 0 0 1 0-5Z" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    user: <><circle cx="12" cy="7" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    support: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 13H2v5h4v-5H4ZM20 13h2v5h-4v-5h2ZM18 19c0 2-2 2-4 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{icons[name]}</svg>;
}

const metricCards = [
  { icon: "calendar" as const, label: "Upcoming Bookings", value: "2", action: "View all bookings", tone: "purple" },
  { icon: "bag" as const, label: "Orders", value: "3", action: "View all orders", tone: "green" },
  { icon: "card" as const, label: "Total Spent", value: "₹8,450", action: "View payments", tone: "blue" },
];

export default function DashboardPage() {
  const { logout } = useAuth();
  const user = useAppStore((state) => state.user);
  const { accountSlug } = useParams();
  const firstName = user?.name?.split(" ")[0] || "there";
  const bookings = accountPath(accountSlug, "/bookings");
  const bookAppointment = accountPath(accountSlug, "/booking");
  const profile = accountPath(accountSlug, "/profile");
  const home = accountPath(accountSlug, "/account");
  const sectionPath = (section: string) => accountPath(accountSlug, `/${section}`);

  const nav = [
    ["home", "Dashboard", home], ["calendar", "My Bookings", bookings], ["bag", "My Orders", sectionPath("orders")],
    ["card", "Payments", sectionPath("payments")], ["pin", "Addresses", sectionPath("addresses")],
    ["heart", "Saved Items", sectionPath("saved")], ["user", "Profile", profile],
    ["support", "Support", sectionPath("support")],
  ] as const;

  return (
    <div className="consumer-dashboard min-h-screen bg-[#fbfcff] text-[#11172f]">
      <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-slate-200 bg-white px-5 py-6 md:flex md:flex-col">
        <Link to={home} className="flex items-center gap-3 px-1 text-2xl font-bold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white">J</span>Jaldee</Link>
        <nav className="mt-9 space-y-1" aria-label="Account navigation">
          {nav.map(([icon, label, to], index) => <Link key={label} to={to} className={`flex min-h-12 items-center gap-4 rounded-xl px-4 text-sm font-medium transition ${index === 0 ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}><Icon name={icon} />{label}{label === "Notifications" && <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">3</span>}</Link>)}
        </nav>
        <div className="mt-auto rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-100 p-5">
          <p className="font-semibold text-violet-950">Refer a friend</p><p className="mt-1 text-xs leading-5 text-violet-700">You both receive ₹250 account credit!</p>
          <button type="button" className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white">Refer now →</button>
        </div>
      </aside>

      <div className="dashboard-shell md:pl-[250px]">
        <header className="dashboard-header sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
          <Link to={home} className="flex items-center gap-2 text-xl font-bold md:hidden"><span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-sm text-white">J</span>Jaldee</Link>
          <span className="hidden md:block" />
          <div className="flex items-center gap-3 sm:gap-5">
            <button className="hidden text-slate-700 sm:block" aria-label="Messages"><Icon name="message" /></button>
            <span className="hidden h-8 w-px bg-slate-200 sm:block" />
            <Link to={profile} className="flex items-center gap-3"><Avatar name={user?.name || "Consumer"} size="sm" /><span className="hidden text-sm font-semibold sm:block">{user?.name || "Consumer"}</span></Link>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>Sign out</Button>
          </div>
        </header>

        <main className="py-7">
          <Container size="2xl" className="dashboard-main">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hi, {firstName} <span aria-hidden="true">👋</span></h1>
          <p className="mt-1 text-sm text-slate-500">Here’s what’s happening with your account today.</p>

          <section className="dashboard-metrics mt-6 grid gap-4 sm:grid-cols-3">
            {metricCards.map((card) => {
              const accents = { purple: "indigo", green: "emerald", blue: "indigo", orange: "amber" } as const;
              const target = card.label === "Upcoming Bookings" ? bookings : card.label === "Orders" ? sectionPath("orders") : card.label === "Total Spent" ? sectionPath("payments") : sectionPath("wallet");
              return <div key={card.label} className="relative"><StatCard className="h-full min-h-[132px] pb-11" label={card.label} value={card.value} accent={accents[card.tone as keyof typeof accents]} icon={<Icon name={card.icon} />} /><Link to={target} className="absolute bottom-3 left-4 flex items-center gap-2 text-xs font-semibold text-[var(--color-text-link)]">{card.action}<Icon name="arrow" className="h-3.5 w-3.5" /></Link></div>;
            })}
          </section>

          <div className="dashboard-content mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-5">
              <SectionCard title="Next Booking" actions={<Link to={bookings} className="text-xs font-semibold text-[var(--color-text-link)]">View all →</Link>}>
                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="grid h-40 w-full shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-violet-100 sm:w-48"><div className="text-center text-slate-400"><Icon name="calendar" className="mx-auto h-10 w-10" /><span className="mt-2 block text-xs">Jaldee Health Centre</span></div></div>
                  <div className="flex-1 py-1"><h3 className="text-lg font-bold">Dr. Anitha Kumar</h3><p className="mt-1 text-sm text-slate-500">General Medicine　·　Jaldee Health Centre</p><div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-600"><span className="flex items-center gap-2"><Icon name="calendar" className="h-4 w-4" />14 Aug 2026</span><span className="flex items-center gap-2"><Icon name="clock" className="h-4 w-4" />10:30 AM</span><span className="flex items-center gap-2"><Icon name="video" className="h-4 w-4" />Video visit</span></div><div className="mt-6 flex gap-3"><Link to={bookings} className={buttonVariants({ variant: "primary", size: "md" })}>View details</Link><Button variant="outline" size="md">Reschedule</Button></div></div>
                </div>
              </SectionCard>

              <SectionCard title="My Orders" actions={<Link to={sectionPath("orders")} className="text-xs font-semibold text-[var(--color-text-link)]">View all →</Link>} padding={false}>
                <div className="divide-y divide-slate-100">
                  {[["#ORD10882", "10 Aug 2026　·　2 Items", "Processing", "₹1,899"], ["#ORD10821", "08 Aug 2026　·　1 Item", "Delivered", "₹950"], ["#ORD10765", "02 Aug 2026　·　1 Item", "Delivered", "₹1,299"]].map((order, i) => <div key={order[0]} className="flex items-center gap-4 px-4 py-3"><span className={`grid h-10 w-10 place-items-center rounded-lg ${i === 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}><Icon name="box" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Order {order[0]}</p><p className="text-xs text-slate-500">{order[1]}</p></div><Badge variant={i === 0 ? "warning" : "success"} className="hidden sm:inline-flex">{order[2]}</Badge><span className="text-sm font-semibold">{order[3]}</span><span>›</span></div>)}
                </div>
              </SectionCard>
            </div>

            <div className="space-y-5">
              <SectionCard title="Quick Actions"><div className="grid grid-cols-3 gap-3">{[["calendar", "Book\nAppointment", bookAppointment, "bg-indigo-50 text-indigo-600"], ["bag", "Place\nNew Order", sectionPath("orders"), "bg-emerald-50 text-emerald-600"], ["calendar", "My\nBookings", bookings, "bg-sky-50 text-sky-600"], ["bag", "My\nOrders", sectionPath("orders"), "bg-amber-50 text-amber-600"], ["card", "Payments", sectionPath("payments"), "bg-indigo-50 text-indigo-600"], ["pin", "Addresses", sectionPath("addresses"), "bg-rose-50 text-rose-600"]].map(([icon, label, to, tone]) => <Link key={label} to={to} className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-center text-xs font-medium transition hover:bg-[var(--color-surface-alt)]"><span className={`mb-2 grid h-9 w-9 place-items-center rounded-lg ${tone}`}><Icon name={icon as IconName} /></span>{label.split("\n").map((x) => <span key={x}>{x}</span>)}</Link>)}</div></SectionCard>

              <SectionCard title="Recent Activity" actions={<Link to={home} className="text-xs font-semibold text-[var(--color-text-link)]">View all →</Link>}><Timeline events={[
                { title: "Appointment confirmed", description: "Dr. Anitha Kumar · 14 Aug 2026 at 10:30 AM", date: "2 hours ago", variant: "success", icon: <Icon name="check" className="h-3.5 w-3.5" /> },
                { title: "Payment receipt available", description: "Invoice #JL-2048 · ₹450", date: "Yesterday", variant: "info", icon: <Icon name="receipt" className="h-3.5 w-3.5" /> },
                { title: "Order #ORD10821 delivered", description: "Your order has been delivered", date: "2 days ago", variant: "warning", icon: <Icon name="bag" className="h-3.5 w-3.5" /> },
                { title: "Message from clinic", description: "Your test reports are ready to view", date: "3 days ago", variant: "neutral", icon: <Icon name="message" className="h-3.5 w-3.5" /> },
              ]} /></SectionCard>
            </div>
          </div>

          <section className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 px-7 py-5 sm:flex-row"><h2 className="text-lg font-bold text-indigo-950">Everything you need,<br />all in one place</h2><div className="flex flex-wrap gap-6 text-sm text-violet-700"><span>✣　Book Services</span><span>🛒　Shop Products</span><span>⚙　Track & Manage</span></div></section>
          </Container>
        </main>
      </div>
    </div>
  );
}
