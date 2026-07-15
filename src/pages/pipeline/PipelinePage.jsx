import { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icon";
import AppConfirmModal from "../../components/ui/AppConfirmModal";
import OpportunityDealModal from "../../components/pipeline/OpportunityDealModal";
import { useLead } from "../../hooks/useLead";
import { formatDate, formatCurrency, formatCurrencyComp } from "../../utils/format";
import { getCurrencyConfig } from "../../utils/currency";

// Updated pipeline stages based on your requirements
const ACTIVE_PIPELINE_STAGES = [
  { key: "New Lead", title: "New Lead", order: 1 },
  { key: "Contacted", title: "Contacted", order: 2 },
  { key: "Meeting Scheduled", title: "Meeting Scheduled", order: 3 },
  { key: "Quotation Sent", title: "Quotation Sent", order: 4 },
  { key: "Negotiation", title: "Negotiation", order: 5 },
  { key: "Won", title: "Deal Won", order: 6 },
  { key: "Lost", title: "Deal Lost", order: 7 },
];

// Stage color classes for badges
const STAGE_COLORS = {
  "New Lead": "bg-blue-100 text-blue-800 border-blue-200",
  "Contacted": "bg-purple-100 text-purple-800 border-purple-200",
  "Meeting Scheduled": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Quotation Sent": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Negotiation": "bg-orange-100 text-orange-800 border-orange-200",
  "Won": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Lost": "bg-rose-100 text-rose-800 border-rose-200",
};

// Chart colors
const CHART_COLORS = {
  "New Lead": "#3B82F6",
  "Contacted": "#8B5CF6",
  "Meeting Scheduled": "#6366F1",
  "Quotation Sent": "#F59E0B",
  "Negotiation": "#F97316",
  "Won": "#10B981",
  "Lost": "#EF4444",
};

// Utility functions with Indian Rupees
const formatMoney = (amount, countryName = "", compact = false) => {
  if (amount == null) return "—";
  if (compact) {
    return formatCurrencyComp(amount, countryName);
  }
  return formatCurrency(amount, countryName);
};



const amountOf = (deal) => deal.oppAmount || 0;
const dealName = (deal) => deal.oppName || "Unnamed Customer";
const dealOwner = (deal) => deal.owner || "Unassigned";

const matchesDeal = (deal, term) => {
  const searchTerm = term.toLowerCase();
  return (
    (deal.oppName?.toLowerCase() || "").includes(searchTerm) ||
    (deal.oppTitle?.toLowerCase() || "").includes(searchTerm) ||
    (deal.owner?.toLowerCase() || "").includes(searchTerm) ||
    (deal.oppDescription?.toLowerCase() || "").includes(searchTerm)
  );
};

// Clean Bar Chart Component - No Y-axis labels
function BarChart({ data, title }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="text-center">
          <Icon name="mdi:chart-bar" className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-2 text-slate-500">No data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">Distribution of deal values across pipeline stages</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Icon name="mdi:currency-inr" className="h-3 w-3" />
          <span>Amount in ₹ (Indian Rupees)</span>
        </div>
      </div>

      <div className="relative h-80 w-full">
        {/* Simple Bars - No Y-axis labels */}
        <div className="absolute inset-0 flex h-full items-end gap-3">
          {data.map((item, idx) => {
            const heightPercent = (item.value / maxValue) * 100;
            const barHeight = item.value === 0 ? 4 : Math.max(heightPercent, 4);

            return (
              <div key={idx} className="relative flex flex-1 flex-col items-center gap-2 group">
                {/* Value on top of bar (visible on hover) */}
                <div className="text-xs font-semibold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {formatMoney(item.value, true)}
                </div>

                {/* Bar */}
                <div className="relative w-full">
                  <div
                    className="w-full rounded-t-lg transition-all duration-300 cursor-pointer relative overflow-hidden"
                    style={{
                      height: `${barHeight}%`,
                      minHeight: item.value === 0 ? '4px' : '35px',
                      backgroundColor: CHART_COLORS[item.stage] || '#94A3B8',
                      opacity: item.value === 0 ? 0.4 : 1,
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.target.getBoundingClientRect();
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                        stage: item.stage,
                        value: item.value,
                        percentage: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : "0"
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {/* Gradient overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

                    {/* Value inside bar for tall bars */}
                    {barHeight > 35 && item.value > 0 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-white drop-shadow-md whitespace-nowrap">
                        {formatMoney(item.value, true)}
                      </div>
                    )}

                    {/* Zero value indicator */}
                    {item.value === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-px bg-slate-400"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stage label */}
                <span className="text-xs font-medium text-slate-600 text-center px-1">
                  {item.stage}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 rounded-lg bg-slate-800 px-3 py-2 text-white shadow-lg pointer-events-none"
            style={{
              left: tooltip.x - 60,
              top: tooltip.y - 50,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-xs font-semibold mb-1">{tooltip.stage}</div>
            <div className="text-sm font-bold">{formatMoney(tooltip.value)}</div>
            <div className="text-xs text-slate-300">{tooltip.percentage}% of total</div>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xs text-slate-500">Total Pipeline Value</div>
            <div className="text-base font-bold text-slate-900">
              {formatMoney(totalValue, true)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500">Highest Stage</div>
            <div className="text-sm font-semibold text-slate-900 truncate">
              {data.reduce((max, curr) => curr.value > max.value ? curr : max).stage}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500">Average per Stage</div>
            <div className="text-base font-bold text-slate-900">
              {formatMoney(totalValue / data.length, true)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500">Active Stages</div>
            <div className="text-base font-bold text-slate-900">
              {data.filter(d => d.value > 0).length} / {data.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pie Chart Component
function PieChart({ data, title }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="text-center">
          <Icon name="mdi:chart-pie" className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-2 text-slate-500">No data available</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;

  const nonZeroData = data.filter(d => d.value > 0);

  if (nonZeroData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="text-center">
          <Icon name="mdi:chart-pie" className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-2 text-slate-500">No deals data available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="relative flex h-80 items-center justify-center">
        <svg viewBox="-100 -100 200 200" className="h-full w-full">
          {nonZeroData.map((item, idx) => {
            const angle = (item.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = startAngle + angle;
            currentAngle = endAngle;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 80 * Math.cos(startRad);
            const y1 = 80 * Math.sin(startRad);
            const x2 = 80 * Math.cos(endRad);
            const y2 = 80 * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            const pathData = [
              `M 0 0`,
              `L ${x1} ${y1}`,
              `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
              `Z`
            ].join(' ');

            return (
              <path
                key={idx}
                d={pathData}
                fill={CHART_COLORS[item.stage] || '#94A3B8'}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-all hover:opacity-80"
                onMouseEnter={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    label: item.stage,
                    value: item.value,
                    percentage: ((item.value / total) * 100).toFixed(1)
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
          <circle cx="0" cy="0" r="40" fill="white" />
          <text x="0" y="-5" textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-slate-800">
            Total
          </text>
          <text x="0" y="10" textAnchor="middle" dominantBaseline="middle" className="text-xs fill-slate-500">
            {total}
          </text>
        </svg>
        {tooltip && (
          <div
            className="fixed z-50 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: tooltip.x + 10, top: tooltip.y - 20 }}
          >
            <div className="font-semibold">{tooltip.label}</div>
            <div>{tooltip.value} deals</div>
            <div>{tooltip.percentage}% of total</div>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {nonZeroData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[item.stage] || '#94A3B8' }} />
            <span className="text-xs text-slate-600">{item.stage}</span>
            <span className="text-xs font-semibold text-slate-800">{((item.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Line Chart Component
function LineChart({ data, title }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="text-center">
          <Icon name="mdi:chart-line" className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-2 text-slate-500">No data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const points = data.map((item, idx) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = 100 - ((item.value / maxValue) * 90);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="relative h-80 w-full">
        <div className="absolute left-0 right-0 top-0 h-full">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="0" y1="20" x2="100" y2="20" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1="40" x2="100" y2="40" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1="60" x2="100" y2="60" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1="0" y1="80" x2="100" y2="80" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />

            <polyline
              points={points}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <polygon
              points={`0,100 ${points} 100,100`}
              fill="url(#gradient)"
              opacity="0.2"
            />

            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {data.map((item, idx) => {
              const x = (idx / (data.length - 1)) * 100;
              const y = 100 - ((item.value / maxValue) * 90);
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#3B82F6"
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = e.target.getBoundingClientRect();
                    setTooltip({
                      x: rect.left,
                      y: rect.top,
                      label: item.month,
                      value: item.value,
                      count: item.count
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between mt-2">
          {data.map((item, idx) => (
            <div key={idx} className="text-center flex-1">
              <div className="text-xs text-slate-500 whitespace-nowrap">{item.month}</div>
            </div>
          ))}
        </div>

        {tooltip && (
          <div
            className="fixed z-50 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}
          >
            <div className="font-semibold">{tooltip.label}</div>
            <div>Revenue: {formatMoney(tooltip.value)}</div>
            <div>Deals: {tooltip.count}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Funnel Chart Component
function FunnelChart({ data, title }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="text-center">
          <Icon name="mdi:chart-timeline-variant" className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-2 text-slate-500">No data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
      <div className="space-y-3">
        {data.map((item, idx) => {
          const widthPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={idx} className="relative group">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{item.stage}</span>
                  <span className="text-xs text-slate-400">{item.count || 0} deals</span>
                </div>
                <span className="font-semibold text-slate-900">{formatMoney(item.value)}</span>
              </div>
              <div
                className="relative h-10 rounded-lg transition-all duration-300 cursor-pointer overflow-hidden"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: CHART_COLORS[item.stage] || '#94A3B8',
                  opacity: item.value === 0 ? 0.3 : 1,
                }}
                onMouseEnter={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    stage: item.stage,
                    value: item.value,
                    count: item.count
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                {widthPercent > 20 && item.value > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white drop-shadow-md">
                    {`${Math.round(widthPercent)}%`}
                  </div>
                )}
                {item.value === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-px bg-slate-400"></div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: tooltip.x - 60, top: tooltip.y - 35 }}
        >
          <div className="font-semibold">{tooltip.stage}</div>
          <div>Value: {formatMoney(tooltip.value)}</div>
          <div>Deals: {tooltip.count}</div>
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const leadApi = useLead();
  const [deals, setDeals] = useState([]);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [initialStage, setInitialStage] = useState("New Lead");
  const [deleteDeal, setDeleteDeal] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeChart, setActiveChart] = useState("pipeline");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  function mapLeadToDeal(lead) {
    const getProbabilityFromStage = (stage) => {
      const probabilityMap = {
        "New Lead": 10,
        "Contacted": 25,
        "Meeting Scheduled": 40,
        "Quotation Sent": 60,
        "Negotiation": 80,
        "Won": 100,
        "Lost": 0,
      };
      return probabilityMap[stage] || lead.probability || 10;
    };

    return {
      oppId: lead.leadId,
      oppName: `${lead.leadFirstName ?? ""} ${lead.leadLastName ?? ""}`.trim() ||
        lead.leadTitle ||
        "Untitled Lead",
      oppTitle: lead.leadOrganisationName || "No Company",
      oppStatus: lead.leadStatus || "New Lead",
      oppAmount: lead.quotationAmount || 0,
      nextFollowupDate: lead.nextFollowupDate || lead.quotationDate || "",
      probability: lead.probability || getProbabilityFromStage(lead.leadStatus),
      oppDescription: lead.enquiryDescription || lead.leadReason || "",
      owner: lead.companyContactPersonName ||
        (lead.leadAssignedMember ? lead.leadAssignedMember : "Unassigned"),
      contactNumber: lead.leadPhone || "",
      email: lead.leadEmail || "",
      leadIdFk: lead.leadId,
      createdAt: lead.createdAt || lead.inquiryDate,
      leadCountry: lead.leadCountry || "",
      _rawLead: lead,
    };
  }

  async function loadDeals() {
    setLoading(true);
    try {
      const data = await leadApi.getAll();
      const mapped = (Array.isArray(data) ? data : []).map(mapLeadToDeal);
      setDeals(mapped);
    } catch (error) {
      console.error("Error loading deals:", error);
      setToast({ type: "error", text: "Unable to load pipeline leads." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeals();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, stageFilter]);

  const filteredDeals = useMemo(() => {
    let result = deals;

    const term = query.trim();
    if (term) {
      result = result.filter((deal) => matchesDeal(deal, term));
    }

    if (stageFilter !== "all") {
      result = result.filter((deal) => deal.oppStatus === stageFilter);
    }

    return result;
  }, [deals, query, stageFilter]);

  const totalPages = Math.ceil(filteredDeals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDeals = filteredDeals.slice(startIndex, endIndex);

  const metrics = useMemo(() => {
    const totalPipeline = filteredDeals.reduce((sum, deal) => sum + amountOf(deal), 0);
    const activeDeals = filteredDeals.filter((deal) => !["Won", "Lost"].includes(deal.oppStatus)).length;
    const won = filteredDeals.filter((deal) => deal.oppStatus === "Won").length;
    const lost = filteredDeals.filter((deal) => deal.oppStatus === "Lost").length;
    const weightedForecast = filteredDeals
      .filter((deal) => !["Won", "Lost"].includes(deal.oppStatus))
      .reduce((sum, deal) => sum + (amountOf(deal) * (deal.probability / 100)), 0);

    return {
      totalPipeline,
      activeDeals,
      won,
      lost,
      winRate: won + lost ? Math.round((won / (won + lost)) * 100) : 0,
      weightedForecast,
    };
  }, [filteredDeals]);

  const chartData = useMemo(() => {
    const valueByStage = ACTIVE_PIPELINE_STAGES.map(stage => ({
      stage: stage.title,
      value: filteredDeals
        .filter(deal => deal.oppStatus === stage.key)
        .reduce((sum, deal) => sum + amountOf(deal), 0)
    }));

    const countByStage = ACTIVE_PIPELINE_STAGES.map(stage => ({
      stage: stage.title,
      value: filteredDeals.filter(deal => deal.oppStatus === stage.key).length
    }));

    const monthlyData = {};
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toLocaleString('default', { month: 'short', year: 'numeric' });
    }).reverse();

    filteredDeals.forEach(deal => {
      if (deal.createdAt) {
        const date = new Date(deal.createdAt);
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (last6Months.includes(monthYear)) {
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { value: 0, count: 0 };
          }
          monthlyData[monthYear].value += amountOf(deal);
          monthlyData[monthYear].count++;
        }
      }
    });

    const monthlyTrend = last6Months.map(month => ({
      month,
      value: monthlyData[month]?.value || 0,
      count: monthlyData[month]?.count || 0
    }));

    const funnelData = ACTIVE_PIPELINE_STAGES.map(stage => ({
      stage: stage.title,
      value: filteredDeals
        .filter(deal => deal.oppStatus === stage.key)
        .reduce((sum, deal) => sum + amountOf(deal), 0),
      count: filteredDeals.filter(deal => deal.oppStatus === stage.key).length
    }));

    const employeeData = {};
    filteredDeals.forEach(deal => {
      if (deal.owner && deal.owner !== "Unassigned") {
        if (!employeeData[deal.owner]) {
          employeeData[deal.owner] = { value: 0, count: 0, won: 0 };
        }
        employeeData[deal.owner].value += amountOf(deal);
        employeeData[deal.owner].count++;
        if (deal.oppStatus === "Won") {
          employeeData[deal.owner].won++;
        }
      }
    });

    const topEmployees = Object.entries(employeeData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      valueByStage,
      countByStage,
      monthlyTrend,
      funnelData,
      topEmployees
    };
  }, [filteredDeals]);

  const stageDistribution = useMemo(() => {
    const distribution = {};
    ACTIVE_PIPELINE_STAGES.forEach(stage => {
      distribution[stage.key] = deals.filter(deal => deal.oppStatus === stage.key).length;
    });
    return distribution;
  }, [deals]);

  function openCreate(stage = "New Lead") {
    setEditingDeal(null);
    setInitialStage(stage);
    setModalOpen(true);
  }

  function openEdit(deal) {
    setEditingDeal(deal);
    setInitialStage(deal.oppStatus || "New Lead");
    setModalOpen(true);
  }

  async function saveDeal(payload) {
    setSaving(true);
    try {
      if (editingDeal) {
        const leadRequest = {
          ...editingDeal._rawLead,
          leadFirstName: payload.oppName,
          leadLastName: "",
          leadOrganisationName: payload.oppTitle,
          leadStatus: payload.oppStatus,
          quotationAmount: payload.oppAmount,
          quotationDate: payload.nextFollowupDate,
          nextFollowupDate: payload.nextFollowupDate,
          probability: payload.probability,
          enquiryDescription: payload.oppDescription,
          leadPhone: payload.contactNumber,
          leadEmail: payload.email,
          enquiryType: "Qualified",
        };
        const updatedLead = await leadApi.update(editingDeal.oppId, leadRequest);
        const updated = mapLeadToDeal(updatedLead);
        setDeals((current) => current.map((deal) => deal.oppId === editingDeal.oppId ? updated : deal));
        setToast({ type: "success", text: "Deal updated successfully." });
      } else {
        const leadRequest = {
          leadFirstName: payload.oppName,
          leadLastName: "",
          leadOrganisationName: payload.oppTitle,
          leadStatus: payload.oppStatus || "New Lead",
          quotationAmount: payload.oppAmount,
          quotationDate: payload.nextFollowupDate,
          nextFollowupDate: payload.nextFollowupDate,
          probability: payload.probability,
          enquiryDescription: payload.oppDescription,
          leadPhone: payload.contactNumber,
          leadEmail: payload.email,
          enquiryType: "Qualified",
          inquiryDate: new Date().toISOString().split('T')[0],
        };
        const createdLead = await leadApi.create(leadRequest);
        const created = mapLeadToDeal(createdLead);
        setDeals((current) => [created, ...current]);
        setToast({ type: "success", text: "Deal created successfully." });
      }
      setModalOpen(false);
      await loadDeals();
    } catch (error) {
      console.error("Error saving deal:", error);
      setToast({ type: "error", text: "Unable to save deal." });
    } finally {
      setSaving(false);
    }
  }

  async function moveDeal(deal, nextStage) {
    if (deal.oppStatus === nextStage) return;
    setSaving(true);
    try {
      await leadApi.updateStatus(deal.oppId, nextStage);
      await loadDeals();
      setToast({ type: "success", text: `Moved to ${nextStage}.` });
    } catch (error) {
      console.error("Error moving deal:", error);
      setToast({ type: "error", text: "Unable to move deal." });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteDeal) return;
    setSaving(true);
    try {
      await leadApi.remove(deleteDeal.oppId);
      setDeals((current) => current.filter((deal) => deal.oppId !== deleteDeal.oppId));
      setDeleteDeal(null);
      setToast({ type: "success", text: "Deal deleted successfully." });
    } catch (error) {
      console.error("Error deleting deal:", error);
      setToast({ type: "error", text: "Unable to delete deal." });
    } finally {
      setSaving(false);
    }
  }

  const getProbabilityColor = (probability) => {
    if (probability >= 70) return "bg-emerald-100 text-emerald-800";
    if (probability >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-full space-y-5 p-5 bg-slate-50">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Pipeline</p>
            <Icon name="mdi:chart-timeline-variant" className="h-5 w-5 text-blue-500" />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(metrics.totalPipeline, true)}</h2>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Active Deals</p>
            <Icon name="mdi:briefcase-outline" className="h-5 w-5 text-purple-500" />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{metrics.activeDeals}</h2>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Won / Lost</p>
            <Icon name="mdi:trophy-outline" className="h-5 w-5 text-emerald-500" />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            <span className="text-emerald-600">{metrics.won}</span>
            <span className="mx-1 text-slate-400">/</span>
            <span className="text-rose-600">{metrics.lost}</span>
          </h2>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Win Rate</p>
            <Icon name="mdi:percent" className="h-5 w-5 text-orange-500" />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{metrics.winRate}%</h2>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Weighted Forecast</p>
            <Icon name="mdi:cash-clock" className="h-5 w-5 text-emerald-500" />
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(metrics.weightedForecast, true)}</h2>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Analytics Dashboard</h2>
            <p className="text-sm text-slate-500">Visualize your pipeline performance</p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl bg-white p-1 shadow-sm border border-slate-200">
            {[
              { id: "pipeline", label: "Pipeline Value", icon: "mdi:chart-bar" },
              { id: "deals", label: "Deals Count", icon: "mdi:chart-pie" },
              { id: "trend", label: "Monthly Trend", icon: "mdi:chart-line" },
              { id: "funnel", label: "Sales Funnel", icon: "mdi:chart-timeline-variant" },
            ].map((chart) => (
              <button
                key={chart.id}
                onClick={() => setActiveChart(chart.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${activeChart === chart.id
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <Icon name={chart.icon} className="h-4 w-4" />
                <span>{chart.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {activeChart === "pipeline" && (
              <BarChart
                data={chartData.valueByStage}
                title="💰 Pipeline Value by Stage"
              />
            )}
            {activeChart === "deals" && (
              <PieChart
                data={chartData.countByStage}
                title="📊 Deals Distribution by Stage"
              />
            )}
            {activeChart === "trend" && (
              <LineChart
                data={chartData.monthlyTrend}
                title="📈 Monthly Revenue Trend"
              />
            )}
            {activeChart === "funnel" && (
              <FunnelChart
                data={chartData.funnelData}
                title="🎯 Sales Funnel Analysis"
              />
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">🏆 Top Performing Employees</h3>
                <p className="text-sm text-slate-500">Revenue generated by team members</p>
              </div>
              <Icon name="mdi:trophy" className="h-6 w-6 text-amber-400" />
            </div>

            {chartData.topEmployees.length > 0 ? (
              <div className="space-y-4">
                {chartData.topEmployees.map((emp, idx) => {
                  const maxValue = chartData.topEmployees[0]?.value || 1;
                  const barWidth = (emp.value / maxValue) * 100;
                  return (
                    <div key={idx} className="group">
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? "bg-amber-100 text-amber-700" :
                              idx === 1 ? "bg-slate-200 text-slate-600" :
                                idx === 2 ? "bg-orange-100 text-orange-700" :
                                  "bg-slate-100 text-slate-500"
                            }`}>
                            {idx + 1}
                          </span>
                          <span className="font-medium text-slate-800">{emp.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-900">{formatMoney(emp.value, true)}</span>
                          <span className="ml-2 text-xs text-slate-400">({emp.count} deals)</span>
                        </div>
                      </div>
                      <div className="h-8 overflow-hidden rounded-lg bg-slate-100">
                        <div
                          className="flex h-full items-center justify-end rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 text-xs font-semibold text-white transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        >
                          {barWidth > 25 && `${Math.round((emp.won / emp.count) * 100)}% win rate`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <Icon name="mdi:account-group" className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-slate-500">No employee data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Icon name="mdi:wallet" className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-slate-500">Average Deal Size</span>
              </div>
              <span className="text-lg font-bold text-slate-900">
                {formatMoney(filteredDeals.length > 0 ? metrics.totalPipeline / filteredDeals.length : 0, true)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <Icon name="mdi:trending-up" className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-slate-500">Best Stage</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {chartData.valueByStage.length > 0
                  ? chartData.valueByStage.reduce((max, curr) => curr.value > max.value ? curr : max).stage
                  : "N/A"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Icon name="mdi:percent" className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-slate-500">Conversion Rate</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{metrics.winRate}%</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-orange-100 p-2">
                  <Icon name="mdi:cash" className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-slate-500">Total Deals</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{filteredDeals.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="flex justify-end">
        <div className="relative w-full sm:w-72">
          <Icon
            name="mdi:magnify"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, company, owner..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {/* Stage Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStageFilter("all")}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap ${stageFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
        >
          All Deals ({deals.length})
        </button>
        {ACTIVE_PIPELINE_STAGES.map((stage) => (
          <button
            key={stage.key}
            onClick={() => setStageFilter(stage.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap ${stageFilter === stage.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
          >
            {stage.title} ({stageDistribution[stage.key] || 0})
          </button>
        ))}
      </div>

      {/* Deals List Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Icon name="mdi:loading" className="mx-auto h-12 w-12 animate-spin text-slate-400" />
              <p className="mt-2 text-slate-500">Loading deals...</p>
            </div>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="py-12 text-center">
            <Icon name="mdi:briefcase-off" className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-2 text-slate-500">No deals found</p>
            <button
              onClick={() => openCreate("New Lead")}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Icon name="mdi:plus" className="h-4 w-4" />
              Add your first deal
            </button>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Customer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Deal Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Current Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Assigned Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Next Follow-up</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Probability</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Notes</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {currentDeals.map((deal) => (
                  <tr key={deal.oppId} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">{dealName(deal)}</div>
                        {deal.oppTitle && <div className="text-xs text-slate-500">{deal.oppTitle}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">{formatMoney(amountOf(deal), deal.leadCountry)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={deal.oppStatus}
                        onChange={(event) => moveDeal(deal, event.target.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${STAGE_COLORS[deal.oppStatus]}`}
                      >
                        {ACTIVE_PIPELINE_STAGES.map((stage) => (
                          <option key={stage.key} value={stage.key}>{stage.title}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon name="mdi:account-circle" className="h-5 w-5 text-slate-400" />
                        <span className="text-sm text-slate-700">{dealOwner(deal)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon name="mdi:calendar" className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{formatDate(deal.nextFollowupDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <div className="h-1.5 w-full rounded-full bg-gray-200">
                            <div className={`h-1.5 rounded-full ${deal.probability >= 70 ? "bg-emerald-500" : deal.probability >= 40 ? "bg-yellow-500" : "bg-gray-500"}`} style={{ width: `${deal.probability}%` }} />
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getProbabilityColor(deal.probability)}`}>
                          {deal.probability}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="truncate text-sm text-slate-600" title={deal.oppDescription}>
                          {deal.oppDescription || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(deal)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700" title="Edit deal">
                          <Icon name="mdi:pencil" className="h-5 w-5" />
                        </button>
                        <button onClick={() => setDeleteDeal(deal)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Delete deal">
                          <Icon name="mdi:trash-can-outline" className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredDeals.length)} of {filteredDeals.length} deals
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <Icon name="mdi:chevron-double-left" className="h-5 w-5" />
                </button>
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <Icon name="mdi:chevron-left" className="h-5 w-5" />
                </button>
                <div className="flex gap-1">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-slate-400">...</span>
                    ) : (
                      <button key={page} onClick={() => goToPage(page)} className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-semibold transition ${currentPage === page ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                        {page}
                      </button>
                    )
                  ))}
                </div>
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <Icon name="mdi:chevron-right" className="h-5 w-5" />
                </button>
                <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <Icon name="mdi:chevron-double-right" className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <OpportunityDealModal
        open={modalOpen}
        deal={editingDeal}
        initialStage={initialStage}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSubmit={saveDeal}
      />

      <AppConfirmModal
        open={Boolean(deleteDeal)}
        title="Delete Deal"
        message={`Delete ${deleteDeal ? dealName(deleteDeal) : "this deal"} permanently?`}
        confirmLabel="Delete"
        loading={saving}
        onCancel={() => setDeleteDeal(null)}
        onConfirm={confirmDelete}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[70] rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}>
          <div className="flex items-center gap-2">
            <Icon name={toast.type === "success" ? "mdi:check-circle" : "mdi:alert-circle"} className="h-5 w-5" />
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}


