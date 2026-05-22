import { useState } from 'react'
import { Bell } from 'lucide-react'
import './SettingsPage.css'

const NOTIF_OPTIONS = [
  { key: 'upload',   label: 'Upload complete',    desc: 'When a file finishes uploading'           },
  { key: 'share',    label: 'Share link created', desc: 'When you generate a new share link'       },
  { key: 'delete',   label: 'File deleted',       desc: 'When a file is moved to trash'            },
  { key: 'storage',  label: 'Storage warning',    desc: 'When you reach 90% of your quota'         },
  { key: 'login',    label: 'New login',          desc: 'When your account is accessed'            },
  { key: 'version',  label: 'New file version',   desc: 'When a file is updated with a new version'},
]

export function NotificationsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_OPTIONS.map(o => [o.key, true]))
  )

  return (
    <div className="settings-page">
      <div className="settings-tabs">
        <div className="settings-tab settings-tab--active" style={{ pointerEvents: 'none' }}>
          <Bell size={14} /> Notifications
        </div>
      </div>
      <div className="settings-body">
        <section className="settings-section fade-in">
          <h2 className="settings-section-title">Notifications</h2>
          <div className="settings-card">
            <h3 className="settings-card-title">In-app notifications</h3>
            <p className="settings-card-desc">Control which events show a notification toast.</p>
            <div className="notif-list">
              {NOTIF_OPTIONS.map(({ key, label, desc }) => (
                <div key={key} className="notif-row">
                  <div className="notif-info">
                    <span className="notif-label">{label}</span>
                    <span className="notif-desc">{desc}</span>
                  </div>
                  <label className="notif-toggle">
                    <input type="checkbox" checked={prefs[key]}
                      onChange={e => setPrefs(p => ({ ...p, [key]: e.target.checked }))} />
                    <span className="notif-toggle-track" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
