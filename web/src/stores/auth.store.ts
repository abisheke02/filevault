import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'member'
  avatarUrl?: string
  storageUsed: number
  storageQuota: number
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  updateUser: (u: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (u) =>
        set((s) => ({ user: s.user ? { ...s.user, ...u } : null })),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'fv-auth' }
  )
)
