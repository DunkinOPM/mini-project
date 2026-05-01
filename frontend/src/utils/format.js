export const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const scoreColor = (score) => {
  if (score >= 0.7) return '#c8f135'
  if (score >= 0.5) return '#ffd166'
  return '#ff6b6b'
}

export const difficultyColor = (level) => {
  const map = { 'very high': '#ff6b6b', high: '#ff9966', medium: '#ffd166', low: '#4ecdc4' }
  return map[level] || '#8888aa'
}

export const clamp = (val, min, max) => Math.min(Math.max(val, min), max)
