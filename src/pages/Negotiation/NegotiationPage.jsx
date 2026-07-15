import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { useNegotiation } from "../../hooks/useNegotiation";
import { useLead } from "../../hooks/useLead";
import Icon from "../../components/Icon";
import { formatDate, formatCurrency } from "../../utils/format";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import QuotationDetailPage from "./QuotationDetailPage";
import NegotiationDetailsPage from "./NegotiationDetailPage";

export default function NegotiationPage() {
  const negotiationApi = useNegotiation();
  const leadApi = useLead();

  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Date filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Revision modal
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [revisions, setRevisions] = useState([]);

  // Lead detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState({});
  const [leadError, setLeadError] = useState("");

  // Structured Field Sections
  const GeneralFields = [
    { label: "Company/Org Name", key: "leadOrganisationName" },
    { label: "Email Address", key: "leadEmail" },
    { label: "Mobile No", key: "leadMobileNo" },
    { label: "Address", key: "leadAddress" },
    { label: "City", key: "leadCity" },
    { label: "State", key: "leadState" },
    { label: "Country", key: "leadCountry" },
  ];

  const CommercialFields = [
    { label: "Quotation Number", key: "quotationNumber" },
    { label: "Quotation Date", key: "quotationDate" },
    { label: "Quotation Amount", key: "quotationAmount" },
    { label: "Quotation Revision", key: "quotationRevision" },
    { label: "Quotation Sent Date", key: "quotationSentDate" },
    { label: "Enquiry Status", key: "enquiryStatus" },
  ];

  const SourceFields = [
    { label: "Lead Source", key: "leadSource" },
    { label: "Lead Group", key: "leadGroup" },
    { label: "Lead Industry", key: "leadIndustry" },
    { label: "Lead Ref", key: "leadRef" },
    { label: "Enquiry Description", key: "enquiryDescription" },
    { label: "Remarks", key: "followUpRemark" },
  ];

  // ─── Load negotiations ────────────────────────────────────
  useEffect(() => {
    loadDeals();
    const handleCurrencyChange = () => {
      loadDeals();
    };
    window.addEventListener('app-currency-changed', handleCurrencyChange);
    return () => window.removeEventListener('app-currency-changed', handleCurrencyChange);
  }, []);

  const loadDeals = async () => {
    try {
      setLoading(true);

      const authData = localStorage.getItem("auth-storage");
      if (!authData) {
        setDeals([]);
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(authData);
      const token = parsed?.state?.token;
      if (!token) {
        setDeals([]);
        setLoading(false);
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      const response = await negotiationApi.getByUser(userId);
      setDeals(response?.data || response || []);
    } catch (e) {
      console.error("Negotiation Error:", e);
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await negotiationApi.update(id, { negotiationStatus: status });
      setDeals(prev =>
        prev.map(deal =>
          deal.id === id
            ? { ...deal, leadOutcomeStatus: status, negotiationStatus: status }
            : deal
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this negotiation?")) {
      try {
        await negotiationApi.remove(id);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        loadDeals();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the ${selectedIds.size} selected negotiations?`)) {
      try {
        await Promise.all(Array.from(selectedIds).map(id => negotiationApi.remove(id)));
        setSelectedIds(new Set());
        loadDeals();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ─── Selection Handlers ────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredDeals = deals.filter((deal) => {
    if ((deal.leadOutcomeStatus || "").toLowerCase() !== "negotiation") {
      return false;
    }
    const term = search.toLowerCase();
    const matchesSearch = (
      String(deal.id).includes(term) ||
      deal.negotiationName?.toLowerCase().includes(term) ||
      deal.negotiationTitle?.toLowerCase().includes(term) ||
      deal.quotationNo?.toLowerCase().includes(term) ||
      deal.quotationRevision?.toLowerCase().includes(term) ||
      deal.negotiationStatus?.toLowerCase().includes(term) ||
      deal.leadOutcomeStatus?.toLowerCase().includes(term)
    );

    let matchesDate = true;
    if (deal.quotationDate) {
      const qDate = deal.quotationDate.split("T")[0];
      if (dateFrom && qDate < dateFrom) matchesDate = false;
      if (dateTo && qDate > dateTo) matchesDate = false;
    } else {
      if (dateFrom || dateTo) matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  const allPageSelected = filteredDeals.length > 0 && filteredDeals.every((deal) => selectedIds.has(deal.id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredDeals.forEach((deal) => next.delete(deal.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredDeals.forEach((deal) => next.add(deal.id));
        return next;
      });
    }
  };

  // ─── Export to Excel ────────────────────────────────────────
  const exportToExcel = async (dealsToExport, fileName = "Negotiations") => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "XFORM CRM";
      workbook.company = "XFORM CRM";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Negotiation Report", {
        pageSetup: {
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
        },
      });

      worksheet.columns = [
        { width: 8 },
        { width: 35 },
        { width: 22 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
        { width: 40 },
      ];

      worksheet.mergeCells("A1:G1");
      const title = worksheet.getCell("A1");
      title.value = "NEGOTIATION REPORT";
      title.font = {
        size: 18,
        bold: true,
        color: { argb: "FFFFFF" },
      };
      title.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      title.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1E40AF" },
      };

      worksheet.getRow(1).height = 28;

      worksheet.mergeCells("A2:G2");
      worksheet.getCell("A2").value = "Generated : " + new Date().toLocaleString();
      worksheet.getCell("A2").font = {
        italic: true,
        size: 11,
      };
      worksheet.getCell("A2").alignment = {
        horizontal: "center",
      };

      const totalAmount = dealsToExport.reduce(
        (sum, d) => sum + Number(d.quotationAmount || 0),
        0
      );

      worksheet.getCell("A3").value = "Total Negotiations";
      worksheet.getCell("B3").value = dealsToExport.length;
      worksheet.getCell("D3").value = "Total Amount";
      worksheet.getCell("E3").value = totalAmount;
      worksheet.getCell("A3").font = { bold: true };
      worksheet.getCell("D3").font = { bold: true };
      worksheet.getCell("E3").numFmt = "#,##0.00";

      const headerRow = worksheet.getRow(5);
      headerRow.values = [
        "Sr. No.",
        "Company",
        "Quotation No",
        "Revision",
        "Amount",
        "Status",
        "Remarks",
      ];

      headerRow.height = 22;

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: "FFFFFF" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "2563EB" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      let rowNumber = 6;

      dealsToExport.forEach((deal, index) => {
        const row = worksheet.getRow(rowNumber++);
        row.values = [
          index + 1,
          deal.negotiationName || deal.negotiationTitle || "",
          deal.quotationNo || "",
          deal.quotationRevision || "R0",
          Number(deal.quotationAmount || 0),
          deal.leadOutcomeStatus || deal.negotiationStatus || "",
          deal.remarks || "",
        ];

        row.height = 20;

        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin", color: { argb: "DDDDDD" } },
            bottom: { style: "thin", color: { argb: "DDDDDD" } },
            left: { style: "thin", color: { argb: "DDDDDD" } },
            right: { style: "thin", color: { argb: "DDDDDD" } },
          };
        });

        row.getCell(5).numFmt = "#,##0.00";

        if (index % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F8FAFC" },
            };
          });
        }
      });

      const totalRow = worksheet.getRow(rowNumber + 1);
      totalRow.getCell(4).value = "TOTAL";
      totalRow.getCell(5).value = totalAmount;
      totalRow.getCell(5).numFmt = "#,##0.00";

      totalRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: "FFFFFF" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "1E40AF" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };
      });

      worksheet.autoFilter = {
        from: "A5",
        to: "G5",
      };

      worksheet.views = [
        {
          state: "frozen",
          ySplit: 5,
        },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob(
        [buffer],
        {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  // ─── Revision History ──────────────────────────────────────
  const openRevisionHistory = async (deal) => {
    try {
      setSelectedDeal(deal);
      const data = await negotiationApi.getRevisions(deal.id);
      setRevisions(data || []);
      setShowRevisionModal(true);
    } catch (error) {
      console.error("Revision Error:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedLead((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditToggle = () => {
    setEditMode((prev) => {
      const next = !prev;
      if (next && selectedLead) {
        setEditedLead({ ...selectedLead });
      }
      return next;
    });
  };

  const saveLeadChanges = async () => {
    if (!selectedLead) return;

    const leadId = selectedLead.leadId ?? selectedLead.id;

    const payload = {
      ...selectedLead,
      ...editedLead,
      leadFirstName: editedLead.leadFirstName,
      leadLastName: editedLead.leadLastName,
      leadOrganisationName: editedLead.leadOrganisationName,
      leadEmail: editedLead.leadEmail,
      leadMobileNo: editedLead.leadMobileNo,
      leadPhoneNo: editedLead.leadPhoneNo,
      designation: editedLead.designation,
      leadAddress: editedLead.leadAddress,
      leadCity: editedLead.leadCity,
      leadState: editedLead.leadState,
      leadCountry: editedLead.leadCountry,
      quotationNumber: editedLead.quotationNumber,
      quotationDate: editedLead.quotationDate,
      quotationAmount: editedLead.quotationAmount,
      quotationRevision: editedLead.quotationRevision,
      quotationSentDate: editedLead.quotationSentDate,
      enquiryStatus: editedLead.enquiryStatus,
      leadSource: editedLead.leadSource,
      leadGroup: editedLead.leadGroup,
      leadIndustry: editedLead.leadIndustry,
      noOfEmployee: editedLead.noOfEmployee,
      leadRef: editedLead.leadRef,
      enquiryDescription: editedLead.enquiryDescription,
      followUpRemark: editedLead.followUpRemark,
      enquiryType: editedLead.enquiryType ?? selectedLead.enquiryType,
      leadRating: editedLead.leadRating ?? selectedLead.leadRating,
      leadStatus: editedLead.leadStatus ?? selectedLead.leadStatus,
      leadOutcomeStatus: editedLead.leadOutcomeStatus ?? selectedLead.leadOutcomeStatus,
      leadType: editedLead.leadType ?? selectedLead.leadType,
      leadReason: editedLead.leadReason ?? selectedLead.leadReason,
      inquiryDate: editedLead.inquiryDate ?? selectedLead.inquiryDate,
      companyContactPersonName:
        editedLead.companyContactPersonName ??
        selectedLead.companyContactPersonName,
      remarks: editedLead.remarks ?? selectedLead.remarks,
      userIdFk: editedLead.userIdFk ?? selectedLead.userIdFk,
    };

    try {
      await leadApi.update(leadId, payload);
      const updatedLead = await leadApi.getById(leadId);
      setSelectedLead(updatedLead);
      setEditedLead(updatedLead);
      setEditMode(false);
      loadDeals();
    } catch (err) {
      console.error(err);
      setLeadError(err.response?.data?.message || "Update failed");
    }
  };

  // ─── Render Helper ───────────────────────────────────────
  const getStatusClass = (status) => {
    switch (status) {
      case "Negotiation":
        return "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200";
      case "Open":
        return "bg-purple-50 text-purple-700 ring-1 ring-purple-200";
      case "Won":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
      case "Lost":
        return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
      case "Closed":
        return "bg-gray-100 text-gray-600 ring-1 ring-gray-200";
      default:
        return "bg-gray-100 text-gray-500 ring-1 ring-gray-200";
    }
  };

  const getRevStatusClass = (status) => {
    if (status === "Superseded") {
      return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-400 border border-gray-200/60";
    }
    if (status === "Negotiation") {
      return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100";
    }
    if (status === "Won") {
      return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100";
    }
    if (status === "Lost") {
      return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100";
    }
    return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100";
  };

  return (
    <div className="animate-fade-in flex flex-col gap-0 p-2 sm:p-4">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Quick Actions - Collapsible Premium Design */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden w-full max-w-5xl mx-auto">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50/30">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input - Compact */}
                <div className="relative flex-1 min-w-[140px] max-w-[220px]">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Icon name="mdi:magnify" className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search negotiations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center"
                    >
                      <Icon name="mdi:close-circle" className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" />
                    </button>
                  )}
                </div>

                {/* Date Range Picker - Compact */}
                <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
                  <Icon name="mdi:calendar-range" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-[10px] border-0 bg-transparent text-gray-700 focus:outline-none focus:ring-0 w-[70px] sm:w-[90px] py-0.5 font-medium"
                    placeholder="From"
                  />
                  <span className="text-gray-300 text-[10px] font-medium">—</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-[10px] border-0 bg-transparent text-gray-700 focus:outline-none focus:ring-0 w-[70px] sm:w-[90px] py-0.5 font-medium"
                    placeholder="To"
                  />
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => { setDateFrom(""); setDateTo(""); }}
                      className="ml-0.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    >
                      <Icon name="mdi:close-circle" className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Clear Button - Compact */}
                <button
                  onClick={() => {
                    setSearch("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="px-2.5 py-1.5 text-[10px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors border border-transparent hover:border-gray-200 whitespace-nowrap"
                >
                  Clear All
                </button>

                {/* Action Buttons - Compact */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => exportToExcel(filteredDeals, "Negotiations")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 transition-all shadow-sm hover:shadow whitespace-nowrap"
                  >
                    <Icon name="mdi:file-excel-outline" className="w-3.5 h-3.5" />
                    <span>Export</span>
                    {filteredDeals.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[8px] font-bold">
                        {filteredDeals.length}
                      </span>
                    )}
                  </button>

                  <Link
                    to="/lead"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 text-[10px] font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow whitespace-nowrap"
                  >
                    <Icon name="mdi:arrow-left" className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Back to Leads</span>
                    <span className="inline xs:hidden">Back</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container Card - Responsive */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[900px] sm:min-w-[1100px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">
                <th className="w-8 sm:w-10 pl-2 sm:pl-4 py-2 sm:py-2.5">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="w-[50px] sm:w-[70px] py-2 sm:py-2.5 px-2 sm:px-3 text-left">SR.NO</th>
                <th className="min-w-[150px] sm:w-[200px] py-2 sm:py-2.5 px-2 sm:px-3 text-left">
                  <span className="truncate">Leads</span>
                </th>
                <th className="min-w-[120px] sm:w-[180px] py-2 sm:py-2.5 px-2 sm:px-3 text-left">
                  <span className="truncate">Quotation No</span>
                </th>
                <th className="w-[80px] sm:w-[110px] py-2 sm:py-2.5 px-2 sm:px-3 text-left">
                  <span>Revision</span>
                </th>
                <th className="min-w-[100px] sm:w-[180px] py-2 sm:py-2.5 px-2 sm:px-3 text-left">
                  <span className="hidden sm:inline">Description</span>
                  <span className="inline sm:hidden">Desc</span>
                </th>
                <th className="w-[80px] sm:w-[120px] py-2 sm:py-2.5 px-2 sm:px-3 text-left">
                  <span>Amount</span>
                </th>
                <th className="w-[90px] sm:w-[130px] py-2 sm:py-2.5 px-2 sm:px-3 text-left">
                  <span className="hidden sm:inline">Date</span>
                  <span className="inline sm:hidden">Date</span>
                </th>
                <th className="w-[100px] sm:w-[130px] py-2 sm:py-2.5 px-2 sm:px-3 text-left">
                  <span>Status</span>
                </th>
                <th className="sticky right-0 z-20 w-[90px] sm:w-[120px] bg-gray-50 py-2 sm:py-2.5 pl-2 sm:pl-3 pr-2 sm:pr-4 text-right shadow-[-8px_0_12px_rgba(15,23,42,0.04)]">
                  <span className="hidden sm:inline">Actions</span>
                  <span className="inline sm:hidden">Act</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[10px] sm:text-xs">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-6 sm:py-8 text-gray-400">
                    <Icon name="mdi:loading" className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto mb-2" />
                    Loading negotiations...
                  </td>
                </tr>
              ) : filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-6 sm:py-8 text-gray-400">
                    No negotiations found
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal, idx) => (
                  <tr
                    key={deal.id}
                    className={`transition-colors duration-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                      } ${selectedIds.has(deal.id) ? "bg-blue-50/60" : "hover:bg-blue-50/40"}`}
                  >
                    <td className="pl-2 sm:pl-4 py-1.5 sm:py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(deal.id)}
                        onChange={() => toggleSelect(deal.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2.5 font-medium text-gray-500">{idx + 1}</td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2.5 max-w-[250px]">
                      <div
                        className="block w-[250px] overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-gray-900"
                        title={deal.negotiationName || deal.negotiationTitle || ""}
                      >
                        {deal.negotiationName || deal.negotiationTitle || (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2.5">
                      <Link
                        to={`/quotation/${deal.id}`}
                        state={{ deal }}
                        className="font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors text-[10px] sm:text-xs truncate block max-w-[100px] sm:max-w-none"
                        title={deal.quotationNo}
                      >
                        {deal.quotationNo || "-"}
                      </Link>
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2.5">
                      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap">
                        {deal.quotationRevision || "—"}
                      </span>
                    </td>
                    <td
                      className="px-2 sm:px-3 py-1.5 sm:py-2.5 text-gray-600 truncate max-w-[80px] sm:max-w-[150px]"
                      title={deal.enquiryDescription || ""}
                    >
                      {deal.enquiryDescription || "-"}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2.5 font-bold text-gray-900 text-[10px] sm:text-xs whitespace-nowrap">
                      {formatCurrency(deal.quotationAmount || 0, deal.leadCountry)}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2.5 text-gray-500 text-[10px] sm:text-xs">
                      {deal.quotationDate ? formatDate(deal.quotationDate) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={deal.leadOutcomeStatus || ""}
                        onChange={(e) => handleStatusChange(deal.id, e.target.value)}
                        className={`
                          status-select-badge
                          appearance-none
                          bg-no-repeat
                          bg-[right_0.4rem_center]
                          bg-[length:0.7rem_0.7rem]
                          pr-6 sm:pr-7
                          pl-2 sm:pl-3
                          py-0.5 sm:py-1
                          rounded-lg
                          text-[9px] sm:text-xs
                          font-semibold
                          cursor-pointer
                          border
                          border-transparent
                          focus:outline-none
                          focus:ring-2
                          focus:ring-blue-500/20
                          focus:border-blue-300
                          transition-all
                          duration-150
                          hover:shadow-sm
                          hover:opacity-90
                          w-full
                          max-w-[100px] sm:max-w-[135px]
                          bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M6%208l4%204%204-4%27%20stroke%3D%27%236b7280%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E")]
                          ${getStatusClass(deal.leadOutcomeStatus || "")}
                        `}
                      >
                        <option value="" className="bg-white text-gray-500">— None —</option>
                        <option value="Negotiation" className="bg-white text-gray-700">Negotiation</option>
                        <option value="Open" className="bg-white text-gray-700">Open</option>
                        <option value="Won" className="bg-white text-gray-700">Won</option>
                        <option value="Closed" className="bg-white text-gray-700">Closed</option>
                      </select>
                    </td>
                    <td
                      className={`sticky right-0 pl-2 sm:pl-3 pr-2 sm:pr-4 py-1.5 sm:py-2 shadow-[-8px_0_12px_rgba(15,23,42,0.04)] text-right ${selectedIds.has(deal.id)
                        ? "bg-blue-50"
                        : idx % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50"
                        }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                        <button
                          onClick={() => openRevisionHistory(deal)}
                          className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0"
                          title="Revision History"
                        >
                          <Icon name="mdi:history" className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                        </button>
                        <Link
                          to={`/negotiation/${deal.id}`}
                          className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0"
                        >
                          <Icon name="mdi:eye-outline" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(deal.id)}
                          className="p-1 sm:p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                          title="Delete Negotiation"
                        >
                          <Icon name="mdi:trash-can-outline" className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Bulk Action Bar ─── */}
      {selectedIds.size > 0 &&
        createPortal(
          <div className="bulk-action-bar fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3.5 bg-slate-900 text-white rounded-xl sm:rounded-2xl shadow-2xl shadow-slate-900/50 border border-slate-800">
            <span className="text-xs sm:text-sm font-bold">
              {selectedIds.size} selected
            </span>
            <div className="w-px h-4 bg-slate-700" />
            <button
              onClick={() => exportToExcel(deals.filter(d => selectedIds.has(d.id)), "Selected_Negotiations")}
              className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium hover:text-blue-400 transition-colors"
            >
              <Icon name="mdi:download-outline" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Export</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold hover:text-red-400 transition-colors"
            >
              <Icon name="mdi:trash-can-outline" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Delete</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-0 sm:ml-1 p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <Icon name="mdi:close" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>,
          document.body
        )}

      {/* ─── Revision Modal ────────────────────────────────── */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                    <Icon name="mdi:history" className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Revision History
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-none">
                    Detailed quotation proposal versions for <span className="font-semibold text-gray-700">{selectedDeal?.negotiationName || selectedDeal?.negotiationTitle || "N/A"}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowRevisionModal(false)}
                  className="text-gray-400 hover:text-gray-650 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Icon name="mdi:close" className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="mt-2 sm:mt-3 flex flex-wrap gap-2 items-center bg-white p-2 sm:p-3 rounded-lg border border-gray-200/60 shadow-sm text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wide text-gray-400">Quotation No.</span>
                  <span className="font-mono font-semibold text-gray-800 text-[10px] sm:text-xs">{selectedDeal?.quotationNo || 'N/A'}</span>
                </div>
                <div className="w-px h-6 bg-gray-200 mx-1 sm:mx-2" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wide text-gray-400">Current Revision</span>
                  <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 w-fit">
                    {selectedDeal?.quotationRevision || 'R0'}
                  </span>
                </div>
                <div className="w-px h-6 bg-gray-200 mx-1 sm:mx-2" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wide text-gray-400">Current Amount</span>
                  <span className="font-bold text-gray-900 text-[10px] sm:text-xs">
                    {formatCurrency(selectedDeal?.quotationAmount || 0, selectedDeal?.leadCountry)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto bg-gray-50/30 space-y-4 sm:space-y-6">
              {revisions.map((rev, idx) => {
                const prevRev = idx > 0 ? revisions[idx - 1] : null;
                const diff = prevRev ? Number(rev.quotationAmount || 0) - Number(prevRev.quotationAmount || 0) : null;
                const isLatest = idx === revisions.length - 1;

                return (
                  <div key={rev.id} className="relative flex gap-4 sm:gap-6 pl-4 pb-2 last:pb-0">
                    {idx < revisions.length - 1 && (
                      <span className="absolute left-[21px] sm:left-[25px] top-6 bottom-0 w-0.5 bg-blue-100" aria-hidden="true" />
                    )}

                    <div className="relative z-10 flex h-4 w-4 sm:h-5 sm:w-5 flex-none items-center justify-center rounded-full bg-white mt-1">
                      {isLatest ? (
                        <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                      ) : (
                        <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-gray-300 ring-4 ring-gray-150" />
                      )}
                    </div>

                    <div className={`flex-1 bg-white rounded-xl border p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 ${isLatest ? "border-blue-200 ring-1 ring-blue-50" : "border-gray-200/60"
                      }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] sm:text-xs font-bold text-gray-900">Revision {rev.revisionNo}</span>
                          {isLatest ? (
                            <span className="text-[8px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                              Active
                            </span>
                          ) : (
                            <span className="text-[8px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200/60">
                              Superseded
                            </span>
                          )}
                        </div>

                        <span className={getRevStatusClass(rev.negotiationStatus)}>
                          {rev.negotiationStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 bg-gray-50/50 p-2 sm:p-2.5 rounded-lg border border-gray-100 mb-2 text-[10px] sm:text-xs">
                        <div>
                          <span className="text-[8px] sm:text-[10px] text-gray-400 block mb-0.5 font-medium">Amount</span>
                          <div className="flex flex-wrap items-baseline gap-1">
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">
                              {formatCurrency(rev.quotationAmount || 0, selectedDeal?.leadCountry)}
                            </span>
                            {diff !== null && diff !== 0 && (
                              <span className={`inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] font-bold ${diff > 0 ? "text-emerald-600" : "text-rose-600"
                                }`}>
                                <Icon name={diff > 0 ? "mdi:arrow-up" : "mdi:arrow-down"} className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                {formatCurrency(Math.abs(diff), selectedDeal?.leadCountry)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[8px] sm:text-[10px] text-gray-400 block mb-0.5 font-medium">Date & Time</span>
                          <span className="font-semibold text-gray-700 text-[10px] sm:text-xs">
                            {new Date(rev.updatedDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })} · {new Date(rev.updatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] sm:text-xs text-gray-600 leading-relaxed bg-slate-50/20 p-2 rounded-lg border border-dashed border-gray-100">
                        <span className="font-bold text-gray-500 block text-[8px] sm:text-[9px] uppercase tracking-wider mb-0.5">Remarks</span>
                        {rev.remarks || <em className="text-gray-400">No remarks added.</em>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {revisions.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-400 bg-white border border-dashed border-gray-200 rounded-xl">
                  <Icon name="mdi:history" className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs sm:text-sm font-semibold">No revision history found</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">This lead has no previous quotation revisions recorded.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Lead Detail Modal (View/Edit) ───────────────── */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            {/* Header */}
            <div className="relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-300 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-lg sm:text-xl font-bold flex-shrink-0">
                    {((editedLead.leadFirstName?.[0] ?? editedLead.companyContactPersonName?.[0] ?? "L").toUpperCase())}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-xl font-bold text-white leading-snug truncate">
                      {editedLead.leadFirstName} {editedLead.leadLastName || ''}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-emerald-100 font-medium mt-0.5 truncate">
                      {editedLead.leadOrganisationName || 'No Company'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {!leadLoading && selectedLead && (
                    <button
                      onClick={handleEditToggle}
                      className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all border ${editMode
                        ? "bg-white/20 text-white border-white/30 hover:bg-white/30"
                        : "bg-white text-emerald-700 border-white hover:bg-emerald-50 shadow-sm"
                        }`}
                    >
                      <Icon name={editMode ? "mdi:close" : "mdi:pencil-outline"} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden xs:inline">{editMode ? "Cancel" : "Edit"}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setLeadError("");
                    }}
                    className="text-white/85 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title="Close"
                  >
                    <Icon name="mdi:close" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="pl-4 sm:pl-6 pr-2 sm:pr-4 py-4 sm:py-6 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto space-y-4 sm:space-y-6 bg-slate-50/30">
              {leadLoading ? (
                <div className="text-center py-6 sm:py-8 text-gray-400">
                  <Icon name="mdi:loading" className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mx-auto mb-2" />
                  Loading lead details...
                </div>
              ) : leadError ? (
                <div className="p-3 sm:p-4 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 flex flex-col items-center">
                  <Icon name="mdi:alert-circle-outline" className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-rose-500" />
                  <p className="font-semibold text-xs sm:text-sm">Error loading lead</p>
                  <p className="text-[10px] sm:text-xs text-rose-600/80 mt-1 mb-3">{leadError}</p>
                  <button
                    onClick={() => openLeadDetail(selectedDeal || {})}
                    className="bg-rose-100 text-rose-800 text-[10px] sm:text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-rose-200 transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : !selectedLead ? (
                <p className="text-yellow-600 text-center py-4 text-[10px] sm:text-xs font-medium">No lead linked to this negotiation.</p>
              ) : (
                <>
                  {/* General Info Section */}
                  <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-150 shadow-sm space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-blue-50 flex items-center justify-center">
                        <Icon name="mdi:account-outline" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wide">General Information</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                      {GeneralFields.map(({ label, key }) => {
                        const value = editMode ? editedLead[key] : selectedLead[key];
                        if (!editMode && (value === null || value === undefined || value === "")) return null;
                        return (
                          <div key={key} className="flex flex-col gap-0.5 sm:gap-1 p-2 sm:p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
                            <label className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              {label}
                            </label>
                            {editMode ? (
                              <input
                                type={typeof value === "number" ? "number" : "text"}
                                name={key}
                                value={value ?? ""}
                                onChange={handleInputChange}
                                className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                              />
                            ) : (
                              <p className="text-[10px] sm:text-xs font-semibold text-gray-800 break-words">{value}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commercials Section */}
                  <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-150 shadow-sm space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-50 flex items-center justify-center">
                        <Icon name="mdi:cash" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wide">Quotation & Commercials</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                      {CommercialFields.map(({ label, key }) => {
                        const value = editMode ? editedLead[key] : selectedLead[key];
                        if (!editMode && (value === null || value === undefined || value === "")) return null;
                        return (
                          <div key={key} className="flex flex-col gap-0.5 sm:gap-1 p-2 sm:p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
                            <label className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              {label}
                            </label>

                            {editMode ? (
                              key === "quotationRevision" ? (
                                <select
                                  name={key}
                                  value={value || "R0"}
                                  onChange={handleInputChange}
                                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                                >
                                  {Array.from({ length: 11 }, (_, i) => (
                                    <option key={i} value={`R${i}`}>
                                      {`R${i}`}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={
                                    key === "quotationDate" || key === "quotationSentDate"
                                      ? "date"
                                      : typeof value === "number"
                                        ? "number"
                                        : "text"
                                  }
                                  name={key}
                                  value={
                                    key === "quotationDate" || key === "quotationSentDate"
                                      ? (value ? String(value).split("T")[0] : "")
                                      : (value ?? "")
                                  }
                                  onChange={handleInputChange}
                                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                                />
                              )
                            ) : (
                              <p className="text-[10px] sm:text-xs font-semibold text-gray-800 break-words">
                                {key === "quotationAmount"
                                  ? formatCurrency(value || 0, selectedDeal?.leadCountry)
                                  : (key === "quotationDate" || key === "quotationSentDate")
                                    ? (value ? formatDate(value) : "—")
                                    : value}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Source & Segmentation Section */}
                  <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-150 shadow-sm space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-violet-50 flex items-center justify-center">
                        <Icon name="mdi:tag-multiple" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600" />
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-800 uppercase tracking-wide">Inquiry Details & Source</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                      {SourceFields.map(({ label, key }) => {
                        const value = editMode ? editedLead[key] : selectedLead[key];
                        if (!editMode && (value === null || value === undefined || value === "")) return null;
                        return (
                          <div key={key} className="flex flex-col gap-0.5 sm:gap-1 p-2 sm:p-2.5 bg-gray-50/50 rounded-lg border border-gray-100">
                            <label className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              {label}
                            </label>
                            {editMode ? (
                              key === "enquiryDescription" || key === "remarks" ? (
                                <textarea
                                  name={key}
                                  value={value ?? ""}
                                  onChange={handleInputChange}
                                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors min-h-[40px] sm:min-h-[60px]"
                                />
                              ) : (
                                <input
                                  type={typeof value === "number" ? "number" : "text"}
                                  name={key}
                                  value={value ?? ""}
                                  onChange={handleInputChange}
                                  className="w-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                                />
                              )
                            ) : (
                              <p className="text-[10px] sm:text-xs font-semibold text-gray-800 break-words leading-relaxed">{value}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {editMode && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={saveLeadChanges}
                        className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white text-[10px] sm:text-xs font-bold hover:bg-blue-700 transition-all shadow-sm hover:shadow shadow-blue-100"
                      >
                        <Icon name="mdi:content-save-check-outline" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Save Changes
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}