import { defineStore } from 'pinia'
import { authApi } from '@/api/index.js'
import { tokens, setUnauthorizedHandler } from '@/api/http.js'

const USER_KEY = 'iv.user'
const readUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuth = defineStore('auth', {
  state: () => ({ user: readUser() }),
  getters: {
    isLoggedIn: (s) => !!s.user,
    isAdmin: (s) => s.user?.role === 'ADMIN',
  },
  actions: {
    async devLogin(employeeNo) {
      const res = await authApi.devLogin(employeeNo)
      tokens.set({ accessToken: res.accessToken, refreshToken: res.refreshToken })
      this.setUser(res.user)
    },
    setUser(user) {
      this.user = user
      try {
        if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user))
        else sessionStorage.removeItem(USER_KEY)
      } catch {
        /* 무시 */
      }
    },
    async logout() {
      try {
        await authApi.logout()
      } catch {
        /* 서버가 없어도 로그아웃은 된다 */
      }
      tokens.set(null)
      this.setUser(null)
    },
    /** 토큰이 만료돼 401이 오면 로그인 화면으로 보낸다 */
    bindRouter(router) {
      setUnauthorizedHandler(() => {
        tokens.set(null)
        this.setUser(null)
        router.replace({ name: 'login', query: { expired: '1' } })
      })
    },
  },
})
