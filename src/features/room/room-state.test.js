import { applyEvent, createRoomState, flattenBranches, groupTurns, lastSeq, questionTree, statusNotice } from './room-state.js'

describe('questionTree', () => {
  const q = (id, extra = {}) => ({ id, text: `q${id}`, source: 'RESUME', asked: false, askedAtSeq: null, hidden: false, parentQuestionId: null, ...extra })

  it('제안된 꼬리질문은 그 답변 전에 물은 질문 아래에 붙는다', () => {
    const questions = [q(1, { asked: true, askedAtSeq: 1 }), q(2, { asked: true, askedAtSeq: 4 }), q(3)]
    const followUps = [
      { basedOnSeq: 5, items: [{ id: 'f-5-1', text: 'b' }] },
      { basedOnSeq: 3, items: [{ id: 'f-3-1', text: 'a' }] },
    ]
    const t = questionTree(questions, followUps)
    expect(t.nodes[0].children.map((c) => c.f.text)).toEqual(['a'])
    expect(t.nodes[1].children.map((c) => c.f.text)).toEqual(['b'])
    expect(t.nodes[2].children).toEqual([])
    expect(t.currentId).toBe(2)
    expect(t.loose).toEqual([])
  })

  it('채택한 꼬리질문은 제안 대신 질문으로 보인다', () => {
    const questions = [q(1, { asked: true, askedAtSeq: 1 }), q(9, { source: 'FOLLOW_UP', text: 'a', asked: true })]
    const t = questionTree(questions, [{ basedOnSeq: 3, items: [{ id: 'f-3-1', text: 'a', used: true, spoken: true }, { id: 'f-3-2', text: 'c' }] }])
    expect(t.nodes).toHaveLength(1)
    expect(t.nodes[0].children.map((c) => [c.kind, c.q?.id ?? c.f.id])).toEqual([['question', 9], ['suggestion', 'f-3-2']])
    expect(t.nodes[0].children[0].spoken).toBe(true)
  })

  it('채택한 꼬리질문에 대한 답에서 나온 제안은 그 꼬리질문 아래에 한 단계 더 들어간다', () => {
    const questions = [q(1, { asked: true, askedAtSeq: 1 }), q(2, { asked: true, askedAtSeq: 4 }), q(9, { source: 'FOLLOW_UP', text: 'a', asked: true, askedAtSeq: 6 })]
    const t = questionTree(questions, [
      { basedOnSeq: 7, items: [{ id: 'f-7-1', text: 'deeper' }] },
      { basedOnSeq: 3, items: [{ id: 'f-3-1', text: 'a', used: true }] },
    ])
    expect(t.nodes[0].children.map((c) => c.q.text)).toEqual(['a'])
    expect(t.nodes[0].children[0].children.map((c) => c.f.text)).toEqual(['deeper'])
    expect(t.nodes[1].children).toEqual([])
    // 방금 물은 것이 가지여도 "지금 질문"은 그 가지가 달린 줄기다
    expect(t.currentId).toBe(1)
    expect(flattenBranches(t.nodes[0].children).map((c) => [c.depth, c.q?.text ?? c.f.text])).toEqual([[0, 'a'], [1, 'deeper']])
  })

  it('같은 질문을 나중에 다시 물어도 앞서 붙은 꼬리질문의 자리는 그대로다', () => {
    // 질문 1을 처음(1번 발화)에 묻고, 질문 2를 물은 뒤, 9번 발화에서 질문 1을 다시 물었다 → askedAtSeq 는 9로 바뀐다
    const questions = [q(1, { asked: true, askedAtSeq: 9 }), q(2, { asked: true, askedAtSeq: 4 })]
    const utterances = [{ seq: 1, matchedQuestionId: 1 }, { seq: 4, matchedQuestionId: 2 }, { seq: 9, matchedQuestionId: 1 }]
    const followUps = [
      { basedOnSeq: 10, items: [{ id: 'f-10-1', text: 'c' }] },
      { basedOnSeq: 5, items: [{ id: 'f-5-1', text: 'b' }] },
      { basedOnSeq: 2, items: [{ id: 'f-2-1', text: 'a' }] },
    ]
    const t = questionTree(questions, followUps, utterances)
    expect(t.nodes[0].children.map((c) => c.f.text)).toEqual(['a', 'c'])
    expect(t.nodes[1].children.map((c) => c.f.text)).toEqual(['b'])
    expect(t.loose).toEqual([])
    expect(t.currentId).toBe(1)
  })

  it('순서를 바꿔 물어도 방금 물은 질문 아래에 붙는다', () => {
    const questions = [q(1), q(2), q(3, { asked: true, askedAtSeq: 1 })]
    const t = questionTree(questions, [{ basedOnSeq: 2, items: [{ id: 'f-2-1', text: 'a' }] }], [{ seq: 1, matchedQuestionId: 3 }])
    expect(t.nodes.map((n) => n.children.length)).toEqual([0, 0, 1])
    expect(t.currentId).toBe(3)
  })

  it('면접 전에 만든 예상 꼬리질문은 부모 질문 아래에 있다', () => {
    const questions = [q(1), q(2), q(11, { source: 'FOLLOW_UP', parentQuestionId: 1 }), q(12, { source: 'FOLLOW_UP', parentQuestionId: 2 })]
    const t = questionTree(questions, [])
    expect(t.nodes.map((n) => n.children.map((c) => c.q.id))).toEqual([[11], [12]])
    expect(t.currentId).toBeNull()
  })

  it('물은 질문이 아직 없으면 제안은 따로 모은다', () => {
    const t = questionTree([q(1)], [{ basedOnSeq: 2, items: [{ id: 'f-2-1', text: 'a' }] }])
    expect(t.nodes[0].children).toEqual([])
    expect(t.loose.map((c) => c.f.id)).toEqual(['f-2-1'])
  })
})

