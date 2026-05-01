import { Cpu, CheckCircle2, Loader2 } from 'lucide-react'

const STEPS = [
  { key: 'queued',     label: 'Initializing pipeline',      pct: 5  },
  { key: 'audio',      label: 'Extracting audio',            pct: 15 },
  { key: 'whisper',    label: 'Transcribing with Whisper',   pct: 35 },
  { key: 'slides',     label: 'Parsing slides/document',     pct: 55 },
  { key: 'embeddings', label: 'Generating embeddings',       pct: 70 },
  { key: 'annotating', label: 'Annotating concepts',         pct: 82 },
  { key: 'aligning',   label: 'Aligning video to slides',    pct: 92 },
  { key: 'done',       label: 'Complete!',                   pct: 100 },
]

export default function ProcessingScreen({ progress, status }) {
  const currentStep = STEPS.findIndex(s => progress < s.pct)
  const activeIdx = currentStep === -1 ? STEPS.length - 1 : Math.max(currentStep - 1, 0)

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      {/* Spinning brain icon */}
      <div className="relative mb-10">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: 'rgba(200,241,53,0.08)', border: '2px solid rgba(200,241,53,0.2)' }}
        >
          <Cpu size={40} style={{ color: 'var(--acid)' }} className="animate-pulse-slow" />
        </div>
        {/* orbit ring */}
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            border: '2px solid transparent',
            borderTopColor: 'var(--acid)',
            animation: 'spin 2s linear infinite',
          }}
        />
      </div>

      <h2 className="font-display text-3xl mb-2" style={{ color: 'var(--text-primary)' }}>
        Processing Content
      </h2>
      <p className="mb-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        Running local AI pipeline — this may take a few minutes
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          <span>Progress</span>
          <span style={{ color: 'var(--acid)', fontFamily: 'JetBrains Mono' }}>{progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step list */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {STEPS.map((step, i) => {
          const done = progress >= step.pct
          const active = i === activeIdx && status !== 'done'
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                {done
                  ? <CheckCircle2 size={18} style={{ color: 'var(--acid)' }} />
                  : active
                  ? <Loader2 size={18} style={{ color: 'var(--sky)' }} className="animate-spin" />
                  : <div className="w-3 h-3 rounded-full" style={{ background: 'var(--ink-600)' }} />
                }
              </div>
              <span
                className="text-sm"
                style={{ color: done ? 'var(--text-primary)' : active ? 'var(--sky)' : 'var(--text-muted)' }}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
