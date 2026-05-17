import { useState } from 'react'
import { Vault, Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../stores/auth.store'
import { useNavigate, Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import toast from 'react-hot-toast'
import './LoginPage.css'

type Step = 'credentials' | 'totp' | 'forgot'

export function LoginPage() {
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [step, setStep]         = useState<Step>('credentials')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [showPass, setShowPass] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [totpLoading, setTotpLoading] = useState(false)

  const [forgotEmail, setForgotEmail]   = useState('')
  const [forgotSent, setForgotSent]     = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetLink, setResetLink]       = useState('')

  const { login, register, isLoggingIn, isRegistering } = useAuth()
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const busy = isLoggingIn || isRegistering

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    try {
      const res = await authApi.forgotPassword(forgotEmail)
      setForgotSent(true)
      if (res.data.resetUrl) setResetLink(res.data.resetUrl)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setForgotLoading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      const result = await authApi.login({ email, password }).catch(() => null)
      if (!result) { toast.error('Invalid credentials'); return }
      const data = result.data
      if ('needsTotp' in data) {
        setStep('totp')
      } else {
        setAuth(data.accessToken, data.user)
        toast.success(`Welcome back, ${data.user.name}!`)
        navigate('/drive')
      }
    } else {
      register({ name, email, password })
    }
  }

  const submitTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totpCode.length !== 6) return
    setTotpLoading(true)
    try {
      const res = await authApi.login({ email, password, totpToken: totpCode })
      const data = res.data
      if ('needsTotp' in data) { toast.error('Invalid code'); return }
      setAuth(data.accessToken, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/drive')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid code')
    } finally {
      setTotpLoading(false)
    }
  }

  // ── Forgot password step ─────────────────────────────────
  if (step === 'forgot') {
    return (
      <div className="login-page">
        <div className="login-blob login-blob-1" /><div className="login-blob login-blob-2" />
        <div className="login-theme-switch"><ThemeToggle /></div>
        <div className="login-card fade-in">
          <div className="login-logo">
            <div className="login-logo-icon"><KeyRound size={26} /></div>
            <div>
              <h1 className="login-logo-title">Reset password</h1>
              <p className="login-logo-sub">We'll send you a reset link</p>
            </div>
          </div>

          {!forgotSent ? (
            <form className="login-form" onSubmit={handleForgotPassword}>
              <div className="login-field">
                <label className="login-label">Email address</label>
                <div className="login-input-wrap">
                  <Mail size={15} className="login-input-icon" />
                  <input className="input login-input" type="email" placeholder="you@example.com"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required autoFocus />
                </div>
              </div>
              <button className="btn btn-primary login-submit" type="submit" disabled={forgotLoading}>
                {forgotLoading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><KeyRound size={15} /> Send reset link</>}
              </button>
            </form>
          ) : (
            <div className="forgot-sent fade-in">
              <div className="forgot-sent-icon">✓</div>
              <p className="forgot-sent-title">Reset link sent</p>
              <p className="forgot-sent-desc">
                If <strong>{forgotEmail}</strong> is registered, a reset link was generated.
              </p>
              {resetLink && (
                <div className="forgot-reset-link-box">
                  <p className="forgot-reset-link-label">
                    (No SMTP configured — copy this link to reset your password)
                  </p>
                  <div className="forgot-reset-link-row">
                    <code className="forgot-reset-link">{resetLink}</code>
                    <button className="btn btn-ghost" style={{ fontSize: 12 }}
                      onClick={() => { navigator.clipboard?.writeText(resetLink).catch(() => {}); toast.success('Copied') }}>
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button type="button" className="btn btn-ghost"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => { setStep('credentials'); setForgotSent(false); setResetLink('') }}>
            ← Back to sign in
          </button>
        </div>
      </div>
    )
  }

  // ── TOTP step ────────────────────────────────────────────
  if (step === 'totp') {
    return (
      <div className="login-page">
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-theme-switch"><ThemeToggle /></div>

        <div className="login-card fade-in">
          <div className="login-logo">
            <div className="login-logo-icon"><ShieldCheck size={28} /></div>
            <div>
              <h1 className="login-logo-title">Two-factor auth</h1>
              <p className="login-logo-sub">Enter the code from your authenticator app</p>
            </div>
          </div>

          <form className="login-form" onSubmit={submitTotp}>
            <div className="login-field">
              <label className="login-label">6-digit code</label>
              <input
                className="input login-input login-totp-input"
                type="text"
                inputMode="numeric"
                placeholder="000 000"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>

            <button
              className="btn btn-primary login-submit"
              type="submit"
              disabled={totpCode.length !== 6 || totpLoading}
            >
              {totpLoading
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : <><ShieldCheck size={15} /> Verify</>}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 4 }}
              onClick={() => { setStep('credentials'); setTotpCode('') }}
            >
              ← Back to sign in
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Credentials step ─────────────────────────────────────
  return (
    <div className="login-page">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-theme-switch"><ThemeToggle /></div>

      <div className="login-card fade-in">
        <div className="login-logo">
          <div className="login-logo-icon"><Vault size={28} /></div>
          <div>
            <h1 className="login-logo-title">FileVault</h1>
            <p className="login-logo-sub">Your private cloud storage</p>
          </div>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'login-tab--active' : ''}`}
            onClick={() => setMode('login')}
          >Sign in</button>
          <button
            className={`login-tab ${mode === 'register' ? 'login-tab--active' : ''}`}
            onClick={() => setMode('register')}
          >Create account</button>
        </div>

        <form className="login-form" onSubmit={submit}>
          {mode === 'register' && (
            <div className="login-field fade-in">
              <label className="login-label">Name</label>
              <div className="login-input-wrap">
                <User size={15} className="login-input-icon" />
                <input className="input login-input" type="text" placeholder="Your name"
                  value={name} onChange={(e) => setName(e.target.value)} required autoFocus={mode === 'register'} />
              </div>
            </div>
          )}

          <div className="login-field">
            <label className="login-label">Email</label>
            <div className="login-input-wrap">
              <Mail size={15} className="login-input-icon" />
              <input className="input login-input" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={mode === 'login'} />
            </div>
          </div>

          <div className="login-field">
            <div className="login-label-row">
              <label className="login-label">Password</label>
              {mode === 'login' && (
                <button type="button" className="login-forgot-link"
                  onClick={() => { setStep('forgot'); setForgotEmail(email) }}>
                  Forgot password?
                </button>
              )}
            </div>
            <div className="login-input-wrap">
              <Lock size={15} className="login-input-icon" />
              <input className="input login-input" type={showPass ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Min. 8 characters' : 'Password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={mode === 'register' ? 8 : undefined} />
              <button type="button" className="login-show-pass" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
            {busy
              ? <span className="spinner" style={{ width: 16, height: 16 }} />
              : <>{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={15} /></>}
          </button>
        </form>

        <p className="login-footer">Self-hosted · End-to-end secure · Your data, your rules</p>
      </div>
    </div>
  )
}
