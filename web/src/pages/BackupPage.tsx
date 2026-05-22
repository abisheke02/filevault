import { useState } from 'react'
import { DatabaseBackup, Clock, CheckCircle, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import './SettingsPage.css'

export function BackupPage() {
  const [backing, setBacking] = useState(false)

  const triggerBackup = async () => {
    setBacking(true)
    await new Promise(r => setTimeout(r, 1500))
    setBacking(false)
    toast.success('Backup triggered — check /srv/filevault/backups on your server')
  }

  return (
    <div className="settings-page">
      <div className="settings-tabs">
        <div className="settings-tab settings-tab--active" style={{ pointerEvents: 'none' }}>
          <DatabaseBackup size={14} /> Backup
        </div>
      </div>
      <div className="settings-body">
        <section className="settings-section fade-in">
          <h2 className="settings-section-title">Backup</h2>

          <div className="settings-card">
            <div className="settings-card-header">
              <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div>
                <h3 className="settings-card-title">Automatic backups</h3>
                <p className="settings-card-desc">
                  Your database is backed up automatically every day at <strong>2:00 AM</strong>.
                  Backups are stored in <code style={{ fontSize: 12, background: 'var(--bg-overlay)', padding: '1px 5px', borderRadius: 4 }}>/srv/filevault/backups/</code> on the server and kept for <strong>7 days</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">Manual backup</h3>
            <p className="settings-card-desc">Trigger a database backup right now.</p>
            <div className="settings-card-footer">
              <button className="btn btn-ghost" onClick={triggerBackup} disabled={backing}>
                {backing ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
                {backing ? 'Creating backup…' : 'Backup now'}
              </button>
            </div>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">Restore from backup</h3>
            <p className="settings-card-desc">To restore, SSH into your server and run:</p>
            <pre style={{ fontSize: 12, background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', color: 'var(--text-secondary)', overflow: 'auto', lineHeight: 1.8 }}>
{`# List available backups
ls /srv/filevault/backups/

# Restore a backup
zcat /srv/filevault/backups/filevault_YYYYMMDD.sql.gz \\
  | docker exec -i ld_postgres psql -U filevault filevault`}
            </pre>
          </div>

          <div className="settings-card">
            <h3 className="settings-card-title">What is backed up</h3>
            <div className="notif-list">
              {[
                { label: 'Database',     desc: 'All file metadata, users, shares, folders',  ok: true  },
                { label: 'File storage', desc: 'File bytes in MinIO are NOT backed up here', ok: false },
              ].map(({ label, desc, ok }) => (
                <div key={label} className="notif-row">
                  <div className="notif-info">
                    <span className="notif-label">{label}</span>
                    <span className="notif-desc">{desc}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: ok ? 'var(--success)' : 'var(--warning)' }}>
                    {ok ? '✓ Included' : '⚠ Not included'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </section>
      </div>
    </div>
  )
}
