import { applyEvent, createRoomState, groupTurns, lastSeq } from './room-state.js'

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
})
