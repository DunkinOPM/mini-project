import { useState } from 'react'
import { Tag, Clock, ChevronRight, Search } from 'lucide-react'
import { search as apiSearch } from '../utils/api'

export default function AnnotationPanel({ annotations = [], currentTime = 0, onSeek }) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const active = annotations.find(a => currentTime >= a.start && currentTime <= a.end)

  const doSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const { data } = await apiSearch(query)
      setSearchResults(data)
    } catch { }
    setSearching(false)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--ink-700)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Search concepts..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
          />
        </div>
        <button
          onClick={doSearch}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'rgba(200,241,53,0.12)', color: 'var(--acid)', border: '1px solid rgba(200,241,53,0.2)' }}
        >
          {searching ? '...' : 'Go'}
        </button>
      </div>

      {/* Search results */}
      {searchResults && (
        <div className="rounded-xl p-3" style={{ background: 'var(--ink-700)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>SEARCH RESULTS</p>
          {[...searchResults.slides, ...searchResults.transcript].slice(0, 4).map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-2 py-2 border-b cursor-pointer hover:bg-white/5 rounded px-1 transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              onClick={() => r.start !== undefined && onSeek && onSeek(r.start)}
            >
              <span className="tag" style={{ background: r.type === 'slide' ? 'rgba(78,205,196,0.12)' : 'rgba(200,241,53,0.1)', color: r.type === 'slide' ? 'var(--sky)' : 'var(--acid)', flexShrink: 0 }}>
                {r.type === 'slide' ? '📄' : '🎬'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {r.title || r.timestamp}
                </p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{r.text}</p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--acid)', fontFamily: 'JetBrains Mono' }}>
                {Math.round(r.score * 100)}%
              </span>
            </div>
          ))}
          {searchResults.total === 0 && (
            <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>No results found</p>
          )}
        </div>
      )}

      {/* Currently playing */}
      {active && (
        <div className="rounded-xl p-4 animate-fade-in" style={{ background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--acid)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--acid)' }}>NOW PLAYING</span>
            <span className="ml-auto text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{active.timestamp}</span>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{active.text}</p>
          <div className="flex flex-wrap gap-1.5">
            {active.concepts?.map((c, i) => (
              <span key={i} className="concept-badge">{c.concept}</span>
            ))}
          </div>
        </div>
      )}

      {/* All annotations */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2" style={{ maxHeight: 360 }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          ALL ANNOTATIONS ({annotations.length})
        </p>
        {annotations.length === 0 && (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
            <Tag size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Process content to see annotations</p>
          </div>
        )}
        {annotations.map((ann, i) => {
          const isCurrent = currentTime >= ann.start && currentTime <= ann.end
          return (
            <div
              key={i}
              className="rounded-xl p-3 cursor-pointer transition-all hover:bg-white/5"
              style={{
                background: isCurrent ? 'rgba(200,241,53,0.06)' : 'var(--ink-700)',
                border: `1px solid ${isCurrent ? 'rgba(200,241,53,0.2)' : 'rgba(255,255,255,0.05)'}`,
              }}
              onClick={() => onSeek && onSeek(ann.start)}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{ann.timestamp}</span>
                <span className="concept-badge ml-auto">{ann.primary_concept}</span>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{ann.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
