// 계약의 엔드포인트를 기능별로 묶은 함수들. 경로 문자열은 이 파일에만 둔다.
// 엔드포인트를 더할 때: 계약 문서 → 여기 → src/mocks/server.js(같은 경로) 순서로 고친다.
import { http } from './http.js'

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
  template: () => http.blob('/uploads/template'),
  autoAssign: (recruitmentId) => http.post(`/recruitments/${recruitmentId}/assignments/auto`),
  addInterview: (candidateId, body) => http.post(`/candidates/${candidateId}/interviews`, body),
}

export const interviewApi = {
  list: (params) => http.get('/interviews', params),
  get: (id) => http.get(`/interviews/${id}`),
  briefing: (id) => http.get(`/interviews/${id}/briefing`),
  generateBriefing: (id) => http.post(`/interviews/${id}/briefing/generate`),
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

export const miscApi = {
  dashboard: (recruitmentId) => http.get('/dashboard/summary', { recruitmentId }),
  job: (jobId) => http.get(`/ai-jobs/${jobId}`),
  questionBank: (params) => http.get('/question-bank', params),
  addBankQuestion: (body) => http.post('/question-bank', body),
  removeBankQuestion: (id) => http.del(`/question-bank/${id}`),
}
