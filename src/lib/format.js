const pad = (n) => String(n).padStart(2, '0')

/** "14:30" */
export function hm(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "11.13 (금)" */
export function md(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${'일월화수목금토'[d.getDay()]})`
}

export function mdhm(iso) {
  return iso ? `${md(iso)} ${hm(iso)}` : '-'
}

/** 밀리초 또는 초 → "03:07" / "1:03:07" */
export function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}

export function isToday(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

/** "방금", "3분 전", "2시간 전" */
export function ago(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return '방금'
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return md(iso)
}

export function initials(name) {
  return (name || '?').slice(0, 1)
}
