import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  HardDrive, Share2, Star, Trash2,
  LogOut, ChevronRight, Vault,
  User, Shield, Bell, Palette, ChevronDown, ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import clsx from 'clsx'
import './Sidebar.css'

const DRIVE_NAV = [
  { to: '/drive',        icon: HardDrive, label: 'My Drive' },
  { to: '/shares',       icon: Share2,    label: 'My Shares'},
  { to: '/drive/starred',icon: Star,      label: 'Starred'  },
  { to: '/drive/trash',  icon: Trash2,    label: 'Trash'    },
]

const SETTINGS_NAV = [
  { tab: 'profile',    icon: User,    label: 'Profile'       },
  { tab: 'security',   icon: Shield,  label: 'Security'      },
  { tab: 'storage',    icon: HardDrive, label: 'Storage'     },
  { tab: 'notifs',     icon: Bell,    label: 'Notifications' },
  { tab: 'appearance', icon: Palette, label: 'Appearance'    },
]

export function Sidebar() {
  const user    = useAuthStore((s) => s.user)
  const logout  = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(location.pathname === '/settings')

  const isSettings = location.pathname === '/settings'
  const activeTab  = new URLSearchParams(location.search).get('tab') ?? 'profile'

  const usedPct = user && user.storageQuotaBytes > 0
    ? Math.min(100, Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100))
    : 0

  const fmt = (b: number) => {
    if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
    if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
    return (b / 1e3).toFixed(0) + ' KB'
  }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Vault size={20} /></div>
        <span className="sidebar-logo-text">FileVault</span>
      </div>

      {/* Profile card */}
      <div className="sidebar-profile" onClick={() => { setSettingsOpen(true); navigate('/settings?tab=profile') }}>
        <div className="sidebar-profile-avatar">{initials}</div>
        <div className="sidebar-profile-info">
          <span className="sidebar-profile-name">{user?.name ?? '—'}</span>
          <span className="sidebar-profile-email">{user?.email ?? ''}</span>
        </div>
      </div>

      {/* Drive nav */}
      <div className="sidebar-section-label">Drive</div>
      <nav className="sidebar-nav">
        {DRIVE_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/drive'}
            onClick={() => setSettingsOpen(false)}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && !isSettings && 'sidebar-link--active')
            }
          >
            <Icon size={16} />
            <span>{label}</span>
            <ChevronRight size={14} className="sidebar-link-arrow" />
          </NavLink>
        ))}
      </nav>

      {/* Settings nav */}
      <div className="sidebar-section-label sidebar-section-label--clickable"
        onClick={() => setSettingsOpen((v) => !v)}>
        Settings
        <ChevronDown size={13} className={clsx('sidebar-section-chevron', settingsOpen && 'sidebar-section-chevron--open')} />
      </div>

      {settingsOpen && (
        <nav className="sidebar-nav sidebar-nav--settings fade-in">
          {SETTINGS_NAV.map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              className={clsx('sidebar-link', isSettings && activeTab === tab && 'sidebar-link--active')}
              onClick={() => navigate(`/settings?tab=${tab}`)}
            >
              <Icon size={15} />
              <span>{label}</span>
              <ChevronRight size={14} className="sidebar-link-arrow" />
            </button>
          ))}
        </nav>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Storage meter */}
      {user && (
        <div className="sidebar-storage">
          <div className="sidebar-storage-label">
            <span>Storage</span>
            <span className="sidebar-storage-pct">{usedPct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${usedPct}%` }} />
          </div>
          <p className="sidebar-storage-detail">
            {fmt(user.storageUsedBytes)} of {user.storageQuotaBytes > 0 ? fmt(user.storageQuotaBytes) : '∞'} used
          </p>
        </div>
      )}

      {/* Admin link */}
      {user?.isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => clsx('sidebar-link', isActive && 'sidebar-link--active')}
          style={{ margin: '0 8px 4px' }}>
          <ShieldCheck size={16} />
          <span>Admin panel</span>
          <ChevronRight size={14} className="sidebar-link-arrow" />
        </NavLink>
      )}

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
