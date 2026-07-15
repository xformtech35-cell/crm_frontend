import Icon from '../Icon'

export default function AppSelect({
  value,
  onChange,
  options = [],
  label,
  placeholder,
  icon,
  error,
  disabled,
  required,
  valueKey = 'value',
  labelKey = 'label',
}) {
  function optionValue(opt) {
    if (typeof opt === 'string') return opt
    return opt[valueKey]
  }
  function optionLabel(opt) {
    if (typeof opt === 'string') return opt
    return opt[labelKey]
  }

  return (
    <div>
      {label && (
        <label className="form-label">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            <Icon name={icon} className="w-4 h-4" />
          </div>
        )}
        <select
          value={value ?? ''}
          disabled={disabled}
          required={required}
          onChange={(e) => onChange?.(e.target.value)}
          className={`form-select ${icon ? 'pl-9' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
        >
          <option value="">{placeholder || 'Select...'}</option>
          {options.map((opt) => (
            <option key={optionValue(opt)} value={optionValue(opt)}>
              {optionLabel(opt)}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
          <Icon name="mdi:chevron-down" className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
