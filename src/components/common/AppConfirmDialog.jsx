import AppModal from './AppModal'

export default function AppConfirmDialog({
  open,
  onClose,
  title = 'Confirm',
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}) {
  function cancel() {
    onCancel?.()
    onClose?.()
  }

  function confirm() {
    onConfirm?.()
    onClose?.()
  }

  return (
    <AppModal
      open={open}
      onClose={cancel}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={cancel}>Cancel</button>
          <button className="btn-danger" onClick={confirm}>{confirmLabel}</button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </AppModal>
  )
}
