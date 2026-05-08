import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { filesApi, type FileItem } from '../api/files.api'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import './TrashPage.css'

export function TrashPage() {
  const qc = useQueryClient()

  const { data: files = [], isLoading } = useQuery<FileItem[]>({
    queryKey: ['trash'],
    queryFn: () => filesApi.listTrashed().then((r) => r.data),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => filesApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash'] })
      qc.invalidateQueries({ queryKey: ['files'] })
      toast.success('File restored')
    },
    onError: () => toast.error('Restore failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash'] })
      toast.success('Permanently deleted')
    },
    onError: () => toast.error('Delete failed'),
  })

  return (
    <div className="trash-page">
      <div className="trash-header">
        <div className="trash-title-wrap">
          <Trash2 size={20} className="trash-title-icon" />
          <h2 className="trash-title">Trash</h2>
        </div>
        {files.length > 0 && (
          <p className="trash-hint">Files are permanently deleted after 30 days.</p>
        )}
      </div>

      {isLoading && (
        <div className="trash-loading">
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      )}

      {!isLoading && files.length === 0 && (
        <div className="trash-empty fade-in">
          <Trash2 size={48} className="trash-empty-icon" />
          <h3>Trash is empty</h3>
          <p>Deleted files will appear here for 30 days before being permanently removed.</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="trash-list">
          {files.map((file) => (
            <div key={file.id} className="trash-item fade-in">
              <div className="trash-item-info">
                <span className="trash-item-name">{file.name}</span>
                <span className="trash-item-meta">
                  Deleted {formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}
                </span>
              </div>
              <div className="trash-item-actions">
                <button
                  className="btn btn-ghost trash-btn"
                  onClick={() => restoreMutation.mutate(file.id)}
                  disabled={restoreMutation.isPending}
                  title="Restore"
                >
                  <RotateCcw size={14} />
                  Restore
                </button>
                <button
                  className="btn btn-danger trash-btn"
                  onClick={() => {
                    if (confirm(`Permanently delete "${file.name}"? This cannot be undone.`))
                      deleteMutation.mutate(file.id)
                  }}
                  disabled={deleteMutation.isPending}
                  title="Delete permanently"
                >
                  <AlertTriangle size={14} />
                  Delete forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
