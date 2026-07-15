import { useApi } from "./useApi";

export function useNegotiation() {
  const api = useApi();

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

  const createRevision = (id, data) =>
    api.post(`/negotiations/${id}/revision`, data);

  const getDetails = (id) =>
    api.get(`/negotiations/${id}/details`);
  
  const getByUser = (userId) =>
  api.get(`/negotiations/user/${userId}`);

  return {
    getAll,
    getMyNegotiations,
    getByUser,
    getById,
    getByLeadId,
    getRevisions,
    createRevision,
    update,
    remove,
    getDetails,
  };
}