import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useNegotiation } from "../../hooks/useNegotiation";
import Icon from "../../components/Icon";
import { formatDate, formatCurrency } from "../../utils/format";

export default function QuotationDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const negotiationApi = useNegotiation();

  const [quotation, setQuotation] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRevision, setExpandedRevision] = useState(null);

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedFiles, setImportedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useState(null);

  useEffect(() => {
    console.log("Quotation ID from URL:", id);
    loadQuotationDetail();
  }, [id]);

  const loadQuotationDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      if (location.state?.deal) {
        console.log("Using data from navigation state:", location.state.deal);
        const dealData = location.state.deal;
        setQuotation(dealData);

        try {
          const revResponse = await negotiationApi.getRevisions(dealData.id);
          let revData = revResponse?.data || revResponse || [];
          console.log("Raw revisions received:", revData);

          const uniqueRevs = deduplicateRevisions(revData);
          console.log("Unique revisions:", uniqueRevs);
          setRevisions(uniqueRevs);
        } catch (revErr) {
          console.error("Error loading revisions:", revErr);
          setRevisions([]);
        }

        setLoading(false);
        return;
      }

      try {
        const allResponse = await negotiationApi.getMyNegotiations();
        const allData = allResponse?.data || allResponse || [];

        const found = allData.find(item => {
          return String(item.id) === String(id) ||
            String(item.negotiationId) === String(id) ||
            String(item.leadId) === String(id);
        });

        if (found) {
          console.log("Found negotiation:", found);
          setQuotation(found);

          try {
            const revResponse = await negotiationApi.getRevisions(found.id || found.negotiationId);
            let revData = revResponse?.data || revResponse || [];
            console.log("Raw revisions received:", revData);

            const uniqueRevs = deduplicateRevisions(revData);
            console.log("Unique revisions:", uniqueRevs);
            setRevisions(uniqueRevs);
          } catch (revErr) {
            console.error("Error loading revisions:", revErr);
            setRevisions([]);
          }

          setLoading(false);
          return;
        }
      } catch (allErr) {
        console.error("Error fetching all negotiations:", allErr);
      }

      try {
        const response = await negotiationApi.getById(id);
        const data = response?.data || response;

        if (data) {
          setQuotation(data);

          try {
            const revResponse = await negotiationApi.getRevisions(id);
            let revData = revResponse?.data || revResponse || [];
            console.log("Raw revisions received:", revData);

            const uniqueRevs = deduplicateRevisions(revData);
            console.log("Unique revisions:", uniqueRevs);
            setRevisions(uniqueRevs);
          } catch (revErr) {
            console.error("Error loading revisions:", revErr);
            setRevisions([]);
          }

          setLoading(false);
          return;
        }
      } catch (getErr) {
        console.error("getById failed:", getErr);
      }

      try {
        const response = await negotiationApi.getByLeadId(id);
        const data = response?.data || response;

        if (data) {
          setQuotation(data);

          try {
            const revResponse = await negotiationApi.getRevisions(data.id || data.negotiationId);
            let revData = revResponse?.data || revResponse || [];
            console.log("Raw revisions received:", revData);

            const uniqueRevs = deduplicateRevisions(revData);
            console.log("Unique revisions:", uniqueRevs);
            setRevisions(uniqueRevs);
          } catch (revErr) {
            console.error("Error loading revisions:", revErr);
            setRevisions([]);
          }

          setLoading(false);
          return;
        }
      } catch (leadErr) {
        console.error("getByLeadId failed:", leadErr);
      }

      throw new Error("Could not find quotation with ID: " + id);

    } catch (error) {
      console.error("Error loading quotation:", error);
      setError(error.message || "Failed to load quotation details");
      setLoading(false);
    }
  };

  // Function to deduplicate revisions
  const deduplicateRevisions = (revData) => {
    if (!revData || revData.length === 0) return [];

    const uniqueMap = new Map();

    revData.forEach(rev => {
      const revNumber = rev.revisionNo ||
        rev.revisionNumber ||
        rev.revision ||
        rev.quotationRevision;

      if (revNumber && !uniqueMap.has(revNumber)) {
        uniqueMap.set(revNumber, rev);
      }
    });

    const uniqueRevisions = Array.from(uniqueMap.values());

    return uniqueRevisions.sort((a, b) => {
      const aNum = parseInt(String(a.revisionNo || a.revisionNumber || a.revision || a.quotationRevision || '0').replace('R', ''));
      const bNum = parseInt(String(b.revisionNo || b.revisionNumber || b.revision || b.quotationRevision || '0').replace('R', ''));
      return aNum - bNum;
    });
  };

  const toggleRevision = (idx) => {
    if (expandedRevision === idx) {
      setExpandedRevision(null);
    } else {
      setExpandedRevision(idx);
    }
  };

  // File management functions
  const handleFileUpload = (files) => {
    const validFiles = Array.from(files).filter(file =>
      file.type === 'application/pdf' ||
      file.type.startsWith('image/') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    )

    if (validFiles.length === 0) {
      alert('Please upload supported file types (PDF, Images, Word, Excel)')
      return
    }

    const newFiles = validFiles.map(file => ({
      id: Date.now() + Math.random() * 1000 + importedFiles.length,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))

    setImportedFiles(prev => [...prev, ...newFiles])
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files)
    }
  }

  const removeFile = (fileId) => {
    setImportedFiles(prev => prev.filter(f => f.id !== fileId))
    if (selectedFile?.id === fileId) {
      setSelectedFile(null)
      setFilePreview(null)
    }
  }

  const viewFile = (file) => {
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setFilePreview(file.preview)
    } else if (file.type === 'application/pdf') {
      setFilePreview(URL.createObjectURL(file.file))
    } else {
      setFilePreview(null)
    }
  }

  const closePreview = () => {
    setSelectedFile(null)
    setFilePreview(null)
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return 'mdi:file-image-outline'
    if (type === 'application/pdf') return 'mdi:file-pdf-box'
    if (type.includes('word')) return 'mdi:file-word-box'
    if (type.includes('excel') || type.includes('spreadsheet')) return 'mdi:file-excel-box'
    return 'mdi:file-outline'
  }

  const getFileColor = (type) => {
    if (type.startsWith('image/')) return 'text-purple-500'
    if (type === 'application/pdf') return 'text-red-500'
    if (type.includes('word')) return 'text-blue-500'
    if (type.includes('excel') || type.includes('spreadsheet')) return 'text-green-500'
    return 'text-gray-500'
  }

  const getStatusClass = (status) => {
    switch (status) {
      case "Negotiation": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Won": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Lost": return "bg-rose-50 text-rose-700 border-rose-200";
      case "Closed": return "bg-gray-50 text-gray-600 border-gray-200";
      default: return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64">
        <div className="text-center">
          <Icon name="mdi:loading" className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-blue-500 mx-auto mb-2 sm:mb-3" />
          <p className="text-xs sm:text-sm text-gray-500">Loading quotation details...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="text-center py-8 sm:py-12 px-4">
        <Icon name="mdi:file-document-outline" className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3" />
        <p className="text-sm sm:text-base text-gray-500">{error || "Quotation not found"}</p>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-1">ID: {id}</p>
        <Link to="/negotiation" className="text-blue-600 hover:underline text-xs sm:text-sm mt-2 inline-block">
          Back to Negotiations
        </Link>
      </div>
    );
  }

  const quotationNo = quotation.quotationNo ||
    quotation.quotationNumber ||
    quotation.qtnNo ||
    quotation.number ||
    'N/A';

  const currentRevision = quotation.quotationRevision ||
    quotation.revision ||
    quotation.revisionNo ||
    'R0';

  // Filter out the active revision
  const filteredRevisions = revisions.filter(rev => {
    const revNumber = rev.revisionNo || rev.revisionNumber || rev.revision || rev.quotationRevision;
    return String(revNumber) !== String(currentRevision);
  });

  // If there are no other revisions, show the active one
  const displayRevisions = filteredRevisions.length > 0 ? filteredRevisions : revisions;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-full sm:max-w-6xl mx-auto">
      {/* Header - Responsive */}
      <div className="min-w-0 flex-1">

        {/* Main Header Card */}
        <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl border border-gray-100 p-3 sm:p-4 md:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            {/* Left side - Revision History */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon name="mdi:file-document-outline" className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                  Revision History
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 ml-0 sm:ml-11">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs text-gray-400">Quotation</span>
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {quotationNo}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs text-gray-400">Current</span>
                  <span className="text-[10px] sm:text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {currentRevision}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Icon name="mdi:file-document-multiple-outline" className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                  <span className="text-[10px] sm:text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{displayRevisions.length}</span>
                    <span className="hidden xs:inline"> revision{displayRevisions.length !== 1 ? 's' : ''}</span>
                  </span>
                </div>

                {quotation.quotationAmount && (
                  <div className="flex items-center gap-1.5">
                    <Icon name="mdi:currency-inr" className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                    <span className="text-[10px] sm:text-xs font-semibold text-green-600">
                      {formatCurrency(quotation.quotationAmount, quotation.leadCountry || 'INR')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Back button and Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 shrink-0">
              {/* Back to Negotiations Button */}
              <Link
                to="/negotiation"
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 group shadow-sm hover:shadow-md whitespace-nowrap"
              >
                <Icon name="mdi:arrow-left" className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-xs sm:text-sm font-medium">Negotiations</span>
              </Link>

              {/* Status Badge */}
              {/* <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold border ${getStatusClass(quotation.leadOutcomeStatus || quotation.status)} flex items-center gap-1.5 whitespace-nowrap shadow-sm`}>
                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${quotation.leadOutcomeStatus === 'Won' ? 'bg-emerald-500' :
                    quotation.leadOutcomeStatus === 'Negotiation' ? 'bg-yellow-500' :
                      quotation.leadOutcomeStatus === 'Lost' ? 'bg-rose-500' :
                        quotation.leadOutcomeStatus === 'Closed' ? 'bg-gray-500' :
                          'bg-blue-500'
                    }`}></span>
                  {quotation.leadOutcomeStatus || quotation.status || 'Open'}
                </span>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      {/* Revisions List - Responsive */}
      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        {displayRevisions.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-white rounded-xl border border-gray-200">
            <Icon name="mdi:information-outline" className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-xs sm:text-sm font-medium text-gray-500">No revisions available</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Only the active revision {currentRevision} exists</p>
          </div>
        ) : (
          displayRevisions.map((rev, idx) => {
            const revNumber = rev.revisionNo ||
              rev.revisionNumber ||
              rev.revision ||
              rev.quotationRevision ||
              `R${idx + 1}`;

            const isActive = String(revNumber) === String(currentRevision);
            const isExpanded = expandedRevision === idx;

            return (
              <div
                key={rev.id || revNumber || idx}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 ${isActive ? 'border-blue-300 shadow-md ring-1 ring-blue-200' : 'border-gray-200'
                  }`}
              >
                {/* Revision Header - Responsive */}
                <div
                  className="px-3 sm:px-4 md:px-5 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleRevision(idx)}
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-bold text-gray-900 text-sm sm:text-base md:text-lg">
                        Revision {revNumber}
                      </span>
                      {isActive && (
                        <span className="text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">
                          Active
                        </span>
                      )}
                    </div>
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium ${getStatusClass(rev.negotiationStatus || rev.status)} whitespace-nowrap`}>
                      {rev.negotiationStatus || rev.status || 'Open'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div className="text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(rev.quotationAmount || rev.amount || 0, quotation.leadCountry || 'INR')}
                      </div>
                      <div className="text-[8px] sm:text-xs text-gray-400 whitespace-nowrap">
                        {rev.updatedDate || rev.createdAt ? formatDate(rev.updatedDate || rev.createdAt) : '—'}
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                      <Icon name={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                </div>

                {/* Expanded Content - Responsive */}
                {isExpanded && (
                  <div className="px-3 sm:px-4 md:px-5 py-3 sm:py-4 border-t border-gray-100 bg-gray-50/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Left Column */}
                      <div className="space-y-2 sm:space-y-3">
                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                          <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quotation Number</p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 sm:mt-1 truncate">
                            {rev.quotationNo || rev.quotationNumber || quotationNo}
                          </p>
                        </div>

                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                          <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 mt-0.5 sm:mt-1">
                            {formatCurrency(rev.quotationAmount || rev.amount || 0, quotation.leadCountry || 'INR')}
                          </p>
                        </div>

                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                          <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Revision Number</p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 sm:mt-1">{revNumber}</p>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-2 sm:space-y-3">
                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                          <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-0.5 sm:mt-1">
                            {rev.updatedDate || rev.createdAt ? formatDate(rev.updatedDate || rev.createdAt) : '—'}
                          </p>
                        </div>

                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                          <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                          <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold mt-0.5 sm:mt-1 ${getStatusClass(rev.negotiationStatus || rev.status)}`}>
                            {rev.negotiationStatus || rev.status || 'Open'}
                          </span>
                        </div>

                        <div className="bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                          <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</p>
                          <p className="text-xs sm:text-sm text-gray-700 mt-0.5 sm:mt-1 break-words">
                            {rev.enquiryDescription || rev.description || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Remarks - Full Width */}
                    {rev.remarks && (
                      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-[8px] sm:text-[10px] font-bold text-yellow-700 uppercase tracking-wider">Remarks</p>
                        <p className="text-xs sm:text-sm text-yellow-800 mt-0.5 sm:mt-1 break-words">{rev.remarks}</p>
                      </div>
                    )}

                    {/* Action Buttons - Import Button */}
                    <div className="mt-3 sm:mt-4 flex justify-end gap-1.5 sm:gap-2">
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-500 text-white text-[10px] sm:text-xs font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
                      >
                        <Icon name="mdi:cloud-upload-outline" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Import Files
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)}>
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center gap-2">
                <Icon name="mdi:cloud-upload" className="w-5 h-5 text-white" />
                <h2 className="text-base sm:text-lg font-semibold text-white">File Manager</h2>
                <span className="text-xs text-blue-100 bg-white/20 px-2 py-0.5 rounded-full">
                  {importedFiles.length} files
                </span>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-lg text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              >
                <Icon name="mdi:close" className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row h-full">
              {/* File List - Left Side */}
              <div className="w-full lg:w-2/3 border-b lg:border-b-0 lg:border-r border-gray-100">
                {/* Upload Area */}
                <div
                  className={`m-3 sm:m-4 p-4 sm:p-6 border-2 border-dashed rounded-xl transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                    }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                  />
                  <div className="text-center">
                    <Icon name="mdi:cloud-upload-outline" className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Drop files here or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">Supported: PDF, Word, Excel, Images (Max 10 files)</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Choose Files
                    </button>
                  </div>
                </div>

                {/* File List */}
                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                  {importedFiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Icon name="mdi:folder-open-outline" className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No files uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {importedFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center gap-3 p-2 sm:p-3 rounded-xl border transition-all cursor-pointer ${selectedFile?.id === file.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-100 hover:bg-gray-50'
                            }`}
                          onClick={() => viewFile(file)}
                        >
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-gray-100 ${getFileColor(file.type)}`}>
                            <Icon name={getFileIcon(file.type)} className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">{file.name}</p>
                            <p className="text-[10px] sm:text-xs text-gray-400">{formatFileSize(file.size)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Icon name="mdi:close" className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* File Preview - Right Side */}
              <div className="w-full lg:w-1/3 bg-gray-50">
                <div className="p-3 sm:p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Preview</h3>
                  {selectedFile ? (
                    <div className="space-y-3">
                      {selectedFile.type.startsWith('image/') && filePreview && (
                        <div className="rounded-lg overflow-hidden border border-gray-200">
                          <img src={filePreview} alt={selectedFile.name} className="w-full max-h-[300px] object-contain" />
                        </div>
                      )}
                      {selectedFile.type === 'application/pdf' && filePreview && (
                        <div className="rounded-lg overflow-hidden border border-gray-200 h-[300px]">
                          <embed src={filePreview} type="application/pdf" className="w-full h-full" />
                        </div>
                      )}
                      {!filePreview && (
                        <div className="flex flex-col items-center justify-center h-[300px] bg-white rounded-lg border border-gray-200">
                          <Icon name={getFileIcon(selectedFile.type)} className={`w-16 h-16 ${getFileColor(selectedFile.type)}`} />
                          <p className="text-sm font-medium text-gray-700 mt-3">{selectedFile.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatFileSize(selectedFile.size)}</p>
                          <p className="text-xs text-gray-400">Preview not available</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-gray-400">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = selectedFile.type.startsWith('image/')
                                ? filePreview
                                : URL.createObjectURL(selectedFile.file);
                              link.download = selectedFile.name;
                              link.click();
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Download"
                          >
                            <Icon name="mdi:download" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={closePreview}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            title="Close preview"
                          >
                            <Icon name="mdi:close" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                      <Icon name="mdi:file-search-outline" className="w-12 h-12 mb-2" />
                      <p className="text-sm">Select a file to preview</p>
                      <p className="text-xs mt-1">Click on any file in the list</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                {importedFiles.length} file(s) uploaded • Max 10 files
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                {importedFiles.length > 0 && (
                  <button
                    onClick={() => {
                      setImportedFiles([]);
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}