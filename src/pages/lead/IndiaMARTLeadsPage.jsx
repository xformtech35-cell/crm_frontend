import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useLead } from "../../hooks/useLead";
import { useLeadStatus } from "../../hooks/useMaster";
import Icon from "../../components/Icon";
import { formatDate, formatCurrency } from "../../utils/format";
import * as XLSX from "xlsx-js-style";
import ExcelJS from "exceljs";
import { Buffer } from "buffer";
window.Buffer = Buffer;

const STATUS_PILL_STYLES = {
  All: "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200",
  "New Lead": "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  Qualified: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  Working: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
  Negotiation: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
  Won: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  Closed: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
  Disqualified: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
};

const STATUS_ACTIVE_STYLES = {
  All: "bg-slate-800 text-white border-slate-800 shadow-sm font-bold",
  "New Lead": "bg-blue-600 text-white border-blue-600 shadow-sm font-bold",
  Qualified: "bg-purple-600 text-white border-purple-600 shadow-sm font-bold",
  Working: "bg-cyan-600 text-white border-cyan-600 shadow-sm font-bold",
  Negotiation: "bg-yellow-600 text-white border-yellow-600 shadow-sm font-bold",
  Won: "bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold",
  Closed: "bg-gray-800 text-white border-gray-800 shadow-sm font-bold",
  Disqualified: "bg-red-600 text-white border-red-600 shadow-sm font-bold",
};

