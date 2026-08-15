import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";

import Icon from "../../components/Icon";
import { formatCurrency } from "../../utils/format";
import { useLead } from "../../hooks/useLead";

const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

// Format KPI currency values cleanly
const formatKPIValue = (value) => {
  const currency = localStorage.getItem("appCurrency") || "INR";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

// Funnel Step Progress Component
function FunnelStep({ label, value, percentage, color = "blue", icon }) {
  const colorClasses = {
    blue: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50" },
    purple: { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-50" },
    indigo: { bg: "bg-indigo-500", text: "text-indigo-600", light: "bg-indigo-50" },
    yellow: { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50" },
    emerald: { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50" },
    gray: { bg: "bg-slate-400", text: "text-slate-600", light: "bg-slate-50" },
  };

  const style = colorClasses[color] || colorClasses.blue;

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
      <div className={`w-8 h-8 rounded-lg ${style.light} flex items-center justify-center shrink-0`}>
        <Icon name={icon || "mdi:circle"} className={`w-4 h-4 ${style.text}`} />
      </div>

      <div className="w-24 shrink-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{label}</p>
        <p className="text-[10px] text-slate-400 font-medium">{value} deals</p>
      </div>

      <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
        <div
          className={`h-full ${style.bg} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(percentage, 3)}%` }}
        />
      </div>

      <div className="w-12 text-right shrink-0">
        <span className="text-xs font-bold text-slate-700">{percentage}%</span>
      </div>
    </div>
  );
}

// Top List Rank Component
function TopListCard({ title, items, icon, valueFormatter }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Icon name={icon} className="w-4 h-4" />
          </div>
          {title}
        </h4>
        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Top 5</span>
      </div>

      {!items || items.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-xs font-medium">No data available</div>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                  idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-amber-700/10 text-amber-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-xs font-medium text-slate-800 truncate" title={item.name}>{item.name}</span>
              </div>
              <span className="text-xs font-bold text-slate-900 shrink-0 ml-2">
                {valueFormatter ? valueFormatter(item.value) : item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Custom Recharts Bar Chart Tooltip
function CustomBarTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700">
        <p className="font-bold text-slate-300 mb-1">{label}</p>
        <p className="font-semibold text-blue-400">
          Sales: {formatKPIValue(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

export default function ReportsPage() {
  const { getAll: getAllLeads } = useLead();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState("all"); // 'all' | 'month' | 'quarter' | 'year'
  const [openDateDropdown, setOpenDateDropdown] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const leadData = await getAllLeads();
        setLeads(leadData || []);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter leads based on selected date range
  const filteredLeads = useMemo(() => {
    if (!leads || leads.length === 0) return [];
    if (dateRange === "all") return leads;

    const now = new Date();
    return leads.filter((lead) => {
      const dateStr = lead.inquiryDate || lead.createdAt || lead.date || lead.createdDate;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;

      if (dateRange === "month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (dateRange === "quarter") {
        const qNow = Math.floor(now.getMonth() / 3);
        const qD = Math.floor(d.getMonth() / 3);
        return qNow === qD && d.getFullYear() === now.getFullYear();
      }
      if (dateRange === "year") {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [leads, dateRange]);

  const analytics = useMemo(() => {
    if (!filteredLeads || filteredLeads.length === 0) {
      return {
        totalRevenue: 0,
        totalLeads: 0,
        totalLeadsAmount: 0,
        qualifiedLeads: 0,
        qualifiedLeadsAmount: 0,
        openLeads: 0,
        openLeadsAmount: 0,
        negotiationLeads: 0,
        negotiationAmount: 0,
        wonLeads: 0,
        wonLeadsAmount: 0,
        closedLeads: 0,
        closedLeadsAmount: 0,
        conversionRate: 0,
        qualifiedRate: 0,
        funnelData: [],
        leadSources: [],
        topCustomers: [],
        topProducts: [],
        topCountries: [],
        activityData: [],
        monthlySales: [],
        salesByUser: [],
        forecast: { q3: 0, bestCase: 0, commit: 0 },
        winLossData: { won: 0, lost: 0, winRate: 0 },
      };
    }

    const totalRevenue = filteredLeads.reduce(
      (sum, lead) => sum + Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0),
      0
    );

    const wonLeads = filteredLeads.filter(lead => String(lead.leadOutcomeStatus || '').toLowerCase() === "won");
    const lostLeads = filteredLeads.filter(lead => String(lead.leadOutcomeStatus || '').toLowerCase() === "lost");
    const negotiationLeads = filteredLeads.filter(lead => String(lead.leadOutcomeStatus || '').toLowerCase() === "negotiation");
    const openLeads = filteredLeads.filter(lead => String(lead.leadOutcomeStatus || '').toLowerCase() === "open");
    const closedLeads = filteredLeads.filter(lead => String(lead.leadOutcomeStatus || '').toLowerCase() === "closed");
    const qualifiedLeads = filteredLeads.filter(lead => String(lead.leadStatus || '').toLowerCase() === "qualified");

    const totalLeads = filteredLeads.length;

    const qualifiedLeadsAmount = qualifiedLeads.reduce((sum, lead) => sum + Number(lead.quotationAmount || lead.amount || 0), 0);
    const negotiationAmount = negotiationLeads.reduce((sum, lead) => sum + Number(lead.quotationAmount || lead.amount || 0), 0);
    const openLeadsAmount = openLeads.reduce((sum, lead) => sum + Number(lead.quotationAmount || lead.amount || 0), 0);
    const wonLeadsAmount = wonLeads.reduce((sum, lead) => sum + Number(lead.quotationAmount || lead.amount || 0), 0);

    const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;
    const qualifiedRate = totalLeads > 0 ? (qualifiedLeads.length / totalLeads) * 100 : 0;

    const funnelData = [
      {
        label: "Total Leads",
        value: totalLeads,
        percentage: 100,
        color: "blue",
        icon: "mdi:account-multiple",
      },
      {
        label: "Qualified",
        value: qualifiedLeads.length,
        percentage: totalLeads > 0 ? Math.round((qualifiedLeads.length / totalLeads) * 100) : 0,
        color: "purple",
        icon: "mdi:account-check",
      },
      {
        label: "Open",
        value: openLeads.length,
        percentage: totalLeads > 0 ? Math.round((openLeads.length / totalLeads) * 100) : 0,
        color: "indigo",
        icon: "mdi:folder-open",
      },
      {
        label: "Negotiation",
        value: negotiationLeads.length,
        percentage: totalLeads > 0 ? Math.round((negotiationLeads.length / totalLeads) * 100) : 0,
        color: "yellow",
        icon: "mdi:handshake",
      },
      {
        label: "Won",
        value: wonLeads.length,
        percentage: totalLeads > 0 ? Math.round((wonLeads.length / totalLeads) * 100) : 0,
        color: "emerald",
        icon: "mdi:trophy",
      },
      {
        label: "Closed",
        value: closedLeads.length,
        percentage: totalLeads > 0 ? Math.round((closedLeads.length / totalLeads) * 100) : 0,
        color: "gray",
        icon: "mdi:close-circle",
      },
    ];

    // Monthly Sales Trend
    const monthMap = {};
    filteredLeads.forEach((lead) => {
      const dateField = lead.inquiryDate || lead.createdAt || lead.createdDate;
      if (dateField) {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) {
          const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
          const val = Number(lead.quotationAmount || lead.amount || lead.value || 0);
          monthMap[key] = (monthMap[key] || 0) + val;
        }
      }
    });

    const monthlySales = Object.entries(monthMap).map(([month, sales]) => ({
      month,
      sales,
    }));

    // Lead Sources
    const sourceMap = {};
    filteredLeads.forEach((lead) => {
      const src = lead.leadSource || lead.source || 'Other';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });

    const leadSources = Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Sales by User
    const userMap = {};
    filteredLeads.forEach((lead) => {
      const user = lead.teamMemberName || lead.assignedTo || lead.owner || 'Unassigned';
      const val = Number(lead.quotationAmount || lead.amount || 0);
      if (!userMap[user]) userMap[user] = { name: user, value: 0, count: 0 };
      userMap[user].value += val;
      userMap[user].count += 1;
    });

    const salesByUser = Object.values(userMap).sort((a, b) => b.value - a.value);

    // Top Customers
    const customerMap = {};
    filteredLeads.forEach((lead) => {
      const customer = lead.leadOrganisationName || lead.companyContactPersonName || 'Unknown';
      const val = Number(lead.quotationAmount || lead.amount || 0);
      customerMap[customer] = (customerMap[customer] || 0) + val;
    });

    const topCustomers = Object.entries(customerMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top Products
    const productMap = {};
    filteredLeads.forEach((lead) => {
      const prod = lead.enquiryType || lead.productName || lead.product || 'Standard Product';
      const val = Number(lead.quotationAmount || lead.amount || 0);
      productMap[prod] = (productMap[prod] || 0) + val;
    });

    const topProducts = Object.entries(productMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top Regions / Countries
    const regionMap = {};
    filteredLeads.forEach((lead) => {
      const country = lead.leadCountry || lead.country || 'India';
      regionMap[country] = (regionMap[country] || 0) + 1;
    });

    const topCountries = Object.entries(regionMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Activity Data
    const activityData = [
      { name: "New Leads", value: totalLeads },
      { name: "Qualified", value: qualifiedLeads.length },
      { name: "Negotiation", value: negotiationLeads.length },
      { name: "Won", value: wonLeads.length },
      { name: "Closed", value: closedLeads.length },
    ];

    const forecast = {
      q3: openLeadsAmount + negotiationAmount + wonLeadsAmount,
      bestCase: totalRevenue,
      commit: negotiationAmount + wonLeadsAmount,
    };

    return {
      totalRevenue,
      totalLeads,
      totalLeadsAmount: totalRevenue,
      qualifiedLeads: qualifiedLeads.length,
      qualifiedLeadsAmount,
      openLeads: openLeads.length,
      openLeadsAmount,
      negotiationLeads: negotiationLeads.length,
      negotiationAmount,
      wonLeads: wonLeads.length,
      wonLeadsAmount,
      closedLeads: closedLeads.length,
      closedLeadsAmount,
      conversionRate,
      qualifiedRate,
      funnelData,
      monthlySales,
      leadSources,
      topCustomers,
      topProducts,
      topCountries,
      activityData,
      salesByUser,
      forecast,
      winLossData: {
        won: wonLeads.length,
        lost: lostLeads.length,
        winRate: totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0,
      },
    };
  }, [filteredLeads]);

  // Export to Excel XLSX
  const exportToXLSX = () => {
    if (!analytics) return;
    setExporting(true);

    try {
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Reports & Analytics Summary'],
        [`Date Range: ${dateRange.toUpperCase()} | Generated: ${new Date().toLocaleString()}`],
        [],
        ['KPI Metric', 'Value'],
        ['Total Revenue', formatCurrency(analytics.totalRevenue)],
        ['Total Leads', analytics.totalLeads],
        ['Qualified Leads', analytics.qualifiedLeads],
        ['Open Leads', analytics.openLeads],
        ['Negotiation Deals', analytics.negotiationLeads],
        ['Won Deals', analytics.wonLeads],
        ['Closed Deals', analytics.closedLeads],
        ['Win Rate', `${analytics.winLossData.winRate.toFixed(1)}%`],
        ['Conversion Rate', `${analytics.conversionRate.toFixed(1)}%`],
        [],
        ['Sales Funnel Breakdown'],
        ['Stage', 'Deals Count', 'Percentage'],
      ];

      analytics.funnelData.forEach((item) => {
        summaryData.push([item.label, item.value, `${item.percentage}%`]);
      });

      if (analytics.leadSources.length > 0) {
        summaryData.push([]);
        summaryData.push(['Lead Sources Breakdown']);
        summaryData.push(['Source', 'Leads Count']);
        analytics.leadSources.forEach((src) => {
          summaryData.push([src.name, src.value]);
        });
      }

      if (analytics.salesByUser.length > 0) {
        summaryData.push([]);
        summaryData.push(['Sales Performance by User']);
        summaryData.push(['User', 'Revenue', 'Deals Count']);
        analytics.salesByUser.forEach((user) => {
          summaryData.push([user.name, formatKPIValue(user.value), user.count]);
        });
      }

      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      // Top Customers sheet
      if (analytics.topCustomers.length > 0) {
        const customerData = [['Top Customers'], ['Customer Name', 'Total Revenue']];
        analytics.topCustomers.forEach((c) => {
          customerData.push([c.name, formatKPIValue(c.value)]);
        });
        const ws2 = XLSX.utils.aoa_to_sheet(customerData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Top Customers');
      }

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sales_reports_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    setScheduleSuccess(true);
    setTimeout(() => {
      setScheduleSuccess(false);
      setShowScheduleModal(false);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center text-slate-400">
        <div className="text-center">
          <Icon name="mdi:loading" className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading reports & analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-[1600px] mx-auto px-4 sm:px-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">Track performance, sales pipeline metrics, and key revenue forecasts</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDateDropdown(!openDateDropdown)}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs font-semibold hover:border-slate-300 transition-colors shadow-sm"
            >
              <Icon name="mdi:calendar-range" className="w-4 h-4 text-blue-600" />
              <span>
                {dateRange === "all" && "All Time"}
                {dateRange === "month" && "This Month"}
                {dateRange === "quarter" && "This Quarter"}
                {dateRange === "year" && "This Year"}
              </span>
              <Icon name="mdi:chevron-down" className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openDateDropdown ? 'rotate-180' : ''}`} />
            </button>

            {openDateDropdown && (
              <div 
                className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setOpenDateDropdown(false)}
              >
                {[
                  { id: "all", label: "All Time" },
                  { id: "month", label: "This Month" },
                  { id: "quarter", label: "This Quarter" },
                  { id: "year", label: "This Year" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDateRange(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium flex items-center justify-between transition-colors ${
                      dateRange === item.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{item.label}</span>
                    {dateRange === item.id && <Icon name="mdi:check" className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={exportToXLSX}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-xs font-semibold shadow-sm shadow-blue-200 disabled:opacity-60"
          >
            {exporting ? (
              <Icon name="mdi:loading" className="w-4 h-4 animate-spin" />
            ) : (
              <Icon name="mdi:file-excel-outline" className="w-4 h-4" />
            )}
            <span>{exporting ? "Exporting..." : "Export Excel (.xlsx)"}</span>
          </button>

          {/* Schedule Button */}
          <button
            onClick={() => setShowScheduleModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs font-semibold hover:border-slate-300 transition-colors shadow-sm"
          >
            <Icon name="mdi:clock-outline" className="w-4 h-4 text-slate-500" />
            <span>Schedule</span>
          </button>
        </div>
      </div>

      {/* KPI TOP ROW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Leads</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon name="mdi:account-multiple-outline" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{analytics.totalLeads || 0}</p>
          <p className="text-xs text-blue-600 font-semibold mt-1 truncate">{formatKPIValue(analytics.totalLeadsAmount || 0)}</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-lg hover:border-purple-200 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualified</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon name="mdi:account-check-outline" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{analytics.qualifiedLeads || 0}</p>
          <p className="text-xs text-purple-600 font-semibold mt-1 truncate">{formatKPIValue(analytics.qualifiedLeadsAmount || 0)}</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Won Deals</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon name="mdi:trophy-outline" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{analytics.wonLeads || 0}</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1 truncate">{formatKPIValue(analytics.wonLeadsAmount || 0)}</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-lg hover:border-green-200 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon name="mdi:cash-multiple" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">{formatKPIValue(analytics.totalRevenue || 0)}</p>
          <p className="text-xs text-green-600 font-semibold mt-1">{analytics.totalLeads} total deal(s)</p>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conversion</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon name="mdi:chart-arc" className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{(analytics.conversionRate || 0).toFixed(1)}%</p>
          <p className="text-xs text-indigo-600 font-semibold mt-1">Qualified: {(analytics.qualifiedRate || 0).toFixed(1)}%</p>
        </div>
      </div>

      {/* GRID 1: Sales Funnel | Lead Source | Monthly Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Funnel Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon name="mdi:filter-variant" className="w-4 h-4" />
              </div>
              Sales Funnel
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Stage Conversion</span>
          </div>

          <div className="space-y-1">
            {(analytics.funnelData || []).map((step, idx) => (
              <FunnelStep
                key={idx}
                label={step.label}
                value={step.value}
                percentage={step.percentage}
                color={step.color}
                icon={step.icon}
              />
            ))}
          </div>
        </div>

        {/* Lead Source Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Icon name="mdi:source-commit" className="w-4 h-4" />
              </div>
              Lead Source
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Channel Origin</span>
          </div>

          {(analytics.leadSources || []).length > 0 ? (
            <div className="space-y-3 pt-2">
              {(analytics.leadSources || []).slice(0, 6).map((source, idx) => {
                const pct = analytics.totalLeads > 0 ? Math.round((source.value / analytics.totalLeads) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-semibold text-slate-800">{source.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{source.value}</span>
                        <span className="text-[10px] font-semibold text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs font-medium">No lead source data available</div>
          )}
        </div>

        {/* Monthly Sales Chart Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Icon name="mdi:chart-bar" className="w-4 h-4" />
              </div>
              Monthly Sales Trend
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Revenue Volume</span>
          </div>

          {(analytics.monthlySales || []).length > 0 ? (
            <div className="h-[210px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="sales" radius={[6, 6, 0, 0]} fill="#3B82F6" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[210px] flex items-center justify-center text-slate-400 text-xs font-medium">
              No sales trend data available
            </div>
          )}
        </div>
      </div>

      {/* GRID 2: Sales by User | Activity Report | Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales by User */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon name="mdi:account-group" className="w-4 h-4" />
              </div>
              Sales by User
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Rep Revenue</span>
          </div>

          {(analytics.salesByUser || []).length > 0 ? (
            <div className="space-y-3">
              {(analytics.salesByUser || []).slice(0, 5).map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">{user.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{formatKPIValue(user.value)}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{user.count} deal(s)</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-medium">No user sales data available</div>
          )}
        </div>

        {/* Activity Report */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Icon name="mdi:chart-pie" className="w-4 h-4" />
              </div>
              Activity Report
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Volume</span>
          </div>

          {(analytics.activityData || []).length > 0 ? (
            <div className="space-y-3 pt-1">
              {(analytics.activityData || []).map((activity, idx) => {
                const pct = analytics.totalLeads > 0 ? Math.round((activity.value / analytics.totalLeads) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{activity.name}</span>
                      <span className="font-bold text-slate-900">{activity.value}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          backgroundColor: COLORS[idx % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-medium">No activity data available</div>
          )}
        </div>

        {/* Forecast Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Icon name="mdi:chart-simple" className="w-4 h-4" />
              </div>
              Forecast & Target
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Projections</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-xs font-semibold text-slate-600">Q3 Forecast</span>
              <span className="text-xs font-bold text-slate-900">{formatKPIValue(analytics.forecast?.q3 || 0)}</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
              <span className="text-xs font-semibold text-emerald-800">Best Case</span>
              <span className="text-xs font-bold text-emerald-700">{formatKPIValue(analytics.forecast?.bestCase || 0)}</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
              <span className="text-xs font-semibold text-blue-800">Commit</span>
              <span className="text-xs font-bold text-blue-700">{formatKPIValue(analytics.forecast?.commit || 0)}</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-amber-50/70 border border-amber-100 rounded-xl">
              <span className="text-xs font-semibold text-amber-800">Win Rate</span>
              <span className="text-xs font-bold text-amber-700">{(analytics.winLossData?.winRate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP 5 SECTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 border-t border-slate-200/60 pt-6">
        <TopListCard
          title="Top Customers"
          items={analytics.topCustomers || []}
          icon="mdi:account-tie"
          valueFormatter={(val) => formatKPIValue(val)}
        />

        <TopListCard
          title="Top Products"
          items={analytics.topProducts || []}
          icon="mdi:cube-outline"
          valueFormatter={(val) => formatKPIValue(val)}
        />

        <TopListCard
          title="Region Report"
          items={analytics.topCountries || []}
          icon="mdi:earth"
          valueFormatter={(val) => `${val} deals`}
        />
      </div>

      {/* FOOTER METADATA */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 border-t border-slate-100 pt-4 gap-2">
        <span className="flex items-center gap-1.5">
          <Icon name="mdi:calendar-check" className="w-3.5 h-3.5 text-slate-400" />
          Data updated: {new Date().toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="mdi:refresh" className="w-3.5 h-3.5 text-slate-400" />
          Auto-refresh every 30min
        </span>
      </div>

      {/* SCHEDULE REPORT MODAL */}
      {showScheduleModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowScheduleModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Icon name="mdi:clock-outline" className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Schedule Email Report</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="mdi:close" className="w-5 h-5" />
              </button>
            </div>

            {scheduleSuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Icon name="mdi:check" className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-900">Report Scheduled!</p>
                <p className="text-xs text-slate-500">You will receive automated report emails as requested.</p>
              </div>
            ) : (
              <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                    <option value="daily">Daily Summary</option>
                    <option value="weekly">Weekly Report (Mondays)</option>
                    <option value="monthly">Monthly Report (1st of month)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recipient Email</label>
                  <input
                    type="email"
                    required
                    placeholder="manager@company.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="pdf">PDF Summary</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm"
                  >
                    Schedule Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}