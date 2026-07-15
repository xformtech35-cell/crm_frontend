import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth";

/**
 * Route guard that only allows SUPER_ADMIN users.
 * If user is authenticated but not super admin → redirect to /home (CRM).
 * If user is not authenticated → redirect to /login.
 */
export default function SuperAdminRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "linear-gradient(135deg, #0f172a, #1e1b4b)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm text-purple-300 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    // Regular admin/user trying to access super admin area → redirect to CRM
    return <Navigate to="/home" replace />;
  }

  return children;
}
