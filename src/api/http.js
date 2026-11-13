// 백엔드 REST 호출의 한 곳. 화면은 이 파일을 직접 쓰지 않고 src/api/<기능>.js의 함수를 부른다.
// VITE_API_MODE=mock이면 네트워크 대신 src/mocks/server.js가 답한다.

const MODE = import.meta.env.VITE_API_MODE || 'mock'
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
const TOKEN_KEY = 'iv.tokens'

export const isMock = MODE === 'mock'

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message || code || `HTTP ${status}`)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const tokens = {
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null')
    } catch {
      return null
    }
  },
  set(t) {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t))
      else sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      /* 저장소를 못 쓰면 새로 고침 때 다시 로그인한다 */
    }
  },
}

let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

function query(params) {
  if (!params) return ''
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v)
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

let refreshing = null
async function refresh() {
  const t = tokens.get()
  if (!t?.refreshToken) return false
  refreshing ||= fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: t.refreshToken }),
  })
    .then(async (r) => {
      if (!r.ok) return false
      tokens.set({ ...t, ...(await r.json()) })
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function request(method, path, { params, body, form, retry = true } = {}) {
  if (isMock) {
    const { mockRequest } = await import('@/mocks/server.js')
    return mockRequest(method, path, { params, body, form })
  }
  const headers = {}
  const t = tokens.get()
  if (t?.accessToken) headers.Authorization = `Bearer ${t.accessToken}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${BASE}${path}${query(params)}`, {
      method,
      headers,
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', '서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.')
  }

  if (res.status === 401 && retry && path !== '/auth/refresh' && (await refresh())) {
    return request(method, path, { params, body, form, retry: false })
  }
  if (res.status === 401) onUnauthorized()
  if (res.status === 204) return null

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) throw new ApiError(res.status, data?.code, data?.message || '요청을 처리하지 못했습니다.', data?.details)
  return data
}

export const http = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body, params) => request('POST', path, { body: body ?? {}, params }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
  upload: (path, form) => request('POST', path, { form }),
  /** 파일 내려받기(샘플 엑셀). mock에서는 null */
  async blob(path) {
    if (isMock) return null
    const t = tokens.get()
    const res = await fetch(`${BASE}${path}`, { headers: t?.accessToken ? { Authorization: `Bearer ${t.accessToken}` } : {} })
    if (!res.ok) throw new ApiError(res.status, 'DOWNLOAD_FAILED', '파일을 받지 못했습니다.')
    return res.blob()
  },
}
