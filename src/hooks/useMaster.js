// src/hooks/useMaster.js
import { useApi } from "./useApi";

export const useLeadSource = () => {
  const api = useApi();

  const getAll = async () => {
    try {
      return await api.get("/leads/lead-source") || [];
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
      return await api.get("/leads/lead-group") || [];
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