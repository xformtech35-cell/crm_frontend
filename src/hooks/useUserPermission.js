import { useState } from 'react';
import { useApi } from './useApi';

export function useUserPermission() {
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getUserPermissions = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/user-permissions/${userId}`);
      return res.data?.data || { userId, hasCustomPermissions: false, permissions: [] };
    } catch (err) {
      console.error('Failed to fetch user permissions:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveUserPermissions = async (userId, permissions) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post(`/user-permissions/${userId}`, { permissions });
      return res.data?.data || [];
    } catch (err) {
      console.error('Failed to save user permissions:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetUserPermissionsToDefault = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.delete(`/user-permissions/${userId}`);
      return res.data;
    } catch (err) {
      console.error('Failed to reset user permissions:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getUserPermissions,
    saveUserPermissions,
    resetUserPermissionsToDefault,
  };
}

export default useUserPermission;
