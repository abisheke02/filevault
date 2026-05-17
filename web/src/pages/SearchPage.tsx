import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Sparkles, FileText, FileImage, FileVideo, FileAudio,
  File, FileArchive, Send, X, Loader2,
} from 'lucide-react'
import { searchApi } from '../api/files.api'
import type { SearchHit, FileTypeFilter, DateFilter } from '../api/files.api'
import { PreviewModal } from '../components/PreviewModal'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import './SearchPage.css'

function fmt(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB'
  return b + ' B'
}

function HitIcon({ mime }: { mime: string }) {
  const cls = 'search-hit-icon'
  if (mime.startsWith('image/'))   return <FileImage  size={20} className={clsx(cls, 'icon-image')} />
  if (mime.startsWith('video/'))   return <FileVideo  size={20} className={clsx(cls, 'icon-video')} />
  if (mime.startsWith('audio/'))   return <FileAudio  size={20} className={clsx(cls, 'icon-audio')} />
  if (mime.includes('pdf') || mime.startsWith('text/')) return <FileText size={20} className={clsx(cls, 'icon-text')} />
  if (mime.includes('zip'))        return <FileArchive size={20} className={clsx(cls, 'icon-archive')} />
  return <File size={20} className={clsx(cls, 'icon-default')} />
}

const TYPE_FILTERS: { label: string; value: FileTypeFilter; icon: React.ReactNode }[] = [
  { label: 'All',       value: 'all',      icon: <File size={13} />      },
  { label: 'Images',    value: 'image',    icon: <FileImage size={13} /> },
  { label: 'Videos',    value: 'video',    icon: <FileVideo size={13} /> },
  { label: 'Audio',     value: 'audio',    icon: <FileAudio size={13} /> },
  { label: 'PDFs',      value: 'pdf',      icon: <FileText size={13} />  },
  { label: 'Documents', value: 'document', icon: <FileText size={13} />  },
]

const DATE_FILTERS: { label: string; value: DateFilter }[] = [
  { label: 'Any time',   value: 'any'   },
  { label: 'Today',      value: 'today' },
  { label: 'This week',  value: 'week'  },
  { label: 'This month', value: 'month' },
]

