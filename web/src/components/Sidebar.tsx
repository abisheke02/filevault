import { NavLink, useNavigate } from 'react-router-dom'
import {
  HardDrive, Share2, Star, Trash2, Settings,
  LogOut, ChevronRight, Vault
} from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import clsx from 'clsx'
import './Sidebar.css'

const NAV = [
  { to: '/drive',         icon: HardDrive, label: 'My Drive'   },
  { to: '/drive/shared',  icon: Share2,    label: 'Shared'     },
  { to: '/drive/starred', icon: Star,      label: 'Starred'    },
  { to: '/drive/trash',   icon: Trash2,    label: 'Trash'      },
]

export function Sidebar() {
  const user  = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const usedPct = user
    ? Math.min(100, Math.round((user.storageUsed / user.storageQuota) * 100))
    : 0

  const fmt = (b: number) => {
    if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
    if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
    return (b / 1e3).toFixed(0) + ' KB'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Vault size={20} />
        </div>
        <span className="sidebar-logo-text">FileVault</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/drive'}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'sidebar-link--active')
            }
          >
            <Icon size={16} />
            <span>{label}</span>
            <ChevronRight size={14} className="sidebar-link-arrow" />
          </NavLink>
        ))}
      </nav>

      {/* Storage meter */}
      {user && (
        <div className="sidebar-storage">
          <div className="sidebar-storage-label">
            <span>Storage</span>
            <span className="sidebar-storage-pct">{usedPct}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="sidebar-storage-detail">
            {fmt(user.storageUsed)} of {fmt(user.storageQuota)} used
          </p>
        </div>
      )}

      {/* Footer actions */}
      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx('sidebar-link', isActive && 'sidebar-link--active')
          }
        >
          <Settings size={16} />
          <span>Settings</span>
        </NavLink>
        <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
