export default function AppTextarea({
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled,
  required,
  rows = 3,
}) {
  return (
    <div>
      {label && (
        <label className="form-label">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        onChange={(e) => onChange?.(e.target.value)}
        className={`form-input resize-none ${error ? 'border-red-400 focus:border-red-500' : ''}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
