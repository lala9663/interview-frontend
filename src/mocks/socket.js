// 모의 Agent 소켓. 실제 WebSocket과 같은 이벤트(계약 3장)를 대본대로 내보낸다.
// 마이크 오디오는 받기만 하고 버린다. "말하고 있다"는 것만 흉내 낸다.
import { liveScript } from './data.js'
import { mockStore } from './server.js'

export class MockRoomSocket {
  constructor(roomId) {
    this.roomId = Number(roomId)
    this.onmessage = () => {}
    this.onclose = () => {}
    this.timers = []
    this.seq = 0
    this.index = 0
    this.running = false
    this.manualRole = 'AUTO'
    this.later(() => {
      this.emit({ type: 'ready', roomId: this.roomId, audio: true, sttModel: 'mock-whisper', llmModel: 'mock-llm', lastSeq: 0 })
      this.emit({ type: 'status', stt: 'OK', llm: 'OK', queueDepth: 0, audioConnected: true })
    }, 200)
  }

  later(fn, ms) {
    const t = setTimeout(fn, ms)
    this.timers.push(t)
  }
  emit(event) {
    this.onmessage(event)
  }

  /** 마이크가 켜지면(첫 오디오 프레임) 대본을 시작한다 */
  sendAudio() {
    if (this.running) return
    this.running = true
    this.next()
  }

  send(msg) {
    if (msg.type === 'role') this.manualRole = msg.role
    if (msg.type === 'ping') this.emit({ type: 'pong' })
    if (msg.type === 'question.asked') mockStore.markAsked(msg.questionId, this.seq)
    if (msg.type === 'utterance.fix') {
      mockStore.saveUtterance(this.roomId, { seq: msg.seq, speaker: msg.speaker, speakerMethod: 'MANUAL' })
      this.emit({ type: 'transcript.updated', seq: msg.seq, speaker: msg.speaker, speakerMethod: 'MANUAL' })
    }
    if (msg.type === 'followup.request') {
      this.later(() => this.suggest(this.seq, [{ text: '방금 답변에서 본인이 직접 결정한 부분은 무엇인가요?', rationale: '요청으로 생성' }]), 900)
    }
  }

  suggest(basedOnSeq, list) {
    const items = list.map((f, i) => ({ id: `f-${basedOnSeq}-${i + 1}`, text: f.text, rationale: f.rationale }))
    mockStore.saveFollowUps(this.roomId, basedOnSeq, items)
    this.emit({ type: 'followup.suggested', basedOnSeq, items })
  }

  next() {
    if (!this.running || this.index >= liveScript.length) return
    const line = liveScript[this.index++]
    const seq = ++this.seq
    const words = line.raw.split(' ')
    const step = 170
    // 부분 전사: 낱말이 조금씩 늘어난다
    words.forEach((_, i) => {
      if (i % 3 === 2 || i === words.length - 1) {
        this.later(() => this.emit({ type: 'transcript.partial', seq, text: words.slice(0, i + 1).join(' ') }), step * (i + 1))
      }
    })
    const spoken = step * words.length
    this.later(() => {
      const speaker = this.manualRole !== 'AUTO' ? this.manualRole : line.speaker
      const method = this.manualRole !== 'AUTO' ? 'MANUAL' : line.q !== undefined ? 'QUESTION_MATCH' : 'LLM'
      const u = { seq, speaker, speakerMethod: method, rawText: line.raw, refinedText: line.refined, startMs: seq * 20000, endMs: seq * 20000 + spoken, matchedQuestionId: null, source: 'LIVE' }
      if (line.q !== undefined) {
        const q = mockStore.questions(this.roomId)[line.q]
        if (q) {
          u.matchedQuestionId = q.id
          mockStore.markAsked(q.id, seq)
          this.later(() => this.emit({ type: 'question.matched', seq, questionId: q.id, similarity: 0.86 }), 250)
        }
      }
      mockStore.saveUtterance(this.roomId, u)
      this.emit({ type: 'transcript.final', ...u })
      if (line.followUps) this.later(() => this.suggest(seq, line.followUps), 1400)
    }, spoken + 700)
    this.later(() => this.next(), spoken + 2600)
  }

  pause() {
    this.running = false
  }

  close() {
    this.running = false
    this.timers.forEach(clearTimeout)
    this.onclose({ code: 1000 })
  }
}
