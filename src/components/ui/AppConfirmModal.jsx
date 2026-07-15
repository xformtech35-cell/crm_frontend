import { createPortal } from 'react-dom'

export default function AppConfirmModal({
  open,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
}) {
  if (!open) return null

  const iconBg = variant === 'warning' ? 'bg-amber-100' : variant === 'info' ? 'bg-blue-100' : 'bg-red-100'
  const iconColor = variant === 'warning' ? 'text-amber-600' : variant === 'info' ? 'text-blue-600' : 'text-red-600'

  function close() {
    onCancel?.()
    onClose?.()
  }

  function confirmAction() {
    onConfirm?.()
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>
          {variant !== 'info' ? (
            <svg className={`h-6 w-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            <svg className={`h-6 w-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          )}
        </div>
        <h3 className="mb-2 text-center text-base font-semibold text-gray-900">{title}</h3>
        <p className="mb-6 text-center text-sm text-gray-500">{message}</p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 justify-center" onClick={close}>Cancel</button>
          <button
            className={`flex-1 justify-center ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            disabled={loading}
            onClick={confirmAction}
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
