import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { authApi } from '../api/auth.api'
import { ThemeToggle } from '../components/ThemeToggle'
import toast from 'react-hot-toast'
import './LoginPage.css'

export function ResetPasswordPage() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const token       = params.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm)  { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid or expired reset link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-blob login-blob-1" /><div className="login-blob login-blob-2" />
      <div className="login-theme-switch"><ThemeToggle /></div>

      <div className="login-card fade-in">
        <div className="login-logo">
          <div className="login-logo-icon">
            {done ? <CheckCircle size={26} /> : <KeyRound size={26} />}
          </div>
          <div>
            <h1 className="login-logo-title">{done ? 'Password reset' : 'Set new password'}</h1>
            <p className="login-logo-sub">
              {done ? 'Your password has been updated.' : 'Choose a strong new password.'}
            </p>
          </div>
        </div>

        {done ? (
          <button className="btn btn-primary login-submit" onClick={() => navigate('/login')}>
            Sign in now →
          </button>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {!token && (
              <p style={{ color: 'var(--danger)', fontSize: 13 }}>
                No reset token found. Use the link from your email.
              </p>
            )}
            <div className="login-field">
              <label className="login-label">New password</label>
              <div className="login-input-wrap">
                <KeyRound size={15} className="login-input-icon" />
                <input className="input login-input" type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters" value={password}
                  onChange={e => setPassword(e.target.value)} required disabled={!token} autoFocus />
                <button type="button" className="login-show-pass" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="login-field">
              <label className="login-label">Confirm password</label>
              <div className="login-input-wrap">
                <KeyRound size={15} className="login-input-icon" />
                <input className="input login-input" type="password" placeholder="Repeat password"
                  value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={!token} />
              </div>
            </div>
            <button className="btn btn-primary login-submit" type="submit" disabled={loading || !token}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><KeyRound size={15} /> Reset password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
