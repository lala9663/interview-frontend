// 방의 화면 상태와, Agent 이벤트(API 명세 3.2)를 그 상태에 반영하는 순수 함수.
// 화면·소켓과 떨어져 있어 단위 테스트가 쉽다: room-state.test.js

export function createRoomState() {
  return {
    utterances: [], // seq 오름차순
    partial: null, // { seq, text }
    followUps: [], // [{ basedOnSeq, items: [{ id, text, rationale, used, spoken }] }] 최신이 앞. spoken = 말로 물어 자동 채택됨
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
    case 'followup.matched': {
      // 면접관이 제안된 꼬리질문을 말로 물었다. 표시만 남기고, 질문 목록에 올리는 일은 use-room.js 가 한다.
      const item = state.followUps.flatMap((g) => g.items).find((x) => String(x.id) === String(e.id))
      if (item) Object.assign(item, { spoken: true, spokenAtSeq: e.seq })
      break
    }
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

/**
 * 모델 상태(status 이벤트의 stt·llm)를 면접관에게 보여 줄 문장으로 바꾼다. 알릴 것이 없으면 ''.
 * 상태가 풀릴 때까지 계속 떠 있어야 하는 안내다: 왜 글이나 꼬리질문이 안 나오는지, 그동안 무엇을 하면 되는지.
 */
export function statusNotice(status) {
  const stt = status?.stt
  const llm = status?.llm
  if (stt === 'DOWN') return '음성 인식이 멈췄습니다. 음성은 계속 받고 있어 면접 뒤에 글로 바뀝니다. 그동안 메모를 써 주세요.'
  if (llm === 'DOWN') return '꼬리질문 제안과 문장 다듬기가 멈췄습니다. 전사와 준비한 질문은 그대로 쓸 수 있습니다.'
  if (stt === 'DEGRADED') return '음성 인식이 밀리고 있습니다. 글이 평소보다 늦게 나타납니다.'
  return ''
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

/**
 * 질문과 꼬리질문을 나무 모양으로 묶는다(면접 방 가운데 칸). 꼬리질문은 그것이 나온 질문 아래에 가지로 붙는다.
 *
 * - 줄기: 부모가 없는 질문(준비된 질문, 직접 추가한 질문).
 * - 가지 ①: parentQuestionId 가 다른 질문을 가리키는 질문(면접 전에 만든 예상 꼬리질문).
 * - 가지 ②: 면접 중 제안된 꼬리질문. 제안의 근거가 된 발화(basedOnSeq) 바로 전에 물은 질문 아래에 붙인다.
 *   그 질문이 채택한 꼬리질문이면 그 아래에 한 단계 더 들어간다(꼬리의 꼬리).
 *   채택해서 질문 목록에 올라간 것(같은 글의 FOLLOW_UP 질문)은 제안 대신 그 질문을 보여 준다.
 * - 어디에도 붙지 못한 것은 loose 로 돌려준다.
 *
 * "언제 어느 질문을 물었는지"는 세 군데에서 모은다: 발화에 남은 질문 일치 기록(utterances 의 matchedQuestionId),
 * 질문의 askedAtSeq(손으로 표시한 것 포함), 말로 물어 채택된 제안의 spokenAtSeq.
 * 발화 기록을 같이 보기 때문에 같은 질문을 나중에 다시 물어도 앞서 붙은 가지의 자리는 바뀌지 않는다.
 *
 * 가지는 { key, kind: 'question'|'suggestion', q?, f?, spoken?, children } 이고 children 에 다시 가지가 들어간다.
 * @returns {{ nodes: Array<{ q, children: Array }>, loose: Array, currentId: number|null }} currentId 는 방금 물은 질문이 있는 줄기
 */
export function questionTree(questions, followUps, utterances = []) {
  const visible = questions.filter((q) => !q.hidden)
  const byId = new Map() // 질문 id → { node, rootId }
  const nodes = visible
    .filter((q) => !q.parentQuestionId && q.source !== 'FOLLOW_UP')
    .map((q) => {
      const node = { q, children: [] }
      byId.set(q.id, { node, rootId: q.id })
      return node
    })
  const loose = []

  const attach = (parent, child) => {
    const node = { key: `q${child.q.id}`, kind: 'question', children: [], ...child }
    parent.node.children.push(node)
    byId.set(child.q.id, { node, rootId: parent.rootId })
  }
  // 면접 전에 만든 가지(부모가 먼저 자리를 잡아야 하므로 붙일 것이 없어질 때까지 돈다)
  let waiting = visible.filter((q) => q.parentQuestionId)
  for (let moved = true; moved && waiting.length; ) {
    moved = false
    waiting = waiting.filter((q) => {
      const parent = byId.get(q.parentQuestionId)
      if (!parent) return true
      attach(parent, { q })
      moved = true
      return false
    })
  }

  // 언제(seq) 어느 질문을 물었는지
  const asks = []
  utterances.forEach((u) => u.matchedQuestionId && asks.push({ seq: u.seq, id: u.matchedQuestionId }))
  visible.forEach((q) => q.askedAtSeq != null && asks.push({ seq: q.askedAtSeq, id: q.id }))
  const adopted = visible.filter((q) => q.source === 'FOLLOW_UP' && !byId.has(q.id))
  followUps.forEach((g) => g.items.forEach((f) => {
    const q = f.spokenAtSeq != null && adopted.find((x) => x.text === f.text)
    if (q) asks.push({ seq: f.spokenAtSeq, id: q.id })
  }))
  // 그 발화 전에 가장 늦게 물은 질문(이미 나무에 자리 잡은 것 가운데)
  const askedBefore = (seq) => {
    let best = null
    for (const a of asks) if (a.seq <= seq && byId.has(a.id) && (!best || a.seq >= best.seq)) best = a
    return best ? byId.get(best.id) : null
  }

  // 오래된 제안부터 붙여야 화면에서 시간 순서가 되고, 채택한 꼬리질문이 그 뒤의 제안보다 먼저 자리를 잡는다(followUps 는 최신이 앞)
  ;[...followUps].reverse().forEach((g) => {
    const parent = askedBefore(g.basedOnSeq)
    g.items.forEach((f) => {
      const q = adopted.find((x) => x.text === f.text && !byId.has(x.id))
      if (q && parent) attach(parent, { q, spoken: !!f.spoken })
      else if (q) {
        loose.push({ key: `q${q.id}`, kind: 'question', q, spoken: !!f.spoken, children: [] })
        byId.set(q.id, { node: loose[loose.length - 1], rootId: null })
      } else (parent ? parent.node.children : loose).push({ key: `f${f.id}`, kind: 'suggestion', f, children: [] })
    })
  })
  adopted.filter((q) => !byId.has(q.id)).forEach((q) => loose.push({ key: `q${q.id}`, kind: 'question', q, children: [] }))

  const last = asks.reduce((best, a) => (byId.get(a.id)?.rootId != null && (!best || a.seq >= best.seq) ? a : best), null)
  return { nodes, loose, currentId: last ? byId.get(last.id).rootId : null }
}

/** 가지를 화면에 그릴 순서대로 한 줄로 편다. depth 는 들여 쓸 단계(0부터) */
export function flattenBranches(children, depth = 0) {
  return children.flatMap((c) => [{ ...c, depth }, ...flattenBranches(c.children || [], depth + 1)])
}