export default function IndiaMARTLeadsPage() {
  const { getAll, updateLeadOutcomeStatus } = useLead();
  const statusMaster = useLeadStatus();
  const outletContext = useOutletContext() || {};

  const [allLeads, setAllLeads] = useState([]);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatusPill, setActiveStatusPill] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedDesc, setExpandedDesc] = useState({});
  const [toast, setToast] = useState(null);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, statusesRes] = await Promise.all([
        getAll().catch(() => []),
        statusMaster.getAll().catch(() => []),
      ]);

      const leadsList = Array.isArray(leadsRes) ? leadsRes : [];
      // Filter strictly for IndiaMART leads
      const imLeads = leadsList.filter((l) => {
        const src = (l?.leadSource || "").trim().toLowerCase();
        return src.includes("indiamart");
      });

      setAllLeads(imLeads);
      setLeadStatuses(Array.isArray(statusesRes) ? statusesRes : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Status Counts for 1-Click Filter Pills
  const statusCounts = useMemo(() => {
    const counts = {
      All: allLeads.length,
      "New Lead": 0,
      Qualified: 0,
      Working: 0,
      Negotiation: 0,
      Won: 0,
      Closed: 0,
      Disqualified: 0,
    };

    allLeads.forEach((lead) => {
      const status = lead.leadOutcomeStatus || lead.leadStatus || "New Lead";
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      } else {
        counts[status] = (counts[status] || 0) + 1;
      }
    });

    return counts;
  }, [allLeads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    let list = allLeads;

    // 1. Status Pill Filter
    if (activeStatusPill !== "All") {
      list = list.filter((l) => {
        const isDisqualified =
          l.leadStatus === "Disqualified" ||
          l.enquiryType === "Disqualified" ||
          l.leadOutcomeStatus === "Disqualified";

        if (activeStatusPill === "Qualified") {
          return !isDisqualified;
        }
        if (activeStatusPill === "Disqualified") {
          return isDisqualified;
        }
        return (
          (l.leadOutcomeStatus || l.leadStatus) === activeStatusPill ||
          l.leadStatus === activeStatusPill
        );
      });
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((l) => {
        const name = `${l.leadFirstName || ""} ${l.leadLastName || ""}`.toLowerCase();
        const contact = (l.companyContactPersonName || "").toLowerCase();
        const org = (l.leadOrganisationName || "").toLowerCase();
        const email = (l.leadEmail || "").toLowerCase();
        const mobile = (l.leadMobileNo || "").toLowerCase();
        const desc = (l.enquiryDescription || l.leadReason || "").toLowerCase();
        const city = (l.leadCity || "").toLowerCase();
        return (
          name.includes(q) ||
          contact.includes(q) ||
          org.includes(q) ||
          email.includes(q) ||
          mobile.includes(q) ||
          desc.includes(q) ||
          city.includes(q)
        );
      });
    }

    // 3. Date Filter
    if (dateFrom) {
      list = list.filter((l) => {
        const d = String(l.inquiryDate || l.leadCreatedDate || "").split("T")[0];
        return d >= dateFrom;
      });
    }
    if (dateTo) {
      list = list.filter((l) => {
        const d = String(l.inquiryDate || l.leadCreatedDate || "").split("T")[0];
        return d <= dateTo;
      });
    }

    return list;
  }, [allLeads, activeStatusPill, searchQuery, dateFrom, dateTo]);

  // Set Header Badge in layout
  useEffect(() => {
    if (outletContext.setHeaderBadge) {
      outletContext.setHeaderBadge(allLeads.length);
    }
    return () => outletContext.setHeaderBadge?.(null);
  }, [allLeads.length, outletContext]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await updateLeadOutcomeStatus(leadId, newStatus);
      setAllLeads((prev) =>
        prev.map((l) =>
          l.leadId === leadId ? { ...l, leadOutcomeStatus: newStatus } : l
        )
      );
      showToast("success", `Status updated to ${newStatus}`);
    } catch (err) {
      showToast("error", "Failed to update status");
    }
  };

  const handleExport = () => {
    const exportData = filteredLeads.map((l) => ({
      "Lead ID": l.leadId || "",
      "Buyer / Contact": l.companyContactPersonName || l.leadFirstName || "",
      Company: l.leadOrganisationName || "",
      Mobile: l.leadMobileNo || "",
      Email: l.leadEmail || "",
      City: l.leadCity || "",
      State: l.leadState || "",
      "Enquiry Date": formatDate(l.inquiryDate || l.leadCreatedDate),
      "Product / Enquiry": l.enquiryDescription || l.leadReason || "",
      Status: l.leadOutcomeStatus || l.leadStatus || "New Lead",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "IndiaMART Leads");
    XLSX.writeFile(wb, `IndiaMART_Leads_${new Date().toISOString().split("T")[0]}.xlsx`);
    showToast("success", "IndiaMART leads exported successfully");
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-lg text-white font-medium text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          <Icon name={toast.type === "error" ? "mdi:alert-circle" : "mdi:check-circle"} className="w-4 h-4" />
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-50 via-white to-amber-50/50 p-4 rounded-2xl border border-orange-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shrink-0">
            <Icon name="mdi:storefront-outline" className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">IndiaMART Leads</h1>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">
                {allLeads.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated integration inquiries pulled directly from IndiaMART marketplace API.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Icon name="mdi:refresh" className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-600" : "text-slate-500"}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors shadow-sm"
          >
            <Icon name="mdi:file-excel-outline" className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>
      </div>

      {/* 1-CLICK STATUS FILTER PILLS WITH COUNTS */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Quick Status Filter (Click to filter)
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredLeads.length}</strong> of {allLeads.length} leads
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {Object.keys(statusCounts).map((status) => {
            const isSelected = activeStatusPill === status;
            const count = statusCounts[status];
            const baseClass = STATUS_PILL_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200";
            const activeClass = STATUS_ACTIVE_STYLES[status] || "bg-slate-800 text-white border-slate-800";

            return (
              <button
                key={status}
                onClick={() => setActiveStatusPill(status)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected ? activeClass : baseClass
                }`}
              >
                <span>{status}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[11px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-white/80 text-slate-700 shadow-2xs"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH AND DATE FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Icon name="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IndiaMART buyer, company, mobile, product..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <span className="text-slate-400 text-xs">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          {(dateFrom || dateTo || searchQuery || activeStatusPill !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
                setActiveStatusPill("All");
              }}
              className="p-1.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Clear all filters"
            >
              <Icon name="mdi:close-circle" className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* LEADS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">BUYER / COMPANY</th>
                <th className="py-3 px-3">CONTACT</th>
                <th className="py-3 px-3">LOCATION</th>
                <th className="py-3 px-3">ENQUIRY DESCRIPTION</th>
                <th className="py-3 px-3">INQUIRY DATE</th>
                <th className="py-3 px-3">LEAD STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Icon name="mdi:loading" className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading IndiaMART leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Icon name="mdi:storefront-outline" className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No IndiaMART leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const buyerName =
                    lead.companyContactPersonName ||
                    `${lead.leadFirstName || ""} ${lead.leadLastName || ""}`.trim() ||
                    lead.leadOrganisationName ||
                    "IndiaMART Buyer";
                  const companyName = lead.leadOrganisationName || buyerName;
                  const isExpanded = !!expandedDesc[lead.leadId];
                  const rawDesc = lead.enquiryDescription || lead.leadReason || "-";

                  return (
                    <tr key={lead.leadId} className="hover:bg-orange-50/30 transition-colors">
                      {/* BUYER / COMPANY */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{companyName}</div>
                        {buyerName !== companyName && (
                          <div className="text-[11px] text-slate-500">{buyerName}</div>
                        )}
                      </td>

                      {/* CONTACT */}
                      <td className="py-3 px-3 space-y-0.5">
                        {lead.leadMobileNo && (
                          <div className="flex items-center gap-1 text-slate-700">
                            <Icon name="mdi:phone" className="w-3 h-3 text-slate-400" />
                            {lead.leadMobileNo}
                          </div>
                        )}
                        {lead.leadEmail && (
                          <div className="flex items-center gap-1 text-slate-500 text-[11px] truncate max-w-[150px]">
                            <Icon name="mdi:email" className="w-3 h-3 text-slate-400" />
                            {lead.leadEmail}
                          </div>
                        )}
                        {!lead.leadMobileNo && !lead.leadEmail && <span className="text-slate-300">—</span>}
                      </td>

                      {/* LOCATION */}
                      <td className="py-3 px-3 text-slate-600">
                        {lead.leadCity || lead.leadState || lead.leadCountry ? (
                          <span>
                            {[lead.leadCity, lead.leadState, lead.leadCountry].filter(Boolean).join(", ")}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* ENQUIRY DESCRIPTION */}
                      <td className="py-3 px-3 max-w-[280px]">
                        <div className="space-y-1">
                          <p className={isExpanded ? "whitespace-pre-wrap break-words text-slate-900 bg-slate-50 p-2 rounded-lg border text-xs" : "truncate text-slate-700"}>
                            {rawDesc}
                          </p>
                          {rawDesc.length > 40 && (
                            <button
                              onClick={() =>
                                setExpandedDesc((prev) => ({
                                  ...prev,
                                  [lead.leadId]: !prev[lead.leadId],
                                }))
                              }
                              className="text-[11px] font-semibold text-orange-600 hover:underline inline-flex items-center gap-0.5"
                            >
                              <Icon name={isExpanded ? "mdi:chevron-up" : "mdi:eye-outline"} className="w-3 h-3" />
                              {isExpanded ? "Show Less" : "View"}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* INQUIRY DATE */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(lead.inquiryDate || lead.leadCreatedDate) || "—"}
                      </td>

                      {/* LEAD STATUS */}
                      <td className="py-3 px-3">
                        <select
                          value={lead.leadOutcomeStatus || lead.leadStatus || "New Lead"}
                          onChange={(e) => handleStatusChange(lead.leadId, e.target.value)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                        >
                          <option value="New Lead">New Lead</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Working">Working</option>
                          <option value="Negotiation">Negotiation</option>
                          <option value="Won">Won</option>
                          <option value="Closed">Closed</option>
                          <option value="Disqualified">Disqualified</option>
                        </select>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/lead/${lead.leadId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors text-xs font-medium"
                        >
                          <Icon name="mdi:eye-outline" className="w-3.5 h-3.5" />
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
