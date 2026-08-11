import { useEffect } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../stores/auth"

export default function AuthLayout() {
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  useEffect(() => {
    // Reset dark theme on public/auth pages so login & reset-password are crisp
    document.documentElement.classList.remove("dark")
    document.body.classList.remove("dark-theme")
    document.body.classList.remove("superadmin-dark-mode")
    document.body.classList.add("light-theme")
  }, [])

  if (!hasHydrated) return null

  if (token) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="auth-page-container">
      <Outlet />
    </div>
  )
}