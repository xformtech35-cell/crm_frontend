import { useEffect, useMemo, useState } from 'react';
import AppDrawer from '../../components/common/AppDrawer';
import Icon from '../../components/Icon';
import { useCreateTeam } from '../../hooks/useCreateTeam';
import { useTeam } from '../../hooks/useTeam';
import { useTeamMember } from '../../hooks/useTeamMember';
import { useRole } from '../../hooks/useRole';
import {
  getMemberId,
  getMemberLabel,
  getTeamLabel,
  teamsForMember,
} from '../../utils/teamRelations';

const emptyForm = {
  selectedMemberId: '',
  teamMemberName: '',
  teamMemberEmail: '',
  teamMemberMobile: '',
  teamIdFk: '',
  password: '',
};

export default function TeamLeadPage() {
  const teamMemberHook = useTeamMember();
  const teamHook = useTeam();
  const createTeamHook = useCreateTeam();
  const roleHook = useRole();

  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [form, setForm] = useState(emptyForm);

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
      console.error('Failed to load team lead master:', error);
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

  // Identify Team Lead role ID from roles catalog
  const teamLeadRoleObj = useMemo(() => {
    return roles.find(
      (r) =>
        r.roleName?.toUpperCase() === 'TEAM LEAD' ||
        r.roleName?.toUpperCase() === 'TEAM_LEAD' ||
        r.roleName?.toUpperCase() === 'TEAM LEADER'
    );
  }, [roles]);

  const teamLeads = useMemo(() => {
    return members.filter((member) => {
      const roleObj = roles.find((r) => String(r.roleId) === String(member.teamMemberRole));
      const isRoleMatch = roleObj
        ? roleObj.roleName?.toUpperCase().includes('TEAM LEAD') || roleObj.roleName?.toUpperCase().includes('TEAM_LEAD')
        : String(member.teamMemberRole).toUpperCase().includes('LEAD');
      
      const isAssignedLead = teams.some((t) => Number(t.teamLeadId) === Number(getMemberId(member)));
      return isRoleMatch || isAssignedLead;
    });
  }, [members, roles, teams]);

  const filteredTeamLeads = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return teamLeads;
    return teamLeads.filter((member) => {
      const linkedTeams = teamsForMember(getMemberId(member), teams, assignments);
      return [getMemberLabel(member), member.teamMemberMobile, member.teamMemberEmail, ...linkedTeams.map(getTeamLabel)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(text);
    });
  }, [assignments, members, query, teamLeads, teams]);

  function openCreate() {
    setEditingLead(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(member) {
    const linkedTeams = teamsForMember(getMemberId(member), teams, assignments);
    const firstTeam = linkedTeams[0]?.teamId || '';
    setEditingLead(member);
    setForm({
      selectedMemberId: String(getMemberId(member)),
      teamMemberName: member.teamMemberName || '',
      teamMemberEmail: member.teamMemberEmail || '',
      teamMemberMobile: member.teamMemberMobile || '',
      teamIdFk: firstTeam ? String(firstTeam) : '',
      password: '',
    });
    setModalOpen(true);
  }

  function handleSelectMember(memberId) {
    if (!memberId) {
      setForm((cur) => ({
        ...cur,
        selectedMemberId: '',
        teamMemberName: '',
        teamMemberEmail: '',
        teamMemberMobile: '',
      }));
      return;
    }
    const found = members.find((m) => String(getMemberId(m)) === String(memberId));
    if (found) {
      setForm((cur) => ({
        ...cur,
        selectedMemberId: String(getMemberId(found)),
        teamMemberName: found.teamMemberName || '',
        teamMemberEmail: found.teamMemberEmail || '',
        teamMemberMobile: found.teamMemberMobile || '',
      }));
    }
  }

  async function saveTeamLead(e) {
    e.preventDefault();
    if (!form.teamMemberName.trim() || !form.teamMemberEmail.trim()) {
      alert('Name and Email are required.');
      return;
    }
    setSaving(true);
    try {
      const roleIdToUse = teamLeadRoleObj ? teamLeadRoleObj.roleId : null;
      const payload = {
        teamMemberName: form.teamMemberName.trim(),
        teamMemberEmail: form.teamMemberEmail.trim(),
        teamMemberMobile: form.teamMemberMobile.trim(),
        teamMemberRole: roleIdToUse,
        password: form.password,
      };

      let savedMember;
      if (editingLead) {
        savedMember = await teamMemberHook.update(getMemberId(editingLead), payload);
      } else if (form.selectedMemberId) {
        savedMember = await teamMemberHook.update(form.selectedMemberId, payload);
      } else {
        savedMember = await teamMemberHook.create(payload);
      }

      // If team is selected, assign this lead to the team
      if (form.teamIdFk && savedMember) {
        const teamId = Number(form.teamIdFk);
        const teamObj = teams.find((t) => Number(t.teamId) === teamId);
        if (teamObj) {
          await teamHook.update(teamId, {
            teamName: teamObj.teamName,
            teamLeadId: getMemberId(savedMember),
          });
        }
        await createTeamHook.create({
          teamIdFk: teamId,
          teamMemberIdFk: getMemberId(savedMember),
          roleIdFk: roleIdToUse,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Failed to save Team Lead:', error);
      alert(error?.response?.data?.message || 'Failed to save Team Lead.');
    } finally {
      setSaving(false);
    }
  }

  async function removeTeamLead(member) {
    if (!confirm(`Are you sure you want to remove Team Lead role for ${getMemberLabel(member)}?`)) return;
    setSaving(true);
    try {
      // Find teams led by this member and clear lead ID
      const ledTeams = teams.filter((t) => Number(t.teamLeadId) === Number(getMemberId(member)));
      await Promise.all(
        ledTeams.map((t) =>
          teamHook.update(t.teamId, {
            teamName: t.teamName,
            teamLeadId: null,
          })
        )
      );
      await loadData();
    } catch (error) {
      console.error('Failed to remove team lead:', error);
      alert('Failed to update team lead role.');
    } finally {
      setSaving(false);
    }
  }

  // Summary stats
  const totalLeadsCount = teamLeads.length;
  const managedTeamsCount = teams.filter((t) => t.teamLeadId).length;

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Icon name="mdi:account-star-outline" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Team Leads Center</h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Designate team leaders, manage lead portfolios, and oversee departmental reporting hierarchies.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-500/20 hover:scale-105 transition-all self-start sm:self-auto"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        >
          <Icon name="mdi:crown" className="h-4 w-4" />
          Add / Designate Team Lead
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Total Team Leads</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Icon name="mdi:crown" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{totalLeadsCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">Active team leaders</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Managed Teams</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Icon name="mdi:folder-account-outline" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{managedTeamsCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">Teams with active leads</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Hierarchy Level</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Icon name="mdi:shield-account" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">Mid-Tier</p>
          <p className="text-[11px] text-gray-400 mt-1">Manages team members data</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm dark:bg-slate-900 dark:border-white/10">
        <div className="relative w-full sm:w-80">
          <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:bg-slate-800 dark:border-white/10 dark:text-white"
            placeholder="Search lead name, email, mobile, or team..."
            type="search"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-gray-400 mr-1">View Mode:</span>
          <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-amber-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
              }`}
            >
              <Icon name="mdi:view-grid-outline" className="w-4 h-4" />
              Lead Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-amber-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
              }`}
            >
              <Icon name="mdi:format-list-bulleted" className="w-4 h-4" />
              Structured List
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-500 dark:bg-slate-900 dark:border-white/10">
          <Icon name="mdi:loading" className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-2" />
          Loading Team Leads...
        </div>
      ) : filteredTeamLeads.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center dark:bg-slate-900 dark:border-white/10">
          <Icon name="mdi:account-star-outline" className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">No Team Leads Found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            {query ? 'No team leads match your search query.' : 'Designate staff members as Team Leads to manage teams and view team data.'}
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:underline"
          >
            + Add / Designate Team Lead
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Team Lead Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeamLeads.map((member) => {
            const memberId = getMemberId(member);
            const name = getMemberLabel(member);
            const email = member.teamMemberEmail;
            const mobile = member.teamMemberMobile;
            const ledTeams = teams.filter((t) => Number(t.teamLeadId) === Number(memberId));
            const memberTeams = teamsForMember(memberId, teams, assignments);

            return (
              <div
                key={memberId}
                className="group rounded-3xl border border-amber-100 bg-gradient-to-b from-amber-50/40 via-white to-white p-6 shadow-sm hover:shadow-md transition-all dark:bg-slate-900 dark:border-amber-500/20 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold text-sm shadow-sm dark:bg-amber-900/40 dark:text-amber-300">
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">{name}</h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            👑 TEAM LEAD
                          </span>
                        </div>
                        {email && <p className="text-xs text-gray-400 mt-0.5">{email}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(member)}
                        className="rounded-xl p-2 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                        title="Edit Team Lead"
                      >
                        <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeTeamLead(member)}
                        className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove Team Lead Role"
                      >
                        <Icon name="mdi:trash-can-outline" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Portfolio Information */}
                  <div className="space-y-3">
                    {mobile && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                        <Icon name="mdi:phone-outline" className="w-4 h-4 text-gray-400" />
                        <span>{mobile}</span>
                      </div>
                    )}

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Teams Led ({ledTeams.length})</p>
                      {ledTeams.length === 0 ? (
                        <p className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 inline-block">
                          No team assigned yet
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {ledTeams.map((t) => (
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
                  <span className="text-xs text-gray-400">{memberTeams.length} Total Teams</span>
                  <button
                    onClick={() => openEdit(member)}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    Manage Lead <Icon name="mdi:chevron-right" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Structured Table View */
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:bg-slate-900 dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 text-gray-500 uppercase font-bold dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-6 py-3.5">Team Lead Name</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Assigned Teams Led</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredTeamLeads.map((member) => {
                  const memberId = getMemberId(member);
                  const name = getMemberLabel(member);
                  const email = member.teamMemberEmail;
                  const mobile = member.teamMemberMobile;
                  const ledTeams = teams.filter((t) => Number(t.teamLeadId) === Number(memberId));

                  return (
                    <tr key={memberId} className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold flex items-center justify-center text-xs dark:bg-amber-900/40 dark:text-amber-300">
                            {name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-900 dark:text-white">{name}</p>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                👑 LEAD
                              </span>
                            </div>
                            <p className="text-gray-400 text-[11px]">ID: #{memberId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800 dark:text-slate-200">{email || '-'}</p>
                        {mobile && <p className="text-gray-400 text-[11px]">{mobile}</p>}
                      </td>
                      <td className="px-6 py-4">
                        {ledTeams.length === 0 ? (
                          <span className="text-gray-400 italic">No teams assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {ledTeams.map((t) => (
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
                            className="rounded-xl p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title="Edit Team Lead"
                          >
                            <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeTeamLead(member)}
                            className="rounded-xl p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Remove Team Lead Role"
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
      )}

      {/* Team Lead Modal Drawer */}
      <AppDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLead ? 'Edit Team Lead' : 'Designate / Add Team Lead'}
        subtitle={editingLead ? 'Update team lead details and assigned department' : 'Create or convert a staff member into a Team Lead'}
        icon="mdi:account-star-outline"
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
              form="team-lead-form"
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md disabled:opacity-60 hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingLead ? 'Save Changes' : 'Assign Team Lead'}
            </button>
          </>
        }
      >
        <form id="team-lead-form" onSubmit={saveTeamLead} className="space-y-4">
          {!editingLead && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Promote Existing Team Member (Optional)</span>
              <select
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                value={form.selectedMemberId}
                onChange={(e) => handleSelectMember(e.target.value)}
              >
                <option value="">Create New Team Lead Account</option>
                {members.map((m) => (
                  <option key={getMemberId(m)} value={getMemberId(m)}>
                    {getMemberLabel(m)} ({m.teamMemberEmail || 'No email'})
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Full Name *</span>
              <input
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                placeholder="Team Lead Full Name"
                value={form.teamMemberName}
                onChange={(e) => setForm((cur) => ({ ...cur, teamMemberName: e.target.value }))}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Email Address *</span>
              <input
                type="email"
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                placeholder="lead@company.com"
                value={form.teamMemberEmail}
                onChange={(e) => setForm((cur) => ({ ...cur, teamMemberEmail: e.target.value }))}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Mobile Number</span>
              <input
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                placeholder="+91 9876543210"
                value={form.teamMemberMobile}
                onChange={(e) => setForm((cur) => ({ ...cur, teamMemberMobile: e.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Assign to Team</span>
              <select
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                value={form.teamIdFk}
                onChange={(e) => setForm((cur) => ({ ...cur, teamIdFk: e.target.value }))}
              >
                <option value="">Select Team to Lead (Optional)</option>
                {teams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    📁 {t.teamName} (Team #{t.teamId})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">
                {editingLead ? 'Reset Password' : 'Password *'}
              </span>
              <input
                type="password"
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                placeholder="Account password"
                value={form.password}
                onChange={(e) => setForm((cur) => ({ ...cur, password: e.target.value }))}
                required={!editingLead}
              />
            </label>
          </div>
        </form>
      </AppDrawer>
    </div>
  );
}
