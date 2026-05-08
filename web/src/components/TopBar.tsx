import { useState, useRef } from 'react'
import { Search, Upload, Bell, ChevronDown, X } from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import { searchApi } from '../api/files.api'
import { useFiles } from '../hooks/useFiles'
import { useNavigate, useMatch } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import toast from 'react-hot-toast'
import './TopBar.css'

export function TopBar() {
  const user   = useAuthStore((s) => s.user)
  const match  = useMatch('/drive/folder/:id')
  const folderId = match?.params.id
  const { upload } = useFiles(folderId)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const handleSearch = (v: string) => {
    setQuery(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!v.trim()) { setResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchApi.search(v)
        setResults(res.data.files)
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setUploadPct(0)
    try {
      for (const f of files) {
        const fd = new FormData()
        fd.append('file', f)
        await upload({ formData: fd, folderId, onProgress: setUploadPct })
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message
      if (err?.response?.status === 413) {
        toast.error('File too large — max 5 GB per file')
      } else if (msg) {
        toast.error(`Upload failed: ${msg}`)
      } else if (!navigator.onLine) {
        toast.error('Upload failed: no internet connection')
      } else {
        toast.error('Upload failed — storage may be unavailable. Try again shortly.')
      }
    } finally {
      setUploading(false)
      setUploadPct(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <header className="topbar">
      {/* Search */}
      <div className="topbar-search">
        <Search size={15} className="topbar-search-icon" />
        <input
          className="topbar-search-input"
          placeholder="Search files…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          id="global-search"
        />
        {query && (
          <button className="topbar-search-clear" onClick={() => { setQuery(''); setResults([]) }}>
            <X size={13} />
          </button>
        )}
        {(results.length > 0 || searching) && (
          <div className="topbar-search-dropdown">
            {searching && <div className="topbar-search-hint">Searching…</div>}
            {!searching && results.length === 0 && (
              <div className="topbar-search-hint">No results</div>
            )}
            {results.map((f) => (
              <button
                key={f.id}
                className="topbar-search-result"
                onClick={() => { setQuery(''); setResults([]) }}
              >
                <span className="topbar-search-result-name">{f.name}</span>
                <span className="topbar-search-result-type">{f.mimeType}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        {/* Upload progress */}
        {uploading && (
          <div className="topbar-upload-progress">
            <div className="progress-bar" style={{ width: 120 }}>
              <div className="progress-bar-fill" style={{ width: `${uploadPct}%` }} />
            </div>
            <span>{uploadPct}%</span>
          </div>
        )}

        {/* Upload button */}
        <button
          className="btn btn-primary topbar-upload-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          id="upload-btn"
        >
          <Upload size={15} />
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={handleFileChange}
          id="file-upload-input"
        />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button className="topbar-icon-btn" id="notifications-btn">
          <Bell size={17} />
        </button>

        {/* Avatar */}
        <button className="topbar-avatar-btn" onClick={() => navigate('/settings')} id="avatar-btn">
          <div className="topbar-avatar">{initials}</div>
          <span className="topbar-avatar-name">{user?.name?.split(' ')[0]}</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  )
}
