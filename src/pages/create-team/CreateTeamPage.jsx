import { useEffect, useMemo, useState } from 'react';
import AppDrawer from '../../components/common/AppDrawer';
import Icon from '../../components/Icon';
import { useCreateTeam } from '../../hooks/useCreateTeam';
import { useTeam } from '../../hooks/useTeam';
import { useTeamMember } from '../../hooks/useTeamMember';
import { useRole } from '../../hooks/useRole';

export default function CreateTeamPage() {
  const createTeamHook = useCreateTeam();
  const teamHook = useTeam();
  const teamMemberHook = useTeamMember();
  const roleHook = useRole();

  const [assignments, setAssignments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [form, setForm] = useState({
    teamIdFk: '',
    teamMemberIdFk: '',
    roleIdFk: '',
  });

  const extractArray = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    return [];
  };

  async function loadData() {
    setLoading(true);
    try {
      const [assignmentData, teamData, memberData, roleData] = await Promise.all([
        createTeamHook.getAll(),
        teamHook.getAll(),
        teamMemberHook.getAll(),
        roleHook.getAll(),
      ]);
      setAssignments(extractArray(assignmentData));
      setTeams(extractArray(teamData));
      setMembers(extractArray(memberData));
      setRoles(extractArray(roleData));
    } catch (error) {
      console.error('Failed to load team assignment data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTeamObj = (teamId) => teams.find((t) => String(t.teamId) === String(teamId) || String(t.id) === String(teamId));
  const getTeamName = (teamId) => {
    const obj = getTeamObj(teamId);
    return obj ? (obj.teamName || obj.name) : `Team #${teamId}`;
  };

  const getMemberObj = (memberId) => members.find((m) => String(m.teamMemberId) === String(memberId) || String(m.userid) === String(memberId) || String(m.id) === String(memberId));
  const getMemberName = (memberId) => {
    const obj = getMemberObj(memberId);
    return obj ? (obj.teamMemberName || obj.username || obj.name) : `Member #${memberId}`;
  };

  const getMemberEmail = (memberId) => {
    const obj = getMemberObj(memberId);
    return obj ? (obj.teamMemberEmail || obj.userEmail || '') : '';
  };

  const getRoleObj = (roleId) => roles.find((r) => String(r.roleId) === String(roleId) || String(r.id) === String(roleId));
  const getRoleName = (roleId, fallbackRoleId) => {
    const targetId = roleId || fallbackRoleId;
    if (!targetId) return 'Executive';
    const obj = getRoleObj(targetId);
    return obj ? (obj.roleName || obj.name) : `Role #${targetId}`;
  };

  const isTeamLeadRole = (roleId, roleNameStr) => {
    const name = roleNameStr || getRoleName(roleId);
    return name.toLowerCase().includes('lead') || name.toLowerCase().includes('manager');
  };

  const filteredAssignments = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return assignments;
    return assignments.filter((item) => {
      const memberObj = getMemberObj(item.teamMemberIdFk);
      const teamName = getTeamName(item.teamIdFk).toLowerCase();
      const memberName = getMemberName(item.teamMemberIdFk).toLowerCase();
      const memberEmail = getMemberEmail(item.teamMemberIdFk).toLowerCase();
      const roleName = getRoleName(item.roleIdFk, memberObj?.teamMemberRole).toLowerCase();
      return teamName.includes(text) || memberName.includes(text) || memberEmail.includes(text) || roleName.includes(text);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, teams, members, roles, query]);

  // Group assignments by Team
  const groupedByTeam = useMemo(() => {
    const map = new Map();
    // Pre-populate with known teams
    teams.forEach((t) => {
      const tid = String(t.teamId || t.id);
      map.set(tid, {
        team: t,
        assignments: [],
      });
    });

    filteredAssignments.forEach((a) => {
      const key = String(a.teamIdFk || a.teamId);
      if (!map.has(key)) {
        const teamObj = getTeamObj(key) || { teamId: a.teamIdFk, teamName: getTeamName(a.teamIdFk) };
        map.set(key, {
          team: teamObj,
          assignments: [],
        });
      }
      map.get(key).assignments.push(a);
    });

    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, filteredAssignments, members, roles]);

  function openCreate(preselectedTeamId = '') {
    setEditingAssignment(null);
    setForm({
      teamIdFk: preselectedTeamId ? String(preselectedTeamId) : '',
      teamMemberIdFk: '',
      roleIdFk: '',
    });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingAssignment(item);
    setForm({
      teamIdFk: item.teamIdFk || '',
      teamMemberIdFk: item.teamMemberIdFk || '',
      roleIdFk: item.roleIdFk || '',
    });
    setModalOpen(true);
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function saveAssignment(e) {
    e.preventDefault();
    if (!form.teamIdFk || !form.teamMemberIdFk || !form.roleIdFk) {
      alert('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        teamIdFk: Number(form.teamIdFk),
        teamMemberIdFk: Number(form.teamMemberIdFk),
        roleIdFk: Number(form.roleIdFk),
      };
      if (editingAssignment) {
        await createTeamHook.update(editingAssignment.createTeamId, payload);
      } else {
        await createTeamHook.create(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Failed to save assignment:', error);
      alert('Failed to save assignment. This member might already be assigned.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment(id) {
    if (!confirm('Are you sure you want to remove this team assignment?')) return;
    setSaving(true);
    try {
      await createTeamHook.remove(id);
      await loadData();
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      alert('Failed to remove assignment.');
    } finally {
      setSaving(false);
    }
  }

  // Summary stats
  const activeTeamsCount = new Set(assignments.map((a) => a.teamIdFk).filter(Boolean)).size;
  const assignedMembersCount = new Set(assignments.map((a) => a.teamMemberIdFk).filter(Boolean)).size;
  const teamLeadsCount = assignments.filter((a) => isTeamLeadRole(a.roleIdFk)).length;

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <Icon name="mdi:account-supervisor-circle-outline" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Manage Teams</h1>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Dynamically organize company departments, assign team leads, and map members to operational teams.
          </p>
        </div>

        <button
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition-all self-start sm:self-auto"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <Icon name="mdi:account-plus-outline" className="h-4 w-4" />
          Assign Member to Team
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Total Assignments</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Icon name="mdi:link-variant" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{assignments.length}</p>
          <p className="text-[11px] text-gray-400 mt-1">Active team-member links</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Active Teams</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Icon name="mdi:account-group-outline" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{activeTeamsCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">Configured operational teams</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Assigned Members</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Icon name="mdi:account-multiple-outline" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{assignedMembersCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">Unique staff members assigned</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Team Leads</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Icon name="mdi:crown-outline" className="w-5 h-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{teamLeadsCount}</p>
          <p className="text-[11px] text-gray-400 mt-1">Designated team leads & managers</p>
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
            placeholder="Search teams, members, emails, roles..."
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
              Team Cards
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

      {/* Main Content Area */}
      {loading ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-500 dark:bg-slate-900 dark:border-white/10">
          <Icon name="mdi:loading" className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
          Loading team assignments...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center dark:bg-slate-900 dark:border-white/10">
          <Icon name="mdi:account-group-outline" className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">No Team Assignments Found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            {query ? 'No assignments match your search query. Try clearing filters.' : 'Get started by assigning team members to operational teams.'}
          </p>
          <button
            onClick={() => openCreate()}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:underline"
          >
            + Add New Team Assignment
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Team Cards View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groupedByTeam.map((group) => {
            const teamLeadAssignment = group.assignments.find((a) => {
              const memberObj = getMemberObj(a.teamMemberIdFk);
              const effectiveRoleId = a.roleIdFk || memberObj?.teamMemberRole;
              return isTeamLeadRole(effectiveRoleId) ||
                     String(group.team.teamLeadId || group.team.teamLeadIdFk) === String(a.teamMemberIdFk);
            });
            const teamLeadName = teamLeadAssignment
              ? getMemberName(teamLeadAssignment.teamMemberIdFk)
              : (group.team.teamLeadId || group.team.teamLeadIdFk ? getMemberName(group.team.teamLeadId || group.team.teamLeadIdFk) : null);

            return (
              <div
                key={group.team.teamId}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-white/10 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm dark:bg-purple-900/30 dark:text-purple-300">
                        <Icon name="mdi:folder-account-outline" className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{group.team.teamName}</h3>
                        <p className="text-xs text-gray-400">Team ID: #{group.team.teamId}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => openCreate(group.team.teamId)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      + Add Member
                    </button>
                  </div>

                  {/* Team Lead Indicator */}
                  {teamLeadName ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-800 text-xs font-bold mb-4 dark:bg-amber-950/20 dark:border-amber-500/20 dark:text-amber-300">
                      <Icon name="mdi:crown" className="w-4 h-4 text-amber-600" />
                      <span>Team Lead: <strong>{teamLeadName}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 text-xs mb-4 dark:bg-slate-800 dark:border-white/5">
                      <Icon name="mdi:account-alert-outline" className="w-4 h-4 text-slate-400" />
                      <span>No Team Lead assigned yet</span>
                    </div>
                  )}

                  {/* Members List */}
                  <div className="space-y-3">
                    {group.assignments.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">No members assigned to this team.</p>
                    ) : (
                      group.assignments.map((item) => {
                        const memberObj = getMemberObj(item.teamMemberIdFk);
                        const mName = getMemberName(item.teamMemberIdFk);
                        const mEmail = getMemberEmail(item.teamMemberIdFk);
                        const effectiveRoleId = item.roleIdFk || memberObj?.teamMemberRole;
                        const rName = getRoleName(item.roleIdFk, memberObj?.teamMemberRole);
                        const isLead = isTeamLeadRole(effectiveRoleId, rName) ||
                                       String(group.team.teamLeadId || group.team.teamLeadIdFk) === String(item.teamMemberIdFk);

                        return (
                          <div
                            key={item.createTeamId}
                            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-sm transition-all dark:bg-slate-800/60 dark:border-white/5 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                isLead ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {mName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-gray-900 dark:text-white">{mName}</p>
                                  {isLead && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                      👑 LEAD
                                    </span>
                                  )}
                                </div>
                                {mEmail && <p className="text-[11px] text-gray-400">{mEmail}</p>}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                isLead ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                {rName}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEdit(item)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                  title="Edit role/assignment"
                                >
                                  <Icon name="mdi:pencil-outline" className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteAssignment(item.createTeamId)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Remove assignment"
                                >
                                  <Icon name="mdi:trash-can-outline" className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-400">
                  <span>Total Members: {group.assignments.length}</span>
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
                  <th className="px-6 py-3.5">Assigned Team</th>
                  <th className="px-6 py-3.5">Team Member</th>
                  <th className="px-6 py-3.5">Assigned Role</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredAssignments.map((item) => {
                  const memberObj = getMemberObj(item.teamMemberIdFk);
                  const mName = getMemberName(item.teamMemberIdFk);
                  const mEmail = getMemberEmail(item.teamMemberIdFk);
                  const effectiveRoleId = item.roleIdFk || memberObj?.teamMemberRole;
                  const rName = getRoleName(item.roleIdFk, memberObj?.teamMemberRole);
                  const tName = getTeamName(item.teamIdFk);
                  const isLead = isTeamLeadRole(effectiveRoleId, rName);

                  return (
                    <tr key={item.createTeamId} className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs border border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-500/20">
                          <Icon name="mdi:folder-outline" className="w-3.5 h-3.5" />
                          {tName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isLead ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {mName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-900 dark:text-white">{mName}</p>
                              {isLead && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  👑 LEAD
                                </span>
                              )}
                            </div>
                            {mEmail && <p className="text-gray-400 text-[11px]">{mEmail}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                          isLead ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {rName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(item)}
                            className="rounded-xl p-2 text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                            title="Edit assignment"
                          >
                            <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteAssignment(item.createTeamId)}
                            className="rounded-xl p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Remove assignment"
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

      {/* Assignment Modal Drawer */}
      <AppDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAssignment ? 'Edit Team Assignment' : 'Assign Member to Team'}
        subtitle={editingAssignment ? 'Update team, member and role assignment' : 'Map a team member to a department with a specific role'}
        icon="mdi:account-supervisor-circle-outline"
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
              form="team-assign-form"
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md disabled:opacity-60 hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingAssignment ? 'Save Changes' : 'Assign Member'}
            </button>
          </>
        }
      >
        <form id="team-assign-form" onSubmit={saveAssignment} autoComplete="off" data-lpignore="true" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Select Team *</span>
              <select
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                value={form.teamIdFk}
                onChange={(e) => updateField('teamIdFk', e.target.value)}
                required
              >
                <option value="">Choose Target Team</option>
                {teams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.teamName} (Team #{t.teamId})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Select Team Member *</span>
              <select
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                value={form.teamMemberIdFk}
                onChange={(e) => updateField('teamMemberIdFk', e.target.value)}
                required
              >
                <option value="">Choose Member</option>
                {members.map((m) => (
                  <option key={m.teamMemberId} value={m.teamMemberId}>
                    {m.teamMemberName} ({m.teamMemberEmail || 'No email'})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-slate-300">Select Assignment Role *</span>
              <select
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-gray-800 dark:bg-slate-800 dark:border-white/10 dark:text-white transition-colors"
                value={form.roleIdFk}
                onChange={(e) => updateField('roleIdFk', e.target.value)}
                required
              >
                <option value="">Choose Role</option>
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
      </AppDrawer>
    </div>
  );
}
