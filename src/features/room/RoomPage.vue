<script setup>
// 면접 중: 한 화면(스크롤 없음)에 질문 · 대화 · 꼬리질문과 메모. 1366×768 노트북을 기준으로 잡았다.
// 배치는 두 가지다. 11/18 회의 반영(feedback1118): 가운데에 질문과 꼬리질문 나무, 왼쪽에 요약과 메모, 대화는 접어 둔다.
// 그 전(3주 차 목업): 왼쪽 질문 · 가운데 대화 · 오른쪽 꼬리질문과 메모.
// 신입(대면)은 실시간 기능이 잠겨 있어(liveLocked) 마이크와 Agent 연결 없이 질문 화면으로만 쓴다.
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, AudioLines, ListTree, Lock, Mic, MicOff, NotebookPen, PanelRightClose, PanelRightOpen, Play, Square, TriangleAlert, Wifi, WifiOff } from 'lucide-vue-next'
import Modal from '@/components/Modal.vue'
import TranscriptPane from './TranscriptPane.vue'
import QuestionPane from './QuestionPane.vue'
import AssistPane from './AssistPane.vue'
import QuestionTreePane from './QuestionTreePane.vue'
import CandidateBrief from './CandidateBrief.vue'
import { useRoom } from './use-room.js'
import { statusNotice } from './room-state.js'
import { useMicrophone } from './use-microphone.js'
import { interviewApi, roomApi } from '@/api/index.js'
import { isMock } from '@/api/http.js'
import { useUi } from '@/stores/ui.js'
import { INTERVIEW_TYPE, SPEAKER, labelOf } from '@/lib/labels.js'
import { has, liveLocked } from '@/lib/features.js'
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
// 11/18 회의 반영: 질문·꼬리질문 나무가 가운데인 배치. 대화는 접어 두고 필요할 때 펼친다.
const treeLayout = has('feedback1118')
const talkOpen = ref(false)
// 실시간 기능(녹음, 전사, 꼬리질문 제안)이 잠긴 면접인가
const locked = computed(() => liveLocked(interview.value))
const online = computed(() => interview.value?.mode === 'ONLINE')
// 접힌 대화 대신 가운데 아래에 한 줄로 보여 줄 "방금 들은 말"
const lastHeard = computed(() => {
  if (state.partial) return { speaker: null, text: state.partial.text, partial: true }
  const u = state.utterances[state.utterances.length - 1]
  return u ? { speaker: u.speaker, text: u.refinedText || u.rawText, partial: false } : null
})
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
  if (locked.value) return // 잠긴 면접은 마이크도 Agent 연결도 쓰지 않는다
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
/** 지원자 요약의 확인할 점에서 연결된 질문을 누르면 가운데 칸의 그 질문으로 가서 잠깐 표시한다 */
function jumpToQuestion(id) {
  const el = document.querySelector(`[data-qid="${id}"]`)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.classList.add('ring-2', 'ring-warn')
  setTimeout(() => el.classList.remove('ring-2', 'ring-warn'), 1600)
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
  if (locked.value) return
  const item = state.followUps[0]?.items[Number(e.key) - 1]
  if (item && !item.used) adopt(item)
  if (e.key.toLowerCase() === 'm' && audioOwner.value) mic.toggleMute()
}

