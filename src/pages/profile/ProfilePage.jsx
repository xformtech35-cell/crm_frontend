import React, { useState, useEffect } from 'react';
import Icon from '../../components/Icon';
import { useAuthStore } from '../../stores/auth';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/format';
import api from '../../utils/api';

const AVATAR_GRADIENTS = [
  { id: 'indigo', name: 'Electric Violet', value: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
  { id: 'blue', name: 'Ocean Blue', value: 'linear-gradient(135deg, #2563eb, #3b82f6)' },
  { id: 'emerald', name: 'Emerald Mint', value: 'linear-gradient(135deg, #059669, #10b981)' },
  { id: 'amber', name: 'Sunset Amber', value: 'linear-gradient(135deg, #d97706, #f59e0b)' },
  { id: 'crimson', name: 'Ruby Crimson', value: 'linear-gradient(135deg, #dc2626, #ef4444)' },
  { id: 'magenta', name: 'Cosmic Pink', value: 'linear-gradient(135deg, #7e22ce, #ec4899)' },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
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
    return localStorage.getItem(`crm_avatar_bg_${user?.userid}`) || AVATAR_GRADIENTS[0].value;
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
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      try {
        await api.put('/auth/profile', { username, userEmail, phone, designation });
      } catch (err) {
        console.warn('Backend profile update notice:', err);
      }

      updateUser({
        username,
        userEmail,
        phone,
        designation,
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

  // Password Strength Calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Not Entered', color: 'bg-gray-200 dark:bg-slate-700', text: 'text-gray-400' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 33, label: 'Weak Password', color: 'bg-red-500', text: 'text-red-500' };
    if (score <= 4) return { score: 66, label: 'Medium Security', color: 'bg-amber-500', text: 'text-amber-500' };
    return { score: 100, label: 'Strong & Encrypted 🔒', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  const permissionsList = user?.permissions || [
    'leads.view', 'leads.create', 'leads.edit', 'leads.delete',
    'negotiations.view', 'negotiations.edit',
    'tasks.view', 'tasks.create',
    'team.view', 'organizations.view', 'reports.view'
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 px-2 sm:px-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-slide-in text-sm font-semibold backdrop-blur-md ${
          toast.type === 'success'
            ? 'bg-emerald-600/95 text-white border-emerald-400/30'
            : 'bg-red-600/95 text-white border-red-400/30'
        }`}>
          <Icon name={toast.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} className="w-5 h-5" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── STUNNING COMPACT PROFILE HEADER ── */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 shadow-lg overflow-hidden">
        {/* Modern Compact Gradient Hero Banner */}
        <div className="h-20 sm:h-24 bg-gradient-to-r from-indigo-700 via-purple-700 to-sky-600 relative overflow-hidden px-6 py-3 flex items-start justify-between">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-xl" />
          <div className="absolute left-1/3 bottom-0 w-36 h-36 bg-purple-500/20 rounded-full blur-lg" />

          {/* Role Pill Badge */}
          <div className="relative z-10 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white bg-white/20 backdrop-blur-md border border-white/30 shadow-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {user?.role || 'User'}
            </span>
          </div>

          <div className="relative z-10 text-right text-white/80 text-[11px] font-semibold hidden sm:block">
            <span>Logged in as </span>
            <span className="text-white font-bold">{userEmail}</span>
          </div>
        </div>

        {/* User Info Bar */}
        <div className="px-6 pb-4 pt-1 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-4 -mt-10 sm:-mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            {/* Compact Glowing Avatar Frame */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-xl ring-4 ring-white/50 dark:ring-slate-800/80 overflow-hidden flex items-center justify-center">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div
                    className="w-full h-full rounded-xl flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-inner"
                    style={{ background: selectedGradient }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              {/* Upload Hover Overlay */}
              <label
                htmlFor="hero-avatar-upload"
                className="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white cursor-pointer gap-0.5"
                title="Change Profile Picture"
              >
                <Icon name="mdi:camera-plus" className="w-5 h-5 text-indigo-300" />
                <span className="text-[9px] font-extrabold uppercase tracking-wider">Change</span>
              </label>
              <input
                id="hero-avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Title & Organization Meta */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {username || 'User Account'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Account
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 dark:text-slate-400 flex-wrap">
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <Icon name="mdi:email-outline" className="w-3.5 h-3.5" />
                  {userEmail}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Icon name="mdi:badge-account-outline" className="w-3.5 h-3.5 text-gray-400" />
                  ID: #{user?.userid || '101'}
                </span>
                {phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Icon name="mdi:phone-outline" className="w-3.5 h-3.5 text-gray-400" />
                      {phone}
                    </span>
                  </>
                )}
              </div>

              {/* Team Badges */}
              {myTeamDetails.length > 0 && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {myTeamDetails.map((t) => (
                    <span
                      key={t.teamName}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 border border-purple-200/80 dark:border-purple-500/20 shadow-2xs"
                    >
                      <Icon name="mdi:account-group" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>{t.teamName}</span>
                      <span className="text-purple-300 dark:text-purple-600">•</span>
                      <span className="text-purple-900 dark:text-purple-100">
                        {t.isLead ? "👑 Team Lead" : `Lead: ${t.leadName}`}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Remove Image Button */}
          {profileImage && (
            <button
              onClick={handleRemoveImage}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-[11px] font-bold text-gray-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Icon name="mdi:trash-can-outline" className="w-3.5 h-3.5 text-red-500" />
              Remove Photo
            </button>
          )}
        </div>

        {/* ── MODERN FLOATING COMPACT TAB BAR ── */}
        <div className="px-6 border-t border-gray-100 dark:border-white/10 flex items-center gap-1.5 bg-gray-50/70 dark:bg-slate-900/80 pt-1.5 pb-0.5 overflow-x-auto">
          {[
            { id: 'details', label: 'Personal Details', icon: 'mdi:account-badge-outline' },
            { id: 'security', label: 'Security & Password', icon: 'mdi:shield-lock-outline' },
            { id: 'access', label: 'Role & Data Scope', icon: 'mdi:shield-key-outline' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap rounded-t-lg ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-800 shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon name={tab.icon} className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: PERSONAL DETAILS ── */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Company & Leadership Banner Card */}
          <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/80 to-purple-50/70 dark:from-slate-900 dark:to-slate-800 rounded-3xl border border-indigo-100 dark:border-white/10 p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-200/50 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Icon name="mdi:domain" className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                    Organization & Supervisory Leadership
                  </h3>
                  <p className="text-xs text-indigo-700/80 dark:text-slate-400">Your organization workspace membership and assigned team lead.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/90 dark:bg-slate-800/90 p-4 rounded-2xl border border-indigo-100 dark:border-white/5 shadow-sm flex items-center gap-3.5">
                <span className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
                  <Icon name="mdi:office-building text-indigo-600 dark:text-indigo-400" className="w-6 h-6" />
                </span>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-400 block">Workspace Company</span>
                  <span className="text-gray-900 dark:text-white font-extrabold text-base block truncate">
                    {user?.companyName || 'UWS Enviro-tech Private Limited'}
                  </span>
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-4 rounded-2xl border border-indigo-100 dark:border-white/5 shadow-sm flex items-center gap-3.5">
                <span className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
                  <Icon name="mdi:account-star" className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </span>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-400 block">Assigned Team Lead</span>
                  <span className="text-gray-900 dark:text-white font-extrabold text-base block truncate">
                    {myTeamDetails.find((t) => !t.isLead)?.leadName || user?.teamLeadName || 'Not Assigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 p-6 sm:p-8 shadow-md">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="mdi:account-edit-outline" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Personal Account Information
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Manage your display name, contact phone, and professional title.</p>
                </div>
              </div>

              <form onSubmit={handleSaveDetails} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                      Full Name / Username
                    </label>
                    <div className="relative">
                      <Icon name="mdi:account" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Icon name="mdi:email" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        required
                        placeholder="user@company.com"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Icon name="mdi:phone" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                      Designation / Job Title
                    </label>
                    <div className="relative">
                      <Icon name="mdi:briefcase" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Senior Account Executive"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-gray-100 dark:border-white/10 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingDetails}
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingDetails ? <Icon name="mdi:loading" className="w-4.5 h-4.5 animate-spin" /> : <Icon name="mdi:content-save-check" className="w-4.5 h-4.5" />}
                    {savingDetails ? 'Saving Profile...' : 'Save Profile Details'}
                  </button>
                </div>
              </form>
            </div>

            {/* Avatar Preset & Preview Side Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-md space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Icon name="mdi:palette-outline" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Avatar Theme Preset
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Select a vibrant background gradient for your default profile icon.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {AVATAR_GRADIENTS.map((grad) => (
                  <button
                    key={grad.id}
                    onClick={() => handleSelectGradient(grad.value)}
                    className={`h-16 rounded-2xl transition-all relative shadow-md hover:scale-105 group overflow-hidden ${
                      selectedGradient === grad.value ? 'ring-4 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : 'opacity-90 hover:opacity-100'
                    }`}
                    style={{ background: grad.value }}
                    title={grad.name}
                  >
                    {selectedGradient === grad.value && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Icon name="mdi:check-circle" className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-white/10">
                <label
                  htmlFor="side-avatar-input"
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100/60 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Icon name="mdi:cloud-upload" className="w-4.5 h-4.5" />
                  Upload Custom Image
                </label>
                <input
                  id="side-avatar-input"
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

      {/* ── TAB 2: SECURITY & PASSWORD ── */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Change Password Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Icon name="mdi:lock-reset" className="w-5 h-5 text-amber-500" />
                  Change Password
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Ensure your account uses a strong, encrypted password.</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <Icon name="mdi:shield-lock-outline" className="w-5 h-5" />
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full pl-4 pr-11 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                  >
                    <Icon name={showOld ? 'mdi:eye-off' : 'mdi:eye'} className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    required
                    className="w-full pl-4 pr-11 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                  >
                    <Icon name={showNew ? 'mdi:eye-off' : 'mdi:eye'} className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-600 dark:text-slate-400">Password Strength</span>
                    <span className={pwdStrength.text}>{pwdStrength.label}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${pwdStrength.color}`} style={{ width: `${pwdStrength.score}%` }} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-2">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full pl-4 pr-11 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                  >
                    <Icon name={showConfirm ? 'mdi:eye-off' : 'mdi:eye'} className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-lg shadow-amber-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {savingPassword ? <Icon name="mdi:loading" className="w-4.5 h-4.5 animate-spin" /> : <Icon name="mdi:lock-check" className="w-4.5 h-4.5" />}
                  {savingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Security Status Side Box */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-md space-y-4">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Icon name="mdi:shield-check text-emerald-500" className="w-5 h-5" />
                Active Session Security
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <span className="text-gray-500 dark:text-slate-400 font-semibold">JWT Auth Token</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Active & Valid</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <span className="text-gray-500 dark:text-slate-400 font-semibold">Password Encryption</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">BCrypt (Strength 10)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <span className="text-gray-500 dark:text-slate-400 font-semibold">Connection Protocol</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">REST API / CORS Secured</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ROLE & DATA SCOPE ── */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          {/* Privilege Summary Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-white/10 p-6 sm:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Icon name="mdi:shield-account" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Role & System Scoping Overview
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Current system privileges and data scoping parameters assigned to your profile.</p>
              </div>
              <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                {user?.role || 'User'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-indigo-100 dark:border-white/5 shadow-xs">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block mb-1">Assigned System Role</span>
                <p className="text-2xl font-black text-gray-900 dark:text-white capitalize">
                  {user?.role || 'User'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">Full operational command role</p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-purple-100 dark:border-white/5 shadow-xs">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 block mb-1">Company Realm ID</span>
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  #{user?.companyIdFk || '1'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">Workspace Realm Tenant</p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-emerald-100 dark:border-white/5 shadow-xs">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block mb-1">Data Access Scoping</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin' ? 'ALL_DATA' : 'TEAM_DATA'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">Company-wide visibility</p>
              </div>
            </div>

            {/* Active Permissions Matrix */}
            <div className="pt-4 border-t border-gray-100 dark:border-white/10 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Active System Permissions ({permissionsList.length})
              </h4>

              <div className="flex flex-wrap gap-2">
                {permissionsList.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-300 border border-gray-200 dark:border-white/10 shadow-2xs"
                  >
                    <Icon name="mdi:check-circle-outline" className="w-4 h-4 text-emerald-500" />
                    <span>{perm}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
