// 모의 백엔드. src/api/http.js가 VITE_API_MODE=mock일 때 여기를 부른다.
// 경로와 응답 모양은 계약 문서와 같게 유지한다. 엔드포인트를 더하면 routes 배열에 한 줄을 더한다.
import { ApiError } from '@/api/http.js'
import * as D from './data.js'
import { adminRoutes } from './admin.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clone = (x) => JSON.parse(JSON.stringify(x))

// ---- 상태 (새로 고침하면 처음으로 돌아간다) ----
const db = {
  me: null,
  candidates: clone(D.candidates),
  interviews: clone(D.interviews),
  briefings: new Map(),
  questions: new Map(),
  utterances: new Map(),
  followUps: new Map(),
  evaluations: new Map(),
  reports: new Map(),
  uploads: [],
  jobs: new Map(),
  bank: clone(D.questionBank),
}
let seq = 90000
const nextId = () => ++seq

// 지금 로그인한 사람. 화면을 새로 읽으면 db.me가 사라지므로 브라우저에 남은 로그인 정보로 되찾는다.
function me() {
  if (db.me) return db.me
  try {
    const saved = JSON.parse(sessionStorage.getItem('iv.user') || 'null')
    db.me = D.users.find((u) => u.id === saved?.id) || null
  } catch {
    /* 저장소를 못 쓰는 환경 */
  }
  return db.me || D.users[0]
}
const cand = (id) => db.candidates.find((c) => c.id === Number(id))
const intv = (id) => {
  const it = db.interviews.find((i) => i.id === Number(id))
  if (!it) throw new ApiError(404, 'INTERVIEW_NOT_FOUND', '면접을 찾을 수 없습니다.')
  return it
}
const byRoom = (roomId) => {
  const it = db.interviews.find((i) => i.roomId === Number(roomId))
  if (!it) throw new ApiError(404, 'ROOM_NOT_FOUND', '면접 방을 찾을 수 없습니다.')
  return it
}
const userRef = (id, matchedBy = 'JD') => {
  const u = D.users.find((x) => x.id === id)
  return { id: u.id, name: u.name, matchedBy }
}

function interviewView(it) {
  const c = cand(it.candidateId)
  return {
    id: it.id,
    candidate: { id: c.id, name: c.name, applicantNo: c.applicantNo, jobTitle: c.jobTitle },
    track: c.track, type: it.type, seq: it.seq, mode: it.mode, status: it.status,
    scheduledAt: it.scheduledAt, durationMinutes: it.durationMinutes,
    interviewers: it.interviewerIds.map((id) => userRef(id)),
    roomId: it.roomId, roomStatus: it.roomStatus,
    briefingStatus: it.briefingStatus, reportStatus: it.reportStatus, reportBasis: it.reportBasis,
  }
}

function candidateRow(c) {
  const its = db.interviews.filter((i) => i.candidateId === c.id).sort((a, b) => a.seq - b.seq)
  const current = its.find((i) => i.status !== 'DONE' && i.status !== 'CANCELED') || its[its.length - 1]
  const ids = [...new Set(its.flatMap((i) => i.interviewerIds))]
  return {
    id: c.id, applicantNo: c.applicantNo, name: c.name, track: c.track, jobCode: c.jobCode, jobTitle: c.jobTitle,
    interviewers: ids.map((id) => ({ id, name: D.users.find((u) => u.id === id).name })),
    briefingStatus: current?.briefingStatus ?? null,
    currentStage: current ? { type: current.type, status: current.status } : null,
  }
}

function questionsOf(it) {
  if (!db.questions.has(it.id)) db.questions.set(it.id, D.questionsFor(cand(it.candidateId), it))
  return db.questions.get(it.id)
}
function utterancesOf(it) {
  if (!db.utterances.has(it.roomId)) db.utterances.set(it.roomId, it.roomStatus === 'ENDED' ? clone(D.sampleTranscript) : [])
  return db.utterances.get(it.roomId)
}

function startJob(type, interviewId, ms, done) {
  const job = { id: nextId(), type, status: 'RUNNING', interviewId, createdAt: new Date().toISOString(), startedAt: new Date().toISOString(), finishedAt: null, errorCode: null, errorMessage: null }
  db.jobs.set(job.id, job)
  setTimeout(() => {
    done()
    job.status = 'SUCCEEDED'
    job.finishedAt = new Date().toISOString()
  }, ms)
  return job
}

