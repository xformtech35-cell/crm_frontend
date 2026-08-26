// src/pages/masters/LeadSource.jsx
import { useEffect, useMemo, useState } from 'react';
import AppDrawer from '/src/components/common/AppDrawer';
import Icon from '/src/components/Icon';
import { useLeadSource } from '/src/hooks/useMaster';
import { useTeamMember } from '/src/hooks/useTeamMember';
import { useTeam } from '/src/hooks/useTeam';
import { useCreateTeam } from '/src/hooks/useCreateTeam';
import { getMemberId, getTeamId, getTeamLabel, groupMembersByTeam } from '/src/utils/teamRelations';

const emptyForm = { sourceName: '', teamId: '', assignedMember: '', description: '' };

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

export default function LeadSource() {
  const leadSourceHook = useLeadSource();
  const teamMemberHook = useTeamMember();
  const teamHook = useTeam();
  const createTeamHook = useCreateTeam();

  const [sources, setSources] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);
    try {
      const [data, membersRes, teamsRes, assignRes] = await Promise.all([
        leadSourceHook.getAll().catch(() => []),
        teamMemberHook.getAll().catch(() => []),
        teamHook.getAll().catch(() => []),
        createTeamHook.getAll().catch(() => []),
      ]);
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const membersList = Array.isArray(membersRes) ? membersRes : Array.isArray(membersRes?.data) ? membersRes.data : [];
      const teamsList = Array.isArray(teamsRes) ? teamsRes : Array.isArray(teamsRes?.data) ? teamsRes.data : [];
      const assignList = Array.isArray(assignRes) ? assignRes : Array.isArray(assignRes?.data) ? assignRes.data : [];
      setSources(list);
      setTeamMembers(membersList);
      setTeams(teamsList);
      setAssignments(assignList);
    } catch (error) {
      console.error('Failed to load lead sources:', error);
      setSources([]);
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

  const filteredSources = useMemo(() => {
    let list = sources;
    const text = query.trim().toLowerCase();
    if (text) {
      list = list.filter((item) =>
        item.sourceName?.toLowerCase().includes(text) ||
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
  }, [sources, query, selectedTeamFilter, selectedMemberFilter]);

  function openCreate() {
    setEditingSource(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(source) {
    setEditingSource(source);
    const meta = parseMetadata(source.description);
    setForm({
      sourceName: source.sourceName || '',
      teamId: meta.teamId || '',
      assignedMember: meta.assignedMember || '',
      description: meta.description || '',
    });
    setModalOpen(true);
  }

  async function saveSource(e) {
    e.preventDefault();
    const targetName = form.sourceName.trim();
    if (!targetName) return;

    const isDuplicate = sources.some(
      (item) =>
        item.sourceName?.trim().toLowerCase() === targetName.toLowerCase() &&
        (!editingSource || String(item.id || item.leadSourceId || item.sourceId) !== String(editingSource.id || editingSource.leadSourceId || editingSource.sourceId))
    );

    if (isDuplicate) {
      alert(`Lead Source "${targetName}" already exists! Duplicate source names are not allowed.`);
      return;
    }

    setSaving(true);
    const selectedTeamObj = teams.find((t) => String(getTeamId(t)) === String(form.teamId));
    const teamName = selectedTeamObj ? getTeamLabel(selectedTeamObj) : '';
    const serializedDesc = serializeMetadata(form.teamId, form.assignedMember, form.description, teamName);

    try {
      if (editingSource) {
        const updatedSource = {
          ...editingSource,
          sourceName: targetName,
          description: serializedDesc,
        };
        await leadSourceHook.update(editingSource.id, updatedSource);
      } else {
        await leadSourceHook.create({ sourceName: targetName, description: serializedDesc });
      }
      setModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Save failed:', error);
      alert(error?.response?.data?.message || 'Unable to save lead source.');
    } finally {
      setSaving(false);
    }
  }

  function deleteSource(source) {
    setSelectedSource(source);
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!selectedSource) return;
    setSaving(true);

    try {
      await leadSourceHook.remove(selectedSource.id);
      setDeleteModalOpen(false);
      setSelectedSource(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Unable to delete Lead Source");
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
              placeholder="Search lead sources..."
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
          New Source
        </button>
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading lead sources...</p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Icon name="mdi:database-off" className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No lead sources found</h3>
            <p className="text-sm text-gray-500">
              {query || selectedTeamFilter || selectedMemberFilter ? 'No sources match your active filter criteria' : 'Create your first lead source to get started'}
            </p>
            {(!query && !selectedTeamFilter && !selectedMemberFilter) && (
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Icon name="mdi:plus" className="h-4 w-4" />
                Create Source
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Sr.No</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead Source</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Team</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Member</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSources.map((source, index) => {
                  const meta = parseMetadata(source.description);
                  const teamName = getTeamDisplayName(meta.teamId, meta.teamName, teams);

                  return (
                    <tr key={source.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                      <td className="px-4 py-3 font-medium text-gray-400 text-xs">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
                            <Icon name="mdi:tag" className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{source.sourceName}</p>
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
                            onClick={() => openEdit(source)}
                            title="Edit Source"
                          >
                            <Icon name="mdi:pencil-outline" className="h-4 w-4" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                            onClick={() => deleteSource(source)}
                            title="Delete Source"
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
        {filteredSources.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Showing {filteredSources.length} source{filteredSources.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-gray-400">
                Total: {sources.length} source{sources.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Drawer */}
      <AppDrawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSource ? 'Edit Lead Source' : 'Create New Lead Source'}
        subtitle={editingSource ? 'Update source details and team assignment' : 'Add a new source with optional team or member assignment'}
        icon={editingSource ? 'mdi:pencil-outline' : 'mdi:plus-circle-outline'}
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
              form="lead-source-form"
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
                  <Icon name={editingSource ? 'mdi:content-save' : 'mdi:plus-circle'} className="h-4 w-4" />
                  {editingSource ? 'Update Source' : 'Create Source'}
                </span>
              )}
            </button>
          </div>
        }
      >
        <form id="lead-source-form" onSubmit={saveSource} autoComplete="off" data-lpignore="true" className="space-y-5">
          <div>
            <label className="block mb-1.5">
              <span className="text-sm font-semibold text-gray-700">
                Source Name <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="mdi:tag" className="h-4 w-4" />
              </div>
              <input
                value={form.sourceName}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    sourceName: e.target.value,
                  }))
                }
                className="input-field pl-9"
                placeholder="e.g., Website, Referral, Cold Call"
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter a unique name for this lead source</p>
          </div>

          {/* Assigned Team */}
          <div>
            <label className="block mb-1.5">
              <span className="text-sm font-semibold text-gray-700">Assigned Team</span>
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
                <option value="">All Teams (Shared Source)</option>
                {teams.map((t) => (
                  <option key={getTeamId(t)} value={getTeamId(t)}>
                    📁 {getTeamLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">Assign to a specific team or make it available across all teams</p>
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
            <p className="text-xs text-gray-400 mt-1">Assign to specific team member or leave open for the team</p>
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
              placeholder="Add optional notes or purpose for this lead source..."
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
                <h3 className="text-base font-bold text-gray-900">Delete Lead Source</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete lead source <strong className="text-gray-900">"{selectedSource?.sourceName}"</strong>?
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
                {saving ? 'Deleting...' : 'Yes, Delete Source'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}