import { useState } from 'react'
import { User, Shield, HardDrive, Bell, Palette, LogOut } from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import './SettingsPage.css'

const TABS = [
  { id: 'profile',   icon: User,      label: 'Profile'      },
  { id: 'security',  icon: Shield,    label: 'Security'     },
  { id: 'storage',   icon: HardDrive, label: 'Storage'      },
  { id: 'notifs',    icon: Bell,      label: 'Notifications'},
  { id: 'appearance',icon: Palette,   label: 'Appearance'   },
] as const

type Tab = typeof TABS[number]['id']

function fmt(b: number) {
  if (b >= 1e12) return (b / 1e12).toFixed(2) + ' TB'
  if (b >= 1e9)  return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6)  return (b / 1e6).toFixed(0) + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const user     = useAuthStore((s) => s.user)
  const logout   = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const usedPct = user && user.storageQuotaBytes > 0
    ? Math.min(100, Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100))
    : 0

  const handleLogout = () => { logout(); navigate('/login'); toast.success('Logged out') }

  return (
    <div className="settings-page">
      <div className="settings-sidebar">
        <h2 className="settings-heading">Settings</h2>
        <nav className="settings-nav">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`settings-nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
        <button className="settings-nav-item settings-logout" onClick={handleLogout}>
          <LogOut size={15} />
          Sign out
        </button>
      </div>

      <div className="settings-content">
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
              <input className="input" defaultValue={user?.name ?? ''} />
              <label className="settings-label" style={{ marginTop: 16 }}>Email</label>
              <input className="input" type="email" defaultValue={user?.email ?? ''} disabled />
              <button className="btn btn-primary settings-save" onClick={() => toast.success('Saved')}>
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
                <input className="input" type="password" />
                <label className="settings-label" style={{ marginTop: 12 }}>New password</label>
                <input className="input" type="password" />
                <label className="settings-label" style={{ marginTop: 12 }}>Confirm new password</label>
                <input className="input" type="password" />
                <button className="btn btn-primary settings-save" onClick={() => toast.success('Password updated')}>
                  Update password
                </button>
              </div>
            </div>

            <div className="settings-card" style={{ marginTop: 20 }}>
              <div className="settings-card-header">
                <h4 className="settings-card-title">Two-factor authentication</h4>
                <span className="badge badge-red">Disabled</span>
              </div>
              <p className="settings-card-desc">
                Add an extra layer of security to your account with TOTP (Google Authenticator, etc.).
              </p>
              <button className="btn btn-ghost">Enable 2FA</button>
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
          </section>
        )}

        {/* Notifications / Appearance — placeholder */}
        {(tab === 'notifs' || tab === 'appearance') && (
          <section className="settings-section fade-in">
            <h3 className="settings-section-title">
              {TABS.find((t) => t.id === tab)?.label}
            </h3>
            <div className="settings-card settings-wip">
              <Shield size={28} />
              <p>This section is coming in a future update.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
