import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import Icon from "../../components/Icon";
import { formatDate } from "../../utils/format";

const STAT_CARDS = [
  { key: "total", label: "Total Companies", icon: "mdi:office-building-outline", color: "from-blue-500/20 to-indigo-600/20 border-blue-500/30 text-blue-400 shadow-blue-500/5" },
  { key: "active", label: "Active Plans", icon: "mdi:check-decagram-outline", color: "from-emerald-500/20 to-teal-600/20 border-emerald-500/30 text-emerald-400 shadow-emerald-500/5" },
  { key: "expired", label: "Expired Plans", icon: "mdi:alert-circle-outline", color: "from-amber-500/20 to-orange-600/20 border-amber-500/30 text-amber-400 shadow-amber-500/5" },
  { key: "suspended", label: "Suspended", icon: "mdi:cancel", color: "from-red-500/20 to-rose-600/20 border-red-500/30 text-red-400 shadow-red-500/5" },
];

const PLAN_COLORS = {
  Basic: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  Standard: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  Professional: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Enterprise: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
};

const STATUS_COLORS = {
  Active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Expired: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Suspended: "bg-red-500/10 text-red-400 border border-red-500/20",
  Trial: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
};



export default function SuperAdminHomePage() {
  const api = useApi();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/superadmin/companies")
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.subscriptionStatus === "Active").length,
    expired: companies.filter(c => c.subscriptionStatus === "Expired").length,
    suspended: companies.filter(c => c.subscriptionStatus === "Suspended").length,
  };

  const recent = companies.slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Welcome Banner */}
      <div className="rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl superadmin-banner" style={{ background: "linear-gradient(135deg, rgba(79, 70, 229, 0.4) 0%, rgba(124, 58, 237, 0.3) 50%, rgba(15, 23, 42, 0.6) 100%)", backdropFilter: "blur(20px)" }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative px-6 py-8 md:px-8 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Icon name="mdi:shield-crown-outline" className="w-4 h-4 text-purple-300" />
              </div>
              <span className="text-purple-300 text-xs font-bold uppercase tracking-wider">Super Admin Control Center</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Platform Control Dashboard</h1>
            <p className="text-slate-300 mt-1 text-xs">Provision registered companies, monitor subscription status, and govern platform api services.</p>
          </div>
          <Link
            to="/super-admin/companies"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)] bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            <Icon name="mdi:plus" className="w-3.5 h-3.5" />
            Add Company
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => (
          <div key={card.key} className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-5 shadow-lg hover:border-indigo-500/30 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} border flex items-center justify-center shadow-lg`}>
                <Icon name={card.icon} className="w-5 h-5" />
              </div>
              {loading ? (
                <div className="w-8 h-6 bg-white/5 rounded animate-pulse" />
              ) : (
                <span className="text-2xl font-extrabold text-white tracking-tight">{stats[card.key]}</span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Companies & Quick Links */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent Companies Table */}
        <div className="xl:col-span-2 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-slate-950/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Icon name="mdi:office-building-outline" className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Recent Companies</h2>
            </div>
            <Link to="/super-admin/companies" className="text-xs text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1">
              View all <Icon name="mdi:arrow-right" className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-500 bg-slate-900/10">
              <Icon name="mdi:office-building-plus-outline" className="w-10 h-10 mb-3 text-slate-600" />
              <p className="text-xs font-semibold">No companies registered yet</p>
              <Link to="/super-admin/companies" className="mt-3 text-xs text-indigo-400 font-bold hover:underline">Add your first company →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 border-b border-white/5">
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider px-5 py-3">Company</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider px-3 py-3">Plan</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider px-3 py-3">Status</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider px-3 py-3 hidden lg:table-cell">Valid Until</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent.map((c, i) => (
                    <tr key={c.userid} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0 border border-white/10 shadow-sm">
                            {(c.username || c.userEmail || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-100 text-xs leading-tight">{c.username || "—"}</p>
                            <p className="text-slate-400 text-[10px] truncate max-w-[160px] mt-0.5">{c.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {c.planName ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_COLORS[c.planName] || "bg-slate-800 text-slate-300 border-slate-700"}`}>
                            {c.planName}
                          </span>
                        ) : <span className="text-slate-500 text-xs font-semibold">No plan</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[c.subscriptionStatus] || "bg-slate-800 text-slate-300"}`}>
                          {c.subscriptionStatus || "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-300 font-medium">{formatDate(c.planValidity)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Links & Health */}
        <div className="space-y-4">
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl p-5">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { to: "/super-admin/companies", label: "Add New Company", icon: "mdi:plus-circle-outline", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
                { to: "/super-admin/integrations", label: "Manage Integrations", icon: "mdi:puzzle-outline", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
                { to: "/super-admin/analytics", label: "View Analytics", icon: "mdi:chart-bar", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                { to: "/super-admin/settings", label: "Platform Settings", icon: "mdi:cog-outline", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
              ].map(item => (
                <Link key={item.to} to={item.to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all duration-200 group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${item.color}`}>
                    <Icon name={item.icon} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                  <Icon name="mdi:chevron-right" className="w-4 h-4 text-slate-500 ml-auto group-hover:text-indigo-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Health */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl p-5">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Platform Health</h2>
            <div className="space-y-3.5">
              {[
                { label: "Backend REST Services", status: "Operational", ok: true },
                { label: "Core Relational DB", status: "Operational", ok: true },
                { label: "Cloud File Store", status: "Operational", ok: true },
                { label: "Notifications Hub", status: "Operational", ok: true },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-0.5 border-b border-white/[0.02] last:border-0 pb-2 last:pb-0">
                  <span className="text-xs text-slate-400 font-medium">{s.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"} animate-pulse`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${s.ok ? "text-emerald-400" : "text-red-400"}`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
