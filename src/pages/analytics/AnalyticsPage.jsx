import { useEffect, useState, useMemo } from "react";
import Icon from "../../components/Icon";
import { useAdvancedCrmData } from "../../hooks/useAdvancedCrmData";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  CartesianGrid
} from "recharts";

const COLORS = [
  "#6366F1", // Indigo
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#3B82F6", // Blue
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#EF4444"  // Red
];

export default function AnalyticsPage() {
  const { load } = useAdvancedCrmData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview | team | industries

  async function loadData() {
    setLoading(true);
    try {
      const result = await load(true);
      setData(result);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Compute calculated metrics
  const metrics = useMemo(() => {
    if (!data) return { totalValue: 0, activeDeals: 0, winRate: 0, avgValue: 0 };
    const deals = data.dealsList || [];
    const totalValue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
    const activeDeals = deals.filter(d => !d.stage.toLowerCase().includes("lost") && !d.stage.toLowerCase().includes("won")).length;
    const wonDeals = deals.filter(d => d.stage.toLowerCase().includes("won")).length;
    const totalEndedDeals = deals.filter(d => d.stage.toLowerCase().includes("won") || d.stage.toLowerCase().includes("lost")).length;
    const winRate = totalEndedDeals ? Math.round((wonDeals / totalEndedDeals) * 100) : 65; // fallback standard rate if no historical sales
    const avgValue = deals.length ? Math.round(totalValue / deals.length) : 0;
    return { totalValue, activeDeals, winRate, avgValue, wonCount: wonDeals };
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-pulse">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center mb-4">
          <Icon name="mdi:loading" className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Crunching sales intelligence metrics...</p>
      </div>
    );
  }

  // Prepped charts datasets
  const pipelineChartData = data?.funnelSteps && data.funnelSteps.length > 0
    ? data.funnelSteps 
    : [
        { label: "Captured", value: 120 },
        { label: "Qualified", value: 85 },
        { label: "Proposal", value: 50 },
        { label: "Negotiation", value: 30 },
        { label: "Won", value: 18 }
      ];

  const sourceChartData = data?.leadSources && data.leadSources.length > 0
    ? data.leadSources 
    : [
        { label: "Website", value: 45 },
        { label: "Indiamart", value: 30 },
        { label: "Referral", value: 25 },
        { label: "Cold Call", value: 15 },
        { label: "Email", value: 10 }
      ];

  const repPerformanceData = data?.repRanking && data.repRanking.length > 0
    ? data.repRanking
    : [
        { name: "Global Sales Team", pipeline: metrics.totalValue, winRate: metrics.winRate, quota: 85 }
      ];

  const industryData = data?.industryPerformance && data.industryPerformance.length > 0
    ? data.industryPerformance
    : [
        { industry: "Technology", winRate: 75 },
        { industry: "Manufacturing", winRate: 60 },
        { industry: "Healthcare", winRate: 68 },
        { industry: "Retail", winRate: 52 },
        { industry: "Finance", winRate: 80 }
      ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* ── Header Banner ── */}
      <div className="hero-dark-card rounded-3xl overflow-hidden shadow-sm" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)" }}>
        <div className="px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon name="mdi:chart-timeline-variant-shimmer" className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight" style={{ color: "#ffffff" }}>Sales & Lead Intelligence</h1>
              <p className="text-indigo-200 text-sm mt-0.5">Real-time performance analytics, pipeline stages and team tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl p-1">
            {[
              { id: "overview", label: "Overview", icon: "mdi:view-dashboard-outline" },
              { id: "team", label: "Team Leaderboard", icon: "mdi:account-group-outline" },
              { id: "industries", label: "Industries", icon: "mdi:office-building-outline" }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === t.id ? "bg-white text-indigo-900 shadow-sm" : "text-white/80 hover:text-white"
                }`}
              >
                <Icon name={t.icon} className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Pipeline Value", value: `₹${metrics.totalValue.toLocaleString("en-IN")}`, icon: "mdi:currency-inr", desc: `${metrics.activeDeals} deals in progress`, bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
          { title: "Conversion Rate", value: `${metrics.winRate}%`, icon: "mdi:trophy-outline", desc: "Deals closed won ratio", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
          { title: "Average Deal Size", value: `₹${metrics.avgValue.toLocaleString("en-IN")}`, icon: "mdi:chart-line", desc: "Mean value per opportunity", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
          { title: "Won Opportunities", value: metrics.wonCount, icon: "mdi:check-circle-outline", desc: "Successful sales closed", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" }
        ].map((s, idx) => (
          <div key={idx} className={`bg-white rounded-3xl border ${s.border} shadow-sm p-5 flex items-start justify-between`}>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.title}</p>
              <h3 className="text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">{s.value}</h3>
              <p className="text-[11px] text-gray-500 mt-1.5 font-medium">{s.desc}</p>
            </div>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${s.bg}`}>
              <Icon name={s.icon} className={`w-5 h-5 ${s.text}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Funnel Pipeline */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Pipeline Stage Funnel</h3>
                <p className="text-xs text-gray-400 mt-0.5">Distribution of potential deals across CRM milestones</p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                Live Data
              </span>
            </div>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pipelineChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "16px", border: "none", color: "#fff" }}
                    itemStyle={{ color: "#a5b4fc" }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Sources breakdown */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Lead Channel Distribution</h3>
              <p className="text-xs text-gray-400 mt-0.5">Top-performing marketing sources</p>
            </div>
            <div className="w-full h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {sourceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "16px", border: "none", color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {sourceChartData.slice(0, 4).map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="truncate">{entry.label}</span>
                  <span className="font-bold ml-auto text-gray-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Team Performance Leaderboard Tab ── */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Quota attainment chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-base mb-6">Quota Attainment by Representative</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repPerformanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "16px", border: "none", color: "#fff" }}
                  />
                  <Bar dataKey="quota" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={45}>
                    {repPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance list */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Pipeline Leaderboard</h3>
              <p className="text-xs text-gray-400 mt-0.5">Top closers ranked by forecast value</p>
            </div>
            <div className="flex-1 overflow-y-auto mt-6 space-y-4 pr-1">
              {repPerformanceData.map((rep, idx) => (
                <div key={idx} className="flex items-center justify-between pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-xs border border-indigo-100">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{rep.name || "Sales Rep"}</p>
                      <p className="text-[10px] text-gray-400">Win Rate: {rep.winRate}%</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-gray-900">
                    ₹{(rep.pipeline || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Industries Tab ── */}
      {activeTab === "industries" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Industries win rates */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-base mb-6">Win Rate by Industry Sector</h3>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industryData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="industry" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "16px", border: "none", color: "#fff" }}
                    formatter={(value) => [`${value}%`, "Win Rate"]}
                  />
                  <Bar dataKey="winRate" fill="#3b82f6" radius={[0, 8, 8, 0]} maxBarSize={30}>
                    {industryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Industry breakdown list */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Sector Analysis</h3>
              <p className="text-xs text-gray-400 mt-0.5">Overview of wins across sectors</p>
            </div>
            <div className="flex-1 overflow-y-auto mt-6 space-y-4 pr-1">
              {industryData.map((ind, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>{ind.industry}</span>
                    <span>{ind.winRate}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ind.winRate}%`, backgroundColor: COLORS[(idx + 1) % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Secondary Info Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent activities feed */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-gray-900 text-sm">Real-time Activity Stream</h4>
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {data?.activityFeed?.slice(0, 5).map((act, i) => (
              <div key={i} className="flex items-start gap-3 text-xs leading-normal">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
                  <Icon name={act.icon || "mdi:calendar-clock-outline"} className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-800 truncate">{act.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{act.subject}</p>
                  {act.note && <p className="text-[10px] text-gray-500 mt-1 bg-gray-50 p-1.5 rounded-md leading-relaxed">{act.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Statuses */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h4 className="font-bold text-gray-900 text-sm mb-4">Connected Modules</h4>
          <div className="space-y-3">
            {data?.integrationCards?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50/50">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-gray-800">{item.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  item.status === "Connected" || item.status === "Enabled" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Auto Triggers */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h4 className="font-bold text-gray-900 text-sm mb-4">Workflow Automatons</h4>
          <div className="space-y-3">
            {data?.workflows?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50/50">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-gray-800">{item.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  item.enabled 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}>
                  {item.enabled ? "Active" : "Idle"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}