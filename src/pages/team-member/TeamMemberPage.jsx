import { useEffect, useMemo, useState } from 'react';
import AppDrawer from '../../components/common/AppDrawer';
import Icon from '../../components/Icon';
import { useCreateTeam } from '../../hooks/useCreateTeam';
import { useTeam } from '../../hooks/useTeam';
import { useTeamMember } from '../../hooks/useTeamMember';
import { useRole } from '../../hooks/useRole';
import { useAuthStore } from '../../stores/auth';
import {
  getMemberId,
  getMemberLabel,
  getTeamLabel,
  teamsForMember,
  assignmentIdsForMember,
} from '../../utils/teamRelations';

const emptyMember = {
  teamMemberName: '',
  teamMemberEmail: '',
  teamMemberMobile: '',
  teamMemberRole: '',
  password: '',
};

export default function TeamMemberPage() {
  const teamMemberHook = useTeamMember();
  const teamHook = useTeam();
  const createTeamHook = useCreateTeam();
  const roleHook = useRole();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());

  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState(emptyMember);

  async function loadData() {
    setLoading(true);
    try {
      const [memberData, teamData, assignmentData, roleData] = await Promise.all([
        teamMemberHook.getAll(),
        teamHook.getAll(),
        createTeamHook.getAll(),
        roleHook.getAll(),
      ]);
      setMembers(Array.isArray(memberData) ? memberData : []);
      setTeams(Array.isArray(teamData) ? teamData : []);
      setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
      setRoles(Array.isArray(roleData) ? roleData : []);
    } catch (error) {
      console.error('Failed to load team members:', error);
      setMembers([]);
      setTeams([]);
      setAssignments([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRoleName = (roleId) => {
    if (!roleId) return '-';
    const roleObj = roles.find((r) => r.roleId === roleId || r.roleId?.toString() === roleId?.toString());
    return roleObj ? roleObj.roleName : String(roleId);
  };

  const isTeamLeadRole = (roleId, roleNameStr) => {
    const name = String(roleNameStr || getRoleName(roleId) || '');
    return name.toLowerCase().includes('lead') || name.toLowerCase().includes('manager');
  };

  const filteredRoles = useMemo(() => {
    if (isSuperAdmin) return roles;
    return roles.filter((r) => {
      const name = r.roleName?.toUpperCase();
      return name !== 'ADMIN' && name !== 'SUPER_ADMIN' && name !== 'SUPER ADMIN';
    });
  }, [roles, isSuperAdmin]);

  const filteredMembers = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return members;
    return members.filter((member) => {
      const linkedTeams = teamsForMember(getMemberId(member), teams, assignments);
      const roleName = getRoleName(member.teamMemberRole);
      return [getMemberLabel(member), member.teamMemberMobile, member.teamMemberEmail, roleName, ...linkedTeams.map(getTeamLabel)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(text);
    });
  }, [assignments, members, query, teams, roles]);

  function openCreate() {
    setEditingMember(null);
    setForm(emptyMember);
    setModalOpen(true);
  }

  function openEdit(member) {
    setEditingMember(member);
    setForm({
      teamMemberName: member.teamMemberName || '',
      teamMemberEmail: member.teamMemberEmail || '',
      teamMemberMobile: member.teamMemberMobile || '',
      teamMemberRole: member.teamMemberRole || '',
      password: '',
    });
    setModalOpen(true);
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toPayload() {
    return {
      teamMemberName: form.teamMemberName.trim(),
      teamMemberEmail: form.teamMemberEmail.trim(),
      teamMemberMobile: form.teamMemberMobile.trim(),
      teamMemberRole: form.teamMemberRole ? Number(form.teamMemberRole) : null,
      password: form.password,
    };
  }

  async function saveMember(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingMember) {
        await teamMemberHook.update(getMemberId(editingMember), toPayload());
      } else {
        await teamMemberHook.create(toPayload());
      }
      setModalOpen(false);
      await loadData();
    } catch (error) {
      console.error(error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error.message ||
        'Something went wrong';
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    setSaving(true);
    try {
      const existingAssignmentIds = assignmentIdsForMember(memberId, assignments);
      await Promise.all(existingAssignmentIds.map((id) => createTeamHook.remove(id)));
      await teamMemberHook.remove(memberId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete member:', error);
      alert('Failed to delete team member.');
    } finally {
      setSaving(false);
    }
  }

  // Summary stats
  const totalStaffCount = members.length;
  const teamLeadsCount = members.filter((m) => isTeamLeadRole(m.teamMemberRole)).length;
  const assignedStaffCount = new Set(assignments.map((a) => a.teamMemberIdFk).filter(Boolean)).size;

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <Icon name="mdi:account-multiple-outline" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Staff Registry</h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Manage company team members, credentials, assigned roles, and departmental associations.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition-all self-start sm:self-auto"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
        >
          <Icon name="mdi:account-plus-outline" className="h-4 w-4" />
          Add Team Member
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Total Members</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Icon name="mdi:account-group-outline" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{totalStaffCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">Registered company users</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Team Leads</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Icon name="mdi:crown-outline" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{teamLeadsCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">Lead role members</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Assigned to Teams</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Icon name="mdi:link-variant" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{assignedStaffCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">Members with team links</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm dark:bg-slate-900 dark:border-white/10">
        <div className="relative w-full sm:w-80">
          <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-800 dark:border-white/10 dark:text-white"
            placeholder="Search name, email, mobile, role, team..."
            type="search"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-gray-400 mr-1">View Mode:</span>
          <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
              }`}
            >
              <Icon name="mdi:format-list-bulleted" className="w-4 h-4" />
              Structured List
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
              }`}
            >
              <Icon name="mdi:view-grid-outline" className="w-4 h-4" />
              Member Cards
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-500 dark:bg-slate-900 dark:border-white/10">
          <Icon name="mdi:loading" className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          Loading Team Members...
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center dark:bg-slate-900 dark:border-white/10">
          <Icon name="mdi:account-multiple-outline" className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">No Team Members Found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            {query ? 'No team members match your search query.' : 'Add your first company staff member to grant CRM access.'}
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
          >
            + Add Team Member
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Structured Table View */
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:bg-slate-900 dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="bg-slate-50 text-gray-500 uppercase font-bold dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-3.5">Staff Member</th>
                  <th className="px-6 py-3.5">Contact Email / Mobile</th>
                  <th className="px-6 py-3.5">Assigned Role</th>
                  <th className="px-6 py-3.5">Department / Team</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredMembers.map((member) => {
                  const memberId = getMemberId(member);
                  const name = getMemberLabel(member);
                  const email = member.teamMemberEmail;
                  const mobile = member.teamMemberMobile;
                  const roleName = getRoleName(member.teamMemberRole);
                  const isLead = isTeamLeadRole(member.teamMemberRole, roleName);
                  const linkedTeams = teamsForMember(memberId, teams, assignments);

                  return (
                    <tr key={memberId} className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs ${
                            isLead ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-900 dark:text-white">{name}</p>
                              {isLead && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  👑 LEAD
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-[11px]">Member ID: #{memberId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800 dark:text-slate-200">{email || '-'}</p>
                        {mobile && <p className="text-gray-400 text-[11px]">{mobile}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                          isLead ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {linkedTeams.length === 0 ? (
                          <span className="text-gray-400 italic">Unassigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {linkedTeams.map((t) => (
                              <span
                                key={t.teamId}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
                              >
                                <Icon name="mdi:folder-outline" className="w-3 h-3" />
                                {getTeamLabel(t)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(member)}
                            className="rounded-xl p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Edit member details"
                          >
                            <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteMember(memberId)}
                            className="rounded-xl p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete staff member"
                          >
                            <Icon name="mdi:trash-can-outline" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Member Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => {
            const memberId = getMemberId(member);
            const name = getMemberLabel(member);
            const email = member.teamMemberEmail;
            const mobile = member.teamMemberMobile;
            const roleName = getRoleName(member.teamMemberRole);
            const isLead = isTeamLeadRole(member.teamMemberRole, roleName);
            const linkedTeams = teamsForMember(memberId, teams, assignments);

            return (
              <div
                key={memberId}
                className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:bg-slate-900 dark:border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center text-sm ${
                        isLead ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">{name}</h3>
                          {isLead && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              👑 LEAD
                            </span>
                          )}
                        </div>
                        {email && <p className="text-xs text-gray-400 mt-0.5">{email}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(member)}
                        className="rounded-xl p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit member"
                      >
                        <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteMember(memberId)}
                        className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete member"
                      >
                        <Icon name="mdi:trash-can-outline" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Assigned Role:</span>
                      <span className="font-bold text-gray-800 dark:text-white px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        {roleName}
                      </span>
                    </div>

                    {mobile && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                        <Icon name="mdi:phone-outline" className="w-4 h-4 text-gray-400" />
                        <span>{mobile}</span>
                      </div>
                    )}

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Assigned Teams</p>
                      {linkedTeams.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Unassigned</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {linkedTeams.map((t) => (
                            <span
                              key={t.teamId}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
                            >
                              <Icon name="mdi:folder-outline" className="w-3.5 h-3.5" />
                              {getTeamLabel(t)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs text-gray-400">ID: #{memberId}</span>
                  <button
                    onClick={() => openEdit(member)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Edit Profile <Icon name="mdi:chevron-right" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team Member Modal Drawer */}
      <AppDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? 'Edit Staff Member' : 'Add New Team Member'}
        subtitle={editingMember ? 'Update contact details, role, and credentials' : 'Register a new staff member and assign system role'}
        icon="mdi:account-multiple-outline"
        footer={
          <>
            <button
              type="button"
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              form="team-member-form"
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md disabled:opacity-60 hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingMember ? 'Save Changes' : 'Create Member'}
            </button>
          </>
        }
      >
        <form id="team-member-form" onSubmit={saveMember} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Full Name *</span>
              <input
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                placeholder="Full Name"
                value={form.teamMemberName}
                onChange={(e) => updateField('teamMemberName', e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Email Address *</span>
              <input
                type="email"
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                placeholder="member@company.com"
                value={form.teamMemberEmail}
                onChange={(e) => updateField('teamMemberEmail', e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Mobile Number</span>
              <input
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                placeholder="+91 9876543210"
                value={form.teamMemberMobile}
                onChange={(e) => updateField('teamMemberMobile', e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Select Role *</span>
              <select
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                value={form.teamMemberRole}
                onChange={(e) => updateField('teamMemberRole', e.target.value)}
                required
              >
                <option value="">Select Role</option>
                {filteredRoles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                {editingMember ? 'Reset Password' : 'Password *'}
              </span>
              <input
                type="password"
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                placeholder="Account password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                required={!editingMember}
              />
            </label>
          </div>
        </form>
      </AppDrawer>
    </div>
  );
}
