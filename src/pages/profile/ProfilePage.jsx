import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { useAuthStore } from '../../stores/auth';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/format';
import api from '../../utils/api';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5, #7c3aed)',
  'linear-gradient(135deg, #2563eb, #3b82f6)',
  'linear-gradient(135deg, #059669, #10b981)',
  'linear-gradient(135deg, #d97706, #f59e0b)',
  'linear-gradient(135deg, #dc2626, #ef4444)',
  'linear-gradient(135deg, #7e22ce, #ec4899)',
];

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const { changePassword } = useAuth();

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'security' | 'access'

  // User Profile Form
  const [username, setUsername] = useState(user?.username || '');
  const [userEmail, setUserEmail] = useState(user?.userEmail || '');
  const [phone, setPhone] = useState(user?.phone || user?.mobile || '');
  const [designation, setDesignation] = useState(user?.designation || user?.role || 'Team Member');
  const [profileImage, setProfileImage] = useState(() => {
    return localStorage.getItem(`crm_avatar_${user?.userid}`) || '';
  });
  const [selectedGradient, setSelectedGradient] = useState(() => {
    return localStorage.getItem(`crm_avatar_bg_${user?.userid}`) || AVATAR_GRADIENTS[0];
  });
  const [myTeamDetails, setMyTeamDetails] = useState([]);

  // Password Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // States
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setUserEmail(user.userEmail || '');
      setPhone(user.phone || user.mobile || '');
      setDesignation(user.designation || user.role || '');
    }
  }, [user]);

  useEffect(() => {
    async function loadTeamData() {
      if (!user?.userEmail) return;
      try {
        const [teamsRes, assignmentsRes, membersRes] = await Promise.all([
          api.get('/teams').catch(() => null),
          api.get('/create-team').catch(() => null),
          api.get('/team-member').catch(() => null),
        ]);

        const teams = Array.isArray(teamsRes?.data?.data) ? teamsRes.data.data : (Array.isArray(teamsRes?.data) ? teamsRes.data : []);
        const assignments = Array.isArray(assignmentsRes?.data?.data) ? assignmentsRes.data.data : (Array.isArray(assignmentsRes?.data) ? assignmentsRes.data : []);
        const members = Array.isArray(membersRes?.data?.data) ? membersRes.data.data : (Array.isArray(membersRes?.data) ? membersRes.data : []);

        const selfEmail = user.userEmail.trim().toLowerCase();
        const selfMember = members.find((m) => m.teamMemberEmail?.trim().toLowerCase() === selfEmail);

        const list = [];
        if (selfMember) {
          const selfMemberId = selfMember.teamMemberId || selfMember.id;
          const myAssignments = assignments.filter((a) => Number(a.teamMemberIdFk || a.teamMemberId) === Number(selfMemberId));
          const myTeamIds = new Set(myAssignments.map((a) => Number(a.teamIdFk || a.teamId)));

          teams.forEach((t) => {
            if (Number(t.teamLeadId) === Number(selfMemberId)) {
              myTeamIds.add(Number(t.teamId || t.id));
            }
          });

          myTeamIds.forEach((tId) => {
            const teamObj = teams.find((t) => Number(t.teamId || t.id) === Number(tId));
            if (teamObj) {
              const leadMember = members.find((m) => Number(m.teamMemberId || m.id) === Number(teamObj.teamLeadId));
              list.push({
                teamName: teamObj.teamName,
                leadName: leadMember?.teamMemberName || leadMember?.name || 'Assigned Lead',
                leadEmail: leadMember?.teamMemberEmail || '',
                isLead: Number(teamObj.teamLeadId) === Number(selfMemberId)
              });
            }
          });
        }
        setMyTeamDetails(list);
      } catch (err) {
        console.error('Failed to load profile team info:', err);
      }
    }
    loadTeamData();
  }, [user]);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // Handle Profile Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Image size must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setProfileImage(base64);
      localStorage.setItem(`crm_avatar_${user?.userid}`, base64);
      window.dispatchEvent(new Event('crm-avatar-updated'));
      showToast('success', 'Profile picture updated successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectGradient = (grad) => {
    setSelectedGradient(grad);
    localStorage.setItem(`crm_avatar_bg_${user?.userid}`, grad);
    window.dispatchEvent(new Event('crm-avatar-updated'));
  };

  const handleRemoveImage = () => {
    setProfileImage('');
    localStorage.removeItem(`crm_avatar_${user?.userid}`);
    window.dispatchEvent(new Event('crm-avatar-updated'));
    showToast('success', 'Profile picture removed.');
  };

  // Handle Profile Details Save
  const handleSaveDetails = (e) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      const updatedUser = {
        ...user,
        username,
        userEmail,
        phone,
        designation,
      };
      setAuth({
        token: useAuthStore.getState().token,
        user: updatedUser,
      });
      showToast('success', 'Profile details updated successfully!');
    } catch {
      showToast('error', 'Failed to update profile details.');
    } finally {
      setSavingDetails(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast('error', 'Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'New password and confirm password do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(oldPassword, newPassword, confirmPassword);
      showToast('success', 'Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to change password. Check your current password.';
      showToast('error', msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = getInitials(username || userEmail || 'U');

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-slide-in text-sm font-semibold ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-500'
            : 'bg-red-600 text-white border-red-500'
        }`}>
          <Icon name={toast.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} className="w-5 h-5" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Profile Header Card ── */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Cover Banner */}
        <div className="h-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute right-6 bottom-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold text-white/90 bg-white/20 backdrop-blur-md border border-white/20 uppercase tracking-wider">
              {user?.role || 'User'}
            </span>
          </div>
        </div>

        {/* Profile Avatar & Primary Info */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-4 -mt-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Avatar container */}
            <div className="relative group">
              <div
                className="w-28 h-28 rounded-3xl p-1 bg-white dark:bg-slate-900 shadow-xl overflow-hidden flex items-center justify-center shrink-0"
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <div
                    className="w-full h-full rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-inner"
                    style={{ background: selectedGradient }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              {/* Upload Overlay Button */}
              <label
                htmlFor="avatar-file-input"
                className="absolute inset-0 bg-black/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer gap-1"
                title="Change Profile Picture"
              >
                <Icon name="mdi:camera-plus-outline" className="w-6 h-6" />
                <span className="text-[10px] font-bold">Upload</span>
              </label>
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {username || 'User Profile'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
                {userEmail || 'user@example.com'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Account
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  ID: #{user?.userid || '101'}
                </span>
              </div>
              {myTeamDetails.length > 0 && (
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {myTeamDetails.map((t) => (
                    <span
                      key={t.teamName}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 shadow-sm"
                    >
                      <Icon name="mdi:account-group-outline" className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>{t.teamName}</span>
                      <span className="text-purple-300 dark:text-purple-600">•</span>
                      <span className="text-purple-900 dark:text-purple-100">
                        {t.isLead ? "👑 You are Team Lead" : `👤 Team Lead: ${t.leadName}`}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {profileImage && (
              <button
                onClick={handleRemoveImage}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
              >
                <Icon name="mdi:trash-can-outline" className="w-4 h-4" />
                Remove Photo
              </button>
            )}
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="px-6 border-t border-gray-100 dark:border-white/5 flex items-center gap-1 bg-gray-50/50 dark:bg-slate-900/50">
          {[
            { id: 'details', label: 'Personal Details', icon: 'mdi:account-outline' },
            { id: 'security', label: 'Security & Password', icon: 'mdi:lock-outline' },
            { id: 'access', label: 'Role & Data Scope', icon: 'mdi:shield-key-outline' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-900 shadow-sm rounded-t-xl'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon name={tab.icon} className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Company & Team Lead Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 rounded-3xl border border-blue-100 dark:border-white/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-blue-200/50 dark:border-white/10">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Icon name="mdi:office-building" className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  Company & Team Leadership
                </h3>
                <p className="text-xs text-blue-700/80 dark:text-slate-400 mt-0.5">Your organization membership and assigned supervisory lead.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-100/80 dark:border-white/5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 block mb-1">Company / Workspace</span>
                <div className="flex items-center gap-2.5 text-gray-900 dark:text-white font-bold text-base">
                  <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Icon name="mdi:domain" className="w-5 h-5" />
                  </span>
                  <span className="truncate">{user?.companyName || 'XForm Tech'}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-100/80 dark:border-white/5 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 block mb-1">Assigned Team Lead</span>
                <div className="flex items-center gap-2.5 text-gray-900 dark:text-white font-bold text-base">
                  <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Icon name="mdi:account-star-outline" className="w-5 h-5" />
                  </span>
                  <span className="truncate">{myTeamDetails.find((t) => !t.isLead)?.leadName || user?.teamLeadName || 'Not Assigned'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Profile Information</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Update your personal account details and display preferences.</p>
              </div>
              <Icon name="mdi:square-edit-outline" className="w-5 h-5 text-indigo-500" />
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Full Name / Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="John Doe"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    required
                    placeholder="user@company.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Senior Account Executive"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={savingDetails}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {savingDetails ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name="mdi:content-save-outline" className="w-4 h-4" />}
                  {savingDetails ? 'Saving...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>

          {/* Side Avatar Styling Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Avatar Theme Color</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Choose a default background gradient if no profile picture is uploaded.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {AVATAR_GRADIENTS.map((grad, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectGradient(grad)}
                  className={`h-14 rounded-2xl transition-all relative shadow-sm hover:scale-105 ${
                    selectedGradient === grad ? 'ring-4 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                  }`}
                  style={{ background: grad }}
                >
                  {selectedGradient === grad && (
                    <Icon name="mdi:check-circle" className="w-5 h-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-white/10">
              <label
                htmlFor="side-avatar-upload"
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100/50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon name="mdi:cloud-upload-outline" className="w-4 h-4" />
                Upload Custom Photo
              </label>
              <input
                id="side-avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── SECURITY & CHANGE PASSWORD TAB ── */}
      {activeTab === 'security' && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Change Password</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Ensure your account uses a strong, secure password.</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Icon name="mdi:shield-lock-outline" className="w-5 h-5" />
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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

            <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {savingPassword ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name="mdi:lock-check" className="w-4 h-4" />}
                {savingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ROLE & DATA SCOPE TAB ── */}
      {activeTab === 'access' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Role & Access Scoping Overview</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Current system privileges assigned to your logged-in profile.</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Icon name="mdi:shield-account" className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Assigned System Role</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white capitalize mt-1">{user?.role || 'User'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Company ID / Realm</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">#{user?.companyIdFk || '1'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Account Access</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">Full Standard Access</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
