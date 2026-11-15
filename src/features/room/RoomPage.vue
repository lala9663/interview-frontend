<script setup>
// 면접 중: 한 화면(스크롤 없음)에 질문 · 대화 · 꼬리질문과 메모. 1366×768 노트북을 기준으로 잡았다.
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Mic, MicOff, Play, Square, TriangleAlert, Wifi, WifiOff } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import TranscriptPane from './TranscriptPane.vue'
import QuestionPane from './QuestionPane.vue'
import AssistPane from './AssistPane.vue'
import { useRoom } from './use-room.js'
import { statusNotice } from './room-state.js'
import { useMicrophone } from './use-microphone.js'
import { interviewApi, roomApi } from '@/api/index.js'
import { isMock } from '@/api/http.js'
import { useUi } from '@/stores/ui.js'
import { INTERVIEW_TYPE, labelOf } from '@/lib/labels.js'
import { clock } from '@/lib/format.js'

// 시연용 빌드에서만 싣는 설명 띠(지금 시스템이 하는 일, 멈춤·배속)
const DemoGuide = isMock && import.meta.env.VITE_DEMO_GUIDE === 'on' ? defineAsyncComponent(() => import('./DemoGuide.vue')) : null

const props = defineProps({ id: { type: [String, Number], required: true } })
const ui = useUi()
const router = useRouter()

const interview = ref(null)
const briefing = ref(null)
const evaluation = ref({ memo: '', scores: [], grade: null, submitted: false })
const phase = ref('loading') // loading | ready(시작 전) | live | ending
const role = ref('AUTO')
const confirmEnd = ref(false)
const startedAt = ref(null)
const now = ref(Date.now())
const saveState = ref('idle')
const requesting = ref(false)
// Agent의 audio.retention을 KEEP으로 바꾸면 이 값도 true로 맞춘다(안내 문구가 달라진다).
const keepsAudio = import.meta.env.VITE_AUDIO_KEEP === 'true'

const { state, room, connection, audioOwner, load, connect, disconnect, sendAudio, send, setRole, fixSpeaker, toggleAsked, addQuestion, adoptFollowUp } = useRoom(props.id)
// 파일로 여는 시연용 빌드(VITE_MOCK_MIC=off)는 마이크를 요청하지 않는다
const mic = useMicrophone((pcm) => sendAudio(pcm), { simulate: isMock && import.meta.env.VITE_MOCK_MIC === 'off' })

const elapsed = computed(() => (startedAt.value ? now.value - new Date(startedAt.value).getTime() : 0))
const planned = computed(() => (interview.value?.durationMinutes || 0) * 60000)
const overtime = computed(() => planned.value && elapsed.value > planned.value)
const live = computed(() => phase.value === 'live')
const roles = [
  { key: 'AUTO', label: '자동', hint: '말하는 사람을 자동으로 구분' },
  { key: 'INTERVIEWER', label: '면접관', hint: '지금부터 면접관의 말로 기록' },
  { key: 'CANDIDATE', label: '지원자', hint: '지금부터 지원자의 말로 기록' },
]

let ticker = null
onMounted(async () => {
  try {
    const [it, b, ev] = await Promise.all([
      interviewApi.get(props.id),
      interviewApi.briefing(props.id).catch(() => null),
      interviewApi.myEvaluation(props.id).catch(() => null),
    ])
    interview.value = it
    briefing.value = b
    if (ev) evaluation.value = { memo: ev.memo || '', scores: ev.scores || [], grade: ev.grade ?? null, submitted: !!ev.submitted }
    await load()
    if (room.value.status === 'ENDED') return router.replace({ name: 'review', params: { id: props.id } })
    if (room.value.status === 'LIVE') {
      startedAt.value = room.value.startedAt || new Date().toISOString()
      await goLive()
    } else {
      phase.value = 'ready'
    }
  } catch (e) {
    ui.fail(e)
    router.replace({ name: 'today' })
  }
  ticker = setInterval(() => (now.value = Date.now()), 1000)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearInterval(ticker)
  window.removeEventListener('keydown', onKey)
})

async function goLive() {
  phase.value = 'live'
  await connect()
  if (audioOwner.value) {
    const ok = await mic.start()
    // 모의 모드에서 마이크가 없으면 대본만 흘려보낸다
    if (!ok && isMock) sendAudio(new ArrayBuffer(0))
  }
}

async function start() {
  try {
    const r = await roomApi.start(room.value.id)
    startedAt.value = r.startedAt || new Date().toISOString()
    await goLive()
  } catch (e) {
    ui.fail(e)
  }
}

async function end() {
  confirmEnd.value = false
  phase.value = 'ending'
  mic.stop()
  await flushMemo()
  try {
    await roomApi.end(room.value.id)
    disconnect()
    router.replace({ name: 'review', params: { id: props.id } })
  } catch (e) {
    ui.fail(e)
    phase.value = 'live'
  }
}

function chooseRole(key) {
  role.value = key
  setRole(key)
}

