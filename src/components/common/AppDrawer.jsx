import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../Icon'

export default function AppDrawer({
  open,
  onClose,
  title,
  subtitle,
  icon = 'mdi:pencil-outline',
  children,
  footer,
  width = 'w-full lg:w-[60%] xl:w-[55%] max-w-5xl',
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`relative h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col z-10 animate-in slide-in-from-right duration-200 ${width}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0 border border-blue-200">
            <Icon name={icon} className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Icon name="mdi:close" className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-gray-200 bg-white flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.05)] shrink-0 z-20">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
