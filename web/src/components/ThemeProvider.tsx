import { useEffect } from 'react'
import { useUIStore } from '../stores/ui.store'

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = (currentTheme: string) => {
      let effectiveTheme = currentTheme
      if (currentTheme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      root.setAttribute('data-theme', effectiveTheme)
    }

    applyTheme(theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  return <>{children}</>
}
