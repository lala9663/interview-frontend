// 모의 Agent 소켓. 실제 WebSocket과 같은 이벤트(API 명세 3장)를 대본대로 내보낸다.
// 마이크 오디오는 받기만 하고 버린다. "말하고 있다"는 것만 흉내 낸다.
//
// 시각은 자체 시계(vt)로 잰다: 일시정지와 배속(demo.paused, demo.speed)을 걸 수 있어야 해서다.
import { liveScript } from './data.js'
import { mockStore } from './server.js'
import { demo, resetDemo } from './demo.js'
import { has } from '@/lib/features.js'

const TICK = 50

export class MockRoomSocket {
  constructor(roomId) {
    this.roomId = Number(roomId)
    this.onmessage = () => {}
    this.onclose = () => {}
    this.queue = []
    this.vt = 0
    this.last = Date.now()
    this.seq = 0
    this.index = 0
    this.running = false
    this.manualRole = 'AUTO'
    resetDemo()
    demo.total = liveScript.length
    this.ticker = setInterval(() => this.tick(), TICK)
    this.later(() => {
      this.emit({ type: 'ready', roomId: this.roomId, audio: true, sttModel: 'mock-whisper', llmModel: 'mock-llm', lastSeq: 0 })
      this.emit({ type: 'status', stt: 'OK', llm: 'OK', queueDepth: 0, audioConnected: true })
    }, 200)
  }

  /** 실제로 흐른 시간만큼(배속을 곱해) 자체 시계를 돌리고, 때가 된 일을 순서대로 한다 */
  tick() {
    const now = Date.now()
    const passed = now - this.last
    this.last = now
    if (demo.paused) return
    this.vt += passed * demo.speed
    const due = this.queue.filter((j) => j.at <= this.vt).sort((a, b) => a.at - b.at)
    this.queue = this.queue.filter((j) => j.at > this.vt)
    due.forEach((j) => j.fn())
  }
  later(fn, ms) {
    this.queue.push({ at: this.vt + ms, fn })
  }
  emit(event) {
    this.onmessage(event)
  }
  stage(stage, done = demo.done) {
    demo.stage = stage
    demo.done = done
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

  /** 대본 한 문장: 받아 적기 → 다듬기·화자 구분 → (면접관이면) 질문 찾기 → (지원자면) 꼬리질문 */
  next() {
    if (!this.running) return
    if (this.index >= liveScript.length) {
      demo.speaker = null
      this.stage('END', [])
      return
    }
    const line = liveScript[this.index++]
    const seq = ++this.seq
    const words = line.raw.split(' ')
    const step = 170
    demo.line = this.index
    demo.speaker = line.speaker
    this.stage('LISTEN', [])
    // 부분 전사: 낱말이 조금씩 늘어난다
    words.forEach((_, i) => {
      if (i % 3 === 2 || i === words.length - 1) {
        this.later(() => this.emit({ type: 'transcript.partial', seq, text: words.slice(0, i + 1).join(' ') }), step * (i + 1))
      }
    })
    const spoken = step * words.length
    this.later(() => this.stage('REFINE', ['LISTEN']), spoken)

    let t = spoken + 900
    const q = line.q !== undefined ? mockStore.questions(this.roomId)[line.q] : null
    this.later(() => {
      const speaker = this.manualRole !== 'AUTO' ? this.manualRole : line.speaker
      const method = this.manualRole !== 'AUTO' ? 'MANUAL' : line.q !== undefined ? 'QUESTION_MATCH' : 'LLM'
      const u = { seq, speaker, speakerMethod: method, rawText: line.raw, refinedText: line.refined, startMs: seq * 20000, endMs: seq * 20000 + spoken, matchedQuestionId: null, source: 'LIVE' }
      if (q) {
        u.matchedQuestionId = q.id
        mockStore.markAsked(q.id, seq)
      }
      mockStore.saveUtterance(this.roomId, u)
      this.emit({ type: 'transcript.final', ...u })
      this.stage(q ? 'MATCH' : line.followUps ? 'FOLLOWUP' : 'IDLE', ['LISTEN', 'REFINE'])
    }, t)
    if (q) {
      t += 700
      this.later(() => {
        this.emit({ type: 'question.matched', seq, questionId: q.id, similarity: 0.86 })
        this.stage(line.followUps ? 'FOLLOWUP' : 'IDLE', ['LISTEN', 'REFINE', 'MATCH'])
      }, t)
    }
    if (line.fu && has('spokenFollowUp')) {
      // 제안된 꼬리질문을 말로 물었다 → 누르지 않아도 채택된다
      t += 700
      this.later(() => this.emit({ type: 'followup.matched', seq, id: line.fu, similarity: 0.81 }), t)
    }
    if (line.followUps) {
      t += 1500
      this.later(() => {
        this.suggest(seq, line.followUps)
        this.stage('IDLE', [...demo.done, 'FOLLOWUP'])
      }, t)
    }
    this.later(() => this.next(), t + 1500)
  }

  pause() {
    this.running = false
  }

  close() {
    this.running = false
    clearInterval(this.ticker)
    this.queue = []
    resetDemo()
    this.onclose({ code: 1000 })
  }
}
