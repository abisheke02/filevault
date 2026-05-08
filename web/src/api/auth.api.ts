import { api } from './client'
import type { User } from '../stores/auth.store'

export interface LoginDto { email: string; password: string; totpToken?: string }
export interface RegisterDto { name: string; email: string; password: string }
export interface AuthResponse { accessToken: string; user: User }
export interface TotpRequired { needsTotp: true }

export const authApi = {
  login:    (dto: LoginDto)    => api.post<AuthResponse | TotpRequired>('/auth/login', dto),
  register: (dto: RegisterDto) => api.post<AuthResponse>('/auth/register', dto),
  me:       ()                 => api.get<User>('/auth/me'),
}
