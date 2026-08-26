// src/hooks/useMaster.js
import { useApi } from "./useApi";

export const useLeadSource = () => {
  const api = useApi();

  const getAll = async () => {
    try {
      const res = await api.get("/leads/lead-source");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      return [];
    } catch (error) {
      console.error("Failed to fetch lead sources:", error);
      return [];
    }
  };

  const create = async (payload) => {
    try {
      return await api.post("/leads/lead-source", payload);
    } catch (error) {
      console.error("Failed to create lead source:", error);
      throw error;
    }
  };

  const update = async (id, payload) => {
    try {
      return await api.put(`/leads/lead-source/${id}`, payload);
    } catch (error) {
      console.error(`Failed to update lead source ${id}:`, error);
      throw error;
    }
  };

  const remove = async (id) => {
    try {
      await api.del(`/leads/lead-source/${id}`);
    } catch (error) {
      console.error(`Failed to delete lead source ${id}:`, error);
      throw error;
    }
  };

  return { getAll, create, update, remove };
};

// lead group master
export const useLeadGroup = () => {
  const api = useApi();

  const getAll = async () => {
    try {
      const res = await api.get("/leads/lead-group");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      return [];
    } catch (error) {
      console.error("Failed to fetch lead groups:", error);
      return [];
    }
  };

  const create = async (payload) => {
    try {
      return await api.post("/leads/lead-group", payload);
    } catch (error) {
      console.error("Failed to create lead group:", error);
      throw error;
    }
  };

  const update = async (id, payload) => {
    try {
      return await api.put(`/leads/lead-group/${id}`, payload);
    } catch (error) {
      console.error(`Failed to update lead group ${id}:`, error);
      throw error;
    }
  };

  const remove = async (id) => {
    try {
      await api.del(`/leads/lead-group/${id}`);
    } catch (error) {
      console.error(`Failed to delete lead group ${id}:`, error);
      throw error;
    }
  };

  return { getAll, create, update, remove };
};

// lead status master
export const useLeadStatus = () => {
  const api = useApi();

  const getAll = async () => {
    try {
      const res = await api.get("/leads/lead-status");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      return [];
    } catch (error) {
      console.error("Failed to fetch lead statuses:", error);
      return [];
    }
  };

  const create = async (payload) => {
    try {
      return await api.post("/leads/lead-status", payload);
    } catch (error) {
      console.error("Failed to create lead status:", error);
      throw error;
    }
  };

  const update = async (id, payload) => {
    try {
      return await api.put(`/leads/lead-status/${id}`, payload);
    } catch (error) {
      console.error(`Failed to update lead status ${id}:`, error);
      throw error;
    }
  };

  const remove = async (id) => {
    try {
      await api.del(`/leads/lead-status/${id}`);
    } catch (error) {
      console.error(`Failed to delete lead status ${id}:`, error);
      throw error;
    }
  };

  return { getAll, create, update, remove };
};

// quotation status master
export const useQuotationStatus = () => {
  const api = useApi();

  const getAll = async () => {
    try {
      const res = await api.get("/leads/quotation-status");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.data)) return res.data.data;
      return [];
    } catch (error) {
      console.error("Failed to fetch quotation statuses:", error);
      return [];
    }
  };

  const create = async (payload) => {
    try {
      return await api.post("/leads/quotation-status", payload);
    } catch (error) {
      console.error("Failed to create quotation status:", error);
      throw error;
    }
  };

  const update = async (id, payload) => {
    try {
      return await api.put(`/leads/quotation-status/${id}`, payload);
    } catch (error) {
      console.error(`Failed to update quotation status ${id}:`, error);
      throw error;
    }
  };

  const remove = async (id) => {
    try {
      await api.del(`/leads/quotation-status/${id}`);
    } catch (error) {
      console.error(`Failed to delete quotation status ${id}:`, error);
      throw error;
    }
  };

  return { getAll, create, update, remove };
};

