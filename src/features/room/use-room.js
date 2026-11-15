import { onBeforeUnmount, reactive, ref } from 'vue'
import { interviewApi, roomApi } from '@/api/index.js'
import { applyEvent, createRoomState, lastSeq, upsertUtterance } from './room-state.js'
import { FINAL_CLOSE_CODES, openRoomSocket } from './room-socket.js'

/**
 * 면접 방 하나의 데이터와 연결을 맡는다.
 * - 백엔드: 방·질문·저장된 전사·꼬리질문 (새로 고침·재접속 복구)
 * - Agent 소켓: 실시간 이벤트. 끊기면 입장권을 새로 받아 다시 붙는다.
 */
export function useRoom(interviewId) {
  const state = reactive(createRoomState())
  const room = ref(null)
  const connection = ref('idle') // idle | connecting | open | reconnecting | closed
  const audioOwner = ref(true) // 이 단말이 마이크를 보내는가
  let socket = null
  let retry = 0
  let retryTimer = null
  let disposed = false

  async function load() {
    room.value = await roomApi.open(interviewId)
    const [qs, us, fs] = await Promise.all([
      interviewApi.questions(interviewId),
      roomApi.utterances(room.value.id, 0),
      roomApi.followUps(room.value.id).catch(() => ({ items: [] })),
    ])
    state.questions = qs.items
    us.items.forEach((u) => upsertUtterance(state, u))
    // 저장된 꼬리질문을 발화별 묶음으로 되살린다
    const groups = new Map()
    fs.items.forEach((f) => {
      if (!groups.has(f.basedOnSeq)) groups.set(f.basedOnSeq, [])
      groups.get(f.basedOnSeq).push({ id: f.clientId ?? f.id, text: f.text, rationale: f.rationale, used: !!f.used })
    })
    state.followUps = [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([basedOnSeq, items]) => ({ basedOnSeq, items }))
  }

  async function connect() {
    if (disposed) return
    connection.value = retry ? 'reconnecting' : 'connecting'
    try {
      const t = await roomApi.ticket(room.value.id, audioOwner.value)
      socket = await openRoomSocket({
        url: t.agentWsUrl,
        ticket: t.ticket,
        roomId: room.value.id,
        onOpen: () => {
          connection.value = 'open'
          retry = 0
        },
        onEvent: (e) => {
          if (e.type === 'ready') fillGap(e.lastSeq)
          if (e.type === 'error' && e.code === 'AUDIO_ALREADY_CONNECTED') audioOwner.value = false
          applyEvent(state, e)
          if (e.type === 'followup.matched') onFollowUpSpoken(e)
        },
        onClose: (code) => {
          socket = null
          if (disposed) return
          if (code === 4409) {
            // 다른 단말이 마이크를 보내고 있다 → 듣기 전용으로 다시 붙는다
            audioOwner.value = false
            connect()
          } else if (FINAL_CLOSE_CODES.includes(code)) {
            connection.value = 'closed'
          } else {
            scheduleReconnect()
          }
        },
      })
    } catch {
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (disposed) return
    connection.value = 'reconnecting'
    retry += 1
    clearTimeout(retryTimer)
    retryTimer = setTimeout(connect, Math.min(8000, 800 * 2 ** Math.min(retry, 4)))
  }

  /** 끊긴 동안 놓친 전사를 백엔드에서 채운다 */
  async function fillGap(serverLastSeq) {
    if (!serverLastSeq || serverLastSeq <= lastSeq(state)) return
    try {
      const us = await roomApi.utterances(room.value.id, lastSeq(state))
      us.items.forEach((u) => upsertUtterance(state, u))
    } catch {
      /* 다음 재접속 때 다시 */
    }
  }

  function disconnect() {
    clearTimeout(retryTimer)
    socket?.close()
    socket = null
    connection.value = 'closed'
  }

  const send = (msg) => socket?.send(msg)
  const sendAudio = (buf) => audioOwner.value && socket?.sendAudio(buf)

  function setRole(role) {
    send({ type: 'role', role })
  }
  function fixSpeaker(u, speaker) {
    upsertUtterance(state, { seq: u.seq, speaker, speakerMethod: 'MANUAL' })
    send({ type: 'utterance.fix', seq: u.seq, speaker })
  }
  async function toggleAsked(q) {
    const asked = !q.asked
    q.asked = asked
    if (asked) send({ type: 'question.asked', questionId: q.id })
    await interviewApi.patchQuestion(q.id, { asked })
  }
  async function addQuestion(text) {
    const q = await interviewApi.addQuestion(interviewId, { text, category: '직접 추가' })
    state.questions.push(q)
    send({ type: 'question.added', questionId: q.id }) // Agent 가 이 질문도 말로 인식하도록 알린다
    return q
  }
  /** 꼬리질문 후보를 질문 목록에 올린다 */
  async function adoptFollowUp(item) {
    if (item.used) return
    item.used = true
    let q = null
    try {
      const saved = (await roomApi.followUps(room.value.id)).items.find((f) => String(f.clientId ?? f.id) === String(item.id))
      if (saved) q = await roomApi.useFollowUp(saved.id)
    } catch {
      q = null
    }
    q ||= await interviewApi.addQuestion(interviewId, { text: item.text, category: '꼬리질문' })
    if (!state.questions.some((x) => x.id === q.id)) state.questions.push(q)
    send({ type: 'question.added', questionId: q.id })
    return q
  }
  /**
   * 면접관이 제안된 꼬리질문을 누르지 않고 말로 물었다(Agent 의 followup.matched).
   * 누른 것과 똑같이 질문 목록에 올리고 "물었음"으로 표시한다.
   * 저장은 마이크를 보내는 단말 하나만 한다(여러 단말이 동시에 올려 질문이 겹치지 않게). 나머지는 잠시 뒤 목록을 다시 읽는다.
   */
  async function onFollowUpSpoken(e) {
    const item = state.followUps.flatMap((g) => g.items).find((f) => String(f.id) === String(e.id))
    if (!item) return
    try {
      if (!audioOwner.value) {
        item.used = true
        setTimeout(async () => {
          if (!disposed) state.questions = (await interviewApi.questions(interviewId)).items
        }, 1500)
        return
      }
      const q = (await adoptFollowUp(item)) || state.questions.find((x) => x.text === item.text)
      if (q && !q.asked) await toggleAsked(q)
    } catch {
      /* 자동 채택이 실패해도 면접은 계속된다. 면접관이 눌러서 올릴 수 있다 */
    }
  }

  onBeforeUnmount(() => {
    disposed = true
    disconnect()
  })

  return { state, room, connection, audioOwner, load, connect, disconnect, sendAudio, send, setRole, fixSpeaker, toggleAsked, addQuestion, adoptFollowUp }
}
