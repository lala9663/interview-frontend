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

export const useUi = defineStore('ui', {
  state: () => ({
    theme: read('iv.theme', 'light'),
    recruitments: [],
    recruitmentId: Number(read('iv.recruitment', 0)) || null,
    toasts: [],
  }),
  getters: {
    recruitment: (s) => s.recruitments.find((r) => r.id === s.recruitmentId) || null,
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
      if (!this.recruitments.some((r) => r.id === this.recruitmentId)) this.recruitmentId = this.recruitments[0]?.id ?? null
    },
    selectRecruitment(id) {
      this.recruitmentId = id
      write('iv.recruitment', String(id))
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
