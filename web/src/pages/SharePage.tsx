import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Download, Lock, FileText, Vault, AlertCircle,
  Folder, File, FileImage, FileVideo, FileAudio, FileArchive,
} from 'lucide-react'
import { sharesApi } from '../api/files.api'
import type { ShareInfo } from '../api/files.api'
import './SharePage.css'

function fmt(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB'
  return b + ' B'
}

function MimeIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <FileImage size={16} />
  if (mime.startsWith('video/')) return <FileVideo size={16} />
  if (mime.startsWith('audio/')) return <FileAudio size={16} />
  if (mime.includes('zip') || mime.includes('tar')) return <FileArchive size={16} />
  return <File size={16} />
}

export function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo]               = useState<ShareInfo | null>(null)
  const [password, setPassword]       = useState('')
  const [needsPass, setNeedsPass]     = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => { fetchInfo() }, [token])

  const fetchInfo = async (pw?: string) => {
    if (!token) return
    setLoading(true); setError('')
    try {
      const res = await sharesApi.info(token, pw)
      setInfo(res.data)
      setNeedsPass(false)
    } catch (e: any) {
      const status = e.response?.status
      if (status === 403) { setNeedsPass(true); if (pw) setError('Incorrect password') }
      else if (status === 410) setError('This share link has expired or reached its download limit.')
      else if (status === 404) setError('Share link not found or has been revoked.')
      else setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const triggerDownload = (fileId?: string) => {
    if (!token) return
    const key = fileId ?? 'single'
    setDownloading(key)
    const url = sharesApi.downloadUrl(token, password || undefined, fileId)
    const a = document.createElement('a')
    a.href = url; a.click()
    setTimeout(() => setDownloading(null), 1500)
  }

  return (
    <div className="share-page">
      <div className="share-page-brand">
        <div className="share-page-logo"><Vault size={22} /></div>
        <span>FileVault</span>
      </div>

      <div className="share-card fade-in">
        {loading && (
          <div className="share-state">
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <p>Loading…</p>
          </div>
        )}

        {!loading && error && (
          <div className="share-state share-state--error">
            <AlertCircle size={40} />
            <p>{error}</p>
          </div>
        )}

        {!loading && needsPass && !info && (
          <div className="share-password-gate">
            <Lock size={36} className="share-lock-icon" />
            <h2 className="share-card-title">Password required</h2>
            <p className="share-card-sub">
              This shared item is protected. Enter the password to access it.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); fetchInfo(password) }} className="share-password-form">
              <input
                className="input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {error && <p className="share-error">{error}</p>}
              <button className="btn btn-primary" type="submit">Unlock</button>
            </form>
          </div>
        )}

        {/* ── Single file share ─────────────────────────────── */}
        {!loading && info?.type === 'file' && info.file && (
          <div className="share-file-info">
            <div className="share-file-icon"><FileText size={40} /></div>
            <h2 className="share-card-title">{info.file.name}</h2>
            <div className="share-file-meta">
              <span className="share-meta-pill">{info.file.mimeType}</span>
              <span className="share-meta-pill">{fmt(info.file.sizeBytes)}</span>
              {info.expiresAt && (
                <span className="share-meta-pill">
                  Expires {new Date(info.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {info.permission === 'download' ? (
              <button
                className="btn btn-primary share-download-btn"
                onClick={() => triggerDownload()}
                disabled={downloading === 'single'}
              >
                {downloading === 'single'
                  ? <span className="spinner" style={{ width: 16, height: 16 }} />
                  : <Download size={16} />}
                {downloading === 'single' ? 'Starting…' : 'Download file'}
              </button>
            ) : (
              <p className="share-view-only">View only — download not permitted</p>
            )}
          </div>
        )}

        {/* ── Folder share ──────────────────────────────────── */}
        {!loading && info?.type === 'folder' && info.folder && (
          <div className="share-folder-info">
            <div className="share-file-icon" style={{ color: 'var(--accent-hover)' }}>
              <Folder size={40} />
            </div>
            <h2 className="share-card-title">{info.folder.name}</h2>
            <p className="share-folder-count">
              {info.folder.files.length} file{info.folder.files.length !== 1 ? 's' : ''}
              {info.expiresAt && ` · Expires ${new Date(info.expiresAt).toLocaleDateString()}`}
            </p>

            {info.folder.files.length === 0 ? (
              <p className="share-empty-folder">This folder is empty.</p>
            ) : (
              <ul className="share-file-list">
                {info.folder.files.map((f) => (
                  <li key={f.id} className="share-file-row">
                    <span className="share-file-row-icon"><MimeIcon mime={f.mimeType} /></span>
                    <span className="share-file-row-name" title={f.name}>{f.name}</span>
                    <span className="share-file-row-size">{fmt(f.sizeBytes)}</span>
                    {info.permission === 'download' && (
                      <button
                        className="btn btn-ghost share-file-row-btn"
                        onClick={() => triggerDownload(f.id)}
                        disabled={downloading === f.id}
                        title={`Download ${f.name}`}
                      >
                        {downloading === f.id
                          ? <span className="spinner" style={{ width: 12, height: 12 }} />
                          : <Download size={13} />}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="share-page-footer">Shared securely via FileVault</p>
    </div>
  )
}
