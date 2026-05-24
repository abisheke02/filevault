import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/auth.store'
import {
  File, FileText, FileImage, FileVideo, FileAudio,
  FileArchive, FileCode, MoreVertical, Download,
  Pencil, Trash2, Share2, Folder, Eye, Star, Clock, FolderInput,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { filesApi } from '../api/files.api'
import type { FileItem, FolderItem } from '../api/files.api'
import { PreviewModal } from './PreviewModal'
import { VersionHistoryModal } from './VersionHistoryModal'
import { MoveModal } from './MoveModal'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import './FileCard.css'

function fileIconClass(mime: string): string {
  if (mime === 'application/pdf')                                    return 'icon-pdf'
  if (mime.startsWith('image/'))                                     return 'icon-image'
  if (mime.startsWith('video/'))                                     return 'icon-video'
  if (mime.startsWith('audio/'))                                     return 'icon-audio'
  if (mime.includes('wordprocessingml') || mime.includes('msword')) return 'icon-word'
  if (mime.includes('spreadsheetml')    || mime.includes('excel'))  return 'icon-excel'
  if (mime.includes('presentationml')   || mime.includes('ppt'))    return 'icon-ppt'
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return 'icon-archive'
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html')) return 'icon-code'
  if (mime.startsWith('text/'))                                      return 'icon-text'
  return 'icon-default'
}

function FileIcon({ mime, size = 32 }: { mime: string; size?: number }) {
  const cls = clsx('file-icon', fileIconClass(mime))
  if (mime.startsWith('image/'))   return <FileImage   size={size} className={cls} />
  if (mime.startsWith('video/'))   return <FileVideo   size={size} className={cls} />
  if (mime.startsWith('audio/'))   return <FileAudio   size={size} className={cls} />
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return <FileArchive size={size} className={cls} />
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html')) return <FileCode size={size} className={cls} />
  return <FileText size={size} className={cls} />
}

function fileTypeBadge(mime: string): string | null {
  if (mime === 'application/pdf')                                              return 'PDF'
  if (mime.startsWith('text/csv'))                                             return 'CSV'
  if (mime.startsWith('text/'))                                                return 'TXT'
  if (mime.includes('wordprocessingml') || mime.includes('msword'))           return 'DOC'
  if (mime.includes('presentationml') || mime.includes('powerpoint'))         return 'PPT'
  if (mime.includes('spreadsheetml') || mime.includes('excel'))               return 'XLS'
  if (mime.includes('zip'))   return 'ZIP'
  if (mime.includes('json'))  return 'JSON'
  if (mime.includes('html'))  return 'HTML'
  return null
}

const THUMBNAIL_TYPES = ['image/', 'video/', 'application/pdf']

function FileThumbnail({ file }: { file: FileItem }) {
  const canHaveThumbnail = THUMBNAIL_TYPES.some(t => file.mimeType.startsWith(t))
  const [thumbSrc, setThumbSrc] = useState<string | null>(null)
  const [tried, setTried]       = useState(false)

  useEffect(() => {
    if (!canHaveThumbnail) return
    let cancelled = false
    const token = useAuthStore.getState().token
    fetch(`/api/files/${file.id}/thumbnail`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => { if (r.status === 200) return r.blob(); throw new Error() })
      .then(blob => { if (!cancelled) setThumbSrc(URL.createObjectURL(blob)) })
      .catch(() => { if (!cancelled) setTried(true) })
    return () => { cancelled = true }
  }, [file.id, canHaveThumbnail])

  useEffect(() => {
    return () => { if (thumbSrc) URL.revokeObjectURL(thumbSrc) }
  }, [thumbSrc])

  if (thumbSrc) {
    return <img src={thumbSrc} alt={file.name} className="file-card-thumb" />
  }

  const badge = fileTypeBadge(file.mimeType)
  return (
    <>
      <FileIcon mime={file.mimeType} size={tried || !canHaveThumbnail ? 36 : 24} />
      {badge && <span className="file-type-badge">{badge}</span>}
    </>
  )
}

function formatSize(bytes: number) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(0) + ' KB'
  return bytes + ' B'
}

