import { useEffect, useState } from 'react'
import { X, Folder, ChevronRight, Home, CornerUpLeft } from 'lucide-react'
import { foldersApi, type FileItem, type FolderItem } from '../api/files.api'
import toast from 'react-hot-toast'
import './MoveModal.css'

interface Props {
  file: FileItem
  onMove: (folderId: string | null) => void
  onClose: () => void
}

export function MoveModal({ file, onMove, onClose }: Props) {
  const [stack, setStack]           = useState<FolderItem[]>([])
  const [folders, setFolders]       = useState<FolderItem[]>([])
  const [loading, setLoading]       = useState(true)

  const currentParentId = stack.length > 0 ? stack[stack.length - 1].id : undefined

  useEffect(() => {
    setLoading(true)
    foldersApi.list(currentParentId)
      .then((r) => setFolders(r.data))
      .catch(() => toast.error('Could not load folders'))
      .finally(() => setLoading(false))
  }, [currentParentId])

  const navigateInto = (folder: FolderItem) => setStack((s) => [...s, folder])
  const navigateUp   = () => setStack((s) => s.slice(0, -1))

  const handleMove = (folderId: string | null) => {
    if (folderId === file.folderId) {
      toast.error('File is already in this location')
      return
    }
    onMove(folderId)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="move-modal" onClick={(e) => e.stopPropagation()}>
        <div className="move-header">
          <span className="move-title">Move "{file.name}"</span>
          <button className="vh-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Breadcrumb */}
        <div className="move-breadcrumb">
          <button className="move-bc-item" onClick={() => setStack([])}>
            <Home size={13} /> My Drive
          </button>
          {stack.map((f, i) => (
            <span key={f.id} className="move-bc-row">
              <ChevronRight size={11} className="move-bc-sep" />
              <button className="move-bc-item" onClick={() => setStack((s) => s.slice(0, i + 1))}>
                {f.name}
              </button>
            </span>
          ))}
        </div>

        <div className="move-body">
          {loading && <div className="move-loading"><div className="spinner" /><span>Loading…</span></div>}

          {!loading && (
            <>
              {stack.length > 0 && (
                <button className="move-folder-item move-folder-up" onClick={navigateUp}>
                  <CornerUpLeft size={15} />
                  <span>Back</span>
                </button>
              )}

              {folders.length === 0 && (
                <p className="move-empty">No folders here</p>
              )}

              {folders.map((f) => (
                <div key={f.id} className="move-folder-row">
                  <button
                    className="move-folder-item"
                    onDoubleClick={() => navigateInto(f)}
                    title="Double-click to open"
                  >
                    <Folder size={15} className="move-folder-icon" />
                    <span>{f.name}</span>
                  </button>
                  <button
                    className="move-folder-navigate"
                    onClick={() => navigateInto(f)}
                    title="Open folder"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="move-footer">
          <span className="move-dest-label">
            Move to: <strong>{stack.length > 0 ? stack[stack.length - 1].name : 'My Drive (root)'}</strong>
          </span>
          <div className="move-footer-btns">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => handleMove(currentParentId ?? null)}>
              Move here
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
