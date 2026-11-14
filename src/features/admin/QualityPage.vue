<script setup>
// 관리 > AI 품질: AI가 만든 것이 실제로 얼마나 맞고 쓰였는지를 숫자로 본다(다음 시즌 개선의 근거).
// 숫자가 주인공이라 대부분 숫자 칸이고, 비교가 필요한 곳에만 막대를 쓴다.
import { computed, onMounted, ref, watch } from 'vue'
import { Gauge } from 'lucide-vue-next'
import AdminTabs from './AdminTabs.vue'
import DivergingBar from './DivergingBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { adminApi } from '@/api/index.js'
import { useUi } from '@/stores/ui.js'
import { SPEAKER_METHOD } from '@/lib/labels.js'

const ui = useUi()
const d = ref(null)
const loading = ref(true)

async function load() {
  const id = ui.recruitmentId
  if (!id) return
  const res = await adminApi.quality(id)
  if (id === ui.recruitmentId) d.value = res
}
const reload = () => {
  loading.value = true
  load().catch((e) => ui.fail(e)).finally(() => (loading.value = false))
}
onMounted(reload)
watch(() => ui.recruitmentId, () => {
  d.value = null
  reload()
})

const pct = (v) => (v == null ? '–' : `${Math.round(v * 100)}%`)
const num = (v, digits = 2) => (v == null ? '–' : Number(v).toFixed(digits))
const signed = (v) => (v == null ? '–' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}`)
const secs = (v) => (v == null ? '–' : v >= 90 ? `${Math.floor(v / 60)}분 ${Math.round(v % 60)}초` : `${Math.round(v)}초`)

// 신입은 1~2분 안에 초안이 필요하다(요건). 넘으면 표시한다.
const liveTarget = computed(() => (ui.track === 'NEW_GRAD' ? 120 : null))
const methods = computed(() => {
  const by = d.value?.speaker?.byMethod || {}
  const total = d.value?.speaker?.utteranceCount || 0
  return ['RULE', 'QUESTION_MATCH', 'LLM', 'CHANNEL', 'MANUAL', 'NONE']
    .map((k) => ({ key: k, label: k === 'NONE' ? '판정 못 함' : SPEAKER_METHOD[k], count: by[k] || 0, rate: total ? (by[k] || 0) / total : 0 }))
    .filter((m) => m.count || ['RULE', 'MANUAL', 'NONE'].includes(m.key))
})
const gapMax = computed(() => Math.max(1, ...(d.value?.scoreGap?.byCriterion || []).map((c) => Math.abs(c.meanDiff || 0))))
const empty = computed(() => d.value && !d.value.endedInterviewCount)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="h-page">관리</h1>
        <AdminTabs />
      </div>
      <p v-if="d" class="text-[0.86rem] text-sub">끝난 면접 <b class="text-ink">{{ d.endedInterviewCount }}</b>건 기준</p>
    </div>

    <div v-if="loading && !d" class="grid gap-4 lg:grid-cols-2"><div v-for="n in 4" :key="n" class="h-44 animate-pulse rounded-2xl bg-sunken" /></div>
    <div v-else-if="empty" class="card">
      <EmptyState title="아직 끝난 면접이 없습니다" hint="면접이 끝나고 면접관 평가가 제출되면 AI 결과와 비교한 수치가 여기에 쌓입니다."><template #icon><Gauge :size="22" /></template></EmptyState>
    </div>
    <template v-else-if="d">
      <!-- AI 점수 vs 면접관 점수 -->
      <section class="card">
        <header class="border-b border-line px-4 py-3">
          <h2 class="h-sec">AI 참고 점수와 면접관 점수의 차이</h2>
          <p class="text-[0.84rem] text-sub">면접 × 평가 항목 {{ d.scoreGap.comparedCount }}쌍 비교. 면접관 점수는 제출된 평가의 평균입니다.</p>
        </header>
        <div class="grid gap-px bg-line sm:grid-cols-4">
          <div class="bg-surface px-4 py-3"><p class="label">평균 차이의 크기</p><p class="text-[1.7rem] font-bold tabular-nums">{{ num(d.scoreGap.meanAbsDiff) }}<span class="ml-1 text-[0.86rem] font-medium text-faint">점</span></p></div>
          <div class="bg-surface px-4 py-3"><p class="label">방향 (AI − 면접관)</p><p class="text-[1.7rem] font-bold tabular-nums">{{ signed(d.scoreGap.meanDiff) }}</p><p class="text-[0.78rem] text-faint">{{ d.scoreGap.meanDiff > 0 ? 'AI가 후한 편' : d.scoreGap.meanDiff < 0 ? 'AI가 엄격한 편' : '' }}</p></div>
          <div class="bg-surface px-4 py-3"><p class="label">1점 이내로 일치</p><p class="text-[1.7rem] font-bold tabular-nums">{{ pct(d.scoreGap.withinOneRate) }}</p></div>
          <div class="bg-surface px-4 py-3"><p class="label">AI가 점수를 낸 항목</p><p class="text-[1.7rem] font-bold tabular-nums">{{ pct(d.aiCoverage.rate) }}</p><p class="text-[0.78rem] text-faint">{{ d.aiCoverage.scored }}/{{ d.aiCoverage.expected }} · 나머지는 근거 부족</p></div>
        </div>
        <table v-if="d.scoreGap.byCriterion?.length" class="w-full border-t border-line">
          <thead><tr class="border-b border-line"><th class="th">평가 항목</th><th class="th text-right">비교</th><th class="th text-right">AI 평균</th><th class="th text-right">면접관 평균</th><th class="th w-[32%]">차이 (← 엄격 · AI · 후함 →)</th><th class="th text-right">크기</th></tr></thead>
          <tbody>
            <tr v-for="c in d.scoreGap.byCriterion" :key="c.criterionCode" class="row-line">
              <td class="td font-medium">{{ c.criterionName }}</td>
              <td class="td text-right tabular-nums text-sub">{{ c.comparedCount }}</td>
              <td class="td text-right tabular-nums">{{ num(c.aiMean) }}</td>
              <td class="td text-right tabular-nums">{{ num(c.interviewerMean) }}</td>
              <td class="td"><DivergingBar :value="c.meanDiff" :max="gapMax" :title="`AI ${num(c.aiMean)} / 면접관 ${num(c.interviewerMean)}`" /></td>
              <td class="td text-right tabular-nums text-sub">{{ num(c.meanAbsDiff) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="grid items-start gap-4 lg:grid-cols-2">
        <!-- 꼬리질문 · 질문 -->
        <section class="card">
          <header class="border-b border-line px-4 py-3"><h2 class="h-sec">질문</h2></header>
          <div class="grid gap-px bg-line sm:grid-cols-3">
            <div class="bg-surface px-4 py-3">
              <p class="label">꼬리질문 채택률</p>
              <p class="text-[1.7rem] font-bold tabular-nums">{{ pct(d.followUps.adoptionRate) }}</p>
              <p class="text-[0.78rem] text-faint">제안 {{ d.followUps.suggested }} · 채택 {{ d.followUps.used }}</p>
            </div>
            <div class="bg-surface px-4 py-3">
              <p class="label">준비한 질문 사용률</p>
              <p class="text-[1.7rem] font-bold tabular-nums">{{ pct(d.questions.askedRate) }}</p>
              <p class="text-[0.78rem] text-faint">준비 {{ d.questions.prepared }} · 물음 {{ d.questions.asked }}</p>
            </div>
            <div class="bg-surface px-4 py-3">
              <p class="label">자동 인식</p>
              <p class="text-[1.7rem] font-bold tabular-nums">{{ pct(d.questions.autoMatchedRate) }}</p>
              <p class="text-[0.78rem] text-faint">물은 질문 중 {{ d.questions.autoMatched }}개를 말로 인식</p>
            </div>
          </div>
          <p class="border-t border-line px-4 py-2.5 text-[0.82rem] leading-relaxed text-sub">채택률이 낮으면 꼬리질문이 늦게 나오거나 쓸모가 적다는 뜻입니다. 자동 인식이 낮으면 면접관이 질문을 바꿔 말하는 경우가 많다는 뜻입니다.</p>
        </section>

        <!-- 화자 판정 -->
        <section class="card">
          <header class="border-b border-line px-4 py-3">
            <h2 class="h-sec">화자 판정</h2>
            <p class="text-[0.84rem] text-sub">발화 {{ d.speaker.utteranceCount }}건이 어떤 근거로 면접관/지원자로 나뉘었는지</p>
          </header>
          <ul class="space-y-2 px-4 py-3">
            <li v-for="m in methods" :key="m.key" class="grid grid-cols-[96px_1fr_88px] items-center gap-3 text-[0.9rem]" :title="`${m.label}: ${m.count}건`">
              <span class="truncate" :class="m.key === 'MANUAL' || m.key === 'NONE' ? 'font-semibold' : 'text-sub'">{{ m.label }}</span>
              <span class="h-2.5 overflow-hidden rounded bg-sunken"><span class="block h-full rounded bg-brand" :style="{ width: `${Math.max(m.count ? 1 : 0, m.rate * 100)}%` }" /></span>
              <span class="text-right tabular-nums"><b>{{ pct(m.rate) }}</b><span class="ml-1.5 text-[0.78rem] text-faint">{{ m.count }}</span></span>
            </li>
          </ul>
          <p class="border-t border-line px-4 py-2.5 text-[0.82rem] leading-relaxed text-sub">
            <b class="text-ink">사람이 지정·수정 {{ pct(d.speaker.manualRate) }}</b>, <b class="text-ink">판정 못 함 {{ pct(d.speaker.unknownRate) }}</b>.
            사람이 고친 비율이 높으면 자동 판정이 그 방 환경에서 잘 안 맞는다는 신호입니다.
          </p>
        </section>

        <!-- 보고서 소요 시간 -->
        <section class="card">
          <header class="border-b border-line px-4 py-3"><h2 class="h-sec">보고서가 나오기까지 (면접 종료 기준)</h2></header>
          <table class="w-full">
            <thead><tr class="border-b border-line"><th class="th">보고서</th><th class="th text-right">건수</th><th class="th text-right">중앙값</th><th class="th text-right">가장 오래</th></tr></thead>
            <tbody>
              <tr class="row-line">
                <td class="td font-medium">초안 (실시간 전사 기반)</td>
                <td class="td text-right tabular-nums text-sub">{{ d.reports.liveCount }}</td>
                <td class="td text-right font-semibold tabular-nums">{{ secs(d.reports.liveSecondsMedian) }}</td>
                <td class="td text-right tabular-nums">
                  {{ secs(d.reports.liveSecondsMax) }}
                  <span v-if="liveTarget && d.reports.liveSecondsMax > liveTarget" class="badge tone-warn ml-1 h-5 px-1.5 text-[0.72rem]">2분 초과</span>
                </td>
              </tr>
              <tr class="row-line">
                <td class="td font-medium">보정본 (사후 전사 기반)</td>
                <td class="td text-right tabular-nums text-sub">{{ d.reports.refinedCount }}</td>
                <td class="td text-right font-semibold tabular-nums">{{ secs(d.reports.refinedSecondsMedian) }}</td>
                <td class="td text-right tabular-nums">{{ secs(d.reports.refinedSecondsMax) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="liveTarget" class="border-t border-line px-4 py-2.5 text-[0.82rem] text-sub">신입 면접은 종료 후 1~2분 안에 초안이 보여야 합니다.</p>
        </section>

        <!-- AI 작업 -->
        <section class="card">
          <header class="border-b border-line px-4 py-3"><h2 class="h-sec">AI 작업 성공·실패</h2></header>
          <table class="w-full">
            <thead><tr class="border-b border-line"><th class="th">작업</th><th class="th text-right">성공</th><th class="th text-right">실패</th><th class="th text-right">실패율</th></tr></thead>
            <tbody>
              <tr v-for="j in d.jobs" :key="j.type" class="row-line">
                <td class="td font-medium">{{ { BRIEFING: '사전 리포트', AI_EVALUATION: 'AI 참고 평가', REPORT: '보고서' }[j.type] || j.type }}</td>
                <td class="td text-right tabular-nums">{{ j.succeeded }}</td>
                <td class="td text-right font-semibold tabular-nums" :class="j.failed ? 'text-bad' : 'text-faint'">{{ j.failed }}</td>
                <td class="td text-right tabular-nums text-sub">{{ pct(j.succeeded + j.failed ? j.failed / (j.succeeded + j.failed) : null) }}</td>
              </tr>
              <tr v-if="!d.jobs?.length"><td class="td text-sub" colspan="4">작업 기록이 없습니다.</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    </template>
  </div>
</template>