async function adopt(item) {
  try {
    await adoptFollowUp(item)
    ui.toast('질문 목록에 올렸습니다.')
  } catch (e) {
    item.used = false
    ui.fail(e)
  }
}
function requestFollowUp() {
  requesting.value = true
  send({ type: 'followup.request' })
  setTimeout(() => (requesting.value = false), 4000)
}
watch(() => state.followUps[0]?.basedOnSeq, () => (requesting.value = false))

// 메모 자동 저장 (입력이 1초 멈추면)
let memoTimer = null
function onMemo(text) {
  evaluation.value.memo = text
  saveState.value = 'saving'
  clearTimeout(memoTimer)
  memoTimer = setTimeout(flushMemo, 1000)
}
async function flushMemo() {
  clearTimeout(memoTimer)
  if (saveState.value !== 'saving') return
  try {
    await interviewApi.saveMyEvaluation(props.id, evaluation.value)
    saveState.value = 'saved'
  } catch {
    saveState.value = 'error'
  }
}

function onKey(e) {
  if (!live.value || e.ctrlKey || e.metaKey) return
  const typing = ['INPUT', 'TEXTAREA'].includes(e.target.tagName)
  if (e.altKey && ['1', '2', '3'].includes(e.key)) {
    e.preventDefault()
    return chooseRole(roles[Number(e.key) - 1].key)
  }
  if (typing || e.altKey) return
  const item = state.followUps[0]?.items[Number(e.key) - 1]
  if (item && !item.used) adopt(item)
  if (e.key.toLowerCase() === 'm' && audioOwner.value) mic.toggleMute()
}

