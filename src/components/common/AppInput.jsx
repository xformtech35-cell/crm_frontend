// import Icon from '../Icon'

// export default function AppInput({
//   value,
//   onChange,
//   label,
//   type = 'text',
//   placeholder,
//   icon,
//   error,
//   disabled,
//   required,
//   step,
//   min,
//   max,
//   className = '',
// }) {
//   return (
//     <div>
//       {label && (
//         <label className="form-label">
//           {label}{required && <span className="text-red-500 ml-1">*</span>}
//         </label>
//       )}
//       <div className="relative">
//         {icon && (
//           <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
//             <Icon name={icon} className="w-4 h-4" />
//           </div>
//         )}
//         <input
//           type={type}
//           value={value ?? ''}
//           placeholder={placeholder}
//           disabled={disabled}
//           required={required}
//           step={step}
//           min={min}
//           max={max}
//           onChange={(e) => onChange?.(e.target.value)}
//           className={`form-input ${icon ? 'pl-9' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`}
//         />
//       </div>
//       {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
//     </div>
//   )
// }

import Icon from "../Icon";

export default function AppInput({
  value,
  onChange,
  label,
  type = "text",
  placeholder,
  icon,
  error,
  disabled,
  required,
  step,
  min,
  max,
  className = "",
}) {
  return (
    <div>
      {label && (
        <label className="form-label">
          {label}
          {required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            <Icon name={icon} className="w-4 h-4" />
          </div>
        )}

        <input
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange?.(e.target.value)}
          className={`form-input ${
            icon ? "pl-9" : ""
          } ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
              : ""
          } ${className}`}
        />
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}