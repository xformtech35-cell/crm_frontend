import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../Icon'

const SIZE_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export default function AppModal({ open, onClose, title, size = 'md', children, footer }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      <div className={`relative bg-white rounded-2xl shadow-2xl shadow-gray-300/50 w-full z-10 border border-gray-100 modal-box ${SIZE_CLASS[size] || SIZE_CLASS.md}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 bg-gradient-to-b from-indigo-600 to-blue-500 rounded-full" />
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
          >
            <Icon name="mdi:close" className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2.5 bg-slate-50/50 rounded-b-2xl modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
