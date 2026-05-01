import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, AlertTriangle, Zap, Clock, TrendingUp, RefreshCw, ArrowLeft, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { getAnalytics } from '../utils/api'
import { difficultyColor } from '../utils/format'

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="rounded-2xl p-5" style={{ background: 'var(--ink-800)', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{label}</span>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
        <Icon size={15} style={{ color }} />
      </div>
    </div>
    <p className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>{value}</p>
    {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
  </div>
)

export default function DashboardPage() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getAnalytics()
      setAnalytics(data)
    } catch { }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const eng = analytics?.engagement || {}
  const difficult = analytics?.difficult_segments || []
  const topics = analytics?.topic_stats || []
  const insights = analytics?.insights || []

  // Bar chart data
  const barData = difficult.slice(0, 6).map(d => ({
    name: d.primary_concept?.slice(0, 12) || d.timestamp,
    score: d.confusion_score,
    timestamp: d.timestamp,
  }))

  // Radar data for engagement
  const radarData = [
    { subject: 'Engagement', A: eng.engagement_score || 0, fullMark: 100 },
    { subject: 'Watch %', A: eng.watch_percentage || 0, fullMark: 100 },
    { subject: 'Focus', A: Math.max(0, 100 - (eng.total_pauses || 0) * 5), fullMark: 100 },
    { subject: 'Replays', A: Math.min(100, (eng.total_replays || 0) * 10), fullMark: 100 },
    { subject: 'Completion', A: eng.watch_percentage || 0, fullMark: 100 },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--ink-700)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
          <p className="font-medium">{label}</p>
          <p style={{ color: 'var(--coral)' }}>Confusion: {payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/learn')} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} /> Learn
        </button>
        <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Learning Analytics</h1>
        <button onClick={load} className="ml-auto p-2 rounded-xl hover:bg-white/5 transition-colors" style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="ENGAGEMENT SCORE" value={`${eng.engagement_score || 0}`} icon={Zap} color="var(--acid)" sub="out of 100" />
            <StatCard label="DIFFICULT SEGMENTS" value={difficult.length} icon={AlertTriangle} color="var(--coral)" sub="need review" />
            <StatCard label="TOTAL REPLAYS" value={eng.total_replays || 0} icon={RefreshCw} color="var(--amber)" sub="replay events" />
            <StatCard label="AVG PLAYBACK" value={`${eng.avg_speed || 1}×`} icon={Activity} color="var(--sky)" sub="speed" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Confusion bar chart */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--ink-800)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>CONFUSION BY SEGMENT</p>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} barSize={24}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="score" fill="var(--coral)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                  <p className="text-sm">No confusion data yet — watch video and interact</p>
                </div>
              )}
            </div>

            {/* Radar engagement */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--ink-800)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>ENGAGEMENT OVERVIEW</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0,100]} tick={{ fill: 'var(--text-muted)', fontSize: 8 }} />
                  <Radar dataKey="A" stroke="var(--acid)" fill="var(--acid)" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Difficult segments table */}
          <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-3" style={{ background: 'var(--ink-800)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>DIFFICULT SEGMENTS</p>
            </div>
            {difficult.length === 0 ? (
              <div className="px-5 py-8 text-center" style={{ background: 'var(--ink-800)', color: 'var(--text-muted)' }}>
                <p className="text-sm">Watch the video and interact to generate confusion data</p>
              </div>
            ) : difficult.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 border-b"
                style={{ background: i % 2 === 0 ? 'var(--ink-800)' : 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <span className="text-xs font-mono w-12 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{d.timestamp}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{d.primary_concept}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{d.text?.slice(0, 80)}…</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-20 h-1.5 rounded-full" style={{ background: 'var(--ink-600)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, d.confusion_score * 10)}%`, background: difficultyColor(d.difficulty_level) }} />
                  </div>
                  <span className={`tag diff-${d.difficulty_level === 'very high' ? 'high' : d.difficulty_level}`}>{d.difficulty_level}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Topic stats */}
          {topics.length > 0 && (
            <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--ink-800)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold mb-4" style={{ color: 'var(--text-muted)' }}>TOPICS BY DIFFICULTY</p>
              <div className="flex flex-col gap-3">
                {topics.slice(0, 6).map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm w-32 flex-shrink-0 truncate" style={{ color: 'var(--text-primary)' }}>{t.concept}</span>
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--ink-600)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, t.avg_confusion * 15)}%`, background: t.avg_confusion > 4 ? 'var(--coral)' : t.avg_confusion > 2 ? 'var(--amber)' : 'var(--acid)' }}
                      />
                    </div>
                    <span className="text-xs font-mono w-8 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t.avg_confusion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI insights */}
          {insights.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'rgba(200,241,53,0.04)', border: '1px solid rgba(200,241,53,0.15)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--acid)' }}>✦ AI LEARNING INSIGHTS</p>
              <div className="flex flex-col gap-2">
                {insights.map((ins, i) => (
                  <p key={i} className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: 1.7 }}>{ins}</p>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
