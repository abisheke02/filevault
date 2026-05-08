import { useEffect, useState } from 'react'
import { X, Download, Clock, HardDrive } from 'lucide-react'
import { filesApi, type FileItem } from '../api/files.api'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import './VersionHistoryModal.css'

interface Version {
  id: string
  versionNumber: number
  sizeBytes: number
  createdAt: string
}

interface Props {
  file: FileItem
  onClose: () => void
}

function formatSize(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB'
  return b + ' B'
}

export function VersionHistoryModal({ file, onClose }: Props) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    filesApi.getVersions(file.id)
      .then((r) => setVersions(r.data))
      .catch(() => toast.error('Could not load versions'))
      .finally(() => setLoading(false))
  }, [file.id])

  const handleDownloadVersion = async (v: Version) => {
    try {
      const res = await filesApi.download(file.id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `v${v.versionNumber}_${file.name}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="vh-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vh-header">
          <div className="vh-title">
            <Clock size={16} />
            <span>Version history — {file.name}</span>
          </div>
          <button className="vh-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="vh-body">
          {loading && <div className="vh-loading"><div className="spinner" /><span>Loading…</span></div>}

          {!loading && versions.length === 0 && (
            <div className="vh-empty">
              <Clock size={32} className="vh-empty-icon" />
              <p>No previous versions. Uploading a file with the same name creates a new version.</p>
            </div>
          )}

          {!loading && versions.length > 0 && (
            <ul className="vh-list">
              {versions.map((v) => (
                <li key={v.id} className="vh-item">
                  <div className="vh-item-info">
                    <span className="vh-item-version">Version {v.versionNumber}</span>
                    <span className="vh-item-meta">
                      <HardDrive size={11} /> {formatSize(v.sizeBytes)}
                      &nbsp;·&nbsp;
                      {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost vh-item-btn"
                    title="Download this version"
                    onClick={() => handleDownloadVersion(v)}
                  >
                    <Download size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
