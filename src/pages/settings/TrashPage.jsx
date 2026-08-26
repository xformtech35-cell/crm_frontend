import { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import { useTrash } from '../../hooks/useTrash'
import { useAuthStore } from '../../stores/auth'

const MODULE_TABS = [
  { id: 'all', label: 'All Items', icon: 'mdi:tray-full' },
  { id: 'leads', label: 'Leads', icon: 'mdi:account-arrow-right-outline' },
  { id: 'contacts', label: 'Contacts', icon: 'mdi:contacts-outline' },
  { id: 'opportunities', label: 'Opportunities', icon: 'mdi:chart-line' },
  { id: 'organizations', label: 'Organizations', icon: 'mdi:domain' },
  { id: 'projects', label: 'Projects', icon: 'mdi:folder-outline' },
  { id: 'tasks', label: 'Tasks', icon: 'mdi:checkbox-marked-circle-outline' },
  { id: 'documents', label: 'Documents', icon: 'mdi:file-document-outline' },
  { id: 'negotiations', label: 'Negotiations', icon: 'mdi:handshake-outline' },
  { id: 'events', label: 'Events', icon: 'mdi:calendar-clock-outline' },
]

const MODULE_COLORS = {
  leads: 'bg-blue-50 text-blue-700 border-blue-200',
  contacts: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  opportunities: 'bg-purple-50 text-purple-700 border-purple-200',
  organizations: 'bg-amber-50 text-amber-700 border-amber-200',
  projects: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  tasks: 'bg-rose-50 text-rose-700 border-rose-200',
  documents: 'bg-teal-50 text-teal-700 border-teal-200',
  negotiations: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  events: 'bg-violet-50 text-violet-700 border-violet-200',
}


export default function TrashPage() {
  const user = useAuthStore((s) => s.user)
  const userRole = user?.role?.toLowerCase()
  const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'super admin'
  const trashHook = useTrash()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [restoringId, setRestoringId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadTrash() {
    setLoading(true)
    try {
      const data = await trashHook.getAll()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load trash items:', err)
      showToast('Failed to load trash items', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrash()
  }, [])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab = activeTab === 'all' || item.moduleKey?.toLowerCase() === activeTab
      const query = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.itemType?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query) ||
        item.phone?.toLowerCase().includes(query) ||
        item.organization?.toLowerCase().includes(query) ||
        item.status?.toLowerCase().includes(query) ||
        item.details?.toLowerCase().includes(query) ||
        String(item.recordId).includes(query)
      return matchesTab && matchesSearch
    })
  }, [items, activeTab, searchTerm])

  const handleRestore = async (item) => {
    setRestoringId(item.id)
    try {
      await trashHook.restore(item.moduleKey, item.recordId)
      showToast(`Restored "${item.name}" successfully!`, 'success')
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      console.error('Failed to restore item:', err)
      showToast(err.message || 'Failed to restore item', 'error')
    } finally {
      setRestoringId(null)
    }
  }

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (!isAdmin) {
        await trashHook.requestDelete(deleteTarget.moduleKey, deleteTarget.recordId, 'Permanent deletion requested by user')
        showToast(`Permanent deletion request for "${deleteTarget.name}" submitted. Company Administrator & Team Lead have been notified.`, 'success')
      } else {
        await trashHook.permanentDelete(deleteTarget.moduleKey, deleteTarget.recordId)
        showToast(`Permanently deleted "${deleteTarget.name}"`, 'success')
        setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      }
      setDeleteTarget(null)
    } catch (err) {
      console.error('Failed to process delete request:', err)
      showToast(err.message || 'Failed to process request', 'error')
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="animate-fade-in space-y-6 pb-24">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          <Icon name={toast.type === 'error' ? 'mdi:alert-circle' : 'mdi:check-circle'} className="h-5 w-5" />
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-rose-600">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
              <Icon name="mdi:trash-can-outline" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trash / Recycle Bin</h1>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {isAdmin 
              ? 'View, restore, or permanently remove deleted company records.' 
              : 'View and restore your deleted records. Permanent deletion requests will be notified to the Administrator.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTrash}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <Icon name="mdi:refresh" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Trash
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
        {/* Module Filter Tabs */}
        <div className="border-b border-gray-100 bg-gray-50/50 p-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {MODULE_TABS.map((tab) => {
              const count = tab.id === 'all' ? items.length : items.filter((i) => i.moduleKey?.toLowerCase() === tab.id).length
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  <Icon name={tab.icon} className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative max-w-md">
            <Icon name="mdi:magnify" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search deleted records by name, email, phone, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Trash Items List Table */}
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading trash items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Icon name="mdi:trash-can-outline" className="h-8 w-8" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">Trash is empty</h3>
            <p className="mt-1 text-xs text-gray-500">
              {searchTerm ? 'No deleted items matching your search.' : 'There are no deleted items in this section.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Record Details</th>
                  <th className="px-4 py-3">Status / Stage</th>
                  <th className="px-4 py-3">Deleted Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredItems.map((item) => {
                  const badgeColor = MODULE_COLORS[item.moduleKey?.toLowerCase()] || 'bg-gray-50 text-gray-700 border-gray-200'
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors group">
                      {/* Item Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap align-top">
                        <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeColor}`}>
                          {item.itemType || 'Record'}
                        </span>
                      </td>

                      {/* Record Details */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="space-y-1">
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.organization && (
                              <span className="text-xs font-medium text-gray-500">
                                ({item.organization})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                            {item.email && (
                              <span className="inline-flex items-center gap-1 text-gray-600">
                                <Icon name="mdi:email-outline" className="h-3.5 w-3.5 text-gray-400" />
                                {item.email}
                              </span>
                            )}
                            {item.phone && (
                              <span className="inline-flex items-center gap-1 text-gray-600">
                                <Icon name="mdi:phone-outline" className="h-3.5 w-3.5 text-gray-400" />
                                {item.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status / Stage */}
                      <td className="px-4 py-3.5 whitespace-nowrap align-top">
                        {item.status ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {item.status}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Deleted Date */}
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap align-top">
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <Icon name="mdi:clock-outline" className="h-3.5 w-3.5 text-gray-400" />
                          {formatDate(item.deletedAt)}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRestore(item)}
                            disabled={restoringId === item.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            <Icon name="mdi:restore" className={`h-4 w-4 ${restoringId === item.id ? 'animate-spin' : ''}`} />
                            Restore
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                          >
                            <Icon name={isAdmin ? "mdi:delete-forever" : "mdi:bell-ring-outline"} className="h-4 w-4" />
                            {isAdmin ? 'Delete Permanently' : 'Notify Admin to Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Permanently Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <Icon name={isAdmin ? "mdi:alert-triangle" : "mdi:bell-ring-outline"} className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isAdmin ? 'Permanent Delete Confirmation' : 'Request Permanent Deletion'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isAdmin ? 'This action cannot be undone.' : 'Administrator will be notified.'}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              {isAdmin ? (
                <>
                  Are you sure you want to permanently delete <strong className="text-gray-900">"{deleteTarget.name}"</strong> ({deleteTarget.itemType})?
                </>
              ) : (
                <>
                  Only Company Administrators can permanently purge records from the system. Submitting this will notify your Administrator to permanently delete <strong className="text-gray-900">"{deleteTarget.name}"</strong> ({deleteTarget.itemType}).
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting && <Icon name="mdi:loading" className="h-4 w-4 animate-spin" />}
                {isAdmin ? 'Delete Permanently' : 'Notify Administrator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
