import { useEffect, useMemo, useState } from 'react';
import AppDrawer from '/src/components/common/AppDrawer';
import Icon from '/src/components/Icon';
import { useLeadGroup } from '/src/hooks/useMaster';
import { useTeamMember } from '/src/hooks/useTeamMember';
import { useTeam } from '/src/hooks/useTeam';
import { useCreateTeam } from '/src/hooks/useCreateTeam';
import { getMemberId, getTeamId, getTeamLabel, groupMembersByTeam } from '/src/utils/teamRelations';

const emptyForm = { groupName: '', teamId: '', assignedMember: '', description: '' };

// Helper to get dynamic team display name from database team entities or metadata
export function getTeamDisplayName(teamId, metaTeamName, teams = []) {
  if (!teamId) return 'All Teams';
  const found = teams.find((t) => String(getTeamId(t)) === String(teamId));
  if (found) return getTeamLabel(found);
  if (metaTeamName) return metaTeamName;
  return `Team #${teamId}`;
}

// Helper to decode dynamic team & member metadata from database description
function parseMetadata(desc) {
  if (!desc) return { teamId: '', teamName: '', assignedMember: '', description: '' };
  try {
    if (desc.startsWith('{') && desc.endsWith('}')) {
      const parsed = JSON.parse(desc);
      return {
        teamId: parsed.teamId || '',
        teamName: parsed.teamName || '',
        assignedMember: parsed.assignedMember || '',
        description: parsed.description || parsed.note || '',
      };
    }
  } catch (e) {}
  return { teamId: '', teamName: '', assignedMember: '', description: desc };
}

// Helper to encode dynamic team & member metadata for database storage
function serializeMetadata(teamId, assignedMember, description, teamName) {
  if (!teamId && !assignedMember) {
    return description || '';
  }
  return JSON.stringify({
    teamId: teamId || '',
    teamName: teamName || '',
    assignedMember: assignedMember || '',
    description: description || '',
  });
}