// 실시간 방(모의 소켓)이 쓰는 저장 함수
export const mockStore = {
  questions: (roomId) => questionsOf(byRoom(roomId)),
  saveUtterance(roomId, u) {
    const list = utterancesOf(byRoom(roomId))
    const i = list.findIndex((x) => x.seq === u.seq)
    if (i >= 0) list[i] = { ...list[i], ...u }
    else list.push(u)
  },
  saveFollowUps(roomId, basedOnSeq, items) {
    const list = db.followUps.get(Number(roomId)) || []
    items.forEach((f) => list.push({ id: f.id, basedOnSeq, text: f.text, rationale: f.rationale, used: false }))
    db.followUps.set(Number(roomId), list)
  },
  markAsked(questionId, atSeq) {
    for (const qs of db.questions.values()) {
      const q = qs.find((x) => x.id === questionId)
      if (q) Object.assign(q, { asked: true, askedAtSeq: atSeq })
    }
  },
}

function paged(all, params) {
  const size = Math.min(200, Number(params?.size) || 20)
  const page = Number(params?.page) || 0
  return { items: all.slice(page * size, (page + 1) * size), page, size, total: all.length }
}

// ---- 라우트 ----
const routes = [
  ['POST', '/auth/dev-login', (_, { body }) => {
    const user = D.users.find((u) => u.employeeNo === body.employeeNo)
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', '등록되지 않은 사번입니다.')
    db.me = user
    return { accessToken: `mock.${user.id}`, refreshToken: `mock-r.${user.id}`, expiresIn: 1800, user }
  }],
  ['POST', '/auth/logout', () => null],
  ['GET', '/me', () => me()],

  ['GET', '/recruitments', (_, { params }) => ({ items: D.recruitments.filter((r) => !params?.track || r.track === params.track) })],
  ['GET', '/recruitments/:id', ([id]) => {
    const r = D.recruitments.find((x) => x.id === Number(id))
    const cs = db.candidates.filter((c) => c.recruitmentId === r.id).map((c) => c.id)
    const its = db.interviews.filter((i) => cs.includes(i.candidateId))
    return { ...r, candidateCount: cs.length, interviewCount: its.length, doneCount: its.filter((i) => i.status === 'DONE').length }
  }],
  ['GET', '/recruitments/:id/jobs', ([id]) => ({ items: D.jobs.filter((j) => j.recruitmentId === Number(id)) })],

  ['GET', '/recruitments/:id/candidates', ([id], { params }) => {
    let rows = db.candidates.filter((c) => c.recruitmentId === Number(id))
    if (params?.jobCode) rows = rows.filter((c) => c.jobCode === params.jobCode)
    if (params?.q) rows = rows.filter((c) => (c.name + c.applicantNo).includes(params.q))
    let all = rows.map(candidateRow)
    if (params?.status) all = all.filter((c) => c.currentStage?.status === params.status)
    return paged(all, params)
  }],
  ['GET', '/candidates/:id', ([id]) => {
    const c = cand(id)
    if (!c) throw new ApiError(404, 'CANDIDATE_NOT_FOUND', '면접자를 찾을 수 없습니다.')
    return { ...c, interviews: db.interviews.filter((i) => i.candidateId === c.id).sort((a, b) => a.seq - b.seq).map(interviewView) }
  }],
  ['GET', '/candidates/:id/progress', ([id]) => ({
    items: db.interviews.filter((i) => i.candidateId === Number(id)).sort((a, b) => a.seq - b.seq).map(interviewView),
  })],
  ['POST', '/candidates/:id/interviews', ([id], { body }) => {
    const its = db.interviews.filter((i) => i.candidateId === Number(id))
    const it = { id: nextId(), candidateId: Number(id), type: body.type, seq: its.length + 1, mode: body.mode, status: body.scheduledAt ? 'SCHEDULED' : 'WAITING', scheduledAt: body.scheduledAt || null, durationMinutes: body.durationMinutes || 30, interviewerIds: [me().id], roomId: null, roomStatus: null, briefingStatus: null, reportStatus: null, reportBasis: null }
    db.interviews.push(it)
    return interviewView(it)
  }],

  ['POST', '/recruitments/:id/uploads', async ([id], { form }) => {
    await wait(900)
    const file = form?.get?.('file')
    const rid = Number(id)
    const job = D.jobs.find((j) => j.recruitmentId === rid)
    const names = ['차은호', '남궁지안', '설하린']
    names.forEach((name, i) => {
      const nid = nextId()
      const base = clone(D.candidates.find((c) => c.recruitmentId === rid) || D.candidates[0])
      db.candidates.push({ ...base, id: nid, name, applicantNo: `UP-${nid}`, recruitmentId: rid, jobCode: job.jobCode, jobTitle: job.title })
      db.interviews.push({ id: nextId(), candidateId: nid, type: 'PT', seq: 1, mode: 'OFFLINE', status: 'WAITING', scheduledAt: null, durationMinutes: 30, interviewerIds: [], roomId: null, roomStatus: null, briefingStatus: null, reportStatus: null, reportBasis: null, _n: i })
    })
    const batch = {
      id: nextId(), fileName: file?.name || 'upload.xlsx', uploadedAt: new Date().toISOString(), uploadedBy: me().name,
      totalRows: 5, successRows: 3, failedRows: 2,
      errors: [
        { rowNumber: 4, column: '지원직무코드', value: 'XX', message: '등록되지 않은 직무 코드입니다.' },
        { rowNumber: 6, column: '성명', value: '', message: '필수 항목이 비어 있습니다.' },
      ],
    }
    db.uploads.unshift(batch)
    return batch
  }],
  ['GET', '/recruitments/:id/uploads', () => ({ items: db.uploads.map((u) => ({ ...u, errors: [] })) })],
  ['GET', '/uploads/:id', ([id]) => db.uploads.find((u) => u.id === Number(id))],
  ['POST', '/recruitments/:id/assignments/auto', async ([id]) => {
    await wait(600)
    let assigned = 0
    db.interviews.forEach((it) => {
      const c = cand(it.candidateId)
      if (c.recruitmentId !== Number(id) || it.interviewerIds.length) return
      const pool = D.users.filter((u) => u.jobCodes.includes(c.jobCode))
      it.interviewerIds = pool.slice(0, 2).map((u) => u.id)
      it.briefingStatus = 'SUCCEEDED'
      assigned += 1
    })
    return { candidateCount: db.candidates.filter((c) => c.recruitmentId === Number(id)).length, createdInterviewCount: 0, assignedInterviewCount: assigned, unassignedInterviewCount: 0, briefingJobCount: assigned, unassigned: [] }
  }],

  ['GET', '/interviews', (_, { params }) => {
    let rows = db.interviews
    if (params?.mine === true || params?.mine === 'true') rows = rows.filter((i) => i.interviewerIds.includes(me().id))
    if (params?.status) rows = rows.filter((i) => i.status === params.status)
    if (params?.recruitmentId) rows = rows.filter((i) => cand(i.candidateId).recruitmentId === Number(params.recruitmentId))
    return paged(rows.map(interviewView), params)
  }],
  ['GET', '/interviews/:id', ([id]) => interviewView(intv(id))],
  ['GET', '/interviews/:id/briefing', ([id]) => {
    const it = intv(id)
    if (it.briefingStatus !== 'SUCCEEDED') return { status: it.briefingStatus, summary: null, excluded: [] }
    if (!db.briefings.has(it.id)) db.briefings.set(it.id, D.briefingFor(cand(it.candidateId), it))
    return db.briefings.get(it.id)
  }],
  ['POST', '/interviews/:id/briefing/generate', ([id]) => {
    const it = intv(id)
    it.briefingStatus = 'RUNNING'
    const job = startJob('BRIEFING', it.id, 2500, () => {
      it.briefingStatus = 'SUCCEEDED'
      db.briefings.set(it.id, { ...D.briefingFor(cand(it.candidateId), it), generatedAt: new Date().toISOString() })
    })
    return { jobId: job.id }
  }],
  ['GET', '/interviews/:id/questions', ([id]) => ({ items: questionsOf(intv(id)) })],
  ['POST', '/interviews/:id/questions', ([id], { body }) => {
    const qs = questionsOf(intv(id))
    const q = { id: nextId(), interviewId: Number(id), source: 'MANUAL', category: body.category || '직접 추가', text: body.text, intent: '', orderNo: qs.length + 1, asked: false, askedAtSeq: null, hidden: false, parentQuestionId: null }
    qs.push(q)
    return q
  }],
  ['PATCH', '/questions/:id', ([id], { body }) => {
    for (const qs of db.questions.values()) {
      const q = qs.find((x) => x.id === Number(id))
      if (q) return Object.assign(q, body)
    }
    throw new ApiError(404, 'QUESTION_NOT_FOUND', '질문을 찾을 수 없습니다.')
  }],

  ['POST', '/interviews/:id/room', ([id]) => {
    const it = intv(id)
    if (!it.roomId) Object.assign(it, { roomId: nextId(), roomStatus: 'CREATED' })
    return { id: it.roomId, interviewId: it.id, status: it.roomStatus }
  }],
  ['GET', '/rooms/:id', ([id]) => {
    const it = byRoom(id)
    return { id: it.roomId, interviewId: it.id, status: it.roomStatus, startedAt: it._startedAt || null, endedAt: it._endedAt || null }
  }],
  ['POST', '/rooms/:id/start', ([id]) => {
    const it = byRoom(id)
    Object.assign(it, { roomStatus: 'LIVE', status: 'IN_PROGRESS', _startedAt: it._startedAt || new Date().toISOString() })
    return { id: it.roomId, interviewId: it.id, status: 'LIVE', startedAt: it._startedAt }
  }],
  ['POST', '/rooms/:id/end', ([id]) => {
    const it = byRoom(id)
    Object.assign(it, { roomStatus: 'ENDED', status: 'EVALUATING', _endedAt: new Date().toISOString(), reportStatus: 'RUNNING', reportBasis: null })
    const c = cand(it.candidateId)
    // 초안(LIVE) → 잠시 뒤 보정본(REFINED). 실제 서버의 흐름을 짧게 흉내 낸다.
    startJob('REPORT', it.id, 4000, () => {
      db.reports.set(it.id, [{ ...D.reportFor(c, it, 'LIVE'), generatedAt: new Date().toISOString() }])
      Object.assign(it, { reportStatus: 'SUCCEEDED', reportBasis: 'LIVE' })
      setTimeout(() => {
        db.reports.get(it.id).push({ ...D.reportFor(c, it, 'REFINED'), generatedAt: new Date().toISOString() })
        it.reportBasis = 'REFINED'
      }, 12000)
    })
    return { id: it.roomId, interviewId: it.id, status: 'ENDED' }
  }],
  ['POST', '/rooms/:id/ticket', ([id]) => ({ ticket: 'mock-ticket', agentWsUrl: `mock://rooms/${id}`, expiresIn: 300 })],
  ['GET', '/rooms/:id/utterances', ([id], { params }) => ({
    items: utterancesOf(byRoom(id)).filter((u) => u.seq > Number(params?.afterSeq || 0)),
  })],
  ['GET', '/rooms/:id/follow-ups', ([id]) => ({ items: db.followUps.get(Number(id)) || [] })],
  ['POST', '/follow-ups/:id/use', ([id]) => {
    for (const [roomId, list] of db.followUps) {
      const f = list.find((x) => String(x.id) === String(id))
      if (!f) continue
      f.used = true
      const it = byRoom(roomId)
      const qs = questionsOf(it)
      const q = { id: nextId(), interviewId: it.id, source: 'FOLLOW_UP', category: '꼬리질문', text: f.text, intent: f.rationale, orderNo: qs.length + 1, asked: false, askedAtSeq: null, hidden: false, parentQuestionId: null }
      qs.push(q)
      return q
    }
    throw new ApiError(404, 'FOLLOW_UP_NOT_FOUND', '꼬리질문을 찾을 수 없습니다.')
  }],

  ['GET', '/interviews/:id/criteria', () => ({ items: D.criteria })],
  ['GET', '/interviews/:id/my-evaluation', ([id]) => db.evaluations.get(Number(id)) || { memo: '', scores: [], grade: null, submitted: false, updatedAt: null }],
  ['PUT', '/interviews/:id/my-evaluation', ([id], { body }) => {
    const v = { ...body, updatedAt: new Date().toISOString() }
    db.evaluations.set(Number(id), v)
    const it = intv(id)
    if (body.submitted && it.status === 'EVALUATING') it.status = 'DONE'
    return v
  }],
  ['GET', '/interviews/:id/ai-evaluation', ([id]) => (intv(id).roomStatus === 'ENDED' ? D.aiEvaluationFor() : { status: null, scores: [] })],
  ['GET', '/interviews/:id/report', ([id]) => {
    const it = intv(id)
    if (it.reportStatus === 'RUNNING') return { status: 'RUNNING', content: null }
    if (it.reportStatus !== 'SUCCEEDED') return { status: null, content: null }
    if (!db.reports.has(it.id)) db.reports.set(it.id, [D.reportFor(cand(it.candidateId), it, 'LIVE'), ...(it.reportBasis === 'REFINED' ? [D.reportFor(cand(it.candidateId), it, 'REFINED')] : [])])
    const list = db.reports.get(it.id)
    return list[list.length - 1]
  }],
  ['GET', '/interviews/:id/report/versions', ([id]) => ({
    items: (db.reports.get(Number(id)) || []).map((r) => ({ version: r.version, basis: r.basis, status: r.status, generatedAt: r.generatedAt })),
  })],
  ['POST', '/interviews/:id/report/regenerate', ([id]) => {
    const it = intv(id)
    it.reportStatus = 'RUNNING'
    const job = startJob('REPORT', it.id, 3000, () => { it.reportStatus = 'SUCCEEDED' })
    return { jobId: job.id }
  }],
  ['GET', '/interviews/:id/jobs', ([id]) => ({ items: [...db.jobs.values()].filter((j) => j.interviewId === Number(id)) })],
  ['GET', '/ai-jobs/:id', ([id]) => db.jobs.get(Number(id))],

  ['GET', '/dashboard/summary', (_, { params }) => {
    const admin = me().role === 'ADMIN'
    const rows = db.interviews
      .filter((i) => !params?.recruitmentId || cand(i.candidateId).recruitmentId === Number(params.recruitmentId))
      .filter((i) => admin || i.interviewerIds.includes(me().id))
      .map(interviewView)
    const today = new Date().toDateString()
    const todayInterviews = rows.filter((i) => i.scheduledAt && new Date(i.scheduledAt).toDateString() === today)
    const liveRooms = rows.filter((i) => i.status === 'IN_PROGRESS')
    const pendingEvaluations = rows.filter((i) => i.status === 'EVALUATING')
    const pendingReports = rows.filter((i) => i.reportStatus === 'RUNNING')
    return {
      date: new Date().toISOString().slice(0, 10),
      todayCount: todayInterviews.length, liveRoomCount: liveRooms.length,
      pendingEvaluationCount: pendingEvaluations.length, pendingReportCount: pendingReports.length,
      todayInterviews, liveRooms, pendingEvaluations, pendingReports,
    }
  }],
  ...adminRoutes({ db, cand, interviewView }),
  ['GET', '/question-bank', (_, { params }) => ({
    items: db.bank.filter((q) => (!params?.jobCode || q.jobCode === params.jobCode) && (!params?.q || q.text.includes(params.q))),
  })],
  ['POST', '/question-bank', (_, { body }) => {
    const q = { id: nextId(), ...body }
    db.bank.unshift(q)
    return q
  }],
  ['DELETE', '/question-bank/:id', ([id]) => {
    db.bank = db.bank.filter((q) => q.id !== Number(id))
    return null
  }],
]

const compiled = routes.map(([method, pattern, handler]) => ({
  method,
  re: new RegExp(`^${pattern.replace(/:[a-zA-Z]+/g, '([^/]+)')}$`),
  handler,
}))

export async function mockRequest(method, path, ctx = {}) {
  await wait(120)
  for (const r of compiled) {
    if (r.method !== method) continue
    const m = path.match(r.re)
    if (m) return clone((await r.handler(m.slice(1), ctx)) ?? null)
  }
  throw new ApiError(404, 'MOCK_ROUTE_MISSING', `모의 API에 없는 경로입니다: ${method} ${path}`)
}
