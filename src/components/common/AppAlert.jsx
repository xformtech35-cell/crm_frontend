import { useState, useEffect } from 'react'
import Icon from '../Icon'

const COLOR_CLASS = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-indigo-50 text-indigo-800 border-indigo-200',
}

const ICON_NAME = {
  success: 'mdi:check-circle-outline',
  error: 'mdi:alert-circle-outline',
  warning: 'mdi:alert-outline',
  info: 'mdi:information-outline',
}

export default function AppAlert({ message, type = 'info', autoDismiss, onDismiss, className = '' }) {
  const [show, setShow] = useState(true)
  const [visible, setVisible] = useState(true)

  function dismiss() {
    setVisible(false)
    setTimeout(() => {
      setShow(false)
      onDismiss?.()
    }, 300)
  }

  useEffect(() => {
    const delay = typeof autoDismiss === 'number' ? autoDismiss : autoDismiss === true ? 4000 : 0
    if (delay > 0) {
      const t = setTimeout(dismiss, delay)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line

  if (!show) return null

  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm border transition-all duration-300 ${COLOR_CLASS[type]} ${className} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
    >
      <Icon name={ICON_NAME[type]} className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
      <button onClick={dismiss} className="ml-auto flex-shrink-0 opacity-70 hover:opacity-100">
        <Icon name="mdi:close" className="w-4 h-4" />
      </button>
    </div>
  )
}
