import { useState } from 'react'
import {
  File, FileText, FileImage, FileVideo, FileAudio,
  FileArchive, FileCode, MoreVertical, Download,
  Pencil, Trash2, Share2, Folder
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { FileItem, FolderItem } from '../api/files.api'
import clsx from 'clsx'
import './FileCard.css'

function FileIcon({ mime, size = 32 }: { mime: string; size?: number }) {
  const cls = 'file-icon'
  if (mime.startsWith('image/'))       return <FileImage  size={size} className={clsx(cls, 'icon-image')} />
  if (mime.startsWith('video/'))       return <FileVideo  size={size} className={clsx(cls, 'icon-video')} />
  if (mime.startsWith('audio/'))       return <FileAudio  size={size} className={clsx(cls, 'icon-audio')} />
  if (mime.includes('pdf') || mime.includes('text')) return <FileText size={size} className={clsx(cls, 'icon-text')} />
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return <FileArchive size={size} className={clsx(cls, 'icon-archive')} />
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html')) return <FileCode size={size} className={clsx(cls, 'icon-code')} />
  return <File size={size} className={clsx(cls, 'icon-default')} />
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
}

interface FolderCardProps {
  folder: FolderItem
  onClick: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}

export function FileCard({ file, onDelete, onRename, onShare }: FileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(file.name)

  const handleRename = () => {
    if (newName.trim() && newName !== file.name) onRename(file.id, newName.trim())
    setRenaming(false)
    setMenuOpen(false)
  }

  const handleDownload = async () => {
    const a = document.createElement('a')
    a.href = `/api/files/${file.id}/download`
    a.download = file.name
    a.click()
    setMenuOpen(false)
  }

  return (
    <div className="file-card fade-in" tabIndex={0}>
      <div className="file-card-preview">
        <FileIcon mime={file.mimeType} size={36} />
        {file.versions && file.versions > 1 && (
          <span className="file-card-versions">v{file.versions}</span>
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
          <p className="file-card-name" title={file.name}>{file.name}</p>
        )}
        <p className="file-card-meta">
          {formatSize(file.size)} · {formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}
        </p>
      </div>

      <div className="file-card-menu-wrap">
        <button
          className="file-card-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
          id={`file-menu-${file.id}`}
        >
          <MoreVertical size={15} />
        </button>

        {menuOpen && (
          <div className="file-card-dropdown" role="menu">
            <button onClick={handleDownload}><Download size={13} /> Download</button>
            <button onClick={() => { setRenaming(true); setMenuOpen(false) }}><Pencil size={13} /> Rename</button>
            <button onClick={() => { onShare(file); setMenuOpen(false) }}><Share2 size={13} /> Share</button>
            <button className="danger" onClick={() => { onDelete(file.id); setMenuOpen(false) }}><Trash2 size={13} /> Delete</button>
          </div>
        )}
      </div>

      {menuOpen && <div className="file-card-backdrop" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}

export function FolderCard({ folder, onClick, onDelete, onRename }: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(folder.name)

  const handleRename = () => {
    if (newName.trim() && newName !== folder.name) onRename(folder.id, newName.trim())
    setRenaming(false)
    setMenuOpen(false)
  }

  return (
    <div className="file-card folder-card fade-in" tabIndex={0} onDoubleClick={onClick}>
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
          id={`folder-menu-${folder.id}`}
        >
          <MoreVertical size={15} />
        </button>
        {menuOpen && (
          <div className="file-card-dropdown">
            <button onClick={onClick}><Folder size={13} /> Open</button>
            <button onClick={() => { setRenaming(true); setMenuOpen(false) }}><Pencil size={13} /> Rename</button>
            <button className="danger" onClick={() => { onDelete(folder.id); setMenuOpen(false) }}><Trash2 size={13} /> Delete</button>
          </div>
        )}
      </div>
      {menuOpen && <div className="file-card-backdrop" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}
