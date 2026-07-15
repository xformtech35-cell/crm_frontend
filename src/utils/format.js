import { formatCurrencyByCountry, formatCurrencyCompact } from './currency';

export function objectToFormData(key, obj, files) {
  const fd = new FormData()
  const payload = {}
  for (const [field, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      payload[field] = value
    }
  }
  fd.append(key, new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (files) {
    for (const [field, file] of Object.entries(files)) {
      if (file) fd.append(field, file)
    }
  }
  return fd
}

export function formatCurrency(value, countryName) {
  return formatCurrencyByCountry(value, countryName);
}

export function formatCurrencyComp(value, countryName) {
  return formatCurrencyCompact(value, countryName);
}



/**
 * Format a date value to DD/MM/YY  e.g. 25/06/26
 * Used everywhere in the UI and Excel exports.
 */
export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

/** Alias — same as formatDate, kept for explicit clarity in Excel exports */
export const formatDateDDMMYY = formatDate

/**
 * Format a date-time value to DD/MM/YY HH:MM  e.g. 25/06/26 14:30
 */
export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${min}`
}

export function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export function truncate(text, maxLength = 60) {
  if (!text) return '—'
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text
}

export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
