import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { LoginPage }    from './pages/LoginPage'
import { DrivePage }    from './pages/DrivePage'
import { TrashPage }    from './pages/TrashPage'
import { SettingsPage } from './pages/SettingsPage'
import { Sidebar }      from './components/Sidebar'
import { TopBar }       from './components/TopBar'

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function AppShell() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/drive"          element={<DrivePage />} />
            <Route path="/drive/folder/:id" element={<DrivePage />} />
            <Route path="/drive/trash"    element={<TrashPage />} />
            <Route path="/settings"       element={<SettingsPage />} />
            <Route path="*"               element={<Navigate to="/drive" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/*"        element={<Protected><AppShell /></Protected>} />
    </Routes>
  )
}
