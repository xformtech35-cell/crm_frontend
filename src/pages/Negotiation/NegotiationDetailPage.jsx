import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useNegotiation } from "../../hooks/useNegotiation";
import { useLead } from "../../hooks/useLead";
import { cleanFileName } from "../../utils/format";

export default function NegotiationDetailPage() {
  const leadApi = useLead();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const negotiationApi = useNegotiation();

  const queryParams = new URLSearchParams(location.search);
  const shouldEdit = queryParams.get("edit") === "true" || location.state?.edit === true;

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(shouldEdit);
  const [editedLead, setEditedLead] = useState({});
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [revisions, setRevisions] = useState([]);
  const [showRevisions, setShowRevisions] = useState(true);
  const [revisionLoading, setRevisionLoading] = useState(false);

  // Document states
  const [documentFile, setDocumentFile] = useState(null);
  const [documentFiles, setDocumentFiles] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [documentExists, setDocumentExists] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadLead();
    loadRevisions();
    checkDocumentExists();
    if (shouldEdit) {
      setIsEditing(true);
    }
  }, [id, location.search]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const response = await negotiationApi.getDetails(id);
      setLead(response.lead || response);
      setEditedLead(response.lead || response);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load lead details");
    } finally {
      setLoading(false);
    }
  };

  const loadRevisions = async () => {
    try {
      setRevisionLoading(true);
      const data = await negotiationApi.getRevisions(id);
      setRevisions(data || []);
    } catch (err) {
      console.error("Failed to load revisions:", err);
    } finally {
      setRevisionLoading(false);
    }
  };

  const checkDocumentExists = async () => {
    try {
      const exists = await negotiationApi.checkDocument(id);
      setDocumentExists(exists);
    } catch (err) {
      setDocumentExists(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedLead({ ...lead });
    setError("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedLead({ ...lead });
    setError("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedLead((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "quotationRevision" && value) {
        const selectedRevCode = value.toUpperCase();
        const baseQuotNo = (lead?.quotationNumber || "").replace(/\/R\d+$/i, "");

        const matchingRev = (revisions || []).find(r =>
          (r.revisionNo || r.quotationRevision || "R0").toUpperCase() === selectedRevCode
        );

        if (matchingRev) {
          if (matchingRev.quotationNo) {
            updated.quotationNumber = matchingRev.quotationNo;
          } else if (selectedRevCode === "R0") {
            updated.quotationNumber = baseQuotNo;
          } else {
            updated.quotationNumber = `${baseQuotNo}/${selectedRevCode}`;
          }

          if (matchingRev.quotationAmount != null && Number(matchingRev.quotationAmount) > 0) {
            updated.quotationAmount = matchingRev.quotationAmount;
          }
          if (matchingRev.remarks) {
            updated.followUpRemark = matchingRev.remarks;
          }
          if (matchingRev.enquiryDescription) {
            updated.enquiryDescription = matchingRev.enquiryDescription;
          }
          if (matchingRev.quotationDate) {
            updated.quotationDate = matchingRev.quotationDate;
          }
        } else {
          if (selectedRevCode === "R0") {
            updated.quotationNumber = baseQuotNo;
          } else {
            updated.quotationNumber = `${baseQuotNo}/${selectedRevCode}`;
          }
        }
      }
      return updated;
    });
  };

  // const handleSaveEdit = async (e) => {
  //   e.preventDefault();
  //   try {
  //     setUpdating(true);
  //     setError("");
  //     await leadApi.update(lead.leadId, editedLead);
  //     await loadLead();
  //     setIsEditing(false);
  //   } catch (err) {
  //     console.error("Error updating lead:", err);
  //     setError(err.message || "Failed to update lead. Please try again.");
  //   } finally {
  //     setUpdating(false);
  //   }
  // };
  const handleSaveEdit = async (e) => {
    e.preventDefault();

    try {
      setUpdating(true);
      setError("");

      const payload = {
        ...editedLead,
        quotationWorkingDate: editedLead.quotationDate || editedLead.quotationWorkingDate,
        quotationDate: editedLead.quotationDate || editedLead.quotationWorkingDate,
      };

      // 1. Update lead
      const response = await leadApi.update(lead.leadId, payload);

      const quotationNumber =
        response?.data?.quotationNumber ||
        response?.quotationNumber ||
        editedLead.quotationNumber;

      // 2. Upload files after successful update
      if (quotationNumber && documentFiles.length > 0) {
        await negotiationApi.uploadQuotationDocuments(
          quotationNumber,
          documentFiles
        );
      }

      // 3. Refresh & Notify views
      await loadLead();
      await loadRevisions();

      window.dispatchEvent(new CustomEvent("crm-data-updated"));

      setDocumentFiles([]);
      setIsEditing(false);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update lead.");
    } finally {
      setUpdating(false);
    }
  };

  // Document handlers
  // const handleFileChange = (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     setDocumentFile(file);
  //   }
  // };
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setDocumentFiles(files);
  };

  const handleUploadDocument = async () => {
    if (!documentFile) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError("");

      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await negotiationApi.uploadDocument(id, documentFile);

      clearInterval(interval);
      setUploadProgress(100);

      setDocumentExists(true);
      setDocumentFile(null);

      const fileInput = document.getElementById('document-upload');
      if (fileInput) fileInput.value = '';

      setTimeout(() => setUploadProgress(0), 1000);
      await checkDocumentExists();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docIdOrQuotationNo) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      if (typeof docIdOrQuotationNo === 'number' || (typeof docIdOrQuotationNo === 'string' && /^\d+$/.test(docIdOrQuotationNo))) {
        await negotiationApi.deleteDocumentById(docIdOrQuotationNo);
      } else if (typeof docIdOrQuotationNo === 'string' && docIdOrQuotationNo.includes('/')) {
        await negotiationApi.deleteDocumentsByQuotationNo(docIdOrQuotationNo);
      } else {
        await negotiationApi.deleteDocument(id);
      }

      // Also clear document fields on lead object to prevent fallback caching
      if (lead?.leadId) {
        try {
          await leadApi.update(lead.leadId, {
            ...lead,
            uploadDocument: null,
            uploadDocument1: null,
            uploadDocument2: null,
            uploadDocument3: null
          });
        } catch (e) {
          console.warn("Could not clear lead doc fields:", e);
        }
      }

      setDocumentExists(false);
      await loadLead();
      await loadRevisions();
      await checkDocumentExists();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete document. Please try again.');
    }
  };

  const handleViewDocument = () => {
    if (documentExists) {
      negotiationApi.viewDocument(id);
    }
  };

  const handleDownloadDocument = async () => {
    if (documentExists) {
      try {
        const leadName = lead?.leadOrganisationName || 'document';
        await negotiationApi.downloadDocument(id, `${leadName}-${id}.pdf`);
      } catch (err) {
        setError('Failed to download document');
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="text-center">
          <Icon icon="mdi:alert-circle" className="text-6xl text-gray-400 mx-auto" />
          <h2 className="text-2xl font-bold mt-4 text-gray-700">Negotiation Not Found</h2>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleAddNewRevision = () => {
    setIsEditing(true);
    const currentRevStr = lead?.quotationRevision || "R0";
    const currentNum = parseInt(currentRevStr.replace(/\D/g, ""), 10) || 0;
    const nextRevStr = `R${currentNum + 1}`;

    let currentQuotNo = lead?.quotationNumber || "";
    if (currentQuotNo) {
      if (/\/R\d+$/i.test(currentQuotNo)) {
        currentQuotNo = currentQuotNo.replace(/\/R\d+$/i, `/${nextRevStr}`);
      } else {
        currentQuotNo = `${currentQuotNo}/${nextRevStr}`;
      }
    }

    setEditedLead({
      ...lead,
      quotationRevision: nextRevStr,
      quotationNumber: currentQuotNo,
      followUpRemark: ""
    });
    setError("");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Clean Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 text-gray-700"
              title="Go Back"
            >
              <Icon icon="mdi:arrow-left" className="text-xl" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">
                  {isEditing ? "Edit Negotiation Details" : "Negotiation Details"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  {lead?.quotationRevision || "R0"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                  {lead?.leadOutcomeStatus || "Negotiation"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-700">{lead?.leadOrganisationName}</span>
                <span>•</span>
                <span>Quotation No: <strong className="text-gray-800 font-mono">{lead?.quotationNumber || "—"}</strong></span>
              </p>
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddNewRevision}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 transition shadow-sm text-xs"
              >
                <Icon icon="mdi:plus-circle" className="text-base" /> + Add New Revision
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition shadow-sm text-xs"
              >
                <Icon icon="mdi:pencil" className="text-base" /> Edit Commercials
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 max-w-7xl mx-auto pb-12">
        <ViewMode
          lead={lead}
          revisions={revisions}
          revisionLoading={revisionLoading}
          showRevisions={showRevisions}
          setShowRevisions={setShowRevisions}
          documentExists={documentExists}
          handleViewDocument={handleViewDocument}
          handleDownloadDocument={handleDownloadDocument}
          handleDeleteDocument={handleDeleteDocument}
          negotiationApi={negotiationApi}
        />
      </div>

      {/* Edit Form - Slide-in Panel */}
      {isEditing && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={handleCancelEdit} />
          <div className="fixed top-0 right-0 h-screen w-full lg:w-[60%] xl:w-[55%] bg-white shadow-2xl overflow-y-auto z-50 animate-slide-in">
            <EditForm
              lead={editedLead}
              revisions={revisions}
              negotiationApi={negotiationApi}
              onCancel={handleCancelEdit}
              onSave={handleSaveEdit}
              onChange={handleInputChange}
              updating={updating}
              error={error}
              documentExists={documentExists}
              onDocumentUpload={handleUploadDocument}
              onDocumentDelete={handleDeleteDocument}
              onFileChange={handleFileChange}
              uploading={uploading}
              uploadProgress={uploadProgress}
              documentFile={documentFiles}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ============= VIEW MODE =============

const ViewMode = ({
  lead,
  revisions,
  revisionLoading,
  showRevisions,
  setShowRevisions,
  documentExists,
  handleViewDocument,
  handleDownloadDocument,
  handleDeleteDocument,
  negotiationApi
}) => (
  <div className="grid lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-6">
      <InfoSection title="Quotation & Commercials" fields={getCommercialFields(lead)} />

      <DocumentSection
        documentExists={documentExists}
        handleViewDocument={handleViewDocument}
        handleDownloadDocument={handleDownloadDocument}
        handleDeleteDocument={handleDeleteDocument}
      />

      <RevisionHistorySection
        revisions={revisions}
        loading={revisionLoading}
        showRevisions={showRevisions}
        setShowRevisions={setShowRevisions}
        lead={lead}
        negotiationApi={negotiationApi}
      />

      <InfoSection title="General Client Information" fields={getGeneralFields(lead)} />
    </div>

    <div className="space-y-4">
      <StatCard title="Quotation Value" value={formatCurrency(lead.quotationAmount)} icon="mdi:currency-inr" color="blue" />
      <StatCard title="Revision" value={lead.quotationRevision || "R0"} icon="mdi:file-document-edit" color="amber" />
      <StatCard title="Lead Status" value={lead.leadStatus || "—"} icon="mdi:chart-timeline-variant" color="indigo" />
      <StatCard title="Outcome Status" value={lead.leadOutcomeStatus || "—"} icon="mdi:flag-outline" color="emerald" />
      <StatCard title="Lead Source" value={lead.leadSource || "—"} icon="mdi:source-branch" color="purple" />
    </div>
  </div>
);

// ============= DOCUMENT SECTION =============

const DocumentSection = ({
  documentExists,
  handleViewDocument,
  handleDownloadDocument,
  handleDeleteDocument
}) => {
  if (!documentExists) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
          <Icon icon="mdi:file-document-outline" className="text-blue-500" />
          Attached Quotation Document
        </h3>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-green-600">
            <Icon icon="mdi:check-circle" className="text-xl" />
            <span className="text-sm font-medium">Document uploaded</span>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <button onClick={handleViewDocument} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition">
              <Icon icon="mdi:eye" className="text-lg" /> View
            </button>
            <button onClick={handleDownloadDocument} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition">
              <Icon icon="mdi:download" className="text-lg" /> Download
            </button>
            <button onClick={handleDeleteDocument} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition">
              <Icon icon="mdi:delete" className="text-lg" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatDateDisplay = (dateVal) => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return String(dateVal);
  }
};

const formatDateTimeDisplay = (dateVal) => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (e) {
    return String(dateVal);
  }
};

// ============= REVISION HISTORY SECTION =============

export const RevisionHistorySection = ({ revisions = [], loading, showRevisions, setShowRevisions, lead, negotiationApi }) => {
  const [selectedRevId, setSelectedRevId] = useState(null);
  const [viewMode, setViewMode] = useState("tabs"); // "tabs" or "vertical"

  const safeRevisions = Array.isArray(revisions) ? revisions : [];

  const displayRevisions = React.useMemo(() => {
    const map = new Map();
    safeRevisions.forEach((rev) => {
      const key = rev.revisionNo || rev.quotationRevision || "R0";
      if (!map.has(key) || new Date(rev.updatedDate || 0) > new Date(map.get(key).updatedDate || 0)) {
        map.set(key, { ...rev });
      }
    });

    const leadWorkingDate = lead?.quotationWorkingDate || lead?.quotationDate || null;
    const leadSentDate = lead?.quotationSentDate || lead?.sentQuotationDate || null;

    if (!map.has("R0")) {
      const baseQtnNo = (lead?.quotationNumber || lead?.quotationNo || "").replace(/\/R\d+$/, "") || "QTN-001";
      const r0Date = lead?.inquiryDate || lead?.leadCreatedDate || lead?.createdDate || new Date().toISOString();

      map.set("R0", {
        id: "r0-fallback",
        revisionNo: "R0",
        quotationNo: baseQtnNo,
        quotationAmount: lead?.quotationAmount || 0,
        negotiationStatus: "Negotiation",
        remarks: lead?.followUpRemark || "Initial Baseline Proposal",
        enquiryDescription: lead?.enquiryDescription,
        updatedDate: r0Date,
        quotationWorkingDate: (lead?.quotationRevision === "R0" && leadWorkingDate) ? leadWorkingDate : (lead?.inquiryDate || r0Date),
        sentQuotationDate: leadSentDate,
        documents: []
      });
    }

    map.forEach((rev, key) => {
      const isCurrentRev = key === (lead?.quotationRevision || "R0");
      const specificRevDate = rev.quotationDate || rev.quotationWorkingDate;

      if (specificRevDate) {
        rev.quotationWorkingDate = specificRevDate;
      } else if (isCurrentRev && leadWorkingDate) {
        rev.quotationWorkingDate = leadWorkingDate;
      } else if (key === "R0") {
        rev.quotationWorkingDate = lead?.inquiryDate || rev.updatedDate;
      } else {
        rev.quotationWorkingDate = rev.updatedDate || rev.createdDate;
      }

      if (!rev.sentQuotationDate && isCurrentRev) {
        rev.sentQuotationDate = leadSentDate;
      }
    });

    const r0 = map.get("R0");
    if (r0) {
      if (!r0.updatedDate || String(r0.updatedDate).startsWith("2020")) {
        r0.updatedDate = lead?.inquiryDate || lead?.leadCreatedDate || lead?.createdDate || r0.updatedDate;
      }
      if ((!r0.documents || r0.documents.length === 0) && lead) {
        const leadDocs = [
          lead?.uploadDocument,
          lead?.uploadDocument1,
          lead?.uploadDocument2,
          lead?.uploadDocument3
        ].filter(Boolean).map((url, i) => {
          let name = url.substring(url.lastIndexOf('/') + 1);
          if (name.includes('_')) {
            name = name.substring(name.indexOf('_') + 1);
          }
          return {
            id: `doc-r0-${i}`,
            fileName: name,
            fileUrl: url,
            fileType: url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
          };
        });
        if (leadDocs.length > 0) {
          r0.documents = leadDocs;
          r0.documentCount = leadDocs.length;
        }
      }
    }

    return [...map.values()].sort((a, b) => {
      const numA = parseInt((a.revisionNo || "R0").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt((b.revisionNo || "R0").replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [safeRevisions, lead]);

  const chronologicalRevisions = displayRevisions;

  const latestRevision = React.useMemo(() => {
    if (!displayRevisions || displayRevisions.length === 0) return null;
    return displayRevisions[displayRevisions.length - 1];
  }, [displayRevisions]);

  const verticalTimelineRevisions = React.useMemo(() => {
    return [...displayRevisions].reverse();
  }, [displayRevisions]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
            <Icon icon="mdi:history" className="text-blue-500" />
            Revision History
          </h3>
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!displayRevisions || displayRevisions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
            <Icon icon="mdi:history" className="text-blue-500" />
            Revision History
          </h3>
        </div>
        <div className="p-6 text-center text-gray-400">
          <Icon icon="mdi:history" className="text-4xl mx-auto mb-2 opacity-50" />
          <p>No revision history found</p>
        </div>
      </div>
    );
  }

  const activeSelectedRev = selectedRevId
    ? displayRevisions.find(r => r.id === selectedRevId) || latestRevision
    : latestRevision;

  const currentQuotationNo = lead?.quotationNumber || lead?.quotationNo || "N/A";
  const currentRevisionNo = lead?.quotationRevision || latestRevision?.revisionNo || "R0";
  const currentAmount = lead?.quotationAmount || latestRevision?.quotationAmount || 0;
  const currentStatus = lead?.leadOutcomeStatus || latestRevision?.negotiationStatus || "Negotiation";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Card Title Bar */}
      <div
        className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <Icon icon="mdi:history" className="text-blue-600 text-lg" />
            Revision Timeline ({displayRevisions.length})
          </h3>
          <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode("tabs")}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${viewMode === "tabs" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              Tabs View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("vertical")}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${viewMode === "vertical" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              All Timeline
            </button>
          </div>
        </div>
        <button type="button" onClick={() => setShowRevisions(!showRevisions)} className="text-gray-400 hover:text-gray-600">
          <Icon icon={showRevisions ? "mdi:chevron-up" : "mdi:chevron-down"} className="text-xl" />
        </button>
      </div>

      {/* Commercial Summary Banner */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-slate-50/50">
        <div className="flex flex-wrap gap-2 items-center bg-white p-2.5 rounded-lg border border-gray-200/60 shadow-sm text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase font-bold tracking-wide text-gray-400">Quotation No.</span>
            <span className="font-mono font-semibold text-gray-800 text-xs">{currentQuotationNo}</span>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase font-bold tracking-wide text-gray-400">Current Revision</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 w-fit">{currentRevisionNo}</span>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase font-bold tracking-wide text-gray-400">Current Amount</span>
            <span className="font-bold text-gray-900 text-xs">{formatCurrency(currentAmount)}</span>
          </div>
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase font-bold tracking-wide text-gray-400">Status</span>
            <span className={getRevStatusClass(currentStatus)}>{currentStatus}</span>
          </div>
        </div>
      </div>

      {/* HORIZONTAL TIMELINE STEPPER TABS (R0 -> R1 -> R2...) */}
      {showRevisions && (
        <div className="border-b border-gray-200 bg-slate-50/70 p-4">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Icon icon="mdi:timeline-text-outline" className="text-blue-600 text-sm" />
            Revision Sequence (Click tab to view details)
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {chronologicalRevisions.map((rev, idx) => {
              const isSelected = activeSelectedRev.id === rev.id;
              const isLatest = rev.id === latestRevision.id;
              return (
                <React.Fragment key={rev.id}>
                  {idx > 0 && <Icon icon="mdi:arrow-right" className="text-gray-300 flex-shrink-0 text-sm" />}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRevId(rev.id);
                      setViewMode("tabs");
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex-shrink-0 shadow-sm ${isSelected
                      ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                  >
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isSelected ? "bg-white/20 text-white" : isLatest ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>
                      {rev.revisionNo}
                    </span>
                    <span className="font-bold">{formatCurrency(rev.quotationAmount || 0)}</span>
                    {isLatest && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                        }`}>
                        Active
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {showRevisions && viewMode === "tabs" && (
        <div className="p-6 bg-white">
          <div className="border border-blue-200 rounded-xl p-5 bg-blue-50/20 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">Revision {activeSelectedRev.revisionNo}</span>
                {activeSelectedRev.id === latestRevision.id ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">Current Active</span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Superseded</span>
                )}
              </div>
              <span className={getRevStatusClass(activeSelectedRev.negotiationStatus)}>{activeSelectedRev.negotiationStatus || "Negotiation"}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-lg border border-gray-200/80 mb-3 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block mb-0.5 font-bold uppercase tracking-wider">Quotation Amount</span>
                <span className="font-bold text-gray-900 text-base">{formatCurrency(activeSelectedRev.quotationAmount || 0)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block mb-0.5 font-bold uppercase tracking-wider">Quotation Working Date</span>
                <span className="font-semibold text-gray-800 text-xs">
                  {formatDateDisplay(activeSelectedRev.quotationWorkingDate || activeSelectedRev.updatedDate)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block mb-0.5 font-bold uppercase tracking-wider">Quotation Sent Date</span>
                <span className="font-semibold text-gray-700 text-xs">
                  {formatDateTimeDisplay(lead?.quotationSentDate || activeSelectedRev.createdDate)}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200/80 mb-3">
              <span className="font-bold text-gray-400 block text-[9px] uppercase tracking-wider mb-1">Follow Up & Revision Remarks</span>
              {activeSelectedRev.remarks || <em className="text-gray-400">No remarks logged for this revision.</em>}
            </div>

            {/* Attached Documents for Selected Tab */}
            {activeSelectedRev.documents && activeSelectedRev.documents.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-500 block text-[10px] uppercase tracking-wider mb-2">
                  Attached Quotation File ({activeSelectedRev.documents.length})
                </span>
                <div className="space-y-2">
                  {activeSelectedRev.documents.map((doc) => (
                    <div key={doc.id || doc.fileName} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs shadow-sm">
                      <div className="flex items-center gap-2 truncate">
                        <Icon icon="mdi:file-pdf-box" className="text-red-500 text-lg flex-shrink-0" />
                        <span className="truncate font-semibold text-gray-800 max-w-[280px]" title={cleanFileName(doc.fileName)}>{cleanFileName(doc.fileName)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {negotiationApi?.handleViewDocument && (
                          <button type="button" onClick={() => negotiationApi.handleViewDocument(doc.fileUrl || doc.fileName, doc.fileName)} className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition">View</button>
                        )}
                        {negotiationApi?.handleDownloadRevisionDocument && (
                          <button type="button" onClick={() => negotiationApi.handleDownloadRevisionDocument(doc.fileUrl || doc.fileName, doc.fileName)} className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition">Download</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showRevisions && viewMode === "vertical" && (
        <div className="p-4 sm:p-6 bg-gray-50/30 space-y-4 sm:space-y-6">
          {verticalTimelineRevisions.map((rev, idx) => {
            const isLatest = Boolean(latestRevision && rev.id === latestRevision.id);
            return (
              <div key={rev.id} className="relative flex gap-4 sm:gap-6 pl-4 pb-2 last:pb-0">
                {idx < verticalTimelineRevisions.length - 1 && (
                  <span className="absolute left-[21px] sm:left-[25px] top-6 bottom-0 w-0.5 bg-blue-100" aria-hidden="true" />
                )}
                <div className="relative z-10 flex h-4 w-4 sm:h-5 sm:w-5 flex-none items-center justify-center rounded-full bg-white mt-1">
                  {isLatest ? (
                    <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                  ) : (
                    <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-gray-300 ring-4 ring-gray-150" />
                  )}
                </div>
                <div className={`flex-1 bg-white rounded-xl border p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 ${isLatest ? "border-blue-200 ring-1 ring-blue-50" : "border-gray-200/60"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-bold text-gray-900">Revision {rev.revisionNo}</span>
                      {isLatest ? (
                        <span className="text-[8px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Active</span>
                      ) : (
                        <span className="text-[8px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200/60">Superseded</span>
                      )}
                    </div>
                    <span className={getRevStatusClass(rev.negotiationStatus)}>{rev.negotiationStatus || "Negotiation"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 bg-gray-50/50 p-2 sm:p-2.5 rounded-lg border border-gray-100 mb-2 text-[10px] sm:text-xs">
                    <div>
                      <span className="text-[8px] sm:text-[10px] text-gray-400 block mb-0.5 font-bold uppercase tracking-wider">Amount</span>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm">{formatCurrency(rev.quotationAmount || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] sm:text-[10px] text-gray-400 block mb-0.5 font-bold uppercase tracking-wider">Working Date</span>
                      <span className="font-semibold text-gray-800 text-[10px] sm:text-xs">
                        {formatDateDisplay(rev.quotationWorkingDate || rev.updatedDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] sm:text-[10px] text-gray-400 block mb-0.5 font-bold uppercase tracking-wider">Logged Date & Time</span>
                      <span className="font-semibold text-gray-700 text-[10px] sm:text-xs">
                        {formatDateTimeDisplay(rev.updatedDate || rev.createdDate)}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 leading-relaxed bg-slate-50/20 p-2 rounded-lg border border-dashed border-gray-100 mb-3">
                    <span className="font-bold text-gray-500 block text-[8px] sm:text-[9px] uppercase tracking-wider mb-0.5">Remarks</span>
                    {rev.remarks || <em className="text-gray-400">No remarks added.</em>}
                  </div>

                  {/* Attached Documents */}
                  {rev.documents && rev.documents.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="font-bold text-gray-500 block text-[8px] sm:text-[9px] uppercase tracking-wider mb-1.5">
                        Attached Quotation File ({rev.documents.length})
                      </span>
                      <div className="space-y-1.5">
                        {rev.documents.map((doc) => (
                          <div key={doc.id || doc.fileName} className="flex items-center justify-between rounded-lg border bg-gray-50 px-2.5 py-1.5 text-xs">
                            <span className="truncate font-medium text-gray-700 max-w-[200px]" title={cleanFileName(doc.fileName)}>{cleanFileName(doc.fileName)}</span>
                            <div className="flex items-center gap-1">
                              {negotiationApi?.handleViewDocument && (
                                <button type="button" onClick={() => negotiationApi.handleViewDocument(doc.fileUrl || doc.fileName)} className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700">View</button>
                              )}
                              {negotiationApi?.handleDownloadRevisionDocument && (
                                <button type="button" onClick={() => negotiationApi.handleDownloadRevisionDocument(doc.fileUrl || doc.fileName, doc.fileName)} className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-medium hover:bg-emerald-700">Download</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const getRevStatusClass = (status) => {
  if (status === "Superseded") return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-400 border border-gray-200/60";
  if (status === "Negotiation") return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100";
  if (status === "Won") return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100";
  if (status === "Lost") return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100";
  if (status === "Open") return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100";
  if (status === "Closed") return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200";
  return "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100";
};

// ============= EDIT FORM =============

const EditForm = ({
  lead,
  revisions = [],
  negotiationApi,
  onCancel,
  onSave,
  onChange,
  updating,
  error,
  documentExists,
  onDocumentUpload,
  onDocumentDelete,
  onFileChange,
  uploading,
  uploadProgress,
  documentFile
}) => {
  const [replaceMode, setReplaceMode] = useState(false);

  // Dynamic document lookup for selected revision level
  const selectedRevCode = (lead.quotationRevision || "R0").toUpperCase();
  const matchingRevision = (revisions || []).find(r => (r.revisionNo || "R0").toUpperCase() === selectedRevCode);

  let currentRevDocs = [];
  if (matchingRevision && matchingRevision.documents && matchingRevision.documents.length > 0) {
    currentRevDocs = [matchingRevision.documents[matchingRevision.documents.length - 1]];
  }

  const hasExistingDocs = currentRevDocs.length > 0 && !replaceMode;

  return (
    <div className="h-full flex flex-col">
      {/* Form Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Icon icon="mdi:calculator-variant" className="text-blue-600" />
              Edit Negotiation & Commercials
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Update quotation amount, revision level (R1, R2...), outcome status, and upload revised documents.
            </p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <Icon icon="mdi:close" className="text-xl text-gray-600" />
          </button>
        </div>
      </div>

      <form id="negotiation-edit-form" onSubmit={onSave} className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm flex items-center">
            <Icon icon="mdi:alert-circle" className="mr-2 text-red-500" />
            {error}
          </div>
        )}

        {/* 1. Quotation & Commercial Details (PRIMARY FOR NEGOTIATIONS) */}
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden ring-1 ring-blue-50">
          <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <Icon icon="mdi:currency-inr" className="text-blue-600" />
              Quotation Commercials & Revision
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">High Priority</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Quotation Amount (₹)" name="quotationAmount" value={lead.quotationAmount || ""} onChange={onChange} type="number" placeholder="e.g. 150000" required />
              <FormField label="Quotation Number" name="quotationNumber" value={lead.quotationNumber || ""} onChange={onChange} placeholder="UWS/26-27/224/R1" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Revision Level</label>
                <select
                  name="quotationRevision"
                  value={lead.quotationRevision || "R0"}
                  onChange={(e) => {
                    setReplaceMode(false);
                    onChange(e);
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm bg-white font-semibold"
                >
                  {Array.from({ length: 11 }, (_, i) => <option key={i} value={`R${i}`}>Revision R{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deal Outcome Status</label>
                <select name="leadOutcomeStatus" value={lead.leadOutcomeStatus || "Negotiation"} onChange={onChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm bg-white font-semibold">
                  <option value="Negotiation">Negotiation (In Progress)</option>
                  <option value="Quotation Sent">Quotation Sent</option>
                  <option value="Won">Deal Won (Closed-Won)</option>
                  <option value="Lost">Deal Lost (Closed-Lost)</option>
                </select>
              </div>
              <FormField label="Quotation Working Date" name="quotationDate" value={lead.quotationDate ? String(lead.quotationDate).split("T")[0] : ""} onChange={onChange} type="date" />
              <FormField label="Final Quotation Sent Date" name="quotationSentDate" value={formatDate(lead.quotationSentDate) ? String(lead.quotationSentDate).split("T")[0] : ""} onChange={onChange} type="date" />
            </div>
          </div>
        </div>

        {/* 2. Dynamic Document Upload & Viewer per Selected Revision */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Icon icon="mdi:file-document-outline" className="text-blue-500 text-lg" />
              Quotation File for {selectedRevCode}
            </h3>
            {hasExistingDocs && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <Icon icon="mdi:check-circle" /> Document Attached
              </span>
            )}
          </div>
          <div className="p-6">
            {hasExistingDocs ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium">Existing attached documents for {selectedRevCode}:</p>
                {currentRevDocs.map((doc) => (
                  <div key={doc.id || doc.fileName} className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon icon="mdi:file-pdf-box" className="text-red-500 text-2xl flex-shrink-0" />
                      <span className="text-xs font-semibold text-gray-800 truncate max-w-[220px]" title={cleanFileName(doc.fileName)}>{cleanFileName(doc.fileName)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {negotiationApi?.handleViewDocument && (
                        <button
                          type="button"
                          onClick={() => negotiationApi.handleViewDocument(doc.fileUrl || doc.fileName, doc.fileName)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1 transition"
                        >
                          <Icon icon="mdi:eye" /> View
                        </button>
                      )}
                      {negotiationApi?.handleDownloadRevisionDocument && (
                        <button
                          type="button"
                          onClick={() => negotiationApi.handleDownloadRevisionDocument(doc.fileUrl || doc.fileName, doc.fileName)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1 transition"
                        >
                          <Icon icon="mdi:download" /> Download
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setReplaceMode(true);
                          if (onDocumentDelete) {
                            onDocumentDelete(doc.id || doc.quotationNo || selectedRevCode);
                          }
                        }}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium flex items-center gap-1 transition"
                      >
                        <Icon icon="mdi:delete" /> Delete / Replace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {replaceMode && (
                  <div className="mb-3 flex items-center justify-between bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-800">
                    <span>Replacing file for <strong>{selectedRevCode}</strong>. Upload a new PDF below:</span>
                    <button type="button" onClick={() => setReplaceMode(false)} className="text-blue-600 underline font-semibold">Cancel Replace</button>
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <Icon icon="mdi:cloud-upload-outline" className="text-4xl text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700 mb-1">Attach Revised Quotation PDF for {selectedRevCode}</p>
                  <p className="text-xs text-gray-500 mb-3">Drop revised PDF here or click to browse</p>
                  <input
                    id="document-upload"
                    type="file"
                    multiple
                    onChange={onFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                  />
                  <label htmlFor="document-upload" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm">
                    Choose PDF / File
                  </label>
                  {documentFile.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {documentFile.map((file, index) => (
                        <div key={index} className="text-xs text-blue-700 font-bold bg-blue-50 p-2 rounded border border-blue-100 flex items-center justify-center gap-2">
                          <Icon icon="mdi:file-document-check" className="text-base" /> Selected: {cleanFileName(file.name)}
                        </div>
                      ))}
                    </div>
                  )}

                  {uploading && (
                    <div className="mt-4">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{uploadProgress}% uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Revision Remarks & Description */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Icon icon="mdi:note-text-outline" className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Negotiation Remarks & Notes</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up & Revision Remarks ({selectedRevCode})</label>
                <textarea name="followUpRemark" value={lead.followUpRemark || ""} onChange={onChange} rows="3" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" placeholder={`Remarks for ${selectedRevCode}... e.g. Revised quote with 5% discount.`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Scope Description</label>
                <textarea name="enquiryDescription" value={lead.enquiryDescription || ""} onChange={onChange} rows="3" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" placeholder="Scope description..." />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Basic Client Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Icon icon="mdi:information-outline" className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Basic Client Information</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Company Name" name="leadOrganisationName" value={lead.leadOrganisationName || ""} onChange={onChange} required />
              <FormField label="Contact Person Name" name="companyContactPersonName" value={lead.companyContactPersonName || ""} onChange={onChange} />
              <FormField label="Contact Phone" name="leadMobileNo" value={lead.leadMobileNo || ""} onChange={onChange} type="tel" placeholder="Phone/Mobile Number" />
              <FormField label="Contact Email" name="leadEmail" value={lead.leadEmail || ""} onChange={onChange} type="email" placeholder="email@example.com" />
              <FormField label="Enquiry Date" name="inquiryDate" value={lead.inquiryDate ? String(lead.inquiryDate).split("T")[0] : ""} onChange={onChange} type="date" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
                <select
                  name="leadSource"
                  value={lead.leadSource || "Direct"}
                  onChange={onChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm bg-white font-medium"
                >
                  <option value="Direct">Direct</option>
                  <option value="Website">Website</option>
                  <option value="Ref/Exhibition">Ref / Exhibition</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Email Campaign">Email Campaign</option>
                  <option value="Partner">Partner</option>
                </select>
              </div>
              <FormField label="City" name="leadCity" value={lead.leadCity || ""} onChange={onChange} placeholder="e.g. Mumbai" />
              <FormField label="State" name="leadState" value={lead.leadState || ""} onChange={onChange} placeholder="e.g. Maharashtra" />
              <FormField label="Country" name="leadCountry" value={lead.leadCountry || "India"} onChange={onChange} placeholder="e.g. India" />
            </div>
          </div>
        </div>
      </form>

      {/* Fixed Form Footer Actions (Pinned to Absolute Bottom of Drawer) */}
      <div className="px-6 py-3.5 border-t border-gray-200 bg-white flex-shrink-0 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-20">
        <div className="text-xs text-gray-500 font-medium hidden sm:block">
          Updating Revision: <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-100">{selectedRevCode}</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button type="button" onClick={onCancel} disabled={updating} className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50 text-sm">
            Cancel
          </button>
          <button type="submit" form="negotiation-edit-form" disabled={updating} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm">
            {updating ? (
              <><Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> Saving Revision...</>
            ) : (
              <><Icon icon="mdi:content-save-outline" className="w-4 h-4" /> Save Negotiation Revision ({selectedRevCode})</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============= HELPERS =============

const FormField = ({ label, name, value, onChange, type = "text", required = false, placeholder = "" }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input type={type} name={name} value={value || ""} onChange={onChange} required={required} placeholder={placeholder} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm bg-white" />
  </div>
);

const InfoSection = ({ title, fields }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">{title}</h3>
    </div>
    <div className="grid md:grid-cols-2 gap-4 p-6">
      {fields.map((field, index) => <InfoRow key={index} label={field.label} value={field.value} />)}
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
  </div>
);

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all duration-200">
    <div className="flex justify-between items-start">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-lg font-bold mt-1 text-gray-800 truncate">{value}</p>
      </div>
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 ml-3">
        <Icon icon={icon} className="text-blue-600 text-xl" />
      </div>
    </div>
  </div>
);

const formatCurrency = (amount) => {
  if (!amount) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB");
};

const getGeneralFields = (lead) => [
  { label: "Company Name", value: lead.leadOrganisationName },
  { label: "Contact Person", value: lead.companyContactPersonName },
  { label: "Phone", value: lead.leadMobileNo },
  { label: "Email", value: lead.leadEmail },
  { label: "Country", value: lead.leadCountry },
  { label: "City", value: lead.leadCity },
  { label: "State", value: lead.leadState },
  { label: "Address", value: lead.leadAddress },
];

const getCommercialFields = (lead) => [
  { label: "Quotation Number", value: lead.quotationNumber },
  { label: "Quotation Amount", value: formatCurrency(lead.quotationAmount) },
  { label: "Quotation Revision", value: lead.quotationRevision || "R0" },
  { label: "Quotation Working Date", value: formatDate(lead.quotationDate) },
  { label: "Sent Date", value: formatDate(lead.quotationSentDate) },
  { label: "Follow Up Remarks", value: lead.followUpRemark },
];