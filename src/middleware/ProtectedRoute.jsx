import { Navigate } from "react-router-dom"
import { useAuthStore } from "../stores/auth"

export default function ProtectedRoute({ children, requiredPermission, adminOnly }) {
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const user = useAuthStore((s) => s.user)
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission)

  const role = user?.role?.toLowerCase()
  const isAdmin = role === "admin" || role === "super_admin" || role === "super admin"
  const isSuperAdmin = role === "super_admin" || role === "super admin"

  if (!hasHydrated) {
    return <div>Loading...</div>
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Super admin bypasses all permission checks
  if (isSuperAdmin) {
    return children
  }

  // Admin bypasses all checks except integrations access block
  if (isAdmin) {
    if (requiredPermission === "integrations.view" || (Array.isArray(requiredPermission) && requiredPermission.includes("integrations.view"))) {
      if (!user?.integrationsAccess) {
        return <Navigate to="/home" replace />
      }
    }
    return children
  }

  if (adminOnly) {
    return <Navigate to="/home" replace />
  }

  if (requiredPermission) {
    const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission]
    const hasIntegrationsAccess = perms.includes("integrations.view") && !!user?.integrationsAccess;
    if (!hasAnyPermission(perms) && !hasIntegrationsAccess) {
      return <Navigate to="/home" replace />
    }
  }

  return children
}