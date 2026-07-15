import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useLead } from "../../hooks/useLead";
import { formatDate, formatCurrency } from "../../utils/format";
import Icon from "../../components/Icon";
import { getCurrencyConfig } from "../../utils/currency";
import StarRating from "../../components/common/StarRating";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

/* ─── Stage configuration ─── */
const PIPELINE_STAGES = [
   {
    id: "Qualified",
    label: "Qualified",
    color: "bg-blue-500",
    lightColor: "bg-blue-50 border-blue-200",
    headerColor: "bg-blue-500",
    textColor: "text-blue-700",
    dot: "bg-blue-400",
    icon: "mdi:check-decagram-outline",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    id: "Disqualified",
    label: "Disqualified",
    color: "bg-slate-500",
    lightColor: "bg-slate-50 border-slate-200",
    headerColor: "bg-slate-500",
    textColor: "text-slate-700",
    dot: "bg-slate-400",
    icon: "mdi:account-plus-outline",
    gradient: "from-slate-500 to-slate-600",
  },
  {
    id: "Open",
    label: "In Progress",
    color: "bg-violet-500",
    lightColor: "bg-violet-50 border-violet-200",
    headerColor: "bg-violet-500",
    textColor: "text-violet-700",
    dot: "bg-violet-400",
    icon: "mdi:progress-clock",
    gradient: "from-violet-500 to-violet-600",
  },
  {
    id: "Won",
    label: "Won",
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50 border-emerald-200",
    headerColor: "bg-emerald-500",
    textColor: "text-emerald-700",
    dot: "bg-emerald-400",
    icon: "mdi:trophy-outline",
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    id: "Closed",
    label: "Closed/Lost",
    color: "bg-red-400",
    lightColor: "bg-red-50 border-red-200",
    headerColor: "bg-red-400",
    textColor: "text-red-700",
    dot: "bg-red-400",
    icon: "mdi:close-circle-outline",
    gradient: "from-red-400 to-red-500",
  },
];

function getStageForLead(lead) {
  if (lead.leadOutcomeStatus === "Won") return "Won";
  if (lead.leadOutcomeStatus === "Closed") return "Closed";
  if (lead.leadOutcomeStatus === "Open") return "Open";
  if (lead.leadStatus === "Qualified") return "Qualified";
  return "Disqualified";
}

function getInitials(name) {
  if (!name) return "L";
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0] || "L") + (parts[1]?.[0] || "");
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
];
function avatarColor(name = "") {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function daysBadge(dateStr) {
  if (!dateStr) return null;
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 3) return { label: `${days}d`, color: "bg-emerald-100 text-emerald-700" };
  if (days <= 14) return { label: `${days}d`, color: "bg-amber-100 text-amber-700" };
  return { label: `${days}d`, color: "bg-red-100 text-red-700" };
}

