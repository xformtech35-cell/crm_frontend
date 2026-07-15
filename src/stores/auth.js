import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      selectedCompanyId: null,
      hasHydrated: false,

      setHasHydrated: (state) => set({ hasHydrated: state }),
      setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),

      isAuthenticated: () => !!get().token,
      currentUser: () => get().user,
      isAdmin: () => {
        const role = get().user?.role?.toLowerCase()
        return role === 'admin' || role === 'super_admin' || role === 'super admin'
      },
      isSuperAdmin: () => {
        const role = get().user?.role?.toLowerCase()
        return role === 'super_admin' || role === 'super admin'
      },

      hasPermission: (permission) => {
        const perms = get().user?.permissions ?? []
        return perms.includes(permission)
      },

      hasAnyPermission: (permissions) => {
        const perms = get().user?.permissions ?? []
        return permissions.some((p) => perms.includes(p))
      },

      setAuth: (data) => {
        const { token, ...user } = data
        set({ token, user }) // ✅ no manual localStorage
      },

      logout: () => {
        set({ token: null, user: null, selectedCompanyId: null }) // ✅ persist will handle removal
      },
    }),
    {
      name: 'auth-storage',

      onRehydrateStorage: () => (state) => {
        state.setHasHydrated(true)
      },
    }
  )
)