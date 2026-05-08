import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Lock, FileText, Vault, AlertCircle } from 'lucide-react'
import { sharesApi } from '../api/files.api'
import './SharePage.css'

function fmt(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB'
  return b + ' B'
}

export function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo]         = useState<any>(null)
  const [password, setPassword] = useState('')
  const [needsPass, setNeedsPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { fetchInfo() }, [token])

  const fetchInfo = async (pw?: string) => {
    if (!token) return
    setLoading(true)
    setError('')
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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchInfo(password)
  }

  const handleDownload = async () => {
    if (!token) return
    setDownloading(true)
    try {
      const url = `/api/shares/${token}/download${password ? `?password=${encodeURIComponent(password)}` : ''}`
      const a = document.createElement('a')
      a.href = url
      a.download = info?.file?.name ?? 'download'
      a.click()
    } finally {
      setTimeout(() => setDownloading(false), 1500)
    }
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
            <p className="share-card-sub">This file is protected. Enter the password to access it.</p>
            <form onSubmit={handlePasswordSubmit} className="share-password-form">
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

        {!loading && info && (
          <div className="share-file-info">
            <div className="share-file-icon"><FileText size={40} /></div>
            <h2 className="share-card-title">{info.file?.name ?? 'Shared file'}</h2>
            <div className="share-file-meta">
              <span className="share-meta-pill">{info.file?.mimeType ?? 'Unknown type'}</span>
              <span className="share-meta-pill">{fmt(info.file?.sizeBytes ?? 0)}</span>
              {info.expiresAt && (
                <span className="share-meta-pill">
                  Expires {new Date(info.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {info.permission === 'download' ? (
              <button
                className="btn btn-primary share-download-btn"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading
                  ? <span className="spinner" style={{ width: 16, height: 16 }} />
                  : <Download size={16} />}
                {downloading ? 'Starting download…' : 'Download file'}
              </button>
            ) : (
              <p className="share-view-only">View only — download not permitted</p>
            )}
          </div>
        )}
      </div>

      <p className="share-page-footer">Shared securely via FileVault</p>
    </div>
  )
}
