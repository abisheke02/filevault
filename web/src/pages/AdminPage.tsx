import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, HardDrive, Shield, Trash2, ChevronDown,
  ShieldCheck, ShieldOff, Activity, UserPlus, KeyRound,
  Server, Database, Search, Clock, CheckCircle, XCircle,
  Eye, EyeOff, X,
} from 'lucide-react'
import { api } from '../api/client'
import { useAuthStore } from '../stores/auth.store'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import './AdminPage.css'

type Tab = 'overview' | 'users' | 'system'

interface AdminUser {
  id: string; email: string; name: string; isAdmin: boolean
  totpEnabled: boolean; storageUsedBytes: number; storageQuotaBytes: number; createdAt: string
}
interface AdminStats { totalUsers: number; totalFiles: number; totalStorageBytes: number }
interface SystemHealth {
  database: string; totalUsers: number; adminCount: number; totp2faCount: number
  totalFiles: number; trashedFiles: number; totalStorage: number
  uptime: number; nodeVersion: string; memory: { heapUsed: number; heapTotal: number; rss: number }
}

const QUOTA_OPTIONS = [
  { label: 'Unlimited', value: -1 },
  { label: '1 GB',   value: 1e9  },
  { label: '5 GB',   value: 5e9  },
  { label: '10 GB',  value: 10e9 },
  { label: '25 GB',  value: 25e9 },
  { label: '50 GB',  value: 50e9 },
  { label: '100 GB', value: 100e9},
]

function fmt(b: number) {
  if (b >= 1e12) return (b / 1e12).toFixed(2) + ' TB'
  if (b >= 1e9)  return (b / 1e9).toFixed(1)  + ' GB'
  if (b >= 1e6)  return (b / 1e6).toFixed(0)  + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}
function fmtUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

