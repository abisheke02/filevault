import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi, type LoginDto, type RegisterDto } from '../api/auth.api'
import { useAuthStore } from '../stores/auth.store'

export function useAuth() {
  const { token, user, setAuth, logout } = useAuthStore()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: (dto: LoginDto) => authApi.login(dto).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/drive')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Login failed')
    },
  })

  const registerMutation = useMutation({
    mutationFn: (dto: RegisterDto) => authApi.register(dto).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user)
      toast.success('Account created!')
      navigate('/drive')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Registration failed')
    },
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
    toast.success('Logged out')
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
    login:     loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    register:  registerMutation.mutate,
    logout:    handleLogout,
    isLoggingIn:    loginMutation.isPending,
    isRegistering:  registerMutation.isPending,
  }
}
