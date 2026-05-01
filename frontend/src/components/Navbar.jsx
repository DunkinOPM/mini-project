import { Link, useLocation } from 'react-router-dom'
import { Brain, Upload, PlayCircle, BarChart3 } from 'lucide-react'

const LINKS = [
  { to: '/', label: 'Upload', icon: Upload },
  { to: '/learn', label: 'Learn', icon: PlayCircle },
  { to: '/dashboard', label: 'Analytics', icon: BarChart3 },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="flex items-center justify-between px-8 py-4 border-b"
      style={{ background: 'rgba(10,10,15,0.95)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100 }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 no-underline">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--acid)' }}>
          <Brain size={20} color="#0a0a0f" strokeWidth={2.5} />
        </div>
        <span className="font-display text-xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Insight<span style={{ color: 'var(--acid)' }}>Ed</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-2">
        {LINKS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to
          return (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? 'rgba(200,241,53,0.12)' : 'transparent',
                color: active ? 'var(--acid)' : 'var(--text-muted)',
                border: active ? '1px solid rgba(200,241,53,0.25)' : '1px solid transparent',
                textDecoration: 'none',
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </div>

      {/* Status dot */}
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="w-2 h-2 rounded-full animate-pulse-slow" style={{ background: 'var(--acid)' }} />
        Local AI Active
      </div>
    </nav>
  )
}