const notice = computed(() => {
  if (mic.error.value) return mic.error.value
  if (connection.value === 'reconnecting') return '서버와 연결이 끊겼습니다. 다시 연결하는 중입니다. 메모는 계속 쓸 수 있습니다.'
  const model = statusNotice(state.status)
  if (model) return model
  const last = state.notices[state.notices.length - 1]
  return last && Date.now() - last.at < 8000 ? last.message : ''
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-bg">
    <!-- 위쪽 줄 -->
    <header class="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
      <button class="btn btn-ghost btn-icon btn-sm" aria-label="나가기" title="나가기 (면접은 계속됩니다)" @click="router.push({ name: 'prep', params: { id } })"><ArrowLeft :size="18" /></button>
      <div v-if="interview" class="min-w-0 leading-tight">
        <p class="truncate font-bold">{{ interview.candidate.name }} <span class="font-medium text-sub">· {{ interview.candidate.jobTitle }}</span></p>
        <p class="text-[0.78rem] text-faint">{{ interview.seq }}차 {{ labelOf(INTERVIEW_TYPE, interview.type) }} · {{ interview.mode === 'ONLINE' ? '화상' : '대면' }}</p>
      </div>

      <div class="mx-auto flex items-center gap-3">
        <template v-if="live">
          <span class="badge tone-live">진행 중</span>
          <span class="text-[1.25rem] font-bold tabular-nums tracking-tight" :class="overtime ? 'text-bad' : ''" :title="`예정 ${interview?.durationMinutes}분`">{{ clock(elapsed) }}</span>
          <span class="text-[0.8rem] text-faint">/ {{ interview?.durationMinutes }}분</span>

          <div class="ml-3 flex items-center gap-0.5 rounded-md bg-sunken p-1" role="radiogroup" aria-label="지금 말하는 사람">
            <button
              v-for="(r, i) in roles"
              :key="r.key"
              class="flex h-7 items-center gap-1.5 rounded px-2.5 text-[0.86rem] font-semibold transition"
              :class="role === r.key ? 'bg-surface text-ink shadow-card' : 'text-sub hover:text-ink'"
              role="radio"
              :aria-checked="role === r.key"
              :title="`${r.hint} (Alt+${i + 1})`"
              @click="chooseRole(r.key)"
            >
              {{ r.label }}
            </button>
          </div>
        </template>
        <span v-else-if="phase === 'ready'" class="badge tone-brand">시작 전</span>
      </div>

      <div class="flex items-center gap-2">
        <template v-if="live">
          <span class="flex items-center gap-1 text-[0.8rem] font-medium" :class="connection === 'open' ? 'text-ok' : 'text-warn'" :title="`STT ${state.models.stt || '-'} · LLM ${state.models.llm || '-'}`">
            <Wifi v-if="connection === 'open'" :size="15" /><WifiOff v-else :size="15" />{{ connection === 'open' ? '연결됨' : '연결 중' }}
          </span>
          <button
            v-if="audioOwner"
            class="btn btn-sm gap-2"
            :class="mic.muted.value || !mic.active.value ? 'tone-bad border-transparent' : ''"
            :title="mic.muted.value ? '마이크 켜기 (M)' : '마이크 끄기 (M)'"
            @click="mic.active.value ? mic.toggleMute() : mic.start()"
          >
            <MicOff v-if="mic.muted.value || !mic.active.value" :size="15" /><Mic v-else :size="15" />
            <span class="flex h-3.5 w-14 items-end gap-[2px]" aria-hidden="true">
              <span v-for="n in 10" :key="n" class="w-1 rounded-sm transition-all" :class="mic.level.value * 10 >= n ? 'bg-ok' : 'bg-line'" :style="{ height: `${30 + n * 7}%` }" />
            </span>
          </button>
          <span v-else class="badge tone-neutral" title="다른 단말이 마이크를 보내고 있습니다">듣기 전용</span>
          <button class="btn btn-danger btn-sm" @click="confirmEnd = true"><Square :size="13" fill="currentColor" />면접 종료</button>
        </template>
      </div>
    </header>

    <p v-if="notice" class="flex shrink-0 items-center gap-2 bg-warn-soft px-4 py-1.5 text-[0.88rem] font-medium text-warn" role="status"><TriangleAlert :size="15" />{{ notice }}</p>

    <component :is="DemoGuide" v-if="DemoGuide && live" />

    <!-- 세 칸 -->
    <div v-if="phase !== 'loading'" class="grid min-h-0 flex-1 grid-cols-[minmax(250px,22%)_minmax(0,1fr)_minmax(280px,26%)] gap-px bg-line">
      <div class="flex min-h-0 flex-col bg-surface">
        <details v-if="briefing?.summary" class="group shrink-0 border-b border-line" open>
          <summary class="flex h-11 cursor-pointer list-none items-center justify-between px-3.5 text-[0.93rem] font-bold">
            지원자 요약 <span class="text-[0.76rem] font-medium text-faint group-open:hidden">펼치기</span><span class="hidden text-[0.76rem] font-medium text-faint group-open:inline">접기</span>
          </summary>
          <div class="max-h-[26vh] space-y-2 overflow-y-auto px-3.5 pb-3">
            <p class="text-[0.95rem] font-semibold leading-snug">{{ briefing.summary.headline }}</p>
            <ul class="space-y-1 text-[0.86rem] leading-snug text-sub">
              <li v-for="(x, i) in briefing.summary.checkPoints" :key="i" class="flex gap-1.5"><span class="font-bold text-warn">?</span>{{ x }}</li>
            </ul>
          </div>
        </details>
        <QuestionPane class="flex-1" :questions="state.questions" :highlight-id="state.lastMatchedQuestionId" @toggle="(q) => toggleAsked(q).catch((e) => ui.fail(e))" @add="(t) => addQuestion(t).catch((e) => ui.fail(e))" />
      </div>

      <div class="relative flex min-h-0 flex-col bg-surface">
        <TranscriptPane :utterances="state.utterances" :partial="state.partial" :questions="state.questions" :live="live" @fix-speaker="fixSpeaker" />

        <!-- 시작 전 덮개 -->
        <div v-if="phase === 'ready'" class="absolute inset-0 flex items-center justify-center bg-surface/85 backdrop-blur-sm">
          <div class="w-full max-w-md space-y-4 text-center">
            <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-brand-soft text-brand"><Mic :size="26" /></span>
            <div>
              <h2 class="text-xl font-bold tracking-tight">면접을 시작할 준비가 됐나요?</h2>
              <p class="mt-1 text-[0.93rem] leading-relaxed text-sub">시작하면 이 노트북의 마이크로 대화를 받아 적습니다.<br />{{ keepsAudio ? '녹음은 정해진 기간 동안 보관한 뒤 삭제합니다.' : '녹음 파일은 저장하지 않으며, 대화 내용만 글로 남깁니다.' }}</p>
            </div>
            <label class="mx-auto flex w-fit cursor-pointer items-center gap-2 text-[0.9rem] font-medium">
              <input v-model="audioOwner" type="checkbox" class="h-4 w-4 accent-[rgb(var(--brand))]" />이 노트북의 마이크를 사용
            </label>
            <p v-if="!audioOwner" class="text-[0.84rem] text-faint">다른 면접관의 노트북이 마이크를 맡습니다. 이 화면에서는 대화와 꼬리질문만 봅니다.</p>
            <button class="btn btn-primary btn-lg mx-auto" @click="start"><Play :size="18" fill="currentColor" />면접 시작</button>
          </div>
        </div>
        <div v-if="phase === 'ending'" class="absolute inset-0 flex items-center justify-center bg-surface/85 backdrop-blur-sm">
          <p class="font-semibold text-sub">면접을 마무리하는 중입니다…</p>
        </div>
      </div>

      <AssistPane class="bg-surface" :follow-ups="state.followUps" :memo="evaluation.memo" :save-state="saveState" :busy="requesting" :readonly="phase === 'ending'" @adopt="adopt" @request="requestFollowUp" @update:memo="onMemo" />
    </div>
    <div v-else class="flex flex-1 items-center justify-center text-sub">면접 방을 여는 중입니다…</div>

    <Modal v-if="confirmEnd" title="면접을 종료할까요?" @close="confirmEnd = false">
      <p class="leading-relaxed text-sub">종료하면 마이크가 꺼지고, 지금까지의 대화로 <b class="text-ink">AI 참고 평가와 보고서 초안</b>을 만듭니다. 종료한 뒤에는 이 방에서 다시 녹취할 수 없습니다.</p>
      <template #footer>
        <button class="btn" @click="confirmEnd = false">계속 진행</button>
        <button class="btn btn-danger" @click="end">면접 종료</button>
      </template>
    </Modal>
  </div>
</template>
