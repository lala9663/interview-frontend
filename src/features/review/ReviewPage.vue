<script setup>
// 면접 후: 왼쪽에 AI가 만든 것(보고서 · 참고 평가 · 대화 기록)과 물은 질문, 오른쪽에 내 평가.
// 보고서는 실시간 전사 기반 초안이 먼저 오고, 사후 STT가 끝나면 보정본으로 바뀐다.
import { computed, nextTick, onMounted, ref } from 'vue'
import { Bot, FileText, ListChecks, MessagesSquare, RefreshCw, Sparkles } from 'lucide-vue-next'
import InterviewHeader from '@/components/InterviewHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ReportView from './ReportView.vue'
import MyEvaluationPanel from './MyEvaluationPanel.vue'
import AskedQuestionsPanel from './AskedQuestionsPanel.vue'
import TranscriptPane from '@/features/room/TranscriptPane.vue'
import { interviewApi, roomApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { usePolling } from '@/lib/poll.js'
import { REPORT_BASIS, labelOf, toneOf } from '@/lib/labels.js'
import { ago } from '@/lib/format.js'

const props = defineProps({ id: { type: [String, Number], required: true } })
const ui = useUi()

const interview = ref(null)
const report = ref(null)
const ai = ref(null)
const criteria = ref([])
const utterances = ref([])
const questions = ref([])
const tab = ref('report')
const tabs = [
  { key: 'report', label: '보고서', icon: FileText },
  { key: 'ai', label: 'AI 참고 평가', icon: Bot },
  { key: 'talk', label: '대화 기록', icon: MessagesSquare },
  { key: 'asked', label: '물은 질문', icon: ListChecks },
]

const reportReady = computed(() => report.value?.status === 'SUCCEEDED' && report.value.content)
const reportRunning = computed(() => ['PENDING', 'RUNNING'].includes(report.value?.status) || (interview.value?.roomStatus === 'ENDED' && !report.value?.status))
const waitingRefined = computed(() => reportReady.value && report.value.basis === 'LIVE')
const aiReady = computed(() => ai.value?.status === 'SUCCEEDED')

async function loadAi() {
  const [r, a] = await Promise.all([interviewApi.report(props.id).catch(() => null), interviewApi.aiEvaluation(props.id).catch(() => null)])
  const before = report.value
  report.value = r
  ai.value = a
  if (before?.basis === 'LIVE' && r?.basis === 'REFINED') {
    ui.toast('보고서가 보정본으로 갱신됐습니다.', 'ok')
    loadTalk()
  }
}
async function loadTalk() {
  if (!interview.value?.roomId) return
  utterances.value = (await roomApi.utterances(interview.value.roomId, 0)).items
}
async function load() {
  const [it, cs, qs] = await Promise.all([interviewApi.get(props.id), interviewApi.criteria(props.id), interviewApi.questions(props.id)])
  interview.value = it
  criteria.value = cs.items
  questions.value = qs.items
  await Promise.all([loadAi(), loadTalk()])
}
onMounted(() => load().catch((e) => ui.fail(e)))
// 초안을 기다리는 동안은 자주, 보정본을 기다리는 동안은 천천히 확인한다
usePolling(loadAi, { interval: 2500, when: () => reportRunning.value || !aiReady.value })
usePolling(loadAi, { interval: 10000, when: () => waitingRefined.value })

async function regenerate() {
  try {
    await interviewApi.regenerateReport(props.id)
    report.value = { ...(report.value || {}), status: 'RUNNING' }
  } catch (e) {
    ui.fail(e)
  }
}

function jump(seq) {
  tab.value = 'talk'
  nextTick(() => document.querySelector(`[data-seq-anchor="${seq}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
}
const evidence = (seqs) => utterances.value.filter((u) => seqs?.includes(u.seq))
</script>

<template>
  <div v-if="interview" class="space-y-4">
    <InterviewHeader :interview="interview" current="review" />

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section class="card min-w-0">
        <div class="flex items-center justify-between border-b border-line px-2">
          <div class="flex" role="tablist">
            <button v-for="t in tabs" :key="t.key" class="tab" :class="{ 'tab-on': tab === t.key }" role="tab" :aria-selected="tab === t.key" @click="tab = t.key">
              <component :is="t.icon" :size="16" />{{ t.label }}
            </button>
          </div>
          <div v-if="tab === 'report' && reportReady" class="flex items-center gap-2 pr-2">
            <span class="badge" :class="`tone-${toneOf(REPORT_BASIS, report.basis)}`">v{{ report.version }} · {{ labelOf(REPORT_BASIS, report.basis) }}</span>
            <span class="text-[0.8rem] text-faint">{{ ago(report.generatedAt) }}</span>
            <button class="btn btn-ghost btn-sm btn-icon" title="다시 만들기" aria-label="보고서 다시 만들기" @click="regenerate"><RefreshCw :size="15" /></button>
          </div>
        </div>

        <!-- 보고서 -->
        <div v-show="tab === 'report'" class="p-5">
          <div v-if="reportRunning && !reportReady" class="space-y-3">
            <p class="flex items-center gap-2 font-semibold text-brand"><RefreshCw :size="16" class="animate-spin" />보고서를 만드는 중입니다…</p>
            <p class="text-[0.9rem] text-sub">{{ interview.track === 'NEW_GRAD' ? '보통 1~2분 안에 초안이 나옵니다. 그동안 오른쪽에서 평가를 적어 두세요.' : '상세 보고서는 시간이 걸립니다. 다른 화면으로 가도 계속 만들어집니다.' }}</p>
            <div v-for="n in 6" :key="n" class="h-4 animate-pulse rounded bg-sunken" :style="{ width: `${96 - n * 8}%` }" />
          </div>
          <EmptyState v-else-if="!reportReady" title="아직 보고서가 없습니다" :hint="report?.status === 'FAILED' ? '보고서를 만들지 못했습니다. 다시 시도해 주세요.' : '면접이 끝나면 대화 내용으로 보고서를 만듭니다.'">
            <template #icon><FileText :size="22" /></template>
            <button v-if="interview.roomStatus === 'ENDED'" class="btn btn-primary" @click="regenerate"><Sparkles :size="16" />보고서 만들기</button>
          </EmptyState>
          <template v-else>
            <p v-if="waitingRefined" class="mb-4 flex items-center gap-2 border-l-2 border-warn py-0.5 pl-3.5 text-[0.9rem] font-medium text-warn">
              <RefreshCw :size="15" class="animate-spin" />실시간 전사로 만든 초안입니다. 녹취를 다시 정리한 보정본이 준비되면 자동으로 바뀝니다.
            </p>
            <ReportView :content="report.content" @jump="jump" />
            <p class="mt-5 border-t border-line pt-3 text-[0.8rem] text-faint">AI가 만든 참고 자료입니다. 합격 여부는 면접관이 판단합니다. · {{ report.model }}</p>
          </template>
        </div>

        <!-- AI 참고 평가 -->
        <div v-show="tab === 'ai'" class="p-5">
          <p v-if="!aiReady" class="flex items-center gap-2 py-6 font-semibold text-sub"><RefreshCw v-if="interview.roomStatus === 'ENDED'" :size="16" class="animate-spin" />{{ interview.roomStatus === 'ENDED' ? 'AI 참고 평가를 만드는 중입니다…' : '면접이 끝나면 만들어집니다.' }}</p>
          <div v-else class="space-y-4">
            <p class="leading-relaxed text-sub">{{ ai.overallComment }}</p>
            <div v-for="s in ai.scores" :key="s.criterionCode" class="border-b border-line pb-4 last:border-0">
              <div class="flex items-center justify-between gap-3">
                <p class="font-semibold">{{ s.criterionName || criteria.find((c) => c.code === s.criterionCode)?.name || s.criterionCode }}</p>
                <div v-if="s.score" class="flex items-center gap-2">
                  <div class="flex gap-1"><span v-for="n in s.maxScore || 5" :key="n" class="h-1.5 w-6 rounded-sm" :class="n <= s.score ? 'bg-brand' : 'bg-sunken'" /></div>
                  <span class="w-9 text-right font-bold tabular-nums">{{ s.score }}<span class="text-[0.8rem] font-medium text-faint">/{{ s.maxScore || 5 }}</span></span>
                </div>
                <span v-else class="badge tone-neutral">근거 부족</span>
              </div>
              <p class="mt-1.5 leading-relaxed text-sub">{{ s.rationale }}</p>
              <button v-for="u in evidence(s.evidenceSeqs)" :key="u.seq" class="mt-2 block w-full rounded border-l-2 border-brand/40 bg-sunken/60 px-3 py-1.5 text-left text-[0.88rem] text-sub hover:bg-sunken" @click="jump(u.seq)">
                “{{ u.refinedText || u.rawText }}”
              </button>
            </div>
            <p class="text-[0.8rem] text-faint">참고용 점수입니다. 내 점수와 합산하지 않습니다. · {{ ai.model }}</p>
          </div>
        </div>

        <!-- 대화 기록 -->
        <div v-show="tab === 'talk'" class="flex h-[62vh] flex-col">
          <TranscriptPane :utterances="utterances" :questions="questions" readonly />
        </div>

        <!-- 물은 질문: 잘 쓰인 질문을 은행에 담는다 -->
        <div v-show="tab === 'asked'" class="p-5">
          <AskedQuestionsPanel :questions="questions" />
        </div>
      </section>

      <MyEvaluationPanel class="lg:sticky lg:top-0" :interview-id="id" :criteria="criteria" :ai-scores="ai?.scores || []" @submitted="load" />
    </div>
  </div>
  <div v-else class="space-y-3"><div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-lg bg-sunken" /></div>
</template>
