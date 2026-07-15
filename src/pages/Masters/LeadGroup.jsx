import { useEffect, useMemo, useState } from 'react';
import AppDrawer from '/src/components/common/AppDrawer';
import Icon from '/src/components/Icon';
import { useLeadGroup } from '/src/hooks/useMaster';

const emptyForm = { groupName: '' };

export default function LeadGroup() {
  const leadGroupHook = useLeadGroup();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [form, setForm] = useState(emptyForm);



  async function loadData() {
    setLoading(true);

    try {
      const data = await leadGroupHook.getAll();
      setGroups(Array.isArray(data) ? data : []);
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

  const filteredGroups = useMemo(() => {
    const text = query.trim().toLowerCase();

    if (!text) return groups;

    return groups.filter((item) =>
      item.groupName?.toLowerCase().includes(text)
    );
  }, [groups, query]);

  function openCreate() {
    setEditingGroup(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(group) {
    setEditingGroup(group);

    setForm({
      groupName: group.groupName || '',
    });

    setModalOpen(true);
  }

  async function saveGroup(e) {
    e.preventDefault();

    if (!form.groupName.trim()) return;

    setSaving(true);

    try {
      if (editingGroup) {
        await leadGroupHook.update(editingGroup.id, form);
      } else {
        await leadGroupHook.create(form);
      }

      setModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Unable to save lead group.');
    } finally {
      setSaving(false);
    }
  }

  // async function deleteGroup(group) {
  //   if (!confirm(`Delete group "${group.groupName}"?`)) return;

  //   setSaving(true);

  //   try {
  //     await leadGroupHook.remove(group.id);
  //     await loadData();
  //   } catch (error) {
  //     console.error('Delete failed:', error);
  //     alert('Unable to delete lead group.');
  //   } finally {
  //     setSaving(false);
  //   }
  // }

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
      {/* Search Bar with New Group Button - Compact */}
      <div className="flex items-center gap-2 justify-between px-2 ">
        <div className="relative flex-1 max-w-sm">
          <Icon
            name="mdi:magnify"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-8 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap">
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
              {query ? 'No groups match your search criteria' : 'Create your first lead group to get started'}
            </p>
            {!query && (
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Icon name="mdi:plus" className="h-4 w-4" />
                Create Group
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">SR.NO</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead Group</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredGroups.map((group, index) => (
                  <tr key={group.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                    <td className="px-4 py-3 font-medium text-gray-400 text-sm">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-purple-50 rounded-lg">
                          <Icon name="mdi:folder" className="h-3.5 w-3.5 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{group.groupName}</p>
                          {/* <p className="text-xs text-gray-400">ID: {group.id}</p> */}
                        </div>
                      </div>
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
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer with count */}
        {filteredGroups.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/50">
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
        subtitle={editingGroup ? 'Update group details' : 'Add a new group to the system'}
        icon={editingGroup ? 'mdi:pencil-outline' : 'mdi:folder-plus-outline'}
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
        <form id="lead-group-form" onSubmit={saveGroup} className="space-y-5">
          <div>
            <label className="block mb-1.5">
              <span className="text-sm font-semibold text-gray-700">
                Group Name <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="mdi:folder" className="h-4 w-4" />
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
                placeholder="e.g., Enterprise, SMB, Startup"
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter a unique name for this lead group</p>
          </div>

          {editingGroup && (
            <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Icon name="mdi:information-outline" className="h-4 w-4 text-purple-500" />
                <span>Editing group: <strong className="text-gray-900">{editingGroup.groupName}</strong></span>
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
                Delete Group
              </h2>

              {/* Description */}
              <p className="mt-2 text-sm text-gray-500 leading-5">
                Are you sure you want to delete this group?
              </p>

              {/* Group Name */}
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                <Icon
                  name="mdi:folder-outline"
                  className="h-4 w-4"
                />
                {selectedGroup?.groupName}
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-2 border-t border-gray-100 p-4">

              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedGroup(null);
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