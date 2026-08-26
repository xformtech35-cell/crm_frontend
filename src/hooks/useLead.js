import { useApi } from "./useApi";
import { objectToFormData } from "../utils/format";
import { useCallback } from "react";

export function useLead() {
  const api = useApi();

  const getAll = () => api.get("/leads");

  const exportLeads = async (selectedIds = null) => {
    // If selectedIds is provided, export only those leads; otherwise export all
    const body = selectedIds?.length ? { leadIds: selectedIds } : {};
    const res = await api.post("/leads/export", body, { responseType: "blob" });
    return res;
  };

  const getById = (id) => api.get(`/leads/${id}`);
  const getByStatus = (status) =>
    api.get(`/leads/status/${encodeURIComponent(status)}`);

  const create = (lead, files) =>
    api.postForm("/leads", objectToFormData("lead", lead, files));

  const update = (id, lead, files) =>
    api.putForm(`/leads/${id}`, objectToFormData("lead", lead, files));

  const remove = (id) => api.del(`/leads/${id}`);
  const updateStatus = (id, status) =>
    api.patch(`/leads/${id}/status`, { status });
  const updateGroup = (id, group) => api.patch(`/leads/${id}/group`, { group });
  const updateEnquiryStatus = (id, enquiryStatus) =>
    api.patch(`/leads/${id}/enquiry-status`, { enquiryStatus });
  const updateEnquiryType = (id, enquiryType) =>
    api.patch(`/leads/${id}/enquiryType`, { enquiryType });
  const getMaxQuotationSerial = () => api.get("/leads/max-quotation-serial");

  const getNotes = (id) => api.get(`/leads/${id}/notes`);
  const addNote = (id, noteText) =>
    api.post(`/leads/${id}/notes`, { noteText });

  const getReminders = (id) => api.get(`/leads/${id}/reminders`);
  const addReminder = (id, reminderText, reminderDate) =>
    api.post(`/leads/${id}/reminders`, { reminderText, reminderDate });
  const removeReminder = (reminderId) => api.del(`/leads/reminders/${reminderId}`);

  const getScore = (id) => api.get(`/leads/${id}/leadRating`);
  const getAllScores = () => api.get("/leads/scores");
  const getAllNotes = () => api.get("/leads/notes/all");
  const sendReminderEmail = (reminderId) => api.post(`/leads/reminders/${reminderId}/send-email`, {});

  const updateLeadOutcomeStatus = useCallback(
    (leadId, status) => {
      return api.patch(`/leads/${leadId}/lead-outcome-status`, {
        leadOutcomeStatus: status,
      });
    },
    [api],
  );

  const updateSendToMainLeads = useCallback(
    (leadId, sendToMainLeads) => {
      return api.patch(`/leads/${leadId}/send-to-main-leads`, {
        sendToMainLeads,
      });
    },
    [api],
  );

  const getByUser = (userId) =>
    api.get(`/negotiations/user/${userId}`);

  const convertToNegotiation = async (leadId) => {
    const response = await api.post(
      `/leads/${leadId}/convert-to-negotiation`
    );
    return response.data;
  };

  // ─── DOCUMENT UPLOAD METHODS ───

  /**
   * Upload documents for a lead
   * @param {number} leadId - The lead ID
   * @param {object} fileMap - Object with file fields (uploadDocument, uploadDocument1, etc.)
   * @returns {Promise} - API response
   */
  const uploadDocuments = async (leadId, fileMap) => {
    const formData = new FormData();
    
    // Add each file to form data
    Object.keys(fileMap).forEach(key => {
      if (fileMap[key]) {
        formData.append(key, fileMap[key]);
      }
    });
    
    const response = await api.post(`/leads/${leadId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  };

  /**
   * Get documents for a lead
   * @param {number} leadId - The lead ID
   * @returns {Promise} - API response with documents list
   */
  const getDocuments = async (leadId) => {
    const response = await api.get(`/leads/${leadId}/documents`);
    return response.data;
  };

  /**
   * Get documents by revision
   * @param {number} leadId - The lead ID
   * @param {string} revisionNo - The revision number (e.g., "R1", "R2")
   * @returns {Promise} - API response with documents for the revision
   */
  const getDocumentsByRevision = async (leadId, revisionNo) => {
    const response = await api.get(`/leads/${leadId}/revisions/${revisionNo}/documents`);
    return response.data;
  };

  /**
   * Delete a document
   * @param {number} documentId - The document ID
   * @returns {Promise} - API response
   */
  const deleteDocument = async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  };

  /**
   * Get full document URL
   * @param {string} filePath - The file path
   * @returns {string} - Full URL
   */
  const getFullDocumentUrl = (filePath) => {
    const baseURL = api.defaults?.baseURL || '';
    return `${baseURL}/uploads/${filePath}`;
  };

  return {
    // Existing methods
    getAll,
    getById,
    getByStatus,
    create,
    update,
    remove,
    updateStatus,
    updateGroup,
    updateEnquiryStatus,
    updateEnquiryType,
    getMaxQuotationSerial,
    getNotes,
    addNote,
    getReminders,
    addReminder,
    removeReminder,
    sendReminderEmail,
    getByUser,
    getScore,
    getAllScores,
    updateLeadOutcomeStatus,
    updateSendToMainLeads,
    convertToNegotiation,
    getAllNotes,
    // Document methods
    uploadDocuments,
    getDocuments,
    getDocumentsByRevision,
    deleteDocument,
    getFullDocumentUrl,
  };
}