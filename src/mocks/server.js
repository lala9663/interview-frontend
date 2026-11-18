// 모의 백엔드. src/api/http.js가 VITE_API_MODE=mock일 때 여기를 부른다.
// 경로와 응답 모양은 API 명세와 같게 유지한다. 엔드포인트를 더하면 routes 배열에 한 줄을 더한다.
import { ApiError } from '@/api/http.js'
import * as D from './data.js'
import { adminRoutes } from './admin.js'
import { has } from '@/lib/features.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
// 신입(대면) 면접은 실시간 기능을 쓰지 않는다(백엔드의 app.live.new-grad-enabled=false 와 같은 동작). 4주 차 목업부터.
// 풀어서 보려면 VITE_NEW_GRAD_LIVE=on 으로 빌드한다.
const liveLocked = (track) => has('feedback1118') && track === 'NEW_GRAD' && import.meta.env.VITE_NEW_GRAD_LIVE !== 'on'
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
  personas: clone(D.personas),
  questionFeedback: new Map(), // '면접 id:사용자 id' → 의견
  aiModels: { tasks: clone(D.aiModelTasks), history: [] }, // 화면 시안: 작업별 모델과 바꾼 기록
}
let seq = 90000
const nextId = () => ++seq

// 지금 로그인한 사람. 화면을 새로 읽으면 db.me가 사라지므로 브라우저에 남은 로그인 정보로 되찾는다.
/** 관리자가 아니면 403(백엔드의 ADMIN 전용 경로와 같게) */
function adminOnly() {
  if (me().role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', '관리자만 할 수 있습니다.')
}

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
    candidate: { id: c.id, name: c.name, applicantNo: c.applicantNo, jobTitle: c.jobTitle, ...(has('feedback1118') ? { applicantType: c.applicantType } : {}) },
    track: c.track, type: it.type, seq: it.seq, mode: it.mode, status: it.status,
    scheduledAt: it.scheduledAt, durationMinutes: it.durationMinutes,
    liveEnabled: !liveLocked(c.track),
    ...(has('persona') ? { persona: !personaOf(it) ? null : (({ id, name, tone, questionType, followUpType }) => ({ id, name, tone, questionType, followUpType }))(personaOf(it)) } : {}),
    interviewers: it.interviewerIds.map((id) => userRef(id)),
    roomId: it.roomId, roomStatus: it.roomStatus,
    // 신입은 실시간 녹음을 잠가 두어 대화 기록이 없고, 그래서 보고서도 없다
    briefingStatus: it.briefingStatus, reportStatus: liveLocked(c.track) ? null : it.reportStatus,
    // 보정본은 주차별 목업에서 그 주차부터 보인다(lib/features.js). 그 전에는 초안으로 보인다.
    reportBasis: it.reportBasis === 'REFINED' && !has('refinedReport') ? 'LIVE' : it.reportBasis,
  }
}

/** 지금 차수(API 명세 2.10): 끝나지 않은 첫 면접, 없으면 마지막으로 완료된 면접. 취소된 면접은 세지 않는다. */
function currentOf(its) {
  return its.find((i) => i.status !== 'DONE' && i.status !== 'CANCELED') || [...its].reverse().find((i) => i.status === 'DONE') || null
}
/** 방(API 명세 2.10의 모양) */
function roomView(it) {
  const us = db.utterances.get(it.roomId) || []
  return {
    id: it.roomId, interviewId: it.id, status: it.roomStatus, createdAt: it._createdAt || null,
    startedAt: it._startedAt || null, endedAt: it._endedAt || null,
    lastSeq: us.reduce((m, u) => Math.max(m, u.seq), 0), refined: it.reportBasis === 'REFINED',
  }
}

function candidateRow(c) {
  const its = db.interviews.filter((i) => i.candidateId === c.id).sort((a, b) => a.seq - b.seq)
  const current = currentOf(its)
  const ids = current ? current.interviewerIds : [] // 지금 차수 면접의 면접관(API 명세 2.10)
  return {
    id: c.id, applicantNo: c.applicantNo, name: c.name, track: c.track, jobCode: c.jobCode, jobTitle: c.jobTitle,
    ...(has('feedback1118') ? { applicantType: c.applicantType } : {}),
    interviewers: ids.map((id) => ({ id, name: D.users.find((u) => u.id === id).name })),
    briefingStatus: current?.briefingStatus ?? null,
    currentStage: current ? { type: current.type, status: current.status } : null,
  }
}

