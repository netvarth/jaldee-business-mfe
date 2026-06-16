import { KpiStrip, TrendAreaChart, BarChart, PieChart } from "@jaldee/design-system";
import { mockBookings, mockServices } from "../../mockData";

// Weekly booking volume (sample series for the trend chart).
const WEEKLY_TREND = [
  { label: "Mon", value: 18 },
  { label: "Tue", value: 24 },
  { label: "Wed", value: 21 },
  { label: "Thu", value: 30 },
  { label: "Fri", value: 27 },
  { label: "Sat", value: 34 },
  { label: "Sun", value: 12 },
];

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#3b82f6",
  CHECKED_IN: "#10b981",
  WAITING: "#f59e0b",
};

export default function DashboardPage() {
  const total = mockBookings.length;
  const confirmed = mockBookings.filter((b) => b.status === "CONFIRMED").length;
  const checkedIn = mockBookings.filter((b) => b.status === "CHECKED_IN").length;
  const revenue = mockBookings.reduce((sum, b) => {
    const svc = mockServices.find((s) => s.id === b.serviceId);
    return sum + (svc?.price ?? 0);
  }, 0);

  // Bookings grouped by service (bar chart).
  const byService = mockServices.map((s) => ({
    label: s.name.split(" ")[0],
    value: mockBookings.filter((b) => b.serviceId === s.id).length,
  }));

  // Status breakdown (donut).
  const statusCounts = mockBookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([label, value]) => ({
    label: label.replace("_", " "),
    value,
    color: STATUS_COLORS[label] ?? "#94a3b8",
  }));

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-500">Today's booking activity at a glance</p>
      </div>

      <KpiStrip
        items={[
          { label: "Total Bookings", value: total, accent: "indigo" },
          { label: "Confirmed", value: confirmed, accent: "emerald" },
          { label: "Checked In", value: checkedIn, accent: "amber" },
          { label: "Revenue", value: `₹${revenue.toLocaleString("en-IN")}`, accent: "slate" },
        ]}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <TrendAreaChart
          eyebrow="This week"
          title="Bookings Trend"
          statusLabel="+12% vs last week"
          data={WEEKLY_TREND}
          showPoints
          showTooltip
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Bookings by Service</h3>
          <BarChart
            data={byService}
            height={220}
            tooltipSeriesLabel="Bookings"
            formatYTick={(v) => String(v)}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Status Breakdown</h3>
          <div className="flex justify-center">
            <PieChart data={statusData} variant="donut" showTooltip />
          </div>
        </div>
      </div>
    </div>
  );
}
