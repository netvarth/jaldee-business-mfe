import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useAppStore } from "../store/appStore";

const cards = [
  {
    title: "Open queue",
    value: "18",
    detail: "Customers waiting for staff action right now.",
  },
  {
    title: "Tasks assigned",
    value: "7",
    detail: "Operational follow-ups due this shift.",
  },
  {
    title: "Shift coverage",
    value: "92%",
    detail: "Current roster health across active desks.",
  },
];

export default function DashboardPage() {
  const { logout } = useAuth();
  const user = useAppStore((state) => state.user);
  const workspace = useAppStore((state) => state.workspace);

  return (
    <div className="min-h-screen bg-[#eef5ff] text-slate-900">
      <header className="border-b border-sky-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Employee shell</div>
            <h1 className="text-2xl font-semibold">{workspace?.name || "Employee Workspace"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden gap-4 text-sm text-slate-600 md:flex">
              <Link to="/">Overview</Link>
              <Link to="/schedule">Schedule</Link>
              <Link to="/tasks">Tasks</Link>
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
        <section className="rounded-[28px] bg-[linear-gradient(135deg,_#0f172a,_#2563eb)] px-8 py-10 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="max-w-2xl">
            <p className="text-sm text-sky-100">Signed in as {user?.name || "Employee"}</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight">A faster shell for staff execution.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-200">
              Use this app for frontline and staff workflows. Keep it focused on work orchestration, not broad tenant administration.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="rounded-[24px] border border-sky-100 bg-white p-6 shadow-sm">
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
