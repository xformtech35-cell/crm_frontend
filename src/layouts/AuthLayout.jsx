import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../stores/auth"

export default function AuthLayout() {
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  if (!hasHydrated) return null

  if (token) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}