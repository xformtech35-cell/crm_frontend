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

  const getNotes = (id) => api.get(`/leads/${id}/notes`);
  const addNote = (id, noteText) =>
    api.post(`/leads/${id}/notes`, { noteText });

  const getReminders = (id) => api.get(`/leads/${id}/reminders`);
  const addReminder = (id, reminderText, reminderDate) =>
    api.post(`/leads/${id}/reminders`, { reminderText, reminderDate });

  // const convertToOpportunity = (id) => api.post(`/leads/${id}/convert`, {});


  const getScore = (id) => api.get(`/leads/${id}/leadRating`);
  const getAllScores = () => api.get("/leads/scores");
  const getAllNotes = () => api.get("/leads/notes/all");
  const sendReminderEmail = (reminderId) => api.post(`/leads/reminders/${reminderId}/send-email`, {});

  // In useLead.js, add this function
const updateLeadOutcomeStatus = useCallback(
  (leadId, status) => {
    return api.patch(`/leads/${leadId}/lead-outcome-status`, {
      leadOutcomeStatus: status,
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


  return {
    getAll,
    getById,
    getByStatus,
    create,
    update,
    remove,
    updateStatus,
    updateGroup,
    updateEnquiryStatus,
    getNotes,
    addNote,
    getReminders,
    addReminder,
    sendReminderEmail,
    // convertToOpportunity,  
    getByUser,
    getScore,
    getAllScores,
    updateLeadOutcomeStatus,
    convertToNegotiation,
    getAllNotes,
  };
}