interface FileCardProps {
  file: FileItem
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onShare:  (file: FileItem) => void
  onStar:   (id: string) => void
  onMove:   (id: string, folderId: string | null) => void
  selected?: boolean
  onSelect?: (id: string, checked: boolean) => void
}

interface FolderCardProps {
  folder: FolderItem
  onClick: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onShare?: (folder: FolderItem) => void
  selected?: boolean
  onSelect?: (id: string, checked: boolean) => void
}

export function FileCard({ file, onDelete, onRename, onShare, onStar, onMove, selected, onSelect }: FileCardProps) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [ctxPos, setCtxPos]           = useState<{ x: number; y: number } | null>(null)
  const [renaming, setRenaming]       = useState(false)
  const [newName, setNewName]         = useState(file.name)
  const [previewing, setPreviewing]   = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showMove, setShowMove]       = useState(false)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setCtxPos({ x: e.clientX, y: e.clientY })
  }

  const handleRename = () => {
    if (newName.trim() && newName !== file.name) onRename(file.id, newName.trim())
    setRenaming(false)
    setMenuOpen(false)
  }

  const handleDownload = async () => {
    setMenuOpen(false)
    try {
      const res = await filesApi.download(file.id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = file.name; a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  return (
    <>
      <div
        className={clsx('file-card fade-in', selected && 'file-card--selected')}
        tabIndex={0}
        onDoubleClick={() => setPreviewing(true)}
        onContextMenu={handleContextMenu}
        title="Double-click to preview"
      >
        {onSelect && (
          <input
            type="checkbox"
            className="file-card-checkbox"
            checked={!!selected}
            onChange={(e) => { e.stopPropagation(); onSelect(file.id, e.target.checked) }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="file-card-preview">
          <FileThumbnail file={file} />
          {file.versions && file.versions > 1 && (
            <span className="file-card-versions">v{file.versions}</span>
          )}
          <button
            className={clsx('file-card-star', file.isStarred && 'file-card-star--active')}
            title={file.isStarred ? 'Unstar' : 'Star'}
            onClick={(e) => { e.stopPropagation(); onStar(file.id) }}
          >
            <Star size={12} />
          </button>
        </div>

        <div className="file-card-body">
          {renaming ? (
            <input
              className="input file-card-rename"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          ) : (
            <p className="file-card-name" title={file.name}>{file.name}</p>
          )}
          <p className="file-card-meta">
            {formatSize(file.sizeBytes ?? 0)} · {formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}
          </p>
        </div>

        <div className="file-card-menu-wrap">
          <button
            className="file-card-menu-btn"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
          >
            <MoreVertical size={15} />
          </button>

          {menuOpen && (
            <div className="file-card-dropdown" role="menu">
              <button onClick={() => { setPreviewing(true); setMenuOpen(false) }}><Eye size={13} /> Preview</button>
              <button onClick={handleDownload}><Download size={13} /> Download</button>
              <button onClick={() => { setRenaming(true); setMenuOpen(false) }}><Pencil size={13} /> Rename</button>
              <button onClick={() => { onShare(file); setMenuOpen(false) }}><Share2 size={13} /> Share</button>
              <button onClick={() => { onStar(file.id); setMenuOpen(false) }}>
                <Star size={13} /> {file.isStarred ? 'Unstar' : 'Star'}
              </button>
              <button onClick={() => { setShowMove(true); setMenuOpen(false) }}><FolderInput size={13} /> Move to…</button>
              <button onClick={() => { setShowHistory(true); setMenuOpen(false) }}><Clock size={13} /> Version history</button>
              <button className="danger" onClick={() => { onDelete(file.id); setMenuOpen(false) }}><Trash2 size={13} /> Delete</button>
            </div>
          )}
        </div>

        {menuOpen && <div className="file-card-backdrop" onClick={() => setMenuOpen(false)} />}
      </div>

      {previewing && <PreviewModal file={file} onClose={() => setPreviewing(false)} />}
      {showHistory && <VersionHistoryModal file={file} onClose={() => setShowHistory(false)} />}
      {showMove && (
        <MoveModal
          file={file}
          onMove={(folderId) => onMove(file.id, folderId)}
          onClose={() => setShowMove(false)}
        />
      )}

      {ctxPos && (
        <>
          <div className="file-card-backdrop" onClick={() => setCtxPos(null)} onContextMenu={(e) => { e.preventDefault(); setCtxPos(null) }} />
          <div
            className="ctx-menu-popup"
            style={{
              top: Math.min(ctxPos.y, window.innerHeight - 340),
              left: Math.min(ctxPos.x, window.innerWidth - 200),
            }}
            role="menu"
          >
            <button onClick={() => { setPreviewing(true); setCtxPos(null) }}><Eye size={13} /> Preview</button>
            <button onClick={() => { handleDownload(); setCtxPos(null) }}><Download size={13} /> Download</button>
            <button onClick={() => { setRenaming(true); setCtxPos(null) }}><Pencil size={13} /> Rename</button>
            <button onClick={() => { onShare(file); setCtxPos(null) }}><Share2 size={13} /> Share</button>
            <button onClick={() => { onStar(file.id); setCtxPos(null) }}>
              <Star size={13} /> {file.isStarred ? 'Unstar' : 'Star'}
            </button>
            <button onClick={() => { setShowMove(true); setCtxPos(null) }}><FolderInput size={13} /> Move to…</button>
            <button onClick={() => { setShowHistory(true); setCtxPos(null) }}><Clock size={13} /> Version history</button>
            <button className="danger" onClick={() => { onDelete(file.id); setCtxPos(null) }}><Trash2 size={13} /> Delete</button>
          </div>
        </>
      )}
    </>
  )
}

export function FolderCard({ folder, onClick, onDelete, onRename, onShare, selected, onSelect }: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName]   = useState(folder.name)

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) onRename(folder.id, newName.trim())
    setRenaming(false)
    setMenuOpen(false)
  }

  return (
    <div className={clsx('file-card folder-card fade-in', selected && 'file-card--selected')} tabIndex={0} onDoubleClick={onClick}>
      {onSelect && (
        <input
          type="checkbox"
          className="file-card-checkbox"
          checked={!!selected}
          onChange={(e) => { e.stopPropagation(); onSelect(folder.id, e.target.checked) }}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="file-card-preview folder-preview">
        <Folder size={36} className="icon-folder" />
        {folder.fileCount !== undefined && (
          <span className="file-card-versions">{folder.fileCount}</span>
        )}
      </div>

      <div className="file-card-body">
        {renaming ? (
          <input
            className="input file-card-rename"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
        ) : (
          <p className="file-card-name" title={folder.name}>{folder.name}</p>
        )}
        <p className="file-card-meta">
          {formatDistanceToNow(new Date(folder.updatedAt), { addSuffix: true })}
        </p>
      </div>

      <div className="file-card-menu-wrap">
        <button
          className="file-card-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
        >
          <MoreVertical size={15} />
        </button>
        {menuOpen && (
          <div className="file-card-dropdown">
            <button onClick={() => { onClick(); setMenuOpen(false) }}><Folder size={13} /> Open</button>
            <button onClick={() => { setRenaming(true); setMenuOpen(false) }}><Pencil size={13} /> Rename</button>
            {onShare && (
              <button onClick={() => { onShare(folder); setMenuOpen(false) }}><Share2 size={13} /> Share</button>
            )}
            <button className="danger" onClick={() => { onDelete(folder.id); setMenuOpen(false) }}><Trash2 size={13} /> Delete</button>
          </div>
        )}
      </div>
      {menuOpen && <div className="file-card-backdrop" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}
