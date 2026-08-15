import { useApi } from "./useApi";

export function useNegotiation() {
  const api = useApi();

  // ========== NEGOTIATION APIs ==========
  
  const getAll = () => api.get("/negotiations");

  const getMyNegotiations = () =>
    api.get("/negotiations/my");

  const getById = (id) =>
    api.get(`/negotiations/${id}`);

  const getByLeadId = (leadId) =>
    api.get(`/negotiations/lead/${leadId}`);

  const update = (id, data) =>
    api.put(`/negotiations/${id}`, data);

  const remove = (id) =>
    api.del(`/negotiations/${id}`);

  const getRevisions = (id) =>
    api.get(`/negotiations/${id}/revisions`);

  const getRevisionsByLeadId = (leadId) =>
    api.get(`/negotiations/lead/${leadId}/revisions`);


  const createRevision = (id, data) =>
    api.post(`/negotiations/${id}/revision`, data);

  const getDetails = (id) =>
    api.get(`/negotiations/${id}/details`);
  
  const getByUser = (userId) =>
    api.get(`/negotiations/user/${userId}`);

  // ========== DOCUMENT APIs ==========
  const viewQuotationDocument = (fileName) =>
  api.get(
    `/view/${fileName}`,
    {
      responseType: "blob",
    }
  );

const handleViewDocument = async (fileName) => {
  try {
    let cleanPath = fileName;
    if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
    if (cleanPath.startsWith("api/view/")) cleanPath = cleanPath.substring(9);
    if (cleanPath.startsWith("view/")) cleanPath = cleanPath.substring(5);

    const response = await viewQuotationDocument(cleanPath);
    const blob = new Blob([response?.data], {
      type: response.headers["content-type"] || "application/pdf",
    });

    const fileURL = URL.createObjectURL(blob);
    window.open(fileURL, "_blank");
    setTimeout(() => URL.revokeObjectURL(fileURL), 10000);
  } catch (err) {
    console.error("View Document Error:", err);
  }
};

const handleDownloadRevisionDocument = async (fileUrlOrName, fileName) => {
  try {
    let cleanPath = fileUrlOrName || fileName;
    if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
    if (cleanPath.startsWith("api/view/")) cleanPath = cleanPath.substring(9);
    if (cleanPath.startsWith("view/")) cleanPath = cleanPath.substring(5);

    const response = await viewQuotationDocument(cleanPath);
    const blob = new Blob([response?.data], {
      type: response.headers["content-type"] || "application/octet-stream",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "quotation-document";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download Document Error:", err);
  }
};

  /**
   * Upload a document for a negotiation
   * POST /api/negotiations/{id}/upload
   */
  const uploadDocument = async (id, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`/negotiations/${id}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };
const uploadQuotationDocuments = async (quotationNo, files) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await api.post(
    `documents/upload?quotationNo=${quotationNo}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response?.data;
};

  /**
   * Get document as blob for viewing/downloading
   * GET /api/negotiations/{id}/document
   */
  const getDocument = async (id) => {
    try {
      const defaultOrigin = typeof window !== 'undefined' ? `${window.location.origin}/xformcrm` : 'http://localhost:8080/xformcrm';
      const baseUrl = api.defaults?.baseURL || defaultOrigin;
      const url = `${baseUrl}/api/negotiations/${id}/document`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get document: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error('Get document error:', error);
      throw error;
    }
  };

  /**
   * Get document as blob URL for viewing
   */
  const getDocumentBlobUrl = async (id) => {
    try {
      const response = await getDocument(id);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Get document blob error:', error);
      throw error;
    }
  };

  /**
   * Get the full URL for a document
   */
  const getFullDocumentUrl = (id) => {
    const defaultOrigin = typeof window !== 'undefined' ? `${window.location.origin}/xformcrm` : 'http://localhost:8080/xformcrm';
    const baseUrl = api.defaults?.baseURL || defaultOrigin;
    return `${baseUrl}/api/negotiations/${id}/document`;
  };

  /**
   * Check if a document exists
   */
  const checkDocument = async (id) => {
    try {
      const url = getFullDocumentUrl(id);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Range': 'bytes=0-0',
        },
        credentials: 'include',
      });
      
      return response.status === 200 || response.status === 206;
    } catch (error) {
      console.warn('Document check failed:', error);
      return false;
    }
  };

  /**
   * Delete a document
   */
  const deleteDocument = async (id) => {
    try {
      const response = await api.del(`/negotiations/${id}/document`);
      return response;
    } catch (error) {
      console.error('Delete document error:', error);
      throw error;
    }
  };

  /**
   * View document in new tab
   */
  const viewDocument = (id) => {
    const url = getFullDocumentUrl(id);
    window.open(url, '_blank');
  };

  /**
   * Download document with custom filename
   */
  const downloadDocument = async (id, filename) => {
    try {
      const response = await getDocument(id);
      const blob = await response.blob();
      
      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = filename || `document-${id}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          downloadFilename = match[1];
        }
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  };

  return {
    // Negotiation APIs
    getAll,
    getMyNegotiations,
    getByUser,
    getById,
    getByLeadId,
    getRevisions,
    getRevisionsByLeadId,
    createRevision,

    update,
    remove,
    getDetails,
    
    // Document APIs
    uploadDocument,
    getDocument,
    getDocumentBlobUrl,
    getFullDocumentUrl,
    checkDocument,
    deleteDocument,
    viewDocument,
    downloadDocument,
    uploadQuotationDocuments,
    handleViewDocument,
    handleDownloadRevisionDocument
  };
}