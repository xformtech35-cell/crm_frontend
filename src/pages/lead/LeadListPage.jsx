import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { useLead } from "../../hooks/useLead";
import { LEAD_SOURCES } from "../../utils/constants";
import { formatDate, formatCurrency } from "../../utils/format";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import LeadForm from "../../components/lead/LeadForm";
import Icon from "../../components/Icon";
import StarRating from "../../components/common/StarRating";
import * as XLSX from "xlsx-js-style";
import { useLeadSource, useLeadGroup } from "../../hooks/useMaster";
import { useDroppable } from "@dnd-kit/core";
import { Buffer } from 'buffer';
window.Buffer = Buffer;
// Add this import at the top
import {
  DndContext,
  DragOverlay,
  closestCorners,
  // KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  // defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  // horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import ExcelJS from 'exceljs'; // Replace the XLSX import

const STATUS_BG = {
  "New Lead": "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "Qualified": "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  "Disqualified": "bg-red-50 text-red-700 ring-1 ring-red-200",
  "Open": "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  "Ongoing": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "Closed": "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  "Won": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "NotContacted": "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  "Contacted": "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  "Working": "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  "Qualified Lead": "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  "QuotationSent": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "Negotiation": "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  "Converted": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "Lost": "bg-red-50 text-red-700 ring-1 ring-red-200",
  "On Hold": "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

const GROUP_COLORS = [
  "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  "bg-pink-50 text-pink-700 ring-1 ring-pink-200",
  "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
];

const getGroupColor = (groupName) => {
  if (!groupName) {
    return "bg-gray-100 text-gray-600 ring-1 ring-gray-200";
  }

  const hash = String(groupName)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return GROUP_COLORS[hash % GROUP_COLORS.length];
};
const ENQUIRY_STATUS_BG = {
  Sent: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Working: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  Pending: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  Unassigned: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  "": "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
};
const SOURCE_BG = {
  Website: "bg-sky-100 text-sky-700",
  Indiamart: "bg-orange-100 text-orange-700",
  Referral: "bg-violet-100 text-violet-700",
  "Cold Call": "bg-slate-100 text-slate-600",
  Email: "bg-blue-100 text-blue-700",
  "Social Media": "bg-pink-100 text-pink-700",
  "Trade Show": "bg-amber-100 text-amber-700",
  Advertisement: "bg-lime-100 text-lime-700",
  Other: "bg-gray-100 text-gray-500",
};
const GRADE_BG = {
  A: "bg-emerald-100 text-emerald-700 border-emerald-200",
  B: "bg-blue-100 text-blue-700 border-blue-200",
  C: "bg-amber-100 text-amber-700 border-amber-200",
  D: "bg-red-100 text-red-700 border-red-200",
};
const KANBAN_HEADER = {
  "New Lead": "border-blue-400",
  Qualified: "border-purple-400",
  Disqualified: "border-red-400",
  Open: "border-indigo-400",
  Ongoing: "border-orange-400",
  Closed: "border-gray-400",
  Won: "border-emerald-400",
};
const KANBAN_STATUSES = [
  // "New Lead",
  "Qualified",
  "Open",
  // "Ongoing",
  "Won",
  "Closed",
];
const STATUS_TABS = [
  "All",
  "New Lead",
  "Qualified",
  "Disqualified",
  "Open",
  "Ongoing",
  "Won",
  "Closed",
];


const LEAD_EXPORT_FIELDS = [
  { header: "Lead ID", value: (lead) => lead.leadId || "" },
  { header: "Company Name", value: (lead) => lead.leadOrganisationName || "" },
  { header: "Contact Phone", value: (lead) => lead.leadMobileNo || "" },
  { header: "Country", value: (lead) => lead.leadCountry || "" },
  { header: "Company Contact Person Name", value: (lead) => `${lead.companyContactPersonName || ""} ${lead.leadLastName || ""}`.trim() },
  { header: "Enquiry Date", value: (lead) => formatDate(lead.inquiryDate) || "" },
  { header: "Lead Source", value: (lead) => lead.leadSource || "" },
  { header: "Enquiry Details", value: (lead) => lead.enquiryDescription || "" },
  { header: "Enquiry Type", value: (lead) => lead.enquiryType || "" },
  { header: "Lead Status", value: (lead) => lead.leadOutcomeStatus || lead.leadStatus || "" },
  { header: "Enquiry Status", value: (lead) => lead.enquiryStatus || "" },
  { header: "Quotation Number", value: (lead) => lead.quotationNumber || "" },
  { header: "Quotation Date", value: (lead) => formatDate(lead.quotationDate) || "" },
  { header: "Quotation Revision", value: (lead) => { return lead.quotationRevision || "" } },
  { header: "Quotation Amount", value: (lead) => lead.quotationAmount ? formatCurrency(lead.quotationAmount, lead.leadCountry) : "" },
  { header: "Assigned To", value: (lead) => { console.log("Lead Object:", lead); return lead.teamMemberName || "" } },
  { header: "Follow Up Remark", value: (lead) => lead.followUpRemark || lead.leadReason || "" },
  { header: "Created Date", value: (lead) => formatDate(lead.leadCreatedDate) || "" },
  { header: "Lead Score", value: (_lead, score) => score ? `${score.score}/100` : "" },
];
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function csvCell(value) {
  if (value == null || value === "â€”") return "";
  const text = String(value).replace(/\r?\n/g, " ").trim();
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function KanbanCard({ lead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: lead.leadId,
    data: {
      type: "lead",
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-xl p-3 shadow border mb-2 cursor-grab"
    >
      <div className="font-semibold">
        {lead.leadOrganisationName}
      </div>

      <div className="text-xs text-gray-500">
        {lead.companyContactPersonName}
      </div>

      <div className="mt-2 text-green-600 font-semibold">
        {formatCurrency(lead.quotationAmount || 0, lead.leadCountry)}
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  leads,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });
  return (
    <div
      ref={setNodeRef}
      className={`
        w-80 rounded-xl p-3 min-h-[500px] transition-all duration-200
        ${isOver
          ? "bg-blue-50 border-2 border-blue-400"
          : "bg-gray-50 border border-gray-200"
        }
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-gray-800">
          {status}
        </div>

        <div className="px-2 py-1 rounded-full bg-white text-xs font-semibold text-gray-600 shadow-sm">
          {leads.length}
        </div>
      </div>


      <SortableContext
        items={leads.map((l) => l.leadId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {leads.map((lead) => (
            <KanbanCard
              key={lead.leadId}
              lead={lead}
            />
          ))}

          {leads.length === 0 && (
            <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm">
              Drop Lead Here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ============================================
// NOTES MODAL COMPONENT - Add this before your LeadListPage component
// ============================================

function NotesModal({ isOpen, onClose, lead, formatDate }) {
  if (!isOpen || !lead) return null;

  // Get notes from the lead - adjust based on your data structure
  const notes = lead.notes || lead.leadNotes || lead.comments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Icon name="mdi:note-text-outline" className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Lead Notes & Activity</h3>
              <p className="text-sm text-slate-500">
                {lead.leadFirstName} {lead.leadLastName} - {lead.leadOrganisationName || "No Company"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <Icon name="mdi:close" className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body - Notes List */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {notes && notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map((note, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-blue-100 p-1">
                        <Icon name="mdi:account-circle" className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {note.createdBy || note.author || note.userName || "System"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatDate ? formatDate(note.createdAt || note.date || note.noteDate) : note.createdAt || "Unknown date"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {note.content || note.text || note.note || note.description || note.remark || JSON.stringify(note)}
                  </p>

                  {/* Optional: Show attachment indicators */}
                  {(note.attachments && note.attachments.length > 0) && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                      <Icon name="mdi:attachment" className="h-3 w-3" />
                      <span>{note.attachments.length} attachment(s)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-slate-100 p-4 mb-3">
                <Icon name="mdi:note-off-outline" className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No notes available</p>
              <p className="text-sm text-slate-400 mt-1">Add notes from the lead detail page</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              <Icon name="mdi:information-outline" className="inline h-3 w-3 mr-1" />
              Total {notes?.length || 0} note(s)
            </div>
            <Link
              to={`/lead/${lead.leadId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              onClick={onClose}
            >
              <Icon name="mdi:arrow-right" className="h-4 w-4" />
              View Full Lead Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



export default function LeadListPage() {
  const {
    getAll,
    create,
    update,
    remove,
    getAllScores,
    exportLeads,
    updateStatus,
    updateGroup,
    updateEnquiryStatus,
    updateLeadOutcomeStatus,
    getAllNotes,
  } = useLead();

  const sourceMaster = useLeadSource();
  const groupMaster = useLeadGroup();

  const [selectedLead, setSelectedLead] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);

  const [leadSources, setLeadSources] = useState([]);
  const [leadGroups, setLeadGroups] = useState([]);

  const [activeDragLead, setActiveDragLead] = useState(null);

  // Add this inside your LeadListPage component, after the useState declarations
  const [searchParams] = useSearchParams();

  const leadFormRef = useRef(null);
  const fileInputRef = useRef(null);

  const [allLeads, setAllLeads] = useState([]);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);


  const openNotes = (lead) => {
    setSelectedLead(lead);
    setShowNotesModal(true);
  };

  const handleTableScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 15) {
      setFiltersCollapsed(true);
    } else {
      setFiltersCollapsed(false);
    }
  };

  // Add these scroll functions after handleTableScroll
  const scrollLeft = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const scrollToStart = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollToEnd = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        left: tableContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  };
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [leadsWithNotes, setLeadsWithNotes] = useState(new Set());
  const [activeStatus, setActiveStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState("leadCreatedDate");
  const [sortDir, setSortDir] = useState("desc");
  const [currentView, setCurrentView] = useState("table");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  // const [leads, setLeads] = useState([]);
  const [panelLead, setPanelLead] = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [quotationNo, setQuotationNo] = useState();
  const [editingLead, setEditingLead] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  const [showScrollControls, setShowScrollControls] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const tableContainerRef = useRef(null);

  // Import modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });

  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function showToast(type, msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  const loadAll = useCallback(async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    setLoading(true);
    try {
      const leads = await getAll();
      setAllLeads(leads ?? []);
      getAllScores()
        .then((s) => setScores(s ?? []))
        .catch(() => { });
      getAllNotes()
        .then((notes) => {
          const hasNotesSet = new Set((notes ?? []).map((n) => Number(n.leadIdFk)).filter(Boolean));
          setLeadsWithNotes(hasNotesSet);
        })
        .catch((err) => {
          console.error("Failed to load notes in LeadListPage:", err);
        });
    } finally {
      setLoading(false);
      if (isInitial) setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll(true);
  }, [loadAll]);

  useEffect(() => {
    loadMasters();
    const handleCurrencyChange = () => {
      loadAll(false);
    };
    window.addEventListener('app-currency-changed', handleCurrencyChange);
    return () => window.removeEventListener('app-currency-changed', handleCurrencyChange);
  }, []);

  // Add this useEffect to handle URL parameters
  useEffect(() => {
    const filterType = searchParams.get('filter');
    const filterValue = searchParams.get('value');

    if (filterType && filterValue) {
      if (filterType === 'status') {
        setActiveStatus(filterValue);
      } else if (filterType === 'leadOutcomeStatus') {
        // For leadOutcomeStatus, you need to filter differently
        // You can add a new state for outcome status filter
        setActiveStatus(filterValue);
      } else if (filterType === 'all') {
        setActiveStatus('All');
      }
    }
  }, [searchParams]);


  // Add this useEffect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const container = tableContainerRef.current;
      if (!container) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          container.scrollBy({ left: -100, behavior: 'smooth' });
          break;
        case 'ArrowRight':
          e.preventDefault();
          container.scrollBy({ left: 100, behavior: 'smooth' });
          break;
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault();
            container.scrollTo({ left: 0, behavior: 'smooth' });
          }
          break;
        case 'End':
          if (e.ctrlKey) {
            e.preventDefault();
            container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const loadMasters = async () => {
    try {
      const sources = await sourceMaster.getAll();
      const groups = await groupMaster.getAll();

      setLeadSources(sources);
      setLeadGroups(groups);
    } catch (err) {
      console.error(err);
    }
  };

  const scoresMap = useMemo(() => {
    const m = {};
    for (const s of scores) m[s.leadId] = s;
    return m;
  }, [scores]);

  // Add grade counts for the filter UI
  const gradeCounts = useMemo(() => {
    const counts = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };

    allLeads.forEach((lead) => {
      const rating = Number(lead.leadRating);

      if (counts.hasOwnProperty(rating)) {
        counts[rating]++;
      }
    });

    return counts;
  }, [allLeads]);

  //multiple grade filter toggle with max 2 selections
  const toggleGradeFilter = (grade) => {
    setGradeFilter((prev) => {
      if (prev.includes(grade)) {
        return prev.filter((g) => g !== grade);
      }

      // Allow only 2 selections
      if (prev.length >= 4) {
        return prev;
      }

      return [...prev, grade];
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  function handleDragStart(event) {
    const leadId = event.active.id;

    const lead = allLeads.find(
      l => l.leadId === leadId
    );

    setActiveDragLead(lead);
  }
  async function handleDragEnd(event) {
    const { active, over } = event;

    if (!over) return;

    const leadId = active.id;
    let newStatus = over.id;

    // If dropping on a card, get the column status from that card
    if (over.data?.current?.type === "lead") {
      const overLead = allLeads.find(l => l.leadId === over.id);
      newStatus = overLead?.leadOutcomeStatus;
    }

    if (!KANBAN_STATUSES.includes(newStatus)) return;

    const currentLead = allLeads.find(l => l.leadId === leadId);
    if (!currentLead || currentLead.leadOutcomeStatus === newStatus) {
      setActiveDragLead(null);
      return;
    }

    try {
      // Update lead outcome status
      await updateLeadOutcomeStatus(leadId, newStatus);

      // If moving to Qualified, also update the main lead status
      if (newStatus === "Qualified") {
        await updateStatus(leadId, "Open");
      }

      await loadAll();
      showToast("success", `Lead moved to ${newStatus}`);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to move lead");
    }

    setActiveDragLead(null);
  }

  const filtersActive = useMemo(
    () =>
      searchQuery !== "" ||
      sourceFilter !== "" ||
      gradeFilter !== "" ||
      dateFrom !== "" ||
      dateTo !== "" ||
      activeStatus !== "All",
    [searchQuery, sourceFilter, gradeFilter, dateFrom, dateTo, activeStatus],
  );

  const filteredLeads = useMemo(() => {
    let list = allLeads;

    // console.log("Filtered Leads:", list);
    if (activeStatus !== "All")
      list = list.filter((l) => l.leadStatus === activeStatus || l.leadOutcomeStatus === activeStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          `${l.leadFirstName} ${l.leadLastName ?? ""}`
            .toLowerCase()
            .includes(q) ||
          (l.leadMobileNo ?? "").includes(q) ||
          (l.leadEmail ?? "").toLowerCase().includes(q) ||
          (l.leadOrganisationName ?? "").toLowerCase().includes(q),
      );
    }
    if (sourceFilter) list = list.filter((l) => l.leadSource === sourceFilter);
    // Grade filter based on leadRating (stars)

    if (gradeFilter.length > 0) {
      list = list.filter((lead) =>
        gradeFilter.includes(String(lead.leadRating))
      );
    }
    //     if (dateFrom) {
    //   list = list.filter((l) => {
    //     if (!l.inquiryDate) return false;

    //     const enquiryDate = l.inquiryDate.split("T")[0];
    //     return enquiryDate >= dateFrom;
    //   });
    // }

    // if (dateTo) {
    //   list = list.filter((l) => {
    //     if (!l.inquiryDate) return false;

    //     const enquiryDate = l.inquiryDate.split("T")[0];
    //     return enquiryDate <= dateTo;
    //   });
    // }


    if (dateFrom) {
      list = list.filter((l) => {
        if (!l.quotationDate) return false;

        const quotationDate = l.quotationDate.split("T")[0];
        return quotationDate >= dateFrom;
      });
    }

    if (dateTo) {
      list = list.filter((l) => {
        if (!l.quotationDate) return false;

        const quotationDate = l.quotationDate.split("T")[0];
        return quotationDate <= dateTo;
      });
    }

    return [...list].sort((a, b) => {
      let va = "",
        vb = "";
      if (sortKey === "leadFirstName") {
        va = `${a.leadFirstName} ${a.leadLastName ?? ""}`.toLowerCase();
        vb = `${b.leadFirstName} ${b.leadLastName ?? ""}`.toLowerCase();
      } else if (sortKey === "leadOutcomeStatus") {
        va = a.leadOutcomeStatus;
        vb = b.leadOutcomeStatus;
      } else if (sortKey === "leadGroup") {
        va = a.leadGroup ?? "";
        vb = b.leadGroup ?? "";
      } else {
        va = a.leadCreatedDate ?? "";
        vb = b.leadCreatedDate ?? "";
      }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [
    allLeads,
    activeStatus,
    searchQuery,
    sourceFilter,
    gradeFilter,
    dateFrom,
    dateTo,
    sortKey,
    sortDir,
    scoresMap,
  ]);

  const totalCount = filteredLeads.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const { setHeaderBadge } = useOutletContext();

  useEffect(() => {
    setHeaderBadge?.(totalCount);
    return () => setHeaderBadge?.(null);
  }, [setHeaderBadge, totalCount]);

  // const pagedLeads = useMemo(() => {
  //   const start = (currentPage - 1) * pageSize;
  //   return filteredLeads.slice(start, start + pageSize);
  // }, [filteredLeads, currentPage, pageSize]);

  // useEffect(() => {
  //   setCurrentPage(1);
  //   setSelectedIds(new Set());
  // }, [
  //   searchQuery,
  //   sourceFilter,
  //   gradeFilter,
  //   dateFrom,
  //   dateTo,
  //   activeStatus,
  //   sortKey,
  //   sortDir,
  //   pageSize,
  // ]);

  const pagedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // ============================================
  // SCROLL DETECTION - PASTE IT HERE
  // ============================================
  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      const handleScroll = () => {
        const progress = (container.scrollLeft / (container.scrollWidth - container.clientWidth)) * 100;
        setScrollProgress(progress);
        setShowScrollControls(container.scrollWidth > container.clientWidth);
      };
      container.addEventListener('scroll', handleScroll);
      setTimeout(handleScroll, 100);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [pagedLeads]); // Now pagedLeads is defined!

  // ============================================
  // KEYBOARD SHORTCUTS - Keep this here or move it too
  // ============================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const container = tableContainerRef.current;
      if (!container) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          container.scrollBy({ left: -100, behavior: 'smooth' });
          break;
        case 'ArrowRight':
          e.preventDefault();
          container.scrollBy({ left: 100, behavior: 'smooth' });
          break;
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault();
            container.scrollTo({ left: 0, behavior: 'smooth' });
          }
          break;
        case 'End':
          if (e.ctrlKey) {
            e.preventDefault();
            container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [
    searchQuery,
    sourceFilter,
    gradeFilter,
    dateFrom,
    dateTo,
    activeStatus,
    sortKey,
    sortDir,
    pageSize,
  ]);
  const kanbanColumns = useMemo(
    () =>
      KANBAN_STATUSES.map((s) => ({
        status: s,
        leads: filteredLeads.filter((l) => {
          if (s === "Qualified") {
            return l.leadStatus === "Qualified";
          }

          return (
            l.leadStatus === "Qualified" &&
            l.leadOutcomeStatus === s
          );
        }),
      })),
    [filteredLeads]
  );

  const allPageSelected = useMemo(
    () =>
      pagedLeads.length > 0 &&
      pagedLeads.every((l) => selectedIds.has(l.leadId)),
    [pagedLeads, selectedIds],
  );

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const n = new Set(prev);
        pagedLeads.forEach((l) => n.delete(l.leadId));
        return n;
      });
    } else {
      setSelectedIds((prev) => {
        const n = new Set(prev);
        pagedLeads.forEach((l) => n.add(l.leadId));
        return n;
      });
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setSourceFilter("");
    setGradeFilter("");
    setDateFrom("");
    setDateTo("");
    setActiveStatus("All");
    setSortKey("leadCreatedDate");
    setSortDir("desc");
  }

  // chart
  // const exportToExcel = async (leadsToExport, fileName = "Leads") => {
  //   try {
  //     const totalQuotationAmount = leadsToExport.reduce(
  //       (sum, lead) => sum + Number(lead.quotationAmount || 0),
  //       0
  //     );

  //     // 1. Prepare data rows (identical to original)
  //     const data = leadsToExport.map((lead) => ({
  //       "Lead ID": lead.leadId || "",
  //       "Ref": lead.leadRef || "",
  //       "Company Name": lead.leadOrganisationName || "",
  //       "Contact Phone": lead.leadMobileNo || "",
  //       "Contact Person": lead.companyContactPersonName || "",
  //       "Enquiry Date": formatDate(lead.inquiryDate) || "",
  //       "Lead Source": lead.leadSource || "",
  //       "Lead Status": lead.leadOutcomeStatus || lead.leadStatus || "",
  //       "Enquiry Status": lead.enquiryStatus || "",
  //       "Quotation Number": lead.quotationNumber || "",
  //       "Quotation Amount": lead.quotationAmount || "",
  //       "Lead Rating":
  //         lead.quotationStatus === "Sent" || lead.leadOutcomeStatus === "Won"
  //           ? ""
  //           : lead.leadRating
  //           ? "*".repeat(lead.leadRating)
  //           : "",
  //     }));

  //     // Add total row
  //     data.push({
  //       "Lead ID": "",
  //       "Ref": "",
  //       "Company Name": "TOTAL",
  //       "Contact Phone": "",
  //       "Contact Person": "",
  //       "Enquiry Date": "",
  //       "Lead Source": "",
  //       "Lead Status": "",
  //       "Enquiry Status": "",
  //       "Quotation Number": "",
  //       "Quotation Amount": totalQuotationAmount,
  //       "Lead Rating": "",
  //     });

  //     // 2. Generate doughnut chart as an image from lead status counts
  //     const statusCounts = {};
  //     leadsToExport.forEach((lead) => {
  //       const status = lead.leadOutcomeStatus || lead.leadStatus || "Unknown";
  //       statusCounts[status] = (statusCounts[status] || 0) + 1;
  //     });

  //     // Create canvas and draw doughnut chart
  //     const canvas = document.createElement("canvas");
  //     canvas.width = 600;
  //     canvas.height = 400;
  //     const ctx = canvas.getContext("2d");

  //     const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#00A86B"];
  //     const centerX = canvas.width / 2;
  //     const centerY = canvas.height / 2;
  //     const radius = 120;
  //     const innerRadius = 70;
  //     let startAngle = -Math.PI / 2;
  //     const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  //     // Clear canvas
  //     ctx.clearRect(0, 0, canvas.width, canvas.height);

  //     // Draw white background
  //     ctx.fillStyle = "#FFFFFF";
  //     ctx.fillRect(0, 0, canvas.width, canvas.height);

  //     // Draw doughnut segments
  //     let legendY = 30;
  //     const legendX = canvas.width - 130;

  //     Object.entries(statusCounts).forEach(([label, count], idx) => {
  //       const angle = (count / total) * Math.PI * 2;
  //       const endAngle = startAngle + angle;

  //       ctx.beginPath();
  //       ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  //       ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
  //       ctx.closePath();
  //       ctx.fillStyle = colors[idx % colors.length];
  //       ctx.fill();

  //       // Draw legend
  //       ctx.fillStyle = colors[idx % colors.length];
  //       ctx.fillRect(legendX, legendY, 15, 15);
  //       ctx.fillStyle = "#000000";
  //       ctx.font = "12px Arial";
  //       const percentage = ((count / total) * 100).toFixed(1);
  //       ctx.fillText(`${label}: ${count} (${percentage}%)`, legendX + 20, legendY + 12);
  //       legendY += 22;

  //       startAngle = endAngle;
  //     });

  //     // Draw title
  //     ctx.fillStyle = "#000000";
  //     ctx.font = "bold 16px Arial";
  //     ctx.textAlign = "center";
  //     ctx.fillText("Lead Status Distribution", centerX, 30);

  //     // Draw center text (optional)
  //     ctx.font = "14px Arial";
  //     ctx.fillStyle = "#666666";
  //     ctx.fillText(`Total: ${total} leads`, centerX, centerY + 5);

  //     // Convert canvas to blob
  //     const chartImageBlob = await new Promise((resolve) => {
  //       canvas.toBlob(resolve, "image/png");
  //     });

  //     // 3. Create workbook with ExcelJS (proper import needed)
  //     const workbook = new ExcelJS.Workbook();
  //     const worksheet = workbook.addWorksheet("Leads");

  //     // Add headers
  //     const headers = Object.keys(data[0]);
  //     const headerRow = worksheet.addRow(headers);

  //     // Style headers
  //     headerRow.eachCell((cell, colNumber) => {
  //       cell.font = { bold: true, size: 12, color: { argb: "FF000000" } };
  //       cell.fill = {
  //         type: "pattern",
  //         pattern: "solid",
  //         fgColor: { argb: "FFE8B384" }
  //       };
  //       cell.alignment = { 
  //         horizontal: "center", 
  //         vertical: "center", 
  //         wrapText: true 
  //       };
  //       cell.border = {
  //         top: { style: "thin" },
  //         bottom: { style: "thin" },
  //         left: { style: "thin" },
  //         right: { style: "thin" }
  //       };
  //     });

  //     // Add data rows with status-based colors
  //     const rowsData = data.slice(0, -1);
  //     rowsData.forEach((row) => {
  //       const rowValues = headers.map((h) => row[h]);
  //       const addedRow = worksheet.addRow(rowValues);

  //       let fillColor = "FFFFFFFF";
  //       switch (row["Lead Status"]) {
  //         case "Open":
  //           fillColor = "FFFFFF00"; // Yellow
  //           break;
  //         case "Won":
  //         case "Converted":
  //           fillColor = "FF70AD47"; // Green
  //           break;
  //         case "Closed":
  //           fillColor = "FFEAD9C4"; // Cream
  //           break;
  //         default:
  //           fillColor = "FFFFFFFF"; // White
  //       }

  //       addedRow.eachCell((cell) => {
  //         cell.fill = {
  //           type: "pattern",
  //           pattern: "solid",
  //           fgColor: { argb: fillColor }
  //         };
  //         cell.alignment = { horizontal: "center", vertical: "center" };
  //         cell.font = { color: { argb: "FF000000" } };
  //       });
  //     });

  //     // Add total row
  //     const totalValues = headers.map((h) => data[data.length - 1][h]);
  //     const totalRowExcel = worksheet.addRow(totalValues);
  //     totalRowExcel.eachCell((cell) => {
  //       cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  //       cell.fill = {
  //         type: "pattern",
  //         pattern: "solid",
  //         fgColor: { argb: "FF4472C4" }
  //       };
  //       cell.alignment = { horizontal: "center", vertical: "center" };
  //       cell.border = {
  //         top: { style: "thin" },
  //         bottom: { style: "thin" },
  //         left: { style: "thin" },
  //         right: { style: "thin" }
  //       };
  //     });

  //     // Add merged title
  //     worksheet.mergeCells(1, 1, 1, headers.length);
  //     const titleCell = worksheet.getCell("A1");
  //     titleCell.value = "Enquiry Sheet 2026-27";
  //     titleCell.font = { bold: true, size: 18, color: { argb: "FF000000" } };
  //     titleCell.fill = {
  //       type: "pattern",
  //       pattern: "solid",
  //       fgColor: { argb: "FF00FF00" }
  //     };
  //     titleCell.alignment = { horizontal: "center", vertical: "center" };

  //     // Set row heights
  //     worksheet.getRow(1).height = 32;
  //     worksheet.getRow(2).height = 28;

  //     // Auto column widths
  //     worksheet.columns.forEach((col, idx) => {
  //       let maxLength = headers[idx].length;
  //       data.forEach((row) => {
  //         const val = row[headers[idx]] || "";
  //         maxLength = Math.max(maxLength, val.toString().length);
  //       });
  //       col.width = Math.min(maxLength + 5, 40);
  //     });

  //     // Add autofilter
  //     worksheet.autoFilter = {
  //       from: "A2",
  //       to: `${String.fromCharCode(64 + headers.length)}${rowsData.length + 2}`
  //     };

  //     // Add chart image sheet
  //     const imageSheet = workbook.addWorksheet("Lead Status Chart");

  //     // Add the image
  //     const imageId = workbook.addImage({
  //       buffer: chartImageBlob,
  //       extension: "png",
  //     });

  //     imageSheet.addImage(imageId, {
  //       tl: { col: 1, row: 1 },
  //       ext: { width: 600, height: 400 },
  //     });

  //     // Add some context text
  //     imageSheet.getCell("A1").value = "Lead Status Distribution Chart";
  //     imageSheet.getCell("A1").font = { bold: true, size: 14 };

  //     // Write file
  //     const fileDate = new Date().toISOString().split("T")[0];
  //     const buffer = await workbook.xlsx.writeBuffer();

  //     // Create blob and download
  //     const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  //     const link = document.createElement("a");
  //     const url = URL.createObjectURL(blob);
  //     link.href = url;
  //     link.download = `${fileName}_${fileDate}.xlsx`;
  //     link.click();
  //     URL.revokeObjectURL(url);

  //     showToast("success", `${leadsToExport.length} leads exported successfully with doughnut chart image`);
  //   } catch (err) {
  //     console.error("Export error:", err);
  //     showToast("error", `Export failed: ${err.message}`);
  //   }
  // };


  // const exportToExcel = (leadsToExport, fileName = "Leads") => {
  //   try {

  //     const totalQuotationAmount = leadsToExport.reduce(
  //       (sum, lead) => sum + Number(lead.quotationAmount || 0),
  //       0
  //     );

  //     const data = leadsToExport.map((lead) => {
  //       const score = scoresMap[lead.leadId];

  //       return {
  //         "Lead ID": lead.leadId || "",
  //         "Ref": lead.leadRef || "",
  //         "Company Name": lead.leadOrganisationName || "",
  //         "Contact Phone": lead.leadMobileNo || "",
  //         "Contact Person": lead.companyContactPersonName || "",
  //         "Enquiry Date": formatDate(lead.inquiryDate) || "",
  //         "Lead Source": lead.leadSource || "",
  //         "Lead Status": lead.leadOutcomeStatus || lead.leadStatus || "",
  //         "Enquiry Status": lead.enquiryStatus || "",
  //         "Quotation Number": lead.quotationNumber || "",
  //         "Quotation Amount": lead.quotationAmount || "",
  //         "Lead Rating":
  //           lead.quotationStatus === "Sent" ||
  //             lead.leadOutcomeStatus === "Won"
  //             ? ""
  //             : lead.leadRating
  //               ? "*".repeat(lead.leadRating)
  //               : "",
  //         // "Lead Score": score?.score || "",
  //       };
  //     });
  //     data.push({
  //       "Lead ID": "",
  //       "Ref": "",
  //       "Company Name": "TOTAL",
  //       "Contact Phone": "",
  //       "Contact Person": "",
  //       "Enquiry Date": "",
  //       "Lead Source": "",
  //       "Lead Status": "",
  //       "Enquiry Status": "",
  //       "Quotation Number": "",
  //       "Quotation Amount": totalQuotationAmount,
  //       "Lead Rating": "",
  //     });

  //     const worksheet = XLSX.utils.json_to_sheet(data, {
  //       origin: "A2",
  //     });
  //     const totalColumns = Object.keys(data[0]).length;

  //     worksheet["A1"] = {
  //       v: "Enquiry Sheet 2026-27",
  //       t: "s",
  //       s: {
  //         font: {
  //           bold: true,
  //           sz: 18,
  //           color: { rgb: "000000" }
  //         },
  //         alignment: {
  //           horizontal: "center",
  //           vertical: "center"
  //         },
  //         fill: {
  //           patternType: "solid",
  //           fgColor: { rgb: "00FF00" }
  //         }
  //       }
  //     };

  //     worksheet["!merges"] = [
  //       {
  //         s: { r: 0, c: 0 },
  //         e: { r: 0, c: totalColumns - 1 }
  //       }
  //     ];
  //     // ============================================
  //     // HEADER STYLE
  //     // ============================================
  //     const range = XLSX.utils.decode_range(worksheet["!ref"]);

  //     for (let col = 0; col < totalColumns; col++) {
  //       const cellAddress = XLSX.utils.encode_cell({
  //         r: 1,
  //         c: col,
  //       });

  //       if (worksheet[cellAddress]) {
  //         worksheet[cellAddress].s = {
  //           font: {
  //             bold: true,
  //             sz: 12,
  //             color: { rgb: "000000" }
  //           },
  //           fill: {
  //             patternType: "solid",
  //             fgColor: { rgb: "E8B384" }
  //           },
  //           alignment: {
  //             horizontal: "center",
  //             vertical: "center",
  //             wrapText: true
  //           },
  //           border: {
  //             top: { style: "thin" },
  //             bottom: { style: "thin" },
  //             left: { style: "thin" },
  //             right: { style: "thin" }
  //           }
  //         };
  //       }
  //     }

  //     // ============================================
  //     // ROW COLORS BASED ON STATUS
  //     // ============================================
  //     data.forEach((row, rowIndex) => {
  //       let fillColor = null;

  //       switch (row["Lead Status"]) {
  //         case "Open":
  //           fillColor = "FFFF00"; // Yellow
  //           break;

  //         case "Won":
  //         case "Converted":
  //           fillColor = "70AD47"; // Green
  //           break;

  //         case "Closed":
  //           fillColor = "EAD9C4"; // Cream
  //           break;

  //         default:
  //           fillColor = "FFFFFF";
  //       }
  //       // ============================================
  //       // TOTAL ROW STYLE
  //       // ============================================

  //       const totalRowIndex = data.length + 1;

  //       Object.keys(data[0]).forEach((_, colIndex) => {
  //         const cellRef = XLSX.utils.encode_cell({
  //           r: totalRowIndex,
  //           c: colIndex,
  //         });

  //         if (worksheet[cellRef]) {
  //           worksheet[cellRef].s = {
  //             font: {
  //               bold: true,
  //               sz: 12,
  //               color: { rgb: "FFFFFF" },
  //             },
  //             fill: {
  //               patternType: "solid",
  //               fgColor: { rgb: "4472C4" }, // Blue
  //             },
  //             alignment: {
  //               horizontal: "center",
  //               vertical: "center",
  //             },
  //             border: {
  //               top: { style: "thin" },
  //               bottom: { style: "thin" },
  //               left: { style: "thin" },
  //               right: { style: "thin" },
  //             },
  //           };
  //         }
  //       });

  //       if (fillColor) {
  //         Object.keys(row).forEach((_, colIndex) => {
  //           const cellRef = XLSX.utils.encode_cell({
  //             r: rowIndex + 2,
  //             c: colIndex,
  //           });

  //           if (worksheet[cellRef]) {
  //             worksheet[cellRef].s = {
  //               font: {
  //                 color: { rgb: "000000" },
  //               },
  //               fill: {
  //                 patternType: "solid",
  //                 fgColor: {
  //                   rgb: fillColor,
  //                 },
  //               },
  //               alignment: {
  //                 horizontal: "center",
  //                 vertical: "center",
  //               },
  //             };
  //           }
  //         });
  //       }
  //     });
  //     worksheet["!rows"] = [
  //       { hpt: 32 },
  //       { hpt: 28 }
  //     ];

  //     // ============================================
  //     // AUTO COLUMN WIDTH
  //     // ============================================
  //     const colWidths = [];

  //     data.forEach((row) => {
  //       Object.keys(row).forEach((key, index) => {
  //         const value =
  //           row[key] !== null &&
  //             row[key] !== undefined
  //             ? row[key].toString()
  //             : "";

  //         colWidths[index] = Math.max(
  //           colWidths[index] || key.length,
  //           value.length,
  //           key.length
  //         );
  //       });
  //     });

  //     worksheet["!cols"] = colWidths.map((width) => ({
  //       wch: Math.min(width + 5, 40),
  //     }));

  //     // ============================================
  //     // FILTERS
  //     // ============================================
  //     worksheet["!autofilter"] = {
  //       ref: worksheet["!ref"],
  //     };

  //     // ============================================
  //     // WORKBOOK
  //     // ============================================
  //     const workbook = XLSX.utils.book_new();

  //     XLSX.utils.book_append_sheet(
  //       workbook,
  //       worksheet,
  //       "Leads"
  //     );

  //     XLSX.writeFile(
  //       workbook,
  //       `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`
  //     );

  //     showToast(
  //       "success",
  //       `${data.length} leads exported successfully`
  //     );
  //   } catch (err) {
  //     console.error(err);
  //     showToast("error", "Export failed");
  //   }
  // };
  const exportToExcel = async (leadsToExport, fileName = "Leads") => {
    try {
      const totalQuotationAmount = leadsToExport.reduce(
        (sum, lead) => sum + Number(lead.quotationAmount || 0),
        0
      );

      // Prepare data rows (identical to original)
      const data = leadsToExport.map((lead) => ({
        "Lead ID": lead.leadId || "",
        "Ref": lead.leadRef || "",
        "Company Name": lead.leadOrganisationName || "",
        "Contact Phone": lead.leadMobileNo || "",
        "Country": lead.leadCountry || "",
        "Contact Person": lead.companyContactPersonName || "",
        "Enquiry Date": formatDate(lead.inquiryDate) || "",
        "Lead Source": lead.leadSource || "",
        "Lead Group": lead.leadGroup || "",
        "Lead Status": lead.leadOutcomeStatus || "",
        "Enquiry Status": lead.enquiryStatus || "",
        "Enquiry Type": lead.enquiryType || "",
        "Enquiry Description": lead.enquiryDescription || "",
        "Quotation Number": lead.quotationNumber || "",
        "Quotation Amount": lead.quotationAmount ? formatCurrency(lead.quotationAmount, lead.leadCountry) : "",
        "Lead Rating":
          lead.quotationStatus === "Sent" ||
            lead.leadOutcomeStatus === "Won"
            ? ""
            : lead.leadRating
              ? "*".repeat(lead.leadRating)
              : "",
      }));

      // Add total row
      data.push({
        "Lead ID": "",
        "Ref": "",
        "Company Name": "TOTAL",
        "Contact Phone": "",
        "Country": "",
        "Contact Person": "",
        "Enquiry Date": "",
        "Lead Source": "",
        "Lead Group": "",
        "Lead Status": "",
        "Enquiry Status": "",
        "Enquiry Type": "",
        "Enquiry Description": "",
        "Quotation Number": "",
        "Quotation Amount": formatCurrency(totalQuotationAmount),
        "Lead Rating": "",
      });

      // Generate doughnut chart and polar chart as images
      const statusCounts = {};
      leadsToExport.forEach((lead) => {
        const status = lead.leadOutcomeStatus || lead.leadStatus || "Unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const sourceCounts = {};
      leadsToExport.forEach((lead) => {
        const source = lead.leadSource || "Unknown";
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      // Create canvas and draw DOUGHNUT chart
      const doughnutCanvas = document.createElement("canvas");
      doughnutCanvas.width = 600;
      doughnutCanvas.height = 400;
      const doughnutCtx = doughnutCanvas.getContext("2d");

      const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#00A86B"];
      const centerX = doughnutCanvas.width / 2;
      const centerY = doughnutCanvas.height / 2;
      const radius = 120;
      const innerRadius = 70;
      let startAngle = -Math.PI / 2;
      const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

      doughnutCtx.clearRect(0, 0, doughnutCanvas.width, doughnutCanvas.height);
      doughnutCtx.fillStyle = "#FFFFFF";
      doughnutCtx.fillRect(0, 0, doughnutCanvas.width, doughnutCanvas.height);

      let legendY = 30;
      const legendX = doughnutCanvas.width - 130;

      Object.entries(statusCounts).forEach(([label, count], idx) => {
        const angle = (count / total) * Math.PI * 2;
        const endAngle = startAngle + angle;

        doughnutCtx.beginPath();
        doughnutCtx.arc(centerX, centerY, radius, startAngle, endAngle);
        doughnutCtx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        doughnutCtx.closePath();
        doughnutCtx.fillStyle = colors[idx % colors.length];
        doughnutCtx.fill();

        doughnutCtx.fillStyle = colors[idx % colors.length];
        doughnutCtx.fillRect(legendX, legendY, 15, 15);
        doughnutCtx.fillStyle = "#000000";
        doughnutCtx.font = "12px Arial";
        const percentage = ((count / total) * 100).toFixed(1);
        doughnutCtx.fillText(`${label}: ${count} (${percentage}%)`, legendX + 20, legendY + 12);
        legendY += 22;

        startAngle = endAngle;
      });

      doughnutCtx.fillStyle = "#000000";
      doughnutCtx.font = "bold 16px Arial";
      doughnutCtx.textAlign = "center";
      doughnutCtx.fillText("Lead Status Distribution", centerX, 30);
      doughnutCtx.font = "14px Arial";
      doughnutCtx.fillStyle = "#666666";
      doughnutCtx.fillText(`Total: ${total} leads`, centerX, centerY + 5);

      // Create canvas and draw POLAR chart
      const polarCanvas = document.createElement("canvas");
      polarCanvas.width = 600;
      polarCanvas.height = 400;
      const polarCtx = polarCanvas.getContext("2d");

      polarCtx.clearRect(0, 0, polarCanvas.width, polarCanvas.height);
      polarCtx.fillStyle = "#FFFFFF";
      polarCtx.fillRect(0, 0, polarCanvas.width, polarCanvas.height);

      const polarCenterX = polarCanvas.width / 2;
      const polarCenterY = polarCanvas.height / 2;
      const polarRadius = 150;
      let polarStartAngle = 0;
      const polarTotal = Object.values(sourceCounts).reduce((a, b) => a + b, 0);
      let polarLegendY = 30;
      const polarLegendX = polarCanvas.width - 130;

      Object.entries(sourceCounts).forEach(([label, count], idx) => {
        const angle = (count / polarTotal) * Math.PI * 2;
        const endAngle = polarStartAngle + angle;

        polarCtx.beginPath();
        polarCtx.moveTo(polarCenterX, polarCenterY);
        polarCtx.arc(polarCenterX, polarCenterY, polarRadius, polarStartAngle, endAngle);
        polarCtx.closePath();
        polarCtx.fillStyle = colors[idx % colors.length];
        polarCtx.fill();

        // Draw legend
        polarCtx.fillStyle = colors[idx % colors.length];
        polarCtx.fillRect(polarLegendX, polarLegendY, 15, 15);
        polarCtx.fillStyle = "#000000";
        polarCtx.font = "12px Arial";
        const percentage = ((count / polarTotal) * 100).toFixed(1);
        polarCtx.fillText(`${label}: ${count} (${percentage}%)`, polarLegendX + 20, polarLegendY + 12);
        polarLegendY += 22;

        polarStartAngle = endAngle;
      });

      polarCtx.fillStyle = "#000000";
      polarCtx.font = "bold 16px Arial";
      polarCtx.textAlign = "center";
      polarCtx.fillText("Lead Source Distribution", polarCenterX, 30);
      polarCtx.font = "14px Arial";
      polarCtx.fillStyle = "#666666";
      polarCtx.fillText(`Total: ${polarTotal} leads`, polarCenterX, polarCenterY + polarRadius + 20);

      // Create canvas and draw BAR CHART
      const barCanvas = document.createElement("canvas");
      barCanvas.width = 700;
      barCanvas.height = 500;
      const barCtx = barCanvas.getContext("2d");

      barCtx.clearRect(0, 0, barCanvas.width, barCanvas.height);
      barCtx.fillStyle = "#FFFFFF";
      barCtx.fillRect(0, 0, barCanvas.width, barCanvas.height);

      const barCategories = Object.keys(sourceCounts);
      const barValues = Object.values(sourceCounts);
      const barColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#00A86B", "#FF8C42", "#6A4E9B"];

      // Chart dimensions
      const margin = { top: 60, right: 150, bottom: 80, left: 80 };
      const chartWidth = barCanvas.width - margin.left - margin.right;
      const chartHeight = barCanvas.height - margin.top - margin.bottom;
      const barWidth = chartWidth / barCategories.length - 10;
      const maxBarValue = Math.max(...barValues);

      // Draw title
      barCtx.fillStyle = "#000000";
      barCtx.font = "bold 18px Arial";
      barCtx.textAlign = "center";
      barCtx.fillText("Lead Source Distribution - Bar Chart", barCanvas.width / 2, 30);

      // Draw axes
      barCtx.beginPath();
      barCtx.moveTo(margin.left, margin.top);
      barCtx.lineTo(margin.left, barCanvas.height - margin.bottom);
      barCtx.lineTo(barCanvas.width - margin.right, barCanvas.height - margin.bottom);
      barCtx.strokeStyle = "#333333";
      barCtx.lineWidth = 2;
      barCtx.stroke();

      // Draw Y-axis labels and grid lines
      const ySteps = 5;
      for (let i = 0; i <= ySteps; i++) {
        const yValue = (maxBarValue / ySteps) * i;
        const y = barCanvas.height - margin.bottom - (i / ySteps) * chartHeight;

        barCtx.beginPath();
        barCtx.moveTo(margin.left - 5, y);
        barCtx.lineTo(margin.left, y);
        barCtx.stroke();

        barCtx.fillStyle = "#666666";
        barCtx.font = "11px Arial";
        barCtx.textAlign = "right";
        barCtx.fillText(Math.round(yValue), margin.left - 10, y + 3);

        // Grid line
        barCtx.beginPath();
        barCtx.moveTo(margin.left, y);
        barCtx.lineTo(barCanvas.width - margin.right, y);
        barCtx.strokeStyle = "#E0E0E0";
        barCtx.lineWidth = 1;
        barCtx.stroke();
      }

      // Draw X-axis labels and bars
      barCtx.fillStyle = "#333333";
      barCtx.font = "11px Arial";
      barCtx.textAlign = "center";

      barCategories.forEach((category, idx) => {
        const x = margin.left + idx * (barWidth + 10) + barWidth / 2;
        const barHeight = (barValues[idx] / maxBarValue) * chartHeight;
        const y = barCanvas.height - margin.bottom - barHeight;

        // Draw bar
        barCtx.fillStyle = barColors[idx % barColors.length];
        barCtx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

        // Draw bar value on top
        barCtx.fillStyle = "#000000";
        barCtx.font = "bold 11px Arial";
        barCtx.fillText(barValues[idx], x, y - 5);

        // Draw category label (with rotation if too long)
        let label = category;
        if (label.length > 15) label = label.substring(0, 12) + "...";
        barCtx.fillStyle = "#333333";
        barCtx.font = "10px Arial";
        barCtx.save();
        barCtx.translate(x, barCanvas.height - margin.bottom + 15);
        barCtx.rotate(-0.3);
        barCtx.fillText(label, 0, 0);
        barCtx.restore();
      });

      // Draw Y-axis title
      barCtx.save();
      barCtx.translate(25, barCanvas.height / 2);
      barCtx.rotate(-Math.PI / 2);
      barCtx.fillStyle = "#333333";
      barCtx.font = "bold 12px Arial";
      barCtx.textAlign = "center";
      barCtx.fillText("Number of Leads", 0, 0);
      barCtx.restore();

      // Draw X-axis title
      barCtx.fillStyle = "#333333";
      barCtx.font = "bold 12px Arial";
      barCtx.textAlign = "center";
      barCtx.fillText("Lead Sources", barCanvas.width / 2, barCanvas.height - 25);

      // Draw legend
      let legendYPos = 70;
      const legendXPos = barCanvas.width - 130;
      barCategories.forEach((category, idx) => {
        const percentage = ((barValues[idx] / polarTotal) * 100).toFixed(1);
        barCtx.fillStyle = barColors[idx % barColors.length];
        barCtx.fillRect(legendXPos, legendYPos, 12, 12);
        barCtx.fillStyle = "#000000";
        barCtx.font = "9px Arial";
        barCtx.textAlign = "left";
        let label = category;
        if (label.length > 14) label = label.substring(0, 12) + "..";
        barCtx.fillText(`${label}: ${barValues[idx]} (${percentage}%)`, legendXPos + 18, legendYPos + 10);
        legendYPos += 18;
      });

      // Convert canvases to buffers
      const doughnutImageBuffer = await new Promise((resolve) => {
        doughnutCanvas.toBlob(async (blob) => {
          const arrayBuffer = await blob.arrayBuffer();
          resolve(Buffer.from(arrayBuffer));
        });
      });

      const polarImageBuffer = await new Promise((resolve) => {
        polarCanvas.toBlob(async (blob) => {
          const arrayBuffer = await blob.arrayBuffer();
          resolve(Buffer.from(arrayBuffer));
        });
      });

      const barImageBuffer = await new Promise((resolve) => {
        barCanvas.toBlob(async (blob) => {
          const arrayBuffer = await blob.arrayBuffer();
          resolve(Buffer.from(arrayBuffer));
        });
      });

      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Leads");

      // Define headers (exactly as original)
      const headers = [
        "Lead ID", "Ref", "Company Name", "Contact Phone", "Country", "Contact Person",
        "Enquiry Date", "Lead Source", "Lead Group", "Lead Status", "Enquiry Status", "Enquiry Type",
        "Enquiry Description", "Quotation Number", "Quotation Amount", "Lead Rating"
      ];

      // ============================================
      // ADD TITLE ROW (ROW 1)
      // ============================================
      // Merge cells for title across all columns
      worksheet.mergeCells(1, 1, 1, headers.length);
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "Enquiry Sheet 2026-27";
      titleCell.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };// White text
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } }; // Dark Blue
      titleCell.alignment = { horizontal: "center", vertical: "center" };

      // ============================================
      // ADD HEADERS (ROW 2)
      // ============================================
      const headerRow = worksheet.addRow(headers);
      headerRow.height = 28;

      // Style each header cell
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, size: 12, color: { argb: "FF000000" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8B384" }
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "center",
          wrapText: true
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" }
        };
      });

      // ============================================
      // ADD DATA ROWS WITH STATUS COLORS
      // ============================================
      const rowsData = data.slice(0, -1);
      rowsData.forEach((row, index) => {
        const rowValues = headers.map((h) => row[h]);
        const addedRow = worksheet.addRow(rowValues);

        // Alternate row colors
        const fillColor =
          index % 2 === 0
            ? "FFD9EAF7" // Sky Blue
            : "FFF8F9FA"; // Off White

        addedRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: fillColor },
          };

          cell.alignment = {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          };

          cell.font = {
            color: { argb: "FF000000" },
          };

          cell.border = {
            top: { style: "thin", color: { argb: "FFD0D7DE" } },
            bottom: { style: "thin", color: { argb: "FFD0D7DE" } },
            left: { style: "thin", color: { argb: "FFD0D7DE" } },
            right: { style: "thin", color: { argb: "FFD0D7DE" } },
          };
        });
      });
      // ============================================
      // ADD TOTAL ROW
      // ============================================
      const totalValues = headers.map((h) => data[data.length - 1][h]);
      const totalRowExcel = worksheet.addRow(totalValues);
      totalRowExcel.eachCell((cell) => {
        cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" }
        };
        cell.alignment = { horizontal: "center", vertical: "center" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" }
        };
      });

      // ============================================
      // SET ROW HEIGHTS
      // ============================================
      worksheet.getRow(1).height = 32;  // Title row
      worksheet.getRow(2).height = 28;  // Header row

      // ============================================
      // AUTO COLUMN WIDTHS
      // ============================================
      worksheet.columns.forEach((col, idx) => {
        let maxLength = headers[idx].length;
        data.forEach((row) => {
          const val = row[headers[idx]] || "";
          maxLength = Math.max(maxLength, val.toString().length);
        });
        col.width = Math.min(maxLength + 5, 40);
      });

      // ============================================
      // ADD AUTOFILTER
      // ============================================
      worksheet.autoFilter = {
        from: "A2",
        to: `${String.fromCharCode(64 + headers.length)}${rowsData.length + 2}`
      };

      // ============================================
      // ADD CHART IMAGES SHEET
      // ============================================
      const chartSheet = workbook.addWorksheet("Charts");

      // Add title for charts
      chartSheet.getCell("A1").value = "Lead Analytics Dashboard";
      chartSheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF000000" } };
      chartSheet.getCell("A1").alignment = { horizontal: "center" };
      chartSheet.mergeCells(1, 1, 1, 3);

      // Add Doughnut Chart
      chartSheet.getCell("A3").value = "Lead Status Distribution";
      chartSheet.getCell("A3").font = { bold: true, size: 12 };

      const doughnutImageId = workbook.addImage({
        buffer: doughnutImageBuffer,
        extension: "png",
      });

      chartSheet.addImage(doughnutImageId, {
        tl: { col: 1, row: 4 },
        ext: { width: 450, height: 350 },
      });

      // Add Polar Chart
      chartSheet.getCell("E3").value = "Lead Source Distribution";
      chartSheet.getCell("E3").font = { bold: true, size: 12 };

      const polarImageId = workbook.addImage({
        buffer: polarImageBuffer,
        extension: "png",
      });

      chartSheet.addImage(polarImageId, {
        tl: { col: 5, row: 4 },
        ext: { width: 450, height: 350 },
      });

      // Add Bar Chart
      chartSheet.getCell("A20").value = "Lead Sources - Bar Chart";
      chartSheet.getCell("A20").font = { bold: true, size: 12 };

      const barImageId = workbook.addImage({
        buffer: barImageBuffer,
        extension: "png",
      });

      chartSheet.addImage(barImageId, {
        tl: { col: 1, row: 21 },
        ext: { width: 650, height: 450 },
      });

      // Auto-size columns for chart sheet
      chartSheet.getColumn(1).width = 35;
      chartSheet.getColumn(5).width = 35;

      // ============================================
      // WRITE AND DOWNLOAD FILE
      // ============================================
      const fileDate = new Date().toISOString().split("T")[0];
      const buffer = await workbook.xlsx.writeBuffer();

      // Create blob and download
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${fileName}_${fileDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("success", `${leadsToExport.length} leads exported successfully with headers, doughnut chart, polar chart, and bar chart inside Excel`);
    } catch (err) {
      console.error("Export error:", err);
      showToast("error", `Export failed: ${err.message}`);
    }
  };
  async function bulkExport() {
    const selected = allLeads.filter((l) => selectedIds.has(l.leadId));
    const headers = LEAD_EXPORT_FIELDS.map((field) => field.header);
    const rows = selected.map((lead) => {
      const score = scoresMap[lead.leadId];
      return LEAD_EXPORT_FIELDS.map((field) => field.value(lead, score));
    });
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", "Export completed");
  }

  async function bulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} selected leads?`)) return;
    setLoading(true);
    try {
      await Promise.all([...selectedIds].map((id) => remove(id)));
      showToast("success", `${selectedIds.size} leads deleted.`);
      setSelectedIds(new Set());
      await loadAll();
    } catch {
      showToast("error", "Some deletes failed.");
    } finally {
      setLoading(false);
    }
  }

  // Handle file selection for import
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(csv|xlsx)$/i)) {
      showToast("error", "Please select a CSV or XLSX file");
      return;
    }

    setImportFile(file);

    const reader = new FileReader();

    if (file.name.toLowerCase().endsWith(".xlsx")) {
      reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);

        const workbook = XLSX.read(data, {
          type: "array",
        });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        });

        setImportPreview(jsonData.slice(0, 6));
      };

      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split("\n").slice(0, 6);
        const preview = lines.map((line) => line.split(","));
        setImportPreview(preview);
      };

      reader.readAsText(file);
    }
  };

  // Map CSV headers to lead fields
  const mapCSVToLead = (headers, values) => {
    const leadData = {};

    const fieldMappings = {
      "lead name": "leadFirstName",
      ref: "leadRef",
      group: "leadGroup",
      "enquiry date": "inquiryDate",
      status: "leadStatus",
      "lead status": "leadOutcomeStatus",
      "enquiry status": "enquiryStatus",
      "quotation no": "quotationNumber",
      "quotation date": "quotationDate",
      amount: "quotationAmount",
      rating: "leadRating",
    };

    headers.forEach((header, index) => {
      const normalizedHeader = String(header)
        .toLowerCase()
        .trim()
        .replace(/^["']|["']$/g, "");

      const mappedField = fieldMappings[normalizedHeader];

      if (mappedField && values[index] !== undefined) {
        leadData[mappedField] = String(values[index])
          .replace(/^["']|["']$/g, "")
          .trim();
      }
    });

    if (!leadData.leadStatus) {
      leadData.leadStatus = "New Lead";
    }

    return leadData;
  };
  // Handle import submission
  const handleImport = async () => {
    if (!importFile) {
      showToast("error", "Please select a file first");
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          showToast("error", "CSV file is empty or invalid");
          setImporting(false);
          return;
        }

        // Parse headers
        const headers = parseCSVLine(lines[0]);
        let successCount = 0;
        let errorCount = 0;

        setImportProgress({ current: 0, total: lines.length - 1 });

        // Process each row (skip header)
        for (let i = 1; i < lines.length; i++) {
          try {
            const values = parseCSVLine(lines[i]);
            const leadData = mapCSVToLead(headers, values);

            // Validate required fields
            if (
              !leadData.leadFirstName &&
              !leadData.leadMobileNo &&
              !leadData.leadEmail
            ) {
              errorCount++;
              continue;
            }

            // Create lead
            await create(leadData, {});
            successCount++;
            setImportProgress({ current: i, total: lines.length - 1 });
          } catch (error) {
            errorCount++;
            console.error("Error importing row:", error);
          }
        }

        // Show result
        if (successCount > 0) {
          showToast(
            "success",
            `Imported ${successCount} leads successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
          );
          await loadAll();
        } else {
          showToast(
            "error",
            "No leads were imported. Please check your CSV format.",
          );
        }

        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImporting(false);
        setImportProgress({ current: 0, total: 0 });
      };

      reader.onerror = () => {
        showToast("error", "Failed to read file");
        setImporting(false);
      };

      reader.readAsText(importFile);
    } catch (error) {
      showToast("error", "Failed to import leads: " + error.message);
      setImporting(false);
    }
  };

  function openCreate(no) {
    setQuotationNo(no)
    setEditingLead(null);
    setShowModal(true);
  }

  function openEdit(lead, e) {
    if (e) {
      e.stopPropagation();
    }
    console.log("Opening edit for lead:", lead); // Debug log
    setEditingLead({ ...lead });
    setShowPanel(false);
    setShowModal(true);
  }
  function openPanel(lead) {
    setPanelLead(lead);
    setShowPanel(true);
  }

  async function handleSave(formData) {
    setModalSaving(true);
    try {
      // Backend expects multipart/form-data with a "lead" part (JSON) and optional files parts.
      // LeadForm sends only JSON fields; no file upload exists on this UI, so send an empty files object.
      const safeFiles = {};

      // FIX: avoid passing the synthetic React event object to API.
      // LeadForm calls onSubmit with a plain object (handleSubmit in LeadForm.jsx).
      const payload =
        formData && typeof formData === "object" && !Array.isArray(formData)
          ? formData
          : {};

      if (editingLead?.leadId) {
        await update(editingLead.leadId, payload, safeFiles);
        showToast("success", "Lead updated.");
      } else {
        await create(payload, safeFiles);
        showToast("success", "Lead created.");
      }
      setShowModal(false);
      await loadAll();
    } catch (err) {
      // Surface more details if available.
      const msg =
        err?.response?.data?.message || err?.message || "Failed to save lead.";
      showToast("error", msg);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setLoading(true);
    try {
      await remove(deleteId);
      showToast("success", "Lead deleted.");
      if (panelLead?.leadId === deleteId) setShowPanel(false);
      await loadAll();
    } catch {
      showToast("error", "Failed to delete lead.");
    } finally {
      setDeleteId(null);
      setLoading(false);
    }
  }

  async function handleStatusChange(leadId, newStatus) {
    setLoading(true);

    try {
      await updateStatus(leadId, newStatus);

      setAllLeads((prev) =>
        prev.map((lead) =>
          lead.leadId === leadId
            ? {
              ...lead,
              leadStatus: newStatus,

              leadOutcomeStatus:
                newStatus === "Qualified"
                  ? "Open"
                  : null,

              enquiryStatus:
                newStatus === "Qualified"
                  ? "Pending"
                  : null,
            }
            : lead
        )
      );

      showToast(
        "success",
        `Status updated to ${newStatus}.`
      );

      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to update status.");
    } finally {
      setLoading(false);
    }
  }
  async function handleLeadOutcomeStatusChange(leadId, leadOutcomeStatus) {
    setLoading(true);

    try {
      await updateLeadOutcomeStatus(leadId, leadOutcomeStatus);

      // Update local state immediately
      setAllLeads((prev) =>
        prev.map((lead) =>
          lead.leadId === leadId
        )
      );

      showToast(
        "success",
        `Lead outcome updated to ${leadOutcomeStatus}`
      );

      await loadAll(); // optional
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to update lead outcome.");
    } finally {
      setLoading(false);
    }
  }


  async function handleGroupChange(leadId, newGroup) {
    setLoading(true);
    try {
      await updateGroup(leadId, newGroup);
      showToast(
        "success",
        newGroup ? `Group updated to ${newGroup}.` : "Group cleared.",
      );
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to update group.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnquiryStatusChange(leadId, newEnquiryStatus) {
    setLoading(true);
    try {
      await updateEnquiryStatus(leadId, newEnquiryStatus);
      showToast(
        "success",
        newEnquiryStatus
          ? `Enquiry status updated to ${newEnquiryStatus}.`
          : "Enquiry status cleared.",
      );
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to update enquiry status.");
    } finally {
      setLoading(false);
    }
  }

  function sortIcon(key) {
    if (sortKey !== key) return "mdi:unfold-more-horizontal";
    return sortDir === "asc" ? "mdi:chevron-up" : "mdi:chevron-down";
  }

  const gradeStyles = {
    A: "bg-emerald-500 text-white",
    B: "bg-blue-500 text-white",
    C: "bg-amber-500 text-white",
    D: "bg-red-500 text-white",
  };

  const gradeActiveClass = (g) => {
    const base = "transition-all px-2 py-1 rounded-md text-xs font-bold";

    if (gradeFilter !== g) {
      return `${base} text-gray-500 hover:bg-gray-100`;
    }

    const activeStyles = {
      A: "bg-emerald-500 text-white shadow-sm",
      B: "bg-blue-500 text-white shadow-sm",
      C: "bg-amber-500 text-white shadow-sm",
      D: "bg-red-500 text-white shadow-sm",
    };

    return `${base} ${activeStyles[g]}`;
  };
  // Update the updateLeadRating function (around line 600-620)
  const updateLeadRating = async (lead, stars) => {
    try {
      console.log("Saving rating:", {
        leadId: lead.leadId,
        leadRating: stars,
      });

      // Use the update function from useLead hook
      await update(
        lead.leadId,
        {
          ...lead,
          leadRating: stars,
        },
        {}
      );

      // Update local state immediately for better UX
      setAllLeads((prevLeads) =>
        prevLeads.map((l) =>
          l.leadId === lead.leadId
            ? { ...l, leadRating: stars }
            : l
        )
      );

      showToast("success", `Rating updated to ${stars} stars`);
    } catch (error) {
      console.error("Failed to update rating:", error);
      showToast("error", "Failed to update rating");
    }
  };
  // Download sample CSV template
  // const downloadSampleCSV = () => {
  //   const headers = [
  //     "First Name",
  //     "Last Name",
  //     "Mobile",
  //     "Email",
  //     "Organization",
  //     "Status",
  //     "Source",
  //   ];
  //   const sampleRow = [
  //     "John",
  //     "Doe",
  //     "9876543210",
  //     "john@example.com",
  //     "ABC Corp",
  //     "New Lead",
  //     "Website",
  //   ];
  //   const csv = [headers, sampleRow].map((row) => row.join(",")).join("\n");
  //   const blob = new Blob([csv], { type: "text/csv" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = "sample_leads_import.csv";
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };

  return (
    <div className="animate-fade-in flex flex-col gap-0">
      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-3">
        {/* Row 1: Status Filters & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {STATUS_TABS.filter((s) => {
              // Base tabs always visible (All, New Lead, Qualified, Disqualified, Ongoing)
              const baseTabs = ["All", "Qualified", "Disqualified"];

              // Additional tabs that only show when Qualified is active
              const qualifiedOnlyTabs = ["Open", "Won", "Closed"];

              // Remove New Lead and Ongoing from ever showing
              if (s === "New Lead" || s === "Ongoing") {
                return false;
              }

              if (
                activeStatus === "Qualified" ||
                qualifiedOnlyTabs.includes(activeStatus)
              ) {
                // When Qualified is active, show all tabs including Open, Won, Closed
                return true;
              } else {
                // Otherwise, hide Open, Won, Closed tabs
                return !qualifiedOnlyTabs.includes(s);
              }
            }).map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveStatus(s)
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border shrink-0 ${activeStatus === s
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-100"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
          {/* <div className="alert alert-primary mb-3">
            Total Leads Found:
            <strong> {filteredLeads.length}</strong>
          </div> */}
          {/* Quick Actions (Import, New, View Toggles) */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <Link
              to="/lead/import"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Icon name="mdi:cloud-upload-outline" className="w-3.5 h-3.5" />
              Import
            </Link>
            <button
              onClick={() => exportToExcel(filteredLeads, "All_Leads")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
            >
              <Icon
                name="mdi:file-excel-outline"
                className="w-4 h-4 text-green-600"
              />
              Export
            </button>

            <button
              onClick={() => openCreate(pagedLeads)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
            >
              <Icon name="mdi:plus" className="w-3.5 h-3.5" />
              New Lead
            </button>



            <Link
              to="/lead/pipeline"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm shadow-violet-200"
              title="Advanced Pipeline View"
            >
              <Icon name="mdi:chart-sankey" className="w-3.5 h-3.5" />
              Pipeline
            </Link>

            <Link
              to="/negotiation"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm shadow-orange-200"
              title="View All Negotiations"
            >
              <Icon name="mdi:handshake-outline" className="w-3.5 h-3.5" />
              Negotiations
            </Link>
          </div>
        </div>

        {/* Row 2: Secondary Filters (Search, Date, Source, Grade) */}
        <div
          className={`flex flex-wrap items-center gap-3 border-t border-gray-100 transition-all duration-300 ease-in-out origin-top overflow-hidden ${filtersCollapsed
            ? "max-h-0 pt-0 border-t-0 opacity-0 pointer-events-none mt-0"
            : "max-h-20 pt-3 opacity-100 mt-3"
            }`}
        >
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Icon
              name="mdi:magnify"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, mobile, email, org..."
              className="pl-8 pr-3 py-1.5 w-full text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-gray-400"
            />
          </div>

          {/* Source dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">All sources</option>
            {leadSources.map((src) => (
              <option
                key={src.id}
                value={src.sourceName}
              >
                {src.sourceName}
              </option>
            ))}
          </select>

          {/* Date range picker */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            <span className="text-gray-400 text-xs px-1">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Grade picker */}
          {/* Grade picker */}
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-md p-0.5 flex-wrap">
            <button
              onClick={() => setGradeFilter("")}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${gradeFilter === ""
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:bg-gray-100"
                }`}
            >
              All
            </button>

            {["5", "4", "3", "2", "1"].map((g) => (
              <button
                key={g}
                onClick={() => toggleGradeFilter(g)}
                className={`h-6 px-1.5 rounded text-[9px] font-medium flex items-center gap-1 ${gradeFilter.includes(g)
                  ? "bg-yellow-500 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-yellow-50"
                  }`}
              >
                ⭐{g}
                <span className="text-[8px]">{gradeCounts[g] || 0}</span>
              </button>
            ))}
          </div>
          {/* Clear filters */}
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <Icon name="mdi:close-circle-outline" className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {initialLoading && (
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-50 rounded-lg animate-pulse"
              style={{ opacity: 1 - i * 0.08 }}
            />
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {!initialLoading && (
        <>
          {!filteredLeads.length ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Icon
                  name="mdi:account-search-outline"
                  className="w-8 h-8 text-blue-400"
                />
              </div>
              <p className="text-base font-semibold text-gray-700 mb-1">
                No leads found
              </p>
              <p className="text-sm text-gray-400 mb-5">
                Try adjusting your filters or add a new lead.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Icon name="mdi:cloud-upload-outline" className="w-4 h-4" />
                  Import leads
                </button>
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Icon name="mdi:plus" className="w-4 h-4" />
                  Add manually
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Scroll Controls Header - Add this NEW section */}
              {showScrollControls && (
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50/70 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={scrollToStart}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                      title="Scroll to Start (Ctrl+Home)"
                    >
                      <Icon name="mdi:chevron-double-left" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={scrollLeft}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                      title="Scroll Left (←)"
                    >
                      <Icon name="mdi:chevron-left" className="w-4 h-4" />
                    </button>
                    <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-blue-500 transition-all duration-150"
                        style={{ width: `${scrollProgress}%` }}
                      />
                    </div>
                    <button
                      onClick={scrollRight}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                      title="Scroll Right (→)"
                    >
                      <Icon name="mdi:chevron-right" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={scrollToEnd}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                      title="Scroll to End (Ctrl+End)"
                    >
                      <Icon name="mdi:chevron-double-right" className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-400 ml-1 hidden md:inline">
                      ← → keys to scroll
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (tableContainerRef.current) {
                          tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                      title="Scroll to Top"
                    >
                      <Icon name="mdi:arrow-up" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (tableContainerRef.current) {
                          tableContainerRef.current.scrollTo({ top: tableContainerRef.current.scrollHeight, behavior: 'smooth' });
                        }
                      }}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                      title="Scroll to Bottom"
                    >
                      <Icon name="mdi:arrow-down" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              <div
                ref={tableContainerRef}  // <-- ADD THIS
                onScroll={handleTableScroll}
                className="w-full overflow-x-auto overflow-y-auto"
                style={{
                  maxHeight: filtersCollapsed
                    ? "calc(100vh - 225px)"
                    : "calc(100vh - 280px)",
                }}
              >
                <table
                  className="table-fixed text-sm"
                  style={{
                    minWidth: "1800px",
                    width: "max-content",
                  }}
                >
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="w-10 pl-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="w-[180px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <button
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                          onClick={() => toggleSort("leadFirstName")}
                        >
                          LEAD NAME{" "}
                          <Icon
                            name={sortIcon("leadFirstName")}
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      </th>
                      <th className="w-[100px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <button
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                          onClick={() => toggleSort("leadRef")}
                        >
                          REF{" "}
                          <Icon
                            name={sortIcon("leadRef")}
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      </th>
                      <th className="w-[140px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <button
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                          onClick={() => toggleSort("leadGroup")}
                        >
                          GROUP{" "}
                          <Icon
                            name={sortIcon("leadGroup")}
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      </th>

                      {/* <th className="w-[10%] py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          <button
                            className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                            onClick={() => toggleSort("leadStatus")}
                          >
                            Status{" "}
                            <Icon
                              name={sortIcon("leadStatus")}
                              className="w-3.5 h-3.5"
                            />
                          </button>
                        </th> */}
                      <th className="w-[140px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <button
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                          onClick={() => toggleSort("leadOutcomeStatus")}
                        >
                          LEAD STATUS{" "}
                          <Icon
                            name={sortIcon("leadOutcomeStatus")}
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      </th>

                      <th className="w-[150px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <button
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                          onClick={() => toggleSort("enquiryStatus")}
                        >
                          QUOTATION STATUS{" "}
                          <Icon
                            name={sortIcon("enquiryStatus")}
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      </th>
                      <th className="w-[250px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        ENQUIRY DESCRIPTION
                      </th>
                      <th className="w-[180px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <button
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                          onClick={() => toggleSort("quotationNumber")}
                        >
                          QUOTATION NO.{" "}
                          <Icon
                            name={sortIcon("quotationNumber")}
                            className="w-3.5 h-3.5"
                          />
                        </button>
                      </th>
                      <th className="w-[150px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        ENQUIRY DATE
                      </th>
                      <th className="w-[150px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        QUOTATION DATE
                      </th>
                      <th className="w-[150px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        SENT QUOTATION DATE
                      </th>
                      <th className="w-[90px] whitespace-nowrap py-2.5 px-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        AMOUNT
                      </th>
                      <th className="w-[120px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        GRADE
                      </th>
                      <th className="w-[150px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        ENQUIRY TYPE
                      </th>
                      <th className="w-[250px] whitespace-nowrap py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        REMARKS
                      </th>
                      <th className="sticky right-0 z-20 w-[120px] bg-gray-50 py-2.5 pl-3 pr-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide shadow-[-8px_0_12px_rgba(15,23,42,0.04)]">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedLeads.map((lead, idx) => {

                      const score = scoresMap[lead.leadId];
                      return (
                        <tr
                          key={lead.leadId}
                          className={`cursor-pointer transition-colors duration-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                            } ${selectedIds.has(lead.leadId) ? "bg-blue-50/60" : "hover:bg-blue-50/40"}`}
                        // onClick={() => openPanel(lead)}
                        >
                          <td
                            className="pl-4 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(lead.leadId)}
                              onChange={() => toggleSelect(lead.leadId)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-2 max-w-[200px]">
                            <div className="flex items-center gap-2.5">
                              <div className="min-w-0 flex-1">
                                {lead.leadOrganisationName && (
                                  <p className="font-medium text-gray-900 truncate leading-snug" title={lead.leadOrganisationName}>
                                    {lead.leadOrganisationName}
                                  </p>
                                )}
                                <p className="text-xs text-gray-600 truncate leading-snug" title={lead.companyContactPersonName || "-"}>
                                  {lead.companyContactPersonName || "-"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs font-semibold text-gray-600">
                            {lead.leadRef || (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td
                            className="px-3 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={lead.leadGroup || ""}
                              disabled={loading}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.preventDefault();
                                handleGroupChange(lead.leadId, e.target.value);
                              }}
                              className={`
                                  group-select-badge
                                  appearance-none
                                  bg-no-repeat
                                  bg-[right_0.55rem_center]
                                  bg-[length:0.85rem_0.85rem]
                                  pr-7
                                  pl-3
                                  py-1
                                  rounded-lg
                                  text-xs
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
                                  bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M6%208l4%204%204-4%27%20stroke%3D%27%236b7280%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E")]
                                  w-full
                                  max-w-[160px]
                                 ${getGroupColor(lead.leadGroup)}
                                  ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}
                                `}
                            >
                              <option value="" className="bg-white text-gray-600">Unassigned</option>
                              {leadGroups.map((group) => (
                                <option
                                  key={group.id}
                                  value={group.groupName}
                                  className="bg-white text-gray-700 font-normal"
                                >
                                  {group.groupName}
                                </option>
                              ))}
                            </select>
                          </td>


                          {/* <td className="px-3 py-2 text-xs text-gray-600">
                              {lead.inquiryDate ? (
                                formatDate(lead.inquiryDate)
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td> */}

                          {/* LEAD STATUS COLUMN - Uses updateLeadOutcomeStatus */}
                          <td
                            className="px-3 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={lead.leadOutcomeStatus || ""}
                              disabled={loading}
                              onChange={async (e) => {
                                const newValue = e.target.value;

                                try {
                                  await updateLeadOutcomeStatus(
                                    lead.leadId,
                                    newValue || null
                                  );

                                  setAllLeads((prevLeads) =>
                                    prevLeads.map((l) =>
                                      l.leadId === lead.leadId
                                        ? {
                                          ...l,
                                          leadOutcomeStatus: newValue || null,
                                        }
                                        : l
                                    )
                                  );

                                  showToast(
                                    "success",
                                    `Lead status updated to ${newValue || "None"
                                    }`
                                  );
                                } catch (err) {
                                  console.error(err);
                                  showToast(
                                    "error",
                                    "Failed to update lead status"
                                  );
                                }
                              }}
                              className={`
                              status-select-badge
                              appearance-none
                              bg-no-repeat
                              bg-[right_0.55rem_center]
                              bg-[length:0.85rem_0.85rem]
                              pr-7
                              pl-3
                              py-1
                              rounded-lg
                              text-xs
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
                              w-full
                              max-w-[110px]
                              bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M6%208l4%204%204-4%27%20stroke%3D%27%236b7280%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E")]
                              
                             ${lead.leadOutcomeStatus === "Negotiation"
                                  ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200"
                                  : lead.leadOutcomeStatus === "Open"
                                    ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                                    : lead.leadOutcomeStatus === "Won"
                                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                      : lead.leadOutcomeStatus === "Closed"
                                        ? "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                                        : "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
                                }

                              ${loading
                                  ? "opacity-60 cursor-not-allowed"
                                  : "hover:opacity-90"
                                }
                            `}
                            >
                              <option value="">None</option>
                              <option value="Negotiation">Negotiation</option>
                              <option value="Open">Open</option>
                              <option value="Won">Won</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </td>
                          <td
                            className="px-3 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={lead.enquiryStatus || ""}
                              onChange={(e) =>
                                handleEnquiryStatusChange(
                                  lead.leadId,
                                  e.target.value
                                )
                              }
                              className={`
                              status-select-badge
                              appearance-none
                              bg-no-repeat
                              bg-[right_0.55rem_center]
                              bg-[length:0.85rem_0.85rem]
                              pr-7
                              pl-3
                              py-1
                              rounded-lg
                              text-xs
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
                              w-full
                              max-w-[110px]
                              bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M6%208l4%204%204-4%27%20stroke%3D%27%236b7280%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E")]
                              ${ENQUIRY_STATUS_BG[lead.enquiryStatus || ""]}
                              ${loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}
                            `}
                            >
                              <option value="">None</option>
                              <option value="Pending">Pending</option>
                              <option value="Sent">Sent</option>
                              <option value="Working">Working</option>
                            </select>
                          </td>
                          <td
                            className="py-2 px-3 text-sm text-gray-700 max-w-[250px] truncate"
                            title={lead.enquiryDescription}
                          >
                            {lead.enquiryDescription || '-'}
                          </td>

                          <td
                            className="px-3 py-2 text-xs font-medium text-gray-700 truncate"
                            title={lead.quotationNumber || "No quotation number"}
                          >
                            {lead.quotationNumber &&
                              lead.quotationNumber !== '000' &&
                              lead.quotationNumber !== '26-27/000' &&
                              lead.quotationNumber !== '0' ? (
                              <span className="font-mono text-xs">{lead.quotationNumber}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {lead.inquiryDate ? (
                              formatDate(lead.inquiryDate)
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {lead.quotationDate ? (
                              formatDate(lead.quotationDate)
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {lead.quotationSentDate ? (
                              formatDate(lead.quotationSentDate)
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs font-bold text-gray-900 text-right">
                            {lead.quotationAmount != null ? (
                              formatCurrency(lead.quotationAmount, lead.leadCountry)
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* <td className="px-3 py-2">
                              {score ? (
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold border ${GRADE_BG[score.grade] ?? "bg-gray-100 text-gray-600"}`}
                                  >
                                    {score.grade}
                                  </span>
                                  <span className="text-xs text-gray-400 hidden xl:inline">
                                    {score.score}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td> */}

                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <StarRating
                                grade={lead?.leadRating || 0}
                                score={score?.score}
                                size="text-xs"
                                onChange={(stars) => {
                                  updateLeadRating(lead, stars).then(() => {
                                    loadAll();
                                  });
                                }}
                              />

                              {lead?.leadRating > 0 && (
                                <button
                                  title="Clear Rating"
                                  className="text-red-500 hover:text-red-700 text-sm font-bold"
                                  onClick={() => {
                                    updateLeadRating(lead, 0).then(() => {
                                      loadAll();
                                    });
                                  }}
                                >
                                  <Icon name="mdi:close-circle-outline" className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td
                            className="px-3 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={lead.leadStatus}
                              disabled={loading}
                              onChange={(e) => handleStatusChange(lead.leadId, e.target.value)}
                              className={`
                                status-select-badge
                                appearance-none
                                bg-no-repeat
                                bg-[right_0.55rem_center]
                                bg-[length:0.85rem_0.85rem]
                                pr-7
                                pl-3
                                py-1
                                rounded-lg
                                text-xs
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
                                w-full
                                max-w-[135px]
                                bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M6%208l4%204%204-4%27%20stroke%3D%27%236b7280%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%2F%3E%3C%2Fsvg%3E")]
                                ${STATUS_BG?.[lead.leadStatus] || "bg-gray-100 text-gray-600 ring-1 ring-gray-200"}
                                ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}
                              `}
                            >
                              {(() => {
                                const mainStatuses = ["Qualified", "Disqualified"];
                                const currentStatus = lead.leadStatus;
                                const options = mainStatuses.includes(currentStatus)
                                  ? [...mainStatuses]
                                  : [...mainStatuses, currentStatus];

                                return options.map((s) => (
                                  <option
                                    key={s}
                                    value={s}
                                    className="bg-white text-gray-700 font-normal"
                                  >
                                    {s}
                                  </option>
                                ));
                              })()}
                            </select>
                          </td>
                          <td
                            className="py-2 px-3 text-sm text-gray-700 max-w-[200px]"
                            title={lead.followUpRemark}
                          >
                            {lead.followUpRemark ? (
                              lead.followUpRemark.length > 50
                                ? `${lead.followUpRemark.substring(0, 50)}...`
                                : lead.followUpRemark
                            ) : (
                              "-"
                            )}
                          </td>
                          <td
                            className={`sticky right-0 pl-3 pr-4 py-2 shadow-[-8px_0_12px_rgba(15,23,42,0.04)] ${selectedIds.has(lead.leadId) ? "bg-blue-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/lead/${lead.leadId}`}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0"
                                title="View detail"
                              >
                                <Icon
                                  name="mdi:eye-outline"
                                  className="w-4 h-4"
                                />
                              </Link>
                              {/* <div className="w-0 flex items-center justify-center shrink-0">
                                  {leadsWithNotes.has(Number(lead.leadId)) ? (
                                 <Link
                                  to={`/lead/${lead.leadId}?tab=notes`}
                                  className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50"
                                  title="View Notes"
                                >
                                  <Icon name="mdi:notebook-outline" className="w-4 h-4" />
                                </Link>
                                  ) : null}
                                </div> */}
                              <button
                                onClick={(e) => openEdit(lead, e)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors shrink-0"
                                title="Edit"
                              >
                                <Icon
                                  name="mdi:pencil-outline"
                                  className="w-4 h-4"
                                />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(lead.leadId);
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                                title="Delete"
                              >
                                <Icon
                                  name="mdi:trash-can-outline"
                                  className="w-4 h-4"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Showing{" "}
                    {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–
                    {Math.min(currentPage * pageSize, totalCount)} of{" "}
                    {totalCount}
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs text-gray-400">per page</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Icon name="mdi:chevron-left" className="w-4 h-4" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => {
                    const p = i + 1;
                    if (
                      p === 1 ||
                      p === totalPages ||
                      (p >= currentPage - 1 && p <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === currentPage
                            ? "bg-blue-600 text-white"
                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    if (p === currentPage - 2 || p === currentPage + 2) {
                      return (
                        <span key={p} className="px-1 text-gray-400 text-xs">
                          …
                        </span>
                      );
                    }
                    return null;
                  })}
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Icon name="mdi:chevron-right" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}



      {/* Import Modal */}
      {showImportModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
              }}
            />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="flex items-center gap-2">
                  <Icon
                    name="mdi:cloud-upload"
                    className="w-5 h-5 text-white"
                  />
                  <h2 className="text-lg font-semibold text-white">
                    Import Leads
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  className="p-1.5 rounded-lg text-white/70 hover:bg-white/20 transition-colors"
                >
                  <Icon name="mdi:close" className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  <Icon
                    name="mdi:information"
                    className="w-4 h-4 inline mr-1"
                  />
                  Upload a CSV file with the following columns: First Name, Last
                  Name, Mobile, Email, Organization, Status, Source
                </div>

                {/* Download Sample Template */}
                <button
                  onClick={downloadSampleCSV}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Icon name="mdi:download" className="w-4 h-4" />
                  Download Sample CSV Template
                </button>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Icon
                    name="mdi:file-delimited-outline"
                    className="w-12 h-12 text-gray-400 mx-auto mb-3"
                  />
                  <p className="text-sm text-gray-600 mb-2">
                    {importFile
                      ? importFile.name
                      : "Click to select a CSV file"}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Choose File
                  </button>
                </div>

                {importPreview.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      Preview:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1500px] table-fixed">
                        <tbody>
                          {importPreview.map((row, idx) => (
                            <tr key={idx}>
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className="px-2 py-1 border border-gray-200"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Import Progress */}
                {importing && importProgress.total > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Importing...</span>
                      <span>
                        {importProgress.current} / {importProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${(importProgress.current / importProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  disabled={importing}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? (
                    <Icon name="mdi:loading" className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon name="mdi:cloud-upload" className="w-4 h-4" />
                  )}
                  {importing
                    ? `Importing ${importProgress.current}/${importProgress.total}`
                    : "Import"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 &&
        createPortal(
          <div className="bulk-action-bar fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/50 border border-slate-800">
            <span className="text-sm font-bold">
              {selectedIds.size} selected
            </span>
            <div className="w-px h-4 bg-slate-700" />
            <button
              onClick={() => exportToExcel(allLeads.filter(l => selectedIds.has(l.leadId)), "Selected_Leads")}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            >
              <Icon name="mdi:download-outline" className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={bulkDelete}
              className="delete-btn flex items-center gap-1.5 text-sm font-semibold transition-colors"
            >
              <Icon name="mdi:trash-can-outline" className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <Icon name="mdi:close" className="w-4 h-4" />
            </button>
          </div>,
          document.body,
        )}

      {/* Right slide-over panel */}
      {showPanel &&
        panelLead &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowPanel(false)}
            />
            <div className="relative w-full max-w-[640px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${avatarColor(panelLead.leadFirstName)}`}
                  >
                    {(panelLead.leadFirstName?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900 leading-snug">
                      {panelLead.leadFirstName} {panelLead.leadLastName}
                    </p>
                    {panelLead.leadOrganisationName && (
                      <p className="text-xs text-gray-400">
                        {panelLead.leadOrganisationName}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <Icon name="mdi:close" className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BG[panelLead.leadStatus] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {panelLead.leadStatus}
                  </span>
                  {panelLead.leadSource && (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${SOURCE_BG[panelLead.leadSource] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {panelLead.leadSource}
                    </span>
                  )}
                  {/* {scoresMap[panelLead.leadId] && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${GRADE_BG[scoresMap[panelLead.leadId].grade]}`}
                      >
                        Grade {scoresMap[panelLead.leadId].grade} ·{" "}
                        {scoresMap[panelLead.leadId].score}/100
                      </span>
                    )} */}

                  <div className="flex flex-col gap-1.5 mt-1">
                    <StarRating
                      grade={panelLead.leadRating || 0}
                      score={scoresMap[panelLead.leadId]?.score}
                      size="text-xs"
                      onChange={(stars) => {
                        updateLeadRating(panelLead, stars).then(() => loadAll());
                      }}
                    />
                    {scoresMap[panelLead.leadId] && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">
                          Score: {scoresMap[panelLead.leadId].score}/100
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${GRADE_BG[scoresMap[panelLead.leadId].grade] ?? "bg-gray-100 text-gray-600"
                            }`}
                        >
                          Grade {scoresMap[panelLead.leadId].grade}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Contact Info
                  </p>
                  {panelLead.leadMobileNo && (
                    <div className="flex items-center gap-2.5">
                      <Icon
                        name="mdi:phone-outline"
                        className="w-4 h-4 text-gray-400 shrink-0"
                      />
                      <a
                        href={`tel:${panelLead.leadMobileNo}`}
                        className="text-sm text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        {panelLead.leadMobileNo}
                      </a>
                    </div>
                  )}
                  {panelLead.leadEmail && (
                    <div className="flex items-center gap-2.5">
                      <Icon
                        name="mdi:email-outline"
                        className="w-4 h-4 text-gray-400 shrink-0"
                      />
                      <a
                        href={`mailto:${panelLead.leadEmail}`}
                        className="text-sm text-gray-700 hover:text-blue-600 transition-colors truncate"
                      >
                        {panelLead.leadEmail}
                      </a>
                    </div>
                  )}
                  {panelLead.leadWebsite && (
                    <div className="flex items-center gap-2.5">
                      <Icon
                        name="mdi:web"
                        className="w-4 h-4 text-gray-400 shrink-0"
                      />
                      <a
                        href={panelLead.leadWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate"
                      >
                        {panelLead.leadWebsite}
                      </a>
                    </div>
                  )}
                  {(panelLead.leadCity ||
                    panelLead.leadState ||
                    panelLead.leadCountry) && (
                      <div className="flex items-center gap-2.5">
                        <Icon
                          name="mdi:map-marker-outline"
                          className="w-4 h-4 text-gray-400 shrink-0"
                        />
                        <span className="text-sm text-gray-700">
                          {[
                            panelLead.leadCity,
                            panelLead.leadState,
                            panelLead.leadCountry,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                </div>

                {(panelLead.leadOrganisationName ||
                  panelLead.leadIndustry ||
                  panelLead.noOfEmployee) && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Company
                      </p>
                      {panelLead.leadOrganisationName && (
                        <div className="flex items-center gap-2.5">
                          <Icon
                            name="mdi:office-building-outline"
                            className="w-4 h-4 text-gray-400 shrink-0"
                          />
                          <span className="text-sm text-gray-700">
                            {panelLead.leadOrganisationName}
                          </span>
                        </div>
                      )}
                      {panelLead.leadIndustry && (
                        <div className="flex items-center gap-2.5">
                          <Icon
                            name="mdi:domain"
                            className="w-4 h-4 text-gray-400 shrink-0"
                          />
                          <span className="text-sm text-gray-700">
                            {panelLead.leadIndustry}
                          </span>
                        </div>
                      )}
                      {panelLead.noOfEmployee && (
                        <div className="flex items-center gap-2.5">
                          <Icon
                            name="mdi:account-group-outline"
                            className="w-4 h-4 text-gray-400 shrink-0"
                          />
                          <span className="text-sm text-gray-700">
                            {panelLead.noOfEmployee} employees
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Created</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(panelLead.leadCreatedDate)}
                    </p>
                  </div>
                  {panelLead.inquiryDate && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Inquiry Date</p>
                      <p className="text-sm font-medium text-gray-700">
                        {formatDate(panelLead.inquiryDate)}
                      </p>
                    </div>
                  )}
                </div>

                {scoresMap[panelLead.leadId]?.topFactors?.length > 0 && (
                  <div className="bg-blue-50/60 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Icon name="mdi:brain" className="w-4 h-4" />
                      AI Score Factors
                    </p>
                    <div className="space-y-1.5">
                      {scoresMap[panelLead.leadId].topFactors.map((factor) => (
                        <div
                          key={factor}
                          className="flex items-center gap-2 text-xs text-gray-600"
                        >
                          <Icon
                            name="mdi:check-circle"
                            className="w-3.5 h-3.5 text-blue-500 shrink-0"
                          />
                          {factor}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {panelLead.leadReason && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Notes
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {panelLead.leadReason}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50 shrink-0">
                <Link
                  to={`/lead/${panelLead.leadId}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Icon name="mdi:open-in-new" className="w-4 h-4" />
                  Full Detail
                </Link>
                <button
                  onClick={() => openEdit(panelLead)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Icon name="mdi:pencil-outline" className="w-4 h-4" />
                  Edit Lead
                </button>
                <button
                  onClick={() => {
                    setDeleteId(panelLead.leadId);
                    setShowPanel(false);
                  }}
                  className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  title="Delete"
                >
                  <Icon name="mdi:trash-can-outline" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Create / Edit Slide-over */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setShowModal(false)}
            />
            <div className="relative w-full max-w-[640px] h-full bg-white shadow-2xl flex flex-col">
              <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icon
                    name={
                      editingLead
                        ? "mdi:pencil-outline"
                        : "mdi:account-plus-outline"
                    }
                    className="w-5 h-5 text-white"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-white leading-tight">
                    {editingLead ? "Edit Lead" : "New Lead"}
                  </h2>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {editingLead
                      ? `Updating: ${editingLead.companyContactPersonName ||
                      editingLead.leadOrganisationName ||
                      "Lead"
                      }`
                      : "Fill in the details to create a new lead"}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <Icon name="mdi:close" className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <LeadForm
                  quotation={quotationNo}
                  key={editingLead?.leadId ?? "create"}
                  ref={leadFormRef}
                  initial={editingLead}
                  loading={modalSaving}
                  onSubmit={handleSave}
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
                <div className="text-xs text-gray-400">
                  <span className="text-red-500">*</span> Required fields
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Submit the form by triggering the DOM submit event.
                      // LeadForm itself is not forwarding refs, so calling ref.submit() won't work.
                      document.getElementById("lead-form")?.requestSubmit();
                    }}
                    disabled={modalSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
                  >
                    {modalSaving ? (
                      <Icon
                        name="mdi:loading"
                        className="w-4 h-4 animate-spin"
                      />
                    ) : (
                      <Icon
                        name={
                          editingLead
                            ? "mdi:check-circle-outline"
                            : "mdi:plus-circle-outline"
                        }
                        className="w-4 h-4"
                      />
                    )}
                    {modalSaving
                      ? "Saving…"
                      : editingLead
                        ? "Update Lead"
                        : "Create Lead"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <AppConfirmDialog
        open={deleteId !== null}
        title="Delete Lead"
        message="Are you sure you want to delete this lead? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Toast */}
      {toast &&
        createPortal(
          <div
            className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
              }`}
          >
            <Icon
              name={
                toast.type === "success"
                  ? "mdi:check-circle"
                  : "mdi:alert-circle"
              }
              className="w-5 h-5 shrink-0"
            />
            {toast.msg}
          </div>,
          document.body,
        )}
    </div>
  );
}

