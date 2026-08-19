import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      selectedCompanyId: null,
      selectedTeamMemberId: null,
      hasHydrated: false,

      setHasHydrated: (state) => set({ hasHydrated: state }),
      setSelectedCompanyId: (id) => set({ selectedCompanyId: id }),
      setSelectedTeamMemberId: (id) => set({ selectedTeamMemberId: id }),


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
        set({ token, user, selectedCompanyId: null, selectedTeamMemberId: null }) // ✅ reset impersonation & view filters on new login
      },

      logout: () => {
        set({ token: null, user: null, selectedCompanyId: null, selectedTeamMemberId: null })
        try {
          document.documentElement.classList.remove("dark")
          document.body.classList.remove("dark-theme")
          document.body.classList.remove("superadmin-dark-mode")
          document.body.classList.add("light-theme")
          localStorage.removeItem('crm-theme')
          localStorage.removeItem('auth-storage')
          localStorage.removeItem('crm_token')
          localStorage.removeItem('crm_user')
          localStorage.clear()
          sessionStorage.clear()
        } catch (e) {
          console.error('Error clearing storage on logout:', e)
        }
      },

    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated?.(true)
      },
    }
  )
)