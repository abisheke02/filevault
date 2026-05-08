import { useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  FolderPlus, LayoutGrid, List, Upload,
  CloudUpload, ChevronRight, Home, Star,
  Trash2, Download, FolderInput, X, CheckSquare,
} from 'lucide-react'
import { useFiles } from '../hooks/useFiles'
import { FileCard, FolderCard } from '../components/FileCard'
import { ShareModal } from '../components/ShareModal'
import { MoveModal } from '../components/MoveModal'
import type { FileItem } from '../api/files.api'
import { filesApi } from '../api/files.api'
import toast from 'react-hot-toast'
import './DrivePage.css'

export function DrivePage() {
  const { id: folderId } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const location  = useLocation()
  const isStarred = location.pathname === '/drive/starred'

  const { files, folders, isLoading, upload, remove, rename, createFolder, removeFolder, renameFolder, toggleStar, move } =
    useFiles(folderId, isStarred)

  const [view, setView]           = useState<'grid' | 'list'>('grid')
  const [shareTarget, setShare]   = useState<FileItem | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName]   = useState('')
  const [dragging, setDragging]   = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMoveTarget, setBulkMoveTarget] = useState<FileItem | null>(null)

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  const allIds = [...folders.map(f => f.id), ...files.map(f => f.id)]
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    await Promise.all([
      ...files.filter(f => ids.includes(f.id)).map(f => filesApi.trash(f.id)),
      ...folders.filter(f => ids.includes(f.id)).map(f => import('../api/files.api').then(m => m.foldersApi.delete(f.id))),
    ])
    clearSelection()
    toast.success(`${ids.length} item${ids.length > 1 ? 's' : ''} deleted`)
    import('@tanstack/react-query').then(m => {}) // triggers via WebSocket invalidation
  }

  const handleBulkDownload = async () => {
    const selectedFiles = files.filter(f => selectedIds.has(f.id))
    for (const file of selectedFiles) {
      try {
        const res = await filesApi.download(file.id)
        const url = URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url; a.download = file.name; a.click()
        URL.revokeObjectURL(url)
      } catch { toast.error(`Failed to download ${file.name}`) }
    }
    if (selectedFiles.length === 0) toast.error('No files selected (folders cannot be downloaded)')
  }

  // Drag-and-drop upload
  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return
      for (const file of accepted) {
        const fd = new FormData()
        fd.append('file', file)
        await upload({ formData: fd, folderId }).catch(() => null)
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
          {isStarred ? (
            <span className="breadcrumb-item breadcrumb-item--current" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={14} style={{ color: '#facc15' }} /> Starred
            </span>
          ) : (
            <button className="breadcrumb-item" onClick={() => navigate('/drive')}>
              <Home size={14} />
              <span>My Drive</span>
            </button>
          )}
          {!isStarred && folderId && (
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

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="bulk-bar fade-in">
          <span className="bulk-bar-count">{selectedIds.size} selected</span>
          <div className="bulk-bar-actions">
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={handleBulkDownload}>
              <Download size={14} /> Download
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 13 }}
              onClick={() => setBulkMoveTarget(files.find(f => selectedIds.has(f.id)) ?? null)}>
              <FolderInput size={14} /> Move
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 13, color: 'var(--danger)' }}
              onClick={handleBulkDelete}>
              <Trash2 size={14} /> Delete
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={clearSelection}>
              <X size={14} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Select all row — show when there are items */}
      {!isLoading && !isEmpty && (
        <div className="drive-select-row">
          <label className="drive-select-label">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            {allSelected ? 'Deselect all' : `Select all (${allIds.length})`}
          </label>
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
              onClick={() => { if (selectedIds.size === 0) navigate(`/drive/folder/${folder.id}`) }}
              onDelete={(id) => removeFolder(id)}
              onRename={(id, name) => renameFolder({ id, name })}
              selected={selectedIds.has(folder.id)}
              onSelect={toggleSelect}
            />
          ))}
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={(id) => remove(id)}
              onRename={(id, name) => rename({ id, name })}
              onShare={(f) => setShare(f)}
              onStar={(id) => toggleStar(id)}
              onMove={(id, folderId) => move({ id, folderId })}
              selected={selectedIds.has(file.id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {shareTarget && <ShareModal file={shareTarget} onClose={() => setShare(null)} />}

      {bulkMoveTarget && (
        <MoveModal
          file={bulkMoveTarget}
          onMove={async (folderId) => {
            await Promise.all(
              files.filter(f => selectedIds.has(f.id)).map(f => filesApi.move(f.id, folderId))
            )
            clearSelection()
            toast.success('Moved')
          }}
          onClose={() => setBulkMoveTarget(null)}
        />
      )}
    </div>
  )
}
