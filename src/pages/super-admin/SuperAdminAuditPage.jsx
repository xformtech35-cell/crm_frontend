import Icon from "../../components/Icon";

const AUDIT_ENTRIES = [
  { id: 1, action: "Company Created", user: "superadmin@crm.local", target: "Acme Corp (admin@acme.com)", time: "2 hours ago", icon: "mdi:plus-circle-outline", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5" },
  { id: 2, action: "Plan Upgraded", user: "superadmin@crm.local", target: "TechStart Ltd → Professional", time: "5 hours ago", icon: "mdi:arrow-up-circle-outline", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/5" },
  { id: 3, action: "Integration Enabled", user: "superadmin@crm.local", target: "IndiaMART integration activated", time: "Yesterday", icon: "mdi:puzzle-outline", color: "text-violet-400 bg-violet-500/10 border-violet-500/20 shadow-violet-500/5" },
  { id: 4, action: "Company Suspended", user: "superadmin@crm.local", target: "OldCo Pvt Ltd", time: "2 days ago", icon: "mdi:cancel", color: "text-red-400 bg-red-500/10 border-red-500/20 shadow-red-500/5" },
  { id: 5, action: "Subscription Renewed", user: "superadmin@crm.local", target: "GlobalSales India → 12 months", time: "3 days ago", icon: "mdi:refresh-circle-outline", color: "text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5" },
];

export default function SuperAdminAuditPage() {
  return (
    <div className="space-y-5 animate-fade-in relative z-10">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Audit Logs</h1>
        <p className="text-xs text-slate-400 mt-0.5">Track administrative actions and system events executed across the platform.</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Icon name="mdi:information-outline" className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-300">Audit Logging Engine Status</p>
          <p className="text-xs text-amber-400/90 mt-1 leading-relaxed">A full database-backed audit trail for all super admin actions is being provisioned in the upcoming release cycle. The entries below illustrate real-time simulated telemetry events.</p>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">System Activity Logs</h2>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Last 7 Days</span>
        </div>
        <div className="divide-y divide-white/5">
          {AUDIT_ENTRIES.map(entry => (
            <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/5 transition-colors">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${entry.color}`}>
                <Icon name={entry.icon} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-100">{entry.action}</p>
                <p className="text-xs text-slate-300 mt-1">{entry.target}</p>
                <p className="text-[10px] text-slate-500 mt-1.5 uppercase font-bold tracking-wider">by {entry.user}</p>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mt-1">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
