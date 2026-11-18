<script setup>
// 면접 전: 면접관이 2~3분 안에 읽는 사전 리포트(요약)와 준비된 질문.
// 자기소개를 시켜 놓고 이력서를 읽던 시간을 대신한다.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle2, CornerDownRight, EyeOff, HelpCircle, ListTree, Mic, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-vue-next'
import InterviewHeader from '@/components/InterviewHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import PersonaPicker from './PersonaPicker.vue'
import { interviewApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { usePolling } from '@/lib/poll.js'
import { BLIND_FIELD, QUESTION_SOURCE, labelOf, toneOf } from '@/lib/labels.js'
import { ago } from '@/lib/format.js'
import { has, liveLocked } from '@/lib/features.js'

const props = defineProps({ id: { type: [String, Number], required: true } })
const ui = useUi()
const router = useRouter()

const interview = ref(null)
const briefing = ref(null)
const questions = ref([])
const newQuestion = ref('')
const sourceFilter = ref('')

// 11/18 회의 반영: 질문을 하나씩 빼거나 더하지 않고 전체를 다시 만든다. 신입은 질문마다 예상 꼬리질문이 가지로 붙는다.
const regenerateOnly = has('feedback1118')
const locked = computed(() => liveLocked(interview.value?.track))
const generating = computed(() => ['PENDING', 'RUNNING'].includes(briefing.value?.status))
// 가지(예상 꼬리질문)는 부모 질문 아래에 보여 주므로 목록과 출처 탭에서는 뺀다
const roots = computed(() => questions.value.filter((q) => !q.hidden && !q.parentQuestionId))
const visible = computed(() => roots.value.filter((q) => !sourceFilter.value || q.source === sourceFilter.value))
const sources = computed(() => [...new Set(roots.value.map((q) => q.source))])
const childrenOf = (q) => questions.value.filter((x) => !x.hidden && x.parentQuestionId === q.id)
const canEnter = computed(() => ['SCHEDULED', 'IN_PROGRESS'].includes(interview.value?.status))

async function load() {
  const [it, b, qs] = await Promise.all([interviewApi.get(props.id), interviewApi.briefing(props.id), interviewApi.questions(props.id)])
  interview.value = it
  briefing.value = b
  questions.value = qs.items
}
onMounted(() => load().catch((e) => ui.fail(e)))
usePolling(load, { interval: 2000, when: () => generating.value })

async function generate() {
  try {
    await interviewApi.generateBriefing(props.id)
    briefing.value = { ...(briefing.value || {}), status: 'RUNNING' }
  } catch (e) {
    ui.fail(e)
  }
}
async function addQuestion() {
  const text = newQuestion.value.trim()
  if (!text) return
  try {
    questions.value.push(await interviewApi.addQuestion(props.id, { text, category: '직접 추가' }))
    newQuestion.value = ''
  } catch (e) {
    ui.fail(e)
  }
}
async function hide(q) {
  try {
    await interviewApi.patchQuestion(q.id, { hidden: true })
    q.hidden = true
  } catch (e) {
    ui.fail(e)
  }
}
</script>

<template>
  <div v-if="interview" class="space-y-4">
    <InterviewHeader :interview="interview" current="prep" />

    <PersonaPicker v-if="has('persona') && interview.persona" :interview="interview" @changed="load().catch((e) => ui.fail(e))" />

    <div class="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <!-- 사전 리포트 -->
      <section class="flex flex-col">
        <header class="flex h-11 items-center justify-between border-b border-line">
          <h2 class="h-sec flex items-center gap-2"><Sparkles :size="16" class="text-faint" />사전 리포트</h2>
          <div class="flex items-center gap-2">
            <span v-if="briefing?.generatedAt" class="text-[0.8rem] text-faint">{{ ago(briefing.generatedAt) }} 생성</span>
            <button class="btn btn-sm btn-ghost" :disabled="generating" @click="generate"><RefreshCw :size="14" :class="{ 'animate-spin': generating }" />다시 만들기</button>
          </div>
        </header>

        <div v-if="generating" class="space-y-3 py-4">
          <p class="flex items-center gap-2 font-semibold text-brand"><RefreshCw :size="16" class="animate-spin" />이력서를 읽고 요약하는 중입니다…</p>
          <div v-for="n in 5" :key="n" class="h-4 animate-pulse rounded bg-sunken" :style="{ width: `${95 - n * 9}%` }" />
        </div>
        <EmptyState v-else-if="!briefing?.summary" title="아직 사전 리포트가 없습니다" hint="이력서와 JD를 읽고 면접관 시점으로 요약합니다. 30초쯤 걸립니다.">
          <template #icon><Sparkles :size="22" /></template>
          <button class="btn btn-primary" @click="generate"><Sparkles :size="16" />사전 리포트 만들기</button>
        </EmptyState>
        <div v-else class="space-y-5 py-4">
          <p class="text-[1.15rem] font-bold leading-snug tracking-tight">{{ briefing.summary.headline }}</p>
          <div>
            <p class="label mb-1.5">핵심</p>
            <ul class="space-y-1.5">
              <li v-for="(x, i) in briefing.summary.keyPoints" :key="i" class="flex gap-2 leading-relaxed"><span class="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{{ x }}</li>
            </ul>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="border-l-2 border-ok pl-3.5">
              <p class="mb-1.5 flex items-center gap-1.5 text-[0.84rem] font-bold text-ok"><CheckCircle2 :size="15" />강점</p>
              <ul class="space-y-1 text-[0.93rem] leading-relaxed"><li v-for="(x, i) in briefing.summary.strengths" :key="i">{{ x }}</li></ul>
            </div>
            <div class="border-l-2 border-warn pl-3.5">
              <p class="mb-1.5 flex items-center gap-1.5 text-[0.84rem] font-bold text-warn"><HelpCircle :size="15" />확인할 점</p>
              <ul class="space-y-1 text-[0.93rem] leading-relaxed"><li v-for="(x, i) in briefing.summary.checkPoints" :key="i">{{ x }}</li></ul>
            </div>
          </div>
          <div v-if="briefing.summary.timeline?.length">
            <p class="label mb-1.5">이력</p>
            <ul class="space-y-1.5">
              <li v-for="(t, i) in briefing.summary.timeline" :key="i" class="flex gap-3 text-[0.93rem]"><span class="w-36 shrink-0 font-medium text-faint">{{ t.period }}</span><span>{{ t.text }}</span></li>
            </ul>
          </div>
          <p v-if="briefing.excluded?.length" class="flex items-center gap-1.5 border-t border-line pt-3 text-[0.82rem] text-faint">
            <EyeOff :size="14" />요약과 질문에서 제외한 항목: {{ briefing.excluded.map((f) => BLIND_FIELD[f] || f).join(', ') }}
          </p>
        </div>
      </section>

      <!-- 질문 -->
      <section class="flex flex-col">
        <header class="flex h-11 items-center justify-between border-b border-line">
          <h2 class="h-sec">준비된 질문 <span class="ml-1 text-[0.9rem] font-semibold text-faint">{{ visible.length }}</span></h2>
          <div class="flex items-center self-end">
            <button v-if="regenerateOnly" class="btn btn-sm btn-ghost mr-1" :disabled="generating" title="사전 리포트와 질문을 처음부터 다시 만듭니다" @click="generate"><RefreshCw :size="14" :class="{ 'animate-spin': generating }" />질문 전체 다시 만들기</button>
            <button class="tab h-9 px-2.5 text-[0.86rem]" :class="{ 'tab-on': sourceFilter === '' }" @click="sourceFilter = ''">전체</button>
            <button v-for="s in sources" :key="s" class="tab h-9 px-2.5 text-[0.86rem]" :class="{ 'tab-on': sourceFilter === s }" @click="sourceFilter = s">{{ labelOf(QUESTION_SOURCE, s) }}</button>
          </div>
        </header>
        <ol class="flex-1 divide-y divide-line">
          <li v-for="(q, i) in visible" :key="q.id" class="group flex gap-3 px-1 py-3">
            <span class="mt-0.5 w-5 shrink-0 text-right text-[0.9rem] font-bold text-faint">{{ i + 1 }}</span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold leading-snug">{{ q.text }}</p>
              <p class="mt-1 flex flex-wrap items-center gap-1.5 text-[0.82rem] text-faint">
                <span class="badge h-5 px-2 text-[0.74rem]" :class="`tone-${toneOf(QUESTION_SOURCE, q.source)}`">{{ labelOf(QUESTION_SOURCE, q.source) }}</span>
                {{ q.category }}<template v-if="q.intent"> · {{ q.intent }}</template>
              </p>
              <ul v-if="childrenOf(q).length" class="mt-2 space-y-1 border-l-2 border-line pl-3" aria-label="예상 꼬리질문">
                <li v-for="c in childrenOf(q)" :key="c.id" class="flex items-start gap-1.5 text-[0.9rem] leading-snug text-sub"><CornerDownRight :size="13" class="mt-1 shrink-0 text-faint" />{{ c.text }}</li>
              </ul>
            </div>
            <button v-if="!regenerateOnly" class="btn btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label="이 질문 빼기" title="이 질문 빼기" @click="hide(q)"><Trash2 :size="15" /></button>
          </li>
          <li v-if="!visible.length" class="px-4 py-8 text-center text-[0.9rem] text-sub">사전 리포트를 만들면 질문도 함께 준비됩니다.</li>
        </ol>
        <p v-if="regenerateOnly" class="border-t border-line pt-3 text-[0.82rem] leading-relaxed text-faint">
          {{ locked ? '질문마다 예상 꼬리질문을 미리 만들어 두었습니다. 면접 중에는 녹음과 꼬리질문 제안을 쓰지 않습니다.' : '면접 중에는 답변에 맞춰 꼬리질문을 그 질문 아래에 제안합니다.' }}
          질문이 맞지 않으면 전체를 다시 만들어 주세요. 도움이 됐는지는 면접이 끝난 화면에서 남깁니다.
        </p>
        <form v-else class="flex gap-2 border-t border-line pt-3" @submit.prevent="addQuestion">
          <input v-model="newQuestion" class="input" placeholder="직접 물어볼 질문 추가" aria-label="질문 추가" />
          <button class="btn" :disabled="!newQuestion.trim()"><Plus :size="16" />추가</button>
        </form>
      </section>
    </div>

    <div v-if="canEnter" class="sticky bottom-4 flex justify-end">
      <button class="btn btn-primary btn-lg shadow-pop" @click="router.push({ name: 'room', params: { id: interview.id } })"><ListTree v-if="locked" :size="18" /><Mic v-else :size="18" />{{ locked ? '질문 화면 열기' : '면접 방 입장' }}</button>
    </div>
  </div>
  <div v-else class="space-y-3"><div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-lg bg-sunken" /></div>
</template>
