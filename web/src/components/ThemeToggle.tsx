import { Sun, Moon, Monitor } from 'lucide-react'
import { useUIStore, Theme } from '../stores/ui.store'
import './ThemeToggle.css'

export const ThemeToggle = () => {
  const { theme, setTheme } = useUIStore()

  const themes: { id: Theme; icon: any; label: string }[] = [
    { id: 'light', icon: Sun, label: 'Light' },
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'system', icon: Monitor, label: 'System' },
  ]

  return (
    <div className="theme-toggle">
      {themes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`theme-btn ${theme === id ? 'active' : ''}`}
          onClick={() => setTheme(id)}
          title={`Switch to ${label} mode`}
        >
          <Icon size={16} />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  )
}