const notice = computed(() => {
  if (locked.value) return ''
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
        <p class="text-[0.78rem] text-faint">{{ interview.seq }}차 {{ labelOf(INTERVIEW_TYPE, interview.type) }} · {{ interview.mode === 'ONLINE' ? '화상' : '대면' }}<template v-if="interview.persona"> · {{ interview.persona.name }}</template></p>
      </div>

      <div class="mx-auto flex items-center gap-3">
        <template v-if="live">
          <span class="badge tone-live">진행 중</span>
          <span class="text-[1.25rem] font-bold tabular-nums tracking-tight" :class="overtime ? 'text-bad' : ''" :title="`예정 ${interview?.durationMinutes}분`">{{ clock(elapsed) }}</span>
          <span class="text-[0.8rem] text-faint">/ {{ interview?.durationMinutes }}분</span>

          <div v-if="!locked" class="ml-3 flex items-center gap-0.5 rounded-md bg-sunken p-1" role="radiogroup" aria-label="지금 말하는 사람">
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
        <template v-if="live && locked">
          <span class="badge tone-neutral gap-1" title="이 면접은 실시간 녹음과 꼬리질문 제안을 쓰지 않습니다"><Lock :size="12" />실시간 기록 잠김</span>
          <button class="btn btn-danger btn-sm" @click="confirmEnd = true"><Square :size="13" fill="currentColor" />면접 종료</button>
        </template>
        <template v-else-if="live">
          <button v-if="treeLayout" class="btn btn-sm" :aria-pressed="talkOpen" @click="talkOpen = !talkOpen">
            <PanelRightClose v-if="talkOpen" :size="15" /><PanelRightOpen v-else :size="15" />{{ talkOpen ? '대화 접기' : '대화 펼치기' }}
          </button>
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

    <component :is="DemoGuide" v-if="DemoGuide && live && !locked" />

    <!-- 11/18 회의 반영: 왼쪽 요약·메모 / 가운데 질문과 꼬리질문 / (펼쳤을 때) 오른쪽 대화 -->
    <div
      v-if="phase !== 'loading' && treeLayout"
      class="grid min-h-0 flex-1 gap-px bg-line"
      :class="talkOpen && !locked ? 'grid-cols-[minmax(230px,20%)_minmax(0,1fr)_minmax(300px,30%)]' : 'grid-cols-[minmax(260px,24%)_minmax(0,1fr)]'"
    >
      <div class="flex min-h-0 flex-col bg-surface">
        <CandidateBrief v-if="briefing?.summary" :briefing="briefing" :questions="state.questions" @jump="jumpToQuestion" />
        <section class="flex min-h-0 flex-1 flex-col">
          <header class="flex h-10 shrink-0 items-center justify-between px-3.5">
            <h2 class="flex items-center gap-2 text-[0.93rem] font-bold"><NotebookPen :size="16" class="text-faint" />내 메모</h2>
            <span class="text-[0.76rem]" :class="saveState === 'error' ? 'text-bad' : 'text-faint'">{{ { saving: '저장하는 중…', saved: '저장됨', error: '저장 실패' }[saveState] || '자동 저장' }}</span>
          </header>
          <textarea
            class="min-h-0 flex-1 resize-none bg-transparent px-3.5 pb-3 text-[0.95rem] leading-relaxed placeholder:text-faint focus:outline-none"
            placeholder="면접 중 떠오른 것을 적어 두세요. 나만 볼 수 있고, 면접 후 평가 화면에 그대로 이어집니다."
            aria-label="내 메모"
            :value="evaluation.memo"
            :readonly="phase === 'ending'"
            @input="onMemo($event.target.value)"
          />
        </section>
      </div>

      <div class="relative flex min-h-0 flex-col bg-surface">
        <QuestionTreePane
          class="flex-1"
          :questions="state.questions"
          :follow-ups="state.followUps"
          :utterances="state.utterances"
          :busy="requesting"
          :locked="locked"
          :readonly="phase === 'ending'"
          @toggle="(q) => toggleAsked(q).catch((e) => ui.fail(e))"
          @adopt="adopt"
          @request="requestFollowUp"
          @add="(t) => addQuestion(t).catch((e) => ui.fail(e))"
        />
        <!-- 대화를 접어 둔 동안: 방금 들은 말 한 줄 -->
        <button v-if="live && !locked && !talkOpen" class="flex h-10 shrink-0 items-center gap-2.5 border-t border-line bg-sunken/60 px-4 text-left hover:bg-sunken" title="대화 펼치기" @click="talkOpen = true">
          <AudioLines :size="15" class="shrink-0 text-faint" />
          <template v-if="lastHeard">
            <span v-if="lastHeard.partial" class="flex shrink-0 gap-0.5"><span v-for="n in 3" :key="n" class="h-1.5 w-1.5 animate-dot rounded-full bg-brand" :style="{ animationDelay: `${n * 0.18}s` }" /></span>
            <span v-else class="badge h-[20px] shrink-0 px-2 text-[0.74rem]" :class="lastHeard.speaker === 'CANDIDATE' ? 'tone-brand' : 'tone-neutral'">{{ SPEAKER[lastHeard.speaker]?.label || '미확인' }}</span>
            <span class="min-w-0 flex-1 truncate text-[0.9rem]" :class="lastHeard.partial ? 'text-faint' : 'text-sub'">{{ lastHeard.text }}</span>
          </template>
          <span v-else class="min-w-0 flex-1 truncate text-[0.88rem] text-faint">말을 시작하면 여기에 방금 들은 말이 한 줄로 나옵니다</span>
          <span class="shrink-0 text-[0.78rem] font-semibold text-sub">대화 펼치기</span>
        </button>

        <!-- 시작 전 덮개 -->
        <div v-if="phase === 'ready'" class="absolute inset-0 flex items-center justify-center bg-surface/85 backdrop-blur-sm">
          <div v-if="locked" class="w-full max-w-md space-y-4 text-center">
            <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-brand-soft text-brand"><ListTree :size="26" /></span>
            <div>
              <h2 class="text-xl font-bold tracking-tight">면접을 시작할 준비가 됐나요?</h2>
              <p class="mt-1 text-[0.93rem] leading-relaxed text-sub">이 면접은 녹음과 실시간 꼬리질문 제안을 쓰지 않습니다.<br />준비된 질문을 보면서 진행하고, 물은 질문은 눌러서 표시합니다.</p>
            </div>
            <button class="btn btn-primary btn-lg mx-auto" @click="start"><Play :size="18" fill="currentColor" />면접 시작</button>
          </div>
          <div v-else class="w-full max-w-md space-y-4 text-center">
            <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-brand-soft text-brand"><Mic :size="26" /></span>
            <div>
              <h2 class="text-xl font-bold tracking-tight">면접을 시작할 준비가 됐나요?</h2>
              <p v-if="online" class="mt-1 text-[0.93rem] leading-relaxed text-sub">시작하면 화상 면접의 대화를 받아 적고, 답변이 끝날 때마다 꼬리질문을 제안합니다.<br />화상 회의의 소리를 받는 방식은 아직 확인 중입니다.</p>
              <p v-else class="mt-1 text-[0.93rem] leading-relaxed text-sub">시작하면 이 노트북의 마이크로 대화를 받아 적습니다.<br />{{ keepsAudio ? '녹음은 정해진 기간 동안 보관한 뒤 삭제합니다.' : '녹음 파일은 저장하지 않으며, 대화 내용만 글로 남깁니다.' }}</p>
            </div>
            <label v-if="!online" class="mx-auto flex w-fit cursor-pointer items-center gap-2 text-[0.9rem] font-medium">
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

      <div v-if="talkOpen && !locked" class="flex min-h-0 flex-col bg-surface">
        <TranscriptPane :utterances="state.utterances" :partial="state.partial" :questions="state.questions" :live="live" @fix-speaker="fixSpeaker" />
      </div>
    </div>

    <!-- 3주 차 목업의 세 칸 -->
    <div v-else-if="phase !== 'loading'" class="grid min-h-0 flex-1 grid-cols-[minmax(250px,22%)_minmax(0,1fr)_minmax(280px,26%)] gap-px bg-line">
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
      <p v-if="locked" class="leading-relaxed text-sub">종료하면 평가 화면으로 넘어갑니다. 실시간 기록이 없는 면접이라 보고서는 만들지 않습니다.</p>
      <p v-else class="leading-relaxed text-sub">종료하면 마이크가 꺼지고, 지금까지의 대화로 <b class="text-ink">{{ has('aiEvaluation') && !treeLayout ? 'AI 참고 평가와 보고서 초안' : '보고서 초안' }}</b>을 만듭니다. 종료한 뒤에는 이 방에서 다시 녹취할 수 없습니다.</p>
      <template #footer>
        <button class="btn" @click="confirmEnd = false">계속 진행</button>
        <button class="btn btn-danger" @click="end">면접 종료</button>
      </template>
    </Modal>
  </div>
</template>
