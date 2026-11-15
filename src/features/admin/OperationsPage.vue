<script setup>
// 관리 > 운영 현황: 오늘의 면접 방을 한 화면에서 본다(동시 20개 이상을 가정).
// 확인이 필요한 방(시작 지연, 시간 초과, 마이크·전사 문제)이 맨 앞에 온다. 10초마다 다시 읽는다.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Activity, AlertTriangle, CheckCircle2, Mic, MicOff, RefreshCw } from 'lucide-vue-next'
import AdminTabs from './AdminTabs.vue'
import EmptyState from '@/components/EmptyState.vue'
import { adminApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { usePolling } from '@/lib/poll.js'
import { hm } from '@/lib/format.js'
import { INTERVIEW_STATUS, INTERVIEW_TYPE, labelOf } from '@/lib/labels.js'

const ui = useUi()
const router = useRouter()

// 계약 2.11의 alerts 값 → 화면 문구. tone은 심각도(bad: 지금 손써야 함, warn: 지켜볼 것)
// 60분이 넘으면 "1시간 20분"처럼 적는다
const span = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`)
const ALERT = {
  NOT_STARTED: { tone: 'warn', text: (r) => `시작 ${span(r.lateMinutes)} 지연` },
  OVERTIME: { tone: 'warn', text: (r) => `${span(r.overtimeMinutes)} 초과` },
  NO_AUDIO: { tone: 'bad', text: () => '마이크 연결 없음' },
  SILENT: { tone: 'bad', text: (r) => `${span(r.silentMinutes)}째 전사 없음` },
  STT_BACKLOG: { tone: 'warn', text: (r) => (r.droppedChunks ? `전사 밀림 · ${r.droppedChunks}구간 건너뜀` : '전사 밀림') },
  JOB_FAILED: { tone: 'bad', text: () => 'AI 작업 실패' },
  AGENT_DOWN: { tone: 'bad', text: () => 'AI 서버 연결 안 됨' },
}
const PROVIDER = { 'stt.live': '실시간 전사', 'stt.post': '사후 전사', 'llm.fast': 'LLM(면접 중)', 'llm.quality': 'LLM(보고서)' }

const data = ref(null)
const loading = ref(true)
const view = ref('ALL')
const loadedAt = ref(null)

async function load() {
  const id = ui.recruitmentId
  if (!id) return
  const res = await adminApi.operations(id)
  if (id !== ui.recruitmentId) return
  data.value = res
  loadedAt.value = new Date()
}
const reload = () => load().catch((e) => ui.fail(e)).finally(() => (loading.value = false))
onMounted(reload)
watch(() => ui.recruitmentId, () => {
  data.value = null
  loading.value = true
  reload()
})
usePolling(load, { interval: 10000 })

const s = computed(() => data.value?.summary || {})
const views = computed(() => [
  { key: 'ALL', label: '전체', count: s.value.total },
  { key: 'ATTENTION', label: '확인 필요', count: s.value.attention, tone: 'bad' },
  { key: 'IN_PROGRESS', label: '진행 중', count: s.value.live },
  { key: 'SCHEDULED', label: '예정', count: (s.value.scheduled || 0) + (s.value.waiting || 0) },
  { key: 'ENDED', label: '끝남', count: (s.value.evaluating || 0) + (s.value.done || 0) },
])
const rows = computed(() =>
  (data.value?.items || []).filter((r) => {
    const st = r.interview.status
    if (view.value === 'ATTENTION') return r.alerts.length
    if (view.value === 'IN_PROGRESS') return st === 'IN_PROGRESS'
    if (view.value === 'SCHEDULED') return st === 'SCHEDULED' || st === 'WAITING'
    if (view.value === 'ENDED') return st === 'EVALUATING' || st === 'DONE'
    return true
  }),
)
const agentDown = computed(() => data.value && data.value.agent?.status !== 'UP')
const badProviders = computed(() => (data.value?.agent?.providers || []).filter((p) => p.health !== 'OK' || p.waiting > 0))
const worst = (r) => (r.alerts.some((a) => ALERT[a]?.tone === 'bad') ? 'bad' : r.alerts.length ? 'warn' : null)
const progress = (r) => Math.min(100, Math.round(((r.elapsedMinutes || 0) / (r.interview.durationMinutes || 1)) * 100))

function open(r) {
  const st = r.interview.status
  router.push({ name: st === 'EVALUATING' || st === 'DONE' ? 'review' : 'prep', params: { id: r.interview.id } })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">관리</h1>
        <AdminTabs />
      </div>
      <div class="flex items-center gap-3 text-[0.84rem] text-sub">
        <span v-if="data" class="badge" :class="agentDown ? 'tone-bad' : 'tone-ok'">
          <AlertTriangle v-if="agentDown" :size="13" /><CheckCircle2 v-else :size="13" />AI 서버 {{ agentDown ? '연결 안 됨' : '정상' }}
        </span>
        <span v-for="p in badProviders" :key="p.role" class="badge tone-warn" :title="`상태 ${p.health}, 대기 ${p.waiting}건`">
          {{ PROVIDER[p.role] || p.role }} {{ p.health !== 'OK' ? '불안정' : `대기 ${p.waiting}` }}
        </span>
        <span v-if="loadedAt" class="flex items-center gap-1 text-faint"><RefreshCw :size="13" />{{ hm(loadedAt.toISOString()) }} 기준 · 10초마다 갱신</span>
      </div>
    </div>

    <div class="flex flex-wrap border-b border-line" role="tablist" aria-label="면접 상태">
      <button
        v-for="v in views"
        :key="v.key"
        class="relative min-w-[112px] px-4 pb-2.5 pt-1 text-left transition-colors first:pl-0"
        :class="view === v.key ? 'after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-ink' : 'opacity-60 hover:opacity-100'"
        role="tab"
        :aria-selected="view === v.key"
        @click="view = v.key"
      >
        <p class="text-[0.78rem] font-semibold text-faint">{{ v.label }}</p>
        <p class="text-[1.6rem] font-bold leading-tight tabular-nums" :class="v.tone === 'bad' && v.count ? 'text-bad' : ''">{{ v.count ?? '–' }}</p>
      </button>
    </div>

    <div v-if="loading && !data" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><div v-for="n in 8" :key="n" class="h-[132px] animate-pulse rounded-lg bg-sunken" /></div>
    <div v-else-if="!rows.length" class="card">
      <EmptyState :title="view === 'ATTENTION' ? '확인이 필요한 면접이 없습니다' : '해당하는 면접이 없습니다'" :hint="view === 'ALL' ? '오늘 예정된 면접이 없습니다. 등록 · 매칭에서 면접자를 올리고 일정을 넣으세요.' : ''">
        <template #icon><CheckCircle2 v-if="view === 'ATTENTION'" :size="22" /><Activity v-else :size="22" /></template>
      </EmptyState>
    </div>
    <ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <li v-for="r in rows" :key="r.interview.id">
        <button
          class="card flex h-full w-full flex-col gap-2 p-3.5 text-left transition-colors hover:bg-sunken/60"
          :class="worst(r) === 'bad' ? 'border-bad/50' : worst(r) === 'warn' ? 'border-warn/50' : ''"
          @click="open(r)"
        >
          <span class="flex items-start justify-between gap-2">
            <span class="min-w-0">
              <span class="block truncate font-bold">{{ r.interview.candidate.name }}</span>
              <span class="block truncate text-[0.8rem] text-sub">{{ labelOf(INTERVIEW_TYPE, r.interview.type) }} · {{ r.interview.candidate.jobTitle }}</span>
            </span>
            <span class="badge shrink-0" :class="`tone-${INTERVIEW_STATUS[r.interview.status]?.tone || 'neutral'}`">{{ labelOf(INTERVIEW_STATUS, r.interview.status) }}</span>
          </span>

          <span class="flex items-center gap-2 text-[0.84rem] tabular-nums text-sub">
            <span class="font-semibold text-ink">{{ hm(r.interview.scheduledAt) }}</span>
            <template v-if="r.startedAt">
              <span class="h-1.5 flex-1 overflow-hidden rounded-sm bg-sunken" :title="`${r.elapsedMinutes}분 / 예정 ${r.interview.durationMinutes}분`">
                <span class="block h-full" :class="r.overtimeMinutes ? 'bg-warn' : 'bg-brand'" :style="{ width: `${progress(r)}%` }" />
              </span>
              <span>{{ r.elapsedMinutes }}/{{ r.interview.durationMinutes }}분</span>
            </template>
            <span v-else class="text-faint">{{ r.interview.durationMinutes }}분 예정</span>
          </span>
          <span v-if="r.startedAt && r.lateMinutes >= 5" class="text-[0.78rem] text-sub">예정보다 {{ r.lateMinutes }}분 늦게 시작</span>

          <span class="flex items-center gap-2 text-[0.8rem] text-faint">
            <template v-if="r.interview.status === 'IN_PROGRESS'">
              <MicOff v-if="r.audioConnected === false" :size="14" class="text-bad" /><Mic v-else :size="14" :class="r.audioConnected ? 'text-ok' : ''" />
              <span>전사 {{ r.utteranceCount }}건</span><span>·</span>
            </template>
            <span class="truncate">{{ r.interview.interviewers.map((x) => x.name).join(', ') || '면접관 미배정' }}</span>
          </span>

          <span v-if="r.alerts.length" class="mt-auto flex flex-wrap gap-1.5 pt-0.5">
            <span v-for="a in r.alerts" :key="a" class="badge h-[22px] gap-1 px-2 text-[0.76rem]" :class="`tone-${ALERT[a]?.tone || 'warn'}`">
              <AlertTriangle :size="12" />{{ ALERT[a]?.text(r) || a }}
            </span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
