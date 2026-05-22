import { Sun, Moon } from 'lucide-react'
import { useUIStore } from '../stores/ui.store'
import './ThemeToggle.css'

export const ThemeToggle = () => {
  const { theme, setTheme } = useUIStore()
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <button
      className="theme-toggle-btn"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
