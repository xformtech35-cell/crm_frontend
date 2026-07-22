import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useLead } from "../../hooks/useLead";
import { useTask } from "../../hooks/useTask";
import { useOpportunity } from "../../hooks/useOpportunity";
import { useOrganization } from "../../hooks/useOrganization";
import { useContact } from "../../hooks/useContact";
import { LEAD_STATUSES } from "../../utils/constants";
import { formatDate, formatDateTime, formatCurrency } from "../../utils/format";
import { getCurrencyConfig } from "../../utils/currency";
import AppConfirmDialog from "../../components/common/AppConfirmDialog";
import Icon from "../../components/Icon";
import StarRating from "../../components/common/StarRating";
import LeadForm from "../../components/lead/LeadForm";

/* ─── Helpers ─── */
function gradeColor(grade) {
  if (grade === "A") return { bg: "bg-emerald-500", text: "text-white", light: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (grade === "B") return { bg: "bg-blue-500", text: "text-white", light: "bg-blue-50 text-blue-700 border-blue-200" };
  if (grade === "C") return { bg: "bg-amber-500", text: "text-white", light: "bg-amber-50 text-amber-700 border-amber-200" };
  return { bg: "bg-red-500", text: "text-white", light: "bg-red-50 text-red-700 border-red-200" };
}

function statusChip(status) {
  const map = {
    "Won": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Qualified Lead": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Contacted": "bg-amber-100 text-amber-700 border-amber-200",
    "Lost": "bg-red-100 text-red-700 border-red-200",
    "Inactive": "bg-gray-100 text-gray-600 border-gray-200",
    "Open": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "Qualified": "bg-violet-100 text-violet-700 border-violet-200",
    "Disqualified": "bg-red-100 text-red-700 border-red-200",
    "Closed": "bg-gray-100 text-gray-600 border-gray-200",
    "New Lead": "bg-blue-100 text-blue-700 border-blue-200",
  };
  return map[status] || "bg-blue-100 text-blue-700 border-blue-200";
}

function timelineIcon(type) {
  const icons = {
    note: { icon: "mdi:note-text-outline", color: "bg-blue-500" },
    status: { icon: "mdi:flag-outline", color: "bg-emerald-500" },
    reminder: { icon: "mdi:bell-outline", color: "bg-amber-500" },
    email: { icon: "mdi:email-outline", color: "bg-violet-500" },
    document: { icon: "mdi:file-outline", color: "bg-cyan-500" },
  };
  return icons[type] || { icon: "mdi:circle-outline", color: "bg-gray-400" };
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getStageForLead(lead) {
  if (!lead) return "New Lead";
  if (lead.leadOutcomeStatus === "Won") return "Won";
  if (lead.leadOutcomeStatus === "Closed") return "Closed";
  if (lead.leadOutcomeStatus === "Negotiation") return "Negotiation";
  if (lead.leadOutcomeStatus === "Open") return "Open";
  if (lead.leadStatus === "Qualified") return "Qualified";
  return "New Lead";
}

const PIPELINE_STEPS = ["New Lead", "Qualified", "Negotiation", "Won"];

const TABS = [
  { key: "overview", label: "Overview", icon: "mdi:view-grid-outline" },
  { key: "activity", label: "Timeline", icon: "mdi:timeline-outline" },
  { key: "notes", label: "Notes", icon: "mdi:note-text-outline" },
  { key: "reminders", label: "Reminders", icon: "mdi:bell-outline" },
  { key: "documents", label: "Documents", icon: "mdi:file-multiple-outline" },
  { key: "related", label: "Related", icon: "mdi:link-variant" },
];

/* ─── Main Component ─── */
export default function LeadDetailPage() {
  const { id: idStr } = useParams();
  const id = Number(idStr);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getById, update, remove, updateStatus, getNotes, addNote, getReminders, addReminder, convertToNegotiation, getScore, updateLeadOutcomeStatus, sendReminderEmail } = useLead();
  const { getAll: getAllTasks } = useTask();
  const { getAll: getAllOpportunities } = useOpportunity();
  const { getAll: getAllOrganizations } = useOrganization();
  const { getAll: getAllContacts } = useContact();

  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [lead, setLead] = useState(null);
  const [score, setScore] = useState(null);
  const [notes, setNotes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [reminderDone, setReminderDone] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingField, setEditingField] = useState(null);
  const [inlineValue, setInlineValue] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const uploadInput = useRef(null);

  const [leadForm, setLeadForm] = useState({ leadFirstName: "", leadLastName: "", leadTitle: "", leadEmail: "", leadMobileNo: "", leadPhoneNo: "", leadOrganisationName: "", leadWebsite: "", leadIndustry: "", leadStatus: "New Lead", leadSource: "", leadCountry: "", leadCity: "", leadState: "", leadAddress: "", noOfEmployee: undefined, leadType: "", designation: "", leadReason: "", leadRef: "", enquiryStatus: "", quotationRevision: "" });

  function showToastMsg(type, message) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function populateEditForm(l) {
    setLeadForm({ leadFirstName: l.leadFirstName || "", leadLastName: l.leadLastName || "", leadTitle: l.leadTitle || "", leadEmail: l.leadEmail || "", leadMobileNo: l.leadMobileNo || "", leadPhoneNo: l.leadPhoneNo || "", leadOrganisationName: l.leadOrganisationName || "", leadWebsite: l.leadWebsite || "", leadIndustry: l.leadIndustry || "", leadStatus: l.leadStatus || "New Lead", leadSource: l.leadSource || "", leadCountry: l.leadCountry || "", leadCity: l.leadCity || "", leadState: l.leadState || "", leadAddress: l.leadAddress || "", noOfEmployee: l.noOfEmployee, leadType: l.leadType || "", designation: l.designation || "", leadReason: l.leadReason || "", leadRef: l.leadRef || "", enquiryStatus: l.enquiryStatus || "", quotationRevision: l.quotationRevision || "" });
  }

  const updateLeadGrade = async (stars) => {
    try {
      const updated = await update(lead.leadId, { ...lead, grade: stars }, {});
      setLead(updated);
      showToastMsg("success", "Grade updated");
    } catch { showToastMsg("error", "Failed to update grade"); }
  };

  const updateLeadRating = async (stars) => {
    try {
      const updated = await update(lead.leadId, { ...lead, leadRating: stars }, {});
      setLead(updated);
      showToastMsg("success", "Rating updated");
    } catch (error) { console.error(error); }
  };

  const loadAll = useCallback(async () => {
    setPageLoading(true);
    try {
      const baseLead = await getById(id);
      setLead(baseLead);
      const [n, r, s, opp, org, con, t] = await Promise.all([
        getNotes(id),
        getReminders(id),
        getScore(id).catch(() => null),
        getAllOpportunities().catch(() => []),
        getAllOrganizations().catch(() => []),
        getAllContacts().catch(() => []),
        getAllTasks().catch(() => []),
      ]);
      setNotes(n ?? []);
      setReminders(r ?? []);
      setScore(s);
      setOpportunities(opp ?? []);
      setOrganizations(org ?? []);
      setContacts(con ?? []);
      setTasks(t ?? []);
      populateEditForm(baseLead);
    } finally {
      setPageLoading(false);
    }
  }, [id]); // eslint-disable-line

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const leadName = useMemo(() => {
    if (!lead) return "Lead";
    return lead.companyContactPersonName || lead.leadOrganisationName || `${lead.leadFirstName || ""} ${lead.leadLastName || ""}`.trim() || "Lead";
  }, [lead]);

  const initials = useMemo(() => {
    const parts = leadName.split(" ").filter(Boolean);
    return (parts[0]?.[0] || "L") + (parts[1]?.[0] || "");
  }, [leadName]);

  const filesFromLead = useMemo(() => {
    if (!lead) return [];
    return [lead.uploadDocument, lead.uploadDocument1, lead.uploadDocument2, lead.uploadDocument3]
      .filter(Boolean)
      .map((path, idx) => ({ id: `${idx}-${path}`, path, name: path.split("/").pop() || `Document ${idx + 1}`, uploadedAt: lead.leadCreatedDate, size: "Unknown" }));
  }, [lead]);

  const relatedOpportunity = useMemo(() => opportunities.find((o) => o.leadIdFk === id) || null, [opportunities, id]);
  const relatedOrganization = useMemo(() => {
    if (!lead?.leadOrganisationName) return null;
    const orgName = lead.leadOrganisationName.toLowerCase();
    return organizations.find((o) => o.organizationName?.toLowerCase() === orgName) || null;
  }, [lead, organizations]);
  const relatedContact = useMemo(() => {
    if (!lead?.leadEmail && !lead?.leadMobileNo) return null;
    return contacts.find((c) => (lead?.leadEmail && c.contactEmail === lead.leadEmail) || (lead?.leadMobileNo && c.contactMobileNo === lead.leadMobileNo)) || null;
  }, [lead, contacts]);
  const linkedTasks = useMemo(() => {
    const key = leadName.toLowerCase();
    return tasks.filter((t) => String(t.taskRelatedTo || "").toLowerCase().includes(String(id)) || String(t.taskRelatedTo || "").toLowerCase().includes(key)).slice(0, 6);
  }, [tasks, leadName, id]);

  const infoFields = [
    { label: "Company Name", key: "leadOrganisationName", icon: "mdi:domain", value: lead?.leadOrganisationName },
    { label: "Contact Person", key: "companyContactPersonName", icon: "mdi:account-outline", value: lead?.companyContactPersonName },
    { label: "Mobile", key: "leadMobileNo", icon: "mdi:phone-outline", value: lead?.leadMobileNo },
    { label: "Email", key: "leadEmail", icon: "mdi:email-outline", value: lead?.leadEmail },
    { label: "Lead Source", key: "leadSource", icon: "mdi:source-branch", value: lead?.leadSource },
    { label: "Lead Group", key: "leadGroup", icon: "mdi:group", value: lead?.leadGroup },
    { label: "Enquiry Date", key: "inquiryDate", icon: "mdi:calendar-outline", value: lead?.inquiryDate ? formatDate(lead.inquiryDate) : null },
    { label: "Enquiry Description", key: "enquiryDescription", icon: "mdi:text-box-outline", value: lead?.enquiryDescription },
    { label: "Enquiry Type", key: "enquiryType", icon: "mdi:tag-outline", value: lead?.enquiryType },
    { label: "Enquiry Status", key: "enquiryStatus", icon: "mdi:clipboard-check-outline", value: lead?.enquiryStatus },
    { label: "Quotation Number", key: "quotationNumber", icon: "mdi:receipt-outline", value: lead?.quotationNumber },
    { label: "Quotation Revision", key: "quotationRevision", icon: "mdi:refresh", value: lead?.quotationRevision },
    { label: "Quotation Amount", key: "quotationAmount", icon: getCurrencyConfig(lead?.leadCountry).icon, value: lead?.quotationAmount != null ? formatCurrency(lead.quotationAmount, lead.leadCountry) : null },
    { label: "Follow Up Remark", key: "followUpRemark", icon: "mdi:comment-text-outline", value: lead?.followUpRemark },
  ];

  const customFields = useMemo(() => {
    if (!lead) return [];
    return [
      { label: "Lead Reason", icon: "mdi:information-outline", value: lead.leadReason || "Not set" },
      { label: "Unique Query ID", icon: "mdi:identifier", value: lead.uniqueQueryId || "Not set" },
      { label: "Created", icon: "mdi:clock-outline", value: lead.leadCreatedDate ? formatDateTime(lead.leadCreatedDate) : "Not set" },
    ];
  }, [lead]);

  const timelineItems = useMemo(() => {
    const items = [];
    if (lead?.leadCreatedDate) items.push({ id: "created", type: "status", text: `${leadName} created as lead`, date: lead.leadCreatedDate });
    notes.forEach((n) => items.push({ id: `note-${n.leadNoteId}`, type: "note", text: n.noteText, date: n.noteDate }));
    reminders.forEach((r) => items.push({ id: `reminder-${r.leadReminderId}`, type: "reminder", text: `Reminder: ${r.reminderText}`, date: r.reminderDate }));
    filesFromLead.forEach((f) => items.push({ id: `doc-${f.id}`, type: "document", text: `Document uploaded: ${f.name}`, date: lead?.leadCreatedDate }));
    return items.sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());
  }, [lead, notes, reminders, filesFromLead, leadName]);

  async function changeStatus(status) {
    setActionLoading(true);
    try {
      await updateStatus(lead.leadId, status);
      showToastMsg("success", "Status updated.");
      await loadAll();
    } catch {
      showToastMsg("error", "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function changeOutcomeStatus(status) {
    setActionLoading(true);
    try {
      await updateLeadOutcomeStatus(lead.leadId, status);
      showToastMsg("success", "Outcome status updated.");
      await loadAll();
    } catch {
      showToastMsg("error", "Failed to update outcome status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function transitionToStage(newStage) {
    setActionLoading(true);
    try {
      if (newStage === "Won") {
        await updateLeadOutcomeStatus(lead.leadId, "Won");
      } else if (newStage === "Closed") {
        await updateLeadOutcomeStatus(lead.leadId, "Closed");
      } else if (newStage === "Open") {
        await updateLeadOutcomeStatus(lead.leadId, "Open");
      } else if (newStage === "Qualified") {
        await updateStatus(lead.leadId, "Qualified");
        await updateLeadOutcomeStatus(lead.leadId, "");
      } else if (newStage === "New Lead") {
        await updateStatus(lead.leadId, "New Lead");
        await updateLeadOutcomeStatus(lead.leadId, "");
      }
      showToastMsg("success", `Lead moved to ${newStage}`);
      await loadAll();
    } catch (err) {
      console.error(err);
      showToastMsg("error", "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function submitNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setActionLoading(true);
    try {
      const note = await addNote(id, noteText.trim());
      setNotes((p) => [note, ...p]);
      setNoteText("");
      showToastMsg("success", "Note added.");
      window.dispatchEvent(new CustomEvent("crm-notification-refresh"));
    }
    catch { showToastMsg("error", "Failed to add note."); }
    finally { setActionLoading(false); }
  }

  function startEditNote(note) { setEditingNoteId(note.leadNoteId); setNoteDrafts((p) => ({ ...p, [note.leadNoteId]: note.noteText })); }
  function saveEditNote(noteId) { setNotes((p) => p.map((n) => n.leadNoteId === noteId ? { ...n, noteText: noteDrafts[noteId] || n.noteText } : n)); setEditingNoteId(null); showToastMsg("success", "Note updated."); }
  function deleteNote(noteId) { setNotes((p) => p.filter((n) => n.leadNoteId !== noteId)); showToastMsg("success", "Note deleted."); }

  async function submitReminder(e) {
    e.preventDefault();
    if (!reminderText.trim() || !reminderDate) return;
    setActionLoading(true);
    try {
      const dateObj = new Date(reminderDate);
      const formattedDate = dateObj.toISOString().replace("Z", "").split(".")[0];
      const rem = await addReminder(id, reminderText.trim(), formattedDate);
      setReminders((p) => [rem, ...p]);
      setReminderText(""); setReminderDate("");
      showToastMsg("success", "Reminder added.");
      window.dispatchEvent(new CustomEvent("crm-notification-refresh"));
    } catch (error) { console.error("Reminder Error:", error); showToastMsg("error", "Failed to add reminder."); }
    finally { setActionLoading(false); }
  }

  function toggleReminderDone(reminderId) { setReminderDone((p) => ({ ...p, [reminderId]: !p[reminderId] })); }

  async function handleSendReminderEmail(reminderId) {
    setActionLoading(true);
    try {
      await sendReminderEmail(reminderId);
      showToastMsg("success", "Reminder email sent successfully.");
      setReminders((prev) =>
        prev.map((r) =>
          r.leadReminderId === reminderId ? { ...r, sent: true } : r
        )
      );
    } catch (error) {
      console.error("Failed to send reminder email:", error);
      showToastMsg("error", "Failed to send reminder email.");
    } finally {
      setActionLoading(false);
    }
  }

  const handleConvert = async () => {
    setActionLoading(true);
  
    try {
      const response = await convertToNegotiation(id);
  
      showToastMsg(
        "success",
        response?.message || "Lead converted successfully."
      );
  
      // Explicitly sync leadOutcomeStatus so the Negotiation page sees 'Negotiation'
      // instead of the stale 'Open' value that was set before conversion.
      await updateLeadOutcomeStatus(id, "Negotiation");
  
      // Patch local state immediately so any re-render before loadAll reflects the new status
      setLead((prev) => prev ? { ...prev, leadOutcomeStatus: "Negotiation" } : prev);
  
      await loadAll();
  
      navigate("/negotiation");
    } catch (error) {
      console.error("Convert Error:", error);
  
      const message = error?.response?.data?.message;
  
      if (message === "Lead already converted to negotiation") {
        showToastMsg("info", "Lead is already converted.");
  
        navigate("/negotiation");
        return;
      }
  
      showToastMsg(
        "error",
        message || "Failed to convert lead."
      );
    } finally {
      setActionLoading(false);
    }
  };


  async function handleDelete() {
    setActionLoading(true);
    try { await remove(lead.leadId); navigate("/lead"); }
    catch { showToastMsg("error", "Failed to delete lead."); }
    finally { setActionLoading(false); }
  }

  async function saveEditPanel(formData) {
    setActionLoading(true);
    try {
      const payload = formData && typeof formData === "object" ? formData : leadForm;
      const updated = await update(lead.leadId, payload, {});
      setLead(updated); setShowEditPanel(false);
      showToastMsg("success", "Lead updated."); await loadAll();
    } catch { showToastMsg("error", "Failed to update lead."); }
    finally { setActionLoading(false); }
  }

  function beginInlineEdit(field, value) { setEditingField(field); setInlineValue(value == null ? "" : String(value)); }

  async function saveInlineEdit(field) {
    const payload = { ...lead, [field]: field === "noOfEmployee" ? (inlineValue ? Number(inlineValue) : undefined) : inlineValue };
    setActionLoading(true);
    try { const updated = await update(lead.leadId, payload, {}); setLead(updated); showToastMsg("success", "Field updated."); }
    catch (error) { console.error(error); showToastMsg("error", "Inline update failed."); }
    finally { setEditingField(null); setActionLoading(false); }
  }

  async function uploadFiles(files) {
    if (!files?.length || !lead) return;
    const fileList = Array.from(files);
    setSelectedFiles(fileList);
    const slots = ["uploadDocument", "uploadDocument1", "uploadDocument2", "uploadDocument3"];
    const fileMap = {};
    Array.from(files).slice(0, 4).forEach((file, index) => { fileMap[slots[index]] = file; });
    try {
      setUploading(true);
      await update(lead.leadId, { ...lead }, fileMap);
      await loadAll();
      showToastMsg("success", "Files uploaded successfully");
    } catch (error) { console.error(error); showToastMsg("error", "Upload failed"); }
    finally { setUploading(false); }
  }

  // Add this function in LeadDetailPage component
async function handleUploadFiles(fileMap) {
  try {
    // Upload files using the update function
    const updated = await update(lead.leadId, { ...lead }, fileMap);
    
    // Update the lead state with the new data
    setLead(updated);
    
    // Reload all data to refresh the documents tab
    await loadAll();
    
    showToastMsg("success", "Files uploaded successfully");
    return updated;
  } catch (error) {
    console.error("Upload failed:", error);
    showToastMsg("error", "Failed to upload files");
    throw error;
  }
}

  const grade = score?.grade || lead?.grade || "0";
  const gradeColors = gradeColor(grade);
  const days = daysSince(lead?.leadCreatedDate);
  const currentStage = getStageForLead(lead);
  const currentStepIndex = PIPELINE_STEPS.indexOf(currentStage);

  /* ─── Loading ─── */
  if (pageLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-48 bg-gradient-to-r from-slate-200 to-slate-100 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-[1fr_336px] gap-4">
        <div className="h-80 bg-gray-100 rounded-xl" />
        <div className="space-y-3"><div className="h-40 bg-gray-100 rounded-xl" /><div className="h-32 bg-gray-100 rounded-xl" /></div>
      </div>
    </div>
  );

  if (!lead) return (
    <div className="card p-10 text-center">
      <Icon name="mdi:alert-triangle-outline" className="h-9 w-9 text-red-500 mx-auto mb-3" />
      <h2 className="text-xl font-semibold text-gray-900">Lead not found</h2>
      <p className="text-base text-gray-500 mt-2">This lead may have been deleted or moved.</p>
      <Link to="/lead" className="btn-primary mt-5 inline-block">Go to Lead List</Link>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      <style>{`
        .hero-dark-card h1,
        .hero-dark-card h1.text-white,
        .hero-dark-card .text-white {
          color: #ffffff !important;
        }
        .hero-dark-card p,
        .hero-dark-card p.text-slate-400,
        .hero-dark-card .text-slate-400 {
          color: #cbd5e1 !important;
        }
        .hero-dark-card .text-slate-300,
        .hero-dark-card a,
        .hero-dark-card a.text-slate-300,
        .hero-dark-card span.text-slate-300 {
          color: #e2e8f0 !important;
        }
        .hero-dark-card a:hover,
        .hero-dark-card a.text-slate-300:hover,
        .hero-dark-card a.text-slate-300:hover * {
          color: #ffffff !important;
        }
        .hero-dark-card svg,
        .hero-dark-card .text-slate-400 svg {
          color: #94a3b8 !important;
        }
        .hero-dark-card button.bg-white {
          background-color: #ffffff !important;
          color: #1e293b !important;
        }
        .hero-dark-card button.bg-white\\/20 {
          background-color: rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
        }
        .hero-dark-card button.bg-white\\/5 {
          background-color: rgba(255, 255, 255, 0.05) !important;
          color: #94a3b8 !important;
        }
        .hero-dark-card button.bg-white span {
          color: #1e293b !important;
        }
        .hero-dark-card span.bg-emerald-500,
        .hero-dark-card span.bg-blue-600 {
          color: #ffffff !important;
        }
      `}</style>

      {/* ─── Back nav ─── */}
      <div className="flex items-center justify-between">
        <Link to="/lead" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <Icon name="mdi:arrow-left" className="h-4 w-4" />
          Back to Leads
        </Link>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm" onClick={() => navigate("/task")}>
            <Icon name="mdi:clipboard-check-outline" className="h-4 w-4" /> Add Task
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm" onClick={() => { setActiveTab("reminders"); }}>
            <Icon name="mdi:bell-outline" className="h-4 w-4" /> Reminder
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200" onClick={() => setShowEditPanel(true)}>
            <Icon name="mdi:pencil-outline" className="h-4 w-4" /> Edit Lead
          </button>
        </div>
      </div>

      {/* ─── Hero Header ─── */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg hero-dark-card">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 50%)" }} />

        <div className="relative px-6 pt-6 pb-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className={`h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shrink-0 ${gradeColors.bg} ${gradeColors.text}`}>
              {initials}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white leading-tight">{leadName}</h1>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusChip(lead.leadStatus)}`}>
                  {lead.leadStatus}
                </span>
                {lead.leadOutcomeStatus && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    lead.leadOutcomeStatus === "Negotiation"
                      ? "bg-yellow-400/20 text-yellow-200 border-yellow-400/30"
                      : lead.leadOutcomeStatus === "Won"
                        ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30"
                        : lead.leadOutcomeStatus === "Open"
                          ? "bg-purple-400/20 text-purple-200 border-purple-400/30"
                          : "bg-white/10 text-white/90 border-white/20"
                  }`}>
                    {lead.leadOutcomeStatus}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">Lead #{lead.leadId} · {lead.leadOrganisationName || "No organization"}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-300">
                {lead.leadMobileNo && (
                  <a href={`tel:${lead.leadMobileNo}`} className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors">
                    <Icon name="mdi:phone-outline" className="h-4.5 w-4.5 text-slate-400" />{lead.leadMobileNo}
                  </a>
                )}
                {lead.leadEmail && (
                  <a href={`mailto:${lead.leadEmail}`} className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors">
                    <Icon name="mdi:email-outline" className="h-4.5 w-4.5 text-slate-400" />{lead.leadEmail}
                  </a>
                )}
                {lead.leadSource && (
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Icon name="mdi:source-branch" className="h-4.5 w-4.5 text-slate-400" />{lead.leadSource}
                  </span>
                )}
              </div>
            </div>

            {/* Star rating */}
            <div className="flex flex-col items-center gap-2">
              <StarRating grade={lead?.leadRating || 0} score={score?.score} size="text-sm" onChange={updateLeadRating} />
              {score?.score && <span className="text-xs text-slate-400">Score: {score.score}/100</span>}
            </div>
          </div>

          {/* Pipeline Stepper */}
          <div className="mt-5 pb-5 flex items-center gap-0 overflow-x-auto scrollbar-none">
            {PIPELINE_STEPS.map((step, idx) => {
              const isActive = step === currentStage;
              const isPast = currentStepIndex > idx;
              const isLast = idx === PIPELINE_STEPS.length - 1;
              return (
                <div key={step} className="flex items-center flex-1 min-w-0">
                  <button
                    onClick={() => transitionToStage(step)}
                    disabled={actionLoading}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${isActive ? "bg-white text-slate-800 shadow-lg" : isPast ? "bg-white/20 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
                  >
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? "bg-blue-600 text-white" : isPast ? "bg-emerald-500 text-white" : "bg-white/20 text-slate-400"}`}>
                      {isPast ? "✓" : idx + 1}
                    </span>
                    {step}
                  </button>
                  {!isLast && (
                    <div className={`flex-1 h-px mx-1 ${isPast || isActive ? "bg-white/40" : "bg-white/10"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Lead Score", icon: "mdi:star-circle-outline", iconColor: "text-amber-500",
            iconBg: "bg-amber-50",
            value: score ? `${score.score}` : "—",
            sub: score ? `Grade ${score.grade}` : "Not scored",
            accent: "border-l-amber-400",
          },
          {
            label: "Quotation Value", icon: getCurrencyConfig(lead.leadCountry).icon, iconColor: "text-emerald-600",
            iconBg: "bg-emerald-50",
            value: lead.quotationAmount != null ? formatCurrency(lead.quotationAmount, lead.leadCountry) : "—",
            sub: lead.quotationNumber || "No quotation",
            accent: "border-l-emerald-400",
          },
          {
            label: "Days Active", icon: "mdi:clock-outline", iconColor: "text-blue-500",
            iconBg: "bg-blue-50",
            value: days != null ? `${days}` : "—",
            sub: days != null ? "days since created" : "No date",
            accent: "border-l-blue-400",
          },
          {
            label: "Notes & Reminders", icon: "mdi:note-multiple-outline", iconColor: "text-violet-500",
            iconBg: "bg-violet-50",
            value: `${notes.length + reminders.length}`,
            sub: `${notes.length} notes · ${reminders.length} reminders`,
            accent: "border-l-violet-400",
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 border-l-4 ${kpi.accent} hover:shadow-md transition-shadow`}>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
              <Icon name={kpi.icon} className={`h-5 w-5 ${kpi.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</p>
              <p className="text-xs text-gray-400 truncate">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_320px]">

        {/* ─── Main Content (Tabs) ─── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-4 border-b border-gray-100 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 pb-3 pt-1 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"}`}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                {tab.label}
                {tab.key === "notes" && notes.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{notes.length}</span>
                )}
                {tab.key === "reminders" && reminders.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{reminders.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ─── OVERVIEW TAB ─── */}
            {activeTab === "overview" && (
              <section className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {infoFields.map((field) => (
                    <div key={field.key} className="group rounded-xl border border-gray-100 bg-gray-50/50 p-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="h-7 w-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                            <Icon name={field.icon} className="h-3.5 w-3.5 text-gray-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">{field.label}</p>
                            {editingField === field.key ? (
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  value={inlineValue}
                                  onChange={(e) => setInlineValue(e.target.value)}
                                  className="input-field text-sm flex-1"
                                  autoFocus
                                  onKeyDown={(e) => { if (e.key === "Enter") saveInlineEdit(field.key); if (e.key === "Escape") setEditingField(null); }}
                                />
                                <button className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium" onClick={() => saveInlineEdit(field.key)}>Save</button>
                                <button className="px-2 py-1 rounded-lg border border-gray-200 text-xs" onClick={() => setEditingField(null)}>✕</button>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-800 font-medium truncate">
                                {field.value || <span className="text-gray-400 italic text-xs">Click to add</span>}
                              </p>
                            )}
                          </div>
                        </div>
                        {editingField !== field.key && (
                          <button
                            onClick={() => beginInlineEdit(field.key, field.value || "")}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white text-gray-400 hover:text-blue-600 transition-all shrink-0"
                          >
                            <Icon name="mdi:pencil-outline" className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Extra fields */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {customFields.map((field) => (
                      <div key={field.label} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon name={field.icon} className="h-3.5 w-3.5 text-gray-400" />
                          <p className="text-xs text-gray-400 font-medium">{field.label}</p>
                        </div>
                        <p className="text-sm text-gray-800 font-medium">{field.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ─── TIMELINE TAB ─── */}
            {activeTab === "activity" && (
              <section>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                {!timelineItems.length ? (
                  <div className="text-center py-16 text-gray-400">
                    <Icon name="mdi:timeline-outline" className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No activity yet.</p>
                  </div>
                ) : (
                  <div className="relative pl-8">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                    <div className="space-y-4">
                      {timelineItems.map((item) => {
                        const { icon, color } = timelineIcon(item.type);
                        return (
                          <div key={item.id} className="relative">
                            <div className={`absolute -left-[22px] h-7 w-7 rounded-full flex items-center justify-center shadow-sm ${color}`}>
                              <Icon name={icon} className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 hover:border-gray-200 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-800 leading-relaxed">{item.text}</p>
                                <span className="text-xs uppercase font-medium text-gray-400 shrink-0 px-2 py-0.5 rounded-full bg-white border border-gray-100">{item.type}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1.5">{formatDateTime(item.date)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ─── NOTES TAB ─── */}
            {activeTab === "notes" && (
              <section className="space-y-4">
                <h3 className="text-base font-semibold text-gray-900">Notes</h3>
                <form className="space-y-3" onSubmit={submitNote}>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows="3"
                    className="input-field min-h-[96px] resize-none text-sm"
                    placeholder="Write a note about this lead..."
                  />
                  <div className="flex justify-end">
                    <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={actionLoading || !noteText.trim()}>
                      <Icon name="mdi:send-outline" className="h-4 w-4" /> Add Note
                    </button>
                  </div>
                </form>
                {!notes.length ? (
                  <div className="text-center py-12 text-gray-400">
                    <Icon name="mdi:note-text-outline" className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No notes yet. Add one above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((n) => (
                      <article key={n.leadNoteId} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 hover:border-gray-200 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">{initials}</div>
                          <div className="flex-1 min-w-0">
                            {editingNoteId === n.leadNoteId ? (
                              <div className="space-y-2">
                                <textarea value={noteDrafts[n.leadNoteId] || ""} onChange={(e) => setNoteDrafts((p) => ({ ...p, [n.leadNoteId]: e.target.value }))} rows="3" className="input-field text-sm resize-none" />
                                <div className="flex gap-2">
                                  <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium" onClick={() => saveEditNote(n.leadNoteId)}>Save</button>
                                  <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs" onClick={() => setEditingNoteId(null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{n.noteText}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">{formatDateTime(n.noteDate)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {editingNoteId !== n.leadNoteId && (
                              <button className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-gray-400 hover:text-blue-600 transition-all" onClick={() => startEditNote(n)}>
                                <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                              </button>
                            )}
                            <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all" onClick={() => deleteNote(n.leadNoteId)}>
                              <Icon name="mdi:trash-can-outline" className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ─── REMINDERS TAB ─── */}
            {activeTab === "reminders" && (
              <section className="space-y-4">
                <h3 className="text-base font-semibold text-gray-900">Reminders</h3>
                <form className="bg-gray-50/50 rounded-xl border border-gray-100 p-4 space-y-3" onSubmit={submitReminder}>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Reminder Text *</label>
                    <input value={reminderText} onChange={(e) => setReminderText(e.target.value)} className="input-field text-sm" placeholder="Follow-up call, proposal review..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date & Time *</label>
                      <input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className="input-field text-sm" />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50" disabled={actionLoading}>
                        <Icon name="mdi:bell-plus-outline" className="h-4 w-4" /> Add Reminder
                      </button>
                    </div>
                  </div>
                </form>
                {!reminders.length ? (
                  <div className="text-center py-12 text-gray-400">
                    <Icon name="mdi:bell-outline" className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No reminders set.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reminders.map((r) => (
                      <div key={r.leadReminderId} className={`rounded-xl border p-4 flex items-start justify-between gap-3 transition-colors ${reminderDone[r.leadReminderId] ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-gray-100 hover:border-gray-200"}`}>
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${reminderDone[r.leadReminderId] ? "bg-emerald-100" : "bg-amber-100"}`}>
                            <Icon name={reminderDone[r.leadReminderId] ? "mdi:check-circle-outline" : "mdi:bell-outline"} className={`h-5 w-5 ${reminderDone[r.leadReminderId] ? "text-emerald-600" : "text-amber-600"}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${reminderDone[r.leadReminderId] ? "line-through text-gray-400" : "text-gray-800"}`}>{r.reminderText}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-gray-400">{formatDateTime(r.reminderDate)}</p>
                              {r.sent && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">
                                  <Icon name="mdi:check-circle" className="h-3 w-3" /> Sent
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSendReminderEmail(r.leadReminderId)}
                            disabled={actionLoading || reminderDone[r.leadReminderId]}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-100 bg-violet-50 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Send email reminder now"
                          >
                            <Icon name="mdi:email-send-outline" className="h-3.5 w-3.5" />
                            Send Email
                          </button>
                          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer shrink-0">
                            <input type="checkbox" checked={!!reminderDone[r.leadReminderId]} onChange={() => toggleReminderDone(r.leadReminderId)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                            <span className={reminderDone[r.leadReminderId] ? "text-emerald-600 font-semibold" : ""}>
                              {reminderDone[r.leadReminderId] ? "Done" : "Mark done"}
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ─── DOCUMENTS TAB ─── */}
            {/* ─── DOCUMENTS TAB ─── */}
{activeTab === "documents" && (
  <section className="space-y-4">
    <h3 className="text-base font-semibold text-gray-900">Documents</h3>
    
    {/* Display existing documents */}
    {filesFromLead.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filesFromLead.map((doc, index) => {
          let path = doc.path || "";
          if (path.startsWith("uploads") && !path.startsWith("uploads/")) {
            path = path.replace("uploads", "uploads/");
          }
          const fileUrl = path.startsWith("http") ? path : `https://api-test.richgoldshine.com/${path}`;
          const ext = doc.name.split(".").pop()?.toLowerCase();
          const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
          const isPdf = ext === "pdf";

          return (
            <div key={doc.id || index} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 flex items-center gap-3 hover:border-blue-200 hover:bg-blue-50/20 transition-all">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${isImage ? "bg-pink-50" : isPdf ? "bg-red-50" : "bg-blue-50"}`}>
                <Icon name={isImage ? "mdi:image-outline" : isPdf ? "mdi:file-pdf-box" : "mdi:file-document-outline"} className={`h-6 w-6 ${isImage ? "text-pink-500" : isPdf ? "text-red-500" : "text-blue-500"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                <p className="text-xs text-gray-400">{doc.uploadedAt ? formatDate(doc.uploadedAt) : "Unknown date"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => { setPreviewFile(fileUrl); setShowPreview(true); }} className="px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-colors">
                  <Icon name="mdi:eye-outline" className="h-3.5 w-3.5 inline mr-1" />View
                </button>
                <a href={fileUrl} download target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-200 transition-colors">
                  <Icon name="mdi:download" className="h-3.5 w-3.5 inline mr-1" />Download
                </a>
              </div>
            </div>
          );
        })}
      </div>
    )}

    {/* Upload zone - same as in edit panel but also in documents tab */}
    <div
      className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/20 transition-all cursor-pointer"
      onDrop={(e) => { e.preventDefault(); handleUploadFiles(e.dataTransfer?.files); }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => uploadInput.current?.click()}
    >
      <Icon name={uploading ? "mdi:loading" : "mdi:cloud-upload-outline"} className={`h-10 w-10 text-gray-400 mx-auto mb-3 ${uploading ? "animate-spin" : ""}`} />
      <p className="text-sm font-medium text-gray-700">{uploading ? "Uploading..." : "Drag & drop files here"}</p>
      <p className="text-xs text-gray-400 mt-1">or click to browse · PDF, Images, Documents (up to 4 files)</p>
      <button type="button" className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 shadow-sm">
        <Icon name="mdi:plus" className="h-4 w-4" /> Choose Files
      </button>
      <input ref={uploadInput} type="file" className="hidden" multiple onChange={(e) => handleUploadFiles(e.target.files)} />
      {uploading && (
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}
    </div>
  </section>
)}

            {/* ─── RELATED TAB ─── */}
            {activeTab === "related" && (
              <section className="space-y-4">
                <h3 className="text-base font-semibold text-gray-900">Related Records</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: "Opportunity", icon: "mdi:briefcase-outline", iconColor: "text-violet-600", iconBg: "bg-violet-50", main: relatedOpportunity?.oppName || "Not linked", sub: relatedOpportunity?.oppStatus || "No status", linked: !!relatedOpportunity },
                    { label: "Organization", icon: "mdi:domain", iconColor: "text-blue-600", iconBg: "bg-blue-50", main: relatedOrganization?.organizationName || lead.leadOrganisationName || "Not linked", sub: relatedOrganization?.organizationCity || lead.leadCity || "No location", linked: !!relatedOrganization },
                    { label: "Contact", icon: "mdi:account-outline", iconColor: "text-emerald-600", iconBg: "bg-emerald-50", main: relatedContact?.contactName || leadName, sub: relatedContact?.contactEmail || lead.leadEmail || "No email", linked: !!relatedContact },
                    { label: "Linked Tasks", icon: "mdi:clipboard-check-outline", iconColor: "text-amber-600", iconBg: "bg-amber-50", main: `${linkedTasks.length} task(s)`, sub: linkedTasks.length ? linkedTasks[0]?.taskName : "No tasks linked", linked: linkedTasks.length > 0 },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${item.linked ? "border-gray-200 bg-white hover:border-blue-200" : "border-gray-100 bg-gray-50/50"}`}>
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                        <Icon name={item.icon} className={`h-5 w-5 ${item.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{item.label}</p>
                        <p className={`text-sm font-semibold ${item.linked ? "text-gray-900" : "text-gray-400"}`}>{item.main}</p>
                        {item.sub && <p className="text-xs text-gray-400">{item.sub}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* ─── Right Sidebar ─── */}
        <aside className="xl:sticky xl:top-20 h-fit space-y-4">

          {/* Actions Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h3>
            <button className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setShowEditPanel(true)}>
              <Icon name="mdi:pencil-outline" className="h-4 w-4 text-blue-500" /> Edit Lead
            </button>
            {lead?.leadOutcomeStatus !== "Negotiation" ? (
              <button
                className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm shadow-blue-200 disabled:opacity-50"
                disabled={actionLoading}
                onClick={handleConvert}
              >
                <Icon
                  name="mdi:briefcase-arrow-right-outline"
                  className="h-4 w-4"
                />
                Convert to Negotiation
              </button>
            ) : (
              <button
                className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
                onClick={() => navigate("/negotiation")}
              >
                <Icon
                  name="mdi:briefcase-check-outline"
                  className="h-4 w-4"
                />
                Already Converted
              </button>
            )}
            <a href={`mailto:${lead.leadEmail || ""}`} className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Icon name="mdi:email-send-outline" className="h-4 w-4 text-violet-500" /> Send Email
            </a>
            <button className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors" disabled={actionLoading} onClick={() => setShowDeleteConfirm(true)}>
              <Icon name="mdi:trash-can-outline" className="h-4 w-4" /> Delete Lead
            </button>
          </div>

          {/* Lead Score Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lead Score</h3>
            {score ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner ${gradeColors.bg} ${gradeColors.text}`}>
                    {score.grade}
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{score.score}</p>
                    <p className="text-xs text-gray-400">out of 100</p>
                  </div>
                </div>
                {/* Score bar */}
                <div className="space-y-1">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${score.score >= 80 ? "bg-emerald-500" : score.score >= 60 ? "bg-blue-500" : score.score >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score.score}%` }} />
                  </div>
                </div>
                {(score.topFactors ?? []).length > 0 && (
                  <ul className="space-y-1.5">
                    {score.topFactors.map((factor) => (
                      <li key={factor} className="flex items-start gap-2 text-xs text-gray-600">
                        <Icon name="mdi:check-circle-outline" className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                <Icon name="mdi:star-outline" className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Score not available</p>
              </div>
            )}
          </div>

          {/* Status & Tags */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Lead Status (Lifecycle)</label>
              <select value={lead.leadStatus || "New Lead"} disabled={actionLoading} onChange={(e) => changeStatus(e.target.value)} className="input-field text-sm w-full">
                <option value="New Lead">New Lead</option>
                <option value="Qualified">Qualified</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Disqualified">Disqualified</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Outcome Status (Pipeline)</label>
              <select value={lead.leadOutcomeStatus || ""} disabled={actionLoading} onChange={(e) => changeOutcomeStatus(e.target.value)} className="input-field text-sm w-full">
                <option value="">None</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Open">Open (In Progress)</option>
                <option value="Won">Won (Deal Won)</option>
                <option value="Closed">Closed (Lost)</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Active Tags</p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusChip(lead.leadStatus)}`}>{lead.leadStatus}</span>
                {lead.leadOutcomeStatus && <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    lead.leadOutcomeStatus === "Negotiation" ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : lead.leadOutcomeStatus === "Open" ? "bg-purple-50 text-purple-700 border-purple-200"
                    : lead.leadOutcomeStatus === "Won" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}>{lead.leadOutcomeStatus}</span>}
                {lead.leadSource && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">{lead.leadSource}</span>}
                {lead.leadType && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">{lead.leadType}</span>}
              </div>
            </div>
          </div>

          {/* Related Records */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Related</h3>
            <div className="space-y-2">
              {[
                { label: "Opportunity", main: relatedOpportunity?.oppName || "Not linked", sub: relatedOpportunity?.oppStatus || "" },
                { label: "Organization", main: relatedOrganization?.organizationName || lead.leadOrganisationName || "Not linked", sub: "" },
                { label: "Contact", main: relatedContact?.contactName || leadName, sub: "" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-gray-100 p-2.5 bg-gray-50/50">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{item.main}</p>
                  {item.sub && <p className="text-xs text-gray-400">{item.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming Tasks</h3>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium" onClick={() => navigate("/task")}>+ Add</button>
            </div>
            {linkedTasks.length ? (
              <div className="space-y-2">
                {linkedTasks.map((task) => (
                  <div key={task.taskId} className="rounded-lg border border-gray-100 p-2.5 bg-gray-50/50 flex items-start gap-2">
                    <Icon name="mdi:clipboard-check-outline" className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.taskName}</p>
                      <p className="text-xs text-gray-400">{task.taskDueDate ? formatDate(task.taskDueDate) : "No due date"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">No linked tasks</p>
            )}
          </div>

          {/* Team */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Assignee</h3>
            <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5 bg-gray-50/50">
              <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                {lead.userIdFk ? `U${lead.userIdFk}` : "NA"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{lead.userIdFk ? `User ${lead.userIdFk}` : "Unassigned"}</p>
                <p className="text-xs text-gray-400">Sales Representative</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── Edit Panel (Slide-in) ─── */}
      {showEditPanel && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowEditPanel(false)} />
          <div className="relative w-full max-w-[640px] h-full bg-white shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon name="mdi:pencil-outline" className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white leading-tight">Edit Lead</h2>
                <p className="text-xs text-blue-100 mt-0.5 truncate">Updating: {leadName}</p>
              </div>
              <button onClick={() => setShowEditPanel(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-colors">
                <Icon name="mdi:close" className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <LeadForm initial={lead} loading={actionLoading} onSubmit={saveEditPanel} onUploadFiles={handleUploadFiles} />
            </div>
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70 shrink-0">
              <div className="text-xs text-gray-400">
                <span className="text-red-500">*</span> Required fields
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditPanel(false)}
                  className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => document.getElementById("lead-form")?.requestSubmit()}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {actionLoading ? (
                    <Icon name="mdi:loading" className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon name="mdi:check-circle-outline" className="w-4 h-4" />
                  )}
                  {actionLoading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Preview Modal ─── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-[92vw] h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Icon name="mdi:file-document-outline" className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Document Preview</h3>
              </div>
              <button type="button" onClick={() => { setShowPreview(false); setPreviewFile(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors">
                <Icon name="mdi:close" className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1">
              <iframe src={previewFile} title="Document Preview" className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm ─── */}
      <AppConfirmDialog open={showDeleteConfirm} title="Delete Lead" message="Delete this lead permanently? This action cannot be undone." onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />

      {/* ─── Toast ─── */}
      {toast && createPortal(
        <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          <Icon name={toast.type === "success" ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"} className="h-5 w-5" />
          {toast.message}
        </div>,
        document.body
      )}
    </div>
  );
}