export default function LeadGroup() {
  const leadGroupHook = useLeadGroup();
  const teamMemberHook = useTeamMember();
  const teamHook = useTeam();
  const createTeamHook = useCreateTeam();

  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);
    try {
      const [data, membersRes, teamsRes, assignRes] = await Promise.all([
        leadGroupHook.getAll().catch(() => []),
        teamMemberHook.getAll().catch(() => []),
        teamHook.getAll().catch(() => []),
        createTeamHook.getAll().catch(() => []),
      ]);
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const membersList = Array.isArray(membersRes) ? membersRes : Array.isArray(membersRes?.data) ? membersRes.data : [];
      const teamsList = Array.isArray(teamsRes) ? teamsRes : Array.isArray(teamsRes?.data) ? teamsRes.data : [];
      const assignList = Array.isArray(assignRes) ? assignRes : Array.isArray(assignRes?.data) ? assignRes.data : [];
      
      setGroups(list);
      setTeamMembers(membersList);
      setTeams(teamsList);
      setAssignments(assignList);
    } catch (error) {
      console.error('Failed to load lead groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const groupedData = useMemo(() => {
    return groupMembersByTeam(teams, teamMembers, assignments);
  }, [teams, teamMembers, assignments]);

  const selectedTeamLabel = useMemo(() => {
    if (!form.teamId) return '';
    return getTeamDisplayName(form.teamId, '', teams);
  }, [form.teamId, teams]);

  const filteredGroups = useMemo(() => {
    let list = groups;
    const text = query.trim().toLowerCase();

    if (text) {
      list = list.filter((item) =>
        item.groupName?.toLowerCase().includes(text) ||
        item.description?.toLowerCase().includes(text)
      );
    }

    if (selectedTeamFilter) {
      list = list.filter((item) => {
        const meta = parseMetadata(item.description);
        return String(meta.teamId) === String(selectedTeamFilter);
      });
    }

    if (selectedMemberFilter) {
      list = list.filter((item) => {
        const meta = parseMetadata(item.description);
        return (
          meta.assignedMember?.toLowerCase().includes(selectedMemberFilter.toLowerCase()) ||
          meta.assignedMember === selectedMemberFilter
        );
      });
    }

    return list;
  }, [groups, query, selectedTeamFilter, selectedMemberFilter]);

  function openCreate() {
    setEditingGroup(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(group) {
    setEditingGroup(group);
    const meta = parseMetadata(group.description);
    setForm({
      groupName: group.groupName || '',
      teamId: meta.teamId || '',
      assignedMember: meta.assignedMember || '',
      description: meta.description || '',
    });
    setModalOpen(true);
  }

  async function saveGroup(e) {
    e.preventDefault();
    const targetName = form.groupName.trim();
    if (!targetName) return;

    const isDuplicate = groups.some(
      (item) =>
        item.groupName?.trim().toLowerCase() === targetName.toLowerCase() &&
        (!editingGroup || String(item.id || item.groupId || item.leadGroupId) !== String(editingGroup.id || editingGroup.groupId || editingGroup.leadGroupId))
    );

    if (isDuplicate) {
      alert(`Lead Group "${targetName}" already exists! Duplicate group names are not allowed.`);
      return;
    }

    setSaving(true);
    const selectedTeamObj = teams.find((t) => String(getTeamId(t)) === String(form.teamId));
    const teamName = selectedTeamObj ? getTeamLabel(selectedTeamObj) : '';
    const serializedDesc = serializeMetadata(form.teamId, form.assignedMember, form.description, teamName);

    try {
      if (editingGroup) {
        const updatedGroup = {
          ...editingGroup,
          groupName: targetName,
          description: serializedDesc,
        };
        await leadGroupHook.update(editingGroup.id, updatedGroup);
      } else {
        await leadGroupHook.create({ groupName: targetName, description: serializedDesc });
      }

      setModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Save failed:', error);
      alert(error?.response?.data?.message || 'Unable to save lead group.');
    } finally {
      setSaving(false);
    }
  }

  function deleteGroup(group) {
    setSelectedGroup(group);
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!selectedGroup) return;
    setSaving(true);

    try {
      await leadGroupHook.remove(selectedGroup.id);
      setDeleteModalOpen(false);
      setSelectedGroup(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Unable to delete Lead Group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-3 pb-6">
      {/* Top Filter Bar with Search, Team & Member Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-2 bg-white/60 p-2.5 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-3xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Icon
              name="mdi:magnify"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-8 text-xs sm:text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="Search lead groups..."
              type="search"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icon name="mdi:close-circle" className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Team Filter */}
          <div className="relative min-w-[160px]">
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-xs sm:text-sm font-medium text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="">📁 All Teams</option>
              {teams.map((t) => (
                <option key={getTeamId(t)} value={getTeamId(t)}>
                  📁 {getTeamLabel(t)}
                </option>
              ))}
            </select>
          </div>

          {/* Team Member Filter */}
          <div className="relative min-w-[170px]">
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-xs sm:text-sm font-medium text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="">👤 All Members</option>
              {teamMembers.map((m) => (
                <option key={getMemberId(m)} value={m.teamMemberName}>
                  👤 {m.teamMemberName}
                </option>
              ))}
            </select>
          </div>

          {(query || selectedTeamFilter || selectedMemberFilter) && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedTeamFilter('');
                setSelectedMemberFilter('');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline px-1 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap shadow-sm">
          <Icon name="mdi:plus" className="h-4 w-4" />
          New Group
        </button>
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading lead groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Icon name="mdi:folder-off" className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No lead groups found</h3>
            <p className="text-sm text-gray-500">
              {query || selectedTeamFilter || selectedMemberFilter ? 'No groups match your active filter criteria' : 'Create your first lead group to get started'}
            </p>
            {(!query && !selectedTeamFilter && !selectedMemberFilter) && (
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Icon name="mdi:plus" className="h-4 w-4" />
                Create Group
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">SR.NO</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead Group</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Team</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Member</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredGroups.map((group, index) => {
                  const meta = parseMetadata(group.description);
                  const teamName = getTeamDisplayName(meta.teamId, meta.teamName, teams);

                  return (
                    <tr key={group.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                      <td className="px-4 py-3 font-medium text-gray-400 text-xs">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-100">
                            <Icon name="mdi:folder" className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{group.groupName}</p>
                            {meta.description && (
                              <p className="text-xs text-gray-400 line-clamp-1">{meta.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {meta.teamId ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Icon name="mdi:account-group-outline" className="w-3.5 h-3.5" />
                            {teamName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            🌐 All Teams
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {meta.assignedMember ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Icon name="mdi:account-outline" className="w-3.5 h-3.5" />
                            {meta.assignedMember}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">👥 Shared across members</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
                            onClick={() => openEdit(group)}
                            title="Edit Group"
                          >
                            <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                            onClick={() => deleteGroup(group)}
                            title="Delete Group"
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
        )}

        {/* Table footer with count */}
        {filteredGroups.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Showing {filteredGroups.length} group{filteredGroups.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-gray-400">
                Total: {groups.length} group{groups.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Drawer */}
      <AppDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGroup ? 'Edit Lead Group' : 'Create New Lead Group'}
        subtitle={editingGroup ? 'Update group details and team assignment' : 'Add a new group as per departmental sheet'}
        icon={editingGroup ? 'mdi:pencil-outline' : 'mdi:plus-circle-outline'}
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              className="flex-1 btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              form="lead-group-form"
              type="submit"
              className="flex-1 btn-primary"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Icon name={editingGroup ? 'mdi:content-save' : 'mdi:plus-circle'} className="h-4 w-4" />
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </span>
              )}
            </button>
          </div>
        }
      >
        <form id="lead-group-form" onSubmit={saveGroup} autoComplete="off" data-lpignore="true" className="space-y-5">
          {/* Group Name */}
          <div>
            <label className="block mb-1.5">
              <span className="text-sm font-semibold text-gray-700">
                Group Name <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="mdi:folder-outline" className="h-4 w-4" />
              </div>
              <input
                value={form.groupName}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    groupName: e.target.value,
                  }))
                }
                className="input-field pl-9"
                placeholder="e.g., Dosing Trading, Dosing System, Sandur, WTP System"
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter group name as defined in departmental enquiry sheet</p>
          </div>

          {/* Assigned Team */}
          <div>
            <label className="block mb-1.5">
              <span className="text-sm font-semibold text-gray-700">Assigned Department / Team</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Icon name="mdi:account-group-outline" className="h-4 w-4" />
              </div>
              <select
                value={form.teamId || ''}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    teamId: e.target.value,
                  }))
                }
                className="input-field pl-9"
              >
                <option value="">All Teams (Shared Group)</option>
                {teams.map((t) => (
                  <option key={getTeamId(t)} value={getTeamId(t)}>
                    📁 {getTeamLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">Assign this group to a specific department or make it shared</p>
          </div>

          {/* Assigned Team Member */}
          <div>
            <label className="block mb-1.5">
              <span className="text-sm font-semibold text-gray-700">Assigned Team Member</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Icon name="mdi:account-outline" className="h-4 w-4" />
              </div>
              <select
                value={form.assignedMember || ''}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    assignedMember: e.target.value,
                  }))
                }
                className="input-field pl-9"
              >
                <option value="">All Members in Team (Optional Specific Member)</option>
                {form.teamId ? (
                  <>
                    <optgroup label={`🎯 ${selectedTeamLabel || 'Selected Team'} Members`}>
                      {(groupedData.groupedTeams.find(
                        (g) => String(getTeamId(g.team)) === String(form.teamId)
                      )?.members || []).map((m) => (
                        <option key={getMemberId(m)} value={m.teamMemberName}>
                          {m.teamMemberName} ({m.teamMemberRole || 'Member'})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="👥 Other Teams & All Members">
                      {teamMembers
                        .filter((m) => {
                          const teamGroup = groupedData.groupedTeams.find(
                            (g) => String(getTeamId(g.team)) === String(form.teamId)
                          );
                          const memberIdsInSelectedTeam = (teamGroup?.members || []).map((tm) =>
                            getMemberId(tm)
                          );
                          return !memberIdsInSelectedTeam.includes(getMemberId(m));
                        })
                        .map((m) => (
                          <option key={getMemberId(m)} value={m.teamMemberName}>
                            {m.teamMemberName} ({m.teamMemberRole || 'Member'})
                          </option>
                        ))}
                    </optgroup>
                  </>
                ) : (
                  <>
                    {groupedData.groupedTeams.map(({ team, members }) => (
                      <optgroup key={getTeamId(team)} label={`📁 ${getTeamLabel(team)}`}>
                        {members.map((member) => (
                          <option key={getMemberId(member)} value={member.teamMemberName}>
                            {member.teamMemberName} ({member.teamMemberRole || 'Member'})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {groupedData.unassigned.length > 0 && (
                      <optgroup label="👤 General / Unassigned Members">
                        {groupedData.unassigned.map((member) => (
                          <option key={getMemberId(member)} value={member.teamMemberName}>
                            {member.teamMemberName} ({member.teamMemberRole || 'Member'})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">Assign to specific team member or leave open for the department</p>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1.5">
              <span className="text-sm font-semibold text-gray-700">Description / Remarks</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="input-field py-2"
              placeholder="Add optional notes or purpose for this lead group..."
            />
          </div>
        </form>
      </AppDrawer>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <Icon name="mdi:alert-circle-outline" className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Lead Group</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete lead group <strong className="text-gray-900">"{selectedGroup?.groupName}"</strong>?
            </p>
            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                className="btn-secondary text-sm px-4 py-2"
                onClick={() => setDeleteModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger text-sm px-4 py-2"
                onClick={confirmDelete}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Yes, Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}