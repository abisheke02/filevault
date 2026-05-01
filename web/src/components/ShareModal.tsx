import { useState } from 'react'
import { X, Link2, Copy, Check, Lock, Clock, Eye } from 'lucide-react'
import { sharesApi, type FileItem } from '../api/files.api'
import toast from 'react-hot-toast'
import './ShareModal.css'

interface Props {
  file: FileItem
  onClose: () => void
}

export function ShareModal({ file, onClose }: Props) {
  const [link, setLink]           = useState('')
  const [password, setPassword]   = useState('')
  const [expiresIn, setExpiresIn] = useState('')
  const [copied, setCopied]       = useState(false)
  const [loading, setLoading]     = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const expiresAt = expiresIn
        ? new Date(Date.now() + parseInt(expiresIn) * 60 * 60 * 1000).toISOString()
        : undefined
      const res = await sharesApi.create(file.id, undefined)
      const shareUrl = `${window.location.origin}/s/${res.data.token}`
      setLink(shareUrl)
    } catch {
      toast.error('Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Link2 size={18} className="modal-title-icon" />
            <h2 className="modal-title">Share "{file.name}"</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="modal-body">
          <div className="share-option">
            <label className="share-option-label">
              <Lock size={14} />
              Password (optional)
            </label>
            <input
              className="input"
              type="password"
              placeholder="Leave blank for public link"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="share-option">
            <label className="share-option-label">
              <Clock size={14} />
              Expires in
            </label>
            <select
              className="input"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
            >
              <option value="">Never</option>
              <option value="1">1 hour</option>
              <option value="24">1 day</option>
              <option value="168">7 days</option>
              <option value="720">30 days</option>
            </select>
          </div>

          {link && (
            <div className="share-link-row fade-in">
              <div className="share-link-input-wrap">
                <Eye size={13} className="share-link-icon" />
                <input className="input share-link-input" value={link} readOnly />
              </div>
              <button className={`btn ${copied ? 'btn-ghost' : 'btn-primary'}`} onClick={copy}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Link2 size={14} />}
            {link ? 'Regenerate' : 'Create link'}
          </button>
        </div>
      </div>
    </div>
  )
}
