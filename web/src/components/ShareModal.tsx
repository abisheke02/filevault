import { useState } from 'react'
import {
  X, Link2, Copy, Check, Lock, Clock,
  Download, Eye, Mail, Send, UserPlus, Globe, Folder,
} from 'lucide-react'
import { sharesApi } from '../api/files.api'
import type { FileItem, FolderItem } from '../api/files.api'
import toast from 'react-hot-toast'
import './ShareModal.css'

interface Props {
  item: FileItem | FolderItem
  type: 'file' | 'folder'
  onClose: () => void
}

type Tab = 'link' | 'email'

export function ShareModal({ item, type, onClose }: Props) {
  const isFolder = type === 'folder'
  const [tab, setTab]               = useState<Tab>('link')

  // Link sharing state
  const [link, setLink]             = useState('')
  const [password, setPassword]     = useState('')
  const [expiresIn, setExpiresIn]   = useState('168')
  const [permission, setPermission] = useState<'view' | 'download'>('download')
  const [copied, setCopied]         = useState(false)
  const [loading, setLoading]       = useState(false)

  // Email sharing state
  const [emails, setEmails]         = useState('')
  const [emailMsg, setEmailMsg]     = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const expiresAt = expiresIn
        ? new Date(Date.now() + parseInt(expiresIn) * 60 * 60 * 1000).toISOString()
        : undefined
      const res = await sharesApi.create({
        fileId:   isFolder ? undefined : item.id,
        folderId: isFolder ? item.id   : undefined,
        permission,
        password: password || undefined,
        expiresAt,
      })
      const generated = `${window.location.origin}/s/${res.data.token}`
      setLink(generated)
      toast.success('Share link created')
    } catch {
      toast.error('Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const sendViaEmail = async () => {
    const recipients = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean)
    if (!recipients.length) { toast.error('Enter at least one email address'); return }

    setEmailLoading(true)
    try {
      // Ensure we have a link
      let shareLink = link
      if (!shareLink) {
        const expiresAt = expiresIn
          ? new Date(Date.now() + parseInt(expiresIn) * 60 * 60 * 1000).toISOString()
          : undefined
        const res = await sharesApi.create({
          fileId:   isFolder ? undefined : item.id,
          folderId: isFolder ? item.id   : undefined,
          permission,
          password: password || undefined,
          expiresAt,
        })
        shareLink = `${window.location.origin}/s/${res.data.token}`
        setLink(shareLink)
      }

      const subject = encodeURIComponent(`"${item.name}" shared with you — FileVault`)
      const body = encodeURIComponent(
        [
          emailMsg ? emailMsg + '\n\n' : '',
          `${item.name} has been shared with you on FileVault.`,
          '',
          'Open file:',
          shareLink,
          '',
          password ? `Password: ${password}` : '',
        ].filter((l) => l !== undefined).join('\n').trim()
      )

      window.open(`mailto:${recipients.join(',')}?subject=${subject}&body=${body}`)
      toast.success('Email client opened')
      onClose()
    } catch {
      toast.error('Failed to create share link')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="share-modal fade-in" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            {isFolder
              ? <Folder size={16} className="modal-title-icon" />
              : <Link2 size={16} className="modal-title-icon" />}
            <h2 className="modal-title" title={item.name}>Share "{item.name}"</h2>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="share-tabs">
          <button
            className={`share-tab ${tab === 'link' ? 'share-tab--active' : ''}`}
            onClick={() => setTab('link')}
          >
            <Globe size={14} /> Link sharing
          </button>
          <button
            className={`share-tab ${tab === 'email' ? 'share-tab--active' : ''}`}
            onClick={() => setTab('email')}
          >
            <Mail size={14} /> Share via email
          </button>
        </div>

        {/* Link sharing tab */}
        {tab === 'link' && (
          <>
            <div className="modal-body">
              {/* Permission toggle */}
              <div className="share-option">
                <label className="share-option-label"><Eye size={13} /> Permission</label>
                <div className="share-perm-toggle">
                  <button
                    className={`share-perm-btn ${permission === 'view' ? 'active' : ''}`}
                    onClick={() => setPermission('view')}
                  >
                    <Eye size={13} /> View only
                  </button>
                  <button
                    className={`share-perm-btn ${permission === 'download' ? 'active' : ''}`}
                    onClick={() => setPermission('download')}
                  >
                    <Download size={13} /> Allow download
                  </button>
                </div>
              </div>

              {/* Expiry */}
              <div className="share-option">
                <label className="share-option-label"><Clock size={13} /> Expires in</label>
                <select className="input" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)}>
                  <option value="">Never</option>
                  <option value="1">1 hour</option>
                  <option value="24">24 hours</option>
                  <option value="168">7 days</option>
                  <option value="720">30 days</option>
                </select>
              </div>

              {/* Optional password */}
              <div className="share-option">
                <label className="share-option-label"><Lock size={13} /> Password protection (optional)</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Leave blank for open access"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Generated link */}
              {link && (
                <div className="share-link-box fade-in">
                  <div className="share-link-row">
                    <Link2 size={13} className="share-link-icon" />
                    <input className="input share-link-input" value={link} readOnly />
                    <button
                      className={`btn ${copied ? 'btn-ghost share-copied' : 'btn-primary'}`}
                      onClick={copy}
                      title="Copy link"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="share-link-hint">
                    Anyone with this link can {permission === 'view' ? 'view' : 'download'} this file
                    {expiresIn ? ` for ${expiresIn === '1' ? '1 hour' : expiresIn === '24' ? '24 hours' : expiresIn === '168' ? '7 days' : '30 days'}` : ''}.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={generate} disabled={loading}>
                {loading
                  ? <span className="spinner" style={{ width: 14, height: 14 }} />
                  : <Link2 size={14} />}
                {link ? 'Regenerate link' : 'Create share link'}
              </button>
            </div>
          </>
        )}

        {/* Email sharing tab */}
        {tab === 'email' && (
          <>
            <div className="modal-body">
              <div className="share-email-info">
                <UserPlus size={32} className="share-email-icon" />
                <p>Enter email addresses below. A share link will be created and your email client will open with the link pre-filled.</p>
              </div>

              <div className="share-option">
                <label className="share-option-label"><Mail size={13} /> Recipients</label>
                <input
                  className="input"
                  placeholder="name@example.com, another@example.com"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                />
                <p className="share-option-hint">Separate multiple addresses with commas or spaces</p>
              </div>

              <div className="share-option">
                <label className="share-option-label">Message (optional)</label>
                <textarea
                  className="input share-email-msg"
                  placeholder="Add a personal message…"
                  value={emailMsg}
                  onChange={(e) => setEmailMsg(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="share-option">
                <label className="share-option-label"><Eye size={13} /> Permission</label>
                <div className="share-perm-toggle">
                  <button
                    className={`share-perm-btn ${permission === 'view' ? 'active' : ''}`}
                    onClick={() => setPermission('view')}
                  >
                    <Eye size={13} /> View only
                  </button>
                  <button
                    className={`share-perm-btn ${permission === 'download' ? 'active' : ''}`}
                    onClick={() => setPermission('download')}
                  >
                    <Download size={13} /> Allow download
                  </button>
                </div>
              </div>

              {password && (
                <div className="share-option">
                  <label className="share-option-label"><Lock size={13} /> Password (will be included in email)</label>
                  <input
                    className="input"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={sendViaEmail} disabled={emailLoading || !emails.trim()}>
                {emailLoading
                  ? <span className="spinner" style={{ width: 14, height: 14 }} />
                  : <Send size={14} />}
                Send via email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
