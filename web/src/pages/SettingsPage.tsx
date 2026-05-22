import { useState } from 'react'
import {
  User, Shield, HardDrive, Palette, Lock,
  ShieldCheck, ShieldOff, QrCode, Sun, Moon, Monitor,
  Eye, EyeOff, Trash2, AlertTriangle, Download,
} from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import { useUIStore }   from '../stores/ui.store'
import { usersApi }     from '../api/files.api'
import { authApi }      from '../api/auth.api'
import { useNavigate }  from 'react-router-dom'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import './SettingsPage.css'

type Tab = 'profile' | 'security' | 'privacy' | 'storage' | 'appearance'

const TABS: { id: Tab; icon: React.ComponentType<any>; label: string }[] = [
  { id: 'profile',    icon: User,      label: 'Profile'    },
  { id: 'security',   icon: Shield,    label: 'Security'   },
  { id: 'privacy',    icon: Lock,      label: 'Privacy'    },
  { id: 'storage',    icon: HardDrive, label: 'Storage'    },
  { id: 'appearance', icon: Palette,   label: 'Appearance' },
]

function fmt(b: number) {
  if (b >= 1e12) return (b / 1e12).toFixed(2) + ' TB'
  if (b >= 1e9)  return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6)  return (b / 1e6).toFixed(0) + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')

  const user       = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const logout     = useAuthStore(s => s.logout)
  const { theme, setTheme } = useUIStore()
  const navigate = useNavigate()

  // Profile
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [showCur, setShowCur]       = useState(false)
  const [showNew, setShowNew]       = useState(false)
  const [savingPw, setSavingPw]     = useState(false)

  // 2FA
  const [totpStep, setTotpStep]         = useState<'idle' | 'setup' | 'disable'>('idle')
  const [qrDataUrl, setQrDataUrl]       = useState('')
  const [totpSecret, setTotpSecret]     = useState('')
  const [totpCode, setTotpCode]         = useState('')
  const [totpLoading, setTotpLoading]   = useState(false)

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const usedPct = user && user.storageQuotaBytes > 0
    ? Math.min(100, Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100))
    : 0

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { toast.error('Name cannot be empty'); return }
    setSavingProfile(true)
    try {
      const res = await usersApi.updateProfile(displayName.trim())
      updateUser({ name: res.data.name })
      toast.success('Profile updated')
    } catch { toast.error('Failed to update profile') }
    finally { setSavingProfile(false) }
  }

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error('Fill in all fields'); return }
    if (newPw.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
    setSavingPw(true)
    try {
      await usersApi.changePassword(currentPw, newPw)
      toast.success('Password changed')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Failed to change password')
    } finally { setSavingPw(false) }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) { toast.error('Email does not match'); return }
    setDeletingAccount(true)
    try {
      await authApi.deleteAccount()
      logout()
      navigate('/login')
      toast.success('Account deleted')
    } catch { toast.error('Failed to delete account') }
    finally { setDeletingAccount(false) }
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  return (
    <div className="settings-page">

      {/* ── Tab bar ── */}
      <div className="settings-tabs">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={clsx('settings-tab', tab === id && 'settings-tab--active')}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="settings-body">

        {/* ─── Profile ─── */}
        {tab === 'profile' && (
          <section className="settings-section fade-in">
            <h2 className="settings-section-title">Profile</h2>

            <div className="settings-card">
              <div className="settings-avatar-row">
                <div className="settings-avatar">{initials}</div>
                <div>
                  <p className="settings-avatar-name">{user?.name ?? '—'}</p>
                  <p className="settings-avatar-email">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <h3 className="settings-card-title">Display name</h3>
              <div className="settings-form">
                <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <h3 className="settings-card-title" style={{ marginTop: 16 }}>Email address</h3>
              <div className="settings-form">
                <input className="input" type="email" value={user?.email ?? ''} disabled />
                <p className="settings-hint">Email cannot be changed.</p>
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                  Save changes
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ─── Security ─── */}
        {tab === 'security' && (
          <section className="settings-section fade-in">
            <h2 className="settings-section-title">Security</h2>

            {/* Change password */}
            <div className="settings-card">
              <h3 className="settings-card-title">Change password</h3>
              <p className="settings-card-desc">Choose a strong password with at least 8 characters.</p>
              <div className="settings-form">
                <label className="settings-label">Current password</label>
                <div className="settings-pw-wrap">
                  <input className="input" type={showCur ? 'text' : 'password'} value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" />
                  <button type="button" className="settings-pw-eye" onClick={() => setShowCur(v => !v)}>
                    {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <label className="settings-label">New password</label>
                <div className="settings-pw-wrap">
                  <input className="input" type={showNew ? 'text' : 'password'} value={newPw}
                    onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
                  <button type="button" className="settings-pw-eye" onClick={() => setShowNew(v => !v)}>
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <label className="settings-label">Confirm new password</label>
                <input className="input" type="password" value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-primary" onClick={handleChangePassword} disabled={savingPw}>
                  {savingPw ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Lock size={14} />}
                  Update password
                </button>
              </div>
            </div>

            {/* 2FA */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h3 className="settings-card-title">Two-factor authentication</h3>
                  <p className="settings-card-desc">Extra security with Google Authenticator, Authy, etc.</p>
                </div>
                <span className={`badge ${user?.totpEnabled ? 'badge-green' : 'badge-red'}`}>
                  {user?.totpEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {totpStep === 'idle' && (
                user?.totpEnabled ? (
                  <button className="btn btn-ghost" style={{ color: 'var(--danger)', marginTop: 12 }}
                    onClick={() => setTotpStep('disable')}>
                    <ShieldOff size={14} /> Disable 2FA
                  </button>
                ) : (
                  <button className="btn btn-ghost" style={{ marginTop: 12 }}
                    onClick={async () => {
                      setTotpLoading(true)
                      try {
                        const r = await usersApi.setup2fa()
                        setQrDataUrl(r.data.qrDataUrl); setTotpSecret(r.data.secret); setTotpStep('setup')
                      } catch { toast.error('Failed to start 2FA setup') }
                      finally { setTotpLoading(false) }
                    }} disabled={totpLoading}>
                    <QrCode size={14} /> {totpLoading ? 'Loading…' : 'Enable 2FA'}
                  </button>
                )
              )}

              {totpStep === 'setup' && (
                <div className="totp-setup fade-in">
                  <p className="totp-hint">Scan with your authenticator app, then enter the 6-digit code to confirm.</p>
                  {qrDataUrl && <img src={qrDataUrl} alt="QR" className="totp-qr" />}
                  <p className="totp-secret-label">Manual key: <code className="totp-secret">{totpSecret}</code></p>
                  <input className="input totp-input" placeholder="000000" maxLength={6}
                    value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))} />
                  <div className="totp-actions">
                    <button className="btn btn-primary" disabled={totpCode.length !== 6 || totpLoading}
                      onClick={async () => {
                        setTotpLoading(true)
                        try { await usersApi.enable2fa(totpCode); updateUser({ totpEnabled: true }); toast.success('2FA enabled'); setTotpStep('idle'); setTotpCode('') }
                        catch { toast.error('Invalid code') }
                        finally { setTotpLoading(false) }
                      }}>
                      <ShieldCheck size={14} /> Confirm & enable
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setTotpStep('idle'); setTotpCode('') }}>Cancel</button>
                  </div>
                </div>
              )}

              {totpStep === 'disable' && (
                <div className="totp-setup fade-in">
                  <p className="totp-hint">Enter your current authenticator code to disable 2FA.</p>
                  <input className="input totp-input" placeholder="000000" maxLength={6}
                    value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))} />
                  <div className="totp-actions">
                    <button className="btn btn-danger" disabled={totpCode.length !== 6 || totpLoading}
                      onClick={async () => {
                        setTotpLoading(true)
                        try { await usersApi.disable2fa(totpCode); updateUser({ totpEnabled: false }); toast.success('2FA disabled'); setTotpStep('idle'); setTotpCode('') }
                        catch { toast.error('Invalid code') }
                        finally { setTotpLoading(false) }
                      }}>
                      <ShieldOff size={14} /> Disable 2FA
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setTotpStep('idle'); setTotpCode('') }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Privacy ─── */}
        {tab === 'privacy' && (
          <section className="settings-section fade-in">
            <h2 className="settings-section-title">Privacy</h2>

            <div className="settings-card">
              <h3 className="settings-card-title">Data & sharing</h3>
              <div className="notif-list">
                {[
                  { label: 'Share analytics', desc: 'Allow FileVault to collect anonymous usage statistics' },
                  { label: 'File metadata', desc: 'Include file metadata in search index' },
                ].map(({ label, desc }) => (
                  <div key={label} className="notif-row">
                    <div className="notif-info">
                      <span className="notif-label">{label}</span>
                      <span className="notif-desc">{desc}</span>
                    </div>
                    <label className="notif-toggle">
                      <input type="checkbox" defaultChecked />
                      <span className="notif-toggle-track" />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-card">
              <h3 className="settings-card-title">Export your data</h3>
              <p className="settings-card-desc">Download a copy of all your files and account information.</p>
              <div className="settings-card-footer">
                <button className="btn btn-ghost" onClick={() => toast.success('Export coming soon')}>
                  <Download size={14} /> Request data export
                </button>
              </div>
            </div>

            <div className="settings-card settings-card--danger">
              <div className="settings-card-header">
                <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                <div>
                  <h3 className="settings-card-title" style={{ color: 'var(--danger)' }}>Delete account</h3>
                  <p className="settings-card-desc">
                    Permanently delete your account and all files. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="settings-form" style={{ marginTop: 14 }}>
                <label className="settings-label">Type your email to confirm: <strong>{user?.email}</strong></label>
                <input className="input" placeholder={user?.email}
                  value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
              </div>
              <div className="settings-card-footer">
                <button className="btn btn-danger"
                  disabled={deleteConfirm !== user?.email || deletingAccount}
                  onClick={handleDeleteAccount}>
                  <Trash2 size={14} />
                  {deletingAccount ? 'Deleting…' : 'Delete my account permanently'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ─── Storage ─── */}
        {tab === 'storage' && (
          <section className="settings-section fade-in">
            <h2 className="settings-section-title">Storage</h2>
            <div className="settings-card">
              <h3 className="settings-card-title">Usage</h3>
              <div className="settings-storage-bar-wrap">
                <div className="progress-bar settings-storage-bar">
                  <div className="progress-bar-fill" style={{ width: `${usedPct}%` }} />
                </div>
                <p className="settings-storage-detail">
                  {fmt(user?.storageUsedBytes ?? 0)} used
                  {user?.storageQuotaBytes && user.storageQuotaBytes > 0
                    ? ` of ${fmt(user.storageQuotaBytes)}`
                    : ' (unlimited)'}
                </p>
              </div>
              <div className="settings-storage-stats">
                <div className="settings-stat">
                  <span className="settings-stat-val">{usedPct}%</span>
                  <span className="settings-stat-lbl">Used</span>
                </div>
                <div className="settings-stat">
                  <span className="settings-stat-val">{fmt(user?.storageUsedBytes ?? 0)}</span>
                  <span className="settings-stat-lbl">Total used</span>
                </div>
                <div className="settings-stat">
                  <span className="settings-stat-val">
                    {user?.storageQuotaBytes && user.storageQuotaBytes > 0 ? fmt(user.storageQuotaBytes) : '∞'}
                  </span>
                  <span className="settings-stat-lbl">Quota</span>
                </div>
              </div>
            </div>
            <div className="settings-card" style={{ marginTop: 16 }}>
              <h3 className="settings-card-title">Breakdown</h3>
              <div className="settings-storage-breakdown">
                <div className="breakdown-item">
                  <HardDrive size={14} />
                  <span>Files</span>
                  <span className="breakdown-size">{fmt(user?.storageUsedBytes ?? 0)}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Appearance ─── */}
        {tab === 'appearance' && (
          <section className="settings-section fade-in">
            <h2 className="settings-section-title">Appearance</h2>
            <div className="settings-card">
              <h3 className="settings-card-title">Theme</h3>
              <p className="settings-card-desc">Choose how FileVault looks on this device.</p>
              <div className="appearance-theme-grid">
                {([
                  { id: 'light',  icon: Sun,     label: 'Light',  desc: 'Always light'    },
                  { id: 'dark',   icon: Moon,    label: 'Dark',   desc: 'Always dark'     },
                  { id: 'system', icon: Monitor, label: 'System', desc: 'Match OS setting' },
                ] as const).map(({ id, icon: Icon, label, desc }) => (
                  <button key={id}
                    className={clsx('appearance-theme-btn', theme === id && 'appearance-theme-btn--active')}
                    onClick={() => setTheme(id)}>
                    <Icon size={22} />
                    <span className="appearance-theme-label">{label}</span>
                    <span className="appearance-theme-desc">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Notifications moved to /notifications page in sidebar */}

      </div>
    </div>
  )
}
