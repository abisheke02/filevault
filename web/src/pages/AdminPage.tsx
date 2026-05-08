import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, HardDrive, Shield, Trash2, ChevronDown } from 'lucide-react'
import { api } from '../api/client'
import { useAuthStore } from '../stores/auth.store'
import toast from 'react-hot-toast'
import './AdminPage.css'

interface AdminUser {
  id: string
  email: string
  name: string
  isAdmin: boolean
  totpEnabled: boolean
  storageUsedBytes: number
  storageQuotaBytes: number
  createdAt: string
}

interface AdminStats {
  totalUsers: number
  totalFiles: number
  totalStorageBytes: number
}

function fmt(b: number) {
  if (b >= 1e12) return (b / 1e12).toFixed(2) + ' TB'
  if (b >= 1e9)  return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6)  return (b / 1e6).toFixed(0) + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}

const QUOTA_OPTIONS = [
  { label: 'Unlimited', value: -1 },
  { label: '1 GB',  value: 1_000_000_000 },
  { label: '5 GB',  value: 5_000_000_000 },
  { label: '10 GB', value: 10_000_000_000 },
  { label: '50 GB', value: 50_000_000_000 },
  { label: '100 GB',value: 100_000_000_000 },
]

export function AdminPage() {
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  })

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  })

  const setQuota = useMutation({
    mutationFn: ({ id, quotaBytes }: { id: string; quotaBytes: number }) =>
      api.patch(`/admin/users/${id}/quota`, { quotaBytes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Quota updated') },
    onError: () => toast.error('Failed to update quota'),
  })

  const toggleAdmin = useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) =>
      api.patch(`/admin/users/${id}/admin`, { isAdmin }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Admin status updated') },
    onError: () => toast.error('Failed to update admin status'),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users', 'admin-stats'] }); toast.success('User deleted') },
    onError: () => toast.error('Failed to delete user'),
  })

  if (!currentUser?.isAdmin) {
    return (
      <div className="admin-forbidden">
        <Shield size={48} />
        <h2>Admin only</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <h2 className="admin-title">Admin panel</h2>

      {/* Stats */}
      {stats && (
        <div className="admin-stats">
          <div className="admin-stat-card">
            <Users size={20} className="admin-stat-icon" />
            <div>
              <p className="admin-stat-val">{stats.totalUsers}</p>
              <p className="admin-stat-lbl">Users</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <HardDrive size={20} className="admin-stat-icon" />
            <div>
              <p className="admin-stat-val">{stats.totalFiles.toLocaleString()}</p>
              <p className="admin-stat-lbl">Files</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <HardDrive size={20} className="admin-stat-icon" />
            <div>
              <p className="admin-stat-val">{fmt(stats.totalStorageBytes)}</p>
              <p className="admin-stat-lbl">Total storage used</p>
            </div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="admin-section">
        <h3 className="admin-section-title">Users</h3>
        {isLoading ? (
          <div className="admin-loading"><div className="spinner" /><span>Loading users…</span></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Storage</th>
                  <th>Quota</th>
                  <th>Admin</th>
                  <th>2FA</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={u.id === currentUser.id ? 'admin-row--self' : ''}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar">
                          {(u.name || u.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="admin-user-name">{u.name || '—'}</p>
                          <p className="admin-user-email">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-storage">
                        <span>{fmt(u.storageUsedBytes)}</span>
                        {u.storageQuotaBytes > 0 && (
                          <div className="admin-storage-bar">
                            <div
                              className="admin-storage-fill"
                              style={{ width: `${Math.min(100, Math.round(u.storageUsedBytes / u.storageQuotaBytes * 100))}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="admin-select-wrap">
                        <select
                          className="input admin-quota-select"
                          value={u.storageQuotaBytes}
                          onChange={(e) => setQuota.mutate({ id: u.id, quotaBytes: Number(e.target.value) })}
                        >
                          {QUOTA_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                          {!QUOTA_OPTIONS.find(o => o.value === u.storageQuotaBytes) && (
                            <option value={u.storageQuotaBytes}>{fmt(u.storageQuotaBytes)}</option>
                          )}
                        </select>
                        <ChevronDown size={12} className="admin-select-arrow" />
                      </div>
                    </td>
                    <td>
                      <label className="admin-toggle">
                        <input
                          type="checkbox"
                          checked={u.isAdmin}
                          disabled={u.id === currentUser.id}
                          onChange={(e) => toggleAdmin.mutate({ id: u.id, isAdmin: e.target.checked })}
                        />
                        <span className="admin-toggle-track" />
                      </label>
                    </td>
                    <td>
                      <span className={`badge ${u.totpEnabled ? 'badge-green' : ''}`} style={{ fontSize: 11 }}>
                        {u.totpEnabled ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td>
                      {u.id !== currentUser.id && (
                        <button
                          className="btn btn-ghost admin-del-btn"
                          onClick={() => {
                            if (confirm(`Delete ${u.email}? This cannot be undone.`)) {
                              deleteUser.mutate(u.id)
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
