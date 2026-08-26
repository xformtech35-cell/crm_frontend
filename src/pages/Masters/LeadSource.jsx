// src/pages/masters/LeadSource.jsx
import { useEffect, useMemo, useState } from 'react';
import AppDrawer from '/src/components/common/AppDrawer';
import Icon from '/src/components/Icon';
import { useLeadSource } from '/src/hooks/useMaster';
import { useTeamMember } from '/src/hooks/useTeamMember';
import { useTeam } from '/src/hooks/useTeam';
import { useCreateTeam } from '/src/hooks/useCreateTeam';
import { getMemberId, getTeamId, getTeamLabel, groupMembersByTeam } from '/src/utils/teamRelations';

const emptyForm = { sourceName: '', teamId: '', assignedMember: '' };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  const filteredSources = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return sources;
    return sources.filter((item) =>
      item.sourceName?.toLowerCase().includes(text)
    );
  }, [sources, query]);
 
  const groupedData = useMemo(() => {
    return groupMembersByTeam(teams, teamMembers, assignments);
  }, [teams, teamMembers, assignments]);

  const selectedTeamLabel = useMemo(() => {
    if (!form.teamId) return '';
    const t = teams.find((item) => String(getTeamId(item)) === String(form.teamId));
    return t ? getTeamLabel(t) : '';
  }, [form.teamId, teams]);

  function openCreate() {
    setEditingSource(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(source) {
    setEditingSource(source);
    setForm({
      sourceName: source.sourceName || '',
      teamId: source.teamId || '',
      assignedMember: source.assignedMember || '',
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
    try {
      if (editingSource) {
        const updatedSource = {
          ...editingSource,
          sourceName: targetName,
          description: form.description,
        };
        await leadSourceHook.update(editingSource.id, updatedSource);
      } else {
        await leadSourceHook.create({ sourceName: targetName, description: form.description });
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
      {/* Search Bar with New Source Button - Compact */}
      <div className="flex items-center justify-between px-2 gap-2">
        <div className="relative flex-1 max-w-sm">
          <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-8 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
        <button onClick={openCreate} className="ml-2 btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap">
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
              {query ? 'No sources match your search criteria' : 'Create your first lead source to get started'}
            </p>
            {!query && (
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Icon name="mdi:plus" className="h-4 w-4" />
                Create Source
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sr.No</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead Source</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSources.map((source, index) => (
                  <tr key={source.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                    <td className="px-4 py-3 font-medium text-gray-400 text-sm">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-50 rounded-lg">
                          <Icon name="mdi:tag" className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{source.sourceName}</p>
                          {/* <p className="text-xs text-gray-400">ID: {source.id}</p> */}
                        </div>
                      </div>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
       
        {/* Table footer with count */}
        {filteredSources.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/50">
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
        subtitle={editingSource ? 'Update source details' : 'Add a new source to the system'}
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
                <option value="">All Teams / Show All Members</option>
                {teams.map((t) => (
                  <option key={getTeamId(t)} value={getTeamId(t)}>
                    📁 {getTeamLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">Filter members by team or select from any team below</p>
          </div>

          {/* Assigned Team Member - Select of that team or other */}
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
                <option value="">Select Team Member (Optional)</option>
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
            <p className="text-xs text-gray-400 mt-1">Select team member of that team or other team</p>
          </div>
 
          {editingSource && (
            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="mdi:information-outline" className="h-4 w-4 text-blue-500" />
                <span>Editing source: <strong className="text-gray-900">{editingSource.sourceName}</strong></span>
              </div>
            </div>
          )}
        </form>
      </AppDrawer>
 
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[340px] rounded-xl bg-white shadow-2xl">
            {/* Body */}
            <div className="px-5 py-5 text-center">
              {/* Icon */}
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Icon
                  name="mdi:alert-outline"
                  className="h-6 w-6 text-red-500"
                />
              </div>
              {/* Title */}
              <h2 className="mt-3 text-xl font-bold text-gray-900">
                Delete Source
              </h2>
              {/* Description */}
              <p className="mt-2 text-sm text-gray-500 leading-5">
                Are you sure you want to delete this source?
              </p>
              {/* Source Name */}
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                <Icon
                  name="mdi:tag"
                  className="h-4 w-4"
                />
                {selectedSource?.sourceName}
              </div>
            </div>
            {/* Footer */}
            <div className="flex gap-2 border-t border-gray-100 p-4">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedSource(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 