import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { filesApi } from '../api/files.api'
import type { FileItem } from '../api/files.api'
import { FileCard } from '../components/FileCard'
import { PreviewModal } from '../components/PreviewModal'
import { ShareModal } from '../components/ShareModal'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'
import toast from 'react-hot-toast'
import './DrivePage.css'

function groupByDate(files: FileItem[]) {
  const groups: { label: string; files: FileItem[] }[] = []
  const today: FileItem[] = [], yesterday: FileItem[] = [], week: FileItem[] = [], older: FileItem[] = []
  files.forEach(f => {
    const d = new Date(f.updatedAt)
    if (isToday(d))           today.push(f)
    else if (isYesterday(d))  yesterday.push(f)
    else if (isThisWeek(d))   week.push(f)
    else                      older.push(f)
  })
  if (today.length)     groups.push({ label: 'Today',          files: today })
  if (yesterday.length) groups.push({ label: 'Yesterday',      files: yesterday })
  if (week.length)      groups.push({ label: 'Earlier this week', files: week })
  if (older.length)     groups.push({ label: 'Older',          files: older })
  return groups
}

export function RecentPage() {
  const [preview,  setPreview]  = useState<FileItem | null>(null)
  const [shareTarget, setShare] = useState<FileItem | null>(null)

  const { data: files = [], isLoading, refetch } = useQuery<FileItem[]>({
    queryKey: ['files-recent'],
    queryFn: () => filesApi.listRecent().then(r => r.data),
  })

  const handleDelete = async (id: string) => {
    await filesApi.trash(id)
    toast.success('Moved to trash')
    refetch()
  }
  const handleRename = async (id: string, name: string) => {
    await filesApi.rename(id, name)
    refetch()
  }
  const handleStar = async (id: string) => {
    await filesApi.star(id)
    refetch()
  }
  const handleMove = async (id: string, folderId: string | null) => {
    await filesApi.move(id, folderId)
    refetch()
  }

  const groups = groupByDate(files)

  return (
    <div className="drive-page">
      <div className="drive-topbar">
        <div className="drive-breadcrumb">
          <Clock size={16} />
          <span className="drive-breadcrumb-current">Recent</span>
        </div>
      </div>

      <div className="drive-content" style={{ paddingTop: 8 }}>
        {isLoading && (
          <div className="drive-empty"><div className="spinner" /></div>
        )}
        {!isLoading && files.length === 0 && (
          <div className="drive-empty">
            <Clock size={40} style={{ opacity: 0.3 }} />
            <p>No recent files</p>
          </div>
        )}

        {groups.map(({ label, files: group }) => (
          <div key={label} style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, paddingLeft: 4 }}>
              {label}
            </p>
            <div className="drive-grid">
              {group.map(f => (
                <FileCard key={f.id} file={f}
                  onDelete={handleDelete} onRename={handleRename}
                  onShare={setShare} onStar={handleStar} onMove={handleMove}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {preview    && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
      {shareTarget && <ShareModal item={shareTarget} type="file" onClose={() => setShare(null)} />}
    </div>
  )
}
