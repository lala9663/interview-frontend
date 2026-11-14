import { defineStore } from 'pinia'
import { recruitmentApi } from '@/api/index.js'

const read = (k, d) => {
  try {
    return localStorage.getItem(k) ?? d
  } catch {
    return d
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* 무시 */
  }
}
const readJson = (k, d) => {
  try {
    return JSON.parse(read(k, '')) || d
  } catch {
    return d
  }
}

export const useUi = defineStore('ui', {
  state: () => ({
    theme: read('iv.theme', 'light'),
    recruitments: [],
    // 위쪽 탭: 신입(NEW_GRAD) / 경력(EXPERIENCED). 모든 목록 화면이 이 값을 따른다.
    track: read('iv.track', 'NEW_GRAD'),
    // 트랙마다 마지막으로 보던 채용 { NEW_GRAD: 1, EXPERIENCED: 2 }
    recruitmentByTrack: readJson('iv.recruitmentByTrack', {}),
    toasts: [],
  }),
  getters: {
    tracks: (s) => ['NEW_GRAD', 'EXPERIENCED'].filter((t) => s.recruitments.some((r) => r.track === t)),
    trackRecruitments: (s) => s.recruitments.filter((r) => r.track === s.track),
    recruitment() {
      const list = this.trackRecruitments
      return list.find((r) => r.id === this.recruitmentByTrack[this.track]) || list[0] || null
    },
    recruitmentId() {
      return this.recruitment?.id ?? null
    },
  },
  actions: {
    applyTheme() {
      document.documentElement.classList.toggle('dark', this.theme === 'dark')
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      write('iv.theme', this.theme)
      this.applyTheme()
    },
    async loadRecruitments() {
      this.recruitments = (await recruitmentApi.list()).items
      if (this.tracks.length && !this.tracks.includes(this.track)) this.selectTrack(this.tracks[0])
    },
    selectTrack(track) {
      this.track = track
      write('iv.track', track)
    },
    selectRecruitment(id) {
      this.recruitmentByTrack = { ...this.recruitmentByTrack, [this.track]: id }
      write('iv.recruitmentByTrack', JSON.stringify(this.recruitmentByTrack))
    },
    toast(message, tone = 'neutral') {
      const id = Date.now() + Math.random()
      this.toasts.push({ id, message, tone })
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id)
      }, 3800)
    },
    /** API 오류를 사용자에게 보여 준다 */
    fail(error, fallback = '요청을 처리하지 못했습니다.') {
      this.toast(error?.message || fallback, 'bad')
    },
  },
})
