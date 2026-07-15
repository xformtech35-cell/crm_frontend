import { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import Icon from "../../components/Icon";

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} border border-white/5 flex items-center justify-center mb-3 shadow-md`}>
        <Icon name={icon} className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">{label}</p>
    </div>
  );
}

export default function SuperAdminAnalyticsPage() {
  const api = useApi();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/superadmin/companies")
      .then(d => setCompanies(Array.isArray(d) ? d : []))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const total = companies.length;
  const active = companies.filter(c => c.subscriptionStatus === "Active").length;
  const trial = companies.filter(c => c.subscriptionStatus === "Trial").length;
  const expired = companies.filter(c => c.subscriptionStatus === "Expired").length;
  const suspended = companies.filter(c => c.subscriptionStatus === "Suspended").length;

  const planBreakdown = ["Basic", "Standard", "Professional", "Enterprise"].map(plan => ({
    plan,
    count: companies.filter(c => c.planName === plan).length,
  }));

  const totalRevenue = companies
    .filter(c => c.subscriptionStatus === "Active" && c.planPrice)
    .reduce((sum, c) => sum + (parseFloat(String(c.planPrice).replace(/[^0-9.]/g, "")) || 0), 0);

  const planColors = {
    Basic: { bar: "bg-blue-500", text: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    Standard: { bar: "bg-violet-500", text: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    Professional: { bar: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    Enterprise: { bar: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Platform Analytics</h1>
        <p className="text-xs text-slate-400 mt-0.5">Overview of registered company metrics, subscription distributions, and aggregated billing telemetry.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="mdi:office-building-outline" label="Total Companies" value={loading ? "…" : total} color="text-indigo-400" bg="bg-indigo-500/10" />
        <StatCard icon="mdi:check-decagram-outline" label="Active Subscriptions" value={loading ? "…" : active} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon="mdi:clock-alert-outline" label="Trial / Pending" value={loading ? "…" : trial} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard icon="mdi:currency-inr" label="Active MRR" value={loading ? "…" : `₹${totalRevenue.toLocaleString("en-IN")}`} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Subscription Status Breakdown */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl p-5">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Icon name="mdi:chart-donut" className="w-4 h-4 text-indigo-400" />
            Subscription Status Breakdown
          </h2>
          <div className="space-y-4">
            {[
              { label: "Active", count: active, total, bar: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "Trial", count: trial, total, bar: "bg-blue-500", text: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
              { label: "Expired", count: expired, total, bar: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
              { label: "Suspended", count: suspended, total, bar: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
            ].map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.text}`}>{s.label}</span>
                  <span className="text-sm font-bold text-white">{loading ? "…" : s.count}</span>
                </div>
                <div className="h-2 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${s.bar}`}
                    style={{ width: loading || !s.total ? "0%" : `${(s.count / s.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Breakdown */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl p-5">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Icon name="mdi:credit-card-outline" className="w-4 h-4 text-violet-400" />
            Plan Distribution
          </h2>
          <div className="space-y-4">
            {planBreakdown.map(({ plan, count }) => {
              const c = planColors[plan] || { bar: "bg-slate-400", text: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" };
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text}`}>{plan}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-semibold">{total ? Math.round((count / total) * 100) : 0}%</span>
                      <span className="text-sm font-bold text-white">{loading ? "…" : count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-950/60 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
                      style={{ width: loading || !total ? "0%" : `${(count / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && total > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-slate-400 font-medium">Most popular plan: <span className="font-bold text-slate-200">{planBreakdown.sort((a, b) => b.count - a.count)[0]?.plan || "—"}</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Company List Table */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 bg-slate-950/20">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">All Companies Overview</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : companies.length === 0 ? (
          <div className="py-14 text-center bg-slate-900/10">
            <Icon name="mdi:office-building-outline" className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No companies registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "600px" }}>
              <thead>
                <tr className="bg-slate-950/40 text-slate-400 border-b border-white/5">
                  {["Company", "Plan", "Status", "Price", "Valid Until"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {companies.map((c, i) => (
                  <tr key={c.userid} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-bold text-slate-200 text-xs leading-tight">{c.username || "—"}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{c.userEmail}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold text-slate-300">{c.planName || "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                        c.subscriptionStatus === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        c.subscriptionStatus === "Trial" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        c.subscriptionStatus === "Suspended" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>{c.subscriptionStatus || "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-200 font-semibold">{c.planPrice || "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-300 font-medium">{c.planValidity ? new Date(c.planValidity).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
