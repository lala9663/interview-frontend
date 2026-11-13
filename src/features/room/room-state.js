// 방의 화면 상태와, Agent 이벤트(계약 3.2)를 그 상태에 반영하는 순수 함수.
// 화면·소켓과 떨어져 있어 단위 테스트가 쉽다: room-state.test.js

export function createRoomState() {
  return {
    utterances: [], // seq 오름차순
    partial: null, // { seq, text }
    followUps: [], // [{ basedOnSeq, items: [{ id, text, rationale, used }] }] 최신이 앞
    questions: [],
    lastMatchedQuestionId: null,
    status: { stt: 'OK', llm: 'OK', queueDepth: 0, audioConnected: false },
    models: { stt: '', llm: '' },
    notices: [], // 화면에 띄울 오류 문장
  }
}

const MAX_FOLLOW_UP_GROUPS = 6

export function upsertUtterance(state, u) {
  const i = state.utterances.findIndex((x) => x.seq === u.seq)
  if (i >= 0) state.utterances[i] = { ...state.utterances[i], ...u }
  else {
    state.utterances.push(u)
    if (state.utterances.length > 1 && state.utterances[state.utterances.length - 2].seq > u.seq) {
      state.utterances.sort((a, b) => a.seq - b.seq)
    }
  }
}

export function lastSeq(state) {
  return state.utterances.length ? state.utterances[state.utterances.length - 1].seq : 0
}

export function applyEvent(state, e) {
  switch (e.type) {
    case 'ready':
      state.models = { stt: e.sttModel || '', llm: e.llmModel || '' }
      break
    case 'transcript.partial':
      state.partial = { seq: e.seq, text: e.text }
      break
    case 'transcript.final': {
      const { type: _t, ...u } = e
      upsertUtterance(state, u)
      if (state.partial && state.partial.seq <= e.seq) state.partial = null
      break
    }
    case 'transcript.updated': {
      const { type: _t, ...patch } = e
      if (state.utterances.some((x) => x.seq === e.seq)) upsertUtterance(state, patch)
      break
    }
    case 'question.matched': {
      const q = state.questions.find((x) => x.id === e.questionId)
      if (q) Object.assign(q, { asked: true, askedAtSeq: e.seq })
      const u = state.utterances.find((x) => x.seq === e.seq)
      if (u) u.matchedQuestionId = e.questionId
      state.lastMatchedQuestionId = e.questionId
      break
    }
    case 'followup.suggested':
      state.followUps = [
        { basedOnSeq: e.basedOnSeq, items: e.items.map((x) => ({ ...x, used: false })) },
        ...state.followUps.filter((g) => g.basedOnSeq !== e.basedOnSeq),
      ].slice(0, MAX_FOLLOW_UP_GROUPS)
      break
    case 'status':
      state.status = { ...state.status, ...e }
      delete state.status.type
      break
    case 'error':
      state.notices = [...state.notices.slice(-2), { code: e.code, message: e.message, at: Date.now() }]
      break
    default:
      break
  }
  return state
}

/** 연속된 같은 화자의 발화를 한 덩어리로 묶는다(화면 표시용). */
export function groupTurns(utterances) {
  const turns = []
  for (const u of utterances) {
    const last = turns[turns.length - 1]
    if (last && last.speaker === u.speaker && !u.matchedQuestionId) last.items.push(u)
    else turns.push({ key: u.seq, speaker: u.speaker, items: [u] })
  }
  return turns
}
