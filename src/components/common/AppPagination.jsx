import { useMemo } from 'react'
import Icon from '../Icon'

export default function AppPagination({ page, total, limit, onPageChange }) {
  const pages = useMemo(() => {
    const last = Math.ceil(total / limit)
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
    const arr = [1]
    if (page > 3) arr.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(last - 1, page + 1); i++) arr.push(i)
    if (page < last - 2) arr.push('...')
    arr.push(last)
    return arr
  }, [page, total, limit])

  if (total <= limit) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white">
      <span className="text-sm text-gray-500">
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <Icon name="mdi:chevron-left" className="w-4 h-4" />
        </button>
        {pages.map((p, idx) => (
          <button
            key={idx}
            className={`pagination-btn ${p === page ? 'pagination-btn-active' : ''}`}
            disabled={p === '...'}
            onClick={() => p !== '...' && onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          className="pagination-btn"
          disabled={page >= Math.ceil(total / limit)}
          onClick={() => onPageChange(page + 1)}
        >
          <Icon name="mdi:chevron-right" className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
