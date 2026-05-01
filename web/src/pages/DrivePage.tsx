import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  FolderPlus, LayoutGrid, List, Upload,
  CloudUpload, ChevronRight, Home,
} from 'lucide-react'
import { useFiles } from '../hooks/useFiles'
import { FileCard, FolderCard } from '../components/FileCard'
import { ShareModal } from '../components/ShareModal'
import type { FileItem } from '../api/files.api'
import { filesApi } from '../api/files.api'
import toast from 'react-hot-toast'
import './DrivePage.css'

export function DrivePage() {
  const { id: folderId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { files, folders, isLoading, upload, remove, rename, createFolder, removeFolder } =
    useFiles(folderId)

  const [view, setView]           = useState<'grid' | 'list'>('grid')
  const [shareTarget, setShare]   = useState<FileItem | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName]   = useState('')
  const [dragging, setDragging]   = useState(false)

  // Drag-and-drop upload
  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return
      for (const file of accepted) {
        const fd = new FormData()
        fd.append('file', file)
        if (folderId) fd.append('folderId', folderId)
        await upload({ formData: fd }).catch(() => null)
      }
    },
    [folderId, upload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragging(true),
    onDragLeave: () => setDragging(false),
    noClick: true,
    noKeyboard: true,
  })

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    createFolder({ name: newFolderName.trim(), parentId: folderId })
    setNewFolderName('')
    setCreatingFolder(false)
  }

  const handleDownload = async (file: FileItem) => {
    try {
      const res = await filesApi.download(file.id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a')
      a.href = url; a.download = file.name; a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  const isEmpty = !isLoading && folders.length === 0 && files.length === 0

  return (
    <div className="drive-page" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Drop overlay */}
      {isDragActive && (
        <div className="drive-drop-overlay fade-in">
          <CloudUpload size={56} />
          <p>Drop files to upload</p>
        </div>
      )}

      {/* Breadcrumb + actions */}
      <div className="drive-header">
        <div className="drive-breadcrumb">
          <button className="breadcrumb-item" onClick={() => navigate('/drive')}>
            <Home size={14} />
            <span>My Drive</span>
          </button>
          {folderId && (
            <>
              <ChevronRight size={13} className="breadcrumb-sep" />
              <span className="breadcrumb-item breadcrumb-item--current">
                {folders.find((f) => f.id === folderId)?.name ?? '…'}
              </span>
            </>
          )}
        </div>

        <div className="drive-actions">
          <button
            className="btn btn-ghost drive-action-btn"
            onClick={() => setCreatingFolder(true)}
          >
            <FolderPlus size={15} />
            New folder
          </button>

          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* New folder input */}
      {creatingFolder && (
        <div className="drive-new-folder fade-in">
          <input
            className="input"
            placeholder="Folder name"
            value={newFolderName}
            autoFocus
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder()
              if (e.key === 'Escape') setCreatingFolder(false)
            }}
          />
          <button className="btn btn-primary" onClick={handleCreateFolder}>Create</button>
          <button className="btn btn-ghost"   onClick={() => setCreatingFolder(false)}>Cancel</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="drive-loading">
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="drive-empty fade-in">
          <Upload size={48} className="drive-empty-icon" />
          <h3>Drop files here or click Upload</h3>
          <p>All your files live here. Drag them in or use the Upload button.</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isEmpty && (
        <div className={`drive-grid ${view === 'list' ? 'drive-list' : ''}`}>
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onClick={() => navigate(`/drive/folder/${folder.id}`)}
              onDelete={(id) => removeFolder(id)}
              onRename={(id, name) => rename({ id, name })}
            />
          ))}
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={(id) => remove(id)}
              onRename={(id, name) => rename({ id, name })}
              onShare={(f) => setShare(f)}
            />
          ))}
        </div>
      )}

      {/* Share modal */}
      {shareTarget && (
        <ShareModal file={shareTarget} onClose={() => setShare(null)} />
      )}
    </div>
  )
}