const final = (seq, speaker, extra = {}) => ({ type: 'transcript.final', seq, speaker, speakerMethod: 'LLM', rawText: `raw${seq}`, refinedText: `t${seq}`, startMs: 0, endMs: 1, ...extra })

describe('room-state', () => {
  it('부분 전사는 같은 seq의 확정 전사가 오면 사라진다', () => {
    const s = createRoomState()
    applyEvent(s, { type: 'transcript.partial', seq: 1, text: '안녕' })
    expect(s.partial.text).toBe('안녕')
    applyEvent(s, final(1, 'INTERVIEWER'))
    expect(s.partial).toBeNull()
    expect(s.utterances).toHaveLength(1)
  })

  it('순서가 바뀌어 와도 seq 순으로 정렬하고, 같은 seq는 덮어쓴다', () => {
    const s = createRoomState()
    applyEvent(s, final(2, 'CANDIDATE'))
    applyEvent(s, final(1, 'INTERVIEWER'))
    applyEvent(s, final(2, 'CANDIDATE', { refinedText: '고침' }))
    expect(s.utterances.map((u) => u.seq)).toEqual([1, 2])
    expect(s.utterances[1].refinedText).toBe('고침')
    expect(lastSeq(s)).toBe(2)
  })

  it('질문이 매칭되면 질문에 "물음" 표시가 붙는다', () => {
    const s = createRoomState()
    s.questions = [{ id: 7, text: 'q', asked: false }]
    applyEvent(s, final(1, 'INTERVIEWER'))
    applyEvent(s, { type: 'question.matched', seq: 1, questionId: 7, similarity: 0.9 })
    expect(s.questions[0].asked).toBe(true)
    expect(s.utterances[0].matchedQuestionId).toBe(7)
  })

  it('말로 물은 꼬리질문에는 표시가 남는다', () => {
    const s = createRoomState()
    applyEvent(s, { type: 'followup.suggested', basedOnSeq: 2, items: [{ id: 'f-2-1', text: 'A' }, { id: 'f-2-2', text: 'B' }] })
    applyEvent(s, { type: 'followup.matched', seq: 3, id: 'f-2-2', similarity: 0.8 })
    expect(s.followUps[0].items.map((x) => !!x.spoken)).toEqual([false, true])
    expect(s.followUps[0].items[1].spokenAtSeq).toBe(3)
    applyEvent(s, { type: 'followup.matched', seq: 4, id: 'none', similarity: 0.8 }) // 모르는 id 는 무시
  })

  it('꼬리질문은 최신 묶음이 앞에 오고, 같은 발화의 묶음은 바뀐다', () => {
    const s = createRoomState()
    applyEvent(s, { type: 'followup.suggested', basedOnSeq: 2, items: [{ id: 'a', text: 'A' }] })
    applyEvent(s, { type: 'followup.suggested', basedOnSeq: 4, items: [{ id: 'b', text: 'B' }] })
    applyEvent(s, { type: 'followup.suggested', basedOnSeq: 2, items: [{ id: 'c', text: 'C' }] })
    expect(s.followUps.map((g) => g.basedOnSeq)).toEqual([2, 4])
    expect(s.followUps[0].items[0].id).toBe('c')
  })

  it('화자를 사람이 고치면 반영된다', () => {
    const s = createRoomState()
    applyEvent(s, final(1, 'UNKNOWN'))
    applyEvent(s, { type: 'transcript.updated', seq: 1, speaker: 'CANDIDATE', speakerMethod: 'MANUAL' })
    expect(s.utterances[0].speaker).toBe('CANDIDATE')
    expect(s.utterances[0].refinedText).toBe('t1')
  })

  it('연속된 같은 화자의 발화를 묶는다', () => {
    const turns = groupTurns([
      { seq: 1, speaker: 'INTERVIEWER' },
      { seq: 2, speaker: 'CANDIDATE' },
      { seq: 3, speaker: 'CANDIDATE' },
      { seq: 4, speaker: 'INTERVIEWER' },
    ])
    expect(turns.map((t) => t.items.length)).toEqual([1, 2, 1])
  })

  it('모델이 멈추면 풀릴 때까지 안내 문장을 낸다', () => {
    const s = createRoomState()
    expect(statusNotice(s.status)).toBe('')
    applyEvent(s, { type: 'status', stt: 'DEGRADED', llm: 'OK', queueDepth: 4, audioConnected: true })
    expect(statusNotice(s.status)).toContain('밀리고')
    applyEvent(s, { type: 'status', stt: 'DOWN', llm: 'DOWN', queueDepth: 0, audioConnected: true })
    expect(statusNotice(s.status)).toContain('음성 인식이 멈췄습니다') // 둘 다 멈추면 음성 인식이 먼저다
    applyEvent(s, { type: 'status', stt: 'OK', llm: 'DOWN', queueDepth: 0, audioConnected: true })
    expect(statusNotice(s.status)).toContain('꼬리질문')
    applyEvent(s, { type: 'status', stt: 'OK', llm: 'DEGRADED', queueDepth: 0, audioConnected: true })
    expect(statusNotice(s.status)).toBe('') // 한 번 실패한 것은 알리지 않는다(다듬기·꼬리질문만 한 번 빠진다)
    applyEvent(s, { type: 'status', stt: 'OK', llm: 'OK', queueDepth: 0, audioConnected: true })
    expect(statusNotice(s.status)).toBe('')
  })
})