interface ChatMsg { role: 'user' | 'ai'; text: string }

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const initialQ = params.get('q') ?? ''

  const [query,      setQuery]      = useState(initialQ)
  const [fileType,   setFileType]   = useState<FileTypeFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('any')
  const [hits,       setHits]       = useState<SearchHit[]>([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [aiMode,     setAiMode]     = useState(false)
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiExplain,  setAiExplain]  = useState('')
  const [chatInput,  setChatInput]  = useState('')
  const [chatLog,    setChatLog]    = useState<ChatMsg[]>([])
  const [preview,    setPreview]    = useState<SearchHit | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const runSearch = async (q: string, ft: FileTypeFilter, df: DateFilter) => {
    if (!q.trim()) { setHits([]); setTotal(0); return }
    setLoading(true)
    try {
      const res = await searchApi.search(q, { fileType: ft, dateFilter: df })
      setHits(res.data.hits ?? [])
      setTotal(res.data.estimatedTotalHits ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSearch(initialQ, fileType, dateFilter)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setParams({ q: query })
    runSearch(query, fileType, dateFilter)
    setAiExplain('')
  }

  const handleFilter = (ft: FileTypeFilter, df: DateFilter) => {
    setFileType(ft); setDateFilter(df)
    runSearch(query || (params.get('q') ?? ''), ft, df)
  }

  const handleAiSend = async () => {
    const q = chatInput.trim()
    if (!q || aiLoading) return
    setChatInput('')
    setChatLog(l => [...l, { role: 'user', text: q }])
    setAiLoading(true)
    try {
      const res = await searchApi.aiSearch(q)
      const { explanation, results, fileType: ft, dateFilter: df, keywords } = res.data
      setHits(results.hits ?? [])
      setTotal(results.estimatedTotalHits ?? 0)
      setQuery(keywords)
      setFileType(ft)
      setDateFilter(df)
      setAiExplain(explanation)
      setChatLog(l => [...l, { role: 'ai', text: explanation || `Found ${results.hits?.length ?? 0} results for "${keywords}"` }])
    } catch {
      setChatLog(l => [...l, { role: 'ai', text: 'Search failed. Try a simpler query.' }])
    } finally {
      setAiLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  const activeQ = query || (params.get('q') ?? '')

  return (
    <div className="search-page">

      {/* ── Header ── */}
      <div className="search-header">
        <form className="search-bar-wrap" onSubmit={handleSearch}>
          <Search size={16} className="search-bar-icon" />
          <input
            className="search-bar-input"
            placeholder="Search files by name or content…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button type="button" className="search-bar-clear" onClick={() => { setQuery(''); setHits([]); setTotal(0) }}>
              <X size={14} />
            </button>
          )}
          <button type="submit" className="btn btn-primary search-bar-btn">Search</button>
        </form>

        <button
          className={clsx('btn search-ai-toggle', aiMode ? 'btn-primary' : 'btn-ghost')}
          onClick={() => setAiMode(m => !m)}
          title="AI search — describe what you're looking for"
        >
          <Sparkles size={14} />
          AI Search
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="search-filters">
        <div className="search-filter-group">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              className={clsx('search-filter-pill', fileType === f.value && 'active')}
              onClick={() => handleFilter(f.value, dateFilter)}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
        <div className="search-filter-group">
          {DATE_FILTERS.map(f => (
            <button
              key={f.value}
              className={clsx('search-filter-pill', dateFilter === f.value && 'active')}
              onClick={() => handleFilter(fileType, f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="search-body">

        {/* ── Results ── */}
        <div className="search-results-wrap">
          {activeQ && !loading && (
            <p className="search-results-count">
              {aiExplain
                ? <><Sparkles size={13} style={{ display: 'inline', marginRight: 4 }} />{aiExplain}</>
                : <>{total} result{total !== 1 ? 's' : ''} for <strong>"{activeQ}"</strong></>}
            </p>
          )}

          {loading && (
            <div className="search-state">
              <Loader2 size={28} className="spin" />
              <p>Searching…</p>
            </div>
          )}

          {!loading && !activeQ && (
            <div className="search-state">
              <Search size={48} className="search-empty-icon" />
              <h3>Search your files</h3>
              <p>Find files by name, content (PDF, DOCX, text), type, or date.</p>
            </div>
          )}

          {!loading && activeQ && hits.length === 0 && (
            <div className="search-state">
              <Search size={48} className="search-empty-icon" />
              <h3>No results</h3>
              <p>Try different keywords or adjust the filters above.</p>
            </div>
          )}

          <div className="search-hits">
            {hits.map(hit => (
              <div key={hit.id} className="search-hit fade-in" onClick={() => setPreview(hit)}>
                <div className="search-hit-left">
                  <HitIcon mime={hit.mimeType} />
                </div>
                <div className="search-hit-body">
                  <p
                    className="search-hit-name"
                    dangerouslySetInnerHTML={{
                      __html: hit._formatted?.name ?? hit.name,
                    }}
                  />
                  <p className="search-hit-meta">
                    {hit.mimeType.split('/').pop()?.toUpperCase()} · {fmt(hit.sizeBytes ?? 0)} ·{' '}
                    {hit.createdAt
                      ? formatDistanceToNow(new Date(hit.createdAt), { addSuffix: true })
                      : ''}
                  </p>
                  {hit._formatted?.content && (
                    <p
                      className="search-hit-snippet"
                      dangerouslySetInnerHTML={{ __html: hit._formatted.content }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Chat Panel ── */}
        {aiMode && (
          <div className="search-ai-panel fade-in">
            <div className="search-ai-header">
              <Sparkles size={15} />
              <span>AI Search</span>
              <button className="search-ai-close" onClick={() => setAiMode(false)}><X size={14} /></button>
            </div>

            <div className="search-ai-log">
              {chatLog.length === 0 && (
                <div className="search-ai-welcome">
                  <Sparkles size={32} />
                  <p>Describe what you're looking for in natural language.</p>
                  <div className="search-ai-examples">
                    {[
                      'Find my resume',
                      'Show PDFs from last week',
                      'Images uploaded this month',
                      'Find the quarterly report',
                    ].map(ex => (
                      <button key={ex} className="search-ai-example"
                        onClick={() => { setChatInput(ex) }}>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatLog.map((msg, i) => (
                <div key={i} className={clsx('search-ai-msg', `search-ai-msg--${msg.role}`)}>
                  {msg.role === 'ai' && <Sparkles size={13} className="search-ai-msg-icon" />}
                  <span>{msg.text}</span>
                </div>
              ))}

              {aiLoading && (
                <div className="search-ai-msg search-ai-msg--ai">
                  <Loader2 size={13} className="spin search-ai-msg-icon" />
                  <span>Thinking…</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form className="search-ai-input-row" onSubmit={e => { e.preventDefault(); handleAiSend() }}>
              <input
                className="input search-ai-input"
                placeholder="e.g. Find my resume from last week"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary search-ai-send" disabled={aiLoading}>
                <Send size={13} />
              </button>
            </form>
          </div>
        )}
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
