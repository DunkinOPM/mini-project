import { useState } from 'react'
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'

export default function SlideViewer({ slides = [], currentSlideId = 0, alignment = [], currentTime = 0 }) {
  const [manualIdx, setManualIdx] = useState(null)

  // Auto-follow video
  const autoSlide = alignment.find(a => currentTime >= a.start && currentTime <= a.end)
  const activeId = manualIdx !== null ? manualIdx : (autoSlide ? autoSlide.slide_id : currentSlideId)
  const slide = slides[activeId] || slides[0]
  const idx = activeId

  const prev = () => setManualIdx(Math.max(0, idx - 1))
  const next = () => setManualIdx(Math.min(slides.length - 1, idx + 1))

  // Highlight section matched to current video segment
  const highlightSection = autoSlide?.section || ''

  if (!slide) {
    return (
      <div className="rounded-2xl flex flex-col items-center justify-center py-16" style={{ background: 'var(--ink-800)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <Layers size={32} className="mb-3 opacity-20" />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload slides to see them here</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--ink-800)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <Layers size={14} style={{ color: 'var(--sky)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Slide Viewer</span>
          {autoSlide && (
            <span className="tag" style={{ background: 'rgba(78,205,196,0.1)', color: 'var(--sky)', border: '1px solid rgba(78,205,196,0.2)' }}>
              Auto-sync
            </span>
          )}
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {idx + 1} / {slides.length}
        </span>
      </div>

      {/* Slide content */}
      <div className="p-6">
        <div
          className="rounded-xl p-6 min-h-48"
          style={{ background: 'linear-gradient(135deg, var(--ink-700) 0%, rgba(37,37,53,0.8) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="font-display text-xl mb-4" style={{ color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {slide.title}
          </h3>

          <div className="flex flex-col gap-2">
            {(slide.bullets || []).map((bullet, i) => {
              const isHighlighted = highlightSection && bullet.toLowerCase().includes(highlightSection.toLowerCase().slice(0, 20))
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 rounded-lg transition-all"
                  style={{
                    background: isHighlighted ? 'rgba(200,241,53,0.08)' : 'transparent',
                    border: isHighlighted ? '1px solid rgba(200,241,53,0.2)' : '1px solid transparent',
                  }}
                >
                  <div className="mt-1.5 flex-shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: isHighlighted ? 'var(--acid)' : 'var(--text-muted)' }} />
                  <span className="text-sm" style={{ color: isHighlighted ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.6 }}>
                    {bullet}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Alignment score badge */}
          {autoSlide && autoSlide.slide_id === idx && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Match score:</span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--ink-600)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(autoSlide.score * 100)}%`, background: 'var(--acid)' }}
                />
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--acid)' }}>
                {Math.round(autoSlide.score * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 pb-4">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
          style={{ background: 'var(--ink-700)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <ChevronLeft size={14} /> Prev
        </button>

        {/* Thumbnail strip */}
        <div className="flex gap-1.5 overflow-x-auto" style={{ maxWidth: 200 }}>
          {slides.slice(Math.max(0, idx - 2), idx + 3).map((s, i) => {
            const realIdx = Math.max(0, idx - 2) + i
            return (
              <button
                key={realIdx}
                onClick={() => setManualIdx(realIdx)}
                className="flex-shrink-0 w-8 h-6 rounded text-xs transition-all"
                style={{
                  background: realIdx === idx ? 'rgba(200,241,53,0.15)' : 'var(--ink-700)',
                  border: realIdx === idx ? '1px solid rgba(200,241,53,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  color: realIdx === idx ? 'var(--acid)' : 'var(--text-muted)',
                }}
              >
                {realIdx + 1}
              </button>
            )
          })}
        </div>

        <button
          onClick={next}
          disabled={idx >= slides.length - 1}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
          style={{ background: 'var(--ink-700)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
