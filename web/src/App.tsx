import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { LoginPage }           from './pages/LoginPage'
import { ResetPasswordPage }   from './pages/ResetPasswordPage'
import { DrivePage }           from './pages/DrivePage'
import { RecentPage }          from './pages/RecentPage'
import { TrashPage }           from './pages/TrashPage'
import { SettingsPage }        from './pages/SettingsPage'
import { NotificationsPage }   from './pages/NotificationsPage'
import { BackupPage }          from './pages/BackupPage'
import { SharePage }           from './pages/SharePage'
import { SharesPage }          from './pages/SharesPage'
import { AdminPage }           from './pages/AdminPage'
import { SearchPage }          from './pages/SearchPage'
import { Sidebar }             from './components/Sidebar'
import { TopBar }              from './components/TopBar'
import { useSocket }           from './hooks/useSocket'

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function AppShell() {
  useSocket()
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/drive"               element={<DrivePage />} />
            <Route path="/drive/folder/:id"    element={<DrivePage />} />
            <Route path="/drive/recent"        element={<RecentPage />} />
            <Route path="/drive/trash"         element={<TrashPage />} />
            <Route path="/drive/starred"       element={<DrivePage />} />
            <Route path="/search"              element={<SearchPage />} />
            <Route path="/shares"              element={<SharesPage />} />
            <Route path="/notifications"       element={<NotificationsPage />} />
            <Route path="/backup"              element={<BackupPage />} />
            <Route path="/settings"            element={<SettingsPage />} />
            <Route path="/admin"               element={<AdminPage />} />
            <Route path="*"                    element={<Navigate to="/drive" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/s/:token"       element={<SharePage />} />
      <Route path="/*"              element={<Protected><AppShell /></Protected>} />
    </Routes>
  )
}
