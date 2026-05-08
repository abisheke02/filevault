import { useState, useEffect } from 'react'
import { X, Download, FileText, File } from 'lucide-react'
import { useAuthStore } from '../stores/auth.store'
import type { FileItem } from '../api/files.api'
import { filesApi } from '../api/files.api'
import './PreviewModal.css'

interface Props {
  file: FileItem
  onClose: () => void
}

export function PreviewModal({ file, onClose }: Props) {
  const token = useAuthStore((s) => s.token)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isImage = file.mimeType.startsWith('image/')
  const isVideo = file.mimeType.startsWith('video/')
  const isAudio = file.mimeType.startsWith('audio/')
  const isPdf   = file.mimeType === 'application/pdf'
  const isText  = file.mimeType.startsWith('text/')
  const canPreview = isImage || isVideo || isAudio || isPdf || isText

  useEffect(() => {
    if (!canPreview) { setLoading(false); return }
    filesApi.download(file.id).then((res) => {
      const url = URL.createObjectURL(new Blob([res.data], { type: file.mimeType }))
      setBlobUrl(url)
    }).catch(() => {}).finally(() => setLoading(false))
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [file.id])

  const handleDownload = async () => {
    const res = await filesApi.download(file.id)
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url; a.download = file.name; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="preview-backdrop" onClick={onClose}>
      <div className="preview-modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <span className="preview-filename" title={file.name}>{file.name}</span>
          <div className="preview-header-actions">
            <button className="preview-icon-btn" onClick={handleDownload} title="Download">
              <Download size={16} />
            </button>
            <button className="preview-icon-btn preview-close" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="preview-body">
          {loading && (
            <div className="preview-state">
              <div className="spinner" style={{ width: 36, height: 36 }} />
              <p>Loading preview…</p>
            </div>
          )}

          {!loading && blobUrl && isImage && (
            <img src={blobUrl} alt={file.name} className="preview-image" />
          )}

          {!loading && blobUrl && isVideo && (
            <video src={blobUrl} controls className="preview-video" />
          )}

          {!loading && blobUrl && isAudio && (
            <div className="preview-audio-wrap">
              <FileText size={48} className="preview-audio-icon" />
              <p className="preview-audio-name">{file.name}</p>
              <audio src={blobUrl} controls className="preview-audio" />
            </div>
          )}

          {!loading && blobUrl && isPdf && (
            <iframe src={blobUrl} className="preview-pdf" title={file.name} />
          )}

          {!loading && blobUrl && isText && (
            <TextPreview blobUrl={blobUrl} />
          )}

          {!loading && !canPreview && (
            <div className="preview-state preview-no-preview">
              <File size={48} />
              <p>No preview available for this file type.</p>
              <button className="btn btn-primary" onClick={handleDownload}>
                <Download size={15} /> Download file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TextPreview({ blobUrl }: { blobUrl: string }) {
  const [text, setText] = useState('')
  useEffect(() => {
    fetch(blobUrl).then((r) => r.text()).then(setText)
  }, [blobUrl])
  return <pre className="preview-text">{text}</pre>
}
