import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn, Badge } from "@jaldee/design-system";
import { Plus, Search, Ban, CheckCircle } from "../../components/icons";
import { useServices } from "../../services/useServices";

export default function ServicesPage() {
  const { services, loading, toggleStatus } = useServices();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Services</h2>
            <p className="text-sm text-slate-500">Define the services and treatments you offer</p>
          </div>
          <button
            onClick={() => navigate("/services/create")}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            Create Service
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 sticky top-0">
              <tr className="text-left">
                <th className="px-6 py-3 font-semibold">Service</th>
                <th className="px-6 py-3 font-semibold">Department</th>
                <th className="px-6 py-3 font-semibold">Tags</th>
                <th className="px-6 py-3 font-semibold">Type & Price</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const active = s.status === "Active";
                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-b border-slate-100 transition-colors hover:bg-slate-50/60",
                      !active && "opacity-50"
                    )}
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {s.id}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">{s.department}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(s.labels?.length ? s.labels : ["OPD"]).map((l) => (
                          <Badge key={l} variant="neutral">{l}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-700">{s.serviceType ?? "Onsite Consultation"}</p>
                      <p className="text-sm font-extrabold text-emerald-700 mt-0.5">
                        ₹{s.price}{" "}
                        <span className="text-xs font-medium text-slate-400">({s.duration} mins)</span>
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50">
                          Edit
                        </button>
                        <button
                          onClick={() => toggleStatus(s)}
                          title={active ? "Disable" : "Enable"}
                          className={cn(
                            "p-1.5 rounded-lg border transition-colors",
                            active
                              ? "text-red-500 border-red-200 hover:bg-red-50"
                              : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          )}
                        >
                          {active ? <Ban size={16} /> : <CheckCircle size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No services match the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
