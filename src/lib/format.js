export function formatNumber(n) {
  return new Intl.NumberFormat('ru-RU', {
    notation: n >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(n ?? 0)
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ISO 8601 (PT12M34S) -> 12:34
export function formatDuration(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '')
  if (!m) return '0:00'
  const [h, min, s] = [m[1], m[2], m[3]].map((x) => Number(x || 0))
  const pad = (x) => String(x).padStart(2, '0')
  return h ? `${h}:${pad(min)}:${pad(s)}` : `${min}:${pad(s)}`
}
