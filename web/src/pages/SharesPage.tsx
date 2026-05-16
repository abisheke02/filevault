import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2, Trash2, Clock, Download, Eye } from 'lucide-react'
import { sharesApi } from '../api/files.api'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { copyToClipboard } from '../utils/clipboard'
import './SharesPage.css'

export function SharesPage() {
  const qc = useQueryClient()

  const { data: shares = [], isLoading } = useQuery<any[]>({
    queryKey: ['shares'],
    queryFn: () => sharesApi.list().then((r) => r.data),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => sharesApi.revoke(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shares'] }); toast.success('Share revoked') },
    onError: () => toast.error('Failed to revoke share'),
  })

  const copyLink = async (token: string) => {
    await copyToClipboard(`${window.location.origin}/s/${token}`)
    toast.success('Link copied')
  }

  return (
    <div className="shares-page">
      <div className="shares-header">
        <div className="shares-title-wrap">
          <Link2 size={20} className="shares-title-icon" />
          <h2 className="shares-title">My Shares</h2>
        </div>
        <p className="shares-hint">{shares.length} active share link{shares.length !== 1 ? 's' : ''}</p>
      </div>

      {isLoading && (
        <div className="shares-loading"><div className="spinner" /><span>Loading…</span></div>
      )}

      {!isLoading && shares.length === 0 && (
        <div className="shares-empty fade-in">
          <Link2 size={48} className="shares-empty-icon" />
          <h3>No active shares</h3>
          <p>Share links you create will appear here. You can revoke them at any time.</p>
        </div>
      )}

      {shares.length > 0 && (
        <div className="shares-list">
          {shares.map((share) => (
            <div key={share.id} className="shares-item fade-in">
              <div className="shares-item-icon">
                {share.permission === 'view' ? <Eye size={16} /> : <Download size={16} />}
              </div>
              <div className="shares-item-info">
                <span className="shares-item-token">{`${window.location.origin}/s/${share.token}`}</span>
                <div className="shares-item-meta">
                  <span className="shares-meta-pill">{share.permission}</span>
                  {share.passwordHash && <span className="shares-meta-pill">🔒 Password</span>}
                  {share.expiresAt && (
                    <span className="shares-meta-pill">
                      <Clock size={11} /> Expires {formatDistanceToNow(new Date(share.expiresAt), { addSuffix: true })}
                    </span>
                  )}
                  <span className="shares-meta-pill">{share.downloadCount ?? 0} downloads</span>
                  <span className="shares-meta-muted">
                    Created {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="shares-item-actions">
                <button className="btn btn-ghost shares-btn" onClick={() => copyLink(share.token)}>
                  Copy link
                </button>
                <button
                  className="btn btn-danger shares-btn"
                  onClick={() => { if (confirm('Revoke this share link?')) revokeMutation.mutate(share.id) }}
                >
                  <Trash2 size={13} /> Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
