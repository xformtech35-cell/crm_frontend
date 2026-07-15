import { useState, useMemo, useEffect } from 'react'
import Icon from '../Icon'

export default function AppTable({ columns = [], data = [], loading = false, title, showSearch = true, renderCell, renderRowActions }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('__all')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [columnFilters, setColumnFilters] = useState({})

  const pageSizeOptions = [10, 25, 50, 100]
  const searchableColumns = useMemo(() => columns.filter((c) => c.searchable !== false), [columns])
  const filterableColumns = useMemo(() => columns.filter((c) => c.filterable !== false), [columns])

  function getCellValue(row, key) {
    return key.split('.').reduce((obj, k) => obj?.[k], row)
  }

  function normalizeValue(value) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value).trim()
  }

  const distinctOptions = useMemo(() => {
    const options = {}
    filterableColumns.forEach((col) => {
      const values = new Set()
      data.forEach((row) => {
        const v = normalizeValue(getCellValue(row, col.key))
        if (v) values.add(v)
      })
      options[col.key] = Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    })
    return options
  }, [data, filterableColumns])

  const searchedData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const q = searchQuery.toLowerCase()
    return data.filter((row) => {
      if (searchColumn !== '__all') {
        return normalizeValue(getCellValue(row, searchColumn)).toLowerCase().includes(q)
      }
      return searchableColumns.some((col) =>
        normalizeValue(getCellValue(row, col.key)).toLowerCase().includes(q)
      )
    })
  }, [data, searchQuery, searchColumn, searchableColumns])

  const filteredData = useMemo(() => {
    const activeKeys = Object.keys(columnFilters).filter((k) => columnFilters[k])
    if (!activeKeys.length) return searchedData
    return searchedData.filter((row) =>
      activeKeys.every((key) => normalizeValue(getCellValue(row, key)) === columnFilters[key])
    )
  }, [searchedData, columnFilters])

  const hasActiveFilters = useMemo(
    () => Object.values(columnFilters).some(Boolean) || searchColumn !== '__all',
    [columnFilters, searchColumn]
  )

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData
    return [...filteredData].sort((a, b) => {
      const av = getCellValue(a, sortKey)
      const bv = getCellValue(b, sortKey)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const an = Number(av), bn = Number(bv)
      const bothNumeric = !Number.isNaN(an) && !Number.isNaN(bn)
      const result = bothNumeric ? an - bn : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
      return sortDir === 'asc' ? result : -result
    })
  }, [filteredData, sortKey, sortDir])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedData.length / pageSize)), [sortedData, pageSize])

  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, page, pageSize])

  const pageStart = sortedData.length === 0 ? 0 : (page - 1) * pageSize + 1
  const pageEnd = Math.min(page * pageSize, sortedData.length)

  const pageList = useMemo(() => {
    const last = totalPages
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
    const items = [1]
    if (page > 3) items.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(last - 1, page + 1); i++) items.push(i)
    if (page < last - 2) items.push('...')
    items.push(last)
    return items
  }, [totalPages, page])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  useEffect(() => { setPage(1) }, [searchQuery, searchColumn, columnFilters, pageSize])

  function toggleSort(col) {
    if (col.sortable === false) return
    if (sortKey !== col.key) { setSortKey(col.key); setSortDir('asc') }
    else setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  }

  function clearFilters() {
    setSearchColumn('__all')
    setColumnFilters({})
  }

  function exportCsv() {
    if (!sortedData.length) return
    const headers = columns.map((c) => c.label)
    const rows = sortedData.map((row) =>
      columns.map((col) => {
        const v = normalizeValue(getCellValue(row, col.key))
        if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
        return v
      })
    )
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crm-table-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="table-wrapper">
      {(showSearch || title) && (
        <div className="table-toolbar">
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-indigo-600 to-blue-500 rounded-full" />
                <h3 className="text-sm font-bold text-gray-800 truncate">{title}</h3>
              </div>
            )}
            {!loading && (
              <span className="text-xs text-gray-500 bg-slate-50 border border-gray-100 px-2 py-0.5 rounded-lg font-medium">
                {searchedData.length} records
              </span>
            )}
            {!loading && hasActiveFilters && (
              <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg font-medium">
                {filteredData.length} filtered
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {showSearch && (
              <div className="relative w-full sm:w-auto">
                <Icon name="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    onClick={() => setSearchQuery('')}
                  >
                    <Icon name="mdi:close-circle" className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <button type="button" className="btn-secondary btn-sm whitespace-nowrap" onClick={() => setShowAdvanced((v) => !v)}>
              <Icon name="mdi:tune-vertical" className="w-4 h-4" />
              Filters
            </button>
            <button type="button" className="btn-secondary btn-sm whitespace-nowrap" disabled={filteredData.length === 0} onClick={exportCsv}>
              <Icon name="mdi:download" className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      )}

      {showAdvanced && (
        <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-gray-100 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="form-group">
              <label className="form-label mb-1">Search Scope</label>
              <select value={searchColumn} onChange={(e) => setSearchColumn(e.target.value)} className="form-select py-2.5">
                <option value="__all">All columns</option>
                {searchableColumns.map((col) => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label mb-1">Rows Per Page</label>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="form-select py-2.5">
                {pageSizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="button" className="btn-secondary w-full" onClick={clearFilters}>
                <Icon name="mdi:filter-remove-outline" className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
          {filterableColumns.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {filterableColumns.map((col) => (
                <div key={col.key} className="form-group">
                  <label className="form-label mb-1">{col.label}</label>
                  <select
                    value={columnFilters[col.key] || ''}
                    onChange={(e) => setColumnFilters((f) => ({ ...f, [col.key]: e.target.value }))}
                    className="form-select py-2.5"
                  >
                    <option value="">All {col.label}</option>
                    {(distinctOptions[col.key] || []).map((opt) => (
                      <option key={`${col.key}-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading data...</p>
        </div>
      ) : (
        <>
          <table className="table-base">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={col.sortable !== false ? 'cursor-pointer select-none' : ''}
                    onClick={() => toggleSort(col)}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      {col.label}
                      {col.sortable !== false && (
                        <span className="inline-flex items-center">
                          {sortKey !== col.key ? (
                            <Icon name="mdi:swap-vertical" className="w-3.5 h-3.5 text-gray-300" />
                          ) : sortDir === 'asc' ? (
                            <Icon name="mdi:arrow-up" className="w-3.5 h-3.5 text-indigo-500" />
                          ) : (
                            <Icon name="mdi:arrow-down" className="w-3.5 h-3.5 text-indigo-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {renderRowActions && <th className="sticky right-0 z-20 w-28 bg-gray-50 text-right shadow-[-8px_0_12px_rgba(15,23,42,0.04)]">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (renderRowActions ? 1 : 0)} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Icon name="mdi:table-search" className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-medium">No records found</p>
                      {searchQuery && <p className="text-xs">Try adjusting your search query</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                pagedData.map((row, idx) => (
                  <tr key={idx} className="group">
                    {columns.map((col) => (
                      <td key={col.key}>
                        {renderCell
                          ? renderCell(col.key, row, getCellValue(row, col.key))
                          : (getCellValue(row, col.key) || '—')}
                      </td>
                    ))}
                    {renderRowActions && (
                      <td className="sticky right-0 bg-inherit text-right shadow-[-8px_0_12px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-end gap-1">
                          {renderRowActions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100 bg-white">
              <span className="text-sm text-gray-500">
                Showing {pageStart}-{pageEnd} of {filteredData.length}
              </span>
              <div className="flex items-center gap-1">
                <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <Icon name="mdi:chevron-left" className="w-4 h-4" />
                </button>
                {pageList.map((p, idx) => (
                  <button
                    key={`p-${idx}`}
                    className={`pagination-btn ${p === page ? 'pagination-btn-active' : ''}`}
                    disabled={p === '...'}
                    onClick={() => p !== '...' && setPage(Number(p))}
                  >
                    {p}
                  </button>
                ))}
                <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <Icon name="mdi:chevron-right" className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
