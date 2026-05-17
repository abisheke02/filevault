import { NavLink, useNavigate } from 'react-router-dom'
import {
  HardDrive, Share2, Star, Trash2, LogOut, Vault,
  ShieldCheck, Search, Settings,
} from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import clsx from 'clsx'
import './Sidebar.css'

const MAIN_NAV = [
  { to: '/drive',         icon: HardDrive, label: 'My Drive'  },
  { to: '/search',        icon: Search,    label: 'Search'    },
  { to: '/shares',        icon: Share2,    label: 'My Shares' },
  { to: '/drive/starred', icon: Star,      label: 'Starred'   },
  { to: '/drive/trash',   icon: Trash2,    label: 'Trash'     },
]

export function Sidebar() {
  const user    = useAuthStore(s => s.user)
  const logout  = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  const usedPct = user && user.storageQuotaBytes > 0
    ? Math.min(100, Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100))
    : 0

  const fmt = (b: number) => {
    if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
    if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
    return (b / 1e3).toFixed(0) + ' KB'
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <aside className="sidebar">

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><Vault size={18} /></div>
        <span className="sidebar-logo-text">FileVault</span>
      </div>

      {/* ── Main nav ── */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Drive</p>
        {MAIN_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/drive'}
            className={({ isActive }) => clsx('sidebar-link', isActive && 'sidebar-link--active')}
          >
            <span className="sidebar-link-icon"><Icon size={16} /></span>
            <span className="sidebar-link-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Account nav ── */}
      <nav className="sidebar-nav sidebar-nav--account">
        <p className="sidebar-section-label">Account</p>
        <NavLink
          to="/settings"
          className={({ isActive }) => clsx('sidebar-link', isActive && 'sidebar-link--active')}
        >
          <span className="sidebar-link-icon"><Settings size={16} /></span>
          <span className="sidebar-link-label">Settings</span>
        </NavLink>

        {user?.isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => clsx('sidebar-link', isActive && 'sidebar-link--active')}
          >
            <span className="sidebar-link-icon"><ShieldCheck size={16} /></span>
            <span className="sidebar-link-label">Admin panel</span>
          </NavLink>
        )}
      </nav>

      {/* ── Spacer ── */}
      <div className="sidebar-spacer" />

      {/* ── Storage ── */}
      {user && (
        <div className="sidebar-storage">
          <div className="sidebar-storage-row">
            <span className="sidebar-storage-label">Storage</span>
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

      {/* ── Profile + logout ── */}
      <div className="sidebar-footer">
        <div className="sidebar-profile" onClick={() => navigate('/settings')}>
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">{user?.name ?? '—'}</span>
            <span className="sidebar-profile-email">{user?.email ?? ''}</span>
          </div>
        </div>
        <button className="sidebar-link sidebar-logout" onClick={() => { logout(); navigate('/login') }}>
          <span className="sidebar-link-icon"><LogOut size={15} /></span>
          <span className="sidebar-link-label">Sign out</span>
        </button>
      </div>

    </aside>
  )
}
