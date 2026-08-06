import { Navigate } from "react-router-dom"
import { useAuthStore } from "../stores/auth"

export default function ProtectedRoute({ children, requiredPermission, adminOnly }) {
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin())
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission)

  if (!hasHydrated) {
    return <div>Loading...</div>
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Super admin and admin bypass all permission checks
  if (isSuperAdmin || isAdmin) {
    return children
  }

  if (adminOnly) {
    return <Navigate to="/home" replace />
  }

  if (requiredPermission) {
    const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission]
    if (!hasAnyPermission(perms)) {
      return <Navigate to="/home" replace />
    }
  }

  return children
}