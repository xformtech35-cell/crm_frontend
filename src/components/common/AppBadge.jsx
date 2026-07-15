const COLOR_CLASS = {
  blue:   'bg-blue-50 text-blue-700 border border-blue-200',
  green:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  red:    'bg-red-50 text-red-700 border border-red-200',
  yellow: 'bg-amber-50 text-amber-700 border border-amber-200',
  orange: 'bg-orange-50 text-orange-700 border border-orange-200',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  cyan:   'bg-cyan-50 text-cyan-700 border border-cyan-200',
  gray:   'bg-gray-100 text-gray-600 border border-gray-200',
}

const DOT_CLASS = {
  blue:   'bg-blue-500',
  green:  'bg-emerald-500',
  red:    'bg-red-500',
  yellow: 'bg-amber-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  cyan:   'bg-cyan-500',
  gray:   'bg-gray-400',
}

export default function AppBadge({ color = 'gray', children }) {
  return (
    <span className={`badge ${COLOR_CLASS[color] || COLOR_CLASS.gray}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLASS[color] || DOT_CLASS.gray}`} />
      {children}
    </span>
  )
}
