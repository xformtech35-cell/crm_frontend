import { useState, useEffect, useMemo } from 'react'
import Icon from '../../components/Icon'
import { useTrash } from '../../hooks/useTrash'

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
      await trashHook.permanentDelete(deleteTarget.moduleKey, deleteTarget.recordId)
      showToast(`Permanently deleted "${deleteTarget.name}"`, 'success')
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error('Failed to permanently delete item:', err)
      showToast(err.message || 'Failed to delete item', 'error')
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <Icon name="mdi:trash-can-outline" className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Trash / Recycle Bin</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            View soft-deleted records across all modules with complete details. Restore items back to active modules or permanently delete them.
          </p>
        </div>

        <button
          onClick={loadTrash}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
        >
          <Icon name="mdi:refresh" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Trash
        </button>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {MODULE_TABS.map((tab) => {
            const count = tab.id === 'all' ? items.length : items.filter((i) => i.moduleKey?.toLowerCase() === tab.id).length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                {tab.label} ({count})
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Icon name="mdi:magnify" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, org, email, status..."
            className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
      </div>

      {/* Trash Items List Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading trash items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="mdi:tray" className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">Trash is empty</h3>
            <p className="mt-1 text-xs text-gray-500">No soft-deleted records found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-50/80 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold">Item Details</th>
                  <th className="px-4 py-3 font-semibold">Status / Stage</th>
                  <th className="px-4 py-3 font-semibold">Deleted Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const colorClass = MODULE_COLORS[item.moduleKey] || 'bg-gray-50 text-gray-700 border-gray-200'
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-gray-50/50">
                      {/* Module Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap align-top">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
                          {item.itemType}
                        </span>
                      </td>

                      {/* Item Details */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 border border-gray-200">
                              #{item.recordId}
                            </span>
                          </div>

                          {/* Subtitle Meta Info Badges */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap pt-0.5">
                            {item.organization && item.organization !== item.name && (
                              <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                                <Icon name="mdi:domain" className="h-3.5 w-3.5 text-gray-400" />
                                {item.organization}
                              </span>
                            )}
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
                            {item.details && (
                              <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                <Icon name="mdi:information-outline" className="h-3.5 w-3.5 text-gray-400" />
                                {item.details}
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
                            <Icon name="mdi:delete-forever" className="h-4 w-4" />
                            Delete Permanently
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
                <Icon name="mdi:alert-triangle" className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Permanent Delete Confirmation</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Are you sure you want to permanently delete <strong className="text-gray-900">"{deleteTarget.name}"</strong> ({deleteTarget.itemType})?
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
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
