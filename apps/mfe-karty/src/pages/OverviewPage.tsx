import { SectionCard } from "@jaldee/design-system";

const summaryCards = [
  { label: "Orders Today", value: "126", tone: "bg-orange-50 border-orange-200 text-orange-800" },
  { label: "Pending Dispatch", value: "18", tone: "bg-sky-50 border-sky-200 text-sky-800" },
  { label: "Low Stock Alerts", value: "9", tone: "bg-amber-50 border-amber-200 text-amber-800" },
  { label: "Active Catalogues", value: "42", tone: "bg-emerald-50 border-emerald-200 text-emerald-800" },
];

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <SectionCard className="border-slate-200 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Karty Overview</h1>
          <p className="mt-2 text-sm text-slate-600">
            Track commerce operations, catalogue updates, inventory health, and fulfillment from one place.
          </p>
        </SectionCard>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SectionCard key={card.label} className={`border shadow-sm ${card.tone}`}>
              <div className="text-xs font-medium uppercase tracking-wide opacity-80">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold">{card.value}</div>
            </SectionCard>
          ))}
        </div>
      </div>
    </div>
  );
}