// ---- 면접 페르소나(화면 시안) ----
const personasOn = () => db.personas.filter((p) => p.enabled)
/** 관리자가 적는 페르소나의 글 항목만 골라 다듬는다 */
const personaFields = (b) => ({
  description: (b.description || '').trim(), questionType: (b.questionType || '').trim(), followUpType: (b.followUpType || '').trim(),
  fit: (b.fit || '').trim(), guard: (b.guard || '').trim(), tone: ['brand', 'ok', 'warn', 'bad', 'neutral'].includes(b.tone) ? b.tone : 'neutral',
})
/** 새 면접의 기본 선택: 추천으로 켠 것 가운데 맨 위, 없으면 쓰는 것 가운데 맨 위 */
const defaultPersona = () => personasOn().find((p) => p.recommended) || personasOn()[0] || null
/** 이 면접의 페르소나. 고른 것이 꺼졌으면 기본 선택으로 돌아간다(이미 시작한 면접은 그대로 둔다) */
function personaOf(it) {
  const chosen = db.personas.find((p) => p.id === it.personaId)
  if (chosen && (chosen.enabled || it.roomStatus === 'LIVE' || it.roomStatus === 'ENDED')) return chosen
  return defaultPersona()
}
/** 준비된 질문(가지가 아닌 것)의 표현을 페르소나에 맞춘다. 원래 표현은 _base 에 둔다 */
function applyPersona(it, list) {
  const texts = D.personaTexts(cand(it.candidateId), it, personaOf(it)?.id)
  list.filter((q) => !q.parentQuestionId && ['RESUME', 'JD', 'BANK'].includes(q.source)).forEach((q, i) => {
    q._base ??= q.text
    q.text = texts?.[i] || D.personaRewrite(q._base, personaOf(it)?.id)
  })
}