/* ─── Kanban Card ─── */
function PipelineCard({ lead, stageConfig }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.leadId,
    data: { type: "lead", lead },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const name = lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ""} ${lead.leadLastName || ""}`.trim() || "Unknown";
  const initials = getInitials(name);
  const badge = daysBadge(lead.leadCreatedDate);
  const amount = lead.quotationAmount;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 sm:p-3.5 cursor-grab active:cursor-grabbing transition-all duration-200 group ${isDragging ? "opacity-50 scale-95 shadow-xl ring-2 ring-blue-400" : "hover:shadow-md hover:border-gray-200"}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className={`h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shrink-0 ${avatarColor(name)}`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate leading-tight">{name}</p>
            {lead.leadOrganisationName && name !== lead.leadOrganisationName && (
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">{lead.leadOrganisationName}</p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/lead/${lead.leadId}`); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all shrink-0"
          title="View lead"
        >
          <Icon name="mdi:open-in-new" className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>

      {/* Star Rating & Priority */}
      <div className="mb-1.5 sm:mb-2">
        <StarRating grade={lead.leadRating || 0} size="text-[8px] sm:text-[10px]" />
      </div>

      {/* Amount */}
      {amount != null && (
        <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
          <Icon name={getCurrencyConfig(lead.leadCountry).icon} className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />
          <span className="text-xs sm:text-sm font-bold text-emerald-700">
            {formatCurrency(amount, lead.leadCountry)}
          </span>
        </div>
      )}

      {/* Enquiry description */}
      {lead.enquiryDescription && (
        <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2 mb-2 sm:mb-2.5 leading-relaxed">{lead.enquiryDescription}</p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between gap-1 pt-2 sm:pt-2.5 border-t border-gray-50">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {lead.leadSource && (
            <span className="px-1 sm:px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[8px] sm:text-[10px] font-medium">{lead.leadSource}</span>
          )}
          {lead.leadGroup && (
            <span className="px-1 sm:px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[8px] sm:text-[10px] font-medium">{lead.leadGroup}</span>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {badge && (
            <span className={`px-1 sm:px-1.5 py-0.5 rounded-md text-[8px] sm:text-[10px] font-semibold ${badge.color}`}>{badge.label}</span>
          )}
          {lead.quotationNumber && (
            <span className="px-1 sm:px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-400 text-[8px] sm:text-[10px] font-medium border border-gray-100 truncate max-w-[60px] sm:max-w-none">{lead.quotationNumber}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Kanban Column ─── */
function PipelineColumn({ stage, leads, collapsed, onToggleCollapse }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const totalValue = leads.reduce((sum, l) => sum + (l.quotationAmount || 0), 0);

  return (
    <div
      className={`flex flex-col transition-all duration-300 ${
        collapsed ? "w-16 sm:w-20 md:w-24" : "w-64 sm:w-72 md:w-80"
      } shrink-0`}
    >
      {/* Column Header */}
      <div className={`rounded-xl p-2 sm:p-3 mb-2 sm:mb-3 bg-gradient-to-r ${stage.gradient} shadow-sm`}>
        {collapsed ? (
          <button onClick={onToggleCollapse} className="w-full flex flex-col items-center gap-1 sm:gap-2 py-1">
            <Icon name={stage.icon} className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            <span className="text-white text-[8px] sm:text-[10px] font-semibold text-center leading-tight">
              {stage.label}
            </span>
            <span className="bg-white/20 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
              {leads.length}
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Icon name={stage.icon} className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate">{stage.label}</p>
                {totalValue > 0 && (
                  <p className="text-[10px] sm:text-xs text-white/70 truncate">{formatCurrency(totalValue)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
              <span className="bg-white/25 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full">{leads.length}</span>
              <button onClick={onToggleCollapse} className="p-0.5 sm:p-1 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                <Icon name="mdi:chevron-left" className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drop zone */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          className={`flex-1 rounded-xl p-1.5 sm:p-2 transition-all duration-200 ${isOver ? "bg-blue-50 border-2 border-blue-300 border-dashed" : "bg-gray-50/80 border border-gray-200"}`}
        >
          <SortableContext items={leads.map((l) => l.leadId)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 sm:gap-2.5">
              {leads.map((lead) => (
                <PipelineCard key={lead.leadId} lead={lead} stageConfig={stage} />
              ))}
              {leads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                  <Icon name={stage.icon} className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mb-1 sm:mb-2" />
                  <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Drop leads here</p>
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function LeadPipelinePage() {
  const navigate = useNavigate();
  const { getAll, getAllScores, updateStatus, updateLeadOutcomeStatus } = useLead();

  const [allLeads, setAllLeads] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeDragLead, setActiveDragLead] = useState(null);
  const [collapsedCols, setCollapsedCols] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function showToast(type, msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const leads = await getAll();
      setAllLeads(leads ?? []);
      getAllScores().then((s) => setScores(s ?? [])).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const handleCurrencyChange = () => {
      loadAll();
    };
    window.addEventListener('app-currency-changed', handleCurrencyChange);
    return () => window.removeEventListener('app-currency-changed', handleCurrencyChange);
  }, [loadAll]);

  const scoresMap = useMemo(() => {
    const m = {};
    for (const s of scores) m[s.leadId] = s;
    return m;
  }, [scores]);

  /* All unique sources for filter */
  const allSources = useMemo(() => {
    const s = new Set(allLeads.map((l) => l.leadSource).filter(Boolean));
    return [...s].sort();
  }, [allLeads]);

  const filteredLeads = useMemo(() => {
    let list = allLeads;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) =>
        (l.leadOrganisationName || "").toLowerCase().includes(q) ||
        (l.companyContactPersonName || "").toLowerCase().includes(q) ||
        (`${l.leadFirstName || ""} ${l.leadLastName || ""}`).toLowerCase().includes(q) ||
        (l.leadMobileNo || "").includes(q) ||
        (l.leadEmail || "").toLowerCase().includes(q)
      );
    }
    if (sourceFilter) list = list.filter((l) => l.leadSource === sourceFilter);
    return list;
  }, [allLeads, searchQuery, sourceFilter]);

  /* Bucket leads into stages */
  const stageLeads = useMemo(() => {
    const map = {};
    for (const stage of PIPELINE_STAGES) map[stage.id] = [];
    for (const lead of filteredLeads) {
      const stageId = getStageForLead(lead);
      if (map[stageId]) map[stageId].push(lead);
      else map["New Lead"].push(lead);
    }
    return map;
  }, [filteredLeads]);

  /* Summary KPIs */
  const kpis = useMemo(() => {
    const total = filteredLeads.length;
    const qualified = filteredLeads.filter((l) => l.leadStatus === "Qualified" || l.leadOutcomeStatus === "Qualified").length;
    const won = filteredLeads.filter((l) => l.leadOutcomeStatus === "Won").length;
    const closed = filteredLeads.filter((l) => l.leadOutcomeStatus === "Closed").length;
    const convRate = total > 0 ? ((won / total) * 100).toFixed(1) : "0.0";
    const totalValue = filteredLeads.reduce((s, l) => s + (l.quotationAmount || 0), 0);
    const wonValue = filteredLeads.filter((l) => l.leadOutcomeStatus === "Won").reduce((s, l) => s + (l.quotationAmount || 0), 0);
    return { total, qualified, won, closed, convRate, totalValue, wonValue };
  }, [filteredLeads]);

  /* Funnel percentages */
  const funnelData = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: stageLeads[stage.id]?.length || 0,
      pct: filteredLeads.length > 0 ? Math.round(((stageLeads[stage.id]?.length || 0) / filteredLeads.length) * 100) : 0,
    }));
  }, [stageLeads, filteredLeads]);

  /* DnD */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragStart(event) {
    const lead = allLeads.find((l) => l.leadId === event.active.id);
    setActiveDragLead(lead || null);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveDragLead(null);
    if (!over) return;

    const leadId = active.id;
    let newStageId = over.id;
    if (over.data?.current?.type === "lead") {
      const overLead = allLeads.find((l) => l.leadId === over.id);
      if (overLead) newStageId = getStageForLead(overLead);
    }

    const validIds = PIPELINE_STAGES.map((s) => s.id);
    if (!validIds.includes(newStageId)) return;

    const currentLead = allLeads.find((l) => l.leadId === leadId);
    const currentStage = currentLead ? getStageForLead(currentLead) : null;
    if (!currentLead || currentStage === newStageId) return;

    try {
      if (newStageId === "Won") {
        await updateLeadOutcomeStatus(leadId, "Won");
      } else if (newStageId === "Closed") {
        await updateLeadOutcomeStatus(leadId, "Closed");
      } else if (newStageId === "Open") {
        await updateLeadOutcomeStatus(leadId, "Open");
      } else if (newStageId === "Qualified") {
        await updateStatus(leadId, "Qualified");
        await updateLeadOutcomeStatus(leadId, "");
      } else if (newStageId === "Disqualified") {
        await updateStatus(leadId, "Disqualified");
        await updateLeadOutcomeStatus(leadId, "");
      }
      await loadAll();
      showToast("success", `Lead moved to ${PIPELINE_STAGES.find((s) => s.id === newStageId)?.label || newStageId}`);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to move lead");
    }
  }

  function toggleCollapse(stageId) {
    setCollapsedCols((p) => ({ ...p, [stageId]: !p[stageId] }));
  }

  return (
    <div className="flex flex-col min-h-screen gap-3 sm:gap-4 p-2 sm:p-4">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link to="/lead" className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0">
            <Icon name="mdi:arrow-left" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Leads</span>
          </Link>
          <span className="text-gray-300">/</span>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2">
              <Icon name="mdi:view-column-outline" className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
              <span className="truncate">Pipeline View</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-400">{filteredLeads.length} leads in pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button onClick={() => navigate("/lead")} className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white text-[10px] sm:text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
            <Icon name="mdi:table" className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden xs:inline">Table View</span>
          </button>
          <button onClick={loadAll} disabled={loading} className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white text-[10px] sm:text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
            <Icon name={loading ? "mdi:loading" : "mdi:refresh"} className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}`} /> <span className="hidden xs:inline">Refresh</span>
          </button>
          <button
            onClick={() => {
              const collapsed = {};
              PIPELINE_STAGES.forEach((s) => (collapsed[s.id] = true));
              setCollapsedCols(collapsed);
            }}
            className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            Collapse All
          </button>
          <button
            onClick={() => setCollapsedCols({})}
            className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            Expand All
          </button>
        </div>
      </div>

      {/* ─── KPI Strip ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        {[
          { label: "Total Leads", value: kpis.total, icon: "mdi:account-multiple-outline", color: "text-slate-600", bg: "bg-slate-50", border: "border-l-slate-400" },
          { label: "Qualified", value: kpis.qualified, icon: "mdi:check-decagram-outline", color: "text-blue-600", bg: "bg-blue-50", border: "border-l-blue-400" },
          { label: "Won", value: kpis.won, icon: "mdi:trophy-outline", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-l-emerald-400" },
          { label: "Closed/Lost", value: kpis.closed, icon: "mdi:close-circle-outline", color: "text-red-500", bg: "bg-red-50", border: "border-l-red-400" },
          { label: "Win Rate", value: `${kpis.convRate}%`, icon: "mdi:chart-line", color: "text-violet-600", bg: "bg-violet-50", border: "border-l-violet-400" },
          { label: "Pipeline Value", value: formatCurrency(kpis.totalValue), icon: "mdi:cash-multiple", color: "text-amber-600", bg: "bg-amber-50", border: "border-l-amber-400" },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 border-l-4 ${kpi.border} hover:shadow-md transition-shadow`}>
            <div className={`h-7 w-7 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg}`}>
              <Icon name={kpi.icon} className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 ${kpi.color}" style={{ height: "14px", width: "14px" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[10px] text-gray-400 font-semibold uppercase tracking-wider truncate">{kpi.label}</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900 leading-tight truncate">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Funnel Progress Bar ─── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700">Lead Funnel</h3>
          <span className="text-[10px] sm:text-xs text-gray-400">{filteredLeads.length} total leads</span>
        </div>
        <div className="flex items-stretch gap-1 h-6 sm:h-8 rounded-lg overflow-hidden">
          {funnelData.map((stage) => (
            stage.count > 0 && (
              <div
                key={stage.id}
                className={`relative ${stage.color} transition-all duration-500 flex items-center justify-center`}
                style={{ flex: stage.count }}
                title={`${stage.label}: ${stage.count} leads (${stage.pct}%)`}
              >
                {stage.pct >= 10 && (
                  <span className="text-white text-[8px] sm:text-[10px] font-bold">{stage.count}</span>
                )}
              </div>
            )
          ))}
        </div>
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-3 mt-2 sm:mt-3">
          {funnelData.map((stage) => (
            <div key={stage.id} className="flex items-center gap-1 sm:gap-1.5">
              <div className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${stage.color}`} />
              <span className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[40px] sm:max-w-none">{stage.label}</span>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-700">{stage.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[150px] sm:min-w-[200px] max-w-full sm:max-w-sm">
          <Icon name="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 w-full text-xs sm:text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-gray-400"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs sm:text-sm border border-gray-200 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          <option value="">All Sources</option>
          {allSources.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        {(searchQuery || sourceFilter) && (
          <button onClick={() => { setSearchQuery(""); setSourceFilter(""); }} className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-red-500 hover:text-red-700 font-medium shrink-0">
            <Icon name="mdi:close-circle-outline" className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Clear
          </button>
        )}
        <div className="hidden sm:block ml-auto text-[10px] sm:text-xs text-gray-400">
          Drag cards between stages to move leads
        </div>
      </div>

      {/* ─── Kanban Board ─── */}
      {loading ? (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="w-64 sm:w-72 md:w-80 shrink-0 space-y-2 sm:space-y-3">
              <div className="h-12 sm:h-16 bg-gray-200 rounded-xl animate-pulse" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 sm:h-28 bg-gray-100 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto items-start pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                leads={stageLeads[stage.id] || []}
                collapsed={!!collapsedCols[stage.id]}
                onToggleCollapse={() => toggleCollapse(stage.id)}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragLead && (
              <div className="bg-white rounded-xl border-2 border-blue-400 shadow-2xl p-2.5 sm:p-3.5 w-60 sm:w-72 opacity-95">
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold text-white ${avatarColor(activeDragLead.leadOrganisationName)}`}>
                    {getInitials(activeDragLead.companyContactPersonName || activeDragLead.leadOrganisationName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{activeDragLead.companyContactPersonName || activeDragLead.leadOrganisationName || "Lead"}</p>
                    {activeDragLead.quotationAmount != null && (
                      <p className="text-[10px] sm:text-xs text-emerald-600 font-bold">{formatCurrency(activeDragLead.quotationAmount, activeDragLead.leadCountry)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ─── Toast ─── */}
      {toast && createPortal(
        <div className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[70] flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium shadow-xl max-w-[90%] sm:max-w-none ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          <Icon name={toast.type === "success" ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"} className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span className="truncate">{toast.msg}</span>
        </div>,
        document.body
      )}
    </div>
  );
}