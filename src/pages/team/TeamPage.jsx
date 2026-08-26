import { useEffect, useMemo, useState } from 'react';
import AppDrawer from '../../components/common/AppDrawer';
import Icon from '../../components/Icon';
import { useCreateTeam } from '../../hooks/useCreateTeam';
import { useTeam } from '../../hooks/useTeam';
import { useTeamMember } from '../../hooks/useTeamMember';
import {
  assignmentIdsForTeam,
  getMemberId,
  getMemberLabel,
  getTeamId,
  getTeamLabel,
  membersForTeam,
} from '../../utils/teamRelations';

const emptyForm = { teamName: '', teamLeadId: '', memberToAdd: '', memberIds: [] };

export default function TeamPage() {
  const teamHook = useTeam();
  const teamMemberHook = useTeamMember();
  const createTeamHook = useCreateTeam();
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);
    try {
      const [teamData, memberData, assignmentData] = await Promise.all([
        teamHook.getAll(),
        teamMemberHook.getAll(),
        createTeamHook.getAll(),
      ]);
      setTeams(Array.isArray(teamData) ? teamData : []);
      setMembers(Array.isArray(memberData) ? memberData : []);
      setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setTeams([]);
      setMembers([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTeams = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return teams;
    return teams.filter((team) => {
      const teamMembers = membersForTeam(getTeamId(team), members, assignments);
      const leadMember = members.find((m) => Number(getMemberId(m)) === Number(team.teamLeadId));
      return [getTeamLabel(team), leadMember ? getMemberLabel(leadMember) : '', ...teamMembers.map(getMemberLabel)]
        .join(' ')
        .toLowerCase()
        .includes(text);
    });
  }, [assignments, members, query, teams]);

  const selectedMembers = useMemo(
    () => members.filter((member) => form.memberIds.includes(Number(getMemberId(member)))),
    [form.memberIds, members],
  );

  const availableMembers = useMemo(
    () => members.filter((member) => !form.memberIds.includes(Number(getMemberId(member)))),
    [form.memberIds, members],
  );

  function openCreate() {
    setEditingTeam(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(team) {
    const teamId = getTeamId(team);
    setEditingTeam(team);
    setForm({
      teamName: getTeamLabel(team),
      teamLeadId: team.teamLeadId ? String(team.teamLeadId) : '',
      memberToAdd: '',
      memberIds: membersForTeam(teamId, members, assignments).map((member) => Number(getMemberId(member))),
    });
    setModalOpen(true);
  }

  function addMember() {
    const memberId = Number(form.memberToAdd);
    if (!memberId) return;
    setForm((current) => ({
      ...current,
      memberToAdd: '',
      memberIds: [...current.memberIds, memberId],
    }));
  }

  function removeMember(memberId) {
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.filter((id) => id !== Number(memberId)),
    }));
  }

  async function syncTeamMembers(teamId, memberIds) {
    const existingAssignmentIds = assignmentIdsForTeam(teamId, assignments);
    await Promise.all(existingAssignmentIds.map((id) => createTeamHook.remove(id)));
    await Promise.all(
      memberIds.map((memberId) => {
        const member = members.find((item) => Number(getMemberId(item)) === Number(memberId));
        return createTeamHook.create({
          teamIdFk: teamId,
          teamMemberIdFk: memberId,
          roleIdFk: member?.teamMemberRole ? Number(member.teamMemberRole) : null,
        });
      }),
    );
  }

  async function saveTeam(e) {
    e.preventDefault();
    const teamName = form.teamName.trim();
    if (!teamName) return;
    setSaving(true);
    try {
      const payload = {
        teamName,
        teamLeadId: form.teamLeadId ? Number(form.teamLeadId) : null,
      };
      const team = editingTeam
        ? await teamHook.update(getTeamId(editingTeam), payload)
        : await teamHook.create(payload);
      await syncTeamMembers(getTeamId(team), form.memberIds);
      setModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Failed to save team:', error);
      alert('Unable to save team. Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeam(teamId) {
    if (!confirm('Are you sure you want to delete this team? Member assignments will be removed.')) return;
    setSaving(true);
    try {
      const existingAssignmentIds = assignmentIdsForTeam(teamId, assignments);
      await Promise.all(existingAssignmentIds.map((id) => createTeamHook.remove(id)));
      await teamHook.remove(teamId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('Failed to delete team.');
    } finally {
      setSaving(false);
    }
  }

  // Summary stats
  const activeTeamsCount = teams.length;
  const teamsWithLead = teams.filter((t) => t.teamLeadId).length;
  const totalAssignedMembers = new Set(assignments.map((a) => a.teamMemberIdFk).filter(Boolean)).size;

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <Icon name="mdi:account-group-outline" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Teams Directory</h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Create departments, assign team leads, and manage operational teams across your organization.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition-all self-start sm:self-auto"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <Icon name="mdi:plus" className="h-4 w-4" />
          Create New Team
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Active Teams</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Icon name="mdi:account-group-outline" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{activeTeamsCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">Configured company teams</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Teams with Lead</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Icon name="mdi:crown-outline" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{teamsWithLead}</p>
          <p className="text-[11px] text-gray-400 mt-1">Assigned team leads</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Assigned Staff</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Icon name="mdi:account-multiple-outline" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{totalAssignedMembers}</p>
          <p className="text-[11px] text-gray-400 mt-1">Total members across teams</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm dark:bg-slate-900 dark:border-white/10">
        <div className="relative w-full sm:w-80">
          <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:bg-slate-800 dark:border-white/10 dark:text-white"
            placeholder="Search team name, lead, or member..."
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
                  ? 'bg-white text-purple-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
              }`}
            >
              <Icon name="mdi:view-grid-outline" className="w-4 h-4" />
              Department Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-purple-700 shadow-sm dark:bg-slate-700 dark:text-white'
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
          <Icon name="mdi:loading" className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
          Loading teams...
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center dark:bg-slate-900 dark:border-white/10">
          <Icon name="mdi:account-group-outline" className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">No Teams Found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            {query ? 'No teams match your search term. Try clearing filters.' : 'Create your first team to assign team leads and organize company staff.'}
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:underline"
          >
            + Create New Team
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Team Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const teamId = getTeamId(team);
            const teamMembers = membersForTeam(teamId, members, assignments);
            const leadMember = members.find((m) => Number(getMemberId(m)) === Number(team.teamLeadId));

            return (
              <div
                key={teamId}
                className="group rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:bg-slate-900 dark:border-white/10 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm dark:bg-purple-900/30 dark:text-purple-300">
                        <Icon name="mdi:folder-account-outline" className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                          {getTeamLabel(team)}
                        </h3>
                        <p className="text-xs text-gray-400">Team ID: #{teamId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(team)}
                        className="rounded-xl p-2 text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                        title="Edit team details"
                      >
                        <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteTeam(teamId)}
                        className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete team"
                      >
                        <Icon name="mdi:trash-can-outline" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Team Lead Indicator */}
                  {leadMember ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-800 text-xs font-bold mb-4 dark:bg-amber-950/20 dark:border-amber-500/20 dark:text-amber-300">
                      <Icon name="mdi:crown" className="w-4 h-4 text-amber-600" />
                      <span>Team Lead: <strong>{getMemberLabel(leadMember)}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 text-xs mb-4 dark:bg-slate-800 dark:border-white/5">
                      <Icon name="mdi:account-alert-outline" className="w-4 h-4 text-slate-400" />
                      <span>No Team Lead assigned</span>
                    </div>
                  )}

                  {/* Member Badges */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Assigned Members ({teamMembers.length})</p>
                    {teamMembers.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No members assigned.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {teamMembers.map((m) => (
                          <span
                            key={getMemberId(m)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium dark:bg-slate-800 dark:text-slate-200"
                          >
                            <span className="w-4 h-4 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center font-bold text-[9px]">
                              {getMemberLabel(m).substring(0, 1)}
                            </span>
                            {getMemberLabel(m)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{teamMembers.length} Members</span>
                  <button
                    onClick={() => openEdit(team)}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                  >
                    Edit Members <Icon name="mdi:chevron-right" className="w-4 h-4" />
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
                  <th className="px-6 py-3.5">Team Name</th>
                  <th className="px-6 py-3.5">Assigned Team Lead</th>
                  <th className="px-6 py-3.5">Team Members Count</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredTeams.map((team) => {
                  const teamId = getTeamId(team);
                  const teamMembers = membersForTeam(teamId, members, assignments);
                  const leadMember = members.find((m) => Number(getMemberId(m)) === Number(team.teamLeadId));

                  return (
                    <tr key={teamId} className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs dark:bg-purple-900/30 dark:text-purple-300">
                            <Icon name="mdi:folder-outline" className="w-4 h-4" />
                          </span>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{getTeamLabel(team)}</p>
                            <p className="text-gray-400 text-[11px]">ID: #{teamId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {leadMember ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-500/20">
                            <Icon name="mdi:crown" className="w-3.5 h-3.5 text-amber-600" />
                            {getMemberLabel(leadMember)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300">
                          {teamMembers.length} Members
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(team)}
                            className="rounded-xl p-2 text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                            title="Edit team"
                          >
                            <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTeam(teamId)}
                            className="rounded-xl p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete team"
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

      {/* Team Modal Drawer */}
      <AppDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeam ? 'Edit Team Details' : 'Create New Team'}
        subtitle={editingTeam ? 'Update team name, designated lead, and member assignments' : 'Configure a new department and assign team lead'}
        icon="mdi:account-group-outline"
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
              form="team-create-form"
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md disabled:opacity-60 hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingTeam ? 'Save Changes' : 'Create Team'}
            </button>
          </>
        }
      >
        <form id="team-create-form" onSubmit={saveTeam} autoComplete="off" data-lpignore="true" className="space-y-5">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Team Name *</span>
              <input
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                placeholder="e.g. Sales Team, Development Team, Support"
                value={form.teamName}
                onChange={(e) => setForm((cur) => ({ ...cur, teamName: e.target.value }))}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Designated Team Lead</span>
              <select
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                value={form.teamLeadId}
                onChange={(e) => setForm((cur) => ({ ...cur, teamLeadId: e.target.value }))}
              >
                <option value="">Select Team Lead (Optional)</option>
                {members.map((m) => (
                  <option key={getMemberId(m)} value={getMemberId(m)}>
                    👑 {getMemberLabel(m)} ({m.teamMemberEmail || 'No email'})
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <span className="block text-xs font-semibold text-gray-700 dark:text-slate-300">Assign Team Members</span>
              <div className="flex gap-2">
                <select
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white"
                  value={form.memberToAdd}
                  onChange={(e) => setForm((cur) => ({ ...cur, memberToAdd: e.target.value }))}
                >
                  <option value="">Choose Member to Add</option>
                  {availableMembers.map((m) => (
                    <option key={getMemberId(m)} value={getMemberId(m)}>
                      {getMemberLabel(m)} ({m.teamMemberEmail || 'No email'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addMember}
                  className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                >
                  + Add
                </button>
              </div>

              {/* Selected Members Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedMembers.map((m) => (
                  <span
                    key={getMemberId(m)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-100 text-purple-800 text-xs font-bold"
                  >
                    {getMemberLabel(m)}
                    <button
                      type="button"
                      onClick={() => removeMember(getMemberId(m))}
                      className="ml-1 text-purple-600 hover:text-purple-900"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </form>
      </AppDrawer>
    </div>
  );
}
