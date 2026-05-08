import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, HardDrive, ShieldCheck, ShieldOff, QrCode, Sun, Moon, Monitor } from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import { useUIStore } from '../stores/ui.store'
import { usersApi } from '../api/files.api'
import toast from 'react-hot-toast'
import './SettingsPage.css'

type Tab = 'profile' | 'security' | 'storage' | 'notifs' | 'appearance'

function fmt(b: number) {
  if (b >= 1e12) return (b / 1e12).toFixed(2) + ' TB'
  if (b >= 1e9)  return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6)  return (b / 1e6).toFixed(0) + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}

export function SettingsPage() {
  const [params] = useSearchParams()
  const tab = (params.get('tab') ?? 'profile') as Tab

  const user       = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const { theme, setTheme } = useUIStore()

  const [displayName, setDisplayName]     = useState(user?.name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [savingPw, setSavingPw]     = useState(false)

  // 2FA state
  const [totpStep, setTotpStep]         = useState<'idle' | 'setup' | 'disable'>('idle')
  const [qrDataUrl, setQrDataUrl]       = useState('')
  const [totpSecret, setTotpSecret]     = useState('')
  const [totpCode, setTotpCode]         = useState('')
  const [totp2faLoading, setTotp2faLoading] = useState(false)

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
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
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
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <div className="settings-page settings-page--flat">
      <div className="settings-content settings-content--full">

        {/* Profile */}
        {tab === 'profile' && (
          <section className="settings-section fade-in">
            <h3 className="settings-section-title">Profile</h3>
            <div className="settings-avatar-row">
              <div className="settings-avatar">
                {user?.name?.slice(0, 2).toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="settings-avatar-name">{user?.name ?? '—'}</p>
                <p className="settings-avatar-email">{user?.email}</p>
              </div>
            </div>
            <div className="settings-form">
              <label className="settings-label">Display name</label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <label className="settings-label" style={{ marginTop: 16 }}>Email</label>
              <input className="input" type="email" defaultValue={user?.email ?? ''} disabled />
              <button
                className="btn btn-primary settings-save"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                Save changes
              </button>
            </div>
          </section>
        )}

        {/* Security */}
        {tab === 'security' && (
          <section className="settings-section fade-in">
            <h3 className="settings-section-title">Security</h3>
            <div className="settings-card">
              <h4 className="settings-card-title">Change password</h4>
              <div className="settings-form">
                <label className="settings-label">Current password</label>
                <input className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
                <label className="settings-label" style={{ marginTop: 12 }}>New password</label>
                <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
                <label className="settings-label" style={{ marginTop: 12 }}>Confirm new password</label>
                <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                <button
                  className="btn btn-primary settings-save"
                  onClick={handleChangePassword}
                  disabled={savingPw}
                >
                  {savingPw ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                  Update password
                </button>
              </div>
            </div>
            <div className="settings-card" style={{ marginTop: 20 }}>
              <div className="settings-card-header">
                <h4 className="settings-card-title">Two-factor authentication</h4>
                <span className={`badge ${user?.totpEnabled ? 'badge-green' : 'badge-red'}`}>
                  {user?.totpEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="settings-card-desc">
                Add an extra layer of security with TOTP (Google Authenticator, Authy, etc.).
              </p>

              {totpStep === 'idle' && (
                user?.totpEnabled ? (
                  <button className="btn btn-ghost" style={{ color: 'var(--danger)' }}
                    onClick={() => setTotpStep('disable')}>
                    <ShieldOff size={14} /> Disable 2FA
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={async () => {
                    setTotp2faLoading(true)
                    try {
                      const r = await usersApi.setup2fa()
                      setQrDataUrl(r.data.qrDataUrl)
                      setTotpSecret(r.data.secret)
                      setTotpStep('setup')
                    } catch { toast.error('Failed to start 2FA setup') }
                    finally { setTotp2faLoading(false) }
                  }} disabled={totp2faLoading}>
                    <QrCode size={14} /> {totp2faLoading ? 'Loading…' : 'Enable 2FA'}
                  </button>
                )
              )}

              {totpStep === 'setup' && (
                <div className="totp-setup fade-in">
                  <p className="totp-hint">Scan this QR code with your authenticator app, then enter the 6-digit code.</p>
                  {qrDataUrl && <img src={qrDataUrl} alt="QR code" className="totp-qr" />}
                  <p className="totp-secret-label">Or enter manually: <code className="totp-secret">{totpSecret}</code></p>
                  <input
                    className="input totp-input"
                    placeholder="000000"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  />
                  <div className="totp-actions">
                    <button className="btn btn-primary" disabled={totpCode.length !== 6 || totp2faLoading}
                      onClick={async () => {
                        setTotp2faLoading(true)
                        try {
                          await usersApi.enable2fa(totpCode)
                          updateUser({ totpEnabled: true })
                          toast.success('2FA enabled')
                          setTotpStep('idle'); setTotpCode('')
                        } catch { toast.error('Invalid code — try again') }
                        finally { setTotp2faLoading(false) }
                      }}>
                      <ShieldCheck size={14} /> Confirm &amp; enable
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setTotpStep('idle'); setTotpCode('') }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {totpStep === 'disable' && (
                <div className="totp-setup fade-in">
                  <p className="totp-hint">Enter your current authenticator code to disable 2FA.</p>
                  <input
                    className="input totp-input"
                    placeholder="000000"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  />
                  <div className="totp-actions">
                    <button className="btn btn-primary" style={{ background: 'var(--danger)' }}
                      disabled={totpCode.length !== 6 || totp2faLoading}
                      onClick={async () => {
                        setTotp2faLoading(true)
                        try {
                          await usersApi.disable2fa(totpCode)
                          updateUser({ totpEnabled: false })
                          toast.success('2FA disabled')
                          setTotpStep('idle'); setTotpCode('')
                        } catch { toast.error('Invalid code') }
                        finally { setTotp2faLoading(false) }
                      }}>
                      <ShieldOff size={14} /> Disable 2FA
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setTotpStep('idle'); setTotpCode('') }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Storage */}
        {tab === 'storage' && (
          <section className="settings-section fade-in">
            <h3 className="settings-section-title">Storage</h3>
            <div className="settings-card">
              <h4 className="settings-card-title">Usage</h4>
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
            <div className="settings-card" style={{ marginTop: 20 }}>
              <h4 className="settings-card-title">Storage breakdown</h4>
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

        {/* Appearance */}
        {tab === 'appearance' && (
          <section className="settings-section fade-in">
            <h3 className="settings-section-title">Appearance</h3>
            <div className="settings-card">
              <h4 className="settings-card-title">Theme</h4>
              <p className="settings-card-desc">Choose how FileVault looks on this device.</p>
              <div className="appearance-theme-grid">
                {([
                  { id: 'light',  icon: Sun,     label: 'Light',  desc: 'Always light' },
                  { id: 'dark',   icon: Moon,    label: 'Dark',   desc: 'Always dark' },
                  { id: 'system', icon: Monitor, label: 'System', desc: 'Match OS setting' },
                ] as const).map(({ id, icon: Icon, label, desc }) => (
                  <button
                    key={id}
                    className={`appearance-theme-btn ${theme === id ? 'appearance-theme-btn--active' : ''}`}
                    onClick={() => setTheme(id)}
                  >
                    <Icon size={22} />
                    <span className="appearance-theme-label">{label}</span>
                    <span className="appearance-theme-desc">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-card" style={{ marginTop: 20 }}>
              <h4 className="settings-card-title">Density</h4>
              <p className="settings-card-desc">Control how compact the file grid appears.</p>
              <div className="appearance-density-row">
                {(['comfortable', 'compact'] as const).map((d) => (
                  <button key={d} className="appearance-density-btn appearance-density-btn--active" style={{ textTransform: 'capitalize' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Notifications */}
        {tab === 'notifs' && (
          <section className="settings-section fade-in">
            <h3 className="settings-section-title">Notifications</h3>
            <div className="settings-card">
              <h4 className="settings-card-title">In-app notifications</h4>
              <p className="settings-card-desc">Control which events trigger a notification toast.</p>
              <div className="notif-list">
                {[
                  { label: 'Upload complete',     desc: 'When a file finishes uploading' },
                  { label: 'Share link created',  desc: 'When you generate a new share link' },
                  { label: 'File deleted',        desc: 'When a file is moved to trash' },
                  { label: 'Storage warning',     desc: 'When you reach 90% of your quota' },
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
          </section>
        )}

      </div>
    </div>
  )
}
