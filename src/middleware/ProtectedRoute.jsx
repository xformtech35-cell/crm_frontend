import { Navigate } from "react-router-dom"
import { useAuthStore } from "../stores/auth"

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  if (!hasHydrated) {
    return <div>Loading...</div>
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}