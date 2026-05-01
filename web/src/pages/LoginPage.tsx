import { useState } from 'react'
import { Vault, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ThemeToggle } from '../components/ThemeToggle'
import './LoginPage.css'

export function LoginPage() {
  const [mode, setMode]           = useState<'login' | 'register'>('login')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [name, setName]           = useState('')
  const [showPass, setShowPass]   = useState(false)
  const { login, register, isLoggingIn, isRegistering } = useAuth()

  const busy = isLoggingIn || isRegistering

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      login({ email, password })
    } else {
      register({ name, email, password })
    }
  }

  return (
    <div className="login-page">
      {/* Background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      
      <div className="login-theme-switch">
        <ThemeToggle />
      </div>

      <div className="login-card fade-in">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Vault size={28} />
          </div>
          <div>
            <h1 className="login-logo-title">FileVault</h1>
            <p className="login-logo-sub">Your private cloud storage</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'login-tab--active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'login-tab--active' : ''}`}
            onClick={() => setMode('register')}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={submit}>
          {mode === 'register' && (
            <div className="login-field fade-in">
              <label className="login-label">Name</label>
              <div className="login-input-wrap">
                <User size={15} className="login-input-icon" />
                <input
                  className="input login-input"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus={mode === 'register'}
                />
              </div>
            </div>
          )}

          <div className="login-field">
            <label className="login-label">Email</label>
            <div className="login-input-wrap">
              <Mail size={15} className="login-input-icon" />
              <input
                className="input login-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={mode === 'login'}
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <div className="login-input-wrap">
              <Lock size={15} className="login-input-icon" />
              <input
                className="input login-input"
                type={showPass ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Min. 8 characters' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : undefined}
              />
              <button
                type="button"
                className="login-show-pass"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary login-submit" type="submit" disabled={busy}>
            {busy ? (
              <span className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <>
                {mode === 'login' ? 'Sign in' : 'Create account'}
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <p className="login-footer">
          Self-hosted · End-to-end secure · Your data, your rules
        </p>
      </div>
    </div>
  )
}
