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
  LineChart,
  Line,
  CartesianGrid,
  YAxis,
} from "recharts";
import * as XLSX from 'xlsx';

import Icon from "../../components/Icon";
import { formatCurrency } from "../../utils/format";
import { useLead } from "../../hooks/useLead";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const currency = localStorage.getItem("appCurrency") || "INR";

// Format KPI values with proper error handling
const formatKPIValue = (value) => {
  const currency = localStorage.getItem("appCurrency") || "INR";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

// Enhanced KPI Card Component
function KPICard({ label, value, amount, change, icon, color = "blue", onClick }) {
  const colorMap = {
    blue: "border-l-blue-500 bg-blue-50 text-blue-500",
    green: "border-l-green-500 bg-green-50 text-green-500",
    purple: "border-l-purple-500 bg-purple-50 text-purple-500",
    yellow: "border-l-yellow-500 bg-yellow-50 text-yellow-500",
    orange: "border-l-orange-500 bg-orange-50 text-orange-500",
    emerald: "border-l-emerald-500 bg-emerald-50 text-emerald-500",
    indigo: "border-l-indigo-500 bg-indigo-50 text-indigo-500",
    gray: "border-l-gray-500 bg-gray-50 text-gray-500",
    red: "border-l-red-500 bg-red-50 text-red-500",
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 border-l-4 ${colorMap[color]?.split(' ')[0] || 'border-l-blue-500'} hover:shadow-md transition-shadow group ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <span className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg ${colorMap[color]?.split(' ')[1] || 'bg-blue-50'} group-hover:${colorMap[color]?.split(' ')[1]?.replace('50', '100') || 'bg-blue-100'} flex items-center justify-center transition-colors`}>
          <Icon name={icon} className={`w-3 h-3 sm:w-4 sm:h-4 ${colorMap[color]?.split(' ')[2] || 'text-blue-500'}`} />
        </div>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
      {amount !== undefined && amount !== null && (
        <p className={`text-[8px] sm:text-xs ${colorMap[color]?.split(' ')[2] || 'text-blue-500'} mt-0.5 sm:mt-1 font-semibold truncate`}>
          Amt: {amount}
        </p>
      )}
      {change && (
        <div className={`mt-1 flex items-center gap-1 text-[8px] sm:text-xs font-medium ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
          <Icon name={change.startsWith('+') ? "mdi:trending-up" : "mdi:trending-down"} className="w-3 h-3" />
          {change}
        </div>
      )}
    </div>
  );
}

