import React, { useState } from 'react';
import Icon from '../Icon';
import AppModal from './AppModal';
import { useAuth } from '../../hooks/useAuth';

export default function ChangePasswordModal({ open, onClose, onSuccess }) {
  const { changePassword } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!oldPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword, confirmPassword);
      setSuccessMsg('Password changed successfully!');
      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to change password. Please check your current password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal open={open} onClose={handleClose} title="Change Password" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-2 border border-red-200">
            <Icon name="mdi:alert-circle" className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
            <Icon name="mdi:check-circle" className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
            Current Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              required
              className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <Icon name={showOld ? 'mdi:eye-off' : 'mdi:eye'} className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
            New Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 6 characters)"
              required
              className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <Icon name={showNew ? 'mdi:eye-off' : 'mdi:eye'} className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
            Confirm New Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <Icon name={showConfirm ? 'mdi:eye-off' : 'mdi:eye'} className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name="mdi:lock-check" className="w-4 h-4" />}
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </AppModal>
  );
}
