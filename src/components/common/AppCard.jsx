export default function AppCard({ title, actions, children }) {
  return (
    <div className="card">
      {title && (
        <div className="card-header">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {actions}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  )
}