// Funnel Step Component
function FunnelStep({ label, value, percentage, color = "blue", icon, onClick, change }) {
  const colors = {
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    gray: "bg-gray-400",
    red: "bg-red-500",
    emerald: "bg-emerald-500",
    yellow: "bg-yellow-500",
    indigo: "bg-indigo-500",
  };

  return (
    <div
      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colors[color] || colors.blue }}>
        <Icon name={icon || "mdi:circle"} className="w-3 h-3 text-white" />
      </div>
      <span className="w-20 text-xs font-medium text-gray-600 truncate">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color] || colors.blue} rounded-full flex items-center justify-end pr-2 text-white text-[10px] font-bold transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        >
          {value}
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs font-semibold text-gray-600 w-10 text-right">{percentage}%</span>
        {change && (
          <span className={`text-[8px] font-medium ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

// Top List Component
function TopList({ title, items, icon }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Icon name={icon} className="w-4 h-4 text-blue-600" />
          {title}
        </h4>
        <p className="text-sm text-gray-400 text-center py-4">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Icon name={icon} className="w-4 h-4 text-blue-600" />
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.slice(0, 5).map((item, idx) => (
          <li key={idx} className="flex justify-between items-center text-sm">
            <span className="text-gray-600 truncate">{item.name}</span>
            <span className="font-semibold text-gray-900">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReportsPage() {
  const { getAll: getAllLeads } = useLead();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [activeTab, setActiveTab] = useState("Sales");

  const TABS = [
    { id: "Enquiry", icon: "mdi:account-question-outline" },
    { id: "Quotation", icon: "mdi:file-document-outline" },
    { id: "Inventory", icon: "mdi:package-variant-closed" },
    { id: "Accounting", icon: "mdi:calculator" },
    { id: "SignIn", icon: "mdi:login" },
    { id: "Tasks", icon: "mdi:checkbox-marked-circle-outline" },
    { id: "Visit", icon: "mdi:map-marker-path" },
    { id: "Sales", icon: "mdi:currency-usd" },
  ];

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

  const analytics = useMemo(() => {
    if (!leads || leads.length === 0) {
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
        pipelineData: [],
        revenueTrend: [],
        leadSources: [],
        topCustomers: [],
        topProducts: [],
        topIndustries: [],
        topCountries: [],
        winLossData: { won: 0, lost: 0, winRate: 0 },
        activityData: [],
        salesPerformance: [],
        reports: [],
        reportsCount: 0,
        salesByUser: [],
        monthlySales: [],
        regionReport: [],
        forecast: { q3: 0, bestCase: 0, commit: 0 },
      };
    }

    // Calculate total revenue
    const totalRevenue = leads.reduce(
      (sum, lead) => sum + Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0),
      0
    );

    // Filter by leadOutcomeStatus (case insensitive)
    const wonLeads = leads.filter(lead => {
      const status = String(lead.leadOutcomeStatus || '').toLowerCase();
      return status === "won";
    });

    const lostLeads = leads.filter(lead => {
      const status = String(lead.leadOutcomeStatus || '').toLowerCase();
      return status === "lost";
    });

    const negotiationLeads = leads.filter(lead => {
      const status = String(lead.leadOutcomeStatus || '').toLowerCase();
      return status === "negotiation";
    });

    const openLeads = leads.filter(lead => {
      const status = String(lead.leadOutcomeStatus || '').toLowerCase();
      return status === "open";
    });

    const closedLeads = leads.filter(lead => {
      const status = String(lead.leadOutcomeStatus || '').toLowerCase();
      return status === "closed";
    });

    const qualifiedLeads = leads.filter(lead => {
      const status = String(lead.leadStatus || '').toLowerCase();
      return status === "qualified";
    });

    const totalLeads = leads.length;

    // Calculate amounts
    const totalLeadsAmount = totalRevenue;
    const qualifiedLeadsAmount = qualifiedLeads.reduce((sum, lead) => {
      return sum + Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0);
    }, 0);
    const negotiationAmount = negotiationLeads.reduce((sum, lead) => {
      return sum + Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0);
    }, 0);
    const openLeadsAmount = openLeads.reduce((sum, lead) => {
      return sum + Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0);
    }, 0);
    const wonLeadsAmount = wonLeads.reduce((sum, lead) => {
      return sum + Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0);
    }, 0);
    const closedLeadsAmount = closedLeads.reduce((sum, lead) => {
      return sum + Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0);
    }, 0);

    const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;
    const qualifiedRate = totalLeads > 0 ? (qualifiedLeads.length / totalLeads) * 100 : 0;

    // Funnel data
    const funnelData = [
      {
        label: "Total Leads",
        value: totalLeads,
        percentage: 100,
        color: "blue",
        icon: "mdi:account-multiple",
        change: null,
      },
      {
        label: "Qualified",
        value: qualifiedLeads.length,
        percentage:
          totalLeads > 0
            ? Math.round((qualifiedLeads.length / totalLeads) * 100)
            : 0,
        color: "purple",
        icon: "mdi:account-check",
        change: null,
      },
      {
        label: "Open",
        value: openLeads.length,
        percentage:
          totalLeads > 0
            ? Math.round((openLeads.length / totalLeads) * 100)
            : 0,
        color: "indigo",
        icon: "mdi:folder-open",
        change: null,
      },
      {
        label: "Negotiation",
        value: negotiationLeads.length,
        percentage:
          totalLeads > 0
            ? Math.round((negotiationLeads.length / totalLeads) * 100)
            : 0,
        color: "yellow",
        icon: "mdi:handshake",
        change: null,
      },
      {
        label: "Won",
        value: wonLeads.length,
        percentage:
          totalLeads > 0
            ? Math.round((wonLeads.length / totalLeads) * 100)
            : 0,
        color: "emerald",
        icon: "mdi:trophy",
        change: null,
      },
      {
        label: "Closed",
        value: closedLeads.length,
        percentage:
          totalLeads > 0
            ? Math.round((closedLeads.length / totalLeads) * 100)
            : 0,
        color: "gray",
        icon: "mdi:close-circle",
        change: null,
      },
    ];

    // Pipeline data for chart
    const pipelineData = [
      { name: "Open", deals: openLeads.length },
      { name: "Negotiation", deals: negotiationLeads.length },
      { name: "Won", deals: wonLeads.length },
      { name: "Closed", deals: closedLeads.length },
    ];

    // Revenue trend by month
    const revenueTrend = leads.reduce((acc, lead) => {
      const dateField = lead.inquiryDate || lead.createdAt || lead.date || lead.createdDate;
      if (dateField) {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) {
          const month = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear();
          const key = `${month} ${year}`;
          const existing = acc.find(item => item.month === key);
          const value = Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0);
          if (existing) {
            existing.revenue += value;
          } else {
            acc.push({ month: key, revenue: value });
          }
        }
      }
      return acc;
    }, []).sort((a, b) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const aMonth = a.month?.split(' ')[0] || '';
      const bMonth = b.month?.split(' ')[0] || '';
      return months.indexOf(aMonth) - months.indexOf(bMonth);
    });

    // Monthly sales data (for chart)
    const monthlySales = revenueTrend.map(item => ({
      month: item.month,
      sales: item.revenue
    }));

    // Lead sources
    const leadSources = leads.reduce((acc, lead) => {
      const source = lead.leadSource || lead.source || 'Unknown';
      const existing = acc.find(item => item.name === source);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: source, value: 1 });
      }
      return acc;
    }, []).sort((a, b) => b.value - a.value);

    // Sales by user
    const salesByUser = leads.reduce((acc, lead) => {
      const user = lead.assignedTo || lead.owner || 'Unassigned';
      const existing = acc.find(item => item.name === user);
      const value = Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0);
      if (existing) {
        existing.value += value;
        existing.count = (existing.count || 0) + 1;
      } else {
        acc.push({ name: user, value: value, count: 1 });
      }
      return acc;
    }, []).sort((a, b) => b.value - a.value).slice(0, 5)
      .map(item => ({
        ...item,
        value: formatKPIValue(item.value)
      }));

    // Top customers
    const topCustomers = leads.reduce((acc, lead) => {
      const customer = lead.leadOrganisationName || lead.companyContactPersonName || lead.customer || 'Unknown';
      const existing = acc.find(item => item.name === customer);
      const value = Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0);
      if (existing) {
        existing.value += value;
      } else {
        acc.push({ name: customer, value: value });
      }
      return acc;
    }, []).sort((a, b) => b.value - a.value).slice(0, 5)
      .map(item => ({
        ...item,
        value: formatKPIValue(item.value)
      }));

    // Top products
    const topProducts = leads.reduce((acc, lead) => {
      const product = lead.productName || lead.product || 'Unknown';
      const existing = acc.find(item => item.name === product);
      const value = Number(lead.quotationAmount || lead.amount || lead.price || lead.value || 0);
      if (existing) {
        existing.value += value;
      } else {
        acc.push({ name: product, value: value });
      }
      return acc;
    }, []).sort((a, b) => b.value - a.value).slice(0, 5)
      .map(item => ({
        ...item,
        value: formatKPIValue(item.value)
      }));

    // Top industries
    const topIndustries = leads.reduce((acc, lead) => {
      const industry = lead.leadIndustry || lead.industry || 'Unknown';
      const existing = acc.find(item => item.name === industry);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: industry, value: 1 });
      }
      return acc;
    }, []).sort((a, b) => b.value - a.value).slice(0, 5)
      .map(item => ({
        ...item,
        value: totalLeads > 0 ? `${Math.round((item.value / totalLeads) * 100)}%` : '0%'
      }));

    // Top countries (region report)
    const topCountries = leads.reduce((acc, lead) => {
      const country = lead.leadCountry || lead.country || 'Unknown';
      const existing = acc.find(item => item.name === country);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: country, value: 1 });
      }
      return acc;
    }, []).sort((a, b) => b.value - a.value).slice(0, 5)
      .map(item => ({
        ...item,
        value: String(item.value)
      }));

    // Win/Loss
    const winLossData = {
      won: wonLeads.length,
      lost: lostLeads.length,
      winRate: totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0
    };

    // Activity data (from leads)
    const activityData = [
      { name: "New Leads", value: totalLeads },
      { name: "Qualified", value: qualifiedLeads.length },
      { name: "Negotiation", value: negotiationLeads.length },
      { name: "Won", value: wonLeads.length },
      { name: "Closed", value: closedLeads.length },
    ];

    // Forecast
    const openRevenue = openLeads.reduce(
      (sum, lead) => sum + Number(lead.quotationAmount || 0),
      0
    );

    const negotiationRevenue = negotiationLeads.reduce(
      (sum, lead) => sum + Number(lead.quotationAmount || 0),
      0
    );

    const wonRevenue = wonLeads.reduce(
      (sum, lead) => sum + Number(lead.quotationAmount || 0),
      0
    );

    const forecast = {
      q3: openRevenue + negotiationRevenue + wonRevenue,
      bestCase: totalRevenue,
      commit: negotiationRevenue + wonRevenue,
    };

    return {
      totalRevenue,
      totalLeads,
      totalLeadsAmount,
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
      pipelineData,
      revenueTrend,
      monthlySales,
      leadSources,
      topCustomers,
      topProducts,
      topIndustries,
      topCountries,
      winLossData,
      activityData,
      salesByUser,
      regionReport: topCountries,
      reports: [],
      reportsCount: 0,
      salesPerformance: [],
      forecast,
    };
  }, [leads]);

  // Function to export to XLSX
  const exportToXLSX = () => {
    if (!analytics) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['Reports & Analytics Export'],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['KPI Summary'],
      ['Metric', 'Value'],
      ['Total Revenue', formatCurrency(analytics.totalRevenue)],
      ['Total Leads', analytics.totalLeads],
      ['Qualified Leads', analytics.qualifiedLeads],
      ['Open Leads', analytics.openLeads],
      ['Negotiation Leads', analytics.negotiationLeads],
      ['Won Deals', analytics.wonLeads],
      ['Closed Deals', analytics.closedLeads],
      ['Win Rate', `${Math.round((analytics.wonLeads / Math.max(analytics.totalLeads, 1)) * 100)}%`],
      ['Conversion Rate', `${analytics.conversionRate.toFixed(1)}%`],
      [],
      ['Pipeline Overview'],
      ['Stage', 'Deals'],
    ];

    analytics.pipelineData.forEach((stage) => {
      summaryData.push([stage.name, stage.deals]);
    });

    // Lead Sources
    if (analytics.leadSources && analytics.leadSources.length > 0) {
      summaryData.push([]);
      summaryData.push(['Lead Sources']);
      summaryData.push(['Source', 'Count']);
      analytics.leadSources.forEach((source) => {
        summaryData.push([source.name, source.value]);
      });
    }

    // Sales by User
    if (analytics.salesByUser && analytics.salesByUser.length > 0) {
      summaryData.push([]);
      summaryData.push(['Sales by User']);
      summaryData.push(['User', 'Revenue', 'Count']);
      analytics.salesByUser.forEach((user) => {
        summaryData.push([user.name, user.value, user.count || 0]);
      });
    }

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Sheet 2: Top Customers
    if (analytics.topCustomers && analytics.topCustomers.length > 0) {
      const customerData = [
        ['Top Customers'],
        ['Customer Name', 'Revenue'],
      ];
      analytics.topCustomers.forEach((customer) => {
        customerData.push([customer.name, customer.value]);
      });
      const ws2 = XLSX.utils.aoa_to_sheet(customerData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Top Customers');
    }

    // Sheet 3: Top Products
    if (analytics.topProducts && analytics.topProducts.length > 0) {
      const productData = [
        ['Top Products'],
        ['Product Name', 'Revenue'],
      ];
      analytics.topProducts.forEach((product) => {
        productData.push([product.name, product.value]);
      });
      const ws3 = XLSX.utils.aoa_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Top Products');
    }

    // Generate Excel file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab.toLowerCase()}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportReport = async () => {
    if (!analytics || leads.length === 0) {
      alert('No data available to export');
      return;
    }
    setExporting(true);
    try {
      if (exportFormat === 'xlsx') {
        exportToXLSX();
      } else {
        alert("Only XLSX format is supported.");
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const ExportButton = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-600 text-sm hover:bg-gray-50 transition-colors">
        <Icon name="mdi:calendar" className="w-4 h-4" />
        <span>Date Filter</span>
        <Icon name="mdi:chevron-down" className="w-4 h-4" />
      </button>
      <button
        onClick={handleExportReport}
        disabled={exporting || loading}
        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
      >
        {exporting ? "Exporting..." : <><Icon name="mdi:file-export-outline" className="w-4 h-4" /> Export</>}
      </button>
      <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-600 text-sm hover:bg-gray-50 transition-colors">
        <Icon name="mdi:clock-outline" className="w-4 h-4" />
        <span>Schedule</span>
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          Loading reports...
        </div>
      </div>
    );
  }

  if (!analytics || leads.length === 0) {
    return (
      <div className="h-[80vh] flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="rounded-full h-16 w-16 bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Icon name="mdi:file-document-outline" className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">No leads found</h3>
          <p className="text-sm text-gray-500 mt-1">Create leads to see analytics here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-[1600px] mx-auto px-4 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1> */}
          <p className="text-sm text-gray-500 mt-1">Track performance and make data-driven decisions</p>
        </div>
        <ExportButton />
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          className="relative overflow-hidden bg-white rounded-2xl border border-gray-100/80 shadow-sm p-4 hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer group"
          onClick={() => console.log('Navigate to all leads')}
        >
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-500/5 rounded-full group-hover:bg-blue-500/10 transition-all"></div>
          <div className="absolute -right-4 -top-4 w-14 h-14 bg-blue-500/5 rounded-full group-hover:bg-blue-500/10 transition-all"></div>
          <div className="relative flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Leads</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-all">
              <Icon name="mdi:account-multiple-outline" className="w-5 h-5" />
            </div>
          </div>
          <p className="relative text-2xl font-bold text-gray-900">{analytics.totalLeads || 0}</p>
          <p className="relative text-xs text-gray-500 font-medium mt-1">{formatKPIValue(analytics.totalLeadsAmount || 0)}</p>
        </div>

        <div
          className="relative overflow-hidden bg-white rounded-2xl border border-gray-100/80 shadow-sm p-4 hover:shadow-xl hover:border-purple-200 transition-all duration-300 cursor-pointer group"
          onClick={() => console.log('Navigate to qualified leads')}
        >
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-purple-500/5 rounded-full group-hover:bg-purple-500/10 transition-all"></div>
          <div className="absolute -right-4 -top-4 w-14 h-14 bg-purple-500/5 rounded-full group-hover:bg-purple-500/10 transition-all"></div>
          <div className="relative flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Qualified</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-all">
              <Icon name="mdi:account-check-outline" className="w-5 h-5" />
            </div>
          </div>
          <p className="relative text-2xl font-bold text-gray-900">{analytics.qualifiedLeads || 0}</p>
          <p className="relative text-xs text-gray-500 font-medium mt-1">{formatKPIValue(analytics.qualifiedLeadsAmount || 0)}</p>
        </div>

        <div
          className="relative overflow-hidden bg-white rounded-2xl border border-gray-100/80 shadow-sm p-4 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 cursor-pointer group"
          onClick={() => console.log('Navigate to won leads')}
        >
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/5 rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="absolute -right-4 -top-4 w-14 h-14 bg-emerald-500/5 rounded-full group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="relative flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Won</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-all">
              <Icon name="mdi:trophy-outline" className="w-5 h-5" />
            </div>
          </div>
          <p className="relative text-2xl font-bold text-gray-900">{analytics.wonLeads || 0}</p>
          <p className="relative text-xs text-gray-500 font-medium mt-1">{formatKPIValue(analytics.wonLeadsAmount || 0)}</p>
        </div>

        <div
          className="relative overflow-hidden bg-white rounded-2xl border border-gray-100/80 shadow-sm p-4 hover:shadow-xl hover:border-green-200 transition-all duration-300 cursor-pointer group"
          onClick={() => console.log('Navigate to revenue')}
        >
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-green-500/5 rounded-full group-hover:bg-green-500/10 transition-all"></div>
          <div className="absolute -right-4 -top-4 w-14 h-14 bg-green-500/5 rounded-full group-hover:bg-green-500/10 transition-all"></div>
          <div className="relative flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-all">
              <Icon name="mdi:cash-multiple" className="w-5 h-5" />
            </div>
          </div>
          <p className="relative text-2xl font-bold text-gray-900">{formatKPIValue(analytics.totalRevenue || 0)}</p>
          <p className="relative text-xs text-gray-500 font-medium mt-1">{analytics.totalLeads} deals</p>
        </div>

        <div
          className="relative overflow-hidden bg-white rounded-2xl border border-gray-100/80 shadow-sm p-4 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 cursor-pointer group"
          onClick={() => console.log('Navigate to conversion')}
        >
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-indigo-500/5 rounded-full group-hover:bg-indigo-500/10 transition-all"></div>
          <div className="absolute -right-4 -top-4 w-14 h-14 bg-indigo-500/5 rounded-full group-hover:bg-indigo-500/10 transition-all"></div>
          <div className="relative flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversion</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-all">
              <Icon name="mdi:chart-arc" className="w-5 h-5" />
            </div>
          </div>
          <p className="relative text-2xl font-bold text-gray-900">{(analytics.conversionRate || 0).toFixed(1)}%</p>
          <p className="relative text-xs text-gray-500 font-medium mt-1">Qualified: {(analytics.qualifiedRate || 0).toFixed(1)}%</p>
        </div>
      </div>

      {/* Main Grid: Sales Funnel | Lead Source | Monthly Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1 border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Icon name="mdi:filter" className="w-4 h-4 text-blue-600" />
            Sales Funnel
          </h3>
          <div className="space-y-2.5">
            {(analytics.funnelData || []).map((step, idx) => (
              <FunnelStep
                key={idx}
                label={step.label}
                value={step.value}
                percentage={step.percentage}
                color={step.color}
                icon={step.icon}
                change={step.change}
                onClick={() => console.log(`Navigate to ${step.label}`)}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1 border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Icon name="mdi:source-commit" className="w-4 h-4 text-blue-600" />
            Lead Source
          </h3>
          {(analytics.leadSources || []).length > 0 ? (
            <div className="space-y-3">
              {(analytics.leadSources || []).slice(0, 5).map((source, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-xs text-gray-600 flex-1">{source.name}</span>
                  <span className="text-xs font-semibold text-gray-900">{source.value}</span>
                  <span className="text-[10px] text-gray-400 w-10 text-right">
                    {analytics.totalLeads > 0 ? Math.round((source.value / analytics.totalLeads) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No lead source data available</p>
          )}
        </div>

        <div className="lg:col-span-1 border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Icon name="mdi:chart-bar" className="w-4 h-4 text-blue-600" />
            Monthly Sales
          </h3>
          {(analytics.monthlySales || []).length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatKPIValue(value)} />
                  <Bar dataKey="sales" radius={[4, 4, 0, 0]} fill="#3B82F6" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">
              No sales data available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Sales by User | Activity Report | Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Icon name="mdi:account-group" className="w-4 h-4 text-blue-600" />
            Sales by User
          </h3>
          {(analytics.salesByUser || []).length > 0 ? (
            <div className="space-y-3">
              {(analytics.salesByUser || []).slice(0, 5).map((user, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-600">{user.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-900">{user.value}</span>
                    <span className="text-[10px] text-gray-400 ml-2">({user.count || 0})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No user data available</p>
          )}
        </div>

        <div className="border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Icon name="mdi:chart-pie" className="w-4 h-4 text-blue-600" />
            Activity Report
          </h3>
          {(analytics.activityData || []).length > 0 ? (
            <div className="space-y-2.5">
              {(analytics.activityData || []).map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{activity.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${analytics.totalLeads > 0 ? Math.round((activity.value / analytics.totalLeads) * 100) : 0}%`,
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 w-8 text-right">{activity.value}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No activity data available</p>
          )}
        </div>

        <div className="border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Icon name="mdi:chart-simple" className="w-4 h-4 text-indigo-500" />
            Forecast
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Q3 Forecast</span>
              <span className="text-sm font-semibold text-gray-900">{formatKPIValue(analytics.forecast?.q3 || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Best Case</span>
              <span className="text-sm font-semibold text-green-600">{formatKPIValue(analytics.forecast?.bestCase || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-600">Commit</span>
              <span className="text-sm font-semibold text-blue-600">{formatKPIValue(analytics.forecast?.commit || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-amber-50 rounded-lg">
              <span className="text-sm text-gray-600">Win Rate</span>
              <span className="text-sm font-semibold text-amber-600">{(analytics.winLossData?.winRate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP 5 Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-200 pt-6">
        <TopList
          title="Top Customers"
          items={analytics.topCustomers || []}
          icon="mdi:account-tie"
        />
        <TopList
          title="Top Products"
          items={analytics.topProducts || []}
          icon="mdi:cube"
        />
        <TopList
          title="Region Report"
          items={analytics.regionReport || []}
          icon="mdi:earth"
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-4">
        <span><Icon name="mdi:calendar-check" className="w-3 h-3 inline" /> Data updated: {new Date().toLocaleString()}</span>
        <span><Icon name="mdi:refresh" className="w-3 h-3 inline" /> Auto-refresh every 30min</span>
      </div>
    </div>
  );
}