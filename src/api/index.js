// API 명세의 엔드포인트를 기능별로 묶은 함수들. 경로 문자열은 이 파일에만 둔다.
// 엔드포인트를 더할 때: API 명세 → 여기 → src/mocks/server.js(같은 경로) 순서로 고친다.
import { http } from './http.js'

/**
 * 페이지가 있는 목록을 끝까지 읽는다(백엔드의 한 페이지 상한은 200).
 * 예: fetchAll((p) => interviewApi.list({ recruitmentId, ...p }))
 */
export async function fetchAll(fn, { size = 200, max = 5000 } = {}) {
  const items = []
  for (let page = 0; items.length < max; page += 1) {
    const res = await fn({ page, size })
    items.push(...res.items)
    if (!res.items.length || items.length >= (res.total ?? items.length)) break
  }
  return items
}

export const authApi = {
  devLogin: (employeeNo) => http.post('/auth/dev-login', { employeeNo }),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/me'),
}

export const recruitmentApi = {
  list: (track) => http.get('/recruitments', { track }),
  get: (id) => http.get(`/recruitments/${id}`),
  jobs: (id) => http.get(`/recruitments/${id}/jobs`),
}

export const candidateApi = {
  list: (recruitmentId, params) => http.get(`/recruitments/${recruitmentId}/candidates`, params),
  get: (id) => http.get(`/candidates/${id}`),
  progress: (id) => http.get(`/candidates/${id}/progress`),
  upload(recruitmentId, file) {
    const form = new FormData()
    form.append('file', file)
    return http.upload(`/recruitments/${recruitmentId}/uploads`, form)
  },
  uploads: (recruitmentId) => http.get(`/recruitments/${recruitmentId}/uploads`),
  uploadDetail: (uploadId) => http.get(`/uploads/${uploadId}`),
  template: () => http.blob('/uploads/template'),
  autoAssign: (recruitmentId) => http.post(`/recruitments/${recruitmentId}/assignments/auto`),
  addInterview: (candidateId, body) => http.post(`/candidates/${candidateId}/interviews`, body),
}

export const interviewApi = {
  list: (params) => http.get('/interviews', params),
  get: (id) => http.get(`/interviews/${id}`),
  briefing: (id) => http.get(`/interviews/${id}/briefing`),
  // target: 'ALL'(요약과 질문 모두) | 'SUMMARY'(요약만) | 'QUESTIONS'(질문만). API 명세 2.6
  generateBriefing: (id, target = 'ALL') => http.post(`/interviews/${id}/briefing/generate`, { target }),
  questions: (id) => http.get(`/interviews/${id}/questions`),
  addQuestion: (id, body) => http.post(`/interviews/${id}/questions`, body),
  patchQuestion: (questionId, body) => http.patch(`/questions/${questionId}`, body),
  criteria: (id) => http.get(`/interviews/${id}/criteria`),
  myEvaluation: (id) => http.get(`/interviews/${id}/my-evaluation`),
  saveMyEvaluation: (id, body) => http.put(`/interviews/${id}/my-evaluation`, body),
  aiEvaluation: (id) => http.get(`/interviews/${id}/ai-evaluation`),
  report: (id) => http.get(`/interviews/${id}/report`),
  reportVersions: (id) => http.get(`/interviews/${id}/report/versions`),
  regenerateReport: (id) => http.post(`/interviews/${id}/report/regenerate`),
  jobs: (id) => http.get(`/interviews/${id}/jobs`),
  questionFeedback: (id) => http.get(`/interviews/${id}/question-feedback`),
  saveQuestionFeedback: (id, body) => http.put(`/interviews/${id}/question-feedback`, body), // { overall, votes[{ questionId, vote }] }
}

export const roomApi = {
  open: (interviewId) => http.post(`/interviews/${interviewId}/room`),
  get: (id) => http.get(`/rooms/${id}`),
  start: (id) => http.post(`/rooms/${id}/start`),
  end: (id) => http.post(`/rooms/${id}/end`),
  ticket: (id, audio) => http.post(`/rooms/${id}/ticket`, { audio }),
  utterances: (id, afterSeq) => http.get(`/rooms/${id}/utterances`, { afterSeq }),
  followUps: (id) => http.get(`/rooms/${id}/follow-ups`),
  useFollowUp: (followUpId) => http.post(`/follow-ups/${followUpId}/use`),
}

// 관리자 집계(API 명세 2.11). 모두 ADMIN 전용, 읽기 전용.
export const adminApi = {
  operations: (recruitmentId, date) => http.get('/admin/operations', { recruitmentId, date }),
  quality: (recruitmentId) => http.get('/admin/quality', { recruitmentId }),
  interviewerStats: (recruitmentId) => http.get('/admin/interviewer-stats', { recruitmentId }),
}

// 면접 페르소나(API 명세 2.12)
export const personaApi = {
  list: () => http.get('/personas'),
  update: (id, body) => http.patch(`/admin/personas/${id}`, body), // { recommended?, enabled?, name?, description?, … } ADMIN 전용
  create: (body) => http.post('/admin/personas', body), // { name, description, questionType, followUpType, fit, guard, tone } ADMIN 전용
  remove: (id) => http.del(`/admin/personas/${id}`), // 직접 만든 것만 지울 수 있다. ADMIN 전용
  choose: (interviewId, personaId) => http.put(`/interviews/${interviewId}/persona`, { personaId }),
}
// 시스템 상태(API 명세 2.13)
export const systemApi = {
  status: () => http.get('/system/status'),
}
// 화면 시안: API 명세에 아직 없다(명세 2.14). 모의 서버(mocks/server.js)만 답한다.
export const modelApi = {
  get: () => http.get('/admin/models'), // { models, tasks, history } ADMIN 전용
  assign: (taskKey, modelId) => http.put(`/admin/models/tasks/${taskKey}`, { modelId }),
}

export const miscApi = {
  dashboard: (recruitmentId) => http.get('/dashboard/summary', { recruitmentId }),
  job: (jobId) => http.get(`/ai-jobs/${jobId}`),
  questionBank: (params) => http.get('/question-bank', params),
  addBankQuestion: (body) => http.post('/question-bank', body),
  saveQuestionToBank: (questionId, body) => http.post(`/question-bank/from-question/${questionId}`, body),
  removeBankQuestion: (id) => http.del(`/question-bank/${id}`),
}