function questionsOf(it) {
  if (!db.questions.has(it.id)) {
    // 질문 은행에서 온 질문은 주차별 목업에서 질문 은행이 보이는 주차부터 넣는다(lib/features.js)
    const c = cand(it.candidateId)
    db.questions.set(it.id, D.questionsFor(c, it, { predicted: liveLocked(c.track) }).filter((q) => q.source !== 'BANK' || has('questionBank')))
    if (has('persona')) applyPersona(it, db.questions.get(it.id))
  }
  return db.questions.get(it.id)
}
function utterancesOf(it) {
  if (!db.utterances.has(it.roomId)) db.utterances.set(it.roomId, it.roomStatus === 'ENDED' && !liveLocked(cand(it.candidateId).track) ? clone(D.transcriptFor(cand(it.candidateId).track)) : [])
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
  /** 이 방 면접자의 트랙(대본을 고르는 데 쓴다) */
  track: (roomId) => cand(byRoom(roomId).candidateId).track,
  saveUtterance(roomId, u) {
    const list = utterancesOf(byRoom(roomId))
    const i = list.findIndex((x) => x.seq === u.seq)
    if (i >= 0) list[i] = { ...list[i], ...u }
    else list.push(u)
  },
  saveFollowUps(roomId, basedOnSeq, items) {
    const list = db.followUps.get(Number(roomId)) || []
    items.forEach((f) => list.push({ id: nextId(), clientId: f.id, basedOnSeq, text: f.text, rationale: f.rationale, used: false, questionId: null, createdAt: new Date().toISOString() }))
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
    if (params?.applicantType) rows = rows.filter((c) => c.applicantType === params.applicantType)
    if (params?.q) rows = rows.filter((c) => (c.name + c.applicantNo).includes(params.q))
    let all = rows.map(candidateRow)
    if (params?.status) all = all.filter((c) => c.currentStage?.status === params.status)
    if (params?.type) all = all.filter((c) => c.currentStage?.type === params.type)
    return paged(all, params)
  }],
  ['GET', '/candidates/:id', ([id]) => {
    const c = cand(id)
    if (!c) throw new ApiError(404, 'CANDIDATE_NOT_FOUND', '면접자를 찾을 수 없습니다.')
    return { ...c, interviews: db.interviews.filter((i) => i.candidateId === c.id).sort((a, b) => a.seq - b.seq).map(interviewView) }
  }],
  ['GET', '/candidates/:id/progress', ([id]) => {
    const its = db.interviews.filter((i) => i.candidateId === Number(id)).sort((a, b) => a.seq - b.seq)
    const current = currentOf(its)
    return {
      candidateId: Number(id),
      currentStage: current ? { type: current.type, status: current.status } : null,
      items: its.map((i) => ({ interviewId: i.id, seq: i.seq, type: i.type, mode: i.mode, status: i.status, scheduledAt: i.scheduledAt, reportStatus: i.reportStatus, current: i === current })),
    }
  }],
  ['POST', '/candidates/:id/interviews', ([id], { body }) => {
    const its = db.interviews.filter((i) => i.candidateId === Number(id))
    const it = { id: nextId(), candidateId: Number(id), type: body.type, seq: its.length + 1, mode: body.mode, status: body.scheduledAt ? 'SCHEDULED' : 'WAITING', scheduledAt: body.scheduledAt || null, durationMinutes: body.durationMinutes || 30, interviewerIds: [me().id], roomId: null, roomStatus: null, briefingStatus: null, reportStatus: null, reportBasis: null }
    db.interviews.push(it)
    return interviewView(it)
  }],

  ['POST', '/recruitments/:id/uploads', async ([id], { form }) => {
    adminOnly() // 엑셀 업로드와 이력 조회는 관리자만(API 명세 2.3)
    await wait(900)
    const file = form?.get?.('file')
    const rid = Number(id)
    const job = D.jobs.find((j) => j.recruitmentId === rid)
    const names = ['차은호', '남궁지안', '설하린']
    names.forEach((name, i) => {
      const nid = nextId()
      const base = clone(D.candidates.find((c) => c.recruitmentId === rid) || D.candidates[0])
      db.candidates.push({ ...base, id: nid, name, applicantNo: `UP-${nid}`, recruitmentId: rid, jobCode: job.jobCode, jobTitle: job.title })
      db.interviews.push({ id: nextId(), candidateId: nid, type: 'JOB', seq: 1, mode: 'OFFLINE', status: 'WAITING', scheduledAt: null, durationMinutes: 30, interviewerIds: [], roomId: null, roomStatus: null, briefingStatus: null, reportStatus: null, reportBasis: null, _n: i })
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
  ['GET', '/recruitments/:id/uploads', () => adminOnly() || ({ items: db.uploads.map((u) => ({ ...u, errors: [] })) })],
  ['GET', '/uploads/:id', ([id]) => adminOnly() || db.uploads.find((u) => u.id === Number(id))],
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
    // 만든 적이 없으면 요약이 없다. 다시 만드는 중이면 예전 요약을 그대로 싣고 무엇을 만드는지(generating)를 알린다
    if (it.briefingStatus == null || (it.briefingStatus !== 'SUCCEEDED' && !it._briefed)) return { status: it.briefingStatus, summary: null, excluded: [], generating: it.briefingStatus ? it._generating || 'ALL' : null }
    if (!db.briefings.has(it.id)) db.briefings.set(it.id, D.briefingFor(cand(it.candidateId), it))
    return { ...db.briefings.get(it.id), status: it.briefingStatus, generating: it.briefingStatus === 'SUCCEEDED' ? null : it._generating || 'ALL' }
  }],
  ['POST', '/interviews/:id/briefing/generate', ([id], { body }) => {
    const it = intv(id)
    // target: ALL(요약과 질문) | SUMMARY(요약만) | QUESTIONS(질문만). API 명세 2.6
    const target = ['SUMMARY', 'QUESTIONS'].includes(body?.target) ? body.target : 'ALL'
    it._briefed = it.briefingStatus === 'SUCCEEDED' || db.briefings.has(it.id)
    it.briefingStatus = 'RUNNING'
    it._generating = target
    const job = startJob('BRIEFING', it.id, 2500, () => {
      it.briefingStatus = 'SUCCEEDED'
      it._generating = null
      if (target !== 'QUESTIONS') db.briefings.set(it.id, { ...D.briefingFor(cand(it.candidateId), it), generatedAt: new Date().toISOString() })
      if (target !== 'SUMMARY' && it.roomStatus !== 'LIVE' && it.roomStatus !== 'ENDED') db.questions.delete(it.id) // 질문을 새로 만든다
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
    if (!it.roomId) Object.assign(it, { roomId: nextId(), roomStatus: 'CREATED', _createdAt: new Date().toISOString() })
    return roomView(it)
  }],
  ['GET', '/rooms/:id', ([id]) => {
    const it = byRoom(id)
    return roomView(it)
  }],
  ['POST', '/rooms/:id/start', ([id]) => {
    const it = byRoom(id)
    Object.assign(it, { roomStatus: 'LIVE', status: 'IN_PROGRESS', _startedAt: it._startedAt || new Date().toISOString() })
    return roomView(it)
  }],
  ['POST', '/rooms/:id/end', ([id]) => {
    const it = byRoom(id)
    const c = cand(it.candidateId)
    if (liveLocked(c.track)) {
      // 실시간 기능이 잠긴 면접: 대화 기록이 없으므로 보고서를 만들지 않는다
      Object.assign(it, { roomStatus: 'ENDED', status: 'EVALUATING', _endedAt: new Date().toISOString(), reportStatus: null, reportBasis: null })
      return roomView(it)
    }
    Object.assign(it, { roomStatus: 'ENDED', status: 'EVALUATING', _endedAt: new Date().toISOString(), reportStatus: 'RUNNING', reportBasis: null })
    // 초안(LIVE) → 잠시 뒤 보정본(REFINED). 실제 서버의 흐름을 짧게 흉내 낸다.
    startJob('REPORT', it.id, 4000, () => {
      db.reports.set(it.id, [{ ...D.reportFor(c, it, 'LIVE'), generatedAt: new Date().toISOString() }])
      Object.assign(it, { reportStatus: 'SUCCEEDED', reportBasis: 'LIVE' })
      // 보정본은 주차별 목업에서 그 주차부터 나온다(lib/features.js)
      if (has('refinedReport')) setTimeout(() => {
        db.reports.get(it.id).push({ ...D.reportFor(c, it, 'REFINED'), generatedAt: new Date().toISOString() })
        it.reportBasis = 'REFINED'
      }, 12000)
    })
    return roomView(it)
  }],
  ['POST', '/rooms/:id/ticket', ([id]) => {
    if (liveLocked(cand(byRoom(id).candidateId).track)) throw new ApiError(409, 'LIVE_DISABLED', '실시간 기능을 쓰지 않는 면접입니다.')
    return { ticket: 'mock-ticket', agentWsUrl: `mock://rooms/${id}`, expiresIn: 300 }
  }],
  ['GET', '/rooms/:id/utterances', ([id], { params }) => ({
    items: utterancesOf(byRoom(id)).filter((u) => u.seq > Number(params?.afterSeq || 0)),
  })],
  ['GET', '/rooms/:id/follow-ups', ([id]) => ({ items: db.followUps.get(Number(id)) || [] })],
  ['POST', '/follow-ups/:id/use', ([id]) => {
    for (const [roomId, list] of db.followUps) {
      const f = list.find((x) => String(x.id) === String(id))
      if (!f) continue
      const it = byRoom(roomId)
      const qs = questionsOf(it)
      const made = f.used && qs.find((x) => x.id === f.questionId) // 이미 채택했으면 그 질문을 돌려준다
      if (made) return made
      f.used = true
      const q = { id: nextId(), interviewId: it.id, source: 'FOLLOW_UP', category: '꼬리질문', text: f.text, intent: f.rationale, orderNo: qs.length + 1, asked: false, askedAtSeq: null, hidden: false, parentQuestionId: null }
      qs.push(q)
      f.questionId = q.id
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
  ['GET', '/interviews/:id/ai-evaluation', ([id]) => {
    if (has('feedback1118') && me().role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'AI 참고 평가는 채용 담당자만 볼 수 있습니다.')
    const it = intv(id)
    const track = cand(it.candidateId).track
    return it.roomStatus === 'ENDED' && !liveLocked(track) ? D.aiEvaluationFor(track) : { status: null, scores: [] }
  }],
  ['GET', '/interviews/:id/report', ([id]) => {
    const it = intv(id)
    if (liveLocked(cand(it.candidateId).track)) return { status: null, content: null }
    if (it.reportStatus === 'RUNNING') return { status: 'RUNNING', content: null }
    if (it.reportStatus !== 'SUCCEEDED') return { status: null, content: null }
    if (!db.reports.has(it.id)) db.reports.set(it.id, [D.reportFor(cand(it.candidateId), it, 'LIVE'), ...(it.reportBasis === 'REFINED' && has('refinedReport') ? [D.reportFor(cand(it.candidateId), it, 'REFINED')] : [])])
    const list = db.reports.get(it.id)
    return list[list.length - 1]
  }],
  ['GET', '/interviews/:id/report/versions', ([id]) => ({
    items: [...(db.reports.get(Number(id)) || [])].reverse(),
  })],
  ['POST', '/interviews/:id/report/regenerate', ([id]) => {
    const it = intv(id)
    it.reportStatus = 'RUNNING'
    const job = startJob('REPORT', it.id, 3000, () => { it.reportStatus = 'SUCCEEDED' })
    return { jobId: job.id }
  }],
  ['GET', '/interviews/:id/jobs', ([id]) => ({ items: [...db.jobs.values()].filter((j) => j.interviewId === Number(id)) })],
  ['GET', '/ai-jobs/:id', ([id]) => db.jobs.get(Number(id))],

  // ---- 면접 페르소나(API 명세 2.12), 시스템 상태(2.13) ----
  ['GET', '/personas', () => ({ items: db.personas })],
  ['POST', '/admin/personas', (_, { body }) => {
    const name = (body.name || '').trim()
    if (!name) throw new ApiError(400, 'PERSONA_NAME_REQUIRED', '페르소나 이름을 적어 주세요.')
    if (db.personas.some((x) => x.name === name)) throw new ApiError(409, 'PERSONA_NAME_TAKEN', '같은 이름의 페르소나가 이미 있습니다.')
    const p = { id: nextId(), ...personaFields(body), name, recommended: false, enabled: true, custom: true }
    db.personas.push(p)
    return p
  }],
  ['DELETE', '/admin/personas/:id', ([id]) => {
    const p = db.personas.find((x) => x.id === Number(id))
    if (!p) throw new ApiError(404, 'PERSONA_NOT_FOUND', '페르소나를 찾을 수 없습니다.')
    if (!p.custom) throw new ApiError(409, 'PERSONA_BUILT_IN', '기본 페르소나는 지울 수 없습니다. 사용을 꺼 주세요.')
    if (p.enabled && personasOn().length === 1) throw new ApiError(409, 'PERSONA_LAST_ONE', '페르소나는 하나 이상 사용해야 합니다.')
    db.personas = db.personas.filter((x) => x.id !== Number(id))
    return null
  }],
  ['PATCH', '/admin/personas/:id', ([id], { body }) => {
    const p = db.personas.find((x) => x.id === Number(id))
    if (!p) throw new ApiError(404, 'PERSONA_NOT_FOUND', '페르소나를 찾을 수 없습니다.')
    if (body.name !== undefined) {
      const name = (body.name || '').trim()
      if (!name) throw new ApiError(400, 'PERSONA_NAME_REQUIRED', '페르소나 이름을 적어 주세요.')
      if (db.personas.some((x) => x.id !== Number(id) && x.name === name)) throw new ApiError(409, 'PERSONA_NAME_TAKEN', '같은 이름의 페르소나가 이미 있습니다.')
      Object.assign(p, personaFields({ ...p, ...body }), { name })
    }
    if (body.enabled === false && p.enabled && personasOn().length === 1) throw new ApiError(409, 'PERSONA_LAST_ONE', '페르소나는 하나 이상 사용해야 합니다.')
    if (body.enabled !== undefined) p.enabled = !!body.enabled
    if (body.recommended !== undefined) p.recommended = !!body.recommended
    if (p.recommended) p.enabled = true // 추천하려면 쓰는 상태여야 한다
    if (body.enabled === false) p.recommended = false
    return p
  }],
  ['PUT', '/interviews/:id/persona', ([id], { body }) => {
    const it = intv(id)
    if (it.roomStatus === 'LIVE' || it.roomStatus === 'ENDED') throw new ApiError(409, 'PERSONA_LOCKED', '면접이 시작된 뒤에는 페르소나를 바꿀 수 없습니다.')
    const p = db.personas.find((x) => x.id === body.personaId && x.enabled)
    if (!p) throw new ApiError(400, 'PERSONA_NOT_AVAILABLE', '쓸 수 없는 페르소나입니다.')
    const before = personaOf(it)?.id
    it.personaId = p.id
    // 적용되는 페르소나가 바뀌었고 사전 리포트가 이미 있으면 질문만 다시 만든다(API 명세 2.5). 끝나면 질문 표현이 새 페르소나로 바뀐다
    if (before !== p.id && it.briefingStatus === 'SUCCEEDED') {
      it._briefed = true
      it.briefingStatus = 'RUNNING'
      it._generating = 'QUESTIONS'
      startJob('BRIEFING', it.id, 1800, () => {
        it.briefingStatus = 'SUCCEEDED'
        it._generating = null
        applyPersona(it, questionsOf(it))
      })
    } else applyPersona(it, questionsOf(it))
    return interviewView(it)
  }],
  ['GET', '/system/status', () => D.systemStatus()],
  // 질문 피드백(API 명세 2.6): 사람마다 면접 한 건에 하나
  ['GET', '/interviews/:id/question-feedback', ([id]) => db.questionFeedback.get(`${id}:${me().id}`) || { interviewId: Number(id), overall: null, votes: [], updatedAt: null }],
  ['PUT', '/interviews/:id/question-feedback', ([id], { body }) => {
    const v = { interviewId: Number(id), overall: body.overall ?? null, votes: body.votes || [], updatedAt: new Date().toISOString() }
    db.questionFeedback.set(`${id}:${me().id}`, v)
    return v
  }],
  // 화면 시안: 관리 > AI 모델(API 명세에 아직 없다. 명세 2.14)
  ['GET', '/admin/models', () => ({ models: D.aiModels, tasks: db.aiModels.tasks, history: db.aiModels.history })],
  ['PUT', '/admin/models/tasks/:key', ([key], { body }) => {
    const task = db.aiModels.tasks.find((t) => t.key === key)
    const to = D.aiModels.find((m) => m.id === body.modelId)
    if (!task) throw new ApiError(404, 'MODEL_TASK_NOT_FOUND', '작업을 찾을 수 없습니다.')
    if (!to || to.kind !== task.kind) throw new ApiError(400, 'MODEL_NOT_AVAILABLE', '이 작업에 쓸 수 없는 모델입니다.')
    if (to.status === 'DOWN') throw new ApiError(409, 'MODEL_DOWN', '멈춰 있는 모델로는 바꿀 수 없습니다.')
    const from = D.aiModels.find((m) => m.id === task.modelId)
    task.modelId = to.id
    db.aiModels.history = [{ taskKey: key, taskLabel: task.label, fromName: from.name, toName: to.name, changedAt: new Date().toISOString(), changedBy: me().name }, ...db.aiModels.history].slice(0, 5)
    return task
  }],

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
    items: db.bank.filter((q) => (!params?.jobCode || q.jobCode === params.jobCode) && (!params?.category || q.category === params.category) && (!params?.q || q.text.includes(params.q))
      && (has('experienced') || !q._exp)), // 경력용 질문은 경력 채용이 보이는 주차부터
  })],
  ['POST', '/question-bank', (_, { body }) => {
    const q = { id: nextId(), ...body }
    db.bank.unshift(q)
    return q
  }],
  ['POST', '/question-bank/from-question/:id', ([id], { body }) => {
    const src = [...db.questions.values()].flat().find((x) => x.id === Number(id))
    if (!src) throw new ApiError(404, 'QUESTION_NOT_FOUND', '질문을 찾을 수 없습니다.')
    const it = intv(src.interviewId)
    const jobCode = cand(it.candidateId).jobCode
    const text = (body?.text || src.text).trim()
    const same = db.bank.find((q) => q.jobCode === jobCode && q.text === text)
    if (same) return same
    const q = { id: nextId(), jobCode, interviewType: it.type, category: body?.category || src.category || null, text }
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
