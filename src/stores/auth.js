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
        if (!data) return;
        let token = get().token;
        let userObj = get().user;

        if (typeof data === 'object') {
          if ('token' in data && data.token) token = data.token;
          if ('user' in data && data.user) {
            userObj = data.user;
          } else if ('username' in data || 'userid' in data || 'userEmail' in data) {
            const { token: t, ...userFields } = data;
            userObj = userFields;
          }
        }
        set({ token, user: userObj, selectedCompanyId: null, selectedTeamMemberId: null });
      },

      updateUser: (updatedFields) => {
        set((state) => {
          const currentUser = state.user || {};
          const mergedUser = { ...currentUser, ...updatedFields };
          return { user: mergedUser };
        });
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