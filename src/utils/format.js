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
 * Format a date-time value to DD/MM/YY hh:mm AM/PM e.g. 19/08/26 10:30 AM
 */
export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  const hh = String(hours).padStart(2, '0')
  return `${dd}/${mm}/${yy} ${hh}:${minutes} ${ampm}`
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

/**
 * Format document filename for display by stripping directory paths and UUID/hash prefixes.
 */
export function cleanFileName(filename) {
  if (!filename) return 'Document';
  let name = String(filename).split('/').pop().split('\\').pop();
  
  // If the filename has a short hex or full UUID prefix followed by underscore (e.g. "a1b2c3d4_MyFile.pdf")
  if (/^[a-f0-9]{8,36}_/i.test(name)) {
    name = name.substring(name.indexOf('_') + 1);
  } else if (/^\d{10,13}_/.test(name)) {
    name = name.substring(name.indexOf('_') + 1);
  }

  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  const baseWithoutExt = name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;

  // Check if base name is purely a UUID or hex string or fragment (e.g. "7517-41a1-aa47-22347eb3eb29")
  const isRawUuid = 
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(baseWithoutExt) ||
    /^[a-f0-9-]{20,40}$/i.test(baseWithoutExt) ||
    /^[a-f0-9]{32,64}$/i.test(baseWithoutExt);

  if (isRawUuid || !baseWithoutExt || baseWithoutExt.trim() === '') {
    return `Quotation Document${ext}`;
  }

  return name;
}