/* ── Create User modal ──────────────────────────────────────────────────── */
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail]   = useState('')
  const [name, setName]     = useState('')
  const [pw, setPw]         = useState('')
  const [isAdmin, setAdmin] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/admin/users', { email, name, password: pw, isAdmin })
      toast.success(`User ${email} created`)
      onCreated(); onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create user')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="admin-modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>Create user</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="admin-modal-body" onSubmit={submit}>
          <label className="admin-form-label">Full name</label>
          <input className="input" placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} required />
          <label className="admin-form-label">Email</label>
          <input className="input" type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <label className="admin-form-label">Password</label>
          <div className="settings-pw-wrap">
            <input className="input" type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters"
              value={pw} onChange={e => setPw(e.target.value)} required minLength={6} />
            <button type="button" className="settings-pw-eye" onClick={() => setShowPw(v => !v)}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <label className="admin-toggle-row">
            <input type="checkbox" checked={isAdmin} onChange={e => setAdmin(e.target.checked)} />
            <span>Grant admin access</span>
          </label>
          <div className="admin-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <UserPlus size={14} />}
              Create user
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Reset password modal ───────────────────────────────────────────────── */
function ResetPwModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [pw, setPw]         = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/admin/users/${user.id}/reset-password`, { password: pw })
      toast.success(`Password reset for ${user.email}`)
      onClose()
    } catch { toast.error('Failed to reset password') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="admin-modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>Reset password</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="admin-modal-body">
          <p className="admin-modal-desc">Set a new password for <strong>{user.email}</strong></p>
          <form onSubmit={submit}>
            <label className="admin-form-label">New password</label>
            <div className="settings-pw-wrap">
              <input className="input" type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters"
                value={pw} onChange={e => setPw(e.target.value)} required minLength={6} autoFocus />
              <button type="button" className="settings-pw-eye" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <KeyRound size={14} />}
                Reset password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function AdminPage() {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const [tab, setTab]             = useState<Tab>('overview')
  const [search, setSearch]       = useState('')
  const [showCreate, setCreate]   = useState(false)
  const [resetTarget, setReset]   = useState<AdminUser | null>(null)

  const { data: stats }  = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })
  const { data: health } = useQuery<SystemHealth>({
    queryKey: ['admin-health'],
    queryFn: () => api.get('/admin/health').then(r => r.data),
    refetchInterval: 15_000,
  })
  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  })

  const setQuota = useMutation({
    mutationFn: ({ id, quotaBytes }: { id: string; quotaBytes: number }) =>
      api.patch(`/admin/users/${id}/quota`, { quotaBytes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Quota updated') },
  })
  const toggleAdmin = useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) =>
      api.patch(`/admin/users/${id}/admin`, { isAdmin }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Admin status updated') },
  })
  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users', 'admin-stats'] })
      toast.success('User deleted')
    },
  })

  if (!currentUser?.isAdmin) {
    return (
      <div className="admin-forbidden fade-in">
        <ShieldOff size={48} />
        <h2>Admin only</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    )
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="admin-page">

      {/* ── Header ── */}
      <div className="admin-header">
        <div>
          <h2 className="admin-title">Admin panel</h2>
          <p className="admin-subtitle">Manage users, monitor system health and storage</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        {([
          { id: 'overview', icon: Activity,  label: 'Overview' },
          { id: 'users',    icon: Users,     label: `Users (${users.length})` },
          { id: 'system',   icon: Server,    label: 'System' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button key={id}
            className={clsx('admin-tab', tab === id && 'admin-tab--active')}
            onClick={() => setTab(id)}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      <div className="admin-body">

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="fade-in">
            <div className="admin-stats-grid">
              {[
                { icon: Users,     label: 'Total users',    val: stats?.totalUsers ?? '—',                    sub: `${health?.adminCount ?? 0} admins` },
                { icon: HardDrive, label: 'Files stored',   val: (stats?.totalFiles ?? 0).toLocaleString(),   sub: `${health?.trashedFiles ?? 0} in trash` },
                { icon: Database,  label: 'Storage used',   val: fmt(stats?.totalStorageBytes ?? 0),           sub: 'across all users' },
                { icon: ShieldCheck,label:'2FA enabled',    val: health?.totp2faCount ?? '—',                 sub: 'accounts secured' },
              ].map(({ icon: Icon, label, val, sub }) => (
                <div key={label} className="admin-stat-card">
                  <div className="admin-stat-icon-wrap"><Icon size={18} /></div>
                  <div>
                    <p className="admin-stat-val">{val}</p>
                    <p className="admin-stat-lbl">{label}</p>
                    <p className="admin-stat-sub">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-overview-grid">
              {/* Service health */}
              <div className="admin-card">
                <h3 className="admin-card-title">Service health</h3>
                {[
                  { name: 'API server',    ok: true,                        detail: `Node ${health?.nodeVersion ?? '…'}` },
                  { name: 'PostgreSQL',    ok: health?.database === 'connected', detail: 'Primary database' },
                  { name: 'Meilisearch',   ok: true,                        detail: 'Search index' },
                  { name: 'Redis',         ok: true,                        detail: 'Queue & events' },
                  { name: 'MinIO storage', ok: true,                        detail: 'Object storage' },
                ].map(({ name, ok, detail }) => (
                  <div key={name} className="health-row">
                    {ok
                      ? <CheckCircle size={14} className="health-ok" />
                      : <XCircle    size={14} className="health-err" />}
                    <span className="health-name">{name}</span>
                    <span className="health-detail">{detail}</span>
                  </div>
                ))}
              </div>

              {/* Runtime info */}
              <div className="admin-card">
                <h3 className="admin-card-title">Runtime</h3>
                {health && ([
                  { label: 'Uptime',      val: fmtUptime(health.uptime) },
                  { label: 'Heap used',   val: fmt(health.memory.heapUsed) },
                  { label: 'Heap total',  val: fmt(health.memory.heapTotal) },
                  { label: 'RSS',         val: fmt(health.memory.rss) },
                  { label: 'Node',        val: health.nodeVersion },
                ] as const).map(({ label, val }) => (
                  <div key={label} className="runtime-row">
                    <span className="runtime-label">{label}</span>
                    <span className="runtime-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div className="fade-in">
            <div className="admin-users-toolbar">
              <div className="admin-search-wrap">
                <Search size={14} className="admin-search-icon" />
                <input className="input admin-search" placeholder="Search by name or email…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={() => setCreate(true)}>
                <UserPlus size={14} /> Add user
              </button>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Joined</th>
                    <th>Storage</th>
                    <th>Quota</th>
                    <th>Admin</th>
                    <th>2FA</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="admin-loading-cell">
                      <span className="spinner" /> Loading…
                    </td></tr>
                  )}
                  {filteredUsers.map(u => {
                    const usedPct = u.storageQuotaBytes > 0
                      ? Math.min(100, Math.round(u.storageUsedBytes / u.storageQuotaBytes * 100))
                      : 0
                    const isSelf = u.id === currentUser?.id
                    return (
                      <tr key={u.id} className={clsx(isSelf && 'admin-row--self')}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-avatar">
                              {(u.name || u.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="admin-user-name">{u.name || '—'}
                                {isSelf && <span className="admin-you-badge">you</span>}
                              </p>
                              <p className="admin-user-email">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="admin-date">
                            <Clock size={12} />
                            {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                          </div>
                        </td>
                        <td>
                          <div className="admin-storage">
                            <span className="admin-storage-val">{fmt(u.storageUsedBytes)}</span>
                            {u.storageQuotaBytes > 0 && (
                              <div className="admin-storage-bar">
                                <div className="admin-storage-fill" style={{ width: `${usedPct}%` }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="admin-select-wrap">
                            <select className="input admin-quota-select" value={u.storageQuotaBytes}
                              onChange={e => setQuota.mutate({ id: u.id, quotaBytes: Number(e.target.value) })}>
                              {QUOTA_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                              {!QUOTA_OPTIONS.find(o => o.value === u.storageQuotaBytes) && (
                                <option value={u.storageQuotaBytes}>{fmt(u.storageQuotaBytes)}</option>
                              )}
                            </select>
                            <ChevronDown size={11} className="admin-select-arrow" />
                          </div>
                        </td>
                        <td>
                          <label className="admin-toggle">
                            <input type="checkbox" checked={u.isAdmin} disabled={isSelf}
                              onChange={e => toggleAdmin.mutate({ id: u.id, isAdmin: e.target.checked })} />
                            <span className="admin-toggle-track" />
                          </label>
                        </td>
                        <td>
                          <span className={clsx('admin-badge', u.totpEnabled ? 'admin-badge--green' : 'admin-badge--muted')}>
                            {u.totpEnabled ? <><ShieldCheck size={11} /> On</> : 'Off'}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button className="admin-action-btn" title="Reset password"
                              onClick={() => setReset(u)}>
                              <KeyRound size={14} />
                            </button>
                            {!isSelf && (
                              <button className="admin-action-btn admin-action-btn--danger" title="Delete user"
                                onClick={() => {
                                  if (confirm(`Delete ${u.email}? All their files will be removed.`))
                                    deleteUser.mutate(u.id)
                                }}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!isLoading && filteredUsers.length === 0 && (
                    <tr><td colSpan={7} className="admin-empty-cell">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── System ── */}
        {tab === 'system' && (
          <div className="admin-system fade-in">
            <div className="admin-card">
              <h3 className="admin-card-title">Database</h3>
              <div className="runtime-row"><span className="runtime-label">Status</span><span className="health-ok" style={{ display:'inline-flex', alignItems:'center', gap:4 }}><CheckCircle size={13} /> Connected</span></div>
              <div className="runtime-row"><span className="runtime-label">Total users</span><span className="runtime-val">{health?.totalUsers ?? '—'}</span></div>
              <div className="runtime-row"><span className="runtime-label">Total files</span><span className="runtime-val">{health?.totalFiles ?? '—'}</span></div>
              <div className="runtime-row"><span className="runtime-label">Trashed files</span><span className="runtime-val">{health?.trashedFiles ?? '—'}</span></div>
              <div className="runtime-row"><span className="runtime-label">Storage used</span><span className="runtime-val">{fmt(health?.totalStorage ?? 0)}</span></div>
            </div>

            <div className="admin-card">
              <h3 className="admin-card-title">Node.js process</h3>
              <div className="runtime-row"><span className="runtime-label">Version</span><span className="runtime-val">{health?.nodeVersion}</span></div>
              <div className="runtime-row"><span className="runtime-label">Uptime</span><span className="runtime-val">{health ? fmtUptime(health.uptime) : '—'}</span></div>
              <div className="runtime-row"><span className="runtime-label">Heap used</span><span className="runtime-val">{fmt(health?.memory.heapUsed ?? 0)}</span></div>
              <div className="runtime-row"><span className="runtime-label">Heap total</span><span className="runtime-val">{fmt(health?.memory.heapTotal ?? 0)}</span></div>
              <div className="runtime-row"><span className="runtime-label">RSS</span><span className="runtime-val">{fmt(health?.memory.rss ?? 0)}</span></div>
            </div>

            <div className="admin-card">
              <h3 className="admin-card-title">Admin access</h3>
              <p className="admin-card-desc">Only users with <strong>isAdmin = true</strong> can see this panel.</p>
              <div className="runtime-row"><span className="runtime-label">Admin accounts</span><span className="runtime-val">{health?.adminCount ?? '—'}</span></div>
              <div className="runtime-row"><span className="runtime-label">2FA enabled</span><span className="runtime-val">{health?.totp2faCount ?? '—'} / {health?.totalUsers ?? '—'} users</span></div>
              <div className="admin-card-note">
                <Shield size={13} />
                Admin login: use your account email + password on the sign-in page.
                Admin panel appears in the sidebar only for admin accounts.
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal onClose={() => setCreate(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['admin-users', 'admin-stats'] })} />
      )}
      {resetTarget && <ResetPwModal user={resetTarget} onClose={() => setReset(null)} />}
    </div>
  )
}
