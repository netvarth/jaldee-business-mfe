import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useAppStore } from "../store/appStore";
import { accountPath } from "../utils/accountRoutes";

const cards = [
  {
    title: "Upcoming bookings",
    value: "3",
    detail: "View appointments, reschedules, and queue updates.",
  },
  {
    title: "Open invoices",
    value: "1",
    detail: "Track dues, receipts, and payment history.",
  },
  {
    title: "Profile completeness",
    value: "88%",
    detail: "Keep contact details and documents current.",
  },
];

export default function DashboardPage() {
  const { logout } = useAuth();
  const user = useAppStore((state) => state.user);
  const workspace = useAppStore((state) => state.workspace);
  const { accountSlug } = useParams();

  return (
    <div className="min-h-screen bg-[#f7faf9] text-slate-900">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Consumer shell</div>
            <h1 className="text-2xl font-semibold">{workspace?.name || "Consumer Portal"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden gap-4 text-sm text-slate-600 md:flex">
              <Link to={accountPath(accountSlug)}>Home</Link>
              <Link to={accountPath(accountSlug, "/bookings")}>Bookings</Link>
              <Link to={accountPath(accountSlug, "/profile")}>Profile</Link>
            </nav>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="rounded-[28px] bg-[linear-gradient(135deg,_#0f172a,_#115e59)] px-8 py-10 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="max-w-2xl">
            <p className="text-sm text-teal-100">Signed in as {user?.name || "Consumer"}</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight">A consumer-first shell with its own product surface.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-200">
              Use this app for bookings, payments, communication, and self-service journeys without inheriting business admin UX.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm text-slate-500">{card.title}</div>
              <div className="mt-3 text-4xl font-semibold">{card.value}</div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{card.detail}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
